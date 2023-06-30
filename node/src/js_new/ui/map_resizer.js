const MapResizer = function(map) {
  window.addEventListener("resize", (d)=>{
    map.coordTracker.signalViewportResize()
    map.getCanvas().width = map.getViewportWidth()*2
    map.getCanvas().height = map.getViewportHeight()*2
    map.getSvg().attr("viewBox", [
      0, 0, map.getViewportWidth(), map.getViewportHeight()
    ].join(" "))
    map.projectionManager.updateProjection().then(function() {
      map.updateView()
    })
  })
}

export { MapResizer }