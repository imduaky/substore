const postEntrypoint = (args) => {
  const { context, lib, constant } = args;

  const override = context.secret?.superSecretSettings;
  if (typeof override === "function") return override(args);
  // if (override && typeof override === "object") return override;
  return args;
};
