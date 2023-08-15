import { polygonContains } from "d3"

function polygonContainsWithHoles(geometry, point) {
  var result = false;
  /*main polygon*/
  if (polygonContains(geometry[0], point)) {
    result = true;
  }
  /*holes*/
  for (var i = 1, ii = geometry.length; i<ii;i++) {
    if (polygonContains(geometry[i], point)) {
      result = false;
      break;
    }
  }
  return result;
}

const featureContains = function(point, feature) {
  var result = false;
  if (feature.geometry) {
    if (feature.geometry.type==="MultiPolygon") {
      for (var k = 0, kk = feature.geometry.coordinates.length;k<kk;k++) {
        if (polygonContainsWithHoles(feature.geometry.coordinates[k], point)) {
          result = true;
        }
      }
    } else {
      if (polygonContainsWithHoles(feature.geometry.coordinates, point)) {
        result = true;
      }
    }
  }
  return result
}

export { featureContains }