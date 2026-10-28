const entrypoint = (args) => {
  const { proxies, lib, constant, context } = args;

  return {
    ...args,
    proxies: proxies.map((p) => {
      if (p.props?.ipv4 === undefined && p.props?.ipv6 === undefined) {
      }
    }),
  };
};
