const entrypoint = async (args) => {
  const { config, context, ua, lib } = args;
  if (
    !config?.experimental?.cache_file?.enabled ||
    config?.experimental?.cache_file?.cache_id
  )
    return args;
  const hashElem = [];
  hashElem.push(`${ua?.version?.full ? ua.version.full : "unknown_cache_id"}`);
  if (context.secret?.metadata?.cacheId)
    hashElem.push(context.secret?.metadata?.cacheId);

  (config?.route?.rule_set ?? [])
    .filter((rs) => rs.type === "remote" && rs.url)
    .map((rs) => hashElem.push(rs.url));

  config.experimental.cache_file.cache_id = await lib.default.hashString(
    hashElem.sort().join("_"),
  );

  return {
    ...args,
    config,
  };
};
