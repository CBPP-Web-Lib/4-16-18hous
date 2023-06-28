import seedrandom from "seedrandom"
import {select as d3_select} from "d3"
import { featureContains } from "./feature_contains"
import { dotConfig } from "./dot_config"
import { bbox_overlap } from "./bbox_overlap"
const dot_data_layer = {}

export function updateDotsLayer(visible_features) {
  var map = this
  var z = Math.floor(map.coordTracker.getCoords().z)
  var projection = map.projectionManager.getProjection()
  var water = map.cbsaManager.getWaterShapes()
  var active_dots_layer = map.dataLayerManager.getActiveDotsLayers()
  Object.keys(dot_data_layer).forEach((layer_id)=>{
    var name = dot_data_layer[layer_id].name
    var dot_represents = dotConfig[name].numDots(z)
    if (dot_data_layer[layer_id].dotRepresents !== dot_represents) {
      delete(dot_data_layer[layer_id])
    }
  })
  active_dots_layer.forEach((name)=>{
    var dot_represents = dotConfig[name].numDots(z)
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
        var bbox = feature.bbox
        var width = bbox[2] - bbox[0]
        var height = bbox[3] - bbox[1]
        var geoid = feature.properties.GEOID10
        var num_dots = feature.properties.housing_data[name][dot_represents]
        layer_data.tracts[geoid] = layer_data.tracts[geoid] || {
          dots: []
        }
        layer_data.tracts[geoid].old = false
        var dots_made = layer_data.tracts[geoid].dots.length
        var attempt = 0
        while (dots_made < num_dots) {
          var seed = [geoid, dot_represents,dots_made,attempt].join("")
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
          })
          if (in_water) {
            return;
          }
          if (featureContains(dot, feature)) {
            layer_data.tracts[geoid].dots = layer_data.tracts[geoid].dots || []
            layer_data.tracts[geoid].dots.push(dot)
            dots_made = layer_data.tracts[geoid].dots.length
            attempt = 0
          }
        }
        if (layer_data.tracts[geoid].dots.length > num_dots) {
          layer_data.tracts[geoid].dots = layer_data.tracts[geoid].dots.slice(0, num_dots)
        }
      }
    })
    Object.keys(layer_data.tracts).forEach((geoid)=>{
      if (layer_data.tracts[geoid].old) {
        delete(layer_data.tracts[geoid])
      }
    })
  })
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
  var dot_layer_sel = map.getSvg().select("g.dotsLayer")
    .selectAll("g.dotLayer")
    .data(draw_dot_layers, d=>d.id);
  dot_layer_sel.enter()
    .append("g")
    .attr("class","dotLayer")
    .merge(dot_layer_sel)
    .each(function(d){
      var config = dotConfig[d.name];
      console.log(config)
      var dots = d3_select(this)
        .selectAll("circle.dot")
        .data(d.dots);
      dots.enter()
        .append("circle")
        .attr("class","dot")
        .merge(dots)
        .each(function(d) {
          var point = projection(d)
          d3_select(this)
            .attr("r", config.radius)
            .attr("cx", point[0])
            .attr("cy", point[1])
            .attr("fill", config.fill)
            .attr("fill-opacity", config["fill-opacity"])
            .attr("stroke-width", config["stroke-width"])
            .attr("stroke", config.stroke)
            .attr("stroke-opacity", config["stroke-opacity"])
            
        })
      dots.exit().remove()
    })
  dot_layer_sel.exit().remove()
}