const mapResizer = function() {
  var map = this
  window.addEventListener("resize", (d)=>{
    map.coordTracker.signalViewportResize()
    map.getCanvas().width = map.getViewportWidth()*2
    map.getCanvas().height = map.getViewportHeight()*2
    map.getSvg().attr("viewBox", [
      0, 0, map.getViewportWidth(), map.getViewportHeight()
    ].join(" "))
    map.getInvertedSvg().attr("viewBox", [
      0, 0, map.getViewportWidth(), map.getViewportHeight()
    ].join(" "))
    map.getTextSvg().attr("viewBox", [
      0, 0, map.getViewportWidth(), map.getViewportHeight()
    ].join(" "))
    console.log("resize")
    if (map.isZooming()) {
      console.log("is zooming")
      return false;
    }
    if (map.coordTracker.coordChangeInProgress()) {
      console.log("coord change in progress")
      return false;
    }
    map.projectionManager.updateProjection().then(function() {
      map.updateView()
    })
  })
}

export { mapResizer }