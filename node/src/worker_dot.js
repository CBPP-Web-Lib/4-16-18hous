import { geoMercator, geoPath } from "d3"
import { featureContains } from "./js/voucher_map/feature_contains"
import seedrandom from "seedrandom"
import { bbox_overlap } from "./js/voucher_map/bbox_overlap"

var projection, water

function handle_feature(args) {
  var { feature, name, dot_represents, layer_id, these_dots, dot_deflator } = args
  var geoid = feature.properties.GEOID10
  var bbox = feature.bbox
  var width = bbox[2] - bbox[0]
  var height = bbox[3] - bbox[1]
  var num_dots = Math.round(feature.properties.housing_data[name][dot_represents] * dot_deflator)
  var dots_made = these_dots.length
  var attempt = 0
  var total_attempts = 0
  while (dots_made < num_dots && total_attempts < num_dots*20) {
    total_attempts++
    if (total_attempts >= num_dots*20) {
      console.log("Warning: aborted dot draw after too many failed attempts")
    }
    var seed = [geoid, name, dot_represents, dots_made, attempt].join("")
    attempt++;
    var rng = new seedrandom(seed)
    var dot = [
      rng()*width + bbox[0],
      rng()*height + bbox[1]
    ]
    dot[0] = Math.round(dot[0]*100000)/100000
    dot[1] = Math.round(dot[1]*100000)/100000
    var in_water = false;
    water.forEach((water_feature)=>{
      if (in_water) return;
      if (!bbox_overlap(feature.bbox, water_feature.bbox)) {
        return;
      }
      if (featureContains(dot, water_feature)) {
        in_water = true;
      }
    })
    //in_water = false
    if (featureContains(dot, feature) && !in_water) {
      these_dots.push(dot)
      dots_made = these_dots.length
      attempt = 0
    }
  }
  //these_dots = these_dots.slice(0, num_dots)
  return these_dots
}

onmessage = (e) => {
  if (e.data.msgType === "newProjection") {
    projection = geoMercator().fitSize(e.data.bounds.size, e.data.bounds.obj)
    postMessage({msgType: "newProjection", result:"OK"})
    e.data.bounds = null
  }
  if (e.data.msgType === "requestDotLocations") {
    let features = e.data.features
    let results = {}
    features.forEach((feature, i)=>{
      let dots = handle_feature(feature)
      var { layer_id } = feature
      results[layer_id] = results[layer_id] || {}
      results[layer_id][feature.feature.properties.GEOID10] = { 
        dots: dots, 
        name: feature.name,
        layer_id: feature.layer_id,
        dot_represents: feature.dot_represents 
      }
      //feature.feature.geometry = null
      //features[i] = null
    })
    postMessage({msgType: "requestDotLocations", dotLocations: results})
    e.data.features = null
  }
  if (e.data.msgType === "newWater") {
    water = e.data.water
    postMessage({msgType: "newWater", result: "OK"})
    e.data.water = null
  }
}