import { dotConfig } from "./dot_config"
import { bbox_overlap } from "./bbox_overlap"
import { shuffle } from "./shuffle_array"
import seedrandom from "seedrandom"
import { get_deflator } from "./dot_deflator"
//import high_density_cbsa from "../high_density_cbsa"
import hexRgb from 'hex-rgb'
import axios from 'axios'
import { getURLBase } from "../get_url_base"
import pako from "pako"
import { mode, use_pop_density } from "./mode"

const dot_cache = {};

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

export function updateDotsLayer(visible_features) {
  var map = this

  return new Promise((resolve)=> {
    var start_time = Date.now()
    var cbsa = map.cbsaManager.getLoadedCbsa()
    var worker_setup_tasks = []
    var z = Math.round(map.coordTracker.getCoords().z)
    var projection = map.projectionManager.getProjection()
    var bounds = map.projectionManager.getBounds()
    if (mode !== "download") {
      var pop_density = map.cbsaManager.getPopDensity()
      /*if (high_density_cbsa[cbsa]) {
        z += high_density_cbsa[cbsa]
      }*/
      var water = map.cbsaManager.getWaterShapes()
      var water_features = [];
      water.forEach((water_group)=>{
        water_group.features.forEach((feature)=>{
          if (bbox_overlap(feature.bbox, bounds)) {
            water_features.push(feature)
          } 
        })
      })

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
    } else {
      worker_setup_tasks.push(Promise.resolve())
    }
    Promise.all(worker_setup_tasks).then(function() {
      var active_dots_layer = map.dataLayerManager.getActiveDotsLayers()
      if (mode === "download") {
        var downloads = [];
        var url_base = getURLBase();
        active_dots_layer.forEach((dot_layer) => {
          var config = load_dot_config(dot_layer)
          var dot_represents = config.numDots(z)
          var layer_id = dot_layer + "_" + dot_represents
          if (dot_layer.indexOf("none") !== -1) {
            return;
          }
          downloads.push(new Promise((resolve) => {
            var options = {
              responseType: 'arraybuffer'
            }
            var file = cbsa + "/" + dot_layer + "_" + dot_represents
            if (dot_cache[file]) {
              resolve(dot_cache[file])
              return;
            }
            axios.get(url_base +"/data/dots/" + file + ".bin", options).then((response) => {
              var dots = pako.inflate(response.data, {to: "string"})
              dots = dots.split("\n");
              dots[0] = dots[0].split(",");
              dots[0][0]*=1;
              dots[0][1]*=1;
              for (var i = 1, ii = dots.length; i<ii; i++) {
                dots[i] = dots[i].split(",");
                dots[i][0]*=1;
                dots[i][1]*=1;
                dots[i][0] += dots[0][0]
                dots[i][1] += dots[0][1];
              }
              dots.shift()
              var result = {
                layer: dot_layer,
                layer_id,
                dot_represents,
                dots
              };
              dot_cache[file] = result
              resolve(result)
            })
          }))
        })
        var dot_tasks = downloads
      } else {
        var dot_deflator = get_deflator(map.cbsaManager.getDotDensity())
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
              var num_dots = Math.round(feature.properties.housing_data[name][dot_represents] * dot_deflator)
              if (layer_data.tracts[geoid].dots.length !== num_dots) {
                feature_piles[worker_slot].push({
                  feature,
                  name, 
                  dot_represents,
                  layer_id,
                  these_dots: layer_data.tracts[geoid].dots,
                  dot_deflator,
                  pop_density
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
              features: pile,
              do_not_use_density: use_pop_density==="off"
            })
            pile = null
            map.dotWorkers[i].dotLocationCallback = (data)=>{
              Object.keys(data).forEach((layer_id)=>{
                Object.keys(data[layer_id]).forEach((geoid)=>{
                  var layer_data = dot_data_layer[layer_id]
                  layer_data.tracts[geoid].dots = data[layer_id][geoid]
                })
              })
              resolve()
            }
          }))
        })
        feature_piles = null
      }
      return Promise.all(dot_tasks)
    }).then((d)=>{
      var ctx = map.getCanvasContext()
      var canvas = map.getCanvas()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      var dotsLayer = map.getTransparencyContainer().querySelectorAll("canvas")[0];
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
    
      var voucher_dots = []
      var ethnicity_dots = []
      var configs = {}

      /*draw voucher dots above ethnicity dots and randomize order of ethnicity dots*/
      /*download*/
      if (mode==="download") {
        d.forEach((file) => {
          configs[file.layer] = load_dot_config(file.layer)
          var ethnicity = false;
          if (file.layer.indexOf("ethnicity")!==-1) {
            ethnicity = true;
          }
          file.dots.forEach((dot) => {
            if (in_bounds(dot, bounds)) {
              if (ethnicity) {
                ethnicity_dots.push([dot, file.layer]);
              } else {
                voucher_dots.push([dot, file.layer]);
              }
            }
          })
        })
      } else {
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

      }
      /*To speed up a few repetitive tasks in dot drawing*/
      var pi2 = 2*Math.PI;
      var ScaleFactorCalc = function() {
        var cache = {}
        this.calc = function(z) {
          if (cache[z]) {return cache[z]}
          cache[z] = Math.exp(0.07*z) - 1
          return cache[z]
        }
      }
      var LayerTypeGetter = function() {
        var cache = {};
        this.calc = function(name) {
          if (cache[name]) {return cache[name]}
          cache[name] = name.split("_")[0];
          return cache[name];
        }
      }
      var MultiplierCache = function() {
        var cache = {};
        this.calc = function(a, b) {
          if (typeof(cache[a])==="undefined") {
            cache[a] = {}
          }
          if (typeof(cache[a][b] === "undefined")) {
            cache[a][b] = a*b;
          }
          return cache[a][b]
        }
        this.getCache = function() {return cache;}
      }
      var scaleFactorCalcInstance = new ScaleFactorCalc();
      var layerNameCacheInstance = new LayerTypeGetter();
      var multiplierCacheInstance = new MultiplierCache();
      var draw_dot = (dot, z) => {
        var layer_type = layerNameCacheInstance.calc(dot[1]);
        var coords = projection(dot[0])
        var config = configs[dot[1]]
        ctx.beginPath()
        var dot_sf = scaleFactorCalcInstance.calc(z)
        ctx.strokeStyle = config.stroke
        ctx.fillStyle = config.fill
        ctx.lineWidth = multiplierCacheInstance.calc(config["stroke-width"], dot_sf) 
        var x = coords[0]*2;
        var y = coords[1]*2;
        var r = multiplierCacheInstance.calc(multiplierCacheInstance.calc(config.radius, 2), dot_sf);
        if (layer_type === "ph") {
          /*draw square*/
          var twiceR = multiplierCacheInstance.calc(r, 2)
          ctx.fillRect(x - r, y - r, twiceR, twiceR)
          if (ctx.lineWidth > 0) {
            ctx.strokeRect(x - r, y - r, twiceR, twiceR)
          }
        } else if (layer_type === "pbra") {
          /*draw triangle*/
          ctx.beginPath()
          var _r = r*1.3
          ctx.moveTo(x - _r, y + _r)
          ctx.lineTo(x, y - _r)
          ctx.lineTo(x + _r, y + _r)
          ctx.lineTo(x - _r, y + _r)
          ctx.fill()
          if (ctx.lineWidth > 0) {
            ctx.stroke()
          }
        } else {
          /*draw dot*/
          ctx.arc(x, y, r, 0, pi2)
          ctx.fill()
          if (ctx.lineWidth > 0) {
            ctx.stroke()
          }
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
      console.log(multiplierCacheInstance.getCache())
      resolve()

    })
    
  })
  
}

function in_bounds(dot, bounds) {
  var result = true;
  if (dot[0] < bounds[0]) {result = false;}
  if (dot[0] > bounds[2]) {result = false;}
  if (dot[1] < bounds[1]) {result = false;}
  if (dot[1] > bounds[3]) {result = false;}
  return result;
}