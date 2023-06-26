import * as svg_create from "./svg_create"
import * as tile_layer_create from "./tile_layer_create"
import {tileCoordTracker} from "./tile_coords"
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
  this.tileCoordTracker = new tileCoordTracker(this)
  this.viewportEvents()
}

export {initialize}