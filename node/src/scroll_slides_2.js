import 'core-js/stable'
import 'regenerator-runtime/runtime'
import {VoucherMap} from "./js/voucher_map/main.js"
import {getURLBaseFromScript} from "./js/get_url_base"
import { load_typekit } from "./js/voucher_map/typekit_loader"
import { build_script } from "./js/story/script"
import { drawConfig } from "./js/story/draw_config"
import "./app.scss"
import "./slides.scss"
import { setupProjectionWorkers } from "./js/voucher_map/setup_projection_workers"
import { setupDotWorkers } from "./js/voucher_map/setup_dot_workers"
import { mode } from "./js/voucher_map/mode"
//import ScrollMagic from 'scrollmagic'
//import { ScrollMagicPluginIndicator } from "scrollmagic-plugins";
//ScrollMagicPluginIndicator(ScrollMagic);

const id = "hous4-16-18"
const script_id = "script_" + id
const url_base = getURLBaseFromScript(script_id);
const worker_manager = new (function() {
  this.getURLBase = () => {return url_base}
  this.projectionWorkers = setupProjectionWorkers(this)
  if (mode !== "download") {
    this.dotWorkers = setupDotWorkers(this)
  }
})
//const map = new VoucherMap()
var script = build_script();
var maps = [];

Promise.all([
  new Promise((resolve, reject) => {
    load_typekit(resolve);
  }),
  new Promise((resolve)=>{
    window.addEventListener("DOMContentLoaded", resolve);
  })
]).then(() => {
  document.querySelector(".slide-deck").querySelectorAll(".slide").forEach((slide)=> {
    slide.innerHTML = "<div class='slide-inner-wrap'>" + slide.innerHTML + "</div>"
  });
  function do_item(item, item_index, cb) {
    var script_item = item.config;
    var container = document.createElement("div");
    container.id = id + "-map-wrap-" + item_index;
    document.getElementById(id).append(container)
    //map.switchId(container.id)
    if (item.type === "mapConfig" && script_item.cbsa) {
      container.classList.add("map-slide-container")
      maps.push(drawConfig({id: container.id, worker_manager, url_base, script_item}).then(cb))
    } else {
      var bg = document.querySelector(".slide-custom-backgrounds div[name='" + script_item.name + "']");
      console.log(bg)
      bg.parentElement.removeChild(bg);
      container.appendChild(bg);
      container.classList.add("static-slide-container")
      document.getElementById(id).append(container)
      cb();
    }
    return container.id;
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
      //if (item.type === "mapConfig" && item.config.cbsa) {
        item.id = do_item(item, item_index, next_item)
      //} else {
       // next_item()
     // }
    } else {
      //setup_scroll();
    }
  }
  setup_scroll();
  function setup_scroll() {
    var slides = [];
    var items_by_anchor = {};
    script.forEach((item) => {
      var sel = " .slide[name='" + item.anchor + "']";
      var slide = document.querySelector(sel);
      if (slide) {
        slides.push(slide);
        items_by_anchor[item.anchor] = item;
      }
    })

    window.addEventListener("scroll", function(e) {
      var slide_pos = {};
      var bodyRect = document.body.getBoundingClientRect()
      const transition_margin = 0.1;
      slides.forEach((slide, i) => {
        var slideRect = slide.getBoundingClientRect()
        var anchor = slide.getAttribute("name");
        var item = items_by_anchor[anchor]
        var scrollTop = document.documentElement.scrollTop;
        var pos = {
          top: slideRect.top - bodyRect.top,
          height: slideRect.height,
        };
        pos.progress = (scrollTop - pos.top) / (pos.height)
        slide_pos[anchor] = pos
        var current_el = document.getElementById(item.id);
        var fadeIn = (pos.progress + transition_margin)/(2*transition_margin)
        var fadeOut = (1 - pos.progress + transition_margin)/(2*transition_margin)
        var opacity = Math.max(0, Math.min(1, fadeIn, fadeOut))
        if (current_el) {
          current_el.style.opacity = (opacity*100) + "%"
        }
      });
    })

  }
  
})