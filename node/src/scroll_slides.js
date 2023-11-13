import { select } from "d3"
import "./slides.scss"

var map = window.cbpp_housing_voucher_map



window.addEventListener("DOMContentLoaded", function() {

  document.querySelector(".slide-deck").querySelectorAll(".slide").forEach((slide)=> {
    slide.innerHTML = "<div class='slide-inner-wrap'>" + slide.innerHTML + "</div>"
  })

  map.ready(function() {
    var scroller = new WindowScroller()

    window.addEventListener("resize", windowResize);
    windowResize()
    
    window.addEventListener("scroll", scroller.onScroll);
    scroller.onScroll({scrollY: 0})
  });
})


var windowResize = function() {
  var deck = document.querySelector(".slide-deck");
  var { left, right } = deck.parentElement.getBoundingClientRect()
  var outerRight = window.innerWidth;
  deck.style["margin-left"] = (-left + outerRight - right) + "px"

  calculate_absolute_percentages()

}

function calculate_absolute_percentages() {
  var deck = document.querySelector(".slide-deck");
  var deckRect = deck.getBoundingClientRect()
  var slides = deck.querySelectorAll(".slide");
  var anchors = {}
  slides.forEach((slide) => {
    var slideRect = slide.getBoundingClientRect()
    var height = slideRect.height/deckRect.height
    var start = (slideRect.top - deckRect.top)/deckRect.height
    anchors[slide.getAttribute("name")] = {height, start}
  })
  script.forEach((change) => {
    var { anchor } = change;
    if (!anchor) {return;}
    var slide_pos = anchors[anchor]
    change.absPosition = slide_pos.start + change.position/100 * slide_pos.height
  })
  script.sort((a, b) => {
    return a.absPosition - b.absPosition
  })
}

var WindowScroller = function() {
  var current_item;
  var deferred_action;
  var force_after_500ms = true;
  var prev = window.scrollY;
  this.onScroll = function(e) {
    var direction = window.scrollY >= prev ? "down" : "up"
    prev = window.scrollY;
    var deck = document.querySelector(".slide-deck").getBoundingClientRect();
    var intro_text = document.querySelector(".intro-text").getBoundingClientRect();
    var height = window.innerHeight;
    var progress = 0 - deck.top/deck.height
    var opacity = Math.max(0, Math.min(1, 1 - (intro_text.height + intro_text.y) / (height*0.5)))
    document.querySelector("#" + map.getId() + " .map-outer-lightbox").style.opacity = opacity;
    var item_to_do, next_item;
    script.sort((a, b) => {
      return a.absPosition - b.absPosition
    });
    script.forEach((item, i) => {
      if (progress > item.absPosition) {
        item_to_do = item;
        next_item = direction === "down" ? script[i+1] : script[i-1]
      }
    })
    if (!item_to_do) {
      item_to_do = script[0];
      if (direction === "down") {
        next_item = script[1];
      } 
    }
    function do_item_and_next() {
      item_to_do.action();
      if (next_item) {
        if ((item_to_do.type === "customBackground" || item_to_do.config.hideMap) && next_item.type === "mapConfig") {
          next_item.action({backgroundChange: true})
        }
      }
    }
    if (current_item !== item_to_do) {
      clearTimeout(deferred_action);
      deferred_action = setTimeout(() => {
        do_item_and_next()
      }, 50);
      current_item = item_to_do
    }
    if (force_after_500ms) {
      if (current_item !== item_to_do) {
        force_after_500ms = false;
        setTimeout(() => {
          clearTimeout(deferred_action);
          do_item_and_next()
          force_after_500ms = true;
        }, 50);
      }
    }
    
  }
}

var MapManager = function() {
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
      document.querySelector(".slide-custom-backgrounds [name='" + name + "']").classList.add("active")
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
        handle_annotations(config.annotations);

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

      function draw_annotation(el, d) {
        if (d.type === "ellipse") {
          var coords = map.coordTracker.getCoords();
          var z = Math.floor(coords.z);
          var coords1 = map.projectionManager.latLongToTileCoord(d.major_axis.x1, d.major_axis.y1, z);
          var coords2 = map.projectionManager.latLongToTileCoord(d.major_axis.x2, d.major_axis.y2, z);
          var x1c = (coords1.x - coords.x)*256;
          var y1c = (coords1.y - coords.y)*256;
          var x2c = (coords2.x - coords.x)*256;
          var y2c = (coords2.y - coords.y)*256;
          var center = {
            x: (x1c + x2c)/2,
            y: (y1c + y2c)/2
          };
          var length = Math.sqrt(Math.pow((x1c - x2c), 2) + Math.pow((y1c - y2c), 2));
          var rotate = Math.atan((y2c - y1c)/(x2c - x1c))*180/Math.PI;
          var ellipse = select(el).selectAll("ellipse")
            .data([1]);
          ellipse
            .enter()
            .append("ellipse")
            .merge(ellipse)
            .attr("cx", center.x)
            .attr("cy", center.y)
            .attr("rx", length/2)
            .attr("ry", length/2 * d.minor_axis.length)
            .attr("transform-origin", [center.x, center.y].join(" "))
            .attr("transform", "rotate(" + rotate + ")")
            .attr("stroke-width", 2)
            .attr("stroke", "#a00")
            .attr("fill","none")
        }
      }

      function handle_annotations(annotations) {
        if (typeof(annotations)==="undefined") {
          annotations = [];
        }
        map.getTextSvg().selectAll("g.annotations")
          .data([1])
          .enter()
          .append("g")
          .attr("class","annotations");
        var annotation_els = map.getTextSvg().select("g.annotations").selectAll("g.annotation")
          .data(annotations, ann=>ann.id);
        annotation_els.enter()
          .append("g")
          .attr("class","annotation")
          .merge(annotation_els)
          .each(function(d) {
            draw_annotation(this, d)
          }); 
        annotation_els.exit().remove();
        
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

var theMgr = new MapManager;

function build_script() {
  var script = []
  var item;
  item = {
    position: "lessThanMin",
    type: "mapConfig",
    config: {
      hideMap: true
    }
  };
  script.push(item);
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
  item = JSON.parse(JSON.stringify(item));
  item.anchor = "milwaukee-2";
  item.config.household_type = "hcv_children_poc",
  script.push(item);
  script.push({
    position: -50,
    anchor: "milwaukee-3",
    type: "customBackground",
    config: {name: "families_poc_milwaukee_chart"}
  });
  item = JSON.parse(JSON.stringify(item));
  item.anchor = "milwaukee-4";
  item.position = -50;
  item.config.layer = "none";
  item.config.races = ["black"];
  script.push(item);
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
  script.push({
    position: -50,
    anchor: "milwaukee-6",
    type: "customBackground",
    config: {name: "poverty_voucher"}
  });
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

var script = build_script();