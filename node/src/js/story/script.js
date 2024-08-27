
function build_script(theMgr) {
  var script = []

  /*The convention here is to start each item as a clone 
  of the previous one (except for the charts) so that we
  only need to write down what changes, while still passing
  the complete config to the map manager.*/

  /*--new slide--*/
  var mode = "dynamic"
  var item;
  item = {
    position: "lessThanMin",
    type: "mapConfig",
    config: {
      hideMap: true
    }
  };
  script.push(item);

  if (mode !== "static") {
    /*--new slide--*/
    item = {
      position: 0,
      anchor: "dc-0",
      type: "mapConfig",
      config: {
        cbsa: 47900,
        mode: "story",
        bounds: [-77.231, 39.062, -76.849, 38.722],
        household_type: "ph_total",
        layer: "none",
        races: ["black","white"]
      }
    };
    script.push(item);
  } else {
    /*--new slide--*/
    var item = {
      position: -40,
      anchor: "dc-0",
      type: "customBackground",
      config: {name: "dc-map-0"}
    }
    script.push(item)
  }

 

  if (mode !== "static") {

  } else {
    var item = {
      position: 20,
      anchor: "dc-1",
      type: "customBackground",
      config: {name: "dc-map-1"}
    }
    script.push(item)
  }

  /*--new slide--*/
  item = JSON.parse(JSON.stringify(item));
  item.anchor = "dc-12";
  script.push(item);

   /*--new slide--*/
   item = JSON.parse(JSON.stringify(item));
   item.anchor = "dc-15";
   script.push(item);

  if (mode !== "static") {
    /*--new slide--*/
    item = JSON.parse(JSON.stringify(item));
    item.anchor = "dc-2";
    item.config.household_type = "ph_children_poc";
    item.config.layer = "poverty_pov_pct";
    item.config.races = [];
    script.push(item);
  } else {
    item = {
      position: 0,
      anchor: "dc-2",
      type: "customBackground",
      config: {name: "dc-map-2"}
    }
    script.push(item)
  }

 
  
  
  /*--new slide--*/
  script.push({
    position: 40,
    anchor: "dc-3",
    type: "customBackground",
    config: {name: "dc-chart-1"}
  });

  script.push({
    position: 20,
    anchor: "dc-4",
    type: "customBackground",
    config: {name: "dc-chart-2"}
  });

  if (mode !== "static") {

    var item = {
      position: -30,
      anchor: "la-1",
      type: "mapConfig",
      config: {
        cbsa: 31080,
        mode: "story",
        bounds: [-118.456, 34.235, -117.791, 33.700],
        household_type: "none",
        layer: "none",
        races: ["asian","black","hisp","nhpi","white"]
      }
    };
    script.push(item);
  } else {
    var item = {
      position: -70,
      anchor: "la-1",
      type: "customBackground",
      config: {name: "la-map-1"}
    }
    script.push(item)
  }

  if (mode !== "static") {
    /*--new slide--*/
    item = JSON.parse(JSON.stringify(item));
    item.anchor = "la-2";
    item.config.household_type = "pbra_total";
    item.config.layer = "none";
    item.config.races = ["asian","nhpi"];
    script.push(item);
  } else {
    var item = {
      position: 0,
      anchor: "la-2",
      type: "customBackground",
      config: {name: "la-map-2"}
    }
    script.push(item)
  }

  /*--new slide--*/
  script.push({
    position: 0,
    anchor: "la-3",
    type: "customBackground",
    config: {name: "la-chart-1"}
  });

  if (mode !== "static") {
    /*--new slide--*/
    item = JSON.parse(JSON.stringify(item));
    item.anchor = "la-4";
    item.position = 0;
    item.config.household_type = "pbra_disability";
    item.config.layer = "poverty_pov_pct";
    item.config.races = [];
    script.push(item);
  } else {
    var item = {
      position: 0,
      anchor: "la-4",
      type: "customBackground",
      config: {name: "la-map-3"}
    }
    script.push(item)
  }

  if (mode !== "static") {
    /*--new slide--*/
    item = {
      position: -60,
      anchor: "milwaukee-1",
      type: "mapConfig",
      config: {
        cbsa: 33340,
        mode: "story",
        bounds: [-88.1447, 42.8989, -87.7661, 43.2077],
        household_type: "none",
        layer: "none",
        races: ["black","white","hisp"]
      }
    };
    script.push(item);
  } else {
    var item = {
      position: -40,
      anchor: "milwaukee-1",
      type: "customBackground",
      config: {name: "milwaukee-map-1"}
    }
    script.push(item)
  }

  if (mode !== "static") {

    /*--new slide--*/
    item = JSON.parse(JSON.stringify(item));
    item.anchor = "milwaukee-2";
    item.config.aff_units = true;
    /*item.config.annotations = [{
      id: "aff_units_ellipse",
      type: "ellipse",
      major_axis: {
        x1: -87.90446,
        y1: 43.038,
        x2: -87.88116,
        y2: 43.065
      },
      minor_axis: {
        length: 0.6
      }
    }];*/
    item.config.layer="poverty_pov_pct";
    item.config.races = []
    item.config.household_type = "hcv_total"
    script.push(item);
  } else {
    var item = {
      position: 0,
      anchor: "milwaukee-2",
      type: "customBackground",
      config: {name: "milwaukee-map-2"}
    }
    script.push(item)
  }

  if (mode !== "static") {

    /*--new slide--*/
    item = JSON.parse(JSON.stringify(item));
    item.anchor = "milwaukee-3";
    item.config.aff_units = false;
    script.push(item);
    
  } else {
    var item = {
      position: 0,
      anchor: "milwaukee-3",
      type: "customBackground",
      config: {name: "milwaukee-map-3"}
    }
    script.push(item)
  }

  /*--new slide--*/
  script.push({
    position: 0,
    anchor: "milwaukee-4",
    type: "customBackground",
    config: {name: "milwaukee-chart-1"}
  });

  /*configure actions*/
  script.forEach((item) => {
    if (theMgr) {
      if (item.type === "mapConfig") {
        item.action = function(bg) {
          if (bg) {
            item.config.backgroundChange = bg.backgroundChange;
          } else {
            item.config.backgroundChange = false;
          }
          theMgr.setNewConfig(item.config)
        }
      } else if (item.type === "customBackground") {
        item.action = function() {
          theMgr.customBackground(item.config);
        }
      }
    }
  });
  return script;
}

export { build_script }