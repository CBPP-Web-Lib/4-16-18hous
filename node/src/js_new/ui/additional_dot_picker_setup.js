import { data_keys } from "../voucher_map/ethnicity_data_keys"
import { dotConfig } from "../voucher_map/dot_config"

const makeDotPickerOptions = function(picker) {
  Object.keys(dotConfig).forEach((config_name)=>{
    var config = dotConfig[config_name]
    if (config.type==="voucher") {
      var option = document.createElement("option");
      option.innerText = config.name
      option.value = config_name
      picker.append(option)
    }
  })
  var none_option = document.createElement("option")
  none_option.innerText = "None"
  none_option.value = "none"
  picker.append(none_option)
}

const makeAdditionalDotsPickerOptions = function(picker) {
  Object.keys(data_keys).sort((a, b)=>{
    return data_keys[b] > data_keys[a]
  }).forEach((key)=>{
    var wrap = document.createElement("li")
    var label = document.createElement("label")
    var config = dotConfig[key + "_dots"]
    var legend_box = document.createElement("div")
    legend_box.className = "ethnicity-legend-box"
    legend_box.style.backgroundColor = config.fill
    label.textContent = data_keys[key]
    var option = document.createElement("input");
    option.type="checkbox"
    option.value = key + "_dots"
    option.innerText = data_keys[key]
    option.style.backgroundColor = config.fill
    wrap.append(option)
    wrap.append(legend_box)
    wrap.append(label)
    picker.appendChild(wrap)
  })
}

export { makeAdditionalDotsPickerOptions, makeDotPickerOptions }