var colorgen = require("cbpp_colorgen");
var bins = require("../intermediate/bins.json");

module.exports = function($, m) {
  var binDefGen = function(startColor, endColor, dataIndex, labelFormatter, customBins, customColors, extraBin, useCBSABins) {
    if (!useCBSABins && recalc) {return undefined;}
    if (typeof(labelFormatter)==="undefined") {
      labelFormatter = function(n) {return n;};
    }
    var r = [];
    var theseBins = bins[dataIndex];
    if (useCBSABins && m.active_cbsa) {
      theseBins = m.cbsaBins[m.active_cbsa.properties.GEOID][dataIndex];
    }
    if (typeof(customBins)!=="undefined") {
      theseBins = customBins;
    }
    var colors = colorgen(startColor,endColor,theseBins.length-1);
    if (typeof(customColors)!=="undefined") {
      colors = customColors;
    }
    for (var i = 0, ii = theseBins.length-1;i<ii;i++) {
      r.push({
        label: labelFormatter(theseBins[i]),
        color: colors[i],
        min: theseBins[i],
        max: theseBins[i+1]
      });
    }
    if (extraBin) {
      r.push({
        label: labelFormatter(theseBins[ii]-0.01)
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
        bins: binDefGen("#edeeef",/*"#ED1C24"*/"#0c61a4",1, function(n) {
          return n + "%";
        }, [0,10,20,30,40,100.01], undefined, true),
        labels: ["0%","","40% or more"],
        dataIndex: 1
      },
      "opportunity" : {
        name:"Opportunity Index",
        /*colors: [
          [-5, [12,97,164,1]],
          [0, [255,255,255,1]],
          [30, [237,28,36,1]]
        ],
        labels: ["-5","0","30"],*/
        bins: binDefGen("#d2dae0",/*"#0b4a1b"*/"#266975",5, function(n) {
          if (n<0.5) {
            return "Unknown";
          }
          return Math.ceil(n);
        },[-0.5,0.5,1.5,2.5,3.5,4.5,5.5], ["#baa8a5"].concat(colorgen("#d2dae0","#266975",5))),
        binLabel:"central",
        dataIndex: 5
      },
      "nonwhite" : {
        name:"Non-white percentage",
        bins: binDefGen("#d3e7f1",/*"#532e67"*/"#7a5e89",6, function(n) {
          return Math.round(n*1000)/10 + "%";
        }, undefined, colorgen("#d7cabd","#a3876a",4).concat(colorgen("#b2b2f8","#6a6aa3",4)), true, true),
        colors: [
          [0,[200,200,200,1]],
          [1,[15,99,33,1]]
        ],
        labels: ["0%","100%"],
        dataIndex:6
      },
      "holc" : {
        name:"1930s HOLC Risk Assessment Grades",
        binLabel:"central",
        bins: (function() {
          var names = {
            "A":"Best",
            "B":"Still Desireable",
            "C":"Declining",
            "D":"Hazardous"
          };
          var r = [];
          for (var color in m.redlining_colors) {
            if (m.redlining_colors.hasOwnProperty(color)) {
              r.push({
                label: names[color],
                color: m.redlining_colors[color]
              });
            }
          }
          return r;
        })()
      }
    };
    $.extend(true, m.gradientConfig, newConfig);
    recalc = true; 
  };
  m.makeGradientConfig();
  
};
