import { data_keys } from "../voucher_map/ethnicity_data_keys"

const makeAdditionalDotsPickerOptions = function(picker) {
  Object.keys(data_keys).sort((a, b)=>{
    return data_keys[b] > data_keys[a]
  }).forEach((key)=>{
    var option = document.createElement("option");
    option.value = key + "_dots"
    option.innerText = data_keys[key]
    picker.appendChild(option)
  })
}

export { makeAdditionalDotsPickerOptions }