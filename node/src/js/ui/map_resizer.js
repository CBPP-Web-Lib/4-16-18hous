const mapResizer = function() {
  var map = this
  var throttle;
  window.addEventListener("resize", (d)=>{
    map.coordTracker.signalViewportResize()
    var canvas = map.getCanvas()
    if (canvas) {
      map.getCanvas().width = map.getViewportWidth()*2
      map.getCanvas().height = map.getViewportHeight()*2
    }
    var svg = map.getSvg()
    if (svg) {
      map.getSvg().attr("viewBox", [
        0, 0, map.getViewportWidth(), map.getViewportHeight()
      ].join(" "))
      map.getInvertedSvg().attr("viewBox", [
        0, 0, map.getViewportWidth(), map.getViewportHeight()
      ].join(" "))
      map.getTextSvg().attr("viewBox", [
        0, 0, map.getViewportWidth(), map.getViewportHeight()
      ].join(" "))
      if (map.isZooming()) {
        console.log("is zooming")
        return false;
      }
      if (map.coordTracker.coordChangeInProgress()) {
        console.log("coord change in progress")
        return false;
      }
      clearTimeout(throttle);
      throttle = setTimeout(function() {
        map.projectionManager.updateProjection().then(function() {
          console.log("update ", map.getId())
          map.updateView()
        })
        
      }, 1000);
    }
  })
}

export { mapResizer }