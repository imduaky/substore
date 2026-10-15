const entrypoint = async (args) => {
  const { context, lib, constant } = args;

  const lookupQuery = (name) => {
    return $options?._req?.query?.[name];
  };
  const sourceContent =
    typeof $content === "string" && $content.trim() !== ""
      ? $content.trim()
      : Array.isArray($files)
        ? $files[0]
        : "{}";

  const generated = {
    config: JSON.parse(sourceContent || "{}"),
    experimental: {},
    ua: lib.default.uaLookup(
      $options?._req?.headers?.["user-agent"] ||
        $options?._req?.headers?.["User-Agent"] ||
        context.test?.ua,
    ),
  };

  if (lookupQuery("user") || context.test?.user) {
    const userID = lookupQuery("user") || context.test?.user || "";
    const produced = await produceArtifact({
      type: lookupQuery("prod_type") || "collection",
      name: userID,
      platform: "json",
      produceType: "internal",
    });
    generated.proxies = produced.filter((proxy) =>
      [
        "socks",
        "http",
        "ss",
        "vmess",
        "trojan",
        "naive",
        "hysteria",
        "hysteria2",
        "vless",
        "tuic",
        "anytls",
        "tor",
        "ssh",
        "snell",
        "tailcat",
      ].includes(proxy.type),
    );
    generated.endpoints = produced.filter((proxy) =>
      ["wireguard", "tailscale"].includes(proxy.type),
    );
  } else {
    generated.proxies = [];
  }

  (lookupQuery("experimental") || context.test?.experimental || "")
    .split(",")
    .map((fe) => {
      generated.experimental[fe] = true;
    });

  return { ...args, ...generated };
};

const postEntrypoint = (args) => {
  const { config, proxies, endpoints, lib, constant, experimental, context } =
    args;

  const assembledConfig = lib.default.assembleConfig(args);

  // The entry post step is the final stack item, so emit after all post steps.
  $content = experimental.format_output
    ? JSON.stringify(assembledConfig, null, 2)
    : JSON.stringify(assembledConfig);

  return {
    ...args,
    config: assembledConfig,
  };
};
