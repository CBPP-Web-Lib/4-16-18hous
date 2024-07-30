import { handle_annotations } from "./annotations"

var MapManager = function(map) {
  var _cbsa;
  var _bounds;
  var _layer;
  var _races = [];
  var _household_type;
  var _aff_units;

  var change_in_progress = false;

  var changeBackground = function(config) {
    return new Promise((resolve) => {
      var { name } = config
      document.querySelector("#" + map.getId()).classList.add("map-hidden")
      document.querySelectorAll(".slide-custom-backgrounds > div").forEach(function(el) {
        el.classList.remove("active");
      })
      var new_bg = document.querySelector(".slide-custom-backgrounds [name='" + name + "']");
      if (new_bg) {
        new_bg.classList.add("active")
      }
      setTimeout(resolve, 300);
    });
  }

  this.customBackground = function(config) {
    if (change_in_progress) {
      change_in_progress = change_in_progress.then(function() {
        return changeBackground(config);
      }).then(done);
    } else {
      change_in_progress = changeBackground(config).then(done);
    }
    function done() {
      return new Promise((resolve) => {
        change_in_progress = false;
        resolve();
      });
    }
  }


  this.setNewConfig = function(config) {
    var id = Math.random();
    function done() {
      return new Promise((resolve) => {
        change_in_progress = false;
        resolve();
      });
    }
    if (change_in_progress) {
      change_in_progress = change_in_progress.then(function() {
        return newConfigPromise(config, id)
      }).then(done);
    } else {
      change_in_progress = newConfigPromise(config, id).then(done);
    }
  }

  var newConfigPromise = function(config, id) {
    return new Promise((resolve, reject) => {
      var {cbsa, bounds, layer, races, mode, hideMap, household_type, aff_units, backgroundChange} = config;
      setTimeout(resolve, 1000);
      if (!backgroundChange) {
        document.querySelectorAll(".slide-custom-backgrounds > div").forEach(function(el) {
          el.classList.remove("active");
        })
      }
      if (hideMap) {
        document.querySelectorAll(".slide-custom-backgrounds > div").forEach(function(el) {
          el.classList.remove("active");
        })
        change_in_progress = false;
        resolve();
        return;
      } else if (!backgroundChange) {
        document.querySelector("#" + map.getId()).classList.remove("map-hidden")
      }
      if (mode === "story") {
        document.body.classList.add("cbpp-maps-story-mode");
      } else {
        document.body.classList.remove("cbpp-maps-story-mode");
      }
      if (cbsa !== _cbsa) {
        _cbsa = cbsa;
        if (cbsa) {
          document.querySelectorAll("#" + map.getId() + " .map-outer-lightbox")[0]
            .style.visibility = "visible"
          map.cbsaManager.loadCBSA(cbsa).then(() => {
            setCoords(bounds)
            afterCoordsSet()
          });
        }
      } else {
        setCoords(bounds)
        afterCoordsSet()
      }
      
      function afterCoordsSet() {
        handle_annotations(config.annotations, map);

        var changes = false;
        if (household_type !== _household_type) {
          _household_type = household_type
          map.dataLayerManager.setActiveDotsLayer(household_type)
          changes = true;
        }
        if (layer !== _layer) {
          _layer = layer
          map.dataLayerManager.setActiveLayer(layer)
          changes = true;
        }
        var layer_names = []
        if (_aff_units !== aff_units) {
          _aff_units = aff_units;
          changes = true;
        }
        if (aff_units) {
          layer_names.push("safmr_tot_safmr_vau_dots");
        }
        if (!arrEqual(races, _races)) {
          _races = races
          changes = true;
        }
        if (races) {
          races.forEach((race) => {
            layer_names.push("ethnicity_" + race + "_dots")
          })
        }
        if (changes) {
          map.dataLayerManager.setAdditionalDotsLayers(layer_names)
          map.updateView().then(function() {
            resolve(); 
          })
        } else {
          resolve()
        }
      }
      
    });

  };


  function setCoords(bounds) {
    if (!bounds) {return;}
    if (!arrEqual(bounds, _bounds)) {
      var tileCoords = map.coordTracker.getBoundingTilesForBbox(bounds)
      map.coordTracker.setCoords(tileCoords)
      _bounds = bounds;
    }
  }

  function arrEqual(a1, a2) {
    if (!a1 || !a2) {return false}
    if (a1.length !== a2.length) {return false}
    var r = true;
    a1.forEach((el, i) => {
      if (a1[i] !== a2[i]) {
        r = false;
      }
    })
    return r;
  }

}

export { MapManager }