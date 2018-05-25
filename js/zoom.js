module.exports = function(sel, obj, $, d3) {
  var m = obj;
  var zoomCallbacks = [];
  m.zooming = false;
  m.onZoom = function(cb) {
    zoomCallbacks.push(cb);
  };
  m.zoom = function(x,y,direction) {
    if (m.zooming) return;
    if (m.dragOn) return;
    if (m.zoomingToCBSA) return;
    if (!m.active_cbsa) {return;}
    var oz = direction==="in" ? 2: 0.5;
    var db = direction==="in" ? 1 : -1;
    if (m.zoomLevel + db > m.maxZoom) {
      return;
    }
    if (m.zoomLevel + db < m.minZoom) {
      return;
    }
    m.zooming = true;
    var svg = d3.select(sel).select("svg");
    var width = $(sel).width();
    var height = $(sel).height();
    if (!obj.options) {
      obj.options = {};
    }
    var viewport = svg.attr("viewBox").split(" ");
    var newwidth = viewport[2]*(direction==="in" ? 0.5 : 2);
    var newheight = viewport[3]*(direction==="in" ? 0.5 : 2);
    var xchange = 0-(x/width)*(newwidth-viewport[2]);
    var ychange = 0-(y/height)*(newheight-viewport[3]);
    var newviewport = [viewport[0]*1 + xchange, viewport[1]*1 + ychange, newwidth, newheight];
    animateTiles(viewport, newviewport, width, height, direction);
    var tilesLoaded = false;
    var zoomedFully = false;
    var offset_px = m.offset_px_from_vb(newviewport, m.zoomLevel + db, m.projection);
    m.getTiles({
      viewport: newviewport,
      z:m.zoomLevel + db,
      width: $(sel).width(),
      height: $(sel).height(),
      projection: m.projection,
      offset: offset_px,
      onload: function() {
        tilesLoaded = true;
        $(sel).find(".tilewrap").not(".old").css("visibility","hidden");
        checkFade();
      }
    });
    function checkFade() {
      if (tilesLoaded && zoomedFully) {
        $(sel).find(".tilewrap").not(".old").css("opacity",1);
        $(sel).find(".tilewrap").not(".old").css("visibility","visible").fadeIn(100, function() {
          $(sel).find(".tilewrap.old").remove();
        });
        m.zooming = false;
      }
    }
    svg.transition()
      .duration(750)
      .ease(d3.easeLinear)
      .attr("viewBox", newviewport.join(" "))
      .on("end", function() {
        m.updateDrawData(svg);
        zoomedFully=true;
        checkFade();
      });

  };
  function animateTiles(oldviewport, newviewport, width, height, direction) {
    var xoffset = (newviewport[0] - oldviewport[0])*(width/newviewport[2]);
    var yoffset = (newviewport[1] - oldviewport[1])*(height/newviewport[3]);
    var xscaling = oldviewport[3]/newviewport[3];
    var yscaling = oldviewport[2]/newviewport[2];
    var tilewrap = $(sel).find(".tilewrap");
    var wleft = tilewrap.css("left").replace("px","")*(xscaling-1);
    var wtop = tilewrap.css("top").replace("px","")*(yscaling - 1);
    $(sel).find(".tilewrap").addClass("old");
    $(sel).find(".tilewrap.old img").each(function() {
      var top = $(this).css("top").replace("px","");
      var left = $(this).css("left").replace("px","");
      left*=xscaling;
      top*=yscaling;
      top-=yoffset;
      left-=xoffset;
      d3.select(this).transition()
        .ease(function(t) {
          return direction==="in" ? t/(2-t) : 2*t/(1+t);
        })
        .duration(750)
        .style("top",(top+wtop)+'px')
        .style("left",(left+wleft)+'px')
        .style("width",$(this).width()*xscaling + "px")
        .style("height",$(this).height()*yscaling + "px");
    });
  }
  m.zoomIn = function(x, y) {
    m.zoom(x,y,"in");
  };
  m.zoomOut = function(x, y) {
    m.zoom(x,y,"out");
  };
  $(window).bind('mousewheel DOMMouseScroll', function(event) {
    if (m.scrollEventsBlocked) {
      return;
    }
    var width = $(sel).width();
    var height = $(sel).height();
    var x = event.originalEvent.pageX - $(sel).offset().left,
      y = event.originalEvent.pageY - $(sel).offset().top;
    if (x < 0 || x > width || y < 0 || y > height) {return;}
    var amount = event.originalEvent.wheelDelta;
    if (typeof(amount)==="undefined") {
      amount = 0 - event.originalEvent.detail;
    }
    if (amount===0) {return;}
    if (amount > 0) {
      m.zoomIn(x, y);
    }
    else {
      m.zoomOut(x, y);
    }
    return false;
  });
};
