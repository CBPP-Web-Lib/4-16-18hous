import { getBoundingTilesForCBSA, getBoundingTilesForBbox } from "./get_bounding_tiles_for_cbsa"
//import { tileCoordToLatLong } from "./projection_manager"


const CoordTracker = function(map) {
  var z, x, y, viewportWidth, viewportHeight;
  var in_progress = false

  this.resizeHooks = {};
  this.postResizeHooks = {};
  this.registerResizeHook = function(name, priority, fn) {
    this.resizeHooks[name] = {fn, priority}
  }
  this.registerPostResizeHook = function(name, priority, fn) {
    this.postResizeHooks[name] = {fn, priority}
  }


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

  this.overrideCoords = function(coords) {
    z = coords.z
    x = coords.x
    y = coords.y
  }

  function getCoords() {
    return {z, x, y}
  }

  this.doHooks = function(hooks) {
    var handlers = [];
    Object.keys(hooks).forEach((hookName) => {
      var hook = hooks[hookName];
      handlers.push({fn: hook.fn, priority: hook.priority})
    })
    handlers.sort((a, b) => {
      return a.priority - b.priority;
    })
    handlers.forEach((handler) => {
      handler.fn({map, viewportHeight, viewportWidth})
    })
  }

  function signalViewportResize() {
    var map = this.getMap()
    viewportWidth = map.getViewportWidth()
    viewportHeight = map.getViewportHeight()
    this.doHooks(this.resizeHooks);
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