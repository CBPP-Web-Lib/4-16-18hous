import * as svg_create from "./svg_create"
import * as tile_layer_create from "./tile_layer_create"
import * as dot_canvas_create from "./dot_canvas_create"

import { CoordTracker } from "./coord_tracker"
import { CBSAManager } from "./cbsa_manager";
import { updateMapView } from "./update_map"
import { ProjectionManager } from "./projection_manager"
import { DataLayerManager } from "./data_layer_manager"
import { setupProjectionWorkers } from "./setup_projection_workers"
import { setupDotWorkers } from "./setup_dot_workers"
import { setupLightbox } from "../ui/setup_lightbox"
import dom from "../../dom.html"

var id, url_base;

const initialize = function(config) {
  id = config.id
  url_base = config.url_base
  this.getId = function() {
    return id
  }
  this.getURLBase = function() {
    return url_base
  }
  setupLightbox.call(this, dom)
  svg_create.makeElement(this)
  dot_canvas_create.makeElement(this)
  tile_layer_create.makeElement(this)
  svg_create.getInvertedSvg().raise()
  this.getSvg = svg_create.getSvg
  this.getInvertedSvg = svg_create.getInvertedSvg
  this.getCanvasContext = dot_canvas_create.getCanvasContext
  this.getCanvas = dot_canvas_create.getCanvas
  this.getTileLayer = tile_layer_create.getTileLayer
  this.coordTracker = new CoordTracker(this)
  this.cbsaManager = new CBSAManager(this);
  this.updateView = updateMapView.bind(this)
  this.projectionManager = new ProjectionManager(this)
  this.dataLayerManager = new DataLayerManager(this)
  this.viewportEvents()
  this.dataLayerManager.setupEvents(this)
  this.cbsaManager.setupEvents()
  this.projectionWorkers = setupProjectionWorkers(this)
  this.dotWorkers = setupDotWorkers(this)
  this.dataLayerManager.setActiveDotsLayer("hcv_total")
}

export { initialize }