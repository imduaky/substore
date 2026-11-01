const entrypoint = (args) => {
  const { config, proxies, constant } = args;

  let includeIPv6Only = false;

  const namedProxies = proxies.map((p) => {
    if (p.props?.hidden) return p;
    if (p.props?.ipv6 === false) return { ...p, name: p.name + "_4" };
    if (p.props?.ipv4 === false) {
      includeIPv6Only = true;
      return { ...p, name: p.name + "_6" };
    }

    return p;
  });

  // on daemon ipv6 only mode.
  if (includeIPv6Only) {
    config.dns = {
      ...(config.dns ?? {}),
      rules: (config.dns?.rules ?? []).filter(
        (rule) => !rule.clash_mode === constant.clash_mode.ipv6Only,
      ),
    };
    config.route = {
      ...(config.route ?? {}),
      rules: (config.route?.rules ?? []).filter(
        (rule) => !rule.clash_mode === constant.clash_mode.ipv6Only,
      ),
    };
  }

  return {
    ...args,
    config,
    proxies: namedProxies,
  };
};
