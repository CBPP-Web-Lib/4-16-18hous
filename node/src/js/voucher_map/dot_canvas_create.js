var DotCanvasManager = function() {

  var canvas, ctx;

  this.deleteExistingCanvas = function(map, delete_current) {
    if (delete_current && canvas) {
      canvas.style.opacity = 0;
      console.log("delete", canvas)
      canvas.parentElement.removeChild(canvas)
    }
    document.querySelectorAll("#" + map.getId() + " .old-canvas").forEach((old_canvas) => {
      old_canvas.style.opacity = 0;
      console.log("old_canvas", old_canvas)
      setTimeout(function() {
        if (old_canvas.parentElement) {
          old_canvas.parentElement.removeChild(old_canvas)
        }
      }, 200)
    });
  }
  
  this.makeElement = function(map) {
    if (canvas) {
      canvas.classList.add("old-canvas")
    }
    canvas = document.createElement("canvas")
    canvas.width = map.getViewportWidth()*2
    canvas.height = map.getViewportHeight()*2
    ctx = canvas.getContext("2d")
    canvas.style.opacity = 0;
    var canvas_container = map.getSvg().node().parentElement.querySelector(".canvas-container");
    if (!canvas_container) {
      canvas_container = document.createElement("div")
      canvas_container.classList.add("canvas-container")
      map.getSvg().node().after(canvas_container)
    }
    canvas_container.appendChild(canvas)
    setTimeout(function() {
      canvas.style.opacity = 1;
    }, 0)
  }
  
  this.getCanvas = function() {
    return canvas;
  }
  
  this.getCanvasContext = function() {
    return ctx;
  }

}

export { DotCanvasManager }

/*
export {
  makeElement,
  getCanvas,
  getCanvasContext,
  deleteExistingCanvas
}*/