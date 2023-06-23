"use strict";

Math.log10 = Math.log10 || function(x) {
  return Math.log(x) * Math.LOG10E;
};

function shuffle(array) {
  /*https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array*/
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

module.exports = function($, d3, m, sel, geojson_bbox) {
  var exports = {};
  var dot_data = {};

  m.getDotDeflator = function(csv, geoid) {
    return;
    var data = csv[geoid];
    if (typeof(m.dot_deflator)==="undefined") {
      m.dot_deflator = {};
    }
    if (typeof(m.dot_deflator[geoid])!=="undefined") {
      return m.dot_deflator[geoid];
    }
    var total_vouchers = 0;
    //var total_affordable = 0;
    var row;
    for (var tract in data) {
      if (data.hasOwnProperty(tract)) {
        row = data[tract];
        total_vouchers += row[8]*1;
        //total_affordable += row[11]; 
      }
    }
    m.dot_deflator[geoid] = {
      "hcv_total": Math.ceil(total_vouchers/5000),
      "hcv_children": Math.ceil(total_vouchers/5000),
      "hcv_children_poc": Math.ceil(total_vouchers/5000),
      "pbra_total":Math.ceil(total_vouchers/5000)
    };
  };

  /*m.dotRepresentsZoom = {
    "hcv_hh": [200, 200, 100, 50, 25, 12],
    "hcv_kids": [200, 100, 50, 25, 12],
    "nwkids_hcv": [200, 100, 50, 25, 12],
    "aff_units": [1000, 500, 200, 100, 50, 25]
  };*/

  m.updateDots = function(d, dot_datasets) {
    console.log(m);
    var circle_size = (function() {
      var viewport = m.svg.attr("viewBox").split(" ");
      var px_width = $(sel).find(".mapwrap").width();
      var svg_coords_width = viewport[2];
      return 2.5*svg_coords_width/px_width;
    })();
    clearInterval(m.dotDrawInteval);
    var dot_data_chunked = {};
    var chunk_size = 5000;
    ["hcv_total"].forEach((dot_type)=>{
      dot_data_chunked[dot_type] = [];
    });
    var current_chunk = 0;
    var dotDrawTimerFunction = function() {
      var chunk_done = {};
      ["hcv_total"].forEach((dot_type)=>{
        if (!dot_data[m.zoomLevel]) {
          return;
        }
        var all_dots_up_to_chunk = dot_data[m.zoomLevel][dot_type].slice(0, (current_chunk + 1)*chunk_size);
        var this_chunk = dot_data[m.zoomLevel][dot_type].slice(current_chunk*chunk_size, (current_chunk + 1)*chunk_size);
        dot_data_chunked[dot_type] = all_dots_up_to_chunk;
        if (this_chunk.length == 0) {
          chunk_done[dot_type] = true;
        }
      });
      ["hcv_total"].forEach((dot_type)=>{
        var dots = m.dotsSVG_layers.vouchers.selectAll("circle.household")
        .data(dot_data_chunked[dot_type], function(d) {
          return d[1] + (d[0][0]*d[0][1]);
        });
        var dotScaleM = {};
        for (var dot_dataset in m.dotScale) {
          if (m.dotScale.hasOwnProperty(dot_dataset)) {
            dotScaleM[dot_dataset] = Math.sqrt(m.dotScale[dot_dataset]);
          }
        }
        m.dotsSVG.selectAll("filter#f1")
          .select("feMorphology")
          .attr("radius", circle_size*1.1)
        m.dotsSVG.selectAll("filter#f1")
          .select("feGaussianBlur")
          .attr("stdDeviation", circle_size*1.2)
        dots.enter()
          .append("circle")
          .attr("class","household")
          .attr("stroke",function(d) {
            return d[1]!=="aff_units" ? "rgba(255, 255, 255, 0.6)" : "rgba(100, 0, 0, 0.4)";
          })
          .attr("stroke-width",function(d) {
            return 50/(Math.pow(2, m.zoomLevel));
            return d[1]==="aff_units" ? (circle_size*dotScaleM[d[1]])/2 : circle_size*dotScaleM[d[1]]/4;
            //return (circle_size*dotScaleM[d[1]])/3;
          })
          .attr("fill",function(d) {
            return (d[1]!=="aff_units" ? "rgba(83, 41, 110, 0.8)" : "none");
          })
          .attr("filter", "url(#f1)")
          .merge(dots)
          .attr("r",function(d) {
            return 500/(Math.pow(2, m.zoomLevel));
            return (d[1]==="aff_units" ? 1 : 0.9)*circle_size*dotScaleM[d[1]]/* - (d[1]==="vouchers" ? 0 : (circle_size*dotScaleM[d[1]])/3)*/;
          })
          .each(function(d) {
            var el = d3.select(this);
            var coords = m.projection(d[0]);
            el.attr("cx", coords[0]);
            el.attr("cy", coords[1]);
          });
        dots.exit().remove();
      });
      if (chunk_done.vouchers && chunk_done.affordable_units) {
      } else {
        window.requestAnimationFrame(dotDrawTimerFunction);
       // m.dotDrawInterval = setTimeout(dotDrawTimerFunction, 10);
      }
      current_chunk++;
    }
    dotDrawTimerFunction();
   //m.dotDrawInterval = setTimeout(dotDrawTimerFunction, 500);

    
  };
  m.updateDotData = function(drawData, dot_dataset) {
    function update_dots_for_tract(tract, dot_dataset) {
      var z = m.zoomLevel;
      var geoid = tract.properties.GEOID10;
      var dotRepresents = {
        5: 1000,
        6: 1000,
        7: 500,
        8: 200,
        9: 100,
        10: 50,
        11: 20,
        12: 12,
        13: 12,
        14: 12,
        15: 12
      };
      var numDots = 0;
      try {
        numDots = tract.properties.csvData[dot_dataset][dotRepresents[z]];
      } catch (ex) {
        console.log(tract);
        console.log(ex);
      };
      var bbox = geojson_bbox(tract);
      var j = 0;
      var water_checks = [];
      for (var l = 0, ll = drawData.high.water.length;l<ll;l++) {
        var water_bbox = drawData.high.water[l].bbox;
        if (m.bbox_overlap(water_bbox, bbox)) {
          water_checks.push(drawData.high.water[l]);
        }
      }
      var doneDots = 0;
      while (doneDots < numDots && j<10000) {
        j++;
        if (j===10000) {
          /*console.log("error - had trouble drawing dots for " + geoid);
          console.log(doneDots, numDots, bbox, tract);*/
        }
        var xrange = bbox[2] - bbox[0];
        var yrange = bbox[3] - bbox[1];
        var x = Math.random()*xrange + bbox[0];
        var y = Math.random()*yrange + bbox[1];

        if (m.featureContains([x,y],tract)) {
          var inWater = false;
          for (var n = 0,nn=water_checks.length;n<nn;n++) {
            if (m.featureContains([x,y],water_checks[n])) {
              inWater = true;
            }
          }
          if (!inWater) {
            dot_data[z] = dot_data[z] || {};
            dot_data[z][dot_dataset] = dot_data[z][dot_dataset] || [];
            dot_data[z][dot_dataset].push([[x,y],dot_dataset]);
            doneDots++;
          }
        }

      }
    }
    function update_dots_for_cbsa(tract_data, dot_dataset) {
      console.log(tract_data);
      for (var i = 0, ii = tract_data.length; i<ii; i++) {
        update_dots_for_tract(tract_data[i], dot_dataset);
      }
    }
    for (var cbsa_layer_name in drawData.high) {
      if (drawData.high.hasOwnProperty(cbsa_layer_name)) {
        if (cbsa_layer_name.indexOf("tl_2010")!==-1) {
          update_dots_for_cbsa(drawData.high[cbsa_layer_name], dot_dataset);
        }
      }
    }
    
    console.log(dot_data);
  };

  m.updateVoucherHouseholdType = function() {
    m.voucherHouseholdType = $(sel).find("select.voucherHouseholdType").val();
  };

  m.getVoucherHouseholdType = function() {
    return m.voucherHouseholdType;
  };

  m.getCheckedDots = function() {
    var r = [];
    var checkboxes = $(sel).find("input[name='dotDataset']");
    checkboxes.each(function() {
      if ($(this).prop("checked")) {
        r.push($(this).val());
      }
    });
    for (var i = 0, ii = r.length; i<ii; i++) {
      if (r[i]==="vouchers") {
        r[i] = m.getVoucherHouseholdType();
      }
    }
    return r;
  };

  return exports;
};