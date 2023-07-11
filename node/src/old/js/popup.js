"use strict";
var popup_html = require("../popup.html");
module.exports = function($, m, sel) {
  m.makePopup = function(e, d) {
    $(sel).find(".popup-outer").remove();
    var popup_outer = $(document.createElement("div")).addClass("popup-outer");
    var popup_wrap = $(document.createElement("div")).addClass("popup-wrap");
    popup_wrap.html(popup_html);
    var f = {
      p: function(n) {
        if (n==="") return "Unknown";
        return Math.round(n*1000)/10 + "%";
      },
      p100: function(n) {
        if (n==="") return "Unknown";
        return Math.round(n*10)/10+"%";
      },
      s: function(n) {
        if (n==="") {
          return f.n(n);
        }
        n = Math.round(n);
        var suffixes = {
          1:"st",
          2:"nd",
          3:"rd",
          4:"th",
          5:"th"
        };
        if (typeof(suffixes[n])==="undefined") {
          return f.n(n);
        }
        return n + suffixes[n] + " quintile";
      },
      n: function(n) {
        if (n==="") return "Unknown";
        return Math.round(n*1000)/1000;
      },
      t: function(t) {return t;}
    };
    var data = {
      cbsa: [d.properties.NAMELSAD10, f.t],
      opportunity: [d.properties.csvData[5], f.s],
      poverty: [d.properties.csvData[1], f.p100],
      race: [d.properties.csvData[6], f.p]
    };
    popup_wrap.find("span[name]").each(function() {
      var d = data[$(this).attr("name")];
      $(this).text(d[1](d[0]));
    });
    var popup_width = Math.min(0.4,300/$(sel).width());
    var offset = $(sel).find(".mapwrap").offset();
    var x = e.pageX - offset.left;
    var y = e.pageY - offset.top;
    if (e.touches) {
      x = e.touches[0].pageX - offset.left;
      y = e.touches[0].pageY - offset.top;
    }
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
  };
};