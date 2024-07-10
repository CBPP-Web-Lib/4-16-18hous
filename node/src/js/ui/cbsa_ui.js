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
      option.innerText = filter_cbsa_name(item[1])
      option.value = item[0]
      picker.appendChild(option)
    })
    picker.addEventListener("change", function() {
      var cbsa_text = this.options[this.selectedIndex].innerText
      return new Promise((resolve, reject) => {
        var cbsa = picker.value
          if (picker.classList.contains("opener")) {
          openMap(map, picker.value).then(resolve)
        } else {
          map.cbsaManager.loadCBSA(cbsa).then(function() {
            var cbsa_start_coords = map.coordTracker.getBoundingTilesForCBSA(cbsa)
            map.coordTracker.setCoords(cbsa_start_coords).then(function() {
              updateLegend(map);
              resolve();
            })
          });
        }
      }).then(function() {
        pickers.forEach((_picker)=>{
          if (picker !== _picker) {
            _picker.value = picker.value
            if (_picker.hous41618_associated_autocomplete_textinput) {
              _picker.hous41618_associated_autocomplete_textinput.value = cbsa_text
            }
          }
        })

      })
      
    })
    make_autocomplete(picker)
  })
}

function filter_cbsa_name(name) {
  if (name === "Urban Honolulu, HI") {
    name = "Honolulu, HI";
  }
  return name;
}

export { cbsaUi }