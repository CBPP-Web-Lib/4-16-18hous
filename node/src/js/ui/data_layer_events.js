import { makeAdditionalDotsPickerOptions, makeDotPickerOptions } from "./additional_dot_picker_setup"

const get_dots_layer = function(pickers) {
  var dots_program_picker =  pickers.querySelector("select[name='dots-program']")
  var dots_household_picker = pickers.querySelector("select[name='dots-household']")
  var active_dots_layer = dots_program_picker.value + "_" + dots_household_picker.value
  return active_dots_layer
}

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
  this.setActiveDotsLayer(get_dots_layer(pickers))
  var dots_program_picker =  pickers.querySelector("select[name='dots-program']")
  var dots_household_picker = pickers.querySelector("select[name='dots-household']")
  var dots_pickers = [dots_program_picker, dots_household_picker]
  dots_pickers.forEach((picker)=> {
    picker.addEventListener("change", ()=>{
      this.setActiveDotsLayer(get_dots_layer(pickers))
      map.updateView()
    })
  })
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