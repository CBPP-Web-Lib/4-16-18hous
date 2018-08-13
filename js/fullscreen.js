module.exports = function($, d3, m, sel) {

  m.makeFullScreen = function() {
    var svg = m.svg;
    $(sel).addClass("fullScreen");
    $(sel).css("position","fixed");
    $(sel).css("left","10px");
    $(sel).css("right","10px");
    $(sel).css("top","10px");
    $(sel).css("left","10px");
    $(sel).css("max-width","9999px");
    $(sel).find(".title, .notes, .credit").hide();
    var space_for_map = $(window).height() - 
      (
        $(sel).find(".title").outerHeight() +
        $(sel).find(".subtitle").outerHeight() +
        $(sel).find(".notes").outerHeight() +
        $(sel).find(".credit").outerHeight() +
        $(sel).find(".cellWrap01").outerHeight() + 
        $(sel).find(".cellWrap02").outerHeight()
      );
    space_for_map+=50;
    var map_height_percent = space_for_map/($(sel).width());
    if (map_height_percent > 499/820) {
      m.fullUSViewbox = [50, 5, 820, 820*map_height_percent].join(" ");
    } else {
      m.fullUSViewbox = [50, 5, 499/map_height_percent, 499].join(" ");
    }
    var vb = svg.attr("viewBox").split(" ");
    vb[3] = vb[2]*map_height_percent;
    svg.attr("viewBox",vb.join(" "));
    $(sel).find(".fullscreenButton").text("Collapse");
    if (m.active_cbsa) {
      m.fixViewbox();
    } else {
      svg.attr("viewBox",m.fullUSViewbox);
    }
    $(sel).find(".mapwrap").parents(".cellWrap").css("padding-bottom",(map_height_percent*100)+"%");
    m.updateDrawData(svg);
    var newviewport = svg.attr("viewBox").split(" ");
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
  };



  m.removeFullScreen = function() {
    var svg = m.svg;
    $(sel).removeClass("fullScreen");
    $(sel).css("position","");
    $(sel).css("left","");
    $(sel).css("right","");
    $(sel).css("top","");
    $(sel).css("left","");
    $(sel).css("max-width","940px");
    $(sel).find(".title, .notes, .credit").show();
    var map_height_percent = 0.61;
    var vb = svg.attr("viewBox").split(" ");
    vb[3] = vb[2]*map_height_percent;
    svg.attr("viewBox",vb.join(" "));
    m.fullUSViewbox = [50, 5, 820, 499].join(" ");
    if (m.active_cbsa) {
      m.fixViewbox();
    } else {
      svg.attr("viewBox",m.fullUSViewbox);
    }
    $(sel).find(".fullscreenButton").text("Expand");
    $(sel).find(".mapwrap").parents(".cellWrap").css("padding-bottom",(map_height_percent*100)+"%");
  };

  m.toggleFullScreen = function() {
    if ($(sel).hasClass("fullScreen")) {
      m.removeFullScreen();
    } else {
      m.makeFullScreen();
    }
  };

  m.fixViewbox = function() {
    var svg = m.svg;
    var width = $(svg.node()).width();
    var frac = width/m.baseWidth;
    var currentvb = svg.attr("viewBox").split(" ");
    var newvb = [
      currentvb[0],
      currentvb[1],
      m.baseVBWidth*frac,
      m.baseVBWidth*currentvb[3]/currentvb[2]*frac
    ];
    svg.attr("viewBox", newvb.join(" "));
  };
};