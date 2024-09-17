import { handle_annotations } from "./annotations"
import {VoucherMap} from "../voucher_map/main.js"


var drawConfig = function(args) {
  var {id, worker_manager, url_base, script_item, scrollMgr} = args;
  return new Promise((resolve, reject) => {
    var config = script_item;
    var {cbsa, bounds, layer, races, household_type, aff_units} = config;
    var map = new VoucherMap()
    map.initialize({id, url_base, no_url_hash:true, no_lightbox: true, static: true}, worker_manager);
    map.cbsaManager.loadCBSA(cbsa).then(() => {
      function getScreenBox() {
        var screenBox = [540, 0, map.getViewportWidth(), map.getViewportHeight()];
        var mobileLayout = window.matchMedia("(max-width: 994px)").matches;
        if (mobileLayout) {
          screenBox = [0, 0, window.innerWidth, window.innerHeight];
        }
        return screenBox;
      }
      var screenBox = getScreenBox()
      var tileCoords = map.coordTracker.getBoundingTilesForBbox(bounds, screenBox)
      map.coordTracker.registerResizeHook("addPending", 50, function(config) {
        scrollMgr.registerUpdate(id);
      })
      map.coordTracker.registerResizeHook("resetCoords", 100, function(config) {
        var {map, viewportWidth, viewportHeight} = config;
        var screenBox = getScreenBox()
        var tileCoords = map.coordTracker.getBoundingTilesForBbox(bounds, screenBox)
        map.coordTracker.overrideCoords(tileCoords)
      })
      map.coordTracker.registerPostResizeHook("triggerScroll", 100, function(config) {
        scrollMgr.onScroll();
      })
      
      map.coordTracker.registerPostResizeHook("removePending", 100, function(config) {
        scrollMgr.signalUpdateComplete(id);
      })

      var existing_title = document.getElementById(id).querySelector(".map-title");
      if (existing_title) {
        existing_title.parentElement.removeChild(existing_title);
      }
      if (config.title) {
        var title_element = document.createElement("div");
        title_element.classList.add("map-title");
        title_element.innerHTML = "<h4>" + config.title + "</h4>";
        document.getElementById(id).appendChild(title_element);
      }

      handle_annotations(config.annotations, map);
      map.dataLayerManager.setActiveDotsLayer(household_type)
      map.dataLayerManager.setActiveLayer(layer)
      var layer_names = []
      if (aff_units) {
        layer_names.push("safmr_tot_safmr_vau_dots");
      }
      if (races) {
        races.forEach((race) => {
          layer_names.push("ethnicity_" + race + "_dots")
        })
      }

      map.dataLayerManager.setAdditionalDotsLayers(layer_names)
      map.coordTracker.setCoords(tileCoords, {
        destroyOldCanvas: false
      }).then(function() {
        resolve(map)
      })
    });
  });
};



export {drawConfig}