import {select} from "d3"

var TileLayerManager = function() {
  
  var tileLayer;

  this.makeElement = function(map) {
    tileLayer = select(map.getTransparencyContainer()).append("div")
      .attr("class","tileLayer");
  }
  
  this.getTileLayer = function() {
    return tileLayer
  }

}

export { TileLayerManager }