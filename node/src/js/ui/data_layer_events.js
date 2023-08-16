import { makeAdditionalDotsPickerOptions, makeDotPickerOptions } from "./additional_dot_picker_setup"

const dataLayerEvents = function(map) {
  var pickers = document.querySelector("#" + map.getId() + " .pickers");
  var data_picker =  pickers.querySelector("select[name='tract-dataset']")
  data_picker.addEventListener("change", ()=>{
    this.setActiveLayer(data_picker.value)
    if (data_picker.value==="none") {
      pickers.querySelector(".picker-race-ethnicity").style.display = "block";
      pickers.querySelector(".picker-race-ethnicity").querySelectorAll("input[type='checkbox']").forEach(function(el) {
        el.checked = true;
      })
    } else {
      pickers.querySelector(".picker-race-ethnicity").style.display = "none";
      pickers.querySelector(".picker-race-ethnicity").querySelectorAll("input[type='checkbox']").forEach(function(el) {
        el.checked = false;
      })
    }
    determineAddtlDots.call(this)
    map.updateView()
  })
  this.setActiveLayer(data_picker.value)

  var dots_picker =  pickers.querySelector("select[name='dots-dataset']")
  this.setActiveDotsLayer(dots_picker.value)
  dots_picker.addEventListener("change", ()=>{
    this.setActiveDotsLayer(dots_picker.value)
    map.updateView()
  })
  makeDotPickerOptions(dots_picker)
  var addl_dots_picker = pickers.querySelector("ul[name='additional-dot-layers-checkboxes']")
  makeAdditionalDotsPickerOptions.call(map, addl_dots_picker)
  addl_dots_picker.querySelectorAll("input[type='checkbox']").forEach((el) => {
    el.addEventListener("change", ()=>{determineAddtlDots.call(this)})
  });
  pickers.querySelector("input[name='safmr']").addEventListener("change", () => {
    determineAddtlDots.call(this)
  });
  function determineAddtlDots() {
    var values = Array.from(addl_dots_picker.querySelectorAll("input:checked"),e=>e.value);
    if (document.querySelectorAll("#" + map.getId() + " .pickers input[name='safmr']")[0].checked) {
      values.push("safmr_tot_safmr_vau_dots");
    }
    this.setAdditionalDotsLayers(values)
    map.updateView()
  }

  var values = Array.from(addl_dots_picker.querySelectorAll("input:checked"),e=>e.value);
  this.setAdditionalDotsLayers(values)
}

export { dataLayerEvents }