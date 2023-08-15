import * as deepcopy from 'deepcopy/index.js'

function removeHoles(_geometry) {
  var geometry = deepcopy(_geometry);
  if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon, i)=>{
      geometry.coordinates[i] = removeHolesFromPolygon(polygon)
    })
  } else if (geometry.type === "Polygon") {
    geometry.coordinates = removeHolesFromPolygon(geometry.coordinates)
  }
  return geometry;
}

function removeHolesFromPolygon(_polygon) {
  var polygon = deepcopy(_polygon)
  polygon.length = 1
  return polygon
}

export { removeHoles }