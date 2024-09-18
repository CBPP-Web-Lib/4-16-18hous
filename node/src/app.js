import 'core-js/stable'
import 'regenerator-runtime/runtime'
import {VoucherMap} from "./js/voucher_map/main.js"
import {getURLBaseFromScript} from "./js/get_url_base"
import { load_typekit } from "./js/voucher_map/typekit_loader"
import { setupProjectionWorkers } from "./js/voucher_map/setup_projection_workers"
import { setupDotWorkers } from "./js/voucher_map/setup_dot_workers"
import { mode } from "./js/voucher_map/mode"
import "./app.scss"

const id = "hous4-16-18"
const script_id = "script_" + id
const url_base = getURLBaseFromScript(script_id);
const map = new VoucherMap()
const WorkerManager = function() {
  var mgr = this;
  this.getURLBase = () => {return url_base}
  this.setup = function() {
    return new Promise((resolve, reject) => {
      var script = new XMLHttpRequest();
      script.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          setupProjectionWorkers(mgr, script.response).then(resolve);
        }
      }
      script.open("GET", url_base + "/js/worker_project.js", true);
      script.send();
    })
  }
  if (mode !== "download") {
    this.dotWorkers = setupDotWorkers(this, id)
  }
}
const worker_manager = new WorkerManager();
Promise.all([
  worker_manager.setup(),
  load_typekit()
]).then(() => {
  map.initialize({id, url_base}, worker_manager)
})
/*map.ready = function(cb) {
  if (map.initialized) {
    cb();
  } else {
    map.whenReady = cb;
  }
}*/

window.cbpp_housing_voucher_map = map