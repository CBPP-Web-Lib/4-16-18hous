import { geoMercator, geoPath } from "d3"

var pathGenerator, projection, base = [-103, 44], base_projected

onmessage = (e) => {
  if (e.data.msgType === "newProjection") {
    projection = geoMercator().fitSize(e.data.bounds.size, e.data.bounds.obj)
    pathGenerator = geoPath(projection)
    base_projected = projection(base)
    postMessage({msgType: "newProjection", result:"OK"})
  }
  if (e.data.msgType === "requestPathString") {
    let pathStrings = {}
    e.data.features.forEach((feature)=>{
      pathStrings[feature.properties.GEOID10] = pathGenerator(feature)
    })
    postMessage({msgType: "requestPathString", pathStrings})
    e.data.features = null
    pathStrings = null
  }
  if (e.data.msgType === "requestDotProjection") {
    let projectedChunk = []
    e.data.chunk.forEach((dot) => {
      if (typeof(dot[4])==="undefined") {
        let _coords = projection(dot[0])
        let coords = [_coords[0] - base_projected[0], _coords[1] - base_projected[1]]
        dot[4] = coords
      }
      projectedChunk.push(dot);
    })
    postMessage({msgType: "requestDotProjection", result: {chunk: projectedChunk}})
  }
}