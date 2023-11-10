var canvas, ctx;

function makeElement(map) {
  canvas = document.createElement("canvas")
  canvas.width = map.getViewportWidth()*2
  canvas.height = map.getViewportHeight()*2
  ctx = canvas.getContext("2d")
  console.log(map.getTransparencyContainer())
  map.getTransparencyContainer().append(canvas)
  console.log(canvas);
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
  getCanvasContext
}