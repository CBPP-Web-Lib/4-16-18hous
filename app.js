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
var Interactive = function(sel) {
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
        $.getJSON(URL_BASE + "/grid/" + file + "/low/" + x + "_" + y + ".json", function(d) {
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
      .attr("viewBox","50 5 820 100")
      .attr("preserveAspectRatio","xMinYMin");
    geo_data.national = {};
    geo_data.national.low = (function() {
      var topo = topojson.topology({districts:geo_data.cb_2015_us_state_500k.low});
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
      .data(FileIndex.concat("national"))
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
  }

};

function getIndexes() {
  var PromiseMaker = function(folder, gridSize) {
    var file = URL_BASE + "/grid/" + folder + "/" + gridSize + "/index.json";
    return new Promise(function(resolve, reject) {
      $.getJSON(file, function(d) {
        if (typeof(indexes[folder])==="undefined") {
          indexes[folder] = {};
        }
        indexes[folder][gridSize] = d;
        resolve();
        console.log(requests.length);
      }).fail(function() {
        console.log("bad" + file);
        reject();
      });
    });
  };
  var requests = [];
  for (var i = 0, ii = FileIndex.length; i<ii; i++) {
    var folder = FileIndex[i];
    for (var gridSize in GridConfig) {
      if (GridConfig.hasOwnProperty(gridSize)) {
        requests.push(PromiseMaker(folder, gridSize));
      }
    }
  }
  return Promise.all(requests);
}

$(document).ready(function() {
  return new Interactive("#hous4-16-18");
});
})();
