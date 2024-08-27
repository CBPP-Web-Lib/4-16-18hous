import { handle_annotations } from "./annotations"

var drawConfig = function(map, config) {
  return new Promise((resolve, reject) => {
    var {cbsa, bounds, layer, races, household_type, aff_units} = config;
    console.log(config)
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

      console.log(layer_names)

      map.dataLayerManager.setAdditionalDotsLayers(layer_names)
      
      map.coordTracker.setCoords(tileCoords, {
        destroyOldCanvas: false
      }).then(resolve)
    });
  });

};



export {drawConfig}