module.exports = function($, d3, m, sel) {
  function setupWindowResize() {
    var windowResize = function() {
      clearTimeout(m.windowResizeTimer);
      m.windowResizeTimer = setTimeout(function() {
        
        if (typeof(m.active_cbsa)==="undefined") {
          return;
        }
        var newviewport = m.svg.attr("viewBox").split(" ");
        $(sel).find(".tilewrap").addClass("old");
        
        m.getTiles({
          viewport: newviewport,
          width: $(sel).width(),
          height: $(sel).height(),
          projection: m.projection,
          offset: m.offset_px_from_vb(newviewport, m.zoomLevel, m.projection),
          onload: function() {
            $(sel).find(".tilewrap").not("old").css("opacity",1);
            $(sel).find(".tilewrap.old").remove();
          }
        });
      },500);
      if ($(sel).hasClass("fullScreen")) {
        m.makeFullScreen();
      }
      $(sel).find("svg").each(function() {
        $(this).css("width","");
        $(this).css("height","");
      });
      if (!m.active_cbsa) {return;}
      if (m.zoomingToCBSA) {return;}
      m.fixViewbox();
    };
    $(window).resize(windowResize);
  }
  setupWindowResize();
};