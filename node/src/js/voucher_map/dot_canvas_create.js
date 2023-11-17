var canvas, ctx;

function deleteExistingCanvas(map, delete_current) {
  if (delete_current) {
    canvas.style.opacity = 0;
    canvas.parentElement.removeChild(canvas)
  }
  document.querySelectorAll("#" + map.getId() + " .old-canvas").forEach((old_canvas) => {
    setTimeout(function() {
      old_canvas.style.opacity = 0;
      if (old_canvas.parentElement) {
        old_canvas.parentElement.removeChild(old_canvas)
      }
    }, 200)
  });
}

function makeElement(map) {
  if (canvas) {
    canvas.classList.add("old-canvas")
  }
  canvas = document.createElement("canvas")
  canvas.width = map.getViewportWidth()*2
  canvas.height = map.getViewportHeight()*2
  ctx = canvas.getContext("2d")
  canvas.style.opacity = 0;
  map.getSvg().node().after(canvas)
  setImmediate(function() {
    canvas.style.opacity = 1;
  })
}

function getCanvas() {
  return canvas;
}

function getCanvasContext() {
  return ctx;
}

export {
  makeElement,
  getCanvas,
  getCanvasContext,
  deleteExistingCanvas
}