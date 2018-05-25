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
var cb_2015_us_state_500k = require("./topojson/low/cb_2015_us_state_500k.json");
var tl_2015_us_cbsa = require("./topojson/low/tl_2015_us_cbsa.json");
var popup_html = require("./popup.html");
geo_data.cb_2015_us_state_500k = {low: topojson.feature(cb_2015_us_state_500k, cb_2015_us_state_500k.objects.districts)};
geo_data.tl_2015_us_cbsa = {low: topojson.feature(tl_2015_us_cbsa, tl_2015_us_cbsa.objects.districts)};
var URL_BASE;
require("./app.css");
//var data = require("./intermediate/data.json");
//console.log(data);
var drawData = {};
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
      $.getJSON(f, function(d) {
        if (typeof(d)==="object" && d.compressed) {
          d = JSON.parse(pako.inflate(d.d, {to: "string"}));
        }
        localforage.setItem(f, d);
        cb(null, d);
      }).fail(function() {
        cb(err);
      });
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
    rows: [0.61]
  });
  $(sel).find(".grid00").empty().addClass("mapwrap");
  URL_BASE = $("#script_hous4-16-18")[0].src.replace("/js/app.js","");
  var svg;
  m.zoomingToCBSA = false;
  m.projection = d3.geoAlbers();
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
      .data(FileIndex.concat(["national"]))
      .enter()
      .append("g")
      .attr("class", function(d) {
        return "layer " + d;
      });
    var textOffsets = require("./textOffsets.json");
    var cbsa_click = function(d) {
      var geoid = d.properties.GEOID;
      if (m.active_cbsa) {return false;}
      var zoomed = false;
      var loaded = false;
      function checkZoomAndLoad() {
        if (zoomed && loaded) {
          //applyData(csv, m.active_cbsa.properties.GEOID, []);
          m.updateDrawData(svg);
        }
      }
      getJSONAndSaveInMemory(URL_BASE + "/topojson/high/tl_2010_tract_" + geoid + ".json", function(err, d) {
        var geo = topojson.feature(d, d.objects.districts);
        geo_data["tl_2010_tract_" + geoid] = {high:geo};
        loaded = true;
        checkZoomAndLoad();
      });
      zoomToCBSA(d, "in", function() {
        zoomed = true;
        checkZoomAndLoad();
      });
    };
    svg.selectAll("g.size").selectAll("g.layer").each(function(layer) {
      var size = d3.select(this.parentNode).attr("class").split(" ")[1];
      var scaling ={"low":1,"high":0.1};
      var pathData = function() {

        if (!drawData[size]) {
          drawData[size] = {};
        }
        var d = drawData[size][layer];
        if (!d) {
          d = [];
        } else {
          /*if (m.active_cbsa) {
            if (layer.indexOf("tract")!==-1) {
              var cbsa = m.active_cbsa.properties.GEOID;
              d = applyData(csv,cbsa, d);
              console.log(d);
            }
          }*/
        }
        return d;
      }();
      var pathIndex = function(pathData, i) {
        if (pathData.properties) {
          return pathData.properties.GEOID;
        } else {
          return i;
        }
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
        .attr("stroke-width",function() {
          if (layer.indexOf("state")!==-1) {
            return 0.8*scaling[size];
          }
          return 0.5*scaling[size];
        })
        .merge(paths)
        .attr("fill", function(d) {
          if (layer.indexOf("state")!==-1) {
            return "#D6E4F0";
          }
          if (layer==="national") {
            return "none";
          }
          if (layer.indexOf("tl_2010_tract")!==-1) {
            return fillFromData(d.properties.csvData);
          }
          return "#EB9123";
        })
        .on("mousemove", function(d) {
          if (m.dragOn) return;
          if (d.properties.csvData) {
            makePopup(d3.event, d);
            $(this).css("cursor","pointer");
            d3.select(this).attr("opacity",1);
            d3.select(this).attr("fill","#EB9123");
          }
        })
        .on("mouseout", function(d) {
          if (d.properties.csvData) {
            //d3.select(this).attr("opacity",0.5);
            $(this).css("cursor","auto");
            d3.select(this).attr("fill",fillFromData(d.properties.csvData));
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
        .attr("stroke",function() {
          if (layer.indexOf("state")!==-1) {
            return "#fff";
          }
          if (layer==="national") {
            return "#0C61A4";
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
          d3.select(this.parentNode)
            .append("text")
            .attr("class","label")
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
            .on("click", function(){
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
  };
  function filterToVisible(geo_data, viewbox) {
    var r = {};
    viewbox = viewbox.split(" ");
    for (var layer in geo_data) {
      if (geo_data.hasOwnProperty(layer)) {
        for (var size in geo_data[layer]) {
          if (geo_data[layer].hasOwnProperty(size)) {
            if (!r[size]) r[size] = {};
            /*if (!r[size][layer])*/ r[size][layer] = [];
            for (var i = 0, ii = geo_data[layer][size].features.length; i<ii; i++) {
              var geoid = geo_data[layer][size].features[i].properties.GEOID ||
                geo_data[layer][size].features[i].properties.GEOID10;
              geoid*=1;
              if (!svg_path_data[geoid]) {
                svg_path_data[geoid] = {};
              }
              var thispath;
              if (!svg_path_data[geoid][size]) {
                thispath = path(geo_data[layer][size].features[i]);
                svg_path_data[geoid][size] = thispath;
              } else {
                thispath = svg_path_data[geoid][size];
              }
              if (thispath) {
                //var bbox = getBounds(thispath);
              /*  if (viewbox[0]*1 + viewbox[2]*1 > bbox[0] &&
                    viewbox[1]*1 + viewbox[3]*1 > bbox[1] &&
                    viewbox[0]*1 < bbox[2] &&
                    viewbox[1]*1 < bbox[3]) {*/
                  r[size][layer].push(geo_data[layer][size].features[i]);
              //  }
              }
            }
          }
        }
      }
    }
    return r;
  }
  function fillFromData(d) {
    if (typeof(d)==="undefined") {
      return "#EB9123";
    }
    var poverty_rate = Math.min(40,d[1])/40;
    return "rgba(185,41,47," + poverty_rate + ")";
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
      }
      $(this).attr("src", url);
    };
    for (var x = tl[0]; x<=br[0];x++) {
      for (var y = tl[1]; y<=br[1];y++) {
        requests++;
        var ext = ".png";
        if (window.devicePixelRatio>1) {
          ext = "@2x.png";
        }
        var url = "https://stamen-tiles.a.ssl.fastly.net/toner-lite/"+z + "/" + x+"/"+y + ext;
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
  svg.on("click", function() {
    var vcoords = d3.mouse(this);
    var coords = m.projection.invert([vcoords[0], vcoords[1]]);
    console.log(Math.abs(coords[0])+"W",Math.abs(coords[1])+"N");
  });
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
    m.active_cbsa = cbsa;
    var bbox = geojson_bbox(cbsa);
    var orgcenter = [-96.6,38.7];
    var center = [(bbox[2]-bbox[0])/2+bbox[0],(bbox[3]-bbox[1])/2+bbox[1]];
    var width = $(svg.node()).width();
    var height = $(svg.node()).height();
    var zoom = 1;
    while (true) {
      var test_tl = get_tile_from_long_lat(bbox[0],bbox[3],zoom);
      var test_br = get_tile_from_long_lat(bbox[2],bbox[1],zoom);
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
        $(sel).find(".tilewrap").not("old").css("opacity",1);
        $(sel).find(".tilewrap.old").remove();
        if (typeof(cb)==="function") {
          cb();
        }
      }
    }
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
      for (var file in geo_data) {
        if (geo_data.hasOwnProperty(file)) {
          if (file.indexOf("tl_2010_tract_")!==-1) {
            geo_data[file] = undefined;
          }
        }
      }
      svg.selectAll("g.size.low")
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
        if (direction==="in") {

          makeZoomOutButton();
          zoomFinished = true;
          checkDisplay();
          d3.select(sel).select(".tilewrap")
            .transition()
            .duration(750)
            .style("opacity",1);
          svg.selectAll("g.size.low")
            .attr("opacity",1)
            .style("visibility","visible")
            .transition()
            .duration(750)
            .attr("opacity",0)
            .style("visibility","hidden")
            .on("end", function() {
              /*console.log(bbox);
              console.log(projection([bbox[2],bbox[3]]));*/
              m.zoomingToCBSA = false;

              svg.attr("data-viewbox-limit",svg.attr("viewBox"));
              /*setTimeout(function() {
                zoomToCBSA(cbsa,"out");
              }, 1000);*/
            });
        } else {
          m.zoomingToCBSA = false;
          zoomFinished = true;
          if (typeof(cb)==="function") {
            cb();
          }
          svg.selectAll("text.label")
            .style("visibility","visible")
            .transition()
            .duration(100)
            .attr("opacity",1);
        }
      }
      m.projection = projectInterpolate(orgProjection, destProjection, p, startScale, destScale, center, orgcenter);
      path = d3.geoPath(m.projection);
      d3.selectAll("path")
        .attr("d", path);
    });
  }


  function makeZoomOutButton() {
    var button = $(document.createElement("button"));
    button.text("Zoom Out");
    button.addClass("zoomOut");
    $(sel).find(".mapwrap").append(button);
    button.on("click",function() {
      zoomToCBSA(m.active_cbsa,"out", function() {
        setTimeout(function() {

          m.updateDrawData(svg)

        },50);
      });
      $(sel).find("button.zoomOut").remove();
    });
  }





  function DrawInitialMap() {
    svg = d3.select(sel + " .mapwrap").append("svg")
      .attr("viewBox", defaultViewbox)
      .attr("preserveAspectRatio", "xMinYMin");

    m.updateDrawData(svg);
    require("./js/zoom.js")(sel + " .mapwrap", m, $, d3);
    require("./js/drag.js")(sel + " .mapwrap", m, $, d3);
  }
}; /*Interactive()*/


$(document).ready(function() {
  return new Interactive("#hous4-16-18");
});
})();
