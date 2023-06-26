import {ViewportMouseTracker} from "./viewport_mouse_tracker"
import {MapZoomer} from "./map_zoomer"
import {mapDragger} from "./map_dragger"


function viewportEvents() {
  this.mouseTracker = new ViewportMouseTracker(this.getId())
  mapDragger(this, this.mouseTracker)
  var zoomer = new MapZoomer(this);
}

export {viewportEvents}