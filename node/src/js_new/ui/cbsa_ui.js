import names from "../../../tmp/names.json"

const cbsaUi = function(map)  {
  var arr = []
  Object.keys(names).forEach((geoid)=>{
    arr.push([geoid, names[geoid]])
  })
  arr.sort((a,b)=>{
    return b[1] > a[1]
  })
  var picker = document.querySelectorAll("#" + map.getId() + " select[name='cbsa']")[0]
  arr.forEach((item)=>{
    var option = document.createElement("option")
    option.innerText = item[1]
    option.value = item[0]
    picker.appendChild(option)
  })
  picker.addEventListener("change", ()=>{
    var cbsa = picker.value
    map.cbsaManager.loadCBSA(cbsa).then(function() {
      var cbsa_start_coords = map.coordTracker.getBoundingTilesForCBSA(cbsa)
      console.log(cbsa_start_coords)
      map.coordTracker.setCoords(cbsa_start_coords)
    });
  })
}

export { cbsaUi }