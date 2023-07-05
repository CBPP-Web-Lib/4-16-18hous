import * as svg_create from "./svg_create"
import * as tile_layer_create from "./tile_layer_create"
import * as dot_canvas_create from "./dot_canvas_create"

import { CoordTracker } from "./coord_tracker"
import { CBSAManager } from "./cbsa_manager";
import { updateMapView } from "./update_map"
import { ProjectionManager } from "./projection_manager"
import { DataLayerManager } from "./data_layer_manager"
import { setupProjectionWorkers } from "./setup_projection_workers"
import { closeMap } from "./close_map"
var id, url_base;

const dom = require("../../dom_new.html").default
const initialize = function(config) {
  console.log("initialize")
  id = config.id
  url_base = config.url_base
  this.getId = function() {
    return id
  }
  this.getURLBase = function() {
    return url_base
  }
  const lightboxEl = document.createElement("div")
  lightboxEl.className = "map-outer-lightbox"
  const lightboxInner = document.createElement("div")
  lightboxInner.className = "map-inner-lightbox"
  document.getElementById(id).appendChild(lightboxEl)
  lightboxEl.appendChild(lightboxInner)
  lightboxInner.innerHTML = dom
  const closeBox = document.createElement("div");
  closeBox.className= "map-close-lightbox"
  closeBox.innerHTML = "<span>&#10006;</span>"
  closeBox.addEventListener("click", ()=>{
    closeMap(this)
  })
  lightboxEl.append(closeBox)
  tile_layer_create.makeElement(this)
  svg_create.makeElement(this)
  dot_canvas_create.makeElement(this)
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
  this.dataLayerManager.setActiveDotsLayer("hcv_total")
}

export { initialize }