/*globals require, document, console, window, Promise*/
(function() {
"use strict";
if (typeof(Promise)==="undefined") {
  var Promise = require("promise-polyfill");
}
var $ = require("jquery");
var d3 = require("d3");
var topojson = require("topojson");
var Figure = require("./CBPP_Figure")($);
var GridConfig = require("./gridConfig.json");
var FileIndex = require("./fileIndex.json");
var localforage = require("localforage");
var geojson_bbox = require("geojson-bbox");
var localmemory = {};
var pako = require("pako");
localforage.clear();
var svg_path_data = {};
var geo_data = {};
var water_data = {type:"FeatureCollection","features":[]};
var cb_2015_us_state_500k = JSON.parse(pako.inflate(require("./topojson/low/cb_2015_us_state_500k.txt"),{to:"string"}));
var tl_2015_us_cbsa = JSON.parse(pako.inflate(require("./topojson/low/tl_2015_us_cbsa.txt"),{to:"string"}));
var popup_html = require("./popup.html");
var getBounds = require("svg-path-bounds");
var legend_dot_svg = require("./legend_dot_svg.html");
var dotExplainer = require("./dotExplainer.html");
var waterIndex = require("./waterIndex.json");
var dot_data = {};
var water_uid = 0;
geo_data.cb_2015_us_state_500k = {low: topojson.feature(cb_2015_us_state_500k, cb_2015_us_state_500k.objects.districts)};
geo_data.tl_2015_us_cbsa = {low: topojson.feature(tl_2015_us_cbsa, tl_2015_us_cbsa.objects.districts)};
geo_data.water = {high: water_data};
var URL_BASE;
require("./app.css");
//var data = require("./intermediate/data.json");
//console.log(data);
var drawData = {};
var redlining_colors = {
  "A":"#1b5315",
  "B":"#494949",
  "C":"#905813",
  "D":"#6d0a0e"
};
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
      if (f.indexOf(".json")!==-1) {
        $.getJSON(f, function(d) {
          handle(d);
        });
      } else {
        $.get(f, function(d) {
          d = pako.inflate(d,{to:"string"});
          d = JSON.parse(d);
          handle(d);
        });
      }
      var handle = function(d) {
        if (typeof(d)==="object" && d.compressed) {
          d = JSON.parse(pako.inflate(d.d, {to: "string"}));
        }
        localforage.setItem(f, d);
        cb(null, d);
      }
    } else {
      cb(null, locald);
    }
  });

};
var Interactive = function(sel) {
  var m = this;
  m.geo_data = geo_data;
  m.requests = [];
  new Figure.Figure(sel, {
    subtitle: "<div class=\"data-picker-wrapper\"></div>",
    rows: [0.61,"fixed","fixed"]
  });
  $(sel).find(".grid00").empty().addClass("mapwrap");
  $(sel).find(".grid01").empty().addClass("legendwrap");
  $(sel).find(".grid02").empty().append($(document.createElement("div")).addClass("dotExplainwrap"));
  $(sel).find(".grid02").append($(document.createElement("div")).addClass("redliningLegend"));
  URL_BASE = $("#script_hous4-16-18")[0].src.replace("/js/app.js","");
  var svg;
  m.zoomingToCBSA = false;
  m.projection = d3.geoAlbers();
  m.dataset = "poverty_rate";
  m.redliningOn = false;
  var path = d3.geoPath(m.projection);
  var defaultViewbox = [50, 5, 820, 820*$(sel + " .mapwrap").height()/$(sel + " .mapwrap").width()].join(" ");

  function get_tile_from_long_lat(long, lat, zoom, exact) {
    var scale = 1 << zoom;
    var rounder = Math.floor;
    if (exact===true) {
      rounder = function(n) {return n;};
    }
    var worldCoordinate = tile_project(lat, long);
    return [
      rounder(worldCoordinate[0] * scale),
      rounder(worldCoordinate[1] * scale)
    ];
  }
  function tile_project(lat, long) {
    var siny = Math.sin(lat * Math.PI / 180);
    siny = Math.min(Math.max(siny, -0.9999), 0.9999);
    return [
      (0.5 + long / 360),
      (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
    ];
  }

  function makePopup(e, d) {
    $(sel).find(".popup-outer").remove();
    var popup_outer = $(document.createElement("div")).addClass("popup-outer");
    var popup_wrap = $(document.createElement("div")).addClass("popup-wrap");
    popup_wrap.html(popup_html);
    var f = {
      p: function(n) {
        return Math.round(n*1000)/10 + "%";
      },
      p100: function(n) {
        return Math.round(n*10)/10+"%";
      },
      n: function(n) {
        return Math.round(n*1000)/1000;
      },
      t: function(t) {return t;}
    };
    var data = {
      cbsa: [d.properties.NAMELSAD10, f.t],
      distress: [d.properties.csvData[3], f.n],
      //opportunity: [d.properties.csvData[1], f.n],
      poverty: [d.properties.csvData[1], f.p100],
      race: [d.properties.csvData[6], f.p]
    };
    popup_wrap.find("span[name]").each(function() {
      var d = data[$(this).attr("name")];
      $(this).text(d[1](d[0]));
    });
    var popup_width = 0.4;
    var offset = $(sel).find(".mapwrap").offset();
    var x = e.pageX - offset.left;
    var y = e.pageY - offset.top;
    if (e.touches) {
      x = e.touches[0].pageX - offset.left;
      y = e.touches[0].pageY - offset.top;
    }
    var px = x - x*popup_width;
    popup_outer.css("left", px + "px");
    popup_outer.css("top", y);
    if (y < $(sel).find(".mapwrap").height()/2) {
      popup_wrap.addClass("below");
    } else {
      popup_wrap.addClass("above");
    }
    popup_wrap.css("width",popup_width*$(sel).width() + "px");
    popup_outer.append(popup_wrap);
    $(sel).find(".mapwrap").append(popup_outer);
  }

  function bbox_overlap(box1, box2) {
    return !(
      box1[0] > box2[2] ||
      box1[1] > box2[3] ||
      box2[0] > box1[2] ||
      box2[1] > box1[3]
    );
  }

  function featureContains(point, feature) {
    var pip = false;
    for (var i = 0, ii = feature.geometry.coordinates.length;i<ii;i++) {
      if (feature.geometry.type==="MultiPolygon") {
        for (var k = 0, kk = feature.geometry.coordinates[i].length;k<kk;k++) {
          if (d3.polygonContains(feature.geometry.coordinates[i][k], point)) {
            pip = true;
          }
        }
      } else {
        if (d3.polygonContains(feature.geometry.coordinates[i], point)) {
          pip = true;
        }
      }
    }
    return pip;
  }

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
      //console.log(numDots, tract.properties.GEOID10);
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
        if (bbox_overlap(water_bbox, bbox)) {
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

        if (featureContains([x,y],tract)) {
          var inWater = false;
          for (var n = 0,nn=water_checks.length;n<nn;n++) {
            if (featureContains([x,y],water_checks[n])) {
              inWater = true;
            }
          }
          if (!inWater) {
            dot_data[z][dot_dataset][geoid].push([x,y]);
            doneDots++;
            if (doneDots === numDots) {
            //  console.log("success for " + geoid);
            }
          }
          //console.log(true);
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
        if (cbsa_layer_name!=="water") {
          update_dots_for_cbsa(drawData.high[cbsa_layer_name], dot_dataset);
        }
      }
    }
  };

  m.updateDrawData = function(svg) {
    drawData = filterToVisible(geo_data, svg.attr("viewBox"));
    //drawData = geo_data;
    drawData = (function(r) {
      for (var size in r) {
        if (r.hasOwnProperty(size)) {
          if (size==="low") {
            if (!r[size].national) {
              var topo = topojson.topology({districts:geo_data.cb_2015_us_state_500k[size]}, 50000);
              var merged = topojson.merge(topo, topo.objects.districts.geometries);
              merged.properties = {GEOID:"us_national_outline"};
              r[size].national = [merged];
            }
          }
        }
      }
      return r;
    })(drawData);
    svg.selectAll("g")
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
    svg.selectAll("g.size").selectAll("g")
      .data(FileIndex.concat(["national","water"]))
      .enter()
      .append("g")
      .attr("class", function(d) {
        return "layer " + d;
      });
    var textOffsets = require("./textOffsets.json");
    var cbsa_click = function(d) {
      if (m.zoomingToCBSA) {
        return false;
      }
      var geoid = d.properties.GEOID;
      if (m.active_cbsa) {
        removeTractsFromDrawData();
        resetCBSALowRes();
      }
      var zoomed = false;
      var loaded = false;
      var red_loaded = false;
      var water_loaded = false;
      function checkZoomAndLoad() {
        if (zoomed && loaded && water_loaded && red_loaded) {
          //applyData(csv, m.active_cbsa.properties.GEOID, []);
          console.log("here");
          m.updateDrawData(svg);
        }
      }
      getJSONAndSaveInMemory(URL_BASE + "/topojson/high/tl_2010_tract_" + geoid + ".txt", function(err, d) {
        var geo = topojson.feature(d, d.objects.districts);
        geo_data["tl_2010_tract_" + geoid] = {high:geo};
        loaded = true;
        checkZoomAndLoad();
      });
      getJSONAndSaveInMemory(URL_BASE + "/topojson/high/redlining_"+geoid+".txt", function(err, d) {
        var geo = topojson.feature(d, d.objects.districts);
        geo_data["redlining_" + geoid] = {high:geo};
        red_loaded = true;
        checkZoomAndLoad();
      });
      var water_files = waterIndex["tl_2010_tract_" + geoid + ".json"];
      var WaterRequest = function(file) {
        return new Promise(function(resolve, reject) {
          if (typeof(water_data[file])!=="undefined") {
            resolve();
          } else {
            getJSONAndSaveInMemory(file, function(err, d) {
              var waterFeatures = topojson.feature(d, d.objects.districts).features;
              for (var i = 0, ii = waterFeatures.length; i<ii; i++) {
                waterFeatures[i].bbox = geojson_bbox(waterFeatures[i]);
                waterFeatures[i].properties.WATERUID = water_uid;
                water_uid++;
              }
              water_data.features = water_data.features.concat(waterFeatures);
              resolve();
            });
          }
        });
      };
      var water_requests = [];
      for (var i = 0, ii = water_files.length; i<ii; i++) {
        while (water_files[i].length<5) {
          water_files[i] = "0" + water_files[i];
        }
        water_requests.push(new WaterRequest("./water/tl_2017_" + water_files[i] + "_areawater.txt"));
      }
      Promise.all(water_requests).then(function() {
        water_loaded = true;
        checkZoomAndLoad();
      });
      zoomToCBSA(d, "in", function() {
        zoomed = true;
        checkZoomAndLoad();
      });
    };
    svg.selectAll("g.size").selectAll("g.layer").each(function(layer) {
      if (layer==="water") {return;}
      var size = d3.select(this.parentNode).attr("class").split(" ")[1];
      var scaling ={"low":1,"high":0.1};
      var pathData = function() {

        if (!drawData[size]) {
          drawData[size] = {};
        }
        var d = drawData[size][layer];
        if (!d) {
          d = [];
        }
        return d;
      }();
      var pathIndex = function(pathData, i) {
        if (pathData.properties) {
          if (pathData.properties.GEOID10) {
            return pathData.properties.GEOID10;
          }
          if (pathData.properties.GEOID) {
            return pathData.properties.GEOID;
          }
          if (pathData.properties.WATERUID) {
            return pathData.properties.WATERUID;
          }
        }
        return i;
      };
      var paths = d3.select(this).selectAll("path")
        .data(pathData, pathIndex);
      paths.exit().each(function() {
        d3.select(this).remove();
      });
      d3.select(this).selectAll("text").remove();
      paths.enter()
        .append("path")
        .on("click", function(d) {
          if (d3.select(this.parentNode).attr("class").split(" ")[1] === "tl_2015_us_cbsa") {
            cbsa_click(d);
          }
        })
        .attr("data-geoid",function(d) {
          return d.properties.GEOID;
        })
        .merge(paths)
        .attr("stroke-width",function() {
          if (layer.indexOf("state")!==-1) {
            return 0.8*scaling[size];
          }
          if (layer.indexOf("cbsa")!==-1) {
            if (m.active_cbsa) {
              return 0;
            }
            return 1*scaling[size];
          }
          if (layer.indexOf("redlin")!==-1) {
            if (m.redliningOn) {
              return 3*scaling[size]/Math.max(m.zoomLevel-7,1);
            } else {
              return 0;
            }
          }
          return 0.5*scaling[size];
        })
        .attr("fill", function(d) {
          if (layer.indexOf("state")!==-1) {
            return "#D6E4F0";
          }
          if (layer==="national") {
            return "none";
          }
          if (layer.indexOf("redlin")!==-1) {
            return "none";
          }
          if (layer.indexOf("tl_2010_tract")!==-1) {
            return fillFromData(d.properties.csvData);
          }
          if (m.active_cbsa) {
            return "#cccccc";
          }
          return "#EB9123";
        })
        .attr("data-orgfill", function() {
          return d3.select(this).attr("fill");
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
        .on("mousemove touchstart touchmove", function(d) {
          if (m.dragOn && d3.event.type==="mousemove") return true;
          if (d3.event.touches) {
            if (d3.event.touches.length > 1) {
              return true;
            }
          }
          if (d.properties.csvData) {
            makePopup(d3.event, d);
            $(this).css("cursor","pointer");
            d3.select(this).attr("opacity",1);
            d3.select(this).attr("fill","#ED1C24");
          }
          return true;
        })
        .on("mouseout", function(d) {
          if (d.properties.csvData) {
            //d3.select(this).attr("opacity",0.5);
            $(this).css("cursor","auto");
            d3.select(this).attr("fill",fillFromData(d.properties.csvData));
            if (!d3.event.relatedTarget) {
              $(sel).find(".popup-outer").remove();
              return;
            }
            if (d3.event.relatedTarget.tagName!=="path") {
              $(sel).find(".popup-outer").remove();
            }
          }
        })
        .attr("fill-opacity", function() {
          if (layer.indexOf("state")!==-1) {
            return 1;
          }

          return 0.7;
        })
        .attr("stroke",function(d) {
          if (layer.indexOf("state")!==-1) {
            return "#fff";
          }
          if (layer==="national") {
            return "#0C61A4";
          }
          if (layer.indexOf("cbsa")!==-1) {
            return "#0C61A4";
          }
          if (layer.indexOf("redlin")!==-1) {
            return redlining_colors[d.properties.holc_grade];
          }
          return "#000000";
        })
        .attr("stroke-opacity", function() {
          if (layer.indexOf("state")!==-1) {
            return 1;
          }
          if (layer==="national") {
            return 1;
          }
          if (layer.indexOf("cbsa")!==-1) {
            return 0.3;
          }
          if (layer.indexOf("redlin")!==-1) {
            return 1;
          }
          return 0;
        });

      if (m.active_cbsa) {
        if (layer.indexOf("tract")!==-1) {
          var d = d3.select(this).selectAll("path").data();
          if (d.length > 0) {
            var cbsa = m.active_cbsa.properties.GEOID;
            d = applyData(csv,cbsa, d);
          }
        }
      }
      d3.select(this).selectAll("path").each(function(d) {
        if (d.properties && d3.select(this.parentNode).attr("class").indexOf("cbsa")!==-1) {
          var bbox = this.getBBox();
          if (!d.properties.NAME) {return;}
          var name = d.properties.NAME.split(",");
          name[0] = name[0].split("-")[0];
          name[1] = name[1].split("-")[0];
          name = name.join(",");
          if (m.active_cbsa) {return;}
          d3.select(this.parentNode)
            .append("text")
            .attr("class","label")
            .attr("data-geoid",d.properties.GEOID)
            .attr("x",function() {
              var o = 0;
              for (var offset in textOffsets) {
                if (textOffsets.hasOwnProperty(offset)) {
                  if (d.properties.NAME.indexOf(offset)!==-1) {
                    o = textOffsets[offset][0];
                  }
                }
              }
              return bbox.x+bbox.width/2 + o;
            })
            .attr("y",function() {
              var o = 0;
              for (var offset in textOffsets) {
                if (textOffsets.hasOwnProperty(offset)) {
                  if (d.properties.NAME.indexOf(offset)!==-1) {
                    o = 0-textOffsets[offset][1];
                  }
                }
              }
              return bbox.y+bbox.height/2 + o;
            })
            .attr("text-anchor","end")
            .attr("fill","#0C61A4")
            .attr("font-size",10)
            .text(name)
            .on("click", function() {
              cbsa_click(d);
            })
            .attr("font-family","proxima-nova-condensed,sans-serif");
          /*textEl.selectAll("tspan")
            .data(name)
            .enter()
            .append("tspan")
            .text(function(d) {
              return d;
            })
            .attr("dx",2);*/
        }
      });
    });

    m.updateDotData(drawData, "vouchers");
    m.updateDotData(drawData, "affordable_units");
    m.makeLegend();
    var dotUpdates = (function(d) {
      var r = [];
      for (var i = 0, ii = d.length; i<ii; i++) {
        var ssel = "input[name='dotDataset'][value='"+d[i]+"']";
        if ($(sel).find(ssel).prop("checked")) {
          r.push(d[i]);
        }
      }
      return r;
    })(["vouchers","affordable_units"]);
    m.updateDots(drawData, dotUpdates);
  };

  function makeGradientDef(conf, svg) {
      var defs = svg.append("defs");
      var grad = defs.append("linearGradient")
        .attr("id","legend_gradient_def");
      var min = conf[0][0];
      var max = conf[conf.length-1][0];
      grad.selectAll("stop")
        .data(conf)
        .enter()
        .append("stop")
        .attr("offset", function(d) {
          return Math.round(1000*(d[0]-min)/(max-min))/10+"%";
        })
        .attr("stop-color", function(d) {
          return "rgba(" + d[1].join(",") + ")";
        });
  }

  function makeGradientText(conf, container) {
    var max = conf.colors[conf.colors.length-1][0];
    var min = conf.colors[0][0];
    container.selectAll("div.label")
      .data(conf.colors)
      .enter()
      .append("div")
      .attr("class","label")
      .style("left", function(d) {
        return 100*(d[0]-min)/(max-min) + "%";
      })
      .html(function(d, i) {
        return "<div>" + conf.labels[i] + "</div>";
      });
  }

  m.makeRedliningLegend = function(on) {
    function makeEntry(letter) {
      var label = $(document.createElement("div")).addClass("redliningLabel");
      var box = $(document.createElement("div")).addClass("redliningBox");
      label.text({
        "A":"Best",
        "B":"Still desireable",
        "C":"Declining",
        "D":"Hazardous"
      }[letter]);
      box.css("border","2px solid " + redlining_colors[letter]);
      var r = $(document.createElement("div")).addClass("entry");
      r.append(box, label);
      return r;
    }
    var wrap = $(sel).find(".redliningLegend").empty();
    if (typeof(m.active_cbsa)==="undefined" || m.acitve_cbsa===null) {
      return;
    }
   
    var checkboxWrap = $(document.createElement("div")).addClass("checkboxWrap");
    var checkbox = $(document.createElement("input")).attr("type","checkbox")
      .prop("checked",on);
    var checkboxLabel = $(document.createElement("div")).addClass("checkboxLabel")
      .text("Show 1930s HOLC Neighborhood Risk Assessment Grades");
    checkboxWrap.append(checkbox, checkboxLabel);
    wrap.append(checkboxWrap);
    var entryWrap = $(document.createElement("div")).addClass("entries");
    var grades = ["A","B","C","D"];
    for (var i = 0, ii = grades.length; i<ii; i++) {
      entryWrap.append(makeEntry(grades[i]));
    }
    wrap.append(entryWrap);
  };

  m.makeDotExplainer = function(dotRepresents) {
    $(sel).find(".dotExplainwrap").empty();
    if (typeof(m.active_cbsa)==="undefined" || m.active_cbsa===null) return;
    var theDotExplainer = $(document.createElement("div")).html(dotExplainer).attr("class","dotExplainer");
    $(sel).find(".dotExplainwrap").append(theDotExplainer);
    if (typeof(dotRepresents)==="undefined") {return;}
    $(sel).find(".dotExplainer").find(".dotRepresents.vouchers").html(dotRepresents.vouchers);
    $(sel).find(".dotExplainer").find(".dotRepresents.affordable_units").html(dotRepresents.affordable_units);
    $(sel).find(".dotExplainer").find(".dotRepresentsIsPlural.vouchers").html(
      dotRepresents.vouchers !== 1 ? "s" : "");
    $(sel).find(".dotExplainer").find(".dotRepresentsIsPlural.affordable_units").html(
      dotRepresents.affordable_units !== 1 ? "s" : "");
      $(sel).find(".legend_dot_svg_ex").html(legend_dot_svg);
      d3.select(sel).select(".legend_dot_svg_ex.vouchers svg").select("circle").attr("fill","#ED1C24");
      d3.select(sel).select(".legend_dot_svg_ex.affordable_units svg").select("circle").attr("fill","#704c76");
  };

  m.makeLegend = function() {
    $(sel).find(".legendwrap").empty();
    var gradientwrap = $(document.createElement("div"))
      .attr("class","gradientwrap");
    var labelwrap = $(document.createElement("div"))
      .attr("class","labelwrap");
    $(sel).find(".legendwrap").append(gradientwrap);
    var legend_gradient_svg = d3.select(".gradientwrap").append("svg")
      .attr("viewBox", "0 0 100 10")
      .attr("preserveAspectRatio","none");
    gradientwrap.append(labelwrap);
    var titlewrap = $(document.createElement("div"));
    titlewrap.addClass("titlewrap");
    titlewrap.text(m.gradientConfig[m.dataset].name);
    makeGradientDef(m.gradientConfig[m.dataset].colors, legend_gradient_svg);
    legend_gradient_svg.append("rect")
      .attr("x",0)
      .attr("y",0)
      .attr("width",100)
      .attr("height",10)
      .attr("opacity",0.7)
      .attr("class","legend_gradient_rect")
      .attr("stroke","none")
      .attr("fill","url(#legend_gradient_def)");
    makeGradientText(m.gradientConfig[m.dataset], d3.select(labelwrap[0]));
    gradientwrap.append(titlewrap);
    m.makeDotExplainer(m.dotRepresents);
    m.makeRedliningLegend(m.redliningOn);
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
      var viewport = svg.attr("viewBox").split(" ");
      var px_width = $(sel).find(".mapwrap").width();
      var svg_coords_width = viewport[2];
      return 1.5*svg_coords_width/px_width;
    })();
    var dots = svg.selectAll("circle.household")
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

  function filterToVisible(geo_data, viewbox) {
    var r = {};
    viewbox = viewbox.split(" ");
    /*console.log(viewbox);
    viewbox[0]-=viewbox[2]*0.2;
    viewbox[1]-=viewbox[3]*0.2;
    viewbox[2]*=1.4;
    viewbox[3]*=1.4;
    console.log(viewbox);*/
    //console.log(m.projection([-72.67,41.76]));
    for (var layer in geo_data) {
      if (geo_data.hasOwnProperty(layer)) {
        for (var size in geo_data[layer]) {
          if (geo_data[layer].hasOwnProperty(size)) {
            if (!r[size]) r[size] = {};
            /*if (!r[size][layer])*/ r[size][layer] = [];
            for (var i = 0, ii = geo_data[layer][size].features.length; i<ii; i++) {
              var geoid = geo_data[layer][size].features[i].properties.GEOID ||
                geo_data[layer][size].features[i].properties.GEOID10 ||
                geo_data[layer][size].features[i].properties.WATERUID
              geoid*=1;
              var thispath;
              /*if (!svg_path_data[geoid]) {
                svg_path_data[geoid] = {};
              }
              if (!svg_path_data[geoid][size]) {*/
                thispath = path(geo_data[layer][size].features[i]);
            /*    svg_path_data[geoid][size] = thispath;
              } else {
                thispath = svg_path_data[geoid][size];
              }*/
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
  m.gradientConfig = {
    "poverty_rate" : {
      name:"Poverty Rate",
      colors: [
        [0, [214, 228, 240, 1]],
        [5, [12, 97, 164, 1]],
        [40, [235, 145, 35, 1]]
      ],
      labels: ["0%","","40% or more"],
      dataIndex: 1
    },
    "distress" : {
      name:"Distress Index",
      colors: [
        [-5, [12,97,164,1]],
        [0, [255,255,255,1]],
        [30, [237,28,36,1]]
      ],
      labels: ["-5","0","30"],
      dataIndex: 3
    },
    "nonwhite" : {
      name:"Non-white percentage",
      colors: [
        [0,[200,200,200,1]],
        [1,[15,99,33,1]]
      ],
      labels: ["0%","100%"],
      dataIndex:6
    }
  };
  function fillFromData(d) {
    if (typeof(d)==="undefined") {
      return "#EB9123";
    }
    d = d[m.gradientConfig[m.dataset].dataIndex];
    var gconf = m.gradientConfig[m.dataset].colors;
    var color;
    if (d < gconf[0][0]) {
      color = gconf[0][1];
    } else if (d >= gconf[gconf.length-1][0]) {
      color = gconf[gconf.length-1][1];
    } else {
      for (var i = 0, ii = gconf.length-1;i<ii;i++) {
        if (d >= gconf[i][0] && d < gconf[i+1][0]) {
          var p = (d - gconf[i][0])/(gconf[i+1][0] - gconf[i][0]);
          color = [];
          for (var j = 0; j<4;j++) {
            color[j] = p*(gconf[i+1][1][j] - gconf[i][1][j]) + gconf[i][1][j];
          }
        }
      }
    }
    return "rgba("+color.join(",")+")";
  }
  m.getTiles = function(config) {
    if (!m.active_cbsa) {return;}
    if (m.outstandingTiles) {return;}
    m.outstandingTiles = true;
    if (typeof(config)==="undefined") {
      config={};
    }
    var width = config.width;
    var height = config.height;
    var z = config.z;
    var offset = config.offset;
    var zchange = 1;
    if (!m.zoomLevel && !z) {
      console.error("No zoom defined yet");
    }
    if (!m.zoomLevel) {
      m.zoomLevel = z;
    } else if (z) {
      zchange = Math.pow(2,z-m.zoomLevel);
    } else {
      z = m.zoomLevel;
    }
    var final_tl_latlong = config.projection.invert([config.viewport[0], config.viewport[1]]);
    var tl = get_tile_from_long_lat(final_tl_latlong[0], final_tl_latlong[1], z);
    var tilewrap = $(sel).find(".tilewrap");
    var oldtilewrap = $(sel).find(".tilewrap.old");
    if (oldtilewrap.length===0) {
      if (tilewrap.length===0) {
        tilewrap = $(document.createElement("div")).addClass("tilewrap");
        $(sel).find(".mapwrap").prepend(tilewrap);
      }
      oldtilewrap = tilewrap;
    } else {
      tilewrap = $(document.createElement("div")).addClass("tilewrap");
      oldtilewrap.after(tilewrap);
    }
    if (!offset) {
      offset = [
        oldtilewrap.css("left").replace("px","")*1,
        oldtilewrap.css("top").replace("px","")*1
      ];
    }

    tilewrap.css("left",(0-offset[0])+"px");
    tilewrap.css("top",(0-offset[1])+"px");

    var br = [Math.ceil(tl[0]+width/256), Math.ceil(tl[1] + height/256)];
    var img;
    var finished = function() {
      tilewrap.find("img").css("visibility","visible");
      m.outstandingTiles = false;
      if (typeof(config.onload)==="function") {config.onload();}
    };
    var requests = 0;
    var errorHandler = function() {
      var url = $(this).attr("src");
      if (url.indexOf("@2x")!==-1) {
        url = url.replace("@2x","");
        $(this).attr("src", url);
      }
    };
    for (var x = tl[0]; x<=br[0];x++) {
      for (var y = tl[1]; y<=br[1];y++) {
        requests++;
        var ext = ".png";
        if (window.devicePixelRatio>1) {
          ext = "@2x.png";
        }
        var url = "https://stamen-tiles.a.ssl.fastly.net/toner/"+z + "/" + x+"/"+y + ext;
        img = $(document.createElement("img"))
          .attr("src", url)
          .css("left",(x-tl[0])*256 + "px")
          .css("top",(y-tl[1])*256 + "px")
          .css("visibility","hidden")
          .on("error", errorHandler);
        tilewrap.append(img);
      }
    }
    m.zoomLevel = z;
    finished();
  };
  DrawInitialMap();
  /*svg.on("click", function() {
    //var vcoords = d3.mouse(this);
    //var coords = m.projection.invert([vcoords[0], vcoords[1]]);
    //console.log(Math.abs(coords[0])+"W",Math.abs(coords[1])+"N");
  });*/
  function applyData(d, cbsa, pathData) {
    var selector = "g.tl_2010_tract_" + cbsa + " path";
    var paths = svg.selectAll(selector);
    paths.each(function(gd, i) {
      pathData[i] = gd;
      gd.properties.csvData = d[cbsa][gd.properties.GEOID10*1];
      d3.select(this).attr("fill", function() {
        return fillFromData(gd.properties.csvData);
      });
    });
    return pathData;
  }
  var csv = {};
  function tile2long(x,z) { return (x/Math.pow(2,z)*360-180); }
  function tile2lat(y,z) {
    var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
    return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
  }
  m.offset_px_from_vb = function(viewbox, zoom, projection) {
    var top_left_coords = projection.invert([viewbox[0], viewbox[1]]);
    var top_left_tile = get_tile_from_long_lat(top_left_coords[0], top_left_coords[1], zoom, true);
    var px_offset = [
      (top_left_tile[0] - Math.floor(top_left_tile[0]))*256,
      (top_left_tile[1] - Math.floor(top_left_tile[1]))*256
    ];
    return px_offset;
  };

  function zoomToCBSA(cbsa, direction, cb) {
    if (!direction) {direction = "in";}
    if (m.zoomingToCBSA) {return false;}
    m.zoomingToCBSA = true;
    var csvDataLoaded = false;
    getJSONAndSaveInMemory(URL_BASE + "/data/" + cbsa.properties.GEOID + ".json", function(err, d) {
      csvDataLoaded = true;
      csv[cbsa.properties.GEOID] = d;
      checkDisplay();
    });
    var zoomSideways = false;
    var org_bbox;
    if (m.active_cbsa && direction==="in") {
      zoomSideways = true;
      org_bbox = geojson_bbox(m.active_cbsa);
    }
    m.active_cbsa = cbsa;
    var bbox = geojson_bbox(cbsa);
    var orgcenter = [-96.6,38.7];
    var center = [(bbox[2]-bbox[0])/2+bbox[0],(bbox[3]-bbox[1])/2+bbox[1]];
    var width = $(svg.node()).width();
    var height = $(svg.node()).height();
    var zoom = 1;
    while (true) {
      var test_tl = get_tile_from_long_lat(bbox[0],bbox[3],zoom, true);
      var test_br = get_tile_from_long_lat(bbox[2],bbox[1],zoom, true);
      if (test_br[0] - test_tl[0] > width/256) {
        break;
      }
      if (test_br[1] - test_tl[1] > height/256) {
        break;
      }
      zoom++;
    }
    zoom--;
    function projectInterpolate(projection0g, projection1g, t, startScale, endScale, center, orgcenter) {
      var projection0 = projection0g().scale(1).center(orgcenter);
      var projection1 = projection1g().scale(1).center(center);
      var fcenter = [];
      var ct = 1-(t-1)*(t-1);
      if (direction==="out") {
        ct = t*t;
      }
      for (var i = 0;i<2;i++) {
        fcenter[i] = ct*(center[i] - orgcenter[i]) + orgcenter[i];
      }
      var project = d3.geoProjection(function(λ, φ) {
        λ *= 180 / Math.PI; φ *= 180 / Math.PI;
        var p0 = projection0([λ, φ]), p1 = projection1([λ, φ]);
        var p2 = [(1 - t) * p0[0] + t * p1[0], (1 - t) * -p0[1] + t * -p1[1]];
        return p2;
      });
      var frameScale = startScale + t*(endScale-startScale);
      project
        .scale(frameScale)
        .center(fcenter);

      if (t===1 && direction==="in") {
        project.invert = projection1g().scale(endScale).center(center).invert;
      }
      if (t===1 && direction==="out") {
        project.invert = projection0g().invert;
      }
      return project;
    }
    var orgProjection = d3.geoAlbers;
    var destProjection = d3.geoMercator;
    var startScale = orgProjection().scale();
    var destScale = 10000/(bbox[2]-bbox[0]);
    if (zoomSideways) {
      orgProjection = destProjection;
      orgcenter = [(org_bbox[0] + org_bbox[2])/2, (org_bbox[1] + org_bbox[3])/2];
      startScale = 10000/(org_bbox[2] - org_bbox[0]);
      $(sel).find(".tilewrap").hide();
    }
    if (direction==="out") {
      m.active_cbsa = undefined;
      var swap = destProjection;
      destProjection = orgProjection;
      orgProjection = swap;
      swap = destScale;
      destScale = startScale;
      startScale = swap;
      swap = center;
      center = orgcenter;
      orgcenter = swap;
    }

    var destProjectionAdj = projectInterpolate(orgProjection, destProjection, 1, startScale, destScale, center, orgcenter);

    var top_left_bbox_svg_coords = destProjectionAdj([bbox[0], bbox[3]]);
    var bottom_right_bbox_svg_coords = destProjectionAdj([bbox[2], bbox[1]]);
    var bbox_width_svg_coords = bottom_right_bbox_svg_coords[0] - top_left_bbox_svg_coords[0];
    var bbox_height_svg_coords = bottom_right_bbox_svg_coords[1] - top_left_bbox_svg_coords[1];
    var top_left_viewport_svg_coords=[], bottom_right_viewport_svg_coords=[], diff;
    if (bbox_width_svg_coords/bbox_height_svg_coords < width/height) {
      diff = bbox_height_svg_coords*(width/height) - bbox_width_svg_coords;
      top_left_viewport_svg_coords[0] = top_left_bbox_svg_coords[0] - diff/2;
      top_left_viewport_svg_coords[1] = top_left_bbox_svg_coords[1];
      bottom_right_viewport_svg_coords[0] = bottom_right_bbox_svg_coords[0] + diff/2;
      bottom_right_viewport_svg_coords[1] = bottom_right_bbox_svg_coords[1];
    } else {
      diff = bbox_width_svg_coords*(height/width) - bbox_height_svg_coords;
      top_left_viewport_svg_coords[0] = top_left_bbox_svg_coords[0];
      top_left_viewport_svg_coords[1] = top_left_bbox_svg_coords[1] - diff/2;
      bottom_right_viewport_svg_coords[0] = bottom_right_bbox_svg_coords[0];
      bottom_right_viewport_svg_coords[1] = bottom_right_bbox_svg_coords[1] + diff/2;
    }

    var viewport_svg_width = bottom_right_viewport_svg_coords[0] - top_left_viewport_svg_coords[0];
    var viewport_svg_height = bottom_right_viewport_svg_coords[1] - top_left_viewport_svg_coords[1];

    var top_left_viewport_latlong = destProjectionAdj.invert(top_left_viewport_svg_coords);
    var top_left_tile_coords =
      get_tile_from_long_lat(
        top_left_viewport_latlong[0],
        top_left_viewport_latlong[1],
        zoom,
        true
      );
    var lat_long_second_tile = [
      tile2long(top_left_tile_coords[0]+1, zoom),
      tile2lat(top_left_tile_coords[1]+1,zoom)
    ];
    var svg_coords_second_tile = destProjectionAdj(lat_long_second_tile);
    var current_tile_width_svg = svg_coords_second_tile[0] - top_left_viewport_svg_coords[0];
    var current_tile_width_px = current_tile_width_svg/(viewport_svg_width)*width;
    var scale_factor = 256/current_tile_width_px;
    var final_svg_width = (1/scale_factor) * viewport_svg_width;
    var final_svg_height = (1/scale_factor) * viewport_svg_height;
    var final_svg_tl = [
      0.5*(viewport_svg_width - final_svg_width) +
        top_left_viewport_svg_coords[0],
      0.5*(viewport_svg_height - final_svg_height) +
        top_left_viewport_svg_coords[1]
    ];

    var viewbox = [
      final_svg_tl[0],
      final_svg_tl[1],
      final_svg_width,
      final_svg_height
    ];

    var offset_px = m.offset_px_from_vb(viewbox, zoom, destProjectionAdj);
  //  var tilesLoaded = false;
    var zoomFinished = false;
    m.minZoom = zoom;
    m.maxZoom = 15;
    m.getTiles({
      viewport: viewbox,
      width:width,
      height:height,
      z:zoom,
      offset:offset_px,
      projection: destProjectionAdj
      /*onload:function() {
        tilesLoaded = true;
        checkDisplay();
      }*/
    });
    function checkDisplay() {
      if (zoomFinished /*&& tilesLoaded*/ && csvDataLoaded) {
        $(sel).find(".tilewrap").show();
        $(sel).find(".tilewrap").not("old").css("opacity",1);
        $(sel).find(".tilewrap.old").remove();
        if (typeof(cb)==="function") {
          cb();
        }
      }
    }
    svg.selectAll("circle.household").remove();
    svg.selectAll("text.label")
      .attr("opacity",0)
      .style("visibility","hidden");
    if (direction==="in") {
      svg.selectAll("text.label")
        .attr("opacity",1)
        .style("visibility","visible")
        .transition()
        .duration(100)
        .attr("opacity",0)
        .style("visibiltiy","hidden");
     svg.transition()
        .duration(1000)
        .attr("viewBox", viewbox.join(" "));
    } else {
      svg.transition()
        .duration(1000)
        .attr("viewBox", defaultViewbox);
      removeTractsFromDrawData();
      svg.selectAll("g.size.low g.cb_2015_us_state_500k")
        .attr("opacity",0)
        .style("visibility","visible")
        .transition()
        .duration(750)
        .attr("opacity",1)
        .on("end", function() {
          svg.selectAll("g.size.high").selectAll("path").remove();
        });
      $(sel).find(".tilewrap").fadeOut(100).remove();
    }
    var timer = d3.timer(function(elapsed) {
      var p = elapsed/1000;
      if (p>=1) {
        p=1;
        timer.stop();
        m.projection = projectInterpolate(orgProjection, destProjection, p, startScale, destScale, center, orgcenter);
        path = d3.geoPath(m.projection);
        if (direction==="in") {

          $(sel).find(".legendwrap").slideDown(100);
          makeZoomOutButton();
          zoomFinished = true;
          checkDisplay();
          d3.select(sel).select(".tilewrap")
            .transition()
            .duration(750)
            .style("opacity",1);
          var toFadeOut = "g.size.low g.cb_2015_us_state_500k, g.size.low path[data-geoid='"+m.active_cbsa.properties.GEOID+"']";
          svg.selectAll(toFadeOut)
            .attr("opacity",1)
            .style("visibility","visible")
            .transition()
            .duration(750)
            .attr("opacity",0)
            .style("visibility","hidden")
            .on("end", function() {
              /*console.log(bbox);
              console.log(projection([bbox[2],bbox[3]]));*/
              svg.select("g.layer.national").attr("opacity",0);
              m.zoomingToCBSA = false;
              svg.attr("data-viewbox-limit",svg.attr("viewBox"));
              /*setTimeout(function() {
                zoomToCBSA(cbsa,"out");
              }, 1000);*/
            });
        } else {
          $(sel).find(".legendwrap").slideUp(100);
          m.zoomingToCBSA = false;
          zoomFinished = true;
          if (typeof(cb)==="function") {
            cb();
          }
          svg.select("g.layer.national").attr("opacity",1);
          resetCBSALowRes();
        }
      }
      if (!zoomFinished) {
        m.projection = projectInterpolate(orgProjection, destProjection, p, startScale, destScale, center, orgcenter);
        path = d3.geoPath(m.projection);
      }
      d3.selectAll("path")
        .attr("d", path);
    });
  }

  function removeTractsFromDrawData() {
    for (var file in geo_data) {
      if (geo_data.hasOwnProperty(file)) {
        if (file.indexOf("tl_2010_tract_")!==-1) {
          geo_data[file] = undefined;
        }
      }
    }
  }

  function resetCBSALowRes() {
    svg.selectAll("g.layer.tl_2015_us_cbsa path")
      .style("visibility","visible")
      .transition()
      .duration(100)
      .attr("opacity",1);
    svg.selectAll("text.label")
      .style("visibility","visible")
      .transition()
      .duration(100)
      .attr("opacity",1);
  }

  function makeZoomOutButton() {
    var button = $(document.createElement("button"));
    button.text("National View");
    button.addClass("zoomOut");
    $(sel).find(".mapwrap").append(button);
    button.on("click touchstart",function() {
      //if (m.zoomLevel===m.minZoom) {
        zoomToCBSA(m.active_cbsa,"out", function() {
          setTimeout(function() {
            m.updateDrawData(svg);
          },50);
        });
        $(sel).find("button.zoomOut").remove();
    /*  } else {
        var vb = svg.attr("viewBox").split(" ");
        m.zoomOut(vb[0]*1 + vb[2]*1/2, vb[1]*1 + vb[3]*1/2);
      }*/
    });
  }

  function makeDataPicker() {
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
      m.updateDrawData(svg);
      /*m.updateDotData(drawData);
      m.updateDots(drawData);
      m.makeLegend();*/
    });
    return select;
  }


  function hoverOver(path) {
    path = d3.select(path);
    path.attr("data-orgfill", path.attr("fill"));
    path.attr("fill","#B9292F");
  }


  function DrawInitialMap() {
    svg = d3.select(sel + " .mapwrap").append("svg")
      .attr("viewBox", defaultViewbox)
      .attr("preserveAspectRatio", "none");

    m.updateDrawData(svg);
    require("./js/zoom.js")(sel + " .mapwrap", m, $, d3);
    require("./js/drag.js")(sel + " .mapwrap", m, $, d3);
    $(svg.node()).on("mouseover", "g.tl_2015_us_cbsa > path", function() {
      hoverOver(this);
    });
    $(svg.node()).on("mouseover", "g.tl_2015_us_cbsa > text.label", function() {
      var geoid = $(this).attr("data-geoid");
      var path = $(svg.node()).find("g.tl_2015_us_cbsa > path[data-geoid='" + geoid + "']");
      hoverOver(path[0]);
    });
    $(svg.node()).on("mouseout", "g.tl_2015_us_cbsa > *", function() {
      svg.selectAll("g.tl_2015_us_cbsa > path").each(function() {
        var path = d3.select(this);
        if (path.attr("data-orgfill")) {
          path.attr("fill", path.attr("data-orgfill"));
        }
      });
    });
    $(sel).find(".data-picker-wrapper").append(makeDataPicker());
    $(sel).on("click","input[type='checkbox'][name='dotDataset']",function() {
      m.updateDrawData(svg);
    });
    $(sel).on("click", ".redliningLegend input[type='checkbox']", function() {
      m.redliningOn = $(this).prop("checked");
      m.updateDrawData(svg);
    });
  }
  function setupWindowResize() {
    var resizeTimer = null;
    var outstanding = false;
    var windowResize = function() {
      if (!m.active_cbsa) {return;}
      if (m.zoomingToCBSA) {
        outstanding = true;
      }
      if (resizeTimer!==null) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(function() {
        resizeTimer = null;
        fireResize();
      }, 200);
    };
    var resizeCallback = function() {
      if (outstanding) {
        outstanding = false;
        m.zoomingToCBSA = false;
        windowResize();
      } else {
        m.updateDrawData(d3.select(sel + " .mapwrap > svg"));
        outstanding = false;
      }
    };
    var fireResize = function() {
      zoomToCBSA(m.active_cbsa, "in", resizeCallback);
    };
    $(window).resize(windowResize);
  }
  setupWindowResize();
}; /*Interactive()*/


$(document).ready(function() {
  return new Interactive("#hous4-16-18");
});
})();
