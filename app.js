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
var pako = require("pako");
localforage.clear();
var geoStore = {};
var GEOID_tracker = {};
var svg_path_data = {};
var geo_data = {};
var cb_2015_us_state_500k = require("./topojson/low/cb_2015_us_state_500k.json");
var tl_2015_us_cbsa = require("./topojson/low/tl_2015_us_cbsa.json");
geo_data.cb_2015_us_state_500k = {low: topojson.feature(cb_2015_us_state_500k, cb_2015_us_state_500k.objects.districts)};
geo_data.tl_2015_us_cbsa = {low: topojson.feature(tl_2015_us_cbsa, tl_2015_us_cbsa.objects.districts)};
var URL_BASE;
require("./app.css");

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
  DrawInitialMap();

  function filterToVisible(geo_data, viewbox) {
    var r = {};
    viewbox = viewbox.split(" ");
    for (var layer in geo_data) {
      if (geo_data.hasOwnProperty(layer)) {
        for (var size in geo_data[layer]) {
          if (geo_data[layer].hasOwnProperty(size)) {
            if (!r[size]) r[size] = {};
            if (!r[size][layer]) r[size][layer] = [];
            for (var i = 0, ii = geo_data[layer][size].features.length; i<ii; i++) {
              var geoid = geo_data[layer][size].features[i].properties.GEOID ||
                geo_data[layer][size].features[i].properties.GEOID10;
              geoid*=1;
              if (!svg_path_data[geoid]) {
                svg_path_data[geoid] = {};
              }
              var thispath;
              if (!svg_path_data[geoid][size]) {
                thispath = path(geo_data[layer][size].features[i]);
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
                  r[size][layer].push(geo_data[layer][size].features[i]);
                }
              }

            }
          }
        }
      }
    }
    return r;
  }

  function updateDrawData(svg) {
    drawData = filterToVisible(geo_data, svg.attr("viewBox"));
    drawData = (function(r) {
      for (var size in r) {
        if (r.hasOwnProperty(size)) {
          if (size==="low") {
            if (!r[size].national) {
              var topo = topojson.topology({districts:geo_data.cb_2015_us_state_500k[size]}, 50000);
              var merged = topojson.merge(topo, topo.objects.districts.geometries);
              r[size].national = [merged];
            }
          }
        }
      }
      return r;
    })(drawData);
    var sizeLayers = svg.selectAll("g")
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
    var fileLayers = svg.selectAll("g.size").selectAll("g")
      .data(FileIndex.concat(["national"]))
      .enter()
      .append("g")
      .attr("class", function(d) {
        return "layer " + d;
      });
    var shapes = svg.selectAll("g.size").selectAll("g.layer").each(function(layer) {
      var size = d3.select(this.parentNode).attr("class").split(" ")[1];
      var scaling ={"low":1,"high":0.1};
      d3.select(this).selectAll("path")
        .data(function() {
          if (!drawData[size]) {
            drawData[size] = {};
          }
          var d = drawData[size][layer];
          if (!d) {
            d = [];
          }
          return d;
        })
        .enter()
        .append("path")
        .on("click", function(d) {
          if (d3.select(this.parentNode).attr("class").split(" ")[1] === "tl_2015_us_cbsa") {
            var geoid = d.properties.GEOID;
            getJSONAndSaveInMemory(URL_BASE + "/topojson/high/tl_2010_tract_" + geoid + ".json", function(err, d) {
              var geo = topojson.feature(d, d.objects.districts);
              geo_data["tl_2010_tract_" + geoid] = {high:geo};
              updateDrawData(svg);
            });
          }
        })
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
  //  m.onZoom(checkForDownloads);
    console.log("done");
  }
}; /*Interactive()*/


$(document).ready(function() {
  return new Interactive("#hous4-16-18");
});
})();
