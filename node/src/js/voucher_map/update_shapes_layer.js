import { tractFill } from "./tract_fill"
import { bbox_overlap } from "./bbox_overlap"



export function updateShapesLayer() {
  var map = this
  var tract_shapefiles = map.cbsaManager.getTractShapefiles()
  var tract_features = tract_shapefiles.geojson
  var merged = tract_shapefiles.merged
  var inverted_merged = tract_shapefiles.inverted_merged
  var tract_bins = map.cbsaManager.getTractBins()
  var active_layer = map.dataLayerManager.getActiveLayer()
  var water = map.cbsaManager.getWaterShapes()
  var pathGen = map.projectionManager.getPathGen()
  /*limit draw/projection calculations to visible items*/
  var bounds = map.projectionManager.getBounds()
  var features = [];
  tract_features.features.forEach((feature)=>{
    if (bbox_overlap(feature.bbox, bounds)) {
      features.push(feature)
    } 
  })
  return new Promise((resolve)=>{
    /*farm out path string projection to web workers*/
    var worker_slots = map.projectionWorkers
    var pathStrings = {}
    var worker_queue = []
    var slot = 0
    features.forEach((feature, i) => {
      if (slot >= worker_slots.length) return
      worker_queue[slot] = worker_queue[slot] || []
      worker_queue[slot].push(feature)
      slot++
      if (slot >= worker_slots.length) {
        slot = 0
      }
    })
    var promise_slots = []
    worker_queue.forEach((features, slot)=>{
      promise_slots.push(new Promise((resolve)=>{
        worker_slots[slot].postMessage({
          msgType: "requestPathString",
          features
        })
        worker_slots[slot].pathStringCallback = resolve
      }))
    })
    Promise.all(promise_slots).then((results)=>{
      results.forEach((result)=>{
        Object.keys(result).forEach((geoid)=>{
          pathStrings[geoid] = result[geoid]
        })
      })
      resolve(pathStrings)
    })
    
  }).then(function(pathStrings) {
    return new Promise((resolve)=>{

      function display_water(map, water) {
        var water_features = []
        var svg = map.getSvg()
        water.forEach((file)=>{
          water_features = water_features.concat(file.features)
        })
        
        var viewWidth = map.getViewportWidth()
        var viewHeight = map.getViewportHeight()
        var pathGen = map.projectionManager.getPathGen()
        svg.select("defs").selectAll("mask#waterLayerClip")
          .data([1])
          .enter()
          .append("mask")
          .attr("id", "waterLayerClip")
        svg.select("mask#waterLayerClip").selectAll("rect.background")
          .data([1])
          .enter()
          .append("rect")
          .attr("class", "background")
          .attr("fill", "#fff")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", viewWidth)
          .attr("height", viewHeight);
        var waterClip = svg.select("mask#waterLayerClip")
          .selectAll("path.water")
          .data(water_features);
        waterClip.enter()
          .append("path")
          .attr("class","water")
          .attr("fill", "#000")
          .merge(waterClip)
          .attr("d", pathGen)
        waterClip.exit().remove()
      }


      var svg = map.getSvg().select("g.shapeLayer")
      var inverted_svg = map.getInvertedSvg().select("g.shapeLayer")
      var cbsa_group = svg.selectAll("g.cbsa_group")
        .data([1]);
      cbsa_group.enter()
        .append("g")
        .attr("class","cbsa_group")
        .merge(cbsa_group);
      var cbsa_path_string = pathGen(merged);
      var cbsa_inverted = inverted_svg.selectAll("path.cbsa_inverted")
        .data([inverted_merged]);
      cbsa_inverted
        .enter()
        .append("path")
        .attr("class","cbsa_inverted")
        .merge(cbsa_inverted)
        .attr("d", pathGen)
        .attr("fill", "rgba(255, 255, 255, 0.5");
      var cbsa_path = svg.select("g.cbsa_group").selectAll("path.cbsa")
        .data([1, 1]);
      cbsa_path.enter()
        .append("path")
        .attr("class","cbsa")
        .merge(cbsa_path)
        .attr("d", cbsa_path_string)
        .attr("fill", (d, i)=>{
          return "#fff"
        })
        .attr("stroke-width", (d, i)=>{
          if (i===0) {return 10}
          if (i===1) {return 1}
        })
        .attr("stroke", (d, i)=>{
          if (i===0) {return "#f57b42"}
          if (i===1) {return "#aaa"}
        })
        .attr("filter", (d, i)=>{
          if (i===0) {
            return "url(#blur)"
          }
        })
    
      var tract_layer = svg.selectAll("g.tractLayer")
        .data([1])
        .enter()
        .append("g")
        .attr("class", "tractLayer")
        .attr("mask", "url(#waterLayerClip)")
      var tracts = svg.select("g.tractLayer").selectAll("path.tract")
        .data(features, d=>d.properties.GEOID10);
      tracts
        .enter()
        .append("path")
        .attr("class","tract")
        .merge(tracts)
        .attr("d", (d)=>pathStrings[d.properties.GEOID10])
        .attr("fill", (d)=>{
          return tractFill({
            d,
            active_layer,
            tract_bins
          })
        })
        .attr("stroke-width", 0);
      tracts
        .exit()
        .remove()
      
      
      display_water(map, water);
      resolve(features);
    });
  })
}