import 'core-js/stable'
import 'regenerator-runtime/runtime'
import {VoucherMap} from "./js/voucher_map/main.js"
import {getURLBaseFromScript} from "./js/get_url_base"
import { load_typekit } from "./js/voucher_map/typekit_loader"
import "./app.scss"

const id = "hous4-16-18"
const script_id = "script_" + id
const url_base = getURLBaseFromScript(script_id);
const map = new VoucherMap()
map.ready = function(cb) {
  if (map.initialized) {
    cb();
  } else {
    map.whenReady = cb;
  }
}
load_typekit(()=>{
  map.initialize({id, url_base})
});

window.cbpp_housing_voucher_map = map