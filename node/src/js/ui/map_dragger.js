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
      console.log("is zooming")
      return false;
    }
    if (map.coordTracker.coordChangeInProgress()) {
      console.log("coord change in progress")
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
  mouse_tracker.registerMoveCallback("mapDragMove", (x, y)=> {
    if (map.isZooming()) {
      return false;
    }
    if (typeof(start_coords)==="undefined" || !start_coords) {
      return;
    }
    var coords = {
      x: start_coords.x - x/256,
      y: start_coords.y - y/256,
      z: start_coords.z
    };
    updateTileHtml.call(map, coords);
    translateMap.call(map, x, y)
    return;

    map.coordTracker.setCoords(coords).then((result)=> {
      if (!result) {
        deferred = coords
      } else {
        if (deferred) {
          clearTimeout(timer)
          timer = setTimeout(function() {
            //map.coordTracker.setCoords(deferred)
          }, 50)
        }
      }
    })
  })
  mouse_tracker.registerEndCallback("mapDragEnd", (x, y)=>{
    is_dragging = false
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