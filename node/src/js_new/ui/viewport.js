import {ViewportMouseTracker} from "./viewport_mouse_tracker"
import {MapZoomer} from "./map_zoomer"
import {mapDragger} from "./map_dragger"
import {MapResizer} from "./map_resizer"


function viewportEvents() {
  this.mouseTracker = new ViewportMouseTracker(this.getId())
  mapDragger(this, this.mouseTracker)
  var zoomer = new MapZoomer(this);
  var resizer = new MapResizer(this);
  this.isZooming = function() {
    return zoomer.getLocked()
  }
}

export {viewportEvents}