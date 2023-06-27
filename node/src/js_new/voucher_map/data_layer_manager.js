const DataLayerManager = function(map) {
  var active_data_layer
  this.getActiveLayer = function() {
    return active_data_layer
  }
  this.setActiveLayer = function(data_layer_name) {
    active_data_layer = data_layer_name
  }
  this.setupEvents = function() {
    var picker =  document.querySelectorAll("#" + map.getId() + " .pickers select[name='tract-dataset']")[0]
    picker.addEventListener("change", (d)=>{
      active_data_layer = picker.value
      map.updateView()
    })
    active_data_layer = picker.value
  }
}

export { DataLayerManager }