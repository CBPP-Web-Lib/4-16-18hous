import { select } from "d3"

var svg, inverted_svg;

function makeElement(map) {
  svg = select("#" + map.getId() + " .map-viewport").append("svg")
    .attr("class","main-svg")
  var initial_viewport = [
    0,
    0,
    map.getViewportWidth(),
    map.getViewportHeight()
  ].join(" ")
  svg.attr("viewBox", initial_viewport)
  svg.attr("preserveAspectRatio", "xMinYMin")
  var defs = svg.append("defs")
  defs.append("filter")
    .attr("id","blur")
    .append("feGaussianBlur")
    .attr("in","SourceGraphic")
    .attr("stdDeviation", 3);
  svg.append("g")
    .attr("class","shapeLayer");
  inverted_svg = select("#" + map.getId() + " .map-viewport").append("svg")
    .attr("class","inverted-svg")
  inverted_svg.attr("viewBox", initial_viewport)
  inverted_svg.attr("preserveAspectRatio", "xMinYMin")
  inverted_svg.append("g")
    .attr("class","shapeLayer");
}

function getInvertedSvg() {
  return inverted_svg
}

function getSvg() {
  return svg;
}

export {
  makeElement,
  getSvg,
  getInvertedSvg
}