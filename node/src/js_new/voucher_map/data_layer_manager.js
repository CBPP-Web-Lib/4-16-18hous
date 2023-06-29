import { dataLayerEvents } from "../ui/data_layer_events"

const DataLayerManager = function() {
  var active_data_layer, active_dots_layer, additional_dots_layers
  this.getActiveLayer = function() {
    return active_data_layer
  }
  this.getActiveDotsLayers = function() {
    if (active_dots_layer==="none") {
      return additional_dots_layers
    }
    return [active_dots_layer].concat(additional_dots_layers)
  }
  this.setActiveLayer = function(data_layer_name) {
    active_data_layer = data_layer_name
  }
  this.setActiveDotsLayer = function(dots_layer) {
    active_dots_layer = dots_layer
  }
  this.setAdditionalDotsLayers = function(dots_layers) {
    additional_dots_layers = dots_layers
  }
  this.setupEvents = dataLayerEvents.bind(this)
}

export { DataLayerManager }