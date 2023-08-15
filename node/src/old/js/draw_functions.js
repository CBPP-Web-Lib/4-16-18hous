
"use strict";
var glow_filter = require("../glowfilter.txt").default;

module.exports = function(
  $, 
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
) {
  var exports = {};
  var allDrawData = {};
  var water_uid = 0; 
  var getBounds = require("svg-path-bounds");
  var textOffsets = require("../textOffsets.json");
  var svg_path_data = {low:{},high:{}};

  function disableRedline() {
    var s = $(sel).find(".data-picker-wrapper select");
    if (s.val()==="holc") {
      s.val("poverty_rate");
      m.dataset = "poverty_rate";
    }
    s.find("option[value='holc']").attr("disabled",true);
  }

  function enableRedline() {
    var s = $(sel).find(".data-picker-wrapper select");
    s.find("option[value='holc']").attr("disabled",false);
  }

  var cbsa_click = function(d) {
    if (m.locked()) {
      return false;
    }
    //if (m.zoomingToCBSA) {
    //  return false;
   // }
    var loaded = false;
    var geoid = d.properties.GEOID;
    if (m.active_cbsa) {
      m.removeTractsFromGeoData();
      m.resetCBSALowRes();
    }
    var zoomed = false;
    function checkZoomAndLoad() {
      if (zoomed) {
        m.updateDrawData();
      }
    }
    var water_files = waterIndex["tl_2010_tract_" + geoid + ".json"];
    var water_requests = [];
    var WaterRequest = function(file) {
      return new Promise(function(resolve, reject) {
        if (typeof(water_data[file])!=="undefined") {
          resolve();
        } else {
          g.getJSONAndSaveInMemory(file, function(err, d) {
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
    for (var i = 0, ii = water_files.length; i<ii; i++) {
      while (water_files[i].length<5) {
        water_files[i] = "0" + water_files[i];
      }
      water_requests.push(new WaterRequest(g.URL_BASE + "/water/tl_2017_" + water_files[i] + "_areawater.bin"));
    }
    var red_loaded = false;
    var water_loaded = false;
    Promise.all([
      new Promise((resolve)=>{
        g.getJSONAndSaveInMemory(g.URL_BASE + "/topojson/high/tl_2010_tract_" + geoid + ".bin", function(err, d) {
          var geo = topojson.feature(d, d.objects.districts);
          geo_data["tl_2010_tract_" + geoid] = {high:geo};
          loaded = true;
          resolve();
        });
      }),
      new Promise((resolve)=>{
        g.getJSONAndSaveInMemory(g.URL_BASE + "/topojson/high/redlining_"+geoid + ".bin", function(err, d) {
          if (d.objects.districts.geometries.length===0) {
            disableRedline();
          } else {
            enableRedline();
          }
          var geo = topojson.feature(d, d.objects.districts);
          geo_data["redlining_" + geoid] = {high:geo};
          red_loaded = true;
          resolve();
        });
      }),
      new Promise((resolve)=> {
        g.getJSONAndSaveInMemory(g.URL_BASE + "/topojson/high/tl_2020_us_cbsa_" + geoid + ".bin", function(err, d) {
          var geo = topojson.feature(d, d.objects.districts);
          geo_data["tl_2020_us_cbsa"].high = geo_data["tl_2020_us_cbsa"].high || {type:"FeatureCollection", features:[]};
          var already_loaded_features = geo_data["tl_2020_us_cbsa"].high.features;
          var feature_loaded = false;
          already_loaded_features.forEach((feature)=>{
            if (feature.properties.GEOID === geo.features[0].properties.GEOID) {
              feature_loaded = true;
            }
          });
          if (!feature_loaded) {
            geo_data["tl_2020_us_cbsa"].high.features.push(geo.features[0]);
          }
          resolve();
        });
      }),
      new Promise((resolve)=>{
        Promise.all(water_requests).then(function() {
          water_loaded = true;
          resolve();
        })
      })
    ]).then(checkZoomAndLoad);
    
    m.zoomToCBSA(d, "in", function() {
      zoomed = true;
      checkZoomAndLoad();
    });
  };
  m.updateDrawData = function() {
    var main_svg = m.svg;
    var viewBox = main_svg.attr("viewBox");
    var viewBox_arr = viewBox.split(" ");
    console.log(m);
    merge_csv(geo_data, m.csv);
    var allDrawDataLayers = filterToVisible(geo_data,viewBox);
    Object.keys(allDrawDataLayers).forEach((svg_layer) => {
      var svg = main_svg;
      if (svg_layer==="above") {
        svg = m.aboveTilesSVG;
      }
      var allDrawData = allDrawDataLayers[svg_layer];
      allDrawData = (function(r) {
        for (var size in r) {
          if (r.hasOwnProperty(size)) {
            var topo, merged;
            if (size==="low") {
              if (!r[size].national) {
                topo = topojson.topology({districts:geo_data.cb_2020_us_state_500k[size]}, 50000);
                merged = topojson.merge(topo, topo.objects.districts.geometries);
                merged.properties = {GEOID:"us_national_outline"};
                r[size].national = [merged];
              }
            }
           /* else {
              for (var layer in r[size]) {
                if (layer.indexOf("tract")!==-1) {
                  var quantFactor = Math.pow(2,m.zoomLevel);
                  var geojson = [{"type":"FeatureCollection","features":r[size][layer]}];
                  topo = topojson.topology(geojson,quantFactor);
                  r[size][layer] = topojson.feature(topo, topo.objects[0]).features;
                }
              }
            }*/
          }
        }
        return r;
      })(allDrawData);
      
      var drawData = {};
      var chunkDone = {};
      Object.keys(allDrawData).forEach((size)=>{
        drawData[size] = {};
        chunkDone[size] = {};
        Object.keys(allDrawData[size]).forEach((layer)=>{
          drawData[size][layer] = [];
          chunkDone[size][layer] = false;
        });
      });
  
      var currentChunk = 0;
      var chunkSize = 5000;
      var deferredDraw = [];
      var drawFrame = function() {
        if (m.getLock("zooming")) {
          return;
        }
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
  
        Object.keys(allDrawData).forEach((size)=>{
          Object.keys(allDrawData[size]).forEach((layer)=>{
            drawData[size][layer] = [];
            drawData[size][layer] = allDrawData[size][layer].slice(0, (currentChunk + 50)*chunkSize);
            var newData = allDrawData[size][layer].slice(currentChunk*chunkSize, (currentChunk + 50)*chunkSize);
            if (newData.length === 0) {
              chunkDone[size] = chunkDone[size] || {};
              chunkDone[size][layer] = true;
            }
          });
        });
        currentChunk++;
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
            var r = i;
            if (pathData.properties) {
              if (pathData.properties.GEOID10) {
                r = pathData.properties.GEOID10;
              }
              if (pathData.properties.GEOID) {
                r = pathData.properties.GEOID;
              }
              if (pathData.properties.WATERUID) {
                r = pathData.properties.WATERUID;
              }
            }
            return r;
          };
          var paths = d3.select(this).selectAll("path")
            .data(pathData, pathIndex);
          d3.select(this).selectAll("text").remove();
          paths.exit().remove();
          var whichLayer = (function() {
            if (layer.indexOf("state")!==-1) return "state";
            if (layer.indexOf("cbsa")!==-1) return "cbsa";
            if (layer.indexOf("redlin")!==-1) return "redline";
            if (layer.indexOf("tl_2010_trac")!==-1) return "tract";
            if (layer.indexOf("national")!==-1) return "national";
          })();
          paths.enter()
            .append("path")
            .on("click touchstart", function(d) {
              if (d.properties.invert) {
                return;
              }
              if (d3.select(this.parentNode).attr("class").split(" ")[1] === "tl_2020_us_cbsa") {
                cbsa_click(d);
              }
            })
            .attr("data-nomouse", function(d) {
              if (whichLayer === "cbsa" && size === "high") {
                return "false";
              }
              if (d.properties.invert) {
                return "true";
              } else {
                return "false";
              }
            })
            .attr("data-geoid",function(d) {
              return d.properties.GEOID;
            })
            .each(function(d) {
              deferredDraw.push({el: this, data: d, size});
            })
            
            .attr("fill-rule","evenodd")
            .attr("data-orgfill", function() {
              return d3.select(this).attr("fill");
            })
            .on("mousemove touchstart touchmove", function(d) {
              d3.event.preventDefault();
              if (m.dragOn && d3.event.type==="mousemove") return true;
              if (d3.event.touches) {
                if (d3.event.touches.length > 1) {
                  return true;
                }
              }
              var hoverColor = "#ED1C24";
              if (typeof(m.gradientConfig[m.dataset].hoverColor)!=="undefined") {
                hoverColor = m.gradientConfig[m.dataset].hoverColor;
              }
              if (d.properties.csvData && !m.locked()) {
                if (m.showTractInfo) {
                  m.makePopup(d3.event, d);
                  $(this).css("cursor","pointer");
                  d3.select(this).attr("opacity",1);
                  d3.select(this).attr("fill",hoverColor);
                }
              } else {
                $(sel).find(".popup-outer").remove();
              }
              return true;
            })
            .on("mouseout", function(d) {
              d3.event.preventDefault();
              if (d.properties.csvData) {
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
            .on("touchstart", function() {
              clearTimeout(m.touchEndTimer);
            })
            .on("touchend", function(d) {
              var el = this;
              m.touchEndTimer = setTimeout(function() {
                $(sel).find(".popup-outer").remove();
                d3.select(el).attr("fill",fillFromData(d.properties.csvData));
              }, 500);
            })
            .attr("fill-opacity", function() {
              //if (whichLayer==="state") {
                return 1;
              //}
  
              //return 0.7;
            })
            .attr("stroke",function(d) {
              if (whichLayer==="state") {
                return "#fff";
              }
              if (whichLayer==="national") {
                return "#0C61A4";
              }
              if (whichLayer==="cbsa") {
                if (d.properties.invert) {
                  return "#333";
                }
                if (size==="high") {
                  return "#e6d0ae";
                }
                return "#0C61A4";
              }
              if (whichLayer==="redline") {
                return m.redlining_colors[d.properties.holc_grade];
              }
              return "#000000";
            })
            .attr("stroke-opacity", function() {
              if (whichLayer==="state") {
                return 1;
              }
              if (whichLayer==="national") {
                return 1;
              }
              if (whichLayer==="cbsa") {
                if (size==="high") {
                  return 1;
                }
                return 0.3;
              }
              if (whichLayer==="redline") {
                return 1;
              }
              return 0;
            })
            .merge(paths)
            .attr("fill", function(d) {
              if (d.properties.invert) {
                return "rgba(255, 255, 255, 0.5)";
              }
              if (whichLayer==="state") {
                return "#D6E4F0";
              }
              if (whichLayer==="national") {
                return "none";
              }
              if (whichLayer==="redline") {
                if (m.dataset==="holc") {
                  return m.redlining_colors[d.properties.holc_grade];
                }
              }
              if (whichLayer==="cbsa" && size==="high") {
                return "transparent";
              }
              if (whichLayer==="tract") {
                if (m.dataset==="holc") {
                  return "#cccccc";
                }
                return fillFromData(d.properties.csvData);
              }
              if (m.active_cbsa) {
                return "#cccccc";
              }
              return "#EB9123";
            })
            .attr("stroke-width",function(d) {
              
              if (d.properties.invert) {
                return 0.001*viewBox_arr[2];
              }
              if (whichLayer==="state") {
                return 0.8*scaling[size];
              }
              if (whichLayer==="cbsa") {
                if (m.active_cbsa) {
                  if (size==="high" && d.properties.GEOID === m.active_cbsa.properties.GEOID) {
                    return 0.005*viewBox_arr[2];
                  }
                  return 0; 
                }
                return 1*scaling[size];
              }
              if (whichLayer==="redline") {
                return 0;
              }
              return 0.5*scaling[size];
            })
            .attr("visibility", function(d) {
              /*if (d3.select(this.parentNode).attr("class").split(" ")[1] === "tl_2020_us_cbsa" && m.active_cbsa) {
                return "hidden";
              }*/
              if (whichLayer==="cbsa") {
                if (m.active_cbsa) {
                  if (size==="high" && 
                    (d.properties.GEOID == m.active_cbsa.properties.GEOID) ||
                    (0 - d.properties.GEOID == m.active_cbsa.properties.GEOID )
                  ) {
                    return "visible";
                  }
                  return "hidden"; 
                }
              }
              if (m.dataset==="holc" && whichLayer==="tract") {
                return "hidden";
              }
              if (m.dataset!=="holc" && whichLayer==="redline") {
                return "hidden";
              }
              return "visible";
            })
  
          /*if (m.active_cbsa) {
            if (whichLayer==="tract") {
              var d = d3.select(this).selectAll("path").data();
              if (d.length > 0) {
                var cbsa = m.active_cbsa.properties.GEOID;
                console.log(d);
              }
            }
          }*/
          
          

        });
  
        
  
        var all_done = true;
        
        Object.keys(chunkDone).forEach((size)=>{
          Object.keys(chunkDone[size]).forEach((layer)=>{
            all_done = all_done && chunkDone[size][layer];
          });
        });
        if (!all_done) {
          window.requestAnimationFrame(drawFrame);
        } else {
          finish();
        }
      };
  
      
      
      drawFrame();
  
      function finish() {
        drawDeferred(deferredDraw).then(function() {
          console.log("finished");
          svg.selectAll("g.size").selectAll("g.layer").each(function(layer) {
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
                  .on("click touchstart", function() {
                    cbsa_click(d);
                  })
                  .attr("font-family","proxima-nova-condensed,sans-serif");
              }
            });
          });
        })
        
      };
    

      

    });

  /*for (var k = 0, kk=m.checked_dots.length;k<kk;k++) {
      m.updateDotData(drawData, m.checked_dots[k]);
    }*/
    console.log("updateDotData");
    m.checked_dots.forEach((layer)=>{
      m.updateDotData(allDrawDataLayers.below, layer);
    });
    //m.updateDotData(allDrawDataLayers.below, "pbra_total");
    //m.updateDotData(allDrawDataLayers.below, "hcv_children");
    //m.updateDotData(allDrawDataLayers.below, "hcv_children_poc");
    m.makeLegend();
    m.updateDots(allDrawDataLayers.below, m.checked_dots);
    function filterToVisible(geo_data, viewbox) {
      var toReturn = {above: [], below: []};
      var r = toReturn.below;
      viewbox = viewbox.split(" ");
      for (var layer in geo_data) {
        if (geo_data.hasOwnProperty(layer)) {
          for (var size in geo_data[layer]) {
            if (geo_data[layer].hasOwnProperty(size)) {
              if (!r[size]) r[size] = {};
              r[size][layer] = [];
              for (var i = 0, ii = geo_data[layer][size].features.length; i<ii; i++) {
                var geoid = geo_data[layer][size].features[i].properties.GEOID ||
                  geo_data[layer][size].features[i].properties.GEOID10 ||
                  geo_data[layer][size].features[i].properties.WATERUID;
                geoid*=1;
                var thispath;
                thispath = m.path(geo_data[layer][size].features[i]);
                if (thispath) {
                  var bbox = getBounds(thispath);
                  if (viewbox[0]*1 + viewbox[2]*1 > bbox[0] &&
                      viewbox[1]*1 + viewbox[3]*1 > bbox[1] &&
                      viewbox[0]*1 < bbox[2] &&
                      viewbox[1]*1 < bbox[3]) {
                    if (layer==="tl_2020_us_cbsa" && size==="high") {
                      var clone = {};
                      $.extend(true, clone, geo_data[layer][size].features[i]);
                      clone.properties.invert = true;
                      clone.properties.GEOID = 0 - clone.properties.GEOID;
                      clone.properties.invertBBox = viewbox;
                      toReturn["above"] = {};
                      toReturn["above"][size] = {};
                      toReturn["above"][size][layer] = [clone];
                    }
                    r[size][layer].push(geo_data[layer][size].features[i]);
                  }
                }
              }
            }
          }
        }
      }
      return toReturn;
    }
  };

  function drawDeferred(deferredDraw) {
    return new Promise(function(resolve) {
      var frame = function() {
        var thisFrame = deferredDraw.splice(0, 50);
        thisFrame.forEach(function(e) {
          var {el, data, size} = e;
          d3.select(el).attr("d", function() {
            if (!data.properties) {
              data.properties = {};
            }
            var geoid = data.properties.GEOID | data.properties.GEOID10;
            /*if (layer==="tl_2020_us_cbsa" && size==="high") {
              console.log(el);
              console.log(geoid);
              if (svg_path_data[size][geoid]) {
                console.log(JSON.parse(JSON.stringify(svg_path_data[size][geoid])));
              } else {
                console.log(undefined);
              }
            }*/
            try {
              if (!geoid || !svg_path_data[size][geoid]) {
                var the_path = m.path(data);
                if (data.properties.invert) {
                  var bbox = data.properties.invertBBox;
                  var pre_path = ["M" + bbox[0] + "," + bbox[1]];
                  pre_path.push("l" + bbox[2] + ",0");
                  pre_path.push("l0," + bbox[3]);
                  pre_path.push("l-" + bbox[2] + ",0");
                  pre_path.push("l0,-" + bbox[3]);
                  the_path = pre_path.join("") + "z " + the_path;
                }
                svg_path_data[size][geoid] = the_path;
              }
              return svg_path_data[size][geoid];
            } catch (ex) {
              console.error(geoid, ex);
            }
          })
        })
        if (deferredDraw.length) {
          window.requestAnimationFrame(frame);
          //setTimeout(frame, 500);
        } else {
          resolve();
        }
      }
      
      frame();
    });
  }

  m.removeTractsFromGeoData = function() {
    for (var file in geo_data) {
      if (geo_data.hasOwnProperty(file)) {
        if (file.indexOf("tl_2010_tract_")!==-1 || file.indexOf("redlining_")!==-1) {
          geo_data[file] = undefined;
        }
      }
    }
  };

  m.CBSAZoomSVGUpdate = function(direction, viewbox) {
    var svg = m.svg;
    var dotsSVG = m.dotsSVG;
    var aboveTilesSVG = m.aboveTilesSVG;
    svg.selectAll("circle.household").remove();
    svg.selectAll("text.label")
      .attr("opacity",0)
      .style("visibility","hidden");
    if (direction==="in") {
      svg.selectAll("text.label")
        .attr("opacity",1)
        .style("visibility","visible")
        .transition()
        .duration(0)
        .attr("opacity",0)
        .style("visibiltiy","hidden");
    svg.transition() 
        .duration(0)
        .attr("viewBox", viewbox.join(" "));
    dotsSVG.transition()
        .duration(0)
        .attr("viewBox", viewbox.join(" "));
    aboveTilesSVG.transition()
        .duration(0)
        .attr("viewBox", viewbox.join(" "));
    } else {
      svg.transition()
        .duration(0)
        .attr("viewBox", m.fullUSViewbox);
      dotsSVG.transition()
        .duration(0)
        .attr("viewBox", m.fullUSViewbox);
      aboveTilesSVG.transition()
        .duration(0)
        .attr("viewBox", m.fullUSViewbox);
      m.removeTractsFromGeoData();
      svg.selectAll("g.size.low g.cb_2020_us_state_500k")
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
  };

  m.resetCBSALowRes = function() {
    m.svg.selectAll("g.layer.tl_2020_us_cbsa path, g.layer.cb_2020_us_state_500k path")
      .style("visibility","visible")
      .transition()
      .duration(100)
      .attr("opacity",1);
    m.svg.selectAll("text.label")
      .style("visibility","visible")
      .transition()
      .duration(100)
      .attr("opacity",1);
  }


  function fillFromData(d) {
    if (typeof(d)==="undefined") {
      return "#EB9123";
    }
    if (m.dataset==="holc") {return "#cccccc";}
    d = d[m.gradientConfig[m.dataset].dataIndex];
    if (typeof(m.gradientConfig[m.dataset].bins)==="undefined") {
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
    } else {
      for (var k = 0, kk = m.gradientConfig[m.dataset].bins.length;k<kk;k++) {
        var bin = m.gradientConfig[m.dataset].bins[k];
        if (d>=bin.min && d<bin.max || (k===kk-1 && d<=bin.max)) {
          return bin.color;
        }
      }
    }
  }

  

  m.DrawInitialMap = function() {

    function hoverOver(path) {
      path = d3.select(path);
      path.attr("data-orgfill", path.attr("fill"));
      var hoverColor = "#B9292F";
      
      path.attr("fill",hoverColor);
    }

    var svg = m.svg = d3.select(sel + " .mapwrap").append("svg")
      .attr("viewBox", m.fullUSViewbox)
      .attr("preserveAspectRatio", "xMidYMid");
    m.dotsSVG = d3.select(sel + " .mapwrap").append("svg")
      .attr("viewBox",m.fullUSViewbox)
      .attr("preserveAspectRatio", "xMidYMid")
      .attr("class","dotsSVG");
    m.aboveTilesSVG = d3.select(sel + " .mapwrap").append("svg")
      .attr("viewBox",m.fullUSViewbox)
      .attr("preserveAspectRatio", "xMidYMid")
      .attr("class","aboveTilesSVG");
    var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = glow_filter;
    m.dotsSVG.node().appendChild(defs);
    m.dotsSVG_layers = {};
    m.dotsSVG_layers.affordable_units = m.dotsSVG.append("g").attr("class","affordable_units").attr("opacity", 0.8);
    m.dotsSVG_layers.vouchers = m.dotsSVG.append("g").attr("class","vouchers").attr("opacity", 0.8);
    m.updateDrawData();
    require("./zoom.js")(sel + " .mapwrap", m, $, d3);
    require("./drag.js")(sel + " .mapwrap", m, $, d3);
    $(svg.node()).on("mouseover", "g.tl_2020_us_cbsa > path", function() {
      hoverOver(this);
    });
    $(svg.node()).on("mouseover", "g.tl_2020_us_cbsa > text.label", function() {
      var geoid = $(this).attr("data-geoid");
      var path = $(svg.node()).find("g.tl_2020_us_cbsa > path[data-geoid='" + geoid + "']");
      hoverOver(path[0]);
    });
    $(svg.node()).on("mouseout", "g.tl_2020_us_cbsa > *", function() {
      svg.selectAll("g.tl_2020_us_cbsa > path").each(function() {
        var path = d3.select(this);
        if (path.attr("data-orgfill")) {
          path.attr("fill", path.attr("data-orgfill"));
        }
      });
    });
    $(sel).find(".data-picker-wrapper").append(m.makeDataPicker());
    $(sel).on("click","input[type='checkbox'][name='dotDataset']",function() {
      m.checked_dots = m.getCheckedDots();
      m.updateDrawData();
    });
    
    $(sel + " .mapwrap").append($(document.createElement("div")).attr("class","fullscreenButton")
      .html(require("../fullscreen_svg.txt"))
      .on("click touchstart",function() {
        m.toggleFullScreen();
      }));
    m.makeCBSADropdown(FileIndex);
  };

  m.makeCBSADropdown = function() {
    var data = geo_data.tl_2020_us_cbsa.low.features;
    data.sort(function(a, b) {
      return a.properties.NAME > b.properties.NAME ? 1 : -1;
    });
    var select = $(document.createElement("select"));
    var option;
    option = $(document.createElement("option"))
      .text("Pick a metro area...")
      .attr("val",-1)
      .attr("disabled",true)
      .attr("selected",true);
    select.append(option);
    for (var i = 0, ii = data.length; i<ii; i++) {
      option = $(document.createElement("option"))
        .text(data[i].properties.NAME)
        .attr("value",data[i].properties.GEOID)
        .data("cbsa",data[i]);
      select.append(option);
    }
    select.on("change", function() {
      $(sel).find(".dotsSVG g").empty();
      $(sel).find(".tilewrap").remove();
      var el = $(this).find("option:selected");
      if (true /*typeof(m.active_cbsa)==="undefined"*/) {
        cbsa_click(el.data("cbsa"));
      } else {
        m.zoomToCBSA(m.active_cbsa,"out", function() {
          cbsa_click(el.data("cbsa"));
        });
      }
    });
    $(sel).find(".cbsa-picker-wrapper").append(select);
  };

  return exports;
};

function merge_csv(geo_data, csv) {
  Object.keys(geo_data).forEach((layer)=>{
    if (layer.indexOf("_tract_")!==-1) {
      var cbsa = layer.replace("tl_2010_tract_","");
      if (geo_data[layer]) {
        var tracts = geo_data[layer].high.features;
        tracts.forEach((tract)=>{
          tract.properties.csvData = csv[cbsa][tract.properties.GEOID10];
        })
      }
    }
  })
}


function rowToObj(row, headers) {
  var r = {};
  row.forEach((cell, i)=>{
    r[headers[i]] = cell;
  })
  return r;
}