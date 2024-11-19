const mapResizer = function() {
  var map = this
  var throttle;
  var width;
  var height;
  /*document.querySelectorAll(".map-outer-lightbox").forEach((el) => {
  //  el.style.height = height + "px";
 //   el.style.width = width + "px";
  });*/
  var _sel = "#" + map.getId() + " .map-viewport";
  var el = document.querySelector(_sel);
  if (el.style.height == '') {
    el.style.height = map.getViewportHeight() + "px";
  }
  if (el.style.width == '') {
    el.style.width = map.getViewportWidth() + "px";
  }
  map.triggerResize = function() {
    clearTimeout(throttle);
    throttle = setTimeout(function() {
      width = window.innerWidth;
      height = window.innerHeight;
      if ((
        (Math.abs(width - el.style.width.replace("px","")*1) > 200) ||
        (Math.abs(height - el.style.height.replace("px","")*1) > 200)
      )) {
        el.style.height = "";
        el.style.width = "";
        el.style.width = map.getViewportWidth() + "px";
        el.style.height = map.getViewportHeight() + "px";
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
            return false;
          }
          if (map.coordTracker.coordChangeInProgress()) {
            console.log("coord change in progress")
            return false;
          }
          
          map.projectionManager.updateProjection().then(function() {
            map.updateView().then(function() {
              map.coordTracker.doHooks(map.coordTracker.postResizeHooks);
            })
          })
        }
      }
    }, 1000);
  }
  window.addEventListener("resize", map.triggerResize);
}

export { mapResizer }