var z, x, y, viewportWidth, viewportHeight;

function setCoords(coords) {
  return new Promise((resolve)=>{
    z = coords.z
    x = coords.x
    y = coords.y
    this.getMap().projectionManager.updateProjection()
    window.requestAnimationFrame(()=>{
      this.getMap().updateView()
      resolve()
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