import { geoMercator, geoPath } from "d3"

var base = [-103, 44]
var projections = {}, pathGenerators = {}, base_projections = {};

onmessage = (e) => {
  if (e.data.msgType === "newProjection") {
    projections[e.data.id] = geoMercator().fitSize(e.data.bounds.size, e.data.bounds.obj)
    pathGenerators[e.data.id] = geoPath(projections[e.data.id])
    base_projections[e.data.id] = projections[e.data.id](base)
    postMessage({msgType: "newProjection", result:"OK", id: e.data.id})
  }
  if (e.data.msgType === "requestPathString") {
    let pathStrings = {}
    e.data.features.forEach((feature)=>{
      pathStrings[feature.properties.GEOID10] = pathGenerators[e.data.id](feature)
    })
    postMessage({msgType: "requestPathString", pathStrings, id: e.data.id})
    e.data.features = null
    pathStrings = null
  }
  if (e.data.msgType === "requestDotProjection") {
    let projectedChunk = []
    e.data.chunk.forEach((dot) => {
      if (typeof(dot[4])==="undefined") {
        let _coords = projections[e.data.id](dot[0])
        let coords = [_coords[0] - base_projections[e.data.id][0], _coords[1] - base_projections[e.data.id][1]]
        dot[4] = coords
      }
      projectedChunk.push(dot);
    })
    postMessage({msgType: "requestDotProjection", id: e.data.id, result: {chunk: projectedChunk}})
  }
}