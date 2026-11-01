const entrypoint = (args) => {
  return {
    ...args,
    constant: {
      platform: "sing-box",
      outbound: {
        direct: "direct",
      },
      http_client: {
        direct: "http-direct",
      },
      dns: {
        direct: "dns-cn",
        ecs: "dns-ecs",
      },
      network: {
        tailnetIPRanges: ["100.64.0.0/10", "fd7a:115c:a1e0::/48"],
      },
      clashMode: {
        ipv4Only: "IPv4Only",
        ipv6Only: "IPv6Only",
      },
    },
  };
};
