import { updateTileHtml } from "./update_tile_html"
import { updateShapesLayer } from "./update_shapes_layer"
import { updateDotsLayer } from "./update_dots_layer"

const updateMapView = function() {
  return new Promise((resolve)=>{
    updateShapesLayer.call(this).then((visible_features) => {
      updateDotsLayer.call(this, visible_features)
      updateTileHtml.call(this)
      resolve()
    })
  });

}

export { updateMapView }