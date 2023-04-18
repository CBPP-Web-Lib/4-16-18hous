"use strict";

module.exports = function(sel, m, $, d3) {
	$(sel + " svg").bind('mousedown touchstart', function(e) {
		if (!m.active_cbsa) return true;
		if (m.locked()) {
			return;
		}
		var x, y;
		m.offset = $(sel).offset();
		if (e.type==="touchstart") {
			if (e.originalEvent.touches.length > 1) {
				return;
			}
			x = e.originalEvent.touches[0].pageX - m.offset.left;
			y = e.originalEvent.touches[0].pageY - m.offset.top;
			m.touchBase = [x,y];
		} else {
			x = e.pageX - m.offset.left,
			y = e.pageY - m.offset.top;
		}
		m.dragBase = [x,y];
		$(sel).find(".tilewrap.old").remove();
		if ($(sel).find(".tilewrap").length===0) {return;}
		if (e.originalEvent.touches) {
			if (e.originalEvent.touches.length===2) {
				m.dragOn = false;
				return;
			}
		}
		m.dragPossible = true;
		$(sel).find(".popup-outer").remove();
    m.offsetBase = [
      $(sel).find(".tilewrap").not("old").css("left").replace("px","")*1,
      $(sel).find(".tilewrap").not("old").css("top").replace("px","")*1
    ];
	});
	m.finishDrag = function() {
		m.setLock("finishDrag");
		delete(m.dragBase);
		m.dragPossible = false;
    $(sel).find(".tilewrap").addClass("old");
		m.updateDrawData();
		var viewport = d3.select(sel).select("svg").attr("viewBox").split(" ");
		var offset_px = m.offset_px_from_vb(viewport, m.zoomLevel, m.projection);
    m.getTiles({
			width: $(sel).width(),
			height: $(sel).height(),
			projection:m.projection,
			viewport: viewport,
			offset: offset_px,
			requestsSent: function() {
				m.removeLock("finishDrag");
			},
      onload: function() {
				$(sel).find(".tilewrap.old").remove();
      }
		});
		$(sel).find(".tilewrap").css("opacity",1);
	};
	$(sel + " svg").bind("mouseup touchend", function(e) {
		if (m.getLock("dragOn")===false) {
			return;
		} else {
			m.removeLock("dragOn");
		}
		if (m.locked()) {return;}
		m.finishDrag();
	});
	$(sel + " svg").bind('mouseout', function(e) {
		if ($.contains($(sel)[0],e.relatedTarget) || 
			$(e.relatedTarget).hasClass("popup") || 
			$(e.relatedTarget).parents(".popup").length>0) {
			return;
		} else {
			if (m.getLock("dragOn")===false) {return;}
			m.removeLock("dragOn");
			m.dragPossible = false;
			delete(m.dragBase);
			if (m.locked()) {return;}
			m.finishDrag();
		}
	});
	$(sel + " svg").bind('mousemove touchmove', function(e) {
		if (!m.dragPossible) {return;}
		m.offset = $(sel).offset();
		e = e.originalEvent;
		var x = e.pageX - m.offset.left,
		y = e.pageY - m.offset.top;
		if (e.type==="touchmove") {
			x = e.touches[0].pageX - m.offset.left;
			y = e.touches[0].pageY - m.offset.top;
			if (Math.abs(x - m.touchBase[0])>20 || Math.abs(y - m.touchBase[1]) > 20) {
				m.setLock("dragOn");
			}
		} else {
			m.setLock("dragOn");
		}
		if (m.getLock("dragOn")) {
			m.drag(x,y);
		}
	});

  m.drag = function(x,y) {
    var width = $(sel).width();
    var height = $(sel).height();
    var svg = d3.select(sel).select("svg");
    var viewport = svg.attr("viewBox").split(" ");
    if (!m.options) m.options = {};
    var dX = x - m.dragBase[0];
    var dY = y - m.dragBase[1];
    viewport[0] = viewport[0]*1 - dX/width*viewport[2];
    viewport[1] = viewport[1]*1 - dY/height*viewport[3];
    $(sel).find(".tilewrap").css("top", m.offsetBase[1] + dY + "px");
    $(sel).find(".tilewrap").css("left", m.offsetBase[0] + dX + "px");
    m.dragBase = [x,y];
    m.offsetBase = [
      $(sel).find(".tilewrap").css("left").replace("px","")*1,
      $(sel).find(".tilewrap").css("top").replace("px","")*1
    ];
    viewport = viewport.join(" ");
		svg.attr("viewBox", viewport);
		m.dotsSVG.attr("viewBox", viewport);
		m.aboveTilesSVG.attr("viewBox", viewport);
  };
};
