/*globals require, Promise*/
var gl = require("./CBPP_shared_gulp/gulplib.js")(), gulp = gl.gulp, fs = gl.fs;
var request = require("request");
var unzip = require("gulp-unzip");
var ogr2ogr = require("ogr2ogr");
var topojson = require("topojson");
var geojson_bbox = require("geojson-bbox");
var fips = require("./fips.json");
function zeroPad(fips) {
  fips = fips + "";
  while (fips.length < 2) {
    fips = "0" + fips;
  }
  return fips;
}
gl.gulp.task("cbpp_shared_lib", function(cb) {
  gl.get_cbpp_shared_libs(["CBPP_Figure"], cb);
});
gl.gulp.task("download_shapefiles", function(cb) {
  var files = [
    "https://www2.census.gov/geo/tiger/TIGER2015/CBSA/tl_2015_us_cbsa.zip",
    "https://www2.census.gov/geo/tiger/TIGER2015/CNECTA/tl_2015_us_cnecta.zip",
    "https://www2.census.gov/geo/tiger/TIGER2015/CSA/tl_2015_us_csa.zip",
    "https://www2.census.gov/geo/tiger/TIGER2015/METDIV/tl_2015_us_metdiv.zip",
    "https://www2.census.gov/geo/tiger/TIGER2015/NECTA/tl_2015_us_necta.zip",
    "https://www2.census.gov/geo/tiger/TIGER2015/NECTADIV/tl_2015_us_nectadiv.zip"
  ];
  for (var state in fips) {
    if (fips.hasOwnProperty(state)) {
      files.push("https://www2.census.gov/geo/tiger/TIGER2010/TRACT/2010/tl_2010_" + zeroPad(state) + "_tract10.zip");
    }
  }
  var requests = [];
  gl.makeDirectory("./download", function() {
    files.forEach(function(f) {
      requests.push(new Promise(function(resolve, reject) {
        try {
          var filename = f.split("/")[f.split("/").length - 1];
          if (fs.existsSync("./download/" + filename)) {
            resolve();
          } else {
            var ws = fs.createWriteStream("./download/" +  filename);
            request(f)
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
    var index = [];
    zips.forEach(function(f) {
      var name = f.split(".")[0];
      index.push(name);
      requests.push(new Promise(function(resolve, reject) {
        gl.makeDirectory("./shp/" + name, function() {
          try {
            if (fs.readdirSync("./shp/" + name ).length > 0) {
              resolve();
            } else {
              gulp.src("./download/" + f)
                .pipe(unzip())
                .on("error", reject)
                .pipe(gulp.dest("./shp/" + name))
                .on("finish", function() {
                  console.log("finished unzipping " + name);
                  resolve();
                });
            }
          } catch (ex) {
            console.log(ex);
            reject(ex);
          }
        });
      }));
    });
    fs.writeFileSync("./fileIndex.json", JSON.stringify(index));
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
              console.log("finished ogr2ogr for " + f);
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
    console.log("finished ogr2ogr for all");
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
var gridConfig = require("./gridConfig.json");
gl.gulp.task("topojson", ["topojson_dir","ogr2ogr","buildDirectory"], function(done) {
  var files = fs.readdirSync("./geojson");
  var sizes = [];
  var promiseMaker = function(config) {
    return new Promise(function(resolve) {
      topojson_out(config, resolve);
    });
  };
  for (var config in gridConfig) {
    if (gridConfig.hasOwnProperty(config)) {
      sizes.push(promiseMaker(gridConfig[config]));
    }
  }
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
            for (var i = 0, ii = topo.objects.districts.geometries.length; i<ii; i++) {
              var obj = topo.objects.districts.geometries[i].properties;
              for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                  if (prop.indexOf("GEOID")===-1 && prop.indexOf("NAME")===-1) {
                    delete (obj[prop]);
                  }
                }
              }
            }
            topo = topojson.presimplify(topo);
            topo = topojson.simplify(topo, settings.simplify);
            fs.writeFileSync(settings.dest + f, JSON.stringify(topo/*, null, " "*/));
            console.log("wrote " + settings.dest + f);
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
gl.gulp.task("copyTopo", ["topojson_grid"], function(cb) {
  gulp.src(['grid/**/*'])
    .pipe(gulp.dest('build/grid'))
    .on("finish", function() {
      console.log("done");
      cb();
    });
});
gl.gulp.task("topojson_grid", ["topojson"], function(cb) {
  if (fs.existsSync("./grid")) {
    cb();
  } else {
    gl.makeDirectory("./grid", function() {
      var sizes = fs.readdirSync("./topojson");
      var tasks = [];
      sizes.forEach(function(f) {
        tasks.push(new Promise(function(resolve) {
          if (typeof(gridConfig[f])==="undefined") {
            console.log("no grid size defined for " + f + ", ignoring");
            resolve();
          } else {
            topoGrids(gridConfig[f].gridSize, f, resolve);
          }
        }));
      });
      Promise.all(tasks).then(function() {
        console.log("finished grid");
        cb();
      });
    });
  }
  function topoGrids(tileSize, file, cb) {
    var files = fs.readdirSync("./topojson/" + file);
    var tasks = [];
    files.forEach(function(f) {
      tasks.push(new Promise(function(resolve) {
        gl.makeDirectory("./grid/" + f.split(".")[0], function() {
          topoGrid(tileSize, file, f, resolve);
        });
      }));
    });
    Promise.all(tasks).then(function() {
      console.log("finished " + file);
      cb();
    });
  }
  function topoGrid(tileSize, dir, file, cb) {
    var topo = JSON.parse(fs.readFileSync("./topojson/" + dir + "/" + file, {
      encoding: "utf-8"
    }));
    var geo = topojson.feature(topo, topo.objects.districts);
    var index = {};
    var obj = {};
    var g_xmin, g_ymin, g_xmax, g_ymax;
    geo.features.forEach(function(f) {
      var bbox = geojson_bbox(f);
      var xmin = Math.floor(bbox[0]/tileSize)*tileSize;
      var xmax = Math.ceil(bbox[2]/tileSize)*tileSize;
      var ymin = Math.floor(bbox[1]/tileSize)*tileSize;
      var ymax = Math.ceil(bbox[3]/tileSize)*tileSize;
      if (typeof(g_xmin)==="undefined") {
        g_xmin = xmin;
      }
      if (typeof(g_xmax)==="undefined") {
        g_xmax = xmax;
      }
      if (typeof(g_ymin)==="undefined") {
        g_ymin = ymin;
      }
      if (typeof(g_ymax)==="undefined") {
        g_ymax = ymax;
      }
      g_xmin = Math.min(xmin, g_xmin);
      g_xmax = Math.max(xmax, g_xmax);
      g_ymin = Math.min(ymin, g_ymin);
      g_ymax = Math.max(ymax, g_ymax);
      for (var x = xmin; x<=xmax; x+= tileSize) {
        x = Math.round(x*1000)/1000;
        if (typeof(obj[x])==="undefined") {
          obj[x] = {};
        }
        for (var y = ymin; y<=ymax; y+= tileSize) {
          y = Math.round(y*1000)/1000;
          if (typeof(obj[x][y])==="undefined") {
            obj[x][y] = {
              type: "FeatureCollection",
              features: []
            };
          }
          if (typeof(index[x])==="undefined") {
            index[x] = {};
          }
          index[x][y] = 1;
          obj[x][y].features.push(f);
        }
      }
    });
    var settings = gridConfig[dir];
    function indexFlatten(index) {
      var r = [];
      for (var x in index) {
        if (index.hasOwnProperty(x)) {
          for (var y in index[x]) {
            if (index[x].hasOwnProperty(y)) {
              r.push([x,y]);
            }
          }
        }
      }
      return r;
    }
    gl.makeDirectory("./grid/" + file.split(".")[0] + "/" + dir, function() {
      fs.writeFileSync("./grid/" + file.split(".")[0] + "/" + dir + "/index.json",
        JSON.stringify(indexFlatten(index)));
      var topoTile;
      for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
          for (var y in obj[x]) {
            if (obj[x].hasOwnProperty(y)) {
              topoTile = topojson.topology({districts:obj[x][y]});
              topoTile = topojson.quantize(topoTile, settings.quantize);
              //topoTile = topojson.presimplify(topoTile);
              //topoTile = topojson.simplify(topoTile, settings.simplify);
              fs.writeFileSync("./grid/" + file.split(".")[0] + "/" + dir + "/" +
                x.replace(".","p") + "_" +
                y.replace(".","p") + ".json", JSON.stringify(topoTile));
            }
          }
        }
      }
      console.log("finished " + dir + " " + file);
      cb();
    });
  }
});
