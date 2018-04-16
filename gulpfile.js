/*globals require, Promise*/
var gl = require("./CBPP_shared_gulp/gulplib.js")(), gulp = gl.gulp, fs = gl.fs;
var request = require("request");
var unzip = require("gulp-unzip");
var ogr2ogr = require("ogr2ogr");
var topojson = require("topojson");
var geojson_bbox = require("geojson-bbox");
gl.gulp.task("cbpp_shared_lib", function(cb) {
  gl.get_cbpp_shared_libs(["CBPP_Figure"], cb);
});
gl.gulp.task("download_shapefiles", function(cb) {
  var folder = "https://www2.census.gov/geo/tiger/TIGER2015/";
  var files = [
    "CBSA/tl_2015_us_cbsa.zip",
    "CNECTA/tl_2015_us_cnecta.zip",
    "CSA/tl_2015_us_csa.zip",
    "METDIV/tl_2015_us_metdiv.zip",
    "NECTA/tl_2015_us_necta.zip",
    "NECTADIV/tl_2015_us_nectadiv.zip"
  ];
  var requests = [];
  gl.makeDirectory("./download", function() {
    files.forEach(function(f) {
      requests.push(new Promise(function(resolve, reject) {
        try {
          if (fs.existsSync("./download/" + f.split("/")[1])) {
            resolve();
          } else {
            var ws = fs.createWriteStream("./download/" +  f.split("/")[1]);
            request(folder + f)
              .pipe(ws);
            ws.on("finish", function() {
              console.log("finished downloading " + f);
              resolve();
            });
          }
        } catch (ex) {
          console.log(ex);
          reject(ex);
        }
      }));
    });
    Promise.all(requests).then(function() {
      cb();
    });
  });
});
gl.gulp.task("unzip_shapefiles", ["download_shapefiles"], function(cb) {
  gl.makeDirectory("./shp", function() {
    var zips = fs.readdirSync("./download");
    var requests = [];
    zips.forEach(function(f) {
      var name = f.split(".")[0];
      gl.makeDirectory("./shp/" + name, function() {
        requests.push(new Promise(function(resolve, reject) {
          try {
            if (fs.readdirSync("./shp/" + name ).length > 0) {
              resolve();
            } else {
              gulp.src("./download/" + f)
                .pipe(unzip())
                .pipe(gulp.dest("./shp/" + name))
                .on("finish", resolve);
            }
          } catch (ex) {
            console.log(ex);
            reject(ex);
          }
        }));
      });
    });
    Promise.all(requests).then(function() {
      cb();
    });
  });
});
gl.gulp.task("ogr2ogr", ["geojson_dir","unzip_shapefiles"], function(cb) {
  var shp = fs.readdirSync("./shp");
  var requests = [];
  shp.forEach(function(f) {
    requests.push(new Promise(function(resolve, reject) {
      try {
        if (fs.existsSync("./geojson/" + f + ".json")) {
          resolve();
        } else {
          var geojson = ogr2ogr('./shp/' + f + "/" + f + ".shp")
            .format('GeoJSON')
            .timeout(600000)
            .stream();
          geojson.pipe(fs.createWriteStream('./geojson/' + f + ".json"))
            .on("finish", function() {
              resolve();
          });
        }
      } catch (ex) {
        console.log(ex);
        reject(ex);
      }
    }));
  });
  Promise.all(requests).then(function() {
    cb();
  });
});
function makeDirectory(d, cb) {
  fs.mkdir(d, function(e) {
    if (e!==null) {
      if (e.code!=="EEXIST") {
        throw new Error(e);
      }
    }
    cb();
  });
}
gl.gulp.task("geojson_dir", function(cb) {
  makeDirectory("./geojson", cb);
});
gl.gulp.task("topojson_dir", function(cb) {
  makeDirectory("./topojson", cb);
});
gl.gulp.task("topojson", ["topojson_dir","ogr2ogr","buildDirectory"], function(done) {
  var files = fs.readdirSync("./geojson");
  var sizes = [];
  sizes.push(new Promise(function(resolve) {
    topojson_out({
      quantize:4000,
      simplify:0.01,
      dest:"./topojson/low/"
    }, resolve);
  }));
  sizes.push(new Promise(function(resolve) {
    topojson_out({
      quantize:40000,
      simplify:0.003,
      dest:"./topojson/medium/"
    }, resolve);
  }));
  sizes.push(new Promise(function(resolve) {
    topojson_out({
      quantize:400000,
      simplify:0.0001,
      dest:"./topojson/high/"
    }, resolve);
  }));
  Promise.all(sizes).then(function() {
    done();
  });
  function topojson_out(settings, _cb) {
    var converts = [];
    files.forEach(function(f) {
      converts.push(new Promise(function(resolve) {
        gl.makeDirectory(settings.dest, function() {
          if (fs.existsSync(settings.dest + f)) {
            resolve();
          } else {
            var geo = JSON.parse(fs.readFileSync("./geojson/" + f, {
              encoding: "utf-8"
            }));
            var topo = topojson.topology({districts:geo});
            topo = topojson.quantize(topo, settings.quantize);
            topo = topojson.presimplify(topo);
            topo = topojson.simplify(topo, settings.simplify);
            fs.writeFileSync(settings.dest + f, JSON.stringify(topo));
            resolve();
          }
        });
      }));
    });
    Promise.all(converts).then(function() {
      _cb();
    });
  }
});

gl.gulp.task("topojson_grid", ["topojson"], function() {
  var gridSize = {
    "high":0.2,
    "medium":2,
    "low":20
  };
  gl.makeDirectory("./grid", function() {
    var sizes = fs.readdirSync("./topojson");
    sizes.forEach(function(f) {
      if (typeof(gridSize[f])==="undefined") {
        console.log("no grid size defined for " + f + ", ignoring");
      } else {
        topoGrids(gridSize[f], f);
      }
    });
  });
  function topoGrids(tileSize, file) {
    var files = fs.readdirSync("./topojson/" + file);
    files.forEach(function(f) {
      gl.makeDirectory("./grid/" + f.split(".")[0], function() {
        topoGrid(tileSize, file, f);
      });
    });
  }
  function topoGrid(tileSize, dir, file) {
    var topo = JSON.parse(fs.readFileSync("./topojson/" + dir + "/" + file, {
      encoding: "utf-8"
    }));
    var geo = topojson.feature(topo, topo.objects.districts);
    geo.features.forEach(function(f) {
      var bbox = geojson_bbox(f);
      console.log(bbox);
    });
  }
});
