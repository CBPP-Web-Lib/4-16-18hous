/*globals require, document, console, window, Promise*/

import 'core-js/stable';
import 'regenerator-runtime/runtime';

if (typeof(window.runOnce)==="undefined") {
  window.runOnce = false;
}
(function() {
"use strict";
/*prevent double code execution in Drupal*/
if (window.runOnce) {
  return;
}
window.runOnce = true;

/*fail for IE <=10 */
var jscriptVersion = new Function("/*@cc_on return @_jscript_version; @*/")();
if (jscriptVersion !== undefined) {
  ieToLow();
  throw new Error("IE 11.0 or higher required");
}

/*external libraries*/
var $ = require("jquery");
var d3 = require("d3");
var csv_parse = require("papaparse");
var topojson = require("topojson");
var pako = require("pako");
var geojson_bbox = require("geojson-bbox");

/*linked files*/
var dom = require("./dom.html").default;
var GridConfig = require("./gridConfig.json");
var FileIndex = require("../tmp/fileIndex.json");
var waterIndex = require("../tmp/waterIndex.json");
var build_intro_functions = require("./js/intro_functions.js"); 
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

var cb_2015_us_state_500k = require("../topojson/low/cb_2015_us_state_500k.json");
var tl_2015_us_cbsa = require("../topojson/low/tl_2015_us_cbsa.json");
require("./app.scss");

/*global storage/cache object for requested JSON data*/
var localmemory = {};

/*caching for paths, other svg elements*/
var g = {};
var geo_data = g.geo_data = {}; 
var water_data = g.water_data = {type:"FeatureCollection","features":[]};

/*other globals*/
var URL_BASE; 

/*CBPP-specific dependencies*/
var Figure = require("cbpp_figures")($);

/*convert initial state and low-res cbsa shapes to geojson features and add to geo_data*/
geo_data.cb_2015_us_state_500k = {low: topojson.feature(cb_2015_us_state_500k, cb_2015_us_state_500k.objects.districts)};
geo_data.tl_2015_us_cbsa = {low: topojson.feature(tl_2015_us_cbsa, tl_2015_us_cbsa.objects.districts)};
geo_data.water = {high: water_data};

g.getFileAndSaveInMemory = function(f, handler, cb) {
  var responseType = "text";
  if (f.indexOf(".bin")!==-1) {
    responseType = "arraybuffer";
  }
  if (!localmemory[f]) {
    var req = new XMLHttpRequest();
    req.open('GET',f,true);
    req.responseType = responseType;
    req.send(null);
    req.onreadystatechange = function() {
      if (this.readyState===4 && this.status===200) {
        handle(req.response);
      }
    };
  } else {
    cb(null, localmemory[f]);
  }
  var handle = function(d) {
    d = handler(d);
    localmemory[f] = d;
    cb(null, d);
  };
}

g.getCSVAndSaveInMemory = function(f, cb) {
  g.getFileAndSaveInMemory(f, function(d) {
    if (f.indexOf(".csv")===-1) {
      d = pako.inflate(d,{to:"string"});
    }
    d = csv_parse.parse(d, {dynamicTyping: true});
    return d;
  }, cb);
}

/*methods for getting JSON data*/
g.getJSONAndSaveInMemory = function(f, cb) {
  g.getFileAndSaveInMemory(f, function(d) {
    if (f.indexOf(".json")===-1) {
      d = pako.inflate(d,{to:"string"});
    }
    d = JSON.parse(d);
    return d;
  }, cb);
};

/*main constructor for map object*/ 
var Interactive = function(sel) {
  var m = this; /*easy access to main object*/
  m.constructed = false;
  if (m.constructed===true) {
    return;
  }
  m.constructed = true;
  /*initial tasks and config*/ 
  function initialize() {
    $(sel).empty().html(dom);
    m.initialContents = $(sel).html();
    new Figure.Figure(sel, {
      title:"",
      subtitle: "<div class=\"cbsa-picker-wrapper\">"+
        "<span class='label'>Pick a metro area or click on the map below: </div>" +
          "<div class=\"data-picker-wrapper\"><span class='label'>Pick a dataset: </div>",
      rows: [0.61,"fixed","fixed"]
    });
    $(sel).find(".grid00").empty().addClass("mapwrap");
    $(sel).find(".grid01").empty().addClass("legendwrap");
    $(sel).find(".grid02").empty().append($(document.createElement("div")).addClass("dotExplainwrap"));
    $(sel).find(".grid02").append($(document.createElement("div")).addClass("redliningLegend"));
    var s1 =  $(sel).find(".dotExplainwrap").parents(".afterBreak");
    var s2 = $(sel).find(".legendwrap").parents(".afterBreak");
    var toGroup = s1.add(s2);
    toGroup.wrapAll("<div class='fixedGroup'>");
    $(sel).find(".fixedGroup").wrapInner("<div class='fixedInner'></div>");
    $(sel).find(".fixedGroup").append("<div class='legendSlideDown'>");
    $(sel).find(".legendSlideDown").html("&#9660;").wrap("<div class='legendSlideDownPositioner'>");
    $(sel).find(".legendSlideDownPositioner").on("click touchstart", function() {
      var el = $(this).find(".legendSlideDown");
      if ($(el).hasClass("legendSlideUp")) {
        m.slideLegendUp();
      } else {
        m.slideLegendDown();
      } 
    });
    $(sel).find(".beforeBreak").remove();
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
  build_intro_functions($, m, sel);
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


Figure.whenReady = function() {
  if (window.interactiveBuilt) {return;}
  var theInteractive = new Interactive("#hous4-16-18");
  window.interactiveBuilt = true;
  return theInteractive;
};
})();

function ieToLow() {
  document.getElementById("hous4-16-18").innerHTML = "<div style='border:1px solid #aaa;padding:10px'>Your browser is too old to display these maps correctly. Please upgrade to the latest version of Internet Explorer, Edge, Chrome, Firefox, or Safari.</div>";
}
