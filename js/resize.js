module.exports = function($, d3, m, sel) {
  function setupWindowResize() {
    var windowResize = function() {
      console.log("here");
      clearTimeout(m.windowResizeTimer);
      m.windowResizeTimer = setTimeout(function() {
        if (typeof(m.active_cbsa)==="undefined") {
          return;
        }
        var newviewport = svg.attr("viewBox").split(" ");
        $(sel).find(".tilewrap").addClass("old");
        
        m.getTiles({
          viewport: newviewport,
          width: $(sel).width(),
          height: $(sel).height(),
          projection: m.projection,
          offset: m.offset_px_from_vb(newviewport, m.zoomLevel, m.projection),
          requestsSent: function() {
            setImmediate(function() {
              m.zooming = false;
              m.dragging = false;
            });
          },
          onload: function() {
            $(sel).find(".tilewrap").not("old").css("opacity",1);
            $(sel).find(".tilewrap.old").remove();
          }
        });
        m.zooming = true;
        m.dragging = true;
      },500);
      if ($(sel).hasClass("fullScreen")) {
        m.makeFullScreen();
      }
      if (!m.active_cbsa) {return;}
      if (m.zoomingToCBSA) {return;}
      m.fixViewbox();
    };
    $(window).resize(windowResize);
  }
  setupWindowResize();
};