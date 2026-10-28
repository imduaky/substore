const featureLocation = lib.location;

const isTransport = ({ proxy }) => {
  return proxy?.props?.transport || proxy?.props?.transport?.is;
};

const isDestionation = ({ proxy }) => {
  return proxy?.props?.destination || proxy?.props?.destination?.is;
};

const completeTransport = ({ proxies, detourName, fallback }) => {
  if (detourName === undefined) {
    detourName = (cca2) => {
      if (cca2 === "") {
        return "🚀 Transport";
      }
      return "🚀 Transport (" + cca2 + ")";
    };
  } else if (typeof detourName === "string") {
    destinationProxies.map((p) => (p["dialer-proxy"] = detourName));
    return { [detourName]: transportProxies };
  } else if (typeof detourName != "function") {
    throw new Error(
      "wrong detoruName type, excepted: function,string. got: " +
        typeof detourName,
    );
  }

  const transportProxies = proxies.filter((proxy) => isTransport({ proxy }));
  const destinationProxies = proxies.filter((proxy) =>
    isDestionation({ proxy }),
  );

  const transportGroups = {};
  for (const tp of transportProxies) {
    const transportLocation = featureLocation.getLocation(tp);

    if (transportGroups[transportLocation] === undefined)
      transportGroups[transportLocation] = {
        use: false,
        name: detourName(transportLocation),
        proxies: [],
      };

    transportGroups[transportLocation].proxies.push(tp.name);
  }

  for (const dp of destinationProxies) {
    const destinationRequiredLocation = [];
    if (
      typeof dp.props.destination !== "boolean" &&
      dp.props.destination.require !== undefined
    ) {
      if (typeof dp.props.destination.requires === "string")
        destinationRequiredLocation.push(dp.props.destination.require);
      else if (Array.isArray(dp.props.destination.require))
        destinationRequiredLocation.push(...dp.props.destination.require);
    } else {
      const destinationLocation = featureLocation.getLocation(dp);
      if (destinationLocation !== "")
        destinationRequiredLocation.push(destinationLocation);

      if (typeof dp.props.destination.suits === "string")
        destinationRequiredLocation.push(dp.props.destination.suits);
      else if (Array.isArray(dp.props.destination.suits))
        destinationRequiredLocation.push(...dp.props.destination.suits);
      if (Array.isArray(fallback))
        destinationRequiredLocation.push(...fallback);
    }

    for (const loc of destinationRequiredLocation) {
      if ([loc] in transportGroups) {
        const selected = transportGroups[loc];
        selected.use = true;
        dp["dialer-proxy"] =
          selected.proxies.length > 1 ? selected.name : selected.proxies[0];
        break;
      }
    }
  }

  return transportGroups;
};

lib.transport = {
  completeTransport,
  isTransport,
  isDestionation,
};
