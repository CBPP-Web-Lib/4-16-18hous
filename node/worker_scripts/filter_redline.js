
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
var geojson_bbox = require("geojson-bbox");
var turf_area = require("@turf/area").default;
var turf = require("turf");

parentPort.on("message", function(e) {
  var list = e.list;
  var results = [];
  list.forEach((item)=> {
    var {cbsa_id, cbsa, redline} = item;
    results.push({
      cbsa_id,
      result: redline_intersect(redline, cbsa)
    });
  });
  parentPort.postMessage({results});
});

function redline_intersect(redline, cbsa) {
  if (redline.geometry && cbsa.geometry) {
    var a = geojson_bbox(redline);
    var b = geojson_bbox(cbsa);
    if (a && b) {
      /*x1, y1, x2, y2*/
      if (!(
          a[2] < b[0] ||
          b[2] < a[0] ||
          a[1] > b[3] ||
          b[3] < a[1]
        )) {
          try {
            if (typeof(turf.intersect(redline, cbsa))!=="undefined") {
              //console.log("intersect");
              return redline;
            } else {
              //console.log("no intersect");
              return null;
            }
          } catch (ex) {
            console.log(ex);
          }
      }
    }
  }
  return null;
}