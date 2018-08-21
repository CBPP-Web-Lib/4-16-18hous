module.exports = function($, d3, m, sel) {

  m.makeFullScreen = function() {
    var svg = m.svg;
    if (m.locked()) return;
    $(sel).addClass("fullScreen");
    $(sel).css("position","fixed");
    $(sel).css("left","0px");
    $(sel).css("right","0px");
    $(sel).css("top","0px");
    $(sel).css("left","0px");
    $(sel).css("max-width","9999px");
    $(sel).find(".title, .notes, .credit").hide();
    var space_for_map = $(window).height();
    var map_height_percent = space_for_map/($(sel).outerWidth());
    var padding = 0.15;
    var width, height;
    if (map_height_percent > 499/820) {
      height = 820*map_height_percent*(1+padding);
      width = height/map_height_percent;
    } else {
      height = 499*(1+padding);
      width = height/map_height_percent;
    }
    m.fullUSViewbox = [50-((width-820)/2), 5-height*padding, width, height].join(" ");
    var vb = svg.attr("viewBox").split(" ");
    vb[3] = vb[2]*map_height_percent;
    svg.attr("viewBox",vb.join(" "));
    m.dotsSVG.attr("viewBox",vb.join(" "));
    $(sel).find(".fullscreenButton").html(require("../exit_fullscreen_svg.txt"));
    if (m.active_cbsa) {
      m.fixViewbox();
    } else {
      svg.attr("viewBox",m.fullUSViewbox);
      m.dotsSVG.attr("viewBox",m.fullUSViewbox);
    }
    $(sel).find(".mapwrap").parents(".cellWrap").css("padding-bottom",(map_height_percent*100)+"%");
    m.updateDrawData();
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
      m.dotsSVG.attr("viewBox", m.fullUSViewbox);
    }
    $(sel).find(".fullscreenButton").html(require("../fullscreen_svg.txt"));
    $(sel).find(".mapwrap").parents(".cellWrap").css("padding-bottom",(map_height_percent*100)+"%");
  };

  m.toggleFullScreen = function() {
    if ($(sel).hasClass("fullScreen")) {
      m.removeFullScreen();
    } else {
      m.makeFullScreen();
    }
  };
  var legendSliding = false;
  m.slideLegendDown = function() {
    if (legendSliding) {return;}
    legendSliding = true;
    $(sel).find(".fixedInner").animate({
      "height":"0px"
    },300, function() {
      legendSliding = false;
      $(sel).find(".legendSlideDown").html("&#9650;").addClass("legendSlideUp");
    });
    $(sel).find(".fixedGroup").animate({"padding":"0px"},300);
  };

  m.slideLegendUp = function() {
    if (legendSliding) {return;}
    legendSliding = true;
    $(sel).find(".fixedInner").css("height","");
    var height = $(sel).find(".fixedInner").height();
    $(sel).find(".fixedInner").css("height","0px");
    $(sel).find(".fixedInner").animate({
      "height":height + "px"
    },300, function() {
      legendSliding = false;
      $(sel).find(".fixedInner").css("height","");
      $(sel).find(".legendSlideDown").html("&#9660;").removeClass("legendSlideUp");
    });
    $(sel).find(".fixedGroup").animate({"padding":"10px"},300);
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
    m.dotsSVG.attr("viewBox", newvb.join(" "));
  };
};