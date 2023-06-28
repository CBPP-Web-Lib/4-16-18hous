const MapResizer = function(map) {
  window.addEventListener("resize", (d)=>{
    map.coordTracker.signalViewportResize()
    map.getSvg().attr("viewBox", [
      0, 0, map.getViewportWidth(), map.getViewportHeight()
    ].join(" "))
    map.projectionManager.updateProjection().then(function() {
      map.updateView()
    })
  })
}

export { MapResizer }