const entrypoint = (args) => {
  const { config, endpoints } = args;

  // Parse endpoint IDs from request query
  const endpointIDs = ($options?._req?.query?.endpoint ?? "")
    .split("_")
    .filter((t) => !!t);

  const selectedEndpoints = (endpoints ?? []).filter((ep) =>
    endpointIDs.some((eid) => ep.properties?.endpoint?.id == eid),
  );

  // Categorize endpoints by type
  const tailscaleEndpoints = selectedEndpoints.filter(
    (ep) => ep.type === "tailscale",
  );
  const wireguardEndpoints = selectedEndpoints.filter(
    (ep) => ep.type === "wireguard",
  );

  // Apply route & DNS rules for each endpoint type
  for (const tsep of tailscaleEndpoints) {
    config.route = {
      ...(config.route ?? {}),
      rules: [
        {
          action: "route",
          outbound: tsep.name,
          preferred_by: tsep.name,
        },
        ...(config.route?.rules ?? []),
      ],
    };

    config.dns = {
      ...(config.dns ?? {}),
      servers: [
        ...(config.dns?.servers ?? []),
        {
          type: "tailscale",
          tag: "dns-" + tsep.name,
          endpoint: tsep.name,
          accept_search_domain: true,
        },
      ],
      rules: [
        {
          action: "evaluate",
          preferred_by: "dns-" + tsep.name,
          server: "dns-" + tsep.name,
          tag: "resolve-evaluate-tailscale-" + tsep.name,
        },
        {
          match_response: "resolve-evaluate-tailscale-" + tsep.name,
          ip_accept_any: true,
          action: "respond",
        },
        ...(config.dns?.rules ?? []),
      ],
    };
  }

  for (const wgep of wireguardEndpoints) {
    config.route = {
      ...(config.route ?? {}),
      rules: [
        {
          action: "route",
          outbound: wgep.name,
          preferred_by: wgep.name,
        },
        ...(config.route?.rules ?? []),
      ],
    };
  }

  return {
    ...args,
    selectedEndpoints: [...tailscaleEndpoints, ...wireguardEndpoints],
  };
};
