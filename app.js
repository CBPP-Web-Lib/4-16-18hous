/*globals require, document, console, window*/
(function() {
"use strict";
var $ = require("jquery");
var d3 = require("d3");
var topojson = require("topojson");
var Figure = require("./CBPP_Figure")($);
require("./app.css");
var Interactive = function(sel) {

};
$(document).ready(function() {
  return new Interactive("#hous-4-16-18");
});
})();
