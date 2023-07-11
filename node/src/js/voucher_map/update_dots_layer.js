import seedrandom from "seedrandom"
import { featureContains } from "./feature_contains"
import { dotConfig } from "./dot_config"
import { bbox_overlap } from "./bbox_overlap"
import { shuffle } from "./shuffle_array"
import high_density_cbsa from "../high_density_cbsa";
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

function handle_feature(args) {
  var { feature, name, dot_represents, these_dots, water } = args
  var geoid = feature.properties.GEOID10
  var bbox = feature.bbox
  var width = bbox[2] - bbox[0]
  var height = bbox[3] - bbox[1]
  var num_dots = feature.properties.housing_data[name][dot_represents]
  var dots_made = these_dots.length
  var attempt = 0
  var total_attempts = 0
  while (dots_made < num_dots && total_attempts < num_dots*5) {
    total_attempts++
    var seed = [geoid, name, dot_represents, dots_made, attempt].join("")
    attempt++;
    var rng = new seedrandom(seed)
    var dot = [
      rng()*width + bbox[0],
      rng()*height + bbox[1]
    ]
    var in_water = false;
    water.forEach((collection)=>{
      if (in_water) return;
      collection.features.forEach((water_feature)=>{
        if (in_water) return;
        if (!bbox_overlap(feature.bbox, water_feature.bbox)) {
          return;
        }
        if (featureContains(dot, water_feature)) {
          in_water = true;
        }
      })
      if (in_water) {
        return;
      }
    })
    if (featureContains(dot, feature) && !in_water) {
      these_dots.push(dot)
      dots_made = these_dots.length
      attempt = 0
    }
  }
  these_dots = these_dots.slice(0, num_dots)
  return these_dots
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
    //var all_water_features = [];
    water.forEach((water_group)=>{
      water_group.features.forEach((feature)=>{
        //all_water_features.push(feature)
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
            feature_piles[worker_slot].push({
              feature, 
              name, 
              dot_represents, 
              these_dots: layer_data.tracts[geoid].dots 
            })
            worker_slot++
            if (worker_slot >= map.dotWorkers.length) {
              worker_slot = 0
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
          console.log(pile)
          map.dotWorkers[i].postMessage({
            msgType: "requestDotLocations",
            features: JSON.stringify(pile)
          })
          //pile.length = 0
          map.dotWorkers[i].dotLocationCallback = (data)=>{
            Object.keys(data).forEach((geoid)=>{
              var layer_id = [data[geoid].name, data[geoid].dot_represents].join("_")
              var layer_data = dot_data_layer[layer_id]
              layer_data.tracts[geoid].dots = data[geoid].dots
            })
            resolve()
          }
        }))
      })
      return Promise.all(dot_tasks)
    }).then(()=>{
      console.log("calculated positions");
      console.log(Date.now() - start_time)
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
    
      var ctx = map.getCanvasContext()
      var canvas = map.getCanvas()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      var draw_dot = (dot) => {
        var coords = projection(dot[0])
        var config = configs[dot[1]]
        ctx.beginPath()
        ctx.strokeStyle = config.stroke
        ctx.fillStyle = config.fill
        ctx.lineWidth = config["stroke-width"]
        ctx.arc(coords[0]*2, coords[1]*2, config.radius*2, 0, 2 * Math.PI)
        ctx.fill()
        if (ctx.lineWidth > 0) {
          ctx.stroke()
        }
      }
      ethnicity_dots = shuffle(ethnicity_dots, [z, cbsa].join("-"))
      ethnicity_dots.forEach(draw_dot)
      voucher_dots.forEach(draw_dot)
      
      console.log("drew dots");
      console.log(Date.now() - start_time)
      resolve()

    })
    
  })
  
}