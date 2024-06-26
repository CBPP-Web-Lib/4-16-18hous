import { makeAdditionalDotsPickerOptions, makeDotPickerOptions } from "./additional_dot_picker_setup"

const get_dots_layer = function(pickers) {
  var dots_program_picker =  pickers.querySelector("select[name='dots-program']")
  var dots_household_picker = pickers.querySelector("select[name='dots-household']")
  var active_dots_layer = dots_program_picker.value + "_" + dots_household_picker.value
  return active_dots_layer
}

const dataLayerEvents = function(map) {
  var pickers = document.querySelector("#" + map.getId() + " .pickers");
  var self = this;
  var data_picker =  pickers.querySelector("select[name='tract-dataset']")
  var picker_open_self = document.querySelector("#" + map.getId() + " .pickers-and-map-viewport .picker-open-self")
  var picker_close_self = pickers.querySelector(".picker-close-self")
  picker_open_self.style.display="none";
  picker_close_self.addEventListener("click", ()=>{
    pickers.style.display="none"
    picker_open_self.style.display="block"
  })
  picker_open_self.addEventListener("click", ()=>{
    picker_open_self.style.display = "none"
    pickers.style.display="inline-block"
  })
  var self = this;
  var race_instructions_shown = false;
  pickers.querySelector(".racial-density-instructions a").addEventListener("click", function(e) {
    e.preventDefault();
    pickers.querySelector(".racial-density-instructions").style.display = "none";
  });
  data_picker.addEventListener("change", ()=>{
    this.setActiveLayer(data_picker.value)
    if (data_picker.value==="none") {
      pickers.querySelector(".picker-race-ethnicity").style.display = "block";
      if (!race_instructions_shown) {
        race_instructions_shown = true;
        pickers.querySelector(".racial-density-instructions").style.display="block";
      }
    } else {
      pickers.querySelector(".picker-race-ethnicity").style.display = "none";
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
      if (dots_program_picker.value === "hcv") {
        pickers.querySelector(".safmr_config").style.display="block";
      } else {
        pickers.querySelector(".safmr_config").style.display="none";
        pickers.querySelector(".safmr_config input[name='safmr']").checked = false;
      }
      this.setActiveDotsLayer(get_dots_layer(pickers))
      determineAddtlDots.call(this)
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
    var values = [];
    var data_layer = data_picker.value
    if (data_layer === "none") {
      values = Array.from(addl_dots_picker.querySelectorAll("input:checked"),e=>e.value);
    }
    if (document.querySelectorAll("#" + map.getId() + " .pickers input[name='safmr']")[0].checked) {
      values.push("safmr_tot_safmr_vau_dots");
    }
    this.setAdditionalDotsLayers(values)
    map.updateView()
  }

  var values = Array.from(addl_dots_picker.querySelectorAll("input:checked"),e=>e.value);
  this.setAdditionalDotsLayers(values)
  pickers.querySelectorAll(".select-all-none a").forEach((item)=>{
    item.addEventListener("click", function(e) {
      e.preventDefault()
      if (this.attributes.href.value==="#select-all-race") {
        pickers.querySelectorAll("ul[name='additional-dot-layers-checkboxes'] input[type='checkbox']").forEach((checkbox)=>{
          checkbox.checked = true;
        })
      } else {
        pickers.querySelectorAll("ul[name='additional-dot-layers-checkboxes'] input[type='checkbox']").forEach((checkbox)=>{
          checkbox.checked = false;
        })
      }
      determineAddtlDots.call(self)
    })
  })
}

export { dataLayerEvents }