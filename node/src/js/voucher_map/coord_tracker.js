import { getBoundingTilesForCBSA, getBoundingTilesForBbox } from "./get_bounding_tiles_for_cbsa"
//import { tileCoordToLatLong } from "./projection_manager"


const CoordTracker = function(map) {
  var z, x, y, viewportWidth, viewportHeight;
  var in_progress = false

  function setCoords(coords, args) {
    return new Promise((resolve)=>{
      if (in_progress) {
        resolve(false)
        return
      }
      in_progress = true
      z = coords.z
      x = coords.x
      y = coords.y
      console.log(coords)
      viewportWidth = this.getMap().getViewportWidth()
      viewportHeight = this.getMap().getViewportHeight()
      this.getMap().projectionManager.updateProjection().then(() => {
        window.requestAnimationFrame(()=>{
          this.getMap().updateView(args).then(function(result) {
            in_progress = false
            resolve(true);
          })
        })
      })
    }) 
  }

  function getCoords() {
    return {z, x, y}
  }

  function signalViewportResize() {
    var map = this.getMap()
    viewportWidth = map.getViewportWidth()
    viewportHeight = map.getViewportHeight()
  }

  this.getMap = function() {
    return map
  }
  this.getCoords = getCoords.bind(this)
  this.setCoords = setCoords.bind(this)
  this.coordChangeInProgress = function() {
    return in_progress
  }
  this.signalViewportResize = signalViewportResize.bind(this)
  this.getBoundingTilesForCBSA = getBoundingTilesForCBSA.bind(this)
  this.getBoundingTilesForBbox = getBoundingTilesForBbox.bind(this)
}

export {
  CoordTracker
}