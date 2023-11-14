import { select } from "d3"

function ViewportMouseTracker(map) {
  var x_start,
    y_start,
    mousedown = false,
    dragX,
    dragY,
    x, y,
    x1, y1,
    x2, y2,
    start_x1, start_y1,
    start_x2, start_y2,
    drag_x1, drag_x2,
    drag_y1, drag_y2,
    in_pinch = false,
    moveCallbacks = [],
    startCallbacks = [],
    endCallbacks = [],
    pinchStartCallbacks = [],
    pinchMoveCallbacks = [],
    pinchEndCallbacks = [],
    id = map.getId()

  this.registerStartCallback = function(name, fn) {
    startCallbacks.push({name, fn})
  }

  this.getMouseStatus = function() {
    return mousedown
  }

  this.registerPinchStartCallback = function(name, fn) {
    pinchStartCallbacks.push({name, fn})
  }

  this.registerPinchMoveCallback = function(name, fn) {
    pinchMoveCallbacks.push({name, fn})
  }

  this.registerPinchEndCallback = function(name, fn) {
    pinchEndCallbacks.push({name, fn})
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
    x = _x,
    y = _y,
    startCallbacks.forEach((item)=> {
      if (typeof(item.fn)==="function") {
        item.fn(_x, _y, viewport)
      }
    });
  }

  this.mouseUp = (_x, _y) => {
    mousedown = false
    dragX = _x - x_start
    dragY = _y - y_start
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
      x = _x
      y = _y
      dragX = _x - x_start
      dragY = _y - y_start
      moveCallbacks.forEach((item)=> {
        if (typeof(item.fn)==="function") {
          item.fn(dragX, dragY, viewport)
        }
      });
    }
  }

  this.pinchStart = function(_x1, _y1, _x2, _y2) {
    in_pinch = true
    x1 = start_x1 = _x1
    y1 = start_y1 = _y1
    x2 = start_x2 = _x2
    y2 = start_y2 = _y2
    drag_x1 = drag_y1 = drag_x2 = drag_y2 = 0
    pinchStartCallbacks.forEach((item)=> {
      if (typeof(item.fn)==="function") {
        item.fn(x1, y1, x2, y2, viewport)
      }
    });
  }

  this.pinchMove = function(_x1, _y1, _x2, _y2) {
    x1 = _x1
    y1 = _y1
    x2 = _x2
    y2 = _y2
    drag_x1 = x1 - start_x1
    drag_x2 = x2 - start_x2
    drag_y1 = y1 - start_y1
    drag_y2 = y2 - start_y2
    pinchMoveCallbacks.forEach((item)=> {
      if (typeof(item.fn)==="function") {
        item.fn(x1, y1, x2, y2, drag_x1, drag_y1, drag_x2, drag_y2, viewport)
      }
    });
  }

  this.pinchEnd = function() {
    start_x1 = x1 = null
    start_x2 = x2 = null
    start_y1 = y1 = null
    start_y2 = y2 = null
    in_pinch = false
    drag_x1 = drag_y1 = drag_x2 = drag_y2 = null
    pinchEndCallbacks.forEach((item)=>{
      if (typeof(item.fn)==="function") {
        item.fn(viewport)
      }
    })
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
    if (e.touches.length === 2) {
      this.mouseUp(e.touches[0].pageX, e.touches[0].pageY);
      this.pinchStart(
        e.touches[0].pageX,
        e.touches[0].pageY,
        e.touches[1].pageX,
        e.touches[1].pageY
      );
      
    }
  });
  viewport.addEventListener("mouseleave", (e) => {
    this.mouseUp(e.pageX, e.pageY)
  });
  /*if user touches somewhere outside viewport*/
  window.addEventListener("touchstart", (e) => {
    console.log(e)
    var elements = [e.target]
    var element = e.target
    if (e.target.tagName==="path" && e.target.attributes.className==="tract") {
      return;
    }
    while (element.parentNode) {
      elements.push(element.parentNode)
      element = element.parentNode
    }
    if (elements.indexOf(viewport)===-1) {
      this.mouseUp(e.pageX, e.pageY)
    }
  });
  window.addEventListener("mouseup", (e) => {
    this.mouseUp(e.pageX, e.pageY)
  });
  
  window.addEventListener("touchend", (e) => {
    if (e.touches.length !== 2 && in_pinch) {
      this.pinchEnd()
    } else {
      this.mouseUp(x, y)
    }
  });
  viewport.addEventListener("mousemove", (e)=>{
    this.mouseMove(e.pageX, e.pageY)
  });
  
  viewport.addEventListener("touchmove", (e)=>{
    if (e.touches.length===1) {
      this.mouseMove(e.touches[0].pageX, e.touches[0].pageY)
    }
    if (in_pinch && e.touches.length === 2) {
      this.pinchMove(e.touches[0].pageX, e.touches[0].pageY, e.touches[1].pageX, e.touches[1].pageY)
    }
  });

  viewport.addEventListener("click", function(e) {
    var el = select(e.target);
    if (el.data()) {
      console.log(el.data())
    }
    var offset = viewport.getBoundingClientRect();
    console.log(e, offset);
    var x = e.clientX - offset.x;
    var y = e.clientY - offset.y;
    console.log(x, y)
    console.log(map.projectionManager.getLatLongFromClick(x, y));
  })
}

export {ViewportMouseTracker}