const entrypoint = (args) => {
  const { proxies, lib, constant, context } = args;

  const sortedProxies = lib.location.sortProxies({ proxies });

  // Notice heer , different platform has different name selector (tag or name)
  const names = lib.default.produce(proxies, constant).map((pp) => pp.tag);
  return {
    ...args,
    proxies: sortedProxies.filter((sp) => names.includes(sp.name)),
  };
};
