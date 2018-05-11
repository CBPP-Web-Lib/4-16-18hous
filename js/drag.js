module.exports = function(sel, m, $, d3) {
	$(sel + " svg").bind('mousedown touchstart', function(e) {
		if (m.outstandingTiles) {return;}
		if (m.zooming) {return;}
		if (m.zoomingToCBSA) {return;}
		if (!m.active_cbsa) {return;}
		$(sel).find(".tilewrap.old").remove();
		if ($(sel).find(".tilewrap").length===0) {return;}
		m.dragOn = true;
		$(sel).find(".popup-outer").remove();
    m.offset = $(sel).offset();
		var x = e.pageX - m.offset.left,
		y = e.pageY - m.offset.top;
		if (e.type==="touchstart") {
			if (e.originalEvent.touches.length > 1) {
				return;
			}
			x = e.originalEvent.touches[0].pageX - m.offset.left;
			y = e.originalEvent.touches[0].pageY - m.offset.top;
		}
		m.dragBase = [x,y];
    m.offsetBase = [
      $(sel).find(".tilewrap").not("old").css("left").replace("px","")*1,
      $(sel).find(".tilewrap").not("old").css("top").replace("px","")*1
    ];
		return false;
	});
	$(sel + " svg").bind("mouseup touchend", function(e) {
		if (m.zooming) {return;}
		if (!m.active_cbsa) {return;}
		if (m.dragOn===false) {return;}
		m.dragOn = false;
		delete(m.dragBase);
    $(sel).find(".tilewrap").addClass("old");
		m.updateDrawData(d3.select(sel + " svg"));
    m.getTiles({
      onload: function() {
				$(sel).find(".tilewrap").not("old").css("opacity",1);
        $(sel).find(".tilewrap.old").remove();
      }
    });
	});
	$(sel + " svg").bind('mouseout', function(e) {
		if ($.contains($(sel)[0],e.relatedTarget)) {
			return;
		} else {
			m.dragOn = false;
			delete(m.dragBase);
		}
	});
	$(sel + " svg").bind('mousemove touchmove', function(e) {
    m.offset = $(sel).offset();
		if (m.dragOn===true) {
			e = e.originalEvent;
			var x = e.pageX - m.offset.left,
			y = e.pageY - m.offset.top;
			if (e.type==="touchmove") {
				x = e.touches[0].pageX - m.offset.left;
				y = e.touches[0].pageY - m.offset.top;
			}
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
  };
};
