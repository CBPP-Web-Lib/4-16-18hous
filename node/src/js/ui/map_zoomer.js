import {easeQuadInOut} from "d3";
import { updateLegendDotRepresents } from "../voucher_map/update_legend"
import { updateTileHtml } from "../voucher_map/update_tile_html";

function MapZoomer(map) {
  var el = document.querySelectorAll("#" + map.getId() + " .map-viewport")[0]
  var mouse_tracker = map.mouseTracker
  var locked = false;
  var out_lock = false;
  var in_lock = false;

  var acc_scroll = 0;

  document.querySelector("#" + map.getId() + " .zoom-buttons button[name='zoom-in']")
    .addEventListener("click", (e) => {
      var height = map.getViewportHeight();
      var width = map.getViewportWidth();
      this.zoomIn(width/2, height/2);
    })

  document.querySelector("#" + map.getId() + " .zoom-buttons button[name='zoom-out']")
    .addEventListener("click", (e) => {
      var height = map.getViewportHeight();
      var width = map.getViewportWidth();
      this.zoomOut(width/2, height/2);
    })

  el.addEventListener("wheel", (e)=> {
    if (map.isDragging()) {return;}
    e.preventDefault();
    var rect = el.getBoundingClientRect();
    map.mouseTracker.mouseUp();
    acc_scroll += e.deltaY;
    if (acc_scroll < -20) {
      acc_scroll = 0
      this.zoomIn((e.clientX - rect.left), (e.clientY - rect.top));
    } else if (acc_scroll > 20) {
      acc_scroll = 0
      this.zoomOut((e.clientX - rect.left), (e.clientY - rect.top));
    }
  });
  this.getLocked = function() {
    return locked;
  }
  var touchZoomInitialScale, touchZoomInitialCenter, touchZoomStartCoords, touchZoomDestCoords, touchZoomFrameCenter
  mouse_tracker.registerPinchStartCallback("pinchStart", (x1, y1, x2, y2) => {
    if (map.static) {return;}
    if (touchZoomStartCoords) {
      return;
    }
    document.querySelectorAll("#" + map.getId() + " .pickers")[0].classList.add("hide-while-zoom")
    document.querySelectorAll("#" + map.getId() + " .legend-container")[0].classList.add("hide-while-zoom")
    touchZoomInitialScale = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
    touchZoomInitialCenter = [(x1 + x2)/2, (y1 + y2)/2]
    touchZoomStartCoords = map.coordTracker.getCoords()
  })
  mouse_tracker.registerPinchEndCallback("pinchEnd", ()=>{
    if (map.static) {return;}
    document.querySelectorAll("#" + map.getId() + " .pickers")[0].classList.remove("hide-while-zoom")
    document.querySelectorAll("#" + map.getId() + " .legend-container")[0].classList.remove("hide-while-zoom")
    if (!touchZoomDestCoords) return
    //dotsLayer.style.transformOrigin  = ""
    map.coordTracker.setCoords(touchZoomDestCoords).then(function() {
      updateLegendDotRepresents(map)
      var shapeLayers = document.querySelectorAll("#" + map.getId() + " .shapeLayer")
      var dotsLayer = map.getTransparencyContainer().querySelectorAll("canvas")[0]
      shapeLayers.forEach((shapeLayer)=>{
        shapeLayer.style.transform = ""
        //shapeLayer.style.transformOrigin = ""
      })
      var tileLayers = map.getTransparencyContainer().querySelectorAll(" .tileLayer .zoom-layer");
      tileLayers.forEach((tileLayer)=>{
        tileLayer.style.transform =  ""
        //tileLayer.style.transformOrigin = ""
      })
      dotsLayer.style.transform =  ""
      touchZoomDestCoords = null
      touchZoomInitialScale = null
      touchZoomInitialCenter = null
      touchZoomStartCoords = null
    })
  })
  mouse_tracker.registerPinchMoveCallback("pinchMove", (
    x1, y1, x2, y2, drag_x1, drag_y1, drag_x2, drag_y2, viewport
  ) => {
    if (map.static) {return;}
    if (!touchZoomStartCoords) return
    var frameScale = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
    var scaleFactor = frameScale/touchZoomInitialScale
    if (map.coordTracker.getCoords().z >= 13) {
      scaleFactor = Math.min(1, scaleFactor)
    }
    var frameCenter = [(x1 + x2)/2, (y1 + y2)/2]
    var translate = [(frameCenter[0] - touchZoomInitialCenter[0]), (frameCenter[1] - touchZoomInitialCenter[1])]
    var shapeLayers = map.getTransparencyContainer().querySelectorAll(".shapeLayer")
    var dotsLayer = map.getTransparencyContainer().querySelectorAll("canvas")[0]
    shapeLayers.forEach((shapeLayer)=>{
      shapeLayer.style.transform = "scale(" + scaleFactor + ") translate(" + translate[0] + "px, " + translate[1] + "px)"
      shapeLayer.style.transformOrigin = frameCenter[0] + "px " + frameCenter[1] + "px";
    })
    var tileLayers = document.querySelectorAll("#" + map.getId() + " .tileLayer .zoom-layer");
    tileLayers.forEach((tileLayer)=>{
      tileLayer.style.transform =  "scale(" + scaleFactor + ") translate(" + translate[0] + "px, " + translate[1] + "px)"
      tileLayer.style.transformOrigin  = frameCenter[0] + "px " + frameCenter[1] + "px";
    })
    dotsLayer.style.transform =  "scale(" + scaleFactor + ") translate(" + translate[0] + "px, " + translate[1] + "px)"
    dotsLayer.style.transformOrigin  = frameCenter[0] + "px " + frameCenter[1] + "px";
    touchZoomDestCoords = getImpliedCoordsFromBaseCoordsAndTransform({touchZoomStartCoords, scaleFactor, translate, frameCenter, viewport})
    touchZoomFrameCenter = frameCenter
    //updateTileHtml.call(map, frameCoords)
    return;
  })
  function transitionCoordsTo(newCoords, x, y, duration) {
    return new Promise((resolve)=>{
      var start = Date.now();
      var startCoords = map.coordTracker.getCoords();
      var p = 0.001;
      document.querySelectorAll("#" + map.getId() + " .tract_actual").forEach((el) => {
        el.parentElement.removeChild(el);
      })
      var frame = function() {
        p = (Date.now() - start)/duration;
        var frameCoords;
        if (p > 1) {
          p = 1
          frameCoords = {
            x: newCoords.x,
            y: newCoords.y,
            z: newCoords.z
          };
          setTimeout(() => {
            map.coordTracker.setCoords(frameCoords, {destroyOldCanvas: true}).then(function() {
              updateLegendDotRepresents(map)
              resolve();
            });
          }, 0);
        } else {
          p = easeQuadInOut(p);
          var ease = x=>2/(2-x)-1
          var outCoords = startCoords;
          var inCoords = newCoords;
          var _p = p;
          if (startCoords.z > newCoords.z) {
            outCoords = newCoords;
            inCoords = startCoords;
            _p = 1 - p;
            ease = x=>(2 - 2/(x + 1))
          }
          var z = (newCoords.z - startCoords.z) * ease(p) + startCoords.z;

          /*There are problems if z takes the initial zoomed in value in the frame
          interpolation, the way the tile layers are drawn.*/
          z = Math.min(outCoords.z + 0.9999, z);

          frameCoords = {
            x: outCoords.x + (inCoords.x/2 - outCoords.x)*_p,
            y: outCoords.y + (inCoords.y/2 - outCoords.y)*_p,
            z: z,
          }
          updateTileHtml.call(map, frameCoords)
          var shapeLayers = map.getTransparencyContainer().querySelectorAll(".shapeLayer")
          var dotsLayer = map.getTransparencyContainer().querySelectorAll("canvas")[0]
          var transform_z = 1 + z%1
          if (startCoords.z > newCoords.z) {
            transform_z /= 2
          }
          shapeLayers.forEach((shapeLayer)=>{
            shapeLayer.style.transform = "scale(" + transform_z + ")"
            shapeLayer.style.transformOrigin = x + "px " + y + "px";
          })
          if (dotsLayer) {
            dotsLayer.style.transform = "scale(" + transform_z + ")"
            dotsLayer.style.transformOrigin = x + "px " + y + "px";
          }
          window.requestAnimationFrame(frame);
        }
        
      }
      window.requestAnimationFrame(frame);
    });
  }

  function getImpliedCoordsFromBaseCoordsAndTransform(arg) {
    var { touchZoomStartCoords, scaleFactor, translate, viewport, frameCenter }  = arg
    var z_change = Math.log2(scaleFactor)
    if (z_change > 0) {
      z_change = Math.ceil(z_change - 0.29)
    } else {
      z_change = Math.floor(z_change + 0.29)
    }
    var new_z = touchZoomStartCoords.z + z_change
    new_z = Math.min(13, new_z)
    z_change = new_z - touchZoomStartCoords.z
    scaleFactor = Math.pow(2, z_change)
    var tl_change = [(0 - frameCenter[0])/256*(scaleFactor - 1), (0 - frameCenter[1])/256*(scaleFactor -1 )]
    var x_change = -tl_change[0]/(scaleFactor) - translate[0]/256
    var y_change = -tl_change[1]/(scaleFactor) - translate[1]/256
    var coords = {
      x: touchZoomStartCoords.x + x_change,
      y: touchZoomStartCoords.y + y_change,
      z: new_z
    };
    while (z_change >= 1) {
      z_change -=1
      coords.x *= 2
      coords.y *= 2
    }
    while (z_change < 0) {
      z_change += 1
      coords.x /= 2
      coords.y /= 2
    }
    return coords
  }

  this.zoomIn = function(x, y) {
    if (locked || in_lock) {return;}
    if (map.isDragging()) {return;}
    if (map.static) {return;}
    locked = true;
    out_lock = true;
    var start_coords = map.coordTracker.getCoords();
    if (start_coords.z >= 13) {
      locked = false;
      unlock_out()
      return;
    } //max zoom
    var old_center = [
      x/256,
      y/256
    ];
    var new_center = [
      (start_coords.x + old_center[0]) * 2,
      (start_coords.y + old_center[1]) * 2
    ];
    var end_coords = {
      x: new_center[0] - x/256,
      y: new_center[1] - y/256,
      z: start_coords.z + 1
    }
    return transitionCoordsTo(end_coords, x, y, 200).then(()=>{
      locked = false;
      unlock_out()
    });
  }

  function unlock_out() {
    setTimeout(()=>{
      out_lock = false;
    }, 500)
  }

  function unlock_in() {
    setTimeout(()=>{
      in_lock = false;
    }, 500)
  }

  this.zoomOut = function(x, y) {
    if (locked || out_lock) {return;}
    if (map.isDragging()) {return;}
    locked = true;
    in_lock = true;
    var start_coords = map.coordTracker.getCoords();
    if (start_coords.z <= 7) {
      locked = false
      unlock_in()
      return;
    }
    var old_center = [
      x/256,
      y/256
    ];
    var new_center = [
      (start_coords.x + old_center[0]) / 2,
      (start_coords.y + old_center[1]) / 2
    ];
    var end_coords = {
      x: new_center[0] - x/256,
      y: new_center[1] - y/256,
      z: start_coords.z - 1
    }
    return transitionCoordsTo(end_coords, x, y, 200).then(function() {
      locked = false
      unlock_in()
    });
  }

}

export {MapZoomer}