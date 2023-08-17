import { updateTileHtml } from "./update_tile_html"
import { updateShapesLayer } from "./update_shapes_layer"
import { updateDotsLayer } from "./update_dots_layer"
import { untranslateMap } from "../ui/translate_map"
import { updatePlacesLayer } from "./update_places_layer"

var performance_timer
var ignore_shapes = false
const updateMapView = function(force) {
  return new Promise((resolve)=>{

    var finish = () => {
      console.log("finish")
      updateTileHtml.call(this)
      var frame_time = Date.now() - start
      if (frame_time > 300 && !force && false) {
        this.getSvg().node().style.display="none"
        this.getCanvas().style.display="none"
        ignore_shapes = true
        var finishDraw = () => {
          clearTimeout(performance_timer)
          performance_timer = setTimeout(() => {
            
            if (this.mouseTracker.getMouseStatus()) {
              finishDraw()
              return
            }
            ignore_shapes = false
            this.projectionManager.updateProjection()
            this.updateView(true).then(()=>{
              this.getSvg().node().style.display="block"
              this.getCanvas().style.display="block"
              resolve()
            })
          }, 500)
        }
        finishDraw()
      }
      resolve()
    }

    var start = Date.now()
    if (ignore_shapes) {
      finish()
      return
    }
    if (typeof(this.cbsaManager.getTractShapefiles())==="undefined") {return;}
    updateShapesLayer.call(this).then((visible_features) => {
      untranslateMap.call(this)
      updatePlacesLayer.call(this)
      updateDotsLayer.call(this, visible_features).then(finish)
    })

    
  });

  

}

export { updateMapView }