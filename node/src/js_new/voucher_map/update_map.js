import { updateTileHtml } from "./update_tile_html"
import { updateShapesLayer } from "./update_shapes_layer"

const updateMapView = function() {
  updateTileHtml.call(this)
  updateShapesLayer.call(this)

}

export { updateMapView }