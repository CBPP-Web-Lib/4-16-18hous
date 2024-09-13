import 'core-js/stable'
import 'regenerator-runtime/runtime'
import {VoucherMap} from "./js/voucher_map/main.js"
import {getURLBaseFromScript} from "./js/get_url_base"
import { load_typekit } from "./js/voucher_map/typekit_loader"
import { setupProjectionWorkers } from "./js/voucher_map/setup_projection_workers"
import { setupDotWorkers } from "./js/voucher_map/setup_dot_workers"
import { mode } from "./js/voucher_map/mode"
console.log(mode)
import "./app.scss"

const id = "hous4-16-18"
const script_id = "script_" + id
const url_base = getURLBaseFromScript(script_id);
const map = new VoucherMap()
const worker_manager = new (function() {
  this.getURLBase = () => {return url_base}
  this.projectionWorkers = setupProjectionWorkers(this, id)
  if (mode !== "download") {
    this.dotWorkers = setupDotWorkers(this, id)
  }
})
/*map.ready = function(cb) {
  if (map.initialized) {
    cb();
  } else {
    map.whenReady = cb;
  }
}*/
load_typekit(()=>{
  map.initialize({id, url_base}, worker_manager)
});

window.cbpp_housing_voucher_map = map