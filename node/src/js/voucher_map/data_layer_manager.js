import { dataLayerEvents } from "../ui/data_layer_events"
import { updateLegend } from "./update_legend"

const DataLayerManager = function(map) {
  var active_data_layer, active_dots_layer, additional_dots_layers
  this.getActiveLayer = function() {
    return active_data_layer
  }
  this.getActiveVoucherDotLayer = function() {
    return active_dots_layer
  }
  this.getActiveDotsLayers = function() {
    if (active_dots_layer==="none") {
      return additional_dots_layers
    }
    return [active_dots_layer].concat(additional_dots_layers)
  }
  var pendinglegendUpdate
  var updateLegendWhenDone = () => {
    clearImmediate(pendinglegendUpdate)
    pendinglegendUpdate = setImmediate(()=>{
      updateLegend.call(this, map)
    })
  }
  this.setActiveLayer = (data_layer_name) => {
    active_data_layer = data_layer_name
    updateLegendWhenDone()
  }
  this.setActiveDotsLayer = (dots_layer) => {
    active_dots_layer = dots_layer
    updateLegendWhenDone()
  }
  this.setAdditionalDotsLayers = (dots_layers) => {
    additional_dots_layers = dots_layers
    updateLegendWhenDone()
  }
  this.setupEvents = dataLayerEvents.bind(this)
}

export { DataLayerManager }