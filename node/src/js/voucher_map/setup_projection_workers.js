
var WorkerWrapper = function(url_base) {
  var the_worker;
  this.setup = function() {
    return new Promise((resolve, reject) => {
      var script = new XMLHttpRequest();
      script.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          var blob = new Blob([script.response], { type: 'application/javascript' });
          var url = URL.createObjectURL(blob);
          the_worker = new Worker(url);
          finish();
        }
      }
      script.open("GET", url_base + "/js/worker_project.js", true);
      script.send();
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
    })
  }
}

function setupProjectionWorkers(mgr) {
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
      setupPromises.push(this_wrapper.setup())
    }
    mgr.projectionWorkers = workers;
    Promise.all(setupPromises).then(resolve);
  })
}

export { setupProjectionWorkers }