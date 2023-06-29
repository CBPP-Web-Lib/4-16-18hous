import { makeAdditionalDotsPickerOptions } from "./additional_dot_picker_setup"

const dataLayerEvents = function(map) {
  var data_picker =  document.querySelectorAll("#" + map.getId() + " .pickers select[name='tract-dataset']")[0]
  data_picker.addEventListener("change", ()=>{
    this.setActiveLayer(data_picker.value)
    map.updateView()
  })
  this.setActiveLayer(data_picker.value)

  var dots_picker =  document.querySelectorAll("#" + map.getId() + " .pickers select[name='dots-dataset']")[0]
  this.setActiveDotsLayer(dots_picker.value)
  dots_picker.addEventListener("change", ()=>{
    this.setActiveDotsLayer(dots_picker.value)
    map.updateView()
  })
  var addl_dots_picker = document.querySelectorAll("#" + map.getId() + " .pickers select[name='additional-dot-layers']")[0]
  makeAdditionalDotsPickerOptions(addl_dots_picker)
  addl_dots_picker.addEventListener("change", ()=>{
    var values = Array.from(addl_dots_picker.querySelectorAll("option:checked"),e=>e.value);
    this.setAdditionalDotsLayers(values)
    console.log(values)
    map.updateView()
  })
  var values = Array.from(addl_dots_picker.querySelectorAll("option:checked"),e=>e.value);
  this.setAdditionalDotsLayers(values)
}

export { dataLayerEvents }