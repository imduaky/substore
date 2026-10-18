const entrypoint = (args) => {
  const { config, endpoints, lib, constant } = args;

  // Endpoints such as tailscale / wireguard run in userspace, so traffic to
  // their ranges has to enter the tun first. Punch those ranges out of the
  // template's route_exclude_address, an empty list means the user opted out.
  const tunInbound = lib.default.findTun(config);
  if (!tunInbound || (tunInbound.route_exclude_address ?? []).length === 0)
    return args;

  const routable = (lib.default.produceEndpoint(endpoints ?? [], constant) ?? [])
    .flatMap((ep) => {
      if (ep.type === "tailscale") return constant.network.tailnetIPRanges;
      if (ep.type === "wireguard")
        return (ep.peers ?? []).flatMap((peer) => peer.allowed_ips ?? []);
      return [];
    })
    // skip full tunnel routes (0.0.0.0/0, 0.0.0.0/1 + 128.0.0.0/1, ...),
    // otherwise the whole lan would be routed into the endpoint.
    .filter((cidr) => (lib.cidr.parse(cidr)?.bits ?? 0) >= 8);

  tunInbound.route_exclude_address = lib.cidr.subtract(
    tunInbound.route_exclude_address,
    routable,
  );

  return args;
};
