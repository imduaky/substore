const entrypoint = (args) => {
  const { proxies } = args;

  return {
    ...args,
    proxies: proxies.map((p) => {
      if (p.props?.hidden) return p;
      if (p.props?.ipv6 === false) p.name += "_4";
      if (p.props?.ipv4 === false) p.name += "_6";
      return p;
    }),
  };
};
