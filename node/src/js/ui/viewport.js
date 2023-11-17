import { ViewportMouseTracker } from "./viewport_mouse_tracker"
import { MapZoomer } from "./map_zoomer"
import { mapDragger } from "./map_dragger"
import { mapResizer } from "./map_resizer"
import { tractHover } from "./tract_hover"

function viewportEvents() {
  this.mouseTracker = new ViewportMouseTracker(this)
  mapDragger.call(this)
  var zoomer = new MapZoomer(this);
  this.isZooming = function() {
    return zoomer.getLocked()
  }
  this.zoomer = zoomer
  mapResizer.call(this)
  tractHover.call(this)
}

export { viewportEvents }