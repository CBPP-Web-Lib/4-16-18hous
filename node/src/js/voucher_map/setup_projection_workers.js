
var WorkerWrapper = function(url_base) {
  var the_worker = new Worker(url_base + "/js/worker_project.js")
  this.busy = false
  this.postMessage = (e) => {
    if (e.msgType === "requestPathString") {
      this.busy = true;
    }
    the_worker.postMessage(e)
  }
  the_worker.onmessage = (e) => {
    if (e.data.msgType === "requestPathString") {
      if (this.pathStringCallback) {
        this.pathStringCallback(e.data.pathStrings)
        this.busy = false
      }
    }
    if (e.data.msgType === "newProjection") {
      if (this.newProjectionCallback) {
        this.newProjectionCallback(e.data.result)
      }
    }
    if (e.data.msgType === "requestDotProjection") {
      if (this.dotProjectionCallback) {
        this.dotProjectionCallback(e.data.result)
      }
    }
  }
}

function setupProjectionWorkers(map) {
  var numWorkers = 1
  if (navigator.hardwareConcurrency) {
    numWorkers = Math.max(1, navigator.hardwareConcurrency - 1)
  }
  //numWorkers = 1
  var url_base = map.getURLBase()
  var workers = []
  for (var i = 0; i < numWorkers; i++) {
    workers.push(new WorkerWrapper(url_base))
  }
  return workers
}

export { setupProjectionWorkers }