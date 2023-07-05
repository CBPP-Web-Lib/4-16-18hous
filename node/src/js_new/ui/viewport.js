import {ViewportMouseTracker} from "./viewport_mouse_tracker"
import {MapZoomer} from "./map_zoomer"
import {mapDragger} from "./map_dragger"
import {MapResizer} from "./map_resizer"
import {TractHover} from "./tract_hover"
import {openMap} from "../voucher_map/open_map"

function viewportEvents() {
  this.mouseTracker = new ViewportMouseTracker(this.getId())
  mapDragger(this, this.mouseTracker)
  var zoomer = new MapZoomer(this, this.mouseTracker);
  var resizer = new MapResizer(this);
  var tract_hover = new TractHover(this)
  this.isZooming = function() {
    return zoomer.getLocked()
  }
  /*
  document.querySelectorAll("#" + this.getId() + " a[href='#open']")[0]
    .addEventListener("click", (e)=>{
      e.preventDefault()
      openMap(this) 
    });*/
}

export {viewportEvents}