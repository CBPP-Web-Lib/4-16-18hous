
var WorkerWrapper = function(url_base) {
    var the_worker = new Worker(url_base + "/js/worker_dot.js")
    this.busy = false
    this.postMessage = (e) => {
      if (e.msgType === "requestDotLocations") {
        this.busy = true;
      }
      the_worker.postMessage(e)
    }
    the_worker.onmessage = (e) => {
      if (e.data.msgType === "requestDotLocations") {
        if (this.dotLocationCallback) {
          this.dotLocationCallback(e.data.dotLocations)
          this.busy = false
        }
      }
      if (e.data.msgType === "newProjection") {
        if (this.newProjectionCallback) {
          this.newProjectionCallback(e.data.result)
        }
      }
      if (e.data.msgType === "newWater") {
        if (this.newWaterCallback) {
          this.newWaterCallback(e.data.result)
        }
      }
    }
  }
  
  function setupDotWorkers(map) {
    var numWorkers = 1
    if (navigator.hardwareConcurrency) {
      numWorkers = Math.max(1, navigator.hardwareConcurrency - 1)
    }
    numWorkers = Math.min(4, numWorkers)
    var url_base = map.getURLBase()
    var workers = []
    for (var i = 0; i < numWorkers; i++) {
      workers.push(new WorkerWrapper(url_base))
    }
    return workers
  }
  
  export { setupDotWorkers }