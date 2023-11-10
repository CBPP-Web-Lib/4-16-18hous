import { select } from "d3"

var svg, inverted_svg, text_svg, container, old_container;

function fadeOutOldTransparencyContainer() {
  if (!old_container) {return;}
  var fading_container = old_container
  old_container = null;
  fading_container.style.opacity = 0
  setTimeout(function() {
    fading_container.parentElement.removeChild(fading_container)
  }, 300);
}

function makeElement(map) {

  if (typeof(container) !== "undefined") {
    old_container = container
  }

  container = document.createElement("div")
  container.className = "transparency-container"

  document.querySelector("#" + map.getId() + " .map-viewport").appendChild(container)

  svg = select(container).append("svg")
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
  inverted_svg = select(container).append("svg")
    .attr("class","inverted-svg")
  inverted_svg.attr("viewBox", initial_viewport)
  inverted_svg.attr("preserveAspectRatio", "xMinYMin")
  inverted_svg.append("g")
    .attr("class","shapeLayer");
  text_svg = select(container).append("svg")
    .attr("class","text-svg")
  text_svg.attr("viewBox", initial_viewport)
  text_svg.attr("preserveAspectRatio", "xMinYMin");
  text_svg.append("g")
    .attr("class","shapeLayer");
}

function getTextSvg() {
  return text_svg
}

function getInvertedSvg() {
  return inverted_svg
}

function getSvg() {
  return svg;
}

function getTransparencyContainer() {
  return container;
}

function getOldTransparencyContainer() {
  return old_container;
}

export {
  makeElement,
  getSvg,
  getInvertedSvg,
  getTextSvg,
  getTransparencyContainer,
  getOldTransparencyContainer,
  fadeOutOldTransparencyContainer
}