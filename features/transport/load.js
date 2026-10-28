const featureLocation = lib.location;

const isTrans = ({ proxy }) => {
  return proxy?.props?.trans || proxy?.props?.trans?.is;
};

const isDest = ({ proxy }) => {
  return proxy?.props?.dest || proxy?.props?.dest?.is;
};

const complete = ({ proxies, detourName, fallback }) => {
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

  const transportProxies = proxies.filter((proxy) => isTrans({ proxy }));
  const destinationProxies = proxies.filter((proxy) => isDest({ proxy }));

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
      typeof dp.props.dest !== "boolean" &&
      dp.props.dest.require !== undefined
    ) {
      if (typeof dp.props.dest.requires === "string")
        destinationRequiredLocation.push(dp.props.dest.require);
      else if (Array.isArray(dp.props.dest.require))
        destinationRequiredLocation.push(...dp.props.dest.require);
    } else {
      const destinationLocation = featureLocation.getLocation(dp);
      if (destinationLocation !== "")
        destinationRequiredLocation.push(destinationLocation);

      if (typeof dp.props.dest.suits === "string")
        destinationRequiredLocation.push(dp.props.dest.suits);
      else if (Array.isArray(dp.props.dest.suits))
        destinationRequiredLocation.push(...dp.props.dest.suits);
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
  complete,
  isTrans,
  isDest,
};
