Math.log10 = Math.log10 || function(x) {
  return Math.log(x) * Math.LOG10E;
};

module.exports = function($, d3, m, sel, geojson_bbox) {
  var exports = {};
  var dot_data = {};

  m.getDotDeflator = function(csv, geoid) {
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
      "vouchers": Math.ceil(total_vouchers/5000),
      "affordable_units":Math.ceil(total_vouchers/5000)
    };
  };

  m.updateDots = function(d, dot_datasets) {
    var view_dot_data = (function(dot_data, d) {
      var tracts = [];
      var j, jj, k, kk;
      for (var cbsa in d.high) {
        if (d.high.hasOwnProperty(cbsa)) {
          for (j = 0, jj = d.high[cbsa].length; j<jj; j++) {
            tracts.push(d.high[cbsa][j].properties.GEOID10);
          }
        }
      }
      var r = [];
      for (k = 0, kk = dot_datasets.length;k<kk;k++) {
        var dot_dataset = dot_datasets[k];
        for (var i = 0, ii = tracts.length; i<ii; i++) {
          var tract_dots = dot_data[m.zoomLevel][dot_dataset][tracts[i]];
          if (tract_dots) {
            for (j = 0, jj = tract_dots.length; j<jj; j++) {
              r.push([tract_dots[j], dot_dataset]);
            }
          }
        }
      }
      r.sort(function(a, b) {
        return b[1] < a[1];
      });
      return r;
    })(dot_data, d);
    var circle_size = (function() {
      var viewport = m.svg.attr("viewBox").split(" ");
      var px_width = $(sel).find(".mapwrap").width();
      var svg_coords_width = viewport[2];
      return 2.5*svg_coords_width/px_width;
    })();
    var dots = m.dotsSVG.selectAll("circle.household")
      .data(view_dot_data, function(d) {
        return d[1] + (d[0][0]*d[0][1]);
      });
    var dotScaleM = {};
    for (var dot_dataset in m.dotScale) {
      if (m.dotScale.hasOwnProperty(dot_dataset)) {
        dotScaleM[dot_dataset] = Math.sqrt(m.dotScale[dot_dataset]);
      }
    }
    dots.enter()
      .append("circle")
      .attr("class","household")
      .attr("stroke",function(d) {
        return d[1]!=="affordable_units" ? "#333333" : "#B9292F";
      })
      .attr("stroke-width",function(d) {
        return (circle_size*dotScaleM[d[1]])/3;
      })
      .attr("fill",function(d) {
        return (d[1]!=="affordable_units" ? "#EB9123" : "none");
      })
      .merge(dots)
      .attr("r",function(d) {
        return circle_size*dotScaleM[d[1]]/* - (d[1]==="vouchers" ? 0 : (circle_size*dotScaleM[d[1]])/3)*/;
      })
      .each(function(d) {
        var el = d3.select(this);
        var coords = m.projection(d[0]);
        el.attr("cx", coords[0]);
        el.attr("cy", coords[1]);
      });
    dots.exit().remove();
  };
  m.updateDotData = function(drawData, dot_dataset) {
    function update_dots_for_tract(tract, dot_dataset) {
      var z = m.zoomLevel;
      var geoid = tract.properties.GEOID10;
      if (typeof(dot_data[z])==="undefined") {
        dot_data[z] = {};
      }
      if (typeof(dot_data[z][dot_dataset])==="undefined") {
        dot_data[z][dot_dataset] = {};
      }
      if (typeof(dot_data[z][dot_dataset][geoid])==="undefined") {
        dot_data[z][dot_dataset][geoid] = []; 
      } else {
        return;
      }
      var dot_parms = {
        "vouchers": {
          "multiply":12,
          "index":8
        },
        "with_kids": {
          "multiply":12,
          "index":9
        },
        "with_kids_nonwhite": {
          "multiply":12,
          "index":10
        },
        "affordable_units": {
          "multiply":1,
          "index":11
        }
      }[dot_dataset];
      //var doneDots = dot_data[z][dot_dataset][geoid].length;
      var doneDots = 0;
     
      if (!tract.properties.csvData) return;
      var numDots;
      numDots = dot_parms.multiply*tract.properties.csvData[dot_parms.index]*1;     
      numDots /= m.dotRepresents[dot_dataset];
      var leftOver = numDots%1;
      numDots = Math.floor(numDots);
      if (Math.random()<leftOver) {
        numDots++;
      }
      if (doneDots>=numDots) {
        return;
      }
      
      var bbox = geojson_bbox(tract);
      var j = 0;
      var water_checks = [];
      for (var l = 0, ll = drawData.high.water.length;l<ll;l++) {
        var water_bbox = drawData.high.water[l].bbox;
        if (m.bbox_overlap(water_bbox, bbox)) {
          water_checks.push(drawData.high.water[l]);
        }
      }
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
            dot_data[z][dot_dataset][geoid].push([x,y]);
            doneDots++;
          }
        }

      }
    }
    function roundOff(n) {
      var figs = Math.pow(10,Math.round(Math.log10(n)));
      n = Math.ceil(n/figs)*figs;
      return n;
    }
    function update_dots_for_cbsa(tract_data, dot_dataset) {
      var cbsa_geoid = m.active_cbsa.properties.GEOID;
      var deflator = m.dot_deflator[cbsa_geoid][dot_dataset];
      if (typeof(deflator)==="undefined") {
        deflator = 1;
      }
      var z = m.zoomLevel;
      var dataAdjust = 0;
      if (dot_dataset==="vouchers") {
        minDotRepresents = 12;
      } else {
        minDotRepresents = 1;
        dataAdjust = 2;
      }
      var dotRepresents = 3*Math.pow(2,m.maxZoom+1-z+dataAdjust);
      dotRepresents *= deflator;
      var minDotRepresents;
      var baseDotRepresents = 3*Math.pow(2,m.maxZoom+1-z)*m.dot_deflator[cbsa_geoid].vouchers;
      if (typeof(m.dotRepresents)==="undefined") {
        m.dotRepresents = {};
      }
      if (typeof(m.dotScale)==="undefined") {
        m.dotScale = {};
      }
      m.dotRepresents[dot_dataset] = Math.max(minDotRepresents,dotRepresents);
      m.dotRepresents[dot_dataset] = Math.floor(m.dotRepresents[dot_dataset]);
      m.dotRepresents[dot_dataset] = roundOff(m.dotRepresents[dot_dataset]);
      baseDotRepresents = roundOff(baseDotRepresents);
      //m.dotScale[dot_dataset] = m.dotRepresents[dot_dataset]/baseDotRepresents;
      m.dotScale[dot_dataset] = 1;
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