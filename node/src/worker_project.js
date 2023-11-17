import { geoMercator, geoPath } from "d3"

var pathGenerator, projection

onmessage = (e) => {
  if (e.data.msgType === "newProjection") {
    projection = geoMercator().fitSize(e.data.bounds.size, e.data.bounds.obj)
    pathGenerator = geoPath(projection)
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
      let coords = projection(dot[0])
      dot[0] = coords
      projectedChunk.push(dot);
    })
    postMessage({msgType: "requestDotProjection", result: {chunk: projectedChunk}})
  }
}