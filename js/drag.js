module.exports = function(sel, m, $, d3) {
  var fixViewport = require("./fixviewport.js");
	$(sel + " svg").bind('mousedown touchstart', function(e) {
		m.dragOn = true;
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
		return false;
	});
	$(sel + " svg").bind("mouseup touchend", function(e) {
		m.dragOn = false;
		delete(m.dragBase);
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
    viewport = fixViewport(viewport, m.options);
    var dX = x - m.dragBase[0];
    var dY = y - m.dragBase[1];
    viewport[0] = viewport[0]*1 - dX/width*viewport[2];
    viewport[1] = viewport[1]*1 - dY/height*viewport[3];
    m.dragBase = [x,y];
    viewport = fixViewport(viewport, m.options);
    viewport = viewport.join(" ");
    svg.attr("viewBox", viewport);
  };
};
