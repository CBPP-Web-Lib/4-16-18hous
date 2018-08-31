module.exports = function($, m, sel) {
  var instructions = $(document.createElement("div")).html(m.initialContents).find(".instructions_popup");
  $(sel).append(instructions);
  $(instructions).wrap("<div class='instructions-wrap'>" +
      "<div class='instructions-wrap-table'>" +
        "<div class='instructions-wrap-row'>" + 
          "<div class='instructions-wrap-cell'>" +
        "</div>" + 
      "</div>" + 
    "</div>" + 
  "</div>");
  $(sel).find(".instructions_popup a").attr("target","_blank");
  $(sel).find(".instructions_popup").append("<button>OK, take me to the maps</button>");
  function dismissIntructions() {
    $(sel).find(".instructions-wrap").fadeOut(500);
  }
  $(sel).find(".instructions_popup button").on("click", dismissIntructions);
  $(sel).find(".instructions-wrap").on("click", function(e) {
    if ($(e.target).parents(".instructions_popup").length === 0 && !$(e.target).is(".instructions_popup")) {
      dismissIntructions();
    }
  });
  $(sel).find(".instructions_popup a").each(function() {
    if (typeof($(this).attr("name"))!=="undefined") {
      if ($(this).attr("name").indexOf("_ftnref")!==-1) {
        $(this).addClass("ftnref");
      }
    }
  });
  $(sel).find(".instructions_popup .figure-footnotes").hide();
  $(sel).find(".instructions_popup .figure-footnotes a.ftnref").on("click", function(e) {
    e.preventDefault();
  });
  $(sel).find(".instructions_popup a.ftnref").on("mouseenter", function(e) {
    var href = $(this).attr("href").replace("#","");
    var corresponding_ftn = $(sel).find(".figure-footnotes a[name='"+href+"']").parents("p").first().html();
    make_ftn_popup(corresponding_ftn, $(this));
  });
  function leaveFootnote() {
    m.footnoteTimer = setTimeout(function() {
      destroy_ftn_popup();
    }, 500);  
  }
  $(sel).find(".instructions_popup a.ftnref, .ftnPopup").on("mouseleave", leaveFootnote);
  $(sel).on("mouseleave",".ftnPopup",leaveFootnote);

  function make_ftn_popup(html, a) {
    $(sel).find(".ftnPopup").remove();
    var offset = $(a).offset();
    var p_offset = $(sel).offset();
    var pop_offset = {
      top: offset.top - p_offset.top,
      left: offset.left - p_offset.left
    };
    var popup = $(document.createElement("div")).addClass("ftnPopup");
    popup.html(html);
    $(sel).append(popup);
    var width = popup.width();
    var selWidth = $(sel).width();
    var selHeight = $(sel).height();
    var top = pop_offset.top < selHeight/2 ? pop_offset.top + 20 : pop_offset.top - popup.height() - 10;
    var cssAttrs = {};
    cssAttrs.left = (pop_offset.left - (pop_offset.left/selWidth)*width) + "px";
    cssAttrs.top = top + "px";
    popup.css(cssAttrs);
    popup.find("sup").remove();
    clearTimeout(m.footnoteTimer);
  }

  $(sel).on("mousemove",".ftnPopup", function() {
    clearTimeout(m.footnoteTimer);
  });

  function destroy_ftn_popup() {
    $(sel).find(".ftnPopup").remove();
  }

  var showInstructions = $("<a></a>");
  showInstructions.attr("href","#")
    .addClass("showInstructions")
    .text("Show Instructions")
    .on("click", function(e) {
      e.preventDefault();
      $(sel).find(".instructions-wrap").fadeIn(500);
    });
  $(sel).find(".mapwrap").append(showInstructions);
  $(sel).find(".license_info").remove();

};