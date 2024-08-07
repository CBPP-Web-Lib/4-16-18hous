import { openMap } from "../voucher_map/open_map"
import names from "../../../tmp/names.json"

function handleUrlHash(map) {
  if (window.location.hash) {
    var hash = window.location.hash.replace("#","")
    var parsed = new URLSearchParams(hash)
    var config = Object.fromEntries(parsed)
    var {dots, shapes, coords, cbsa, mapConfigHash} = config;
    if (!mapConfigHash) {
      return;
    }
    var dots = dots.split(",");
    var bounds = coords.split(",");
    bounds.forEach((n, i) => {
      bounds[i] = bounds[i]*1
    })

    /*we need to zoom in slightly to avoid an outward rachet on reload*/
    var bound_width = bounds[2] - bounds[0]
    var bound_height = bounds[3] - bounds[1]
    bounds[0] += bound_width/4
    bounds[2] -= bound_width/4
    bounds[1] += bound_height/4
    bounds[3] -= bound_height/4
    var tileCoords = map.coordTracker.getBoundingTilesForBbox(bounds)
    openMap(map, cbsa, tileCoords).then(function() {
      var main_dot;
      var eth_dots = []
      dots.forEach((dot) => {
        if (dot.indexOf("ethnicity_")!==-1) {
          eth_dots.push(dot);
          document.querySelector("#" + map.getId() + " input[value='" + dot + "']").checked = true
        } else if (dot === "safmr_tot_safmr_vau_dots") {
          eth_dots.push(dot)
          document.querySelector("#" + map.getId() + " input[name='safmr']").checked = true
        } else {
          var _dot = dot.split("_");
          var program = _dot.shift();
          var household_type = _dot.join("_")
          document.querySelector("#" + map.getId() + " select[name='dots-household']").value = household_type;
          document.querySelector("#" + map.getId() + " select[name='dots-program']").value = program;
          main_dot = dot;
        }
      })
      if (shapes === "none") {
        document.querySelector("#" + map.getId() + " .picker-race-ethnicity").style.display = "block";
      } else {
        document.querySelector("#" + map.getId() + " .picker-race-ethnicity").style.display = "";
      }
      document.querySelector("#" + map.getId() + " select[name='tract-dataset']").value = shapes;
      map.dataLayerManager.setActiveDotsLayer(main_dot)
      map.dataLayerManager.setAdditionalDotsLayers(eth_dots)
      map.dataLayerManager.setActiveLayer(shapes)
      
      // map.updateView()
    })
    var pickers = document.querySelectorAll("#" + map.getId() + " select[name='cbsa']")
    var cbsa_name = names[cbsa];
    pickers.forEach((picker)=>{
      var text_input = picker.hous41618_associated_autocomplete_textinput;
      text_input.value = cbsa_name
    });
    /*var config = {
      dots: active_dots_layer.join(","),
      shapes: active_layer,
      coords: bounds.join(","),
      cbsa: cbsa,
      mapConfigHash: true
    }*/
  }
}

export { handleUrlHash }