import {ViewportMouseTracker} from "./viewport_mouse_tracker"
import {MapZoomer} from "./map_zoomer"
import {mapDragger} from "./map_dragger"
import {MapResizer} from "./map_resizer"
import {TractHover} from "./tract_hover"


function viewportEvents() {
  this.mouseTracker = new ViewportMouseTracker(this.getId())
  mapDragger(this, this.mouseTracker)
  var zoomer = new MapZoomer(this);
  var resizer = new MapResizer(this);
  var tract_hover = new TractHover(this)
  this.isZooming = function() {
    return zoomer.getLocked()
  }
}

export {viewportEvents}