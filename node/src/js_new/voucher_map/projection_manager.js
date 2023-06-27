import { geoMercator, geoPath } from "d3"

function tile_coord_to_lat_long(x, y, z) {
  var n = Math.pow(2, z)
  var long = x/n*360 - 180
  var lat = Math.atan(Math.sinh(Math.PI * (1 - 2*y/n))) * 180 / Math.PI
  return {
    lat, long
  }
}

const ProjectionManager = function(map) {

  var projection, pathGen

  this.getProjection = function() {
    return projection
  }

  this.getPathGen = function() {
    return pathGen
  }

  this.updateProjection = function() {
    var coords = map.coordTracker.getCoords()
    var z = Math.floor(coords.z)
    var viewWidth = map.getViewportWidth()
    var viewHeight = map.getViewportHeight()
    var tileSize = 256
    tileSize += 256*(coords.z%1)
    var br_coords = {
      x: coords.x + viewWidth/tileSize,
      y: coords.y + viewHeight/tileSize,
      z
    }
    var tl = tile_coord_to_lat_long(coords.x, coords.y, z);
    var br = tile_coord_to_lat_long(br_coords.x, br_coords.y, z);
    projection = geoMercator().fitSize([viewWidth, viewHeight], {
      type: "Feature",
      geometry: {
        type:"Polygon",
        coordinates: [
          [
            [
              tl.long,
              tl.lat
            ],
            [
              br.long,
              tl.lat
            ],
            [
              br.long,
              br.lat
            ],
            [
              tl.long,
              br.lat
            ]
          ]
        ] 
      }
    })
    pathGen = geoPath(projection)
  }
}

export { ProjectionManager }