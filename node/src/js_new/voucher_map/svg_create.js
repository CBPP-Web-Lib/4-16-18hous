import {select} from "d3"

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
}

function getSvg() {
  return svg;
}

export {
  makeElement,
  getSvg
}