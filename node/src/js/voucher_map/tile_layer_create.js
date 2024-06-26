import {select} from "d3"

var tileLayer;

function makeElement(map) {
  tileLayer = select(map.getTransparencyContainer()).append("div")
    .attr("class","tileLayer");
}

function getTileLayer() {
  return tileLayer
}

export {
  makeElement,
  getTileLayer
}