/*globals require, document, console, window, Promise*/
(function() {
"use strict";

/*external libraries*/
require("babel-polyfill");
var $ = require("jquery");
var d3 = require("d3");
var topojson = require("topojson");
var pako = require("pako");
var geojson_bbox = require("geojson-bbox");

/*linked files*/
var cb_2015_us_state_500k = JSON.parse(pako.inflate(require("./topojson/low/cb_2015_us_state_500k.txt"),{to:"string"}));
var tl_2015_us_cbsa = JSON.parse(pako.inflate(require("./topojson/low/tl_2015_us_cbsa.txt"),{to:"string"}));
var GridConfig = require("./gridConfig.json");
var FileIndex = require("./fileIndex.json");
var waterIndex = require("./waterIndex.json");
var build_tile_functions = require("./js/tile_functions.js");
var build_geo_functions = require("./js/geo_functions.js");
var build_dot_functions = require("./js/dot_functions.js");
var build_draw_functions = require("./js/draw_functions.js");
var build_legend_functions = require("./js/legend.js"); 
var build_popup = require("./js/popup.js");
var build_data_config = require("./js/data_config.js");
var build_cbsa_zoom_functions = require("./js/cbsa_zoom.js");
var build_resize = require("./js/resize.js");
var build_fullscreen = require("./js/fullscreen.js");
var build_locking = require("./js/locking.js");
require("./app.css");

/*global storage/cache object for requested JSON data*/
var localmemory = {};

/*caching for paths, other svg elements*/
var g = {};
var geo_data = g.geo_data = {}; 
var water_data = g.water_data = {type:"FeatureCollection","features":[]};

/*other globals*/
var URL_BASE; 

/*CBPP-specific dependencies*/
var Figure = require("./CBPP_Figure")($);

/*convert initial state and low-res cbsa shapes to geojson features and add to geo_data*/
geo_data.cb_2015_us_state_500k = {low: topojson.feature(cb_2015_us_state_500k, cb_2015_us_state_500k.objects.districts)};
geo_data.tl_2015_us_cbsa = {low: topojson.feature(tl_2015_us_cbsa, tl_2015_us_cbsa.objects.districts)};
geo_data.water = {high: water_data};

/*methods for getting JSON data*/
g.getJSONAndSaveInMemory = function(f, cb) {
  if (!localmemory[f]) {
    g.getJSONAndSave(f, function(err, d) {
      localmemory[f] = d;
      cb(err, d);
    });
  } else {
    cb(null, localmemory[f]);
  }
};

g.getJSONAndSaveInMemory = function(f, cb) {
  if (f.indexOf(".json")!==-1) {
    $.getJSON(f, function(d) {
      handle(d);
    });
  } else {
    $.ajax({
      url: f,
      type:"GET",
      mimeType: 'text/plain',
      success: function(d) {
        d = pako.inflate(d,{to:"string"});
        d = JSON.parse(d);
        handle(d);
      }
    });
  }
  var handle = function(d) {
    if (typeof(d)==="object" && d.compressed) {
      d = JSON.parse(pako.inflate(d.d, {to: "string"}));
    }
    cb(null, d);
  };
};

/*main constructor for map object*/
var Interactive = function(sel) {
  var m = this; /*easy access to main object*/

  /*initial tasks and config*/
  function initialize() {
    new Figure.Figure(sel, {
      subtitle: "<div class=\"data-picker-wrapper\"></div>",
      rows: [0.61,"fixed","fixed"]
    });
    $(sel).find(".grid00").empty().addClass("mapwrap");
    $(sel).find(".grid01").empty().addClass("legendwrap");
    $(sel).find(".grid02").empty().append($(document.createElement("div")).addClass("dotExplainwrap"));
    $(sel).find(".grid02").append($(document.createElement("div")).addClass("redliningLegend"));
    URL_BASE = g.URL_BASE = $("#script_hous4-16-18")[0].src.replace("/js/app.js","");
    m.projection = d3.geoAlbers();
    m.dataset = "poverty_rate";
    m.checked_dots = ["vouchers"];
    m.path = d3.geoPath(m.projection);
    m.fullUSViewbox = [50, 5, 820, 499].join(" ");
    m.csv = {};
    m.cbsaBins = {};
  }

  initialize();

  build_tile_functions($, d3, m, sel, g);
  build_geo_functions($, d3, m, sel);
  build_dot_functions($, d3, m, sel, geojson_bbox);
  build_draw_functions($, 
    d3, 
    m,
    sel, 
    g, 
    geo_data, 
    topojson,
    geojson_bbox,
    water_data, 
    GridConfig, 
    FileIndex,
    waterIndex
  );
  build_legend_functions($, d3, m, sel);
  build_popup($, m, sel); 
  build_data_config($, m);
  build_cbsa_zoom_functions($, d3, m, sel, g, geojson_bbox);
  build_locking(m);
  m.DrawInitialMap();
  build_fullscreen($, d3, m, sel);
  build_resize($, d3, m, sel);
  
}; /*Interactive()*/


$(document).ready(function() {
  return new Interactive("#hous4-16-18");
});
})();
