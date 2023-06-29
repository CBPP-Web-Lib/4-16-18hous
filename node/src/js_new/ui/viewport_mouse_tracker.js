function ViewportMouseTracker(id) {
  var x_start,
    y_start,
    mousedown = false,
    dragX,
    dragY,
    moveCallbacks = [],
    startCallbacks = [],
    endCallbacks = []

  this.registerStartCallback = function(name, fn) {
    startCallbacks.push({name, fn})
  }

  this.getMouseStatus = function() {
    return mousedown
  }

  this.registerMoveCallback = function(name, fn) {
    moveCallbacks.push({name, fn})
  }

  this.registerEndCallback = function(name, fn) {
    endCallbacks.push({name, fn})
  }

  this.mouseDown = (_x, _y) => {
    mousedown = true;
    x_start = _x
    y_start = _y
    startCallbacks.forEach((item)=> {
      if (typeof(item.fn)==="function") {
        item.fn(dragX, dragY, viewport)
      }
    });
  }

  this.mouseUp = () => {
    mousedown = false
    x_start = null
    y_start = null
    endCallbacks.forEach((item)=> {
      if (typeof(item.fn)==="function") {
        item.fn(dragX, dragY, viewport)
      }
    });
  }

  this.mouseMove = (_x, _y) => {
    if (mousedown) {
      dragX = _x - x_start
      dragY = _y - y_start
      moveCallbacks.forEach((item)=> {
        if (typeof(item.fn)==="function") {
          item.fn(dragX, dragY, viewport)
        }
      });
    }
  }

  this.getDrag = () => {
    if (mousedown) {
      return {x: dragX, y: dragY}
    } else {
      return undefined
    }
  }

  var viewport = document.querySelectorAll("#" + id + " .map-viewport")[0]
  viewport.addEventListener("mousedown", (e) => {
    this.mouseDown(e.pageX, e.pageY)
  });
  viewport.addEventListener("touchstart", (e) => {
    if (e.touches.length===1) {
      this.mouseDown(e.touches[0].pageX, e.touches[0].pageY)
    }
  });
  viewport.addEventListener("mouseleave", (e) => {
    this.mouseUp()
  });
  /*if user touches somewhere outside viewport*/
  window.addEventListener("touchstart", (e) => {
    var elements = [e.target]
    var element = e.target
    while (element.parentNode) {
      elements.push(element.parentNode)
      element = element.parentNode
    }
    if (elements.indexOf(viewport)===-1) {
      this.mouseUp()
    }
  });
  window.addEventListener("mouseup", (e) => {
    this.mouseUp()
  });
  
  window.addEventListener("touchend", (e) => {
    this.mouseUp()
  });
  viewport.addEventListener("mousemove", (e)=>{
    this.mouseMove(e.pageX, e.pageY)
  });
  
  viewport.addEventListener("touchmove", (e)=>{
    if (e.touches.length===1) {
      this.mouseMove(e.touches[0].pageX, e.touches[0].pageY)
    }
  });
}

export {ViewportMouseTracker}