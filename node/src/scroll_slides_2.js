import 'core-js/stable'
import 'regenerator-runtime/runtime'
import {VoucherMap} from "./js/voucher_map/main.js"
import {getURLBaseFromScript} from "./js/get_url_base"
import { load_typekit } from "./js/voucher_map/typekit_loader"
import { build_script } from "./js/story/script"
import { drawConfig } from "./js/story/draw_config"
import "./app.scss"
import "./slides.scss"
const id = "hous4-16-18"
const script_id = "script_" + id
const url_base = getURLBaseFromScript(script_id);
//const map = new VoucherMap()
var script = build_script();
var map = new VoucherMap();

Promise.all([
  new Promise((resolve, reject) => {
    load_typekit(resolve);
  }),
  new Promise((resolve)=>{
    window.addEventListener("DOMContentLoaded", resolve);
  }),
  new Promise((resolve) => {
    map.whenReady = resolve
    map.initialize({id, url_base, no_url_hash:true, no_lightbox: true})
  })
]).then(() => {
  function do_item(script_item, item_index, cb) {
    var container = document.createElement("div");
    container.classList.add("map-slide-container")
    container.id = id + "-map-wrap-" + item_index;
    document.getElementById(id).append(container)
    map.switchId(container.id)
    drawConfig(map, script_item).then(cb)
  }
  var item_index;
  next_item();
  function next_item() {
    if (typeof(item_index)==="undefined") {
      item_index = 0;
    } else {
      item_index++;
    }
    if (script[item_index]) {
      var item = script[item_index]
      if (item.type === "mapConfig" && item.config.cbsa) {
        do_item(item.config, item_index, next_item)
      } else {
        next_item()
      }
    }
  }
  
})