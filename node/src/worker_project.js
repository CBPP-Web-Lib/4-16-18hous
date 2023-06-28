import { geoMercator, geoPath } from "d3"

var pathGenerator, projection

onmessage = (e) => {
  if (e.data.msgType === "newProjection") {
    projection = geoMercator().fitSize(e.data.bounds.size, e.data.bounds.obj)
    pathGenerator = geoPath(projection)
    postMessage({msgType: "newProjection", result:"OK"})
  }
  if (e.data.msgType === "requestPathString") {
    var pathStrings = {}
    e.data.features.forEach((feature)=>{
      pathStrings[feature.properties.GEOID10] = pathGenerator(feature)
    })
    postMessage({msgType: "requestPathString", pathStrings})
  }
}