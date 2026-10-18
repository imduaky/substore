// CIDR utilities: IPv4/IPv6 parsing and subtraction
// Used for dynamic TUN route_exclude_address construction

const ipv4ToInt = (ip) => {
  const parts = ip.split('.');
  return (
    ((parseInt(parts[0], 10) & 0xff) << 24) |
    ((parseInt(parts[1], 10) & 0xff) << 16) |
    ((parseInt(parts[2], 10) & 0xff) << 8) |
    (parseInt(parts[3], 10) & 0xff)
  );
};

const intToIpv4 = (int32) => {
  const u32 = int32 >>> 0;
  return [
    (u32 >>> 24) & 0xff,
    (u32 >>> 16) & 0xff,
    (u32 >>> 8) & 0xff,
    u32 & 0xff,
  ].join('.');
};

const ipv6ToBigInt = (ip) => {
  let normalized = ip.toLowerCase();
  if (normalized.includes('::')) {
    const [left, right] = normalized.split('::');
    const leftGroups = left ? left.split(':') : [];
    const rightGroups = right ? right.split(':') : [];
    const missing = 8 - leftGroups.length - rightGroups.length;
    const groups = [...leftGroups, ...Array(Math.max(0, missing)).fill('0'), ...rightGroups];
    normalized = groups.join(':');
  }
  const groups = normalized.split(':').slice(0, 8);
  let result = 0n;
  for (const group of groups) {
    result = (result << 16n) | BigInt(parseInt(group || '0', 16));
  }
  return result;
};

const bigIntToIpv6 = (bi) => {
  const groups = [];
  let val = bi;
  for (let i = 0; i < 8; i++) {
    groups.unshift((val & 0xffffn).toString(16));
    val = val >> 16n;
  }
  return groups.join(':');
};

const parseCIDR = (cidr) => {
  const [addrStr, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  if (addrStr.includes(':')) {
    return {
      addr: ipv6ToBigInt(addrStr),
      bits,
      version: 6,
      addrStr,
    };
  } else {
    return {
      addr: ipv4ToInt(addrStr),
      bits,
      version: 4,
      addrStr,
    };
  }
};

const cidrOverlapIPv4 = (cidr1, cidr2) => {
  const mask1 = (0xffffffff << (32 - cidr1.bits)) >>> 0;
  const mask2 = (0xffffffff << (32 - cidr2.bits)) >>> 0;
  return ((cidr1.addr >>> 0) & mask1) === ((cidr2.addr >>> 0) & mask2);
};

const addressInCIDRIPv4 = (cidr, target) => {
  const mask = (0xffffffff << (32 - cidr.bits)) >>> 0;
  return ((cidr.addr >>> 0) & mask) === ((target.addr >>> 0) & mask);
};

const subtractSingleCIDRIPv4 = (range, exclude) => {
  if (!cidrOverlapIPv4(range, exclude)) {
    return [range];
  }
  if (exclude.bits <= range.bits && addressInCIDRIPv4(exclude, range)) {
    return [];
  }
  if (!addressInCIDRIPv4(range, exclude)) {
    return [range];
  }
  const newBits = range.bits + 1;
  if (newBits > 32) return [range];
  const half1 = {
    addr: range.addr,
    bits: newBits,
    version: 4,
    addrStr: range.addrStr,
  };
  const half2Addr = (range.addr >>> 0) | (1 << (32 - newBits));
  const half2 = {
    addr: half2Addr,
    bits: newBits,
    version: 4,
    addrStr: intToIpv4(half2Addr),
  };
  const result = [];
  result.push(...subtractSingleCIDRIPv4(half1, exclude));
  result.push(...subtractSingleCIDRIPv4(half2, exclude));
  return result;
};

const subtractCIDRsIPv4 = (ranges, excludes) => {
  let result = ranges.map((r) => parseCIDR(r));
  for (const exclude of excludes) {
    const excludeParsed = parseCIDR(exclude);
    const newResult = [];
    for (const range of result) {
      const subtracted = subtractSingleCIDRIPv4(range, excludeParsed);
      newResult.push(...subtracted);
    }
    result = newResult;
  }
  return result.map((r) => `${r.addrStr}/${r.bits}`);
};

const cidrOverlapIPv6 = (cidr1, cidr2) => {
  const maskBits1 = 128n - BigInt(cidr1.bits);
  const maskBits2 = 128n - BigInt(cidr2.bits);
  const mask1 = (1n << maskBits1) - 1n;
  const mask2 = (1n << maskBits2) - 1n;
  return (cidr1.addr & ~mask1) === (cidr2.addr & ~mask2);
};

const addressInCIDRIPv6 = (cidr, target) => {
  const maskBits = 128n - BigInt(cidr.bits);
  const mask = (1n << maskBits) - 1n;
  return (cidr.addr & ~mask) === (target.addr & ~mask);
};

const subtractSingleCIDRIPv6 = (range, exclude) => {
  if (!cidrOverlapIPv6(range, exclude)) {
    return [range];
  }
  if (exclude.bits <= range.bits && addressInCIDRIPv6(exclude, range)) {
    return [];
  }
  if (!addressInCIDRIPv6(range, exclude)) {
    return [range];
  }
  const newBits = range.bits + 1;
  if (newBits > 128) return [range];
  const half1 = {
    addr: range.addr,
    bits: newBits,
    version: 6,
    addrStr: range.addrStr,
  };
  const half2Addr = range.addr | (1n << BigInt(128 - newBits));
  const half2 = {
    addr: half2Addr,
    bits: newBits,
    version: 6,
    addrStr: bigIntToIpv6(half2Addr),
  };
  const result = [];
  result.push(...subtractSingleCIDRIPv6(half1, exclude));
  result.push(...subtractSingleCIDRIPv6(half2, exclude));
  return result;
};

const subtractCIDRsIPv6 = (ranges, excludes) => {
  let result = ranges.map((r) => parseCIDR(r));
  for (const exclude of excludes) {
    const excludeParsed = parseCIDR(exclude);
    const newResult = [];
    for (const range of result) {
      const subtracted = subtractSingleCIDRIPv6(range, excludeParsed);
      newResult.push(...subtracted);
    }
    result = newResult;
  }
  return result.map((r) => `${r.addrStr}/${r.bits}`);
};

const subtractCIDRs = (ranges, excludes) => {
  if (!ranges || ranges.length === 0) return [];
  if (!excludes || excludes.length === 0) return ranges;
  const v4Ranges = ranges.filter((r) => !r.includes(':'));
  const v6Ranges = ranges.filter((r) => r.includes(':'));
  const v4Excludes = excludes.filter((r) => !r.includes(':'));
  const v6Excludes = excludes.filter((r) => r.includes(':'));
  const result = [];
  if (v4Ranges.length > 0) {
    result.push(...subtractCIDRsIPv4(v4Ranges, v4Excludes));
  }
  if (v6Ranges.length > 0) {
    result.push(...subtractCIDRsIPv6(v6Ranges, v6Excludes));
  }
  return result;
};

lib.cidr = {
  subtractCIDRs,
};
