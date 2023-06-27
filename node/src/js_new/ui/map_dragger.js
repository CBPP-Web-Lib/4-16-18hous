function mapDragger(map, mouse_tracker) {
  var start_coords
  mouse_tracker.registerStartCallback("mapDragStart", ()=>{
    if (map.isZooming()) {
      return false;
    }
    start_coords = map.coordTracker.getCoords()
  });
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
    map.coordTracker.setCoords(coords)
  })
}

export {mapDragger}