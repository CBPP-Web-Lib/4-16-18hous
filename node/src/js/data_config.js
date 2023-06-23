"use strict";

var colorgen = require("cbpp_colorgen");
var bins = require("../../tmp/bins.json");

module.exports = function($, m) {
  var binDefGen = function(config) {
    console.log(config);
    var {startColor, endColor, dataIndex, labelFormatter, customBins, customColors, extraBin, useCBSABins} = config;
    if (!useCBSABins && recalc) {return undefined;}
    if (typeof(labelFormatter)==="undefined") {
      labelFormatter = function(n) {return n;};
    }
    var r = [];
    var theseBins = bins[dataIndex];
    if (useCBSABins && m.active_cbsa) {
      var _theseBins = m.cbsaBins[m.active_cbsa.properties.GEOID][dataIndex];
      if (typeof(_theseBins)!=="undefined") {
        theseBins = _theseBins;
      }
    }
    if (typeof(customBins)!=="undefined") {
      theseBins = customBins;
    }
    console.log(bins);
    var colors = colorgen(startColor,endColor,theseBins.length-1);
    if (typeof(customColors)!=="undefined") {
      colors = customColors;
    }
    for (var i = 0, ii = theseBins.length-1;i<ii;i++) {
      r.push({
        label: labelFormatter(theseBins[i], i),
        color: colors[i],
        min: theseBins[i],
        max: theseBins[i+1]
      });
    }
    if (extraBin) {
      r.push({
        label: labelFormatter(theseBins[ii]-0.01, ii)
      });
    }
    return r;
  };
  
  m.redlining_colors = {
    "A":"#1b5315",
    "B":"#494949",
    "C":"#905813",
    "D":"#6d0a0e"
  };

  m.makeDataPicker = function() { 
    var select = $(document.createElement("select"));
    for (var dataset in m.gradientConfig) {
      if (m.gradientConfig.hasOwnProperty(dataset)) {
        var option = $(document.createElement("option"));
        option.val(dataset);
        option.html(m.gradientConfig[dataset].name);
        select.append(option);
      }
    }
    select.on("change", function() {
      m.makeGradientConfig();
      m.dataset = $(this).val();
      m.updateDrawData(m.svg);
      if (m.dataset==="nonwhite") {
        $(this).parents(".cbppFigure").find(".dotExplainer").addClass("shrunk");
      } else {
        $(this).parents(".cbppFigure").find(".dotExplainer").removeClass("shrunk");
      }
    });
    return select;
  };
  var recalc = false;
  m.gradientConfig = {};
  m.makeGradientConfig = function() {
    var newConfig = {
      "poverty_rate" : {
        name:"Poverty Rate",
        /*colors: [
          [0, [214, 228, 240, 1]],
          [5, [12, 97, 164, 1]],
          [40, [235, 145, 35, 1]]
        ],*/
        hoverColor: "#EB9123",
        bins: binDefGen({
          startColor: "#f5f8fa",/*"#ED1C24"*/
          endColor: "#8fa5b8",
          dataIndex: "poverty_pov_pct", 
          labelFormatter: function(n) {
            return n + "%";
          }, 
          customBins: [0,5,10,15,20,25,30,35,40,100.01],
          extraBin: true,
          customColors: (function() {
            var secRange = colorgen("#9dbed4","#edaf42", 5);
            secRange.shift();
            return colorgen("#f9fbff", "#9dbed4", 5).concat(secRange);
          })()
        }),
        labels: ["0%","","40% or more"],
        dataIndex: "poverty_pov_pct"
      },
      "nonwhite" : {
        name:"Share people of color",
        bins: binDefGen({
          startColor: "#d3e7f1",/*"#532e67"*/
          endColor: "#7a5e89",
          dataIndex: "ethnicity_nonwhite_percentage", 
          labelFormatter: function(n, i) {
            if (i===4) {
              return Math.round(n*10000)/100 + "%";
            }
            return Math.round(n*100) + "%";
          }, 
          customBins: undefined, 
          customColors: colorgen("#d7cabd","#a3876a",4).concat(colorgen("#b2b2f8","#6a6aa3",4)), 
          extraBin: true, 
          useCBSABins: true
        }),
        colors: [
          [0,[200,200,200,1]],
          [1,[15,99,33,1]]
        ],
        labels: ["0%","100%"],
        dataIndex:"ethnicity_nonwhite_percentage"
      }
    };
    $.extend(true, m.gradientConfig, newConfig);
    recalc = true; 
  };
  m.makeGradientConfig();
  
};
