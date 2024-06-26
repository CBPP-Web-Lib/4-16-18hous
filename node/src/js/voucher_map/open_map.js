
import { updateLegend } from "./update_legend"

const openMap = (map, value)=> {
  document.body.classList.add("no-scroll")
  document.querySelectorAll("#" + map.getId() + " .map-outer-lightbox")[0]
    .style.visibility = "visible"
  return map.cbsaManager.loadCBSA(value).then(() => {
    var cbsa_start_coords = map.coordTracker.getBoundingTilesForCBSA(value)
    map.coordTracker.setCoords(cbsa_start_coords)
    updateLegend(map)
  });
}

export { openMap }