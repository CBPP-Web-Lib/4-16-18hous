import {easeQuadInOut} from "d3";

function MapZoomer(map) {
  var el = document.querySelectorAll("#" + map.getId() + " .map-viewport")[0];
  var locked = false;
  el.addEventListener("wheel", (e)=> {
    e.preventDefault();
    var rect = el.getBoundingClientRect();
    if (e.deltaY < 0) {
      this.zoomIn((e.clientX - rect.left), (e.clientY - rect.top));
    } else {
      this.zoomOut((e.clientX - rect.left), (e.clientY - rect.top));
    }
  });

  function transitionCoordsTo(newCoords, duration) {
    return new Promise((resolve)=>{
      var start = Date.now();
      var startCoords = map.tileCoordTracker.getTileCoords();
      var p = 0;
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
          map.tileCoordTracker.setTileCoords(frameCoords);
          resolve();
        } else {
          window.requestAnimationFrame(frame);
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
          frameCoords = {
            x: outCoords.x + (inCoords.x/2 - outCoords.x)*_p,
            y: outCoords.y + (inCoords.y/2 - outCoords.y)*_p,
            z: z,
          }
          map.tileCoordTracker.setTileCoords(frameCoords)
        }
        
      }
      frame();
    });
  }

  this.zoomIn = function(x, y) {
    if (locked) {return;}
    var start_coords = map.tileCoordTracker.getTileCoords();
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
    locked = true;
    return transitionCoordsTo(end_coords, 200).then(function() {
      locked = false;
    });
  }

  this.zoomOut = function(x, y) {
    if (locked) {return;}
    var start_coords = map.tileCoordTracker.getTileCoords();
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
    locked = true;
    return transitionCoordsTo(end_coords, 200).then(function() {
      locked = false;
    });
  }

}

export {MapZoomer}