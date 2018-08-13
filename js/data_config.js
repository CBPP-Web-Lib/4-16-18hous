var colorgen = require("cbpp_colorgen");
var bins = require("../intermediate/bins.json");

module.exports = function($, m) {
  var binDefGen = function(startColor, endColor, dataIndex, labelFormatter) {
    if (typeof(labelFormatter)==="undefined") {
      labelFormatter = function(n) {return n;};
    }
    var r = [];
    var colors = colorgen(startColor,endColor,8);
    for (var i = 0, ii = bins[dataIndex].length-1;i<ii;i++) {
      r.push({
        label: labelFormatter(bins[dataIndex][i]) + " - " + labelFormatter(bins[dataIndex][i+1]),
        color: colors[i],
        min: bins[dataIndex][i],
        max: bins[dataIndex][i+1]
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
      m.dataset = $(this).val();
      m.updateDrawData(m.svg);
    });
    return select;
  };

  m.gradientConfig = {
    "poverty_rate" : {
      name:"Poverty Rate",
      /*colors: [
        [0, [214, 228, 240, 1]],
        [5, [12, 97, 164, 1]],
        [40, [235, 145, 35, 1]]
      ],*/
      hoverColor: "#5590BF",
      bins: binDefGen("#FCEEDE","#ED1C24",1),
      labels: ["0%","","40% or more"],
      dataIndex: 1
    },
    "distress" : {
      name:"Distress Index",
      /*colors: [
        [-5, [12,97,164,1]],
        [0, [255,255,255,1]],
        [30, [237,28,36,1]]
      ],
      labels: ["-5","0","30"],*/
      bins: binDefGen("#ccdbd5","#0b4a1b",3, function(n) {
        return Math.round(n*100)/100;
      }),
      dataIndex: 3
    },
    "nonwhite" : {
      name:"Non-white percentage",
      bins: binDefGen("#d3e7f1","#532e67",6, function(n) {
        return Math.round(n*1000)/10 + "%";
      }),
      colors: [
        [0,[200,200,200,1]],
        [1,[15,99,33,1]]
      ],
      labels: ["0%","100%"],
      dataIndex:6
    },
    "holc" : {
      name:"1930s HOLC Risk Assessment Grades",
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
};
