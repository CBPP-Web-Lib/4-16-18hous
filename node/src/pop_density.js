var request = require("request");
var unzip = require("gunzip-file")
var ogr2ogr = require("ogr2ogr").default;
var JSONStream = require("JSONStream")
var fs = require("fs");
var fsPromises = require("fs/promises")
var turf = require("turf")

function latLongFromProjected(lat3857, long3857) {
  /*https://stackoverflow.com/questions/37523872/converting-coordinates-from-epsg-3857-to-4326*/
  const e = Math.E
  const X = 20037508.34
  const long4326 = (long3857*180)/X
  let lat4326 = lat3857/(X / 180)
  const exponent = (Math.PI / 180) * lat4326
  lat4326 = Math.atan(e ** exponent)
  lat4326 = lat4326 / (Math.PI / 360)
  lat4326 = lat4326 - 90
  return {
    lat: lat4326,
    long: long4326
  }
}

function get_kontur_pop_density() {
  return new Promise((resolve, reject) => {
    var dest = "./download/kontor_population.gpkg.gz"
    if (fs.existsSync(dest)) {
      resolve(dest);
      return;
    }
    var ws = fs.createWriteStream("./download/kontor_population.gpkg.gz");
    request("https://geodata-eu-central-1-kontur-public.s3.amazonaws.com/kontur_datasets/kontur_population_US_20220630.gpkg.gz")
      .pipe(ws);
    ws.on("finish", function() {
      console.log("finished downloading kontor pop density");
      resolve(dest);
    });
  }).then(function(src) {
    return new Promise((resolve, reject) => {
      var dest = "./shp/kontor_population.gpkg";
      if (fs.existsSync(dest)) {
        resolve(dest);
        return;
      }
      unzip(src, dest, function() {
        resolve(dest);
      })
    })
  }).then(function(src) {
    return new Promise((resolve, reject) => {
      var dest = "./geojson/kontor_population.json"
      if (fs.existsSync(dest)) {
        resolve(dest)
        return;
      }
      ogr2ogr(src, {
        format: "GeoJSON",
        maxBuffer: 1024*2014*500,
        destination: dest
      }).then(function() {
        resolve(dest)
      })
    })
  }).then(function(src) {
    return fsPromises.open(src, "r");
  }).then((handle) => {
    return new Promise((resolve) => {
      var dest = "./tmp/kontor_population.csv"
      if (fs.existsSync(dest)) {
       // resolve(dest);
       // return;
      }
      var parser = JSONStream.parse('features.*')
      var rs = handle.createReadStream({encoding:"utf-8"});
      rs.pipe(parser)
      var ws = fs.createWriteStream(dest);
      var round = n=>Math.round(n*1000000)/1000000
      parser.on("data", function(feature) {
        var coords = turf.center(feature).geometry.coordinates;
        var latlong = latLongFromProjected(
          coords[1],
          coords[0]
        );
        ws.write([round(latlong.long), round(latlong.lat), feature.properties.population].join(",") + "\n");
      })
      rs.on("end", function() {
        setTimeout(function() {
          resolve(dest)
          ws.end()
        }, 100)
      })
    })
  }).then((src) => {
    return new Promise((resolve) => {
      console.log("made it here");
      resolve();

    })
  });
}

module.exports = get_kontur_pop_density

