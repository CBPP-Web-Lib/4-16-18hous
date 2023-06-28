function mapDragger(map, mouse_tracker) {
  var start_coords
  mouse_tracker.registerStartCallback("mapDragStart", ()=>{
    if (map.isZooming()) {
      return false;
    }
    start_coords = map.coordTracker.getCoords()
  });
  var deferred;
  mouse_tracker.registerMoveCallback("mapDragMove", (x, y)=> {
    if (map.isZooming()) {
      return false;
    }
    if (typeof(start_coords)==="undefined") {
      return;
    }
    var coords = {
      x: start_coords.x - x/256,
      y: start_coords.y - y/256,
      z: start_coords.z
    };
    map.coordTracker.setCoords(coords).then((result)=> {
      if (!result) {
        deferred = coords
      } else {
        if (deferred) {
          map.coordTracker.setCoords(deferred)
        }
      }
    })
  })
  mouse_tracker.registerEndCallback("mapDragEnd", ()=>{
    start_coords = null
  })
}

export {mapDragger}