const entrypoint = (args) => {
  const { proxies, endpoints } = args;

  const assignAndDelete = (obj, oldKey, newKey) => {
    obj[newKey] = {
      ...(obj[oldKey] ?? {}),
      ...(obj[newKey] ?? {}),
    };
    delete obj[oldKey];
  };

  const normalize = (items = []) =>
    items.map((item) => {
      if (item.properties) assignAndDelete(item, "properties", "props");
      if (item.props?.transport)
        assignAndDelete(item.props, "transport", "trans");
      if (item.props?.destination)
        assignAndDelete(item.props, "destination", "dest");
      return item;
    });

  const normalized = { ...args };
  if (proxies) normalized.proxies = normalize(proxies);
  if (endpoints) normalized.endpoints = normalize(endpoints);
  return normalized;
};
