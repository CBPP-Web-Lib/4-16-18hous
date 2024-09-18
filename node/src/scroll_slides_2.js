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
document.getElementById(id).classList.add("updating");
const WorkerManager = function() {
  this.getURLBase = () => {return url_base}
  this.setup = function() {
    return setupProjectionWorkers(this);
  }
  if (mode !== "download") {
    this.dotWorkers = setupDotWorkers(this)
  }
}
const worker_manager = new WorkerManager();
//const map = new VoucherMap()
var script = build_script();
var maps = {};

Promise.all([
  new Promise((resolve, reject) => {
    load_typekit(resolve);
  }),
  new Promise((resolve)=>{
    window.addEventListener("DOMContentLoaded", resolve);
  }),
  worker_manager.setup()
]).then(() => {
  document.querySelector(".slide-deck").querySelectorAll(".slide").forEach((slide)=> {
    slide.innerHTML = "<div class='slide-inner-wrap'>" + slide.innerHTML + "</div>"
  });

  var resizeFunction = function() {
    
    var offset = document.querySelector(".slide-deck").getBoundingClientRect();
    document.querySelectorAll(".slide-deck section").forEach((section) => {
      if (!window.matchMedia("(min-width: 994px)").matches) {
        section.style.left = "";
      } else {
        section.style.left = (0 - offset.left + 40) + "px";
      }
    });
  }

  window.addEventListener("resize", resizeFunction);
  resizeFunction();

  var ScrollMgr = function(script, drawMgr) {
    var slides = [];
    var items_by_anchor = {};
    var updating = {}
    this.registerUpdate = function(map_id) {
      updating[map_id] = true;
      document.getElementById(id).classList.add("updating");
    }
    this.signalUpdateComplete = function(map_id) {
      delete(updating[map_id]);
      if (Object.keys(updating).length === 0) {
        document.getElementById(id).classList.remove("updating");
      }
    }
    this.setupScroll = function() {
      script.forEach((item) => {
        var sel = " .slide[name='" + item.anchor + "']";
        var slide = document.querySelector(sel);
        item.slide = slide;
        /*if (slide) {
          slides.push(slide);
          items_by_anchor[item.anchor] = item;
        }*/
      })
      window.addEventListener("scroll", this.onScroll);
    }
    var resizeThrottle;
    this.onScroll = function(e, noRedraw) {
      var slide_pos = [];
      var bodyRect = document.body.getBoundingClientRect()
      const transition_margin = 200;
      script.forEach((item, i) => {
        var slide = item.slide;
        if (slide) {
          var slideRect = slide.getBoundingClientRect()
          var anchor = slide.getAttribute("name");
          //var item = items_by_anchor[anchor]
          var scrollTop = document.documentElement.scrollTop;
          var windowHeight = window.innerHeight;
          var position = 0;
          var end_position = 0;
          if (item.position) {
            position = item.position;
          }
          if (item.end_position) {
            end_position = item.end_position;
          }
          var pos = {
            top: slideRect.top - bodyRect.top + position,
            height: slideRect.height - position + end_position,
          };
          if (item.override_height) {
            pos.height = item.override_height;
          }
          pos.progress = (scrollTop + 0.5*windowHeight - pos.top) / (pos.height)
          slide_pos[i] = pos
          var current_el = document.getElementById(item.id);
          var fadeIn = (pos.progress + transition_margin/pos.height)/(2*(transition_margin/pos.height))
          var fadeOut = (1 - pos.progress + transition_margin/pos.height)/(2*(transition_margin/pos.height))
          var opacity = Math.max(0, Math.min(1, fadeIn, fadeOut))
          if (current_el) {
            current_el.style.opacity = (opacity*100) + "%"
            var map_id = current_el.id;
            var map = maps[map_id];
            if (map) {
              if ((slideRect.top > 2000) || (slideRect.top + slideRect.height) < -2000) {
                //map.deferResize = true;
              } else {
                map.triggerResize();
               // map.deferResize = false;
              }
            }
          }
          
        }
      });
      
      if (noRedraw !== true) {
        drawMgr.reset();
        drawMgr.next_item();
      }

      //window.dispatchEvent(new Event("resize"));
      /*clearTimeout(resizeThrottle);
      resizeThrottle = setTimeout(function() {
        window.dispatchEvent(new Event("resize"));
      }, 1000);*/

    }
  }


  var DrawMgr = function() {
    var item_index = -1;
    var self = this;
    this.next_item = function() {
      item_index++;
      if (script[item_index]) {
        var item = script[item_index]
        item.id = do_item(item, item_index, self.next_item, theScrollMgr)
      } else {
        if (theScrollMgr) {
          theScrollMgr.onScroll({}, true);
        }
        document.getElementById(id).classList.remove("updating");
      }
    }
    this.reset = function() {
      item_index = -1;
    }
  }

  var theDrawMgr = new DrawMgr();
  var theScrollMgr = new ScrollMgr(script, theDrawMgr)
  
  theDrawMgr.next_item();
  theScrollMgr.setupScroll();
  
  function do_item(item, item_index, cb, scrollMgr) {
    var script_item = item.config;
    var anchor = item.anchor;
    var slide = document.querySelector(".slide-deck .slide[name='" + anchor + "']");
    var rect = slide.getBoundingClientRect();
    var container_id = id + "-map-wrap-" + item_index;
    if ((rect.top > 2000) || (rect.top + rect.height) < -2000) {
      cb();
      return container_id;
    }
    var container;
    container = document.getElementById(container_id);
    if (!container) {
      container = document.createElement("div");
      container.id = container_id;
      document.getElementById(id).append(container)
    }
    //map.switchId(container.id)
    if (item.type === "mapConfig" && script_item.cbsa) {
      if (container.classList.contains("map-slide-container")) {
        cb();
      } else {
        container.classList.add("map-slide-container")
        drawConfig({id: container.id, worker_manager, url_base, script_item, scrollMgr}).then(function(map) {
          cb();
          maps[container.id] = map;
          return map;
        })
      }
    } else {
      if (container.classList.contains("static-slide-processed")) {
        cb();
        return container_id;
      } else {
        var bg = document.querySelector(".slide-custom-backgrounds div[name='" + script_item.name + "']");
        bg.parentElement.removeChild(bg);
        container.appendChild(bg);
        container.classList.add("static-slide-container")
        document.getElementById(id).append(container)
        container.classList.add("static-slide-processed");
        cb();
      }
    }
    return container_id;
  }
  
  
})