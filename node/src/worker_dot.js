import { geoMercator, geoPath } from "d3"

import { featureContains } from "./js/voucher_map/feature_contains.js"
import seedrandom from "seedrandom"
import { bbox_overlap } from "./js/voucher_map/bbox_overlap.js"

import { handle_dots_for_feature } from "./js/voucher_map/handle_dots_for_feature"

var projection, water;

onmessage = (e) => {
  if (e.data.msgType === "newProjection") {
    projection = geoMercator().fitSize(e.data.bounds.size, e.data.bounds.obj)
    postMessage({msgType: "newProjection", result:"OK"})
    e.data.bounds = null
  }
  if (e.data.msgType === "requestDotLocations") {
    let features = e.data.features
    let do_not_use_density = e.data.do_not_use_density
    let results = {}
    features.forEach((feature, i)=>{
      let dots = handle_dots_for_feature(feature, water, {featureContains, seedrandom, bbox_overlap}, do_not_use_density)
      var { layer_id } = feature
      results[layer_id] = results[layer_id] || {}
      results[layer_id][feature.feature.properties.GEOID10] = dots
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