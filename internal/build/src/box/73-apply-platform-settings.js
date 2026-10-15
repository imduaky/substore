const entrypoint = (args) => {
  const { config, ua, lib, constant, context, experimental } = args;

  const tunInbound = lib.default.findTun(config);

  if (ua?.SFM && tunInbound) {
    // on macos , only set ipv6 dns address to fix the program
    // which read the /etc/resolv.conf as major dns resolver config.
    if (tunInbound.dns_address)
      tunInbound.dns_address = tunInbound.dns_address.filter((addr) =>
        addr.includes(":"),
      );

    // on macos , gvisor has better performance.
    //tunInbound.stack = "gvisor";

    if (tunInbound.platform?.http_proxy?.enabled)
      tunInbound.platform.http_proxy.enabled = false;
  }

  return { ...args, config };
};
