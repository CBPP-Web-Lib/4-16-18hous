import 'core-js/stable'
import 'regenerator-runtime/runtime'

import {VoucherMap} from "./js_new/voucher_map/main.js"
import {getURLBaseFromScript} from "./js_new/get_url_base"

import waterIndex  from "../tmp/waterIndex.json";

import "./app_new.scss"

const id = "hous4-16-18"
const sel = "#" + id
const script_id = "script_" + id
const script_sel = "#" + script_id

const url_base = getURLBaseFromScript(script_id);

const map = new VoucherMap()
map.initialize({id, url_base})
var cbsa = 25540;
//cbsa = 35620;
map.cbsaManager.loadCBSA(cbsa).then(function() {
  map.coordTracker.setCoords({
    z: 10,
    x: 303,
    y: 380
  })
});



