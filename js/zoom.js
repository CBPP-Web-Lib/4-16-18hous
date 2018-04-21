module.exports = function(sel, obj, $, d3) {
  var m = obj;
  var fixViewport = require("./fixviewport.js");
  var zoomCallbacks = [];
  m.onZoom = function(cb) {
    zoomCallbacks.push(cb);
  };
  m.zoom = function(x,y,direction,amount) {
    var svg = d3.select(sel).select("svg");
    var width = $(sel).width();
    var height = $(sel).height();
    if (!obj.options) {
      obj.options = {};
    }
    var options = obj.options;
    var viewport = svg.attr("viewBox").split(" ");
    viewport = fixViewport(viewport, obj.options);
    for (var i = 0, ii = viewport.length; i<ii; i++) {
      viewport[i]*=1;
    }
    if (x==="center") {
      x = width/2;
    }
    if (y === "center") {
      y = height/2;
    }
    var xViewportDelta = viewport[2]*0.15*(amount)/120;
    var yViewportDelta = viewport[3]*0.15*(amount)/120;
    var x1 = x - x*(width - xViewportDelta)/width;
    var y1 = y - y*(height - yViewportDelta)/height;
    viewport[0] += x1;
    viewport[2] -= (xViewportDelta);
    viewport[1] += y1;
    viewport[3] -= (yViewportDelta);
    if (viewport[3] < 1) {
      viewport[3] = 1;
    }
    if (viewport[2] < 1) {
      viewport[2] = 1;
    }
    fixViewport(viewport, options);
    viewport = viewport.join(" ");
    svg.attr("viewBox", viewport);
    for (i =0, ii = zoomCallbacks.length; i<ii; i++) {
      if (typeof(zoomCallbacks[i])==="function") {
        zoomCallbacks[i]();
      }
    }
  };
  m.zoomIn = function(x, y, amount) {
    m.zoom(x,y,"in", amount);
  };
  m.zoomOut = function(x, y, amount) {
    m.zoom(x,y,"out", amount);
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
    if (amount > 0) {
      m.zoomIn(x, y, amount);
    }
    else {
      m.zoomOut(x, y, amount);
    }
    return false;
  });
};
