/*globals require, document, console, window, Promise*/
(function() {
"use strict";
if (typeof(Promise)==="undefined") {
  Promise = require("promise-polyfill");
}
var $ = require("jquery");
var d3 = require("d3");
var topojson = require("topojson");
var Figure = require("./CBPP_Figure")($);
var GridConfig = require("./gridConfig.json");
var FileIndex = require("./fileIndex.json");
var localforage = require("localforage");
var LayerIndex = {
  "high": require("./intermediate/layerbbox_high.json"),
  "medium": require("./intermediate/layerbbox_medium.json"),
  "low": require("./intermediate/layerbbox_low.json")
};
localforage.clear();
var geoStore = {};
var GEOID_tracker = {};
var geo_data = (function() {
  var r = {};
  for (var i = 0, ii = FileIndex.length; i<ii; i++) {
    r[FileIndex[i]] = {};
    for (var size in GridConfig) {
      if (GridConfig.hasOwnProperty(size)) {
        r[FileIndex[i]][size] = {
          type:"FeatureCollection",
          features: []
        };
      }
    }
  }
  return r;
})();
var URL_BASE;
require("./app.css");
var indexes = {};
var geoid_to_file = {};
var grid_to_geoid = {};
var getJSONAndSave = function(f, cb) {
  localforage.getItem(f, function(err, locald) {
    if (locald===null) {
      $.getJSON(f, function(d) {
        localforage.setItem(f, d);
        cb(null, d);
      }).fail(function() {
        cb(err);
      });
    } else {
      cb(null, locald);
    }
  });

};
var Interactive = function(sel) {
  var m = this;
  m.requests = [];
  new Figure.Figure(sel, {
    rows: [0.61]
  });
  $(sel).find(".grid00").empty().addClass("mapwrap");
  URL_BASE = $("#script_hous4-16-18")[0].src.replace("/js/app.js","");
  var svg;
  var projection = d3.geoAlbersUsa(),
    path = d3.geoPath(projection);
  getIndexes()
    .then(getLowResShapes)
    .then(DrawInitialMap);

  function getLowResShapes() {
    var requests = [];
    var PromiseMaker = function(file,x,y) {
      return new Promise(function(resolve, reject) {
        getJSONAndSave(URL_BASE + "/grid/" + file + "/low/" + x + "_" + y + ".json", function(err, d) {
          var geo = topojson.feature(d, d.objects.districts);
          if (typeof(geo_data[file])==="undefined") {
            geo_data[file] = {};
          }
          for (var i = 0, ii = geo.features.length; i<ii; i++) {
            var GEOID = geo.features[i].properties.GEOID || geo.features[i].properties.GEOID10;
            if (typeof(GEOID_tracker[GEOID])==="undefined") {
              geo_data[file].low.features.push(geo.features[i]);
            } else if (typeof(GEOID)==="undefined") {
              geo_data[file].low.features.push(geo.features[i]);
            }
            GEOID_tracker[GEOID] = true;
          }
          resolve();
        });
      });
    };
    for (var file in indexes) {
      if (indexes.hasOwnProperty(file)) {
        if (file==="tl_2015_us_cbsa" ||
            file==="cb_2015_us_state_500k") {
          for (var i = 0, ii = indexes[file].low.length; i<ii; i++) {
            var d = indexes[file].low[i];
            requests.push(PromiseMaker(file, d[0], d[1]));
          }
        }
      }
    }
    return Promise.all(requests);
  }

  function DrawInitialMap() {
    svg = d3.select(sel + " .mapwrap").append("svg")
      .attr("viewBox", [50, 5, 820, 820*$(sel + " .mapwrap").height()/$(sel + " .mapwrap").width()].join(" "))
      .attr("preserveAspectRatio", "xMinYMin slice");
    geo_data.national = {};
    geo_data.national.low = (function() {
      var topo = topojson.topology({districts:geo_data.cb_2015_us_state_500k.low}, 50000);
      var merged = topojson.merge(topo, topo.objects.districts.geometries);
      return {
        type: "FeatureCollection",
        features: [merged]
      };
    })();
    svg.selectAll("g")
      .data((function(g) {
        var r = [];
        for (var size in g) {
          if (g.hasOwnProperty(size)) {
            r.push(size);
          }
        }
        return r;
      })(GridConfig))
      .enter()
      .append("g")
      .attr("class", function(d) {return "size " + d;});
    svg.selectAll("g.size").selectAll("g")
      .data(FileIndex.concat(["national"]))
      .enter()
      .append("g")
      .attr("class", function(d) {
        return "layer " + d;
      });

    svg.selectAll("g.size.low").selectAll("g.layer").each(function(layer) {
      d3.select(this).selectAll("path")
        .data(geo_data[layer].low.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("stroke-width",function() {
          if (layer.indexOf("state")!==-1) {
            return 0.8;
          }
          return 0.5;
        })
        .attr("fill", function() {
          if (layer.indexOf("state")!==-1) {
            return "#D6E4F0";
          }
          if (layer==="national") {
            return "none";
          }
          return "#EB9123";
        })
        .attr("fill-opacity", function() {
          if (layer.indexOf("state")!==-1) {
            return 1;
          }

          return 0.5;
        })
        .attr("stroke",function() {
          if (layer.indexOf("state")!==-1) {
            return "#fff";
          }
          if (layer==="national") {
            return "#0C61A4";
          }
          return "#EB9123";
        });
    });
    require("./js/zoom.js")(sel + " .mapwrap", m, $, d3);
    require("./js/drag.js")(sel + " .mapwrap", m, $, d3);
    m.onZoom(checkForDownloads);
  }

  function checkForDownloads() {
    var viewBox = svg.attr("viewBox").split(" ");
    for (var i = 0, ii = viewBox.length; i<ii; i++) {
      viewBox[i]*=1;
    }
    var range = "low";
    if (viewBox[2]*1 < 400) {
      range = "medium";
    }
    if (viewBox[2]*1 < 100) {
      range = "high";
    }
    if (range!=="low") {
      var samplePoints = [];
      for (var x = viewBox[0]; x<viewBox[0] + viewBox[2]*(51/50); x+= viewBox[2]/50) {
        for (var y = viewBox[1]; y<viewBox[1] + viewBox[3]*(51/50); y+= viewBox[3]/50) {
          samplePoints.push(projection.invert([x,y]));
        }
      }
      var pointsobj = {};
      var layerObj = {};
      for (i = 0, ii = samplePoints.length; i<ii; i++) {
        var g = GridConfig[range].gridSize;
        for (var layer in LayerIndex[range]) {
          if (LayerIndex[range].hasOwnProperty(layer)) {
            var p = samplePoints[i];
            if (p[0] >= LayerIndex[range][layer][0] &&
                p[0] <= LayerIndex[range][layer][2] &&
                p[1] >= LayerIndex[range][layer][1] &&
                p[1] <= LayerIndex[range][layer][3]) {
              layerObj[layer] = 1;
            }
          }
        }
        pointsobj[Math.floor(samplePoints[i][0]/g)*g + "_" + Math.floor(samplePoints[i][1]/g)*g] = 1;
      }
      var fileList = [];
      for (var c in pointsobj) {
        if (pointsobj.hasOwnProperty(c)) {
          fileList.push(c);
        }
      }
      var toDownload = [];
      var downloadPromiseMaker = function(file, cb) {
        toDownload.push(new Promise(function(resolve, reject) {
          getJSONAndSave(file, function(err, d) {
            cb(file, d);
            resolve();
          });
        }));
      };

      var grid_to_geoid_cb = function(file, d) {
        grid_to_geoid[file] = d;
      };

      var geoid_to_file_cb = function(file, d) {
        geoid_to_file[file] = d;
      };

      for (var file in indexes) {
        if (indexes.hasOwnProperty(file)) {
          if (layerObj[file]) {
            toDownload.push(downloadPromiseMaker(URL_BASE + "/grid/" + file + "/" + range + "/grid_to_geoid.json", grid_to_geoid_cb));
            toDownload.push(downloadPromiseMaker(URL_BASE + "/grid/" + file + "/" + range + "/geoid_to_file.json", geoid_to_file_cb));
          }
        }
      }

      Promise.all(toDownload).then(function() {
        console.log(grid_to_geoid);
        console.log(geoid_to_file);
      });

      //var coordsmin = projection.invert([viewBox[0], viewBox[1]]);
      //var coordsmax = projection.invert([viewBox[0] + viewBox[2], viewBox[1]+viewBox[3]]);
    //  console.log(coordsmin, coordsmax);
    }
  }

};



function getIndexes() {
  var PromiseMaker = function(folder, gridSize) {
    var file = URL_BASE + "/grid/" + folder + "/" + gridSize + "/index.json";
    return new Promise(function(resolve, reject) {
      getJSONAndSave(file, function(err, d) {
        if (err) {
          console.log("bad" + file);
          reject();
        }
        if (typeof(indexes[folder])==="undefined") {
          indexes[folder] = {};
        }
        indexes[folder][gridSize] = d;
        resolve();
      });
    });
  };
  var requests = [];
  for (var i = 0, ii = FileIndex.length; i<ii; i++) {
    var folder = FileIndex[i];
    for (var gridSize in GridConfig) {
      if (GridConfig.hasOwnProperty(gridSize)) {
        var use = true;
        if (!GridConfig[gridSize].exclude) GridConfig[gridSize].exclude = [];
        for (var j = 0, jj= GridConfig[gridSize].exclude.length; j<jj; j++) {
          if (FileIndex[i].indexOf(GridConfig[gridSize].exclude[j])!==-1) {
            use = false;
          }
        }
        if (use) {requests.push(PromiseMaker(folder, gridSize));}
      }
    }
  }
  return Promise.all(requests);
}

$(document).ready(function() {
  return new Interactive("#hous4-16-18");
});
})();
