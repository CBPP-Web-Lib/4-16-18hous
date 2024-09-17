import { SVG_Manager } from "./svg_create"
import {TileLayerManager}from "./tile_layer_create"
import { DotCanvasManager } from "./dot_canvas_create"
//import * as dot_canvas_create from "./dot_canvas_create"

import { CoordTracker } from "./coord_tracker"
import { CBSAManager } from "./cbsa_manager";
import { updateMapView } from "./update_map"
import { ProjectionManager } from "./projection_manager"
import { DataLayerManager } from "./data_layer_manager"
import { setupLightbox } from "../ui/setup_lightbox"
import dom from "../../dom.html"
import { handleUrlHash } from "../ui/handle_url_hash"
import { mode } from "./mode"
import { v4 as uuidv4 } from 'uuid';

//var id, url_base;

const initialize = function(config, workerManager) {
  var id = config.id
  var url_base = config.url_base
  this.switchId = function(_id) {
    id = _id
    document.getElementById(id).innerHTML = dom
    this.remakeTransparencyElement()
  }
  this.getId = function() {
    return id
  }
  this.getURLBase = function() {
    return url_base
  }
  if (config.disable_lightbox !== true) {
    setupLightbox.call(this, dom)
  } else {
    document.getElementById(id).innerHTML = dom
  }
  //svg_create.makeElement(this)
  var svg_create = new SVG_Manager();
  var dot_canvas_create = new DotCanvasManager();
  var tile_layer_create = new TileLayerManager();
  this.getSvg = svg_create.getSvg
  this.getInvertedSvg = svg_create.getInvertedSvg
  this.getTextSvg = svg_create.getTextSvg
  this.getTransparencyContainer = svg_create.getTransparencyContainer
  this.getOldTransparencyContainer = svg_create.getOldTransparencyContainer
  this.fadeOutOldTransparencyContainer = svg_create.fadeOutOldTransparencyContainer
  this.remakeCanvas = function() {
    dot_canvas_create.makeElement(this)
  }
  this.destroyOldCanvas = function(delete_current) {
    dot_canvas_create.deleteExistingCanvas(this, delete_current)
  }
  this.remakeTransparencyElement = () => {
    svg_create.makeElement(this)
    tile_layer_create.makeElement(this)
    svg_create.getInvertedSvg().raise()
    svg_create.getTextSvg().raise()
  }
  //dot_canvas_create.makeElement(this)
 // tile_layer_create.makeElement(this)
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
  this.projectionWorkers = workerManager.projectionWorkers;
  if (mode !== "download") {
    this.dotWorkers = workerManager.dotWorkers;
  }
  var custom_config;
  if (config.no_url_hash !== true) {
    custom_config = handleUrlHash(this);
  }
  this.noUrlHash = () => {return config.no_url_hash;}
  if (!custom_config) {
    this.dataLayerManager.setActiveDotsLayer("hcv_total")
  }
  this.uniqid = uuidv4();
  this.static = config.static;
  this.initialized = true;


}

export { initialize }