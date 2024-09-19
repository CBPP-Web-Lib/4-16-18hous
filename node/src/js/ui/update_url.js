var updateUrl = function() {
  var map = this
  var active_layer = map.dataLayerManager.getActiveLayer()
  var bounds = map.projectionManager.getBounds()
  var coords = map.coordTracker.getCoords();
  var active_dots_layer = map.dataLayerManager.getActiveDotsLayers()
  var cbsa = map.cbsaManager.getLoadedCbsa()
  var config = {
    dots: active_dots_layer.join(","),
    shapes: active_layer,
    coords: bounds.join(","),
    cbsa: cbsa,
    mapConfigHash: true,
    z: coords.z
  }
  var query = new URLSearchParams(config)
  window.location.hash = query.toString()
}

export { updateUrl }