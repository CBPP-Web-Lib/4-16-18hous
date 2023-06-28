import {easeQuadInOut} from "d3";

function MapZoomer(map) {
  var el = document.querySelectorAll("#" + map.getId() + " .map-viewport")[0];
  var locked = false;
  el.addEventListener("wheel", (e)=> {
    e.preventDefault();
    map.mouseTracker.mouseUp()
    var rect = el.getBoundingClientRect();
    if (e.deltaY < 0) {
      this.zoomIn((e.clientX - rect.left), (e.clientY - rect.top));
    } else {
      this.zoomOut((e.clientX - rect.left), (e.clientY - rect.top));
    }
  });
  this.getLocked = function() {
    return locked;
  }
  function transitionCoordsTo(newCoords, duration) {
    return new Promise((resolve)=>{
      var start = Date.now();
      var startCoords = map.coordTracker.getCoords();
      var p = 0.001;
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
          map.coordTracker.setCoords(frameCoords);
          resolve();
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
          map.coordTracker.setCoords(frameCoords).then(()=>{
            window.requestAnimationFrame(frame);
          })
        }
        
      }
      window.requestAnimationFrame(frame);
    });
  }

  this.zoomIn = function(x, y) {
    if (locked) {return;}
    var start_coords = map.coordTracker.getCoords();
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
    var start_coords = map.coordTracker.getCoords();
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