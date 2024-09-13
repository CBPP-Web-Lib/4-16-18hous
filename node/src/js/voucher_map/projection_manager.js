import { geoMercator, geoPath } from "d3"

function tileCoordToLatLong (x, y, z) {
  var n = Math.pow(2, z)
  var long = x/n*360 - 180
  var lat = Math.atan(Math.sinh(Math.PI * (1 - 2*y/n))) * 180 / Math.PI
  return {
    lat, long
  }
}

function latLongToTileCoord (lon_deg, lat_deg, z) {
  var n = Math.pow(2, z)
  var x = n * ((lon_deg + 180) / 360)
  var lat_rad = lat_deg/180 * Math.PI
  var y = n * (1 - (Math.log(Math.tan(lat_rad) + (1/Math.cos(lat_rad))) / Math.PI)) / 2
  return { x, y, z }
}

const ProjectionManager = function(map) {

  var projection, pathGen, bounding_obj

  this.getProjection = function() {
    return projection
  }

  this.getPathGen = function() {
    return pathGen
  }

  this.getBoundingObj = function() {
    return bounding_obj
  }

  this.getBounds = function() {
    return [tl.long, br.lat, br.long, tl.lat]
  }

  this.latLongToTileCoord = latLongToTileCoord

  this.getLatLongFromClick = function(x, y) {
    var coords = map.coordTracker.getCoords()
    var latlong = tileCoordToLatLong(coords.x + x/256, coords.y + y/256, Math.floor(coords.z));
    return latlong;
  }

  var tl, br

  this.updateProjection = function() {
    console.log("update projection for " + map.getId())
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
    tl = tileCoordToLatLong(coords.x, coords.y, z);
    br = tileCoordToLatLong(br_coords.x, br_coords.y, z);
    bounding_obj = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type:"Point",
            coordinates: [
              tl.long,
              tl.lat
            ]
          }
        },
        {
          type: "Feature",
          geometry: {
            type:"Point",
            coordinates: [
              br.long,
              tl.lat
            ]
          }
        },
        {
          type: "Feature",
          geometry: {
            type:"Point",
            coordinates: [
              br.long,
              br.lat
            ]
          }
        },
        {
          type: "Feature",
          geometry: {
            type:"Point",
            coordinates: [
              tl.long,
              br.lat
            ]
          }
        },
      ]
    };
    projection = geoMercator().fitSize([viewWidth, viewHeight], bounding_obj)
    pathGen = geoPath(projection)
    var projectionUpdatePromises = [];
    function workerPromiseGen(worker) {
      return new Promise((resolve)=>{
        worker.postMessage({
          msgType: "newProjection",
          id: map.getId(),
          bounds: {
            size: [viewWidth, viewHeight], 
            obj: bounding_obj
          }
        })
        worker.newProjectionCallback[map.getId()] = function(e) {
          resolve()
        };
      })
    }
    map.projectionWorkers.forEach((worker)=>{
      projectionUpdatePromises.push(workerPromiseGen(worker))
    })
    if (map.dotWorkers) {
      map.dotWorkers.forEach((worker)=>{
        projectionUpdatePromises.push(workerPromiseGen(worker))
      })
    }
    return Promise.all(projectionUpdatePromises)
  }
}

export { ProjectionManager, tileCoordToLatLong, latLongToTileCoord }