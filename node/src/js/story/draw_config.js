import { handle_annotations } from "./annotations"
import {VoucherMap} from "../voucher_map/main.js"


var drawConfig = function(args) {
  var {id, worker_manager, url_base, script_item} = args;
  return new Promise((resolve, reject) => {
    var config = script_item;
    var {cbsa, bounds, layer, races, household_type, aff_units} = config;
    var map = new VoucherMap()
    map.initialize({id, url_base, no_url_hash:true, no_lightbox: true}, worker_manager);
    map.cbsaManager.loadCBSA(cbsa).then(() => {
      var tileCoords = map.coordTracker.getBoundingTilesForBbox(bounds)
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
      }).then(resolve)
    });
  });
};



export {drawConfig}