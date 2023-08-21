import names from "../../../tmp/names.json"
import { openMap } from "../voucher_map/open_map"
import { updateLegend } from "../voucher_map/update_legend"
import { make_autocomplete } from "./make_autocomplete"

const cbsaUi = function(map)  {
  var arr = []
  Object.keys(names).forEach((geoid)=>{
    arr.push([geoid, names[geoid]])
  })
  arr.sort((a, b)=>{
    return b[1] - a[1]
  })
  var pickers = document.querySelectorAll("#" + map.getId() + " select[name='cbsa']")
  pickers.forEach((picker)=>{
    var option = document.createElement("option");
    option.disabled = "disabled"
    option.selected = "selected"
    option.value = "-1"
    picker.append(option)
    arr.forEach((item)=>{
      var option = document.createElement("option")
      option.innerText = item[1]
      option.value = item[0]
      picker.appendChild(option)
    })
    picker.addEventListener("change", ()=>{
      var cbsa = picker.value
      if (picker.classList.contains("opener")) {
        openMap(map, picker.value)
      } else {
        map.cbsaManager.loadCBSA(cbsa).then(function() {
          var cbsa_start_coords = map.coordTracker.getBoundingTilesForCBSA(cbsa)
          map.coordTracker.setCoords(cbsa_start_coords).then(function() {
            updateLegend(map)
          })
        });
      }
      pickers.forEach((_picker)=>{
        if (picker !== _picker) {
          _picker.value = picker.value
          if (_picker.hous41618_associated_autocomplete_textinput) {
            _picker.hous41618_associated_autocomplete_textinput.value = _picker.options[_picker.selectedIndex].text
          }
        }
      })
    })
    make_autocomplete(picker)
  })
}

export { cbsaUi }