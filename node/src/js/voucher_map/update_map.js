import { updateTileHtml } from "./update_tile_html"
import { updateShapesLayer } from "./update_shapes_layer"
import { updateDotsLayer } from "./update_dots_layer"
import { untranslateMap } from "../ui/translate_map"
import { updatePlacesLayer } from "./update_places_layer"
import { displayLoadingBlocker, hideLoadingBlocker } from "../ui/loading_blocker"

var performance_timer
var ignore_shapes = false
const updateMapView = function(args) {
  return new Promise((resolve)=>{
    displayLoadingBlocker()
    var finish = () => {
      this.fadeOutOldTransparencyContainer()
      hideLoadingBlocker()
      resolve()
    }

    if (ignore_shapes) {
      updateTileHtml.call(this)
      finish()
      return
    }
    if (typeof(this.cbsaManager.getTractShapefiles())==="undefined") {
      updateTileHtml.call(this)
      finish()
      return;
    }
    updateShapesLayer.call(this).then((visible_features) => {
      untranslateMap.call(this)
      updatePlacesLayer.call(this)
      updateTileHtml.call(this)
      updateDotsLayer.call(this, visible_features, args).then(finish)
    })

    
  });

  

}

export { updateMapView }