function mapDragger(map, mouse_tracker) {
  var start_coords
  mouse_tracker.registerStartCallback("mapDragStart", ()=>{
    start_coords = map.tileCoordTracker.getTileCoords()
  });
  mouse_tracker.registerMoveCallback("mapDragMove", (x, y)=> {
    var coords = {
      x: start_coords.x - x/256,
      y: start_coords.y - y/256,
      z: start_coords.z
    };
    map.tileCoordTracker.setTileCoords(coords)
  })
}

export {mapDragger}