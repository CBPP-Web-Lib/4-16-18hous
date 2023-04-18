"use strict";

module.exports = function($, d3, m, sel) {
  var exports = {};
  m.bbox_overlap = function(box1, box2) {
    return !(
      box1[0] > box2[2] ||
      box1[1] > box2[3] ||
      box2[0] > box1[2] ||
      box2[1] > box1[3]
    );
  };
  m.featureContains = function(point, feature) {
    var pip = false;
    for (var i = 0, ii = feature.geometry.coordinates.length;i<ii;i++) {
      if (feature.geometry.type==="MultiPolygon") {
        for (var k = 0, kk = feature.geometry.coordinates[i].length;k<kk;k++) {
          if (d3.polygonContains(feature.geometry.coordinates[i][k], point)) {
            pip = true;
          }
        }
      } else {
        if (d3.polygonContains(feature.geometry.coordinates[i], point)) {
          pip = true;
        }
      }
    }
    return pip;
  }
  return exports;
};