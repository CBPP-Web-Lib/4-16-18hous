import { select } from "d3"

var SVG_Manager = function() {
  var svg, inverted_svg, text_svg, container, old_container;

  this.fadeOutOldTransparencyContainer = function() {
    if (!old_container) {return;}
    var fading_container = old_container
    old_container = null;
    fading_container.style.opacity = 0
    setTimeout(function() {
      fading_container.parentElement.removeChild(fading_container)
    }, 300);
  }
  
  this.makeElement = function(map) {
  
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
  
  this.getTextSvg = function() {
    return text_svg
  }
  
  this.getInvertedSvg = function() {
    return inverted_svg
  }
  
  this.getSvg = function() {
    return svg;
  }
  
  this.getTransparencyContainer = function() {
    return container;
  }
  
  this.getOldTransparencyContainer = function() {
    return old_container;
  }
}



export { SVG_Manager } /*
  makeElement,
  getSvg,
  getInvertedSvg,
  getTextSvg,
  getTransparencyContainer,
  getOldTransparencyContainer,
  fadeOutOldTransparencyContainer
}*/