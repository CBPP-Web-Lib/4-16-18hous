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

function loadDotConfig(name) {
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

function updateDotsLayer(visible_features, extra_args) {
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
          var config = loadDotConfig(dot_layer)
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
          var config = loadDotConfig(name)
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
          var config = loadDotConfig(name)
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
      var draw_dot_layers = [];
      var ctx;
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
          configs[file.layer] = loadDotConfig(file.layer)
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
          configs[layer.name] = loadDotConfig(layer.name)
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
        //var coords = projection(dot[0])
        var coords = dot[5]
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

      var offset = projection([-103, 44]);

      var total_dots = ethnicity_dots.length + voucher_dots.length;
      var chunk_size = total_dots / Math.max(1, (map.projectionWorkers.length - 1))
      var current_chunk = []
      var chunks = []

      function add_to_chunk(dot) {
        if (current_chunk.length > chunk_size) {
          chunks.push(current_chunk)
          current_chunk = []
        }
        dot[0][0] = Math.round(dot[0][0]*10000)/10000
        dot[0][1] = Math.round(dot[0][1]*10000)/10000
        var dot_address = dot[0].join("-");
        dot_cache[z] = dot_cache[z] || {}
        if (typeof(dot_cache[z][dot_address]) !== "undefined") {
          dot[5] = dot_cache[z][dot_address]
        } 
        current_chunk.push(dot)
      }

      ethnicity_dots.forEach(add_to_chunk)
      voucher_dots.forEach(add_to_chunk)
      chunks.push(current_chunk)
      var worker_slots = map.projectionWorkers
      var worker_queue = []
      var slot = 0
      chunks.forEach((chunk, i) => {
        if (slot >= worker_slots.length) return
        worker_queue[slot] = {chunk, i};
        slot++
        if (slot >= worker_slots.length) {
          slot = 0
        }
      })
      var promise_slots = []
      var id = map.getId()
      console.log(id);
      worker_queue.forEach((chunkMeta, slot)=>{
        promise_slots.push(new Promise((resolve)=>{
          var {chunk, i} = chunkMeta
          worker_slots[slot].postMessage({
            msgType: "requestDotProjection",
            id,
            chunk
          })
          worker_slots[slot].dotProjectionCallback[id] = function(d) {
            var {chunk} = d
            resolve({chunk, i})
          }
        }))
      })
      Promise.all(promise_slots).then((results)=>{
        return new Promise((resolve, reject) => {
          var projected_chunks = []
          dot_cache[z] = dot_cache[z] || {}
          results.forEach((result)=>{
            result.chunk.forEach((dot) => {
              dot_cache[z][dot[0].join("-")] = dot[4]
              dot[5] = []
              dot[5][0] = offset[0] + dot[4][0]
              dot[5][1] = offset[1] + dot[4][1]
            })
            projected_chunks[result.i] = result.chunk
          })
          resolve(projected_chunks)
        });
      }).then(function(chunks) {
        if (extra_args) {
          if (extra_args.destroyOldCanvas) {
            map.destroyOldCanvas(true)
          }
        }
        map.remakeCanvas()
        ctx = map.getCanvasContext()
        function draw_next_chunk() {
          var current_chunk = chunks[0]
          chunks.shift()
          current_chunk.forEach((dot) => {draw_dot(dot, z)})
        }
        while (chunks.length > 0) {
          draw_next_chunk()
        }
        //map.destroyOldCanvas()
        resolve();
      })

    })
    
  })
  
}

export {loadDotConfig, updateDotsLayer}

function in_bounds(dot, bounds) {
  var result = true;
  if (dot[0] < bounds[0]) {result = false;}
  if (dot[0] > bounds[2]) {result = false;}
  if (dot[1] < bounds[1]) {result = false;}
  if (dot[1] > bounds[3]) {result = false;}
  return result;
}