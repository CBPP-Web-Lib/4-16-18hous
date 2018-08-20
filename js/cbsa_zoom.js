module.exports = function($, d3, m, sel, g, geojson_bbox) {

  function get_final_viewbox(bbox, projection, width, height, zoom) {
      
    var top_left_bbox_svg_coords = projection([bbox[0], bbox[3]]);
    var bottom_right_bbox_svg_coords = projection([bbox[2], bbox[1]]);
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

    var top_left_viewport_latlong = projection.invert(top_left_viewport_svg_coords);
    var top_left_tile_coords =
      m.get_tile_from_long_lat(
        top_left_viewport_latlong[0],
        top_left_viewport_latlong[1],
        zoom,
        true
      );
    var lat_long_second_tile = [
      m.tile2long(top_left_tile_coords[0]+1, zoom),
      m.tile2lat(top_left_tile_coords[1]+1,zoom)
    ];
    var svg_coords_second_tile = projection(lat_long_second_tile);
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

    return viewbox;
  }

  function projectInterpolate(projection0g, projection1g, t, direction, startScale, endScale, center, orgcenter) {
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

  m.getZoomFromBBox = function(bbox, width, height) {
    var zoom = 1;
    while (true) {
      var test_tl = m.get_tile_from_long_lat(bbox[0],bbox[3],zoom, true);
      var test_br = m.get_tile_from_long_lat(bbox[2],bbox[1],zoom, true);
      if (test_br[0] - test_tl[0] > width/256) {
        break;
      }
      if (test_br[1] - test_tl[1] > height/256) {
        break;
      }
      zoom++;
    }
    zoom--;
    return zoom;
  };

  m.CBSAZoomInDone = function() {
    $(sel).find(".legendwrap").slideDown(100, function() {
      if ($(sel).hasClass("fullScreen")) {
        m.makeFullScreen();
      }
    });
    m.makeZoomOutButton();
    m.makeZoomButtons();
    m.baseWidth = $(m.svg.node()).width();
    m.baseVBWidth = m.svg.attr("viewBox").split(" ")[2];
    d3.select(sel).select(".tilewrap")
      .transition()
      .duration(750)
      .style("opacity",1);
    //var toFadeOut = "g.size.low g.cb_2015_us_state_500k, g.size.low path[data-geoid='"+m.active_cbsa.properties.GEOID+"']";
    var toFadeOut = "g.size.low g.cb_2015_us_state_500k, g.size.low path";
    m.svg.selectAll(toFadeOut)
      .attr("opacity",1)
      .style("visibility","visible")
      .transition()
      .duration(750)
      .attr("opacity",0)
      .style("visibility","hidden")
      .on("end", function() {
        m.svg.select("g.layer.national").attr("opacity",0);
        m.removeLock("zoomingToCBSA");
        m.removeLock("dragging");
        //m.svg.attr("data-viewbox-limit",m.svg.attr("viewBox"));
      });
  };

  m.zoomToCBSA = function(cbsa, direction, cb) {
    if (!direction) {direction = "in";}
    if (m.locked()) {return false;}
    m.setLock("zoomingToCBSA");
    var csvDataLoaded = false, binDataLoaded = false;
    g.getJSONAndSaveInMemory(g.URL_BASE + "/data/" + cbsa.properties.GEOID + ".json", function(err, d) {
      csvDataLoaded = true;
      m.csv[cbsa.properties.GEOID] = d;
      m.getDotDeflator(m.csv, cbsa.properties.GEOID);
      checkDisplay();
    });
    g.getJSONAndSaveInMemory(g.URL_BASE + "/data/bin_" + cbsa.properties.GEOID + ".json", function(err, d) {
      m.cbsaBins[cbsa.properties.GEOID] = d;
      binDataLoaded = true;
      checkDisplay();
    });
    var zoomSideways = false;
    var org_bbox;
    if (m.active_cbsa && direction==="in") {
      zoomSideways = true;
      org_bbox = geojson_bbox(m.active_cbsa);
    }
    m.active_cbsa = cbsa;
    $(sel).find(".cbsa-picker-wrapper select").val(m.active_cbsa.properties.GEOID);
    var bbox = geojson_bbox(cbsa);
    var orgcenter = [-96.6,38.7];
    var center = [(bbox[2]-bbox[0])/2+bbox[0],(bbox[3]-bbox[1])/2+bbox[1]];
    var width = $(m.svg.node()).width();
    var height = $(m.svg.node()).height();
    var zoom = m.getZoomFromBBox(bbox, width, height);
    
    var orgProjection = d3.geoAlbers;
    var destProjection = d3.geoMercator;
    var startScale = orgProjection().scale();
    var destScale = 10000/(bbox[2]-bbox[0]);
   /*if (zoomSideways) {
      orgProjection = destProjection;
      orgcenter = [(org_bbox[0] + org_bbox[2])/2, (org_bbox[1] + org_bbox[3])/2];
      startScale = 10000/(org_bbox[2] - org_bbox[0]);
      $(sel).find(".tilewrap").hide();
    }*/
    $(m.dotsSVG.node()).show();
    if (direction==="out") {
      $(m.dotsSVG.node()).hide();
      $(sel).find("button.zoomOut, div.zoom_tiles").remove();
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
    var destProjectionAdj = projectInterpolate(orgProjection, destProjection, 1, direction, startScale, destScale, center, orgcenter);
    var viewbox = get_final_viewbox(bbox, destProjectionAdj, width, height, zoom);
    var offset_px = m.offset_px_from_vb(viewbox, zoom, destProjectionAdj);
    var zoomFinished = false;
    m.minZoom = zoom;
    m.maxZoom = 13;
    m.getTiles({
      viewport: viewbox,
      width:width,
      height:height,
      z:zoom,
      offset:offset_px,
      projection: destProjectionAdj
    });
    function checkDisplay() {
      if (zoomFinished && csvDataLoaded && binDataLoaded) {
        m.makeGradientConfig();
        $(sel).find(".tilewrap").show();
        $(sel).find(".tilewrap").not("old").css("opacity",1);
        $(sel).find(".tilewrap.old").remove();
        if (typeof(cb)==="function") {
          cb();
        }
      }
    }
    m.CBSAZoomSVGUpdate(direction, viewbox);
    
    var timer = d3.timer(function(elapsed) {
      var p = elapsed/1000;
      if (p>=1) {
        p=1;
        timer.stop();
        m.projection = projectInterpolate(orgProjection, destProjection, p, direction, startScale, destScale, center, orgcenter);
        m.path = d3.geoPath(m.projection);
        zoomFinished = true;
        m.removeLock("zoomingToCBSA");
        if (direction==="in") {
          m.CBSAZoomInDone();
          checkDisplay();
        } else {
          $(sel).find(".legendwrap").slideUp(100);
          if (typeof(cb)==="function") {
            cb();
          }
          m.svg.select("g.layer.national").attr("opacity",1);
          m.resetCBSALowRes();
        }
      }
      if (!zoomFinished) {
        m.projection = projectInterpolate(orgProjection, destProjection, p, direction, startScale, destScale, center, orgcenter);
        m.path = d3.geoPath(m.projection);
      }
      m.svg.selectAll("path")
        .attr("d", m.path);
    });
  };

  m.makeZoomOutButton = function() {
    var button = $(document.createElement("button"));
    button.text("National View");
    button.addClass("zoomOut");
    $(sel).find(".mapwrap").append(button);
    button.on("click touchstart",function() {
      m.zoomToCBSA(m.active_cbsa,"out", function() {
        setTimeout(function() {
          m.updateDrawData();
        },50);
      });
    });
  };

};