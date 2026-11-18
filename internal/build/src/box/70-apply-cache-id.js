const entrypoint = async (args) => {
  const { config, context, ua, lib } = args;
  if (
    !config?.experimental?.cache_file?.enabled ||
    config?.experimental?.cache_file?.cache_id
  )
    return args;

  let cache_id = `${ua?.version?.full ? ua.version.full : "unknown_cache_id"}`;
  if (context.secret?.metadata?.cacheId)
    cache_id = `${cache_id}_${context.secret?.metadata?.cacheId}`;

  const rulesetUrls = [];
  (config?.route?.rule_set ?? [])
    .filter((rs) => rs.type === "remote" && rs.url)
    .map((rs) => rulesetUrls.push(rs.url));

  const sortedRulesetUrls = rulesetUrls.sort().join("_");
  if (sortedRulesetUrls) cache_id = `${cache_id}_${sortedRulesetUrls}`;

  config.experimental.cache_file.cache_id =
    await lib.default.hashString(cache_id);
  return {
    ...args,
    config,
  };
};
