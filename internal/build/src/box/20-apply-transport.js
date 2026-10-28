const entrypoint = (args) => {
  const { proxies, config, experimental, lib, constant, context, ua } = args;

  const transportGroups = lib.transport.complete({
    proxies: proxies,
    detourName: (cca2) =>
      cca2 ? "🚀 Transport" + " (" + cca2 + ")" : "🚀 Transport",
  });

  Object.keys(transportGroups).map((selectorName) => {
    const selected = transportGroups[selectorName];
    if (selected.use && selected.proxies.length > 1) {
      const transportGroup = {
        type: "selector",
        tag: selected.name,
        outbounds: [...selected.proxies],
      };
      config.outbounds = [transportGroup, ...config.outbounds];
    }
  });

  return {
    ...args,
    proxies: proxies.filter(
      (proxy) => !lib.transport.isDest({ proxy }) || "dialer-proxy" in proxy,
    ),
  };
};
