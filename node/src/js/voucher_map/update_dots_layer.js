import { dotConfig } from "./dot_config"
import { bbox_overlap } from "./bbox_overlap"
import { shuffle } from "./shuffle_array"
import seedrandom from "seedrandom"
import high_density_cbsa from "../high_density_cbsa"
import hexRgb from 'hex-rgb'
const dot_data_layer = {}

function load_dot_config(name) {
  var config = {};
  Object.keys(dotConfig.default).forEach((prop)=>{
    config[prop] = dotConfig.default[prop]
  })
  if (dotConfig[name]) {
    Object.keys(dotConfig[name]).forEach((prop)=>{
      config[prop] = dotConfig[name][prop]
    })
  }
  return config
}

/*for debugging use only; don't need to display this layer ordinarily*/
function display_water(map, water) {
  var water_features = []
  var svg = map.getSvg()
  water.forEach((file)=>{
    water_features = water_features.concat(file.features)
  })
  var pathGen = map.projectionManager.getPathGen()
  var debug_water = svg
    .selectAll("path.water")
    .data(water_features);
  debug_water.enter()
    .append("path")
    .attr("class","water")
    .merge(debug_water)
    .attr("d", pathGen)
  debug_water.exit().remove()
  /*end debug*/
}

export function updateDotsLayer(visible_features) {
  var map = this
  return new Promise((resolve)=> {
    var start_time = Date.now()
    var cbsa = map.cbsaManager.getLoadedCbsa()
    var z = Math.round(map.coordTracker.getCoords().z)
    if (high_density_cbsa[cbsa]) {
      z += high_density_cbsa[cbsa]
    }
    var projection = map.projectionManager.getProjection()
    var water = map.cbsaManager.getWaterShapes()
    var bounds = map.projectionManager.getBounds()
    var water_features = [];
    water.forEach((water_group)=>{
      water_group.features.forEach((feature)=>{
        if (bbox_overlap(feature.bbox, bounds)) {
          water_features.push(feature)
        } 
      })
    })

    var worker_setup_tasks = []
    map.dotWorkers.forEach((worker)=>{
      worker_setup_tasks.push(new Promise((resolve)=>{
        worker.postMessage({
          msgType: "newWater",
          water: water_features
        })
        worker.newWaterCallback = function(e) {
          resolve()
        };
      }))
    });
    Promise.all(worker_setup_tasks).then(function() {
      var active_dots_layer = map.dataLayerManager.getActiveDotsLayers()
      Object.keys(dot_data_layer).forEach((layer_id)=>{
        var name = dot_data_layer[layer_id].name
        var config = load_dot_config(name)
        var dot_represents = config.numDots(z)
        if (dot_data_layer[layer_id].dotRepresents !== dot_represents) {
          delete(dot_data_layer[layer_id])
        }
        if (active_dots_layer.indexOf(name)===-1) {
          delete(dot_data_layer[layer_id])
        }
      })
      var feature_piles = []
      var worker_slot = 0
      active_dots_layer.forEach((name)=>{
        var config = load_dot_config(name)
        var dot_represents = config.numDots(z)
        var layer_id = name + "_" + dot_represents;
        var layer_data;
        if (!dot_data_layer[layer_id]) {
          var layer_data = {
            name,
            dotRepresents: dot_represents,
            tracts: {}
          }
          dot_data_layer[layer_id] = layer_data
        } else {
          layer_data = dot_data_layer[layer_id]
        }
        Object.keys(layer_data.tracts).forEach((geoid)=>{
          layer_data.tracts[geoid].old = true
        })
        visible_features.forEach((feature)=>{
          if (feature.properties.housing_data[name]) {
            var geoid = feature.properties.GEOID10
            layer_data.tracts[geoid] = layer_data.tracts[geoid] || {
              dots: []
            }
            layer_data.tracts[geoid].old = false
            feature_piles[worker_slot] = feature_piles[worker_slot] || []
            var num_dots = feature.properties.housing_data[name][dot_represents]
            if (layer_data.tracts[geoid].dots.length !== num_dots) {
              feature_piles[worker_slot].push({
                feature,
                name, 
                dot_represents,
                layer_id,
                these_dots: layer_data.tracts[geoid].dots 
              })
              worker_slot++
              if (worker_slot >= map.dotWorkers.length) {
                worker_slot = 0
              }
            }
          }
        })
        Object.keys(layer_data.tracts).forEach((geoid)=>{
          if (layer_data.tracts[geoid].old) {
            delete(layer_data.tracts[geoid])
          }
        })
      })
      var dot_tasks = []
      feature_piles.forEach((pile, i)=>{
        dot_tasks.push(new Promise((resolve)=>{
          map.dotWorkers[i].postMessage({
            msgType: "requestDotLocations",
            features: pile
          })
          pile = null
          map.dotWorkers[i].dotLocationCallback = (data)=>{
            Object.keys(data).forEach((layer_id)=>{
              Object.keys(data[layer_id]).forEach((geoid)=>{
                var layer_data = dot_data_layer[layer_id]
                layer_data.tracts[geoid].dots = data[layer_id][geoid].dots
              })
            })
            resolve()
          }
        }))
      })
      feature_piles = null
      return Promise.all(dot_tasks)
    }).then(()=>{
      
      var ctx = map.getCanvasContext()
      var canvas = map.getCanvas()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      var dotsLayer = document.querySelectorAll("#" + map.getId() + " .map-viewport > canvas")[0];
      dotsLayer.style.transform = "";
      var draw_dot_layers = [];
      Object.keys(dot_data_layer).forEach((layer_id)=>{
        var dot_layer = dot_data_layer[layer_id]
        var layer_name = dot_layer.name
        var draw_dot_layer = [];
        Object.keys(dot_layer.tracts).forEach((geoid)=>{
          draw_dot_layer = draw_dot_layer.concat(dot_layer.tracts[geoid].dots)
        })
        draw_dot_layers.push({
          id: layer_id,
          name: layer_name,
          dots: draw_dot_layer
        })
      })
    
      //display_water(map, water);
    
      /*draw voucher dots above ethnicity dots and randomize order of ethnicity dots*/
      var voucher_dots = []
      var ethnicity_dots = []
      var configs = {}
      draw_dot_layers.forEach((layer)=>{
        configs[layer.name] = load_dot_config(layer.name)
        var is_ethnicity_layer = false
        if (layer.name.indexOf("ethnicity")!==-1) {
          is_ethnicity_layer = true
        }
        layer.dots.forEach((dot)=>{
          if (is_ethnicity_layer) {
            ethnicity_dots.push([dot, layer.name])
          } else {
            voucher_dots.push([dot, layer.name])
          }
        })
      })
      
      var draw_dot = (dot, z) => {
        var coords = projection(dot[0])
        var config = configs[dot[1]]
        ctx.beginPath()
        var dot_sf = Math.exp(0.07*z) - 1
       // dot_sf = 1
        ctx.strokeStyle = config.stroke
        ctx.fillStyle = config.fill
        ctx.lineWidth = config["stroke-width"]*dot_sf
        ctx.arc(coords[0]*2, coords[1]*2, config.radius*2*dot_sf, 0, 2 * Math.PI)
        ctx.fill()
        if (ctx.lineWidth > 0) {
          ctx.stroke()
        }
      }

      /*want the order to be more or less random but also not change, so seed a
      weight based on dot position*/
      ethnicity_dots.forEach((dot)=>{
        var rng = new seedrandom(dot[0][0] + dot[0][1])
        dot[2] = rng()
      });
      ethnicity_dots.sort((a, b)=>{
        return a[2] - b[2]
      })
      voucher_dots.forEach((dot)=>{
        var rng = new seedrandom(dot[0][0] + dot[0][1])
        dot[2] = rng()
        if (dot[1].indexOf("safmr")!==-1) {
          dot[2] -= 10
        }
      })
      
      voucher_dots.sort((a, b)=>{
        return a[2] - b[2]
      })

      /*to do - adapt this to use seeded rng so the dots don't change order when moving the map*/
      //ethnicity_dots = shuffle(ethnicity_dots, [z, cbsa].join("-"))
      ethnicity_dots.forEach((dot)=>{draw_dot(dot, z)})
      voucher_dots.forEach((dot)=>{draw_dot(dot, z)})
      resolve()

    })
    
  })
  
}