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
var geojson_bbox = require("geojson-bbox");
var getBounds = require('svg-path-bounds');
var localmemory = {};
var LayerIndex = {
  "high": require("./intermediate/layerbbox_high.json"),
  "medium": require("./intermediate/layerbbox_medium.json"),
  "low": require("./intermediate/layerbbox_low.json")
};
var pako = require("pako");
localforage.clear();
var geoStore = {};
var GEOID_tracker = {};
var svg_path_data = {};
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
var indexes = require("./intermediate/gridIndex.json");

var drawData = {};
var getJSONAndSaveInMemory = function(f, cb) {
  if (!localmemory[f]) {
    getJSONAndSave(f, function(err, d) {
      localmemory[f] = d;
      cb(err, d);
    });
  } else {
    cb(null, localmemory[f]);
  }
};
var getJSONAndSave = function(f, cb) {
  localforage.getItem(f, function(err, locald) {
    if (locald===null) {
      $.getJSON(f, function(d) {
        if (typeof(d)==="object" && d.compressed) {
          d = JSON.parse(pako.inflate(d.d, {to: "string"}));
        }
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

  function handleShapeTopo(d, file, layer) {
    console.log(d, file, layer);
    console.log(geo_data);
  /*  if (typeof(geo_data[file])==="undefined") {
      geo_data[file] = {features: {}};
    }*/
    var geo = topojson.feature(d, d.objects.districts);
    for (var i = 0, ii = geo.features.length; i<ii; i++) {
      var GEOID = geo.features[i].properties.GEOID || geo.features[i].properties.GEOID10;
      geo_data[file][layer].features[GEOID*1] = geo.features[i];
    }
  }

  function getLowResShapes() {
    var requests = [];
    var PromiseMaker = function(file,x,y) {
      return new Promise(function(resolve, reject) {
        getJSONAndSave(URL_BASE + "/grid/" + file + "/low/" + x + "_" + y + ".json", function(err, d) {
          handleShapeTopo(d, file, "low");
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

  function filterToVisible(geo_data, viewbox) {
    var r = {};
    viewbox = viewbox.split(" ");
    for (var layer in geo_data) {
      if (geo_data.hasOwnProperty(layer)) {
        for (var size in geo_data[layer]) {
          if (geo_data[layer].hasOwnProperty(size)) {
            if (!r[size]) r[size] = {};
            if (!r[size][layer]) r[size][layer] = [];
            for (var geoid in geo_data[layer][size].features) {
              if (geo_data[layer][size].features.hasOwnProperty(geoid)) {
                geoid*=1;
                if (!svg_path_data[geoid]) {
                  svg_path_data[geoid] = {};
                }
                var thispath;
                if (!svg_path_data[geoid][size]) {
                  thispath = path(geo_data[layer][size].features[geoid]);
                  svg_path_data[geoid][size] = thispath;
                } else {
                  thispath = svg_path_data[geoid][size];
                }
                if (thispath) {
                  var bbox = getBounds(thispath);
                  if (viewbox[0]*1 + viewbox[2]*1 > bbox[0] &&
                      viewbox[1]*1 + viewbox[3]*1 > bbox[1] &&
                      viewbox[0]*1 < bbox[2] &&
                      viewbox[1]*1 < bbox[3]) {
                    r[size][layer].push(geo_data[layer][size].features[geoid]);
                  }
                }
              }
            }
          }
        }
      }
    }
    console.log(r);
    return r;
  }

  function updateDrawData(svg) {
    drawData = filterToVisible(geo_data, svg.attr("viewBox"));
    drawData = (function(r) {
      for (var size in r) {
        if (r.hasOwnProperty(size)) {
          var topo = topojson.topology({districts:geo_data.cb_2015_us_state_500k[size]}, 50000);
          var merged = topojson.merge(topo, topo.objects.districts.geometries);
          r[size].national = [merged];
        }
      }
      return r;
    })(drawData);
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
    svg.selectAll("g.size").selectAll("g.layer").each(function(layer) {
      var size = d3.select(this.parentNode).attr("class").split(" ")[1];
      var scaling ={"low":1,"medium":0.1,"high":0.01};
      d3.select(this).selectAll("path")
        .data(function() {
          return drawData[size][layer];
        })
        .enter()
        .append("path")
        .attr("d", function(el) {

          if (!el.properties) {
            el.properties = {};
          }
          var geoid = el.properties.GEOID | el.properties.GEOID10;
          try {
            if (!geoid || !svg_path_data[geoid]) {
              return path(el);
            }
            return svg_path_data[geoid][size];
          } catch (ex) {
            console.log(geoid, ex);
          }
        })
        .attr("stroke-width",function() {
          if (layer.indexOf("state")!==-1) {
            return 0.8*scaling[size];
          }
          return 0.5*scaling[size];
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
  }

  function DrawInitialMap() {
    svg = d3.select(sel + " .mapwrap").append("svg")
      .attr("viewBox", [50, 5, 820, 820*$(sel + " .mapwrap").height()/$(sel + " .mapwrap").width()].join(" "))
      .attr("preserveAspectRatio", "xMinYMin slice");

    updateDrawData(svg);


    require("./js/zoom.js")(sel + " .mapwrap", m, $, d3);
    require("./js/drag.js")(sel + " .mapwrap", m, $, d3);
    m.onZoom(checkForDownloads);
    console.log("done");
  }

  function checkForDownloads() {
    var viewBox = svg.attr("viewBox").split(" ");
    for (var i = 0, ii = viewBox.length; i<ii; i++) {
      viewBox[i]*=1;
    }
    var range = "low";
    if (viewBox[2]*1 < 100) {
      range = "medium";
    }
    if (viewBox[2]*1 < 10) {
      range = "high";
    }
    if (range!=="low") {
      var geoid_to_file = {};
      var grid_to_geoid = {};
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
          getJSONAndSaveInMemory(file, function(err, d) {
            cb(file, d);
            resolve();
          });
        }));
      };

      var grid_to_geoid_cb = function(file, d) {
        grid_to_geoid[file.replace("/index.json","")] = d.grid_to_geoid;
        geoid_to_file[file.replace("/index.json","")] = d.geoid_to_file;
      };

      for (var file in indexes) {
        if (indexes.hasOwnProperty(file)) {
          if (layerObj[file + ".json"]) {
            toDownload.push(downloadPromiseMaker(URL_BASE + "/grid/" + file + "/" + range + "/index.json", grid_to_geoid_cb));

          }
        }
      }
      Promise.all(toDownload).then(function() {
        getShapefiles(grid_to_geoid, geoid_to_file, range);
      });
    }
  }

  function getShapefiles(grid_to_geoid, geoid_to_file, range) {
    var geoids = {};
    for (var layer in grid_to_geoid) {
      if (grid_to_geoid.hasOwnProperty(layer)) {
        for (var x in grid_to_geoid[layer]) {
          if (grid_to_geoid[layer].hasOwnProperty(x)) {
            for (var y in grid_to_geoid[layer][x]) {
              if (grid_to_geoid[layer][x].hasOwnProperty(y)) {
                for (var i = 0, ii = grid_to_geoid[layer][x][y].length; i<ii; i++) {
                  geoids[grid_to_geoid[layer][x][y][i]] = 1;
                }
              }
            }
          }
        }
      }
    }
    var files = (function(g) {
      var r = {};
      for (var geoid in g) {
        if (g.hasOwnProperty(geoid)) {
          if (Math.random()<0.001) {
            for (var file in geoid_to_file) {
              if (geoid_to_file.hasOwnProperty(file)) {
                if (geoid_to_file[file][geoid*1]) {
                  r[file + "/" +geoid_to_file[file][geoid*1].join("_") + ".json"]=1;
                }
              }
            }
          }
        }
      }
      var ar = [];
      for (var filen in r) {
        if (r.hasOwnProperty(filen)) {
          ar.push(filen);
        }
      }
      return ar;
    })(geoids);
    var requests = [];
    var promiseMaker = function(file) {
      return new Promise(function(resolve, reject) {
        getJSONAndSave(file, function(err, d) {
          file = file.split("/");
          handleShapeTopo(d, file[file.length-3], range);
          resolve();
        });
      });
    };
    for (var k = 0, kk = files.length; k<kk; k++) {
      requests.push(promiseMaker(files[k]));
    }
    Promise.all(requests).then(function() {
      updateDrawData(d3.select(sel + " svg"));
    });
  }

}; /*Interactive()*/



function getIndexes() {
  var r = {};
  for (var file in indexes) {
    if (indexes.hasOwnProperty(file)) {
      var filea = file.split("/");
      if (!r[filea[0]]) {
        r[filea[0]] = {};
      }
      r[filea[0]][filea[1]] = indexes[file];
    }
  }
  indexes = r;
  return new Promise(function(resolve, reject) {
    resolve();
  });
}

$(document).ready(function() {
  return new Interactive("#hous4-16-18");
});
})();
