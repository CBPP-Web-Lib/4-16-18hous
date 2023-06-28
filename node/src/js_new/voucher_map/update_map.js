import { updateTileHtml } from "./update_tile_html"
import { updateShapesLayer } from "./update_shapes_layer"

const updateMapView = function() {
  return new Promise((resolve)=>{
    updateShapesLayer.call(this).then(() => {
      updateTileHtml.call(this)
      resolve()
    })
  });

}

export { updateMapView }