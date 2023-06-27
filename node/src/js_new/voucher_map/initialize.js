import * as svg_create from "./svg_create"
import * as tile_layer_create from "./tile_layer_create"
import { CoordTracker } from "./coord_tracker"
import { CBSAManager } from "./cbsa_manager";
import { updateMapView } from "./update_map"
import { ProjectionManager } from "./projection_manager"
import { DataLayerManager } from "./data_layer_manager"

var id, url_base;

const dom = require("../../dom_new.html").default
const initialize = function(config) {
  id = config.id
  url_base = config.url_base
  this.getId = function() {
    return id
  }
  this.getURLBase = function() {
    return url_base
  }
  document.getElementById(id).innerHTML = dom
  tile_layer_create.makeElement(this)
  svg_create.makeElement(this)
  this.getSvg = svg_create.getSvg
  this.getTileLayer = tile_layer_create.getTileLayer
  this.coordTracker = new CoordTracker(this)
  this.cbsaManager = new CBSAManager(this);
  this.updateView = updateMapView.bind(this)
  this.projectionManager = new ProjectionManager(this)
  this.dataLayerManager = new DataLayerManager(this)
  this.viewportEvents()
  this.dataLayerManager.setupEvents()
}

export { initialize }