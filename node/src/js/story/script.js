
function build_script(theMgr) {
  var script = []

  /*The convention here is to start each item as a clone 
  of the previous one (except for the charts) so that we
  only need to write down what changes, while still passing
  the complete config to the map manager.*/

  /*--new slide--*/
  var item;
  item = {
    position: 0,
    anchor: "dc-0",
    type: "mapConfig",
    config: {
      cbsa: 47900,
      mode: "story",
      bounds: [-77.21, 39.03, -76.87, 38.77],
      household_type: "ph_total",
      layer: "none",
      races: ["black","white"],
      title: "Entrenched Racial Segregation in D.C. Area Reflects Lasting Impact of Racist Housing Policies "
    }
  };
  script.push(item);

  /*--new slide--*/
  item = JSON.parse(JSON.stringify(item));
  item.anchor = "dc-1";
  item.config.household_type = "ph_children_poc";
  item.config.layer = "poverty_pov_pct";
  item.config.races = [];
  item.config.title = "1 in 3 Black Families With Children Assisted by Public Housing in D.C. Metro Area Live in High-Poverty Neighborhoods ";
  script.push(item);
  
  /*--new slide--*/
  script.push({
    position: 40,
    anchor: "dc-2",
    type: "customBackground",
    config: {name: "dc-chart-1"}
  });

  /*--new slide--*/
  script.push({
    position: 20,
    anchor: "dc-3",
    type: "customBackground",
    config: {name: "dc-chart-2"}
  });

  /*--new slide--*/
  item = {
    position: -30,
    anchor: "la-1",
    type: "mapConfig",
    config: {
      cbsa: 31080,
      mode: "story",
     // bounds: [-118.456, 34.235, -117.791, 33.700],
      bounds: [-118.523, 34.3, -117.91, 33.63],
      household_type: "none",
      layer: "none",
      races: ["asian","black","hisp","nhpi","white"],
      color_override: {"ethnicity_nhpi_dots": "#f00ac6ff"},
      title: "Los Angeles Home to Largest Latine and Second Largest Asian Population of any U.S. Metro Area"
    }
  };
  script.push(item);
 
  /*--new slide--*/
  item = JSON.parse(JSON.stringify(item));
  item.anchor = "la-2";
  item.position = 0;
  item.config.household_type = "pbra_total";
  item.config.layer = "none";
  item.config.races = ["nhpi"];
 // item.override_height = 700;
  item.config.title = "Asian and Native Hawaiian and Pacific Islander Renters Most Likely to Be Assisted by PBRA in Los Angeles Metro Area"
  script.push(item);

  /*--show nhpi first, then asian*/
  item = JSON.parse(JSON.stringify(item));
  item.position = 0;
  //delete(item.override_height);
  item.delay = 500;
  item.config.races = ["asian","nhpi"];
  script.push(item);
  
  /*--new slide--*/
  script.push({
    position: 0,
    anchor: "la-3",
    type: "customBackground",
    config: {name: "la-chart-1"}
  });

  /*--new slide--*/
  item = JSON.parse(JSON.stringify(item));
  delete(item.delay);
  item.anchor = "la-4";
  item.position = -400;
  item.end_position = - 400;
  item.config.household_type = "pbra_disability";
  item.config.color_override = {};
  item.config.layer = "poverty_pov_pct";
  item.config.races = [];
  item.config.title = "Project-Based Rental Assistance Helps House 6,500 Households Including a Person with a Disability in Los Angeles Metro Area"
  script.push(item);

  /*--new slide--*/
  item = {
    position: -60,
    anchor: "milwaukee-1",
    type: "mapConfig",
    config: {
      cbsa: 33340,
      mode: "story",
      bounds: [-87.94, 43.06, -87.85, 42.96],
      household_type: "none",
      layer: "none",
      races: ["black","white","hisp"],
      title:"Stark Racial Segregation in Milwaukee Metro Area Shaped by History of Redlining and Restrictive Covenants"
    }
  };
  script.push(item);

  /*--new slide--*/
  item = JSON.parse(JSON.stringify(item));
  item.anchor = "milwaukee-2";
  item.config.aff_units = false;
  item.config.layer="poverty_pov_pct";
  item.config.races = []
  item.config.household_type = "hcv_total"
  item.position = 0;
  item.override_height = 800
  item.config.title = "Over One-Third of Voucher-Affordable Units in Milwaukee Metro Area Are in Low-Poverty Neighborhoods"
  script.push(item);

  item = JSON.parse(JSON.stringify(item));
  item.anchor = "milwaukee-2";
  item.position = 700;
  delete(item.override_height);
  item.config.aff_units = true;
  script.push(item);
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

  /*--new slide--*/
  item = JSON.parse(JSON.stringify(item));
  item.anchor = "milwaukee-3";
  item.config.aff_units = false;
  item.position = 0;
  item.config.title = "Nearly One-Third of Voucher-Assisted Households in Milwaukee Metro Area Live in High-Poverty Neighborhoods";
  script.push(item);
    
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