
var WorkerWrapper = function(url_base) {
  var the_worker;
  this.setup = function(worker_script_js) {
    return new Promise((resolve, reject) => {
      var blob = new Blob([worker_script_js], { type: 'application/javascript' });
      var url = URL.createObjectURL(blob);
      the_worker = new Worker(url);
      var finish = () => {
        this.busy = false
        this.newProjectionCallback = {}
        this.dotProjectionCallback = {}
        this.pathStringCallback = {}
        this.postMessage = (e) => { 
          if (e.msgType === "requestPathString") {
            this.busy = true;
          }
          the_worker.postMessage(e)
        }
        the_worker.onmessage = (e) => {
          var id = e.data.id;
          if (e.data.msgType === "requestPathString") {
            if (this.pathStringCallback[id]) {
              this.pathStringCallback[id](e.data.pathStrings)
              this.busy = false
            }
          }
          if (e.data.msgType === "newProjection") {
            if (this.newProjectionCallback) {
              this.newProjectionCallback[id](e.data.result)
            }
          }
          if (e.data.msgType === "requestDotProjection") {
            if (this.dotProjectionCallback) {
              this.dotProjectionCallback[id](e.data.result)
            }
          }
        } 
        resolve();
      }
      finish();
    })
  }
}

function setupProjectionWorkers(mgr, worker_script_js) {
  return new Promise((resolve, reject) => {
    var numWorkers = 1
    if (navigator.hardwareConcurrency) {
      numWorkers = Math.max(1, navigator.hardwareConcurrency - 1)
    }
    //numWorkers = 1
    var url_base = mgr.getURLBase()
    var workers = []
    var this_wrapper;
    var setupPromises = [];
    for (var i = 0; i < numWorkers; i++) {
      var this_wrapper = new WorkerWrapper(url_base);
      workers.push(this_wrapper)
      setupPromises.push(this_wrapper.setup(worker_script_js))
    }
    mgr.projectionWorkers = workers;
    Promise.all(setupPromises).then(resolve);
  })
}

export { setupProjectionWorkers }