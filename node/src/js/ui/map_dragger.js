import { updateTileHtml } from "../voucher_map/update_tile_html"
import { translateMap } from "./translate_map"

function mapDragger() {
  var start_coords
  var is_dragging
  var map = this
  var mouse_tracker = map.mouseTracker
  mouse_tracker.registerStartCallback("mapDragStart", ()=>{
    if (is_dragging) {return;}
    if (map.isZooming()) {
      return false;
    }
    if (map.static) {return;}
    if (map.coordTracker.coordChangeInProgress()) {
      return false;
    }
    if (start_coords) {
      return false;
    }
    is_dragging = true
    start_coords = map.coordTracker.getCoords()
  });
  var deferred;
  var timer;
  map.isDragging = function() {
    return is_dragging
  }
  mouse_tracker.registerMoveCallback("mapDragMove", (x, y)=> {
    if (map.isZooming()) {
      return false;
    }
    if (typeof(start_coords)==="undefined" || !start_coords) {
      return;
    }
    if (map.static) {return;}
    var coords = {
      x: start_coords.x - x/256,
      y: start_coords.y - y/256,
      z: start_coords.z
    };
    updateTileHtml.call(map, coords);
    translateMap.call(map, x, y)
  })
  mouse_tracker.registerEndCallback("mapDragEnd", (x, y)=>{
    is_dragging = false
    if (map.static) {return;}
    if (isNaN(x) || isNaN(y)) {return;}
    if (start_coords) {
      if (map.coordTracker.getCoords().z !== start_coords.z) {
        start_coords = map.coordTracker.getCoords()
      }
      var coords = {
        x: start_coords.x - x/256,
        y: start_coords.y - y/256,
        z: start_coords.z
      };
      if (x !== 0 || y !== 0) {
        map.coordTracker.setCoords(coords).then(function() {
          start_coords = null
        })
      }
    }
    
  })
}

export {mapDragger}