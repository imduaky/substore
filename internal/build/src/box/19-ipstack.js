const entrypoint = (args) => {
  const { config, proxies, constant, experimental = {} } = args;

  let includeIPv6Only = !!experimental.with_ipv6_only;
  let includeIPv4Only = !!experimental.with_ipv4_only;

  const namedProxies = proxies.map((p) => {
    if (p.props?.hidden) return p;
    if (p.props?.ipv6 === false) {
      includeIPv4Only = true;
      return { ...p, name: p.name + "_4" };
    }

    if (p.props?.ipv4 === false) {
      includeIPv6Only = true;
      return { ...p, name: p.name + "_6" };
    }

    return p;
  });

  const filterModeRules = (rules = []) =>
    rules.filter(
      (rule) =>
        (rule.clash_mode !== constant.clashMode.ipv6Only || includeIPv6Only) &&
        (rule.clash_mode !== constant.clashMode.ipv4Only || includeIPv4Only),
    );

  config.dns = {
    ...(config.dns ?? {}),
    rules: filterModeRules(config.dns?.rules),
  };

  config.route = {
    ...(config.route ?? {}),
    rules: filterModeRules(config.route?.rules),
  };
  return {
    ...args,
    config,
    proxies: namedProxies,
  };
};
