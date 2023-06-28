import { select } from "d3"

var svg;

function makeElement(map) {
  svg = select("#" + map.getId() + " .map-viewport").append("svg")
  svg.attr("viewBox", [
    0,
    0,
    map.getViewportWidth(),
    map.getViewportHeight()
  ].join(" "))
  svg.attr("preserveAspectRatio", "xMinYMin")
  var defs = svg.append("defs")
  defs.append("filter")
    .attr("id","blur")
    .append("feGaussianBlur")
    .attr("in","SourceGraphic")
    .attr("stdDeviation", 3);
  svg.append("g")
    .attr("class","shapeLayer");
  svg.append("g")
    .attr("class","dotsLayer");
}

function getSvg() {
  return svg;
}

export {
  makeElement,
  getSvg
}