const entrypoint = (args) => {
  const { proxies, lib, constant, context } = args;

  const assignAndDelete = (obj, oldKey, newKey) => {
    obj[newKey] = obj[oldKey];
    delete obj[oldKey];
  };

  return {
    ...args,
    proxies: proxies.map((p) => {
      if (p.properties) assignAndDelete(p, "properties", "props");
      if (p.props?.transport) assignAndDelete(p.props, "transport", "trans");
      if (p.props?.destination) assignAndDelete(p.props, "destination", "dest");
      return p;
    }),
  };
};
