import { openMap } from "../voucher_map/open_map"

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
    bounds.forEach((n, i) => {
      bounds[i] = bounds[i]*1
    })
    console.log(dots, shapes, bounds, cbsa);
    var tileCoords = map.coordTracker.getBoundingTilesForBbox(bounds)
    openMap(map, cbsa, tileCoords).then(function() {
      var main_dot;
      var eth_dots = []
      dots.forEach((dot) => {
        if (dot.indexOf("ethnicity_")!==-1) {
          eth_dots.push(dot);
        } else {
          main_dot = dot;
        }
      })
      map.dataLayerManager.setActiveDotsLayer(main_dot)
      map.dataLayerManager.setAdditionalDotsLayers(eth_dots)
      map.dataLayerManager.setActiveLayer(shapes)
      
      // map.updateView()
    })
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