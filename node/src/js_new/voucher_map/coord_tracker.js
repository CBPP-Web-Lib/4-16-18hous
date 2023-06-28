var z, x, y, viewportWidth, viewportHeight;
var in_progress = false

function setCoords(coords) {
  return new Promise((resolve)=>{
    if (in_progress) {
      resolve(false)
      return
    }
    in_progress = true
    z = coords.z
    x = coords.x
    y = coords.y
    this.getMap().projectionManager.updateProjection().then(() => {
      window.requestAnimationFrame(()=>{
        this.getMap().updateView().then(function() {
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

const CoordTracker = function(map) {
  this.getMap = function() {
    return map
  }
  this.getCoords = getCoords.bind(this)
  this.setCoords = setCoords.bind(this)
  this.signalViewportResize = signalViewportResize.bind(this)
}

export {
  CoordTracker
}