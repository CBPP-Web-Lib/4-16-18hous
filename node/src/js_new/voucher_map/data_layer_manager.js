const DataLayerManager = function(map) {
  var active_data_layer, active_dots_layers
  this.getActiveLayer = function() {
    return active_data_layer
  }
  this.getActiveDotsLayers = function() {
    return active_dots_layers
  }
  this.setActiveLayer = function(data_layer_name) {
    active_data_layer = data_layer_name
  }
  this.setActiveDotsLayers = function(dots_layers) {
    active_dots_layers = dots_layers
  }
  this.setupEvents = function() {
    var data_picker =  document.querySelectorAll("#" + map.getId() + " .pickers select[name='tract-dataset']")[0]
    data_picker.addEventListener("change", ()=>{
      this.setActiveLayer(data_picker.value)
      map.updateView()
    })
    this.setActiveLayer(data_picker.value)

    var dots_picker =  document.querySelectorAll("#" + map.getId() + " .pickers select[name='dots-dataset']")[0]
    dots_picker.addEventListener("change", ()=>{
      var values = Array.from(dots_picker.querySelectorAll("option:checked"),e=>e.value);
      this.setActiveDotsLayers(values)
      console.log(values)
      map.updateView()
    })
    var values = Array.from(dots_picker.querySelectorAll("option:checked"),e=>e.value);
    this.setActiveDotsLayers(values)
  }
}

export { DataLayerManager }