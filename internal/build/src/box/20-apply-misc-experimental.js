const entrypoint = (args) => {
  const { config, experimental } = args;

  if (experimental.do_not_interrupt)
    (config.outbounds ?? []).forEach((out) => {
      if (out?.interrupt_exist_connections)
        out.interrupt_exist_connections = false;
    });

  return args;
};
