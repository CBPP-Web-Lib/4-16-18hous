

module.exports = function($, d3, m, sel, g) {
  var img_to_canvas = require("./img_to_canvas.js")($); 
  var exports = {};

  m.get_tile_from_long_lat = function(long, lat, zoom, exact) {
    var scale = 1 << zoom;
    var rounder = Math.floor;
    if (exact===true) {
      rounder = function(n) {return n;};
    }
    var worldCoordinate = m.tile_project(lat, long);
    return [
      rounder(worldCoordinate[0] * scale),
      rounder(worldCoordinate[1] * scale)
    ];
  };
  m.tile_project = function(lat, long) {
    var siny = Math.sin(lat * Math.PI / 180);
    siny = Math.min(Math.max(siny, -0.9999), 0.9999);
    return [
      (0.5 + long / 360),
      (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
    ];
  };
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
    var tl = m.get_tile_from_long_lat(final_tl_latlong[0], final_tl_latlong[1], z);
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
      //tilewrap.find("canvas").css("visibility","visible");
      m.outstandingTiles = false;
      if (typeof(config.onload)==="function") {
        config.onload();
      }
    };
    var requests = 0;
    var errorHandler = function() {
      var url = $(this).attr("src");
      if (url.indexOf("r=2")!==-1) {
        $(this).remove();
        url = url.replace("r=2","r=1");
        var img = $(document.createElement("img"));
        img.attr("src",url);
        applyAttrs(img);
        tilewrap.append(img);
      } else {
        imageOnload.call(this);
      }
    };
    var imageOnload = function() {
      requests--;
      var canvas = img_to_canvas(this);
      $(canvas).css("visibility","visible");
      if (requests===0) {
        finished();
      }
    };
    function applyAttrs(img) {
      img.css("left",(x-tl[0])*256 + "px")
        .css("top",(y-tl[1])*256 + "px")
        .css("visibility","hidden")
        .on("error", errorHandler)
        .on("load", imageOnload);
    }
    for (var x = tl[0]; x<=br[0];x++) {
      for (var y = tl[1]; y<=br[1];y++) {
        requests++;
        var r = "1";
        if (window.devicePixelRatio>1) {
          r = "2";
        }
        var url = g.URL_BASE + "/image_proxy/get_stamen.php?z="+z+"&x="+x+"&y="+y+"&r="+r;
        img = $(document.createElement("img"))
          .attr("src", url);
        applyAttrs(img);
        tilewrap.append(img);
      }
    }
    if (typeof(config.requestsSent)==="function") {
      config.requestsSent();
    }
    m.zoomLevel = z;
  };

  m.tile2long = function(x,z) { return (x/Math.pow(2,z)*360-180); };
  m.tile2lat = function(y,z) {
    var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
    return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
  };
  m.offset_px_from_vb = function(viewbox, zoom, projection) {
    var top_left_coords = projection.invert([viewbox[0], viewbox[1]]);
    var top_left_tile = m.get_tile_from_long_lat(top_left_coords[0], top_left_coords[1], zoom, true);
    var px_offset = [
      (top_left_tile[0] - Math.floor(top_left_tile[0]))*256,
      (top_left_tile[1] - Math.floor(top_left_tile[1]))*256
    ];
    return px_offset;
  };

  return exports;

};