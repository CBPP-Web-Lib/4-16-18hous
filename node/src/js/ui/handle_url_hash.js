function handleUrlHash(map) {
  if (window.location.hash) {
    var hash = window.location.hash.replace("#","")
    var parsed = new URLSearchParams(hash)
    var config = Object.fromEntries(parsed)
    var {dots, shapes, coords, cbsa, mapConfigHash} = config;
    if (!mapConfigHash) {
      return;
    }
    var dots = dots.split(",");
    var bounds = coords.split(",");
    console.log(dots, shapes, bounds, cbsa);
    /*var config = {
      dots: active_dots_layer.join(","),
      shapes: active_layer,
      coords: bounds.join(","),
      cbsa: cbsa,
      mapConfigHash: true
    }*/
  }
}

export { handleUrlHash }