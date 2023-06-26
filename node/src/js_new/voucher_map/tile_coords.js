import {updateTileHtml} from "./update_tile_html"

var z, x, y, viewportWidth, viewportHeight;

function setTileCoords(coords) {
  z = coords.z
  x = coords.x
  y = coords.y
  this.updateTileHtml()
}

function getTileCoords() {
  return {z, x, y}
}

function signalViewportResize() {
  var map = this.getMap()
  console.log(map)
  viewportWidth = map.getViewportWidth()
  viewportHeight = map.getViewportHeight()
}

const tileCoordTracker = function(map) {
  this.getMap = function() {
    return map
  }
  this.getTileCoords = getTileCoords.bind(this)
  this.setTileCoords = setTileCoords.bind(this)
  this.updateTileHtml = updateTileHtml.bind(this)
  this.signalViewportResize = signalViewportResize.bind(this)
}

export {
  tileCoordTracker
}