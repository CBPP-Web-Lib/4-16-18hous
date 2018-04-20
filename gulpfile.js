/*globals require, Promise*/
var gl = require("./CBPP_shared_gulp/gulplib.js")(), gulp = gl.gulp, fs = gl.fs;
var request = require("request");
var decompress = require("gulp-decompress");
var ogr2ogr = require("ogr2ogr");
var topojson = require("topojson");
var geojson_bbox = require("geojson-bbox");
var fips = require("./fips.json");
var turf = require("turf");
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
    "https://www2.census.gov/geo/tiger/TIGER2015/NECTADIV/tl_2015_us_nectadiv.zip",
    "http://www2.census.gov/geo/tiger/GENZ2015/shp/cb_2015_us_state_500k.zip"
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
        try {
          gl.makeDirectory("./shp/" + name, function() {
            if (fs.readdirSync("./shp/" + name ).length > 0) {

              resolve();
            } else {

              console.log(f);
              gulp.src("./download/" + f)
                .pipe(decompress())
                .pipe(gulp.dest("./shp/" + name))
                .on("error", function(err) {
                  resolve();
                })
                .on("finish", function() {
                  console.log("finished unzipping " + name);
                  resolve();
                });
            }
          });
        } catch (ex) {
          console.log(ex);
          resolve();
        }
      }));
    });
    fs.writeFileSync("./fileIndex.json", JSON.stringify(index));
    Promise.all(requests).then(function() {
      console.log(requests);
      cb();
    });
  });
});
gl.gulp.task("filter_geojson", ["ogr2ogr","split_data"], function(cb) {
  function existsInData(feature, data) {
    var geoid = feature.properties.GEOID;
    return typeof(data[geoid])!=="undefined";
  }
  function filterToCBSA(f, cb) {
    if (fs.existsSync("./filtered/" + f)) {
      cb();
      return;
    }
    if (f==="tl_2015_us_cbsa.json" ||
        f==="cb_2015_us_state_500k.json") {
      fs.writeFileSync("./filtered/" + f, fs.readFileSync("./geojson/" + f));
      cb();
      return;
    }
    fs.readFile("./geojson/" + f, function(err, d) {

      d = JSON.parse(d);

      var r = {
        "type": "FeatureCollection",
        "features" : []
      };
      var intersection;

      function bbox_intersect(b1, b2) {
        return !((b1[0] > b2[2]) ||
          (b1[1] > b2[3]) ||
          (b1[2] < b2[0]) ||
          (b1[3] < b2[1]));
      }

      for (var i = 0, ii = d.features.length; i<ii; i++) {
        intersection = false;
        if (Math.random()<0.001) {
          console.log(f, i/ii);
        }
        var outer_bbox = geojson_bbox(d.features[i]);
        for (var j = 0, jj = cbsa.features.length; j<jj; j++) {
          var inner_bbox = geojson_bbox(cbsa.features[j]);
          if (bbox_intersect(outer_bbox, inner_bbox)) {
            if (turf.intersect(d.features[i], cbsa.features[j])!==null) {
              intersection = true;
            }
          }
        }
        if (intersection) {
          r.features.push(d.features[i]);
        }
      }
      r = JSON.stringify(r);
      fs.writeFileSync("./filtered/" + f, r);
      cb();
    });
  }

  var cbsa_org = JSON.parse(fs.readFileSync("./geojson/tl_2015_us_cbsa.json"));
  var data = JSON.parse(fs.readFileSync("./intermediate/names.json"));


  var cbsa = {
    "type": "FeatureCollection",
    "features" : []
  };

  for (var i = 0, ii = cbsa_org.features.length; i<ii; i++) {
    if (existsInData(cbsa_org.features[i], data)) {
      cbsa.features.push(cbsa_org.features[i]);
    }
  }

  gl.makeDirectory("./filtered", function() {
    fs.writeFileSync("./filtered/tl_2015_us_cbsa.json", JSON.stringify(cbsa));
    var files = fs.readdirSync("./geojson");
    var filterTasks = [];
    files.forEach(function(f) {
      filterTasks.push(new Promise(function(resolve, reject) {
        filterToCBSA(f, resolve);
      }));
    });
    Promise.all(filterTasks).then(function() {
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
            .timeout(600000);
          geojson.exec(function(err, data) {
            if (err) {
              console.log(err);
            } else {
              console.log("finished ogr2ogr for " + f);
              gl.fs.writeFileSync('./geojson/' + f + ".json", JSON.stringify(data));
              resolve();
            }
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
gl.gulp.task("topojson", ["topojson_dir","filter_geojson","buildDirectory"], function(done) {
  var files = fs.readdirSync("./filtered");
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
            var geo = JSON.parse(fs.readFileSync("./filtered/" + f, {
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
gl.gulp.task("topojson_grid", ["topojson"], function(cb) {
  if (fs.existsSync("./build/grid")) {
    cb();
  } else {
    gl.makeDirectory("./build/grid", function() {
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
        gl.makeDirectory("./build/grid/" + f.split(".")[0], function() {
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
    var geoid_to_file = {};
    var grid_to_geoid = {};
    var g_xmin, g_ymin, g_xmax, g_ymax;
    geo.features.forEach(function(f) {
      var geoid = f.properties.GEOID || f.properties.GEOID10;
      if (geoid===null) {
        console.log("PROBLEM");
        console.log(f);
      }
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
      if (typeof(obj[xmin])==="undefined") {
        obj[xmin] = {};
      }
      if (typeof(obj[xmin][ymin])==="undefined") {
        obj[xmin][ymin] = {
          type: "FeatureCollection",
          features: []
        };
      }
      obj[xmin][ymin].features.push(f);
      geoid_to_file[geoid] = [xmin, ymin];
      if (typeof(index[xmin])==="undefined") {
        index[xmin] = {};
      }
      index[xmin][ymin] = 1;
      for (var x = xmin; x<=xmax; x+= tileSize) {
        x = Math.round(x*1000)/1000;
        if (typeof(grid_to_geoid[x])==="undefined") {
          grid_to_geoid[x] = [];
        }
        for (var y = ymin; y<=ymax; y+= tileSize) {
          y = Math.round(y*1000)/1000;

          if (typeof(grid_to_geoid[x][y])==="undefined") {
            grid_to_geoid[x][y] = [];
          }
          grid_to_geoid[x][y].push(geoid);
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
    gl.makeDirectory("./build/grid/" + file.split(".")[0] + "/" + dir, function() {
      fs.writeFileSync("./build/grid/" + file.split(".")[0] + "/" + dir + "/index.json",
        JSON.stringify(indexFlatten(index)));
      fs.writeFileSync("./build/grid/" + file.split(".")[0] + "/" + dir + "/grid_to_geoid.json",
        JSON.stringify(grid_to_geoid));
      fs.writeFileSync("./build/grid/" + file.split(".")[0] + "/" + dir + "/geoid_to_file.json",
        JSON.stringify(geoid_to_file));
      var topoTile;
      for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
          for (var y in obj[x]) {
            if (obj[x].hasOwnProperty(y)) {
              var bbox = geojson_bbox(obj[x][y]);
              topoTile = topojson.topology({districts:obj[x][y]});
              var quantizeF = Math.max(100,settings.quantize*(bbox[2] - bbox[0]));
              console.log(quantizeF);
              topoTile = topojson.quantize(topoTile, quantizeF);
              //topoTile = topojson.presimplify(topoTile);
              //topoTile = topojson.simplify(topoTile, settings.simplify);
              fs.writeFileSync("./build/grid/" + file.split(".")[0] + "/" + dir + "/" +
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
gl.gulp.task("split_data", function(cb) {
  if (fs.existsSync("./intermediate/names.json")) {
    if (typeof(cb)==="function") {cb();}
    return;
  }
  var r = {};
  var name_lookup = {};
  var data = JSON.parse(fs.readFileSync("./intermediate/data.json")).data.tract_data;
  data.forEach(function(row, i) {
    if (i===0) {return;}
    var cbsa = row[1];
    if (typeof(r[cbsa])==="undefined") {
      r[cbsa] = {};
    }
    if (typeof(name_lookup[cbsa])==="undefined") {
      name_lookup[cbsa] = row[2];
    }
    var tract = row[0];
    r[cbsa][tract] = row.slice(3);
  });
  gl.makeDirectory("./intermediate/split", function() {
    var requests = [];
    var promiseMaker = function(filename, data) {
      return new Promise(function(resolve, reject) {
        fs.writeFile(filename, JSON.stringify(data), resolve);
      });
    };
    for (var cbsa in r) {
      if (r.hasOwnProperty(cbsa)) {
        requests.push(promiseMaker("./intermediate/split/" + cbsa + ".json", r[cbsa]));
      }
    }
    Promise.all(requests).then(function(cb) {
      fs.writeFile("./intermediate/names.json", JSON.stringify(name_lookup), cb);
    });
  });
});
