const entrypoint = (args) => {
  const { config, selectedEndpoints, lib, constant } = args;

  const tunInbound = lib.default.findTun(config);
  if (!tunInbound) {
    return args;
  }

  // Start with base exclude address
  let excludeAddress = [...(constant.network.baseExcludeAddress ?? [])];

  // If no endpoint selected, ensure tailnet ranges are excluded
  if (!selectedEndpoints || selectedEndpoints.length === 0) {
    excludeAddress.push(...constant.network.tailnetIPRanges);
    tunInbound.route_exclude_address = excludeAddress;
    return args;
  }

  // Collect CIDR ranges to NOT exclude based on selected endpoints
  const toNotExclude = [];

  for (const ep of selectedEndpoints) {
    if (ep.type === "tailscale") {
      // Tailscale needs its IP ranges to be routable through TUN
      // So we remove them from exclude list
      toNotExclude.push(...constant.network.tailnetIPRanges);
    } else if (ep.type === "wireguard") {
      // Collect all AllowedIPs from WireGuard peers
      if (ep.peers && Array.isArray(ep.peers)) {
        for (const peer of ep.peers) {
          const allowedIps = peer.allowed_ips || peer["allowed-ips"];
          if (allowedIps && Array.isArray(allowedIps)) {
            for (const ip of allowedIps) {
              // Skip default routes to avoid breaking the whole system
              if (ip === "0.0.0.0/0" || ip === "::/0") {
                continue;
              }

              // Skip if prefix is too short (e.g., /1, /2) - they're too broad
              const [, prefixStr] = ip.split("/");
              const prefix = parseInt(prefixStr, 10);
              const isIPv6 = ip.includes(":");

              if (isIPv6 && prefix < 8) {
                continue; // IPv6 /8 or shorter is too broad
              }
              if (!isIPv6 && prefix < 8) {
                continue; // IPv4 /8 or shorter is too broad
              }

              toNotExclude.push(ip);
            }
          }
        }
      }
    }
  }

  // If there are ranges to not exclude, subtract them from exclude list
  if (toNotExclude.length > 0) {
    excludeAddress = lib.cidr.subtractCIDRs(
      excludeAddress,
      toNotExclude,
    );
  }

  tunInbound.route_exclude_address = excludeAddress;
  return args;
};
