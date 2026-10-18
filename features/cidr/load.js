// CIDR set arithmetic for IPv4 / IPv6. Addresses are handled as BigInt
// intervals [start, end], so both families share the same code path.

const parseIPv4 = (ip) => {
  const parts = ip.split(".");
  if (parts.length !== 4) return undefined;
  let value = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return undefined;
    value = (value << 8n) | BigInt(part);
  }
  return value;
};

const parseIPv6 = (ip) => {
  const halves = ip.split("::");
  if (halves.length > 2) return undefined;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return undefined;
  const groups = [
    ...head,
    ...Array(halves.length === 2 ? missing : 0).fill("0"),
    ...tail,
  ];
  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return undefined;
    value = (value << 16n) | BigInt(parseInt(group, 16));
  }
  return value;
};

// "10.0.0.1/8" -> { v6: false, width: 32, bits: 8, start: 10.0.0.0, end: 10.255.255.255 }
// A bare address is treated as a host route.
const parse = (cidr) => {
  if (typeof cidr !== "string") return undefined;
  const [ip, prefix, extra] = cidr.trim().split("/");
  if (extra !== undefined) return undefined;
  const v6 = ip.includes(":");
  const width = v6 ? 128 : 32;
  const value = v6 ? parseIPv6(ip) : parseIPv4(ip);
  const bits = prefix === undefined ? width : Number(prefix);
  if (value === undefined || !Number.isInteger(bits) || bits < 0 || bits > width)
    return undefined;
  const hostMask = (1n << BigInt(width - bits)) - 1n;
  const start = value & ~hostMask;
  return { v6, width, bits, start, end: start | hostMask };
};

const formatIPv4 = (value) =>
  [24n, 16n, 8n, 0n].map((shift) => (value >> shift) & 0xffn).join(".");

const formatIPv6 = (value) => {
  const groups = [];
  for (let shift = 112n; shift >= 0n; shift -= 16n)
    groups.push(((value >> shift) & 0xffffn).toString(16));

  // compress the longest run (>= 2) of zero groups into "::"
  let bestStart = -1;
  let bestLength = 1;
  for (let i = 0; i < 8; ) {
    if (groups[i] !== "0") {
      i++;
      continue;
    }
    let j = i;
    while (j < 8 && groups[j] === "0") j++;
    if (j - i > bestLength) {
      bestStart = i;
      bestLength = j - i;
    }
    i = j;
  }
  if (bestStart < 0) return groups.join(":");
  return (
    groups.slice(0, bestStart).join(":") +
    "::" +
    groups.slice(bestStart + bestLength).join(":")
  );
};

// Split an interval into the minimal list of aligned CIDR blocks.
const intervalToCIDRs = (start, end, width) => {
  const format = width === 128 ? formatIPv6 : formatIPv4;
  const result = [];
  while (start <= end) {
    let bits = width;
    while (bits > 0) {
      const size = 1n << BigInt(width - bits + 1);
      if (start % size !== 0n || start + size - 1n > end) break;
      bits--;
    }
    result.push(format(start) + "/" + bits);
    start += 1n << BigInt(width - bits);
  }
  return result;
};

const cutInterval = (intervals, cut) =>
  intervals.flatMap(([start, end]) => {
    if (cut.end < start || cut.start > end) return [[start, end]];
    const rest = [];
    if (cut.start > start) rest.push([start, cut.start - 1n]);
    if (cut.end < end) rest.push([cut.end + 1n, end]);
    return rest;
  });

// ranges − excludes. Entries of `ranges` untouched by every exclude are kept
// verbatim (original order and spelling), invalid entries of `ranges` are kept
// as-is and invalid excludes are ignored.
const subtract = (ranges = [], excludes = []) => {
  const cuts = excludes.map(parse).filter(Boolean);
  return ranges.flatMap((range) => {
    const parsed = parse(range);
    if (!parsed) return [range];
    const overlapping = cuts.filter(
      (cut) =>
        cut.v6 === parsed.v6 &&
        cut.start <= parsed.end &&
        cut.end >= parsed.start,
    );
    if (overlapping.length === 0) return [range];
    return overlapping
      .reduce(cutInterval, [[parsed.start, parsed.end]])
      .flatMap(([start, end]) => intervalToCIDRs(start, end, parsed.width));
  });
};

lib.cidr = {
  parse,
  subtract,
};
