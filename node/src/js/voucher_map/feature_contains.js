import { polygonContains } from "d3"

const featureContains = function(point, feature) {
  var result = false;
  for (var i = 0, ii = feature.geometry.coordinates.length;i<ii;i++) {
    if (feature.geometry.type==="MultiPolygon") {
      for (var k = 0, kk = feature.geometry.coordinates[i].length;k<kk;k++) {
        if (polygonContains(feature.geometry.coordinates[i][k], point)) {
          result = true;
        }
      }
    } else {
      if (polygonContains(feature.geometry.coordinates[i], point)) {
        result = true;
      }
    }
  }
  return result
}

export { featureContains }