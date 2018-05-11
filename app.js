/*globals require, document, console, window, Promise*/
(function() {
"use strict";
if (typeof(Promise)==="undefined") {
  Promise = require("promise-polyfill");
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
  var projection = d3.geoAlbers(),
    path = d3.geoPath(projection);
  var defaultViewbox = [50, 5, 820, 820*$(sel + " .mapwrap").height()/$(sel + " .mapwrap").width()].join(" ");

  function get_tile_from_long_lat(long, lat, zoom) {
    var scale = 1 << zoom;
    var worldCoordinate = tile_project(lat, long);
    return [
      Math.floor(worldCoordinate[0] * scale),
      Math.floor(worldCoordinate[1] * scale)
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
        .attr("fill", function() {
          if (layer.indexOf("state")!==-1) {
            return "#D6E4F0";
          }
          if (layer==="national") {
            return "none";
          }
          return "#EB9123";
        })
        .attr("fill-opacity", function() {
          if (layer.indexOf("state")!==-1) {
            return 1;
          }

          return 0.5;
        })
        .attr("stroke",function() {
          if (layer.indexOf("state")!==-1) {
            return "#fff";
          }
          if (layer==="national") {
            return "#0C61A4";
          }
          return "#EB9123";
        });
      d3.select(this).selectAll("path").each(function(d) {
        if (d.properties && d3.select(this.parentNode).attr("class").indexOf("cbsa")!==-1) {
          var bbox = this.getBBox();
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
  };
  m.getTiles = function(config) {
    if (!m.active_cbsa) {return;}
    if (m.outstandingTiles) {return;}
    m.outstandingTiles = true;
    if (typeof(config)==="undefined") {
      config={};
    }

    var bbox = config.bbox;
    var width = config.width;
    var height = config.height;
    var z = config.z;
    var offset = config.offset;

    var cviewbox = config.cviewbox;
    if (!bbox) {
      var viewbox = svg.attr("viewBox").split(" ");
      if (cviewbox) {viewbox = cviewbox;}
      var btl = projection.invert([
        viewbox[0]*1,
        viewbox[1]*1
      ]);
      var bbr = projection.invert([
        viewbox[0]*1 + viewbox[2]*1,
        viewbox[1]*1 + viewbox[3]*1
      ]);
      bbox = [
        btl[0],
        bbr[1],
        bbr[0],
        btl[1]
      ];
    }
    if (!width) {width = $(sel).width();}
    if (!height) {height = $(sel).height();}
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
    var tl = get_tile_from_long_lat(bbox[0],bbox[3],z);
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
    var ctx = oldtilewrap.attr("data-sx")*zchange;
    var cty = oldtilewrap.attr("data-sy")*zchange;
    var dx = isNaN(ctx) ? 0 : ctx - tl[0];
    var dy = isNaN(cty) ? 0 : cty - tl[1];
    offset[0] -= dx*256;
    offset[1] -= dy*256;
    var tile_offset = [
      Math.ceil(offset[0]/256),
      Math.ceil(offset[1]/256)
    ];
    tilewrap.css("left",(offset[0])+"px");
    tilewrap.css("top",(offset[1])+"px");
    var br = [Math.ceil(tl[0]+width/256), Math.ceil(tl[1] + height/256)];
    var img;
    var finished = function() {
      tilewrap.find("img").css("visibility","visible");
      m.outstandingTiles = false;
      if (typeof(config.onload)==="function") {config.onload();}
    };
    var onload = function() {
      requests--;
      if (requests===0) {
        finished();
      }
    };
    var requests = 0;
    tilewrap.attr("data-sx",tl[0]);
    tilewrap.attr("data-sy",tl[1]);
    for (var x = tl[0] - tile_offset[0]; x<=br[0]+1 - tile_offset[0];x++) {
      for (var y = tl[1] - tile_offset[1]; y<=br[1]+1 - tile_offset[1];y++) {
        requests++;
        var url = "https://stamen-tiles.a.ssl.fastly.net/toner/"+z + "/" + x+"/"+y + ".png";
        img = $(document.createElement("img"))
          .attr("src", url)
          .css("left",(x-tl[0])*256 + "px")
          .css("top",(y-tl[1])*256 + "px")
          .css("visibility","hidden")
          .on("load", onload);
        tilewrap.append(img);
      }
    }
    m.zoomLevel = z;
  };
  DrawInitialMap();
  svg.on("click", function() {
    var vcoords = d3.mouse(this);
    var coords = projection.invert([vcoords[0], vcoords[1]]);
    console.log(Math.abs(coords[0])+"W",Math.abs(coords[1])+"N");
  });
  function zoomToCBSA(cbsa, direction, cb) {
    if (!direction) {direction = "in";}
    if (m.zoomingToCBSA) {return false;}
    m.zoomingToCBSA = true;
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
    var top_left = get_tile_from_long_lat(bbox[0],bbox[3],zoom);
    var bottom_right = [Math.ceil(top_left[0]+width/256), Math.ceil(top_left[1] + height/256)];
    var tileRightExtra = (width%256)/256;
    var tileBottomExtra = (height%256)/256;
    function tile2long(x,z) { return (x/Math.pow(2,z)*360-180); }
    function tile2lat(y,z) {
      var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
      return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
    }
    var top_lat = tile2lat(top_left[1], zoom);
    var bottom_lat = tile2lat(bottom_right[1]-1+tileBottomExtra, zoom);
    var left_long = tile2long(top_left[0], zoom);
    var right_long = tile2long(bottom_right[0]-1+tileRightExtra, zoom);
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
    var top_left_vb = destProjectionAdj([
      left_long, top_lat
    ]);
    var bottom_right_vb = destProjectionAdj([
      right_long, bottom_lat
    ]);
    var center_vb = destProjectionAdj(center);
    var offset = [
      center_vb[0] - (top_left_vb[0] + bottom_right_vb[0])/2,
      center_vb[1] - (top_left_vb[1] + bottom_right_vb[1])/2
    ];
    var vb_dim = [
      bottom_right_vb[0] - top_left_vb[0],
      bottom_right_vb[1] - top_left_vb[1]
    ];
    var offset_px = [0-offset[0]/vb_dim[0]*width, 0-offset[1]/vb_dim[1]*height];
    var destViewbox = [
      //top_left_bbox[0],
      //top_left_bbox[1],
      top_left_vb[0]+offset[0],
      top_left_vb[1] + offset[1],
      bottom_right_vb[0] - top_left_vb[0],
      bottom_right_vb[1] - top_left_vb[1]
    ];
    var tilesLoaded = false;
    var zoomFinished = false;
    m.minZoom = zoom;
    m.maxZoom = zoom+4;
    m.getTiles({
      //cviewbox:destViewbox.join(" "),
      bbox:bbox,
      width:width,
      height:height,
      z:zoom,
      offset:offset_px,
      onload:function() {
        tilesLoaded = true;
        checkDisplay();
      }
    });
    function checkDisplay() {
      if (zoomFinished && tilesLoaded) {
        $(sel).find(".tilewrap").not("old").css("opacity",1);
        $(sel).find(".tilewrap.old").remove();
      }
    }
    svg.selectAll("text.label")
      .attr("opacity",0);
    if (direction==="in") {
      svg.selectAll("text.label")
        .attr("opacity",1)
        .transition(1)
        .duration(100)
        .attr("opacity",0);
     svg.transition()
        .duration(1000)
        .attr("viewBox", destViewbox.join(" "));
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
        if (typeof(cb)==="function") {
          cb();
        }
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
            .transition()
            .duration(750)
            .attr("opacity",0)
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
          svg.selectAll("text.label")
            .transition(1)
            .duration(100)
            .attr("opacity",1);
        }
      }
      projection = projectInterpolate(orgProjection, destProjection, p, startScale, destScale, center, orgcenter);
      path = d3.geoPath(projection);
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
