module.exports = function($, d3, m, sel, geojson_bbox) {
  var exports = {};
  var dot_data = {};

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
      return 1.5*svg_coords_width/px_width;
    })();
    var dots = m.svg.selectAll("circle.household")
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
      .attr("stroke","#000")
      .attr("stroke-width",function(d) {
        return (d[1]==="vouchers" ? circle_size/4 : 0);
      })
      .attr("fill",function(d) {
        return (d[1]==="vouchers" ? "#ED1C24" : "#704c76");
      })
      .merge(dots)
      .attr("r",function(d) {
        return circle_size*dotScaleM[d[1]];
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
      }

      var doneDots = dot_data[z][dot_dataset][geoid].length;
      var dataAdjust = 0;
      if (!tract.properties.csvData) return;
      var numDots, minDotRepresents;
      if (dot_dataset==="vouchers") {
        numDots = 12*tract.properties.csvData[9]*1;
        minDotRepresents = 12;
      } else {
        numDots = tract.properties.csvData[13]*1;
        minDotRepresents = 1;
        dataAdjust = 2;
      }
      var dotRepresents = 3*Math.pow(2,m.maxZoom-1-z+dataAdjust);
      var baseDotRepresents = 3*Math.pow(2,m.maxZoom-1-z);
      if (typeof(m.dotRepresents)==="undefined") {
        m.dotRepresents = {};
      }
      if (typeof(m.dotScale)==="undefined") {
        m.dotScale = {};
      }
      m.dotRepresents[dot_dataset] = Math.max(minDotRepresents,dotRepresents);
      m.dotRepresents[dot_dataset] = Math.floor(m.dotRepresents[dot_dataset]);
      m.dotScale[dot_dataset] = Math.max(1,m.dotRepresents[dot_dataset]/baseDotRepresents);
      numDots /= m.dotRepresents[dot_dataset];
      numDots = Math.round(numDots);
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
          console.log("error - had trouble drawing dots for " + geoid);
          console.log(doneDots, numDots, bbox, tract);
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
    function update_dots_for_cbsa(tract_data, dot_dataset) {
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

  m.getCheckedDots = function() {
    var r = [];
    var checkboxes = $(sel).find("input[name='dotDataset']");
    checkboxes.each(function() {
      if ($(this).prop("checked")) {
        r.push($(this).val());
      }
    });
    return r;
  };

  return exports;
};