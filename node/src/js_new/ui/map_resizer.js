const MapResizer = function(map) {
  window.addEventListener("resize", (d)=>{
    map.coordTracker.signalViewportResize()
    map.getSvg().attr("viewBox", [
      0, 0, map.getViewportWidth(), map.getViewportHeight()
    ].join(" "))
    map.projectionManager.updateProjection()
    map.updateView()
  })
}

export { MapResizer }