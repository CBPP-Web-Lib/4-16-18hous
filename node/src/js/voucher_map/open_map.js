
import { updateLegend } from "./update_legend"

const openMap = (map, value, custom_coords)=> {
  document.body.classList.add("no-scroll")
  document.querySelectorAll("#" + map.getId() + " .map-outer-lightbox")[0]
    .style.visibility = "visible"
  return map.cbsaManager.loadCBSA(value).then(() => {
    if (custom_coords) {
      var coords = custom_coords
    } else {
      var coords = map.coordTracker.getBoundingTilesForCBSA(value)
    }
    map.coordTracker.setCoords(coords)
    updateLegend(map)
  });
}

export { openMap }