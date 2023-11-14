
function build_script(theMgr) {
  var script = []

  /*The convention here is to start each item as a clone 
  of the previous one (except for the charts) so that we
  only need to write down what changes, while still passing
  the complete config to the map manager.*/

  /*--new slide--*/
  var item;
  item = {
    position: "lessThanMin",
    type: "mapConfig",
    config: {
      hideMap: true
    }
  };
  script.push(item);

  /*--new slide--*/
  item = {
    position: -50,
    anchor: "milwaukee-1",
    type: "mapConfig",
    config: {
      cbsa: 33340,
      mode: "story",
      bounds: [-88.1447, 42.8989, -87.7661, 43.2077],
      household_type: "hcv_total",
      layer: "poverty_pov_pct"
    }
  };
  script.push(item);

  /*--new slide--*/
  item = JSON.parse(JSON.stringify(item));
  item.anchor = "milwaukee-2";
  item.config.household_type = "hcv_children_poc",
  script.push(item);

  /*--new slide--*/
  script.push({
    position: -50,
    anchor: "milwaukee-3",
    type: "customBackground",
    config: {name: "families_poc_milwaukee_chart"}
  });

  /*--new slide--*/
  item = JSON.parse(JSON.stringify(item));
  item.anchor = "milwaukee-4";
  item.position = -50;
  item.config.layer = "none";
  item.config.races = ["black"];
  script.push(item);

  /*--new slide--*/
  item = JSON.parse(JSON.stringify(item));
  item.anchor = "milwaukee-5";
  item.config.aff_units = true;
  item.config.annotations = [{
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
  }];
  script.push(item);

  /*--new slide--*/
  script.push({
    position: -50,
    anchor: "milwaukee-6",
    type: "customBackground",
    config: {name: "poverty_voucher"}
  });

  /*--new slide--*/
  item = JSON.parse(JSON.stringify(item));
  item.position = -50;
  item.anchor = "milwaukee-7";
  item.config.aff_units = false;
  item.config.races = [
    "aian",
    "asian",
    "black",
    "hisp",
    "multi",
    "nhpi",
    "other",
    "white"
  ];
  script.push(item);

  /*--new slide--*/
  item = {
    position: -50,
    anchor: "madison-1",
    type: "mapConfig",
    config: {
      cbsa: 31540,
      mode: "story",
      bounds: [-89.5911, 43.2020, -89.2196, 42.9582],
      household_type: "hcv_children_poc",
      layer: "none",
      races: [
        "black",
        "hisp"
      ],
      annotations: [{
        id: "milwaukee-shorewood-hills",
        type: "ellipse",
        major_axis: {
          x1: -89.51556,
          y1: 43.08998,
          x2: -89.40228,
          y2: 43.04484
        },
        minor_axis: {
          length: 0.4
        }
      }, {
        id: "milwaukee-monona",
        type: "ellipse",
        major_axis: {
          x1: -89.35500,
          y1: 43.06240,
          x2: -89.27937,
          y2: 43.06240
        },
        minor_axis: {
          length: 0.6
        }
      }]
    }
  };
  script.push(item);

  /*--new slide--*/
  item = JSON.parse(JSON.stringify(item));
  item.anchor = "madison-2";
  item.config.aff_units = true;
  script.push(item);
  script.forEach((item) => {
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
  });
  return script;
}

export { build_script }