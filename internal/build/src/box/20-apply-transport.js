const entrypoint = (args) => {
  const { proxies, config, experimental, lib, constant, context, ua } = args;

  const transportGroups = lib.transport.completeTransport({
    proxies: proxies,
    detourName: (cca2) => {
      let defaultTransportName = "🚀 Transport";
      // if (ua?.isZhCN) {
      //   defaultTransportName = "🚀 链式传输";
      // } else if (ua?.isZhTW) {
      //   defaultTransportName = "🚀 鏈式傳輸";
      // }
      return cca2
        ? defaultTransportName + " (" + cca2 + ")"
        : defaultTransportName;
    },
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
      (proxy) =>
        !lib.transport.isDestionation({ proxy }) || "dialer-proxy" in proxy,
    ),
  };
};
