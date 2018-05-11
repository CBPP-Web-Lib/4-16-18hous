/*globals require, Promise*/
var gl = require("./CBPP_shared_gulp/gulplib.js")(), gulp = gl.gulp, fs = gl.fs;
var request = require("request");
var decompress = require("gulp-decompress");
var ogr2ogr = require("ogr2ogr");
var topojson = require("topojson");
var geojson_bbox = require("geojson-bbox");
var fips = require("./fips.json");
var turf = require("turf");
var pako = require("pako");
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

    Promise.all(requests).then(function() {
      cb();
    });
  });
});
gl.gulp.task("clip_cbsa", ["filter_geojson"], function(cb) {
  function clip_cbsa(cbsa) {
    var states = JSON.parse(fs.readFileSync("./geojson/cb_2015_us_state_500k.json"));
    var topostate = topojson.topology({districts:states});
    topostate = topojson.quantize(topostate, {
      scale:[0.00001,0.00001],
      translate:[0,0]
    });
    var merged = topojson.merge(topostate, topostate.objects.districts.geometries);
    var r = [];
    var intersect;
    cbsa.features.forEach(function(f) {
      intersect = turf.intersect(merged, f);
      //intersect.geometry.geometries = removePoints(intersect.geometry.geometries);
      intersect.properties = f.properties;
      r.push(intersect);
    });
    cbsa.features = r;
    return cbsa;
  }
  if (fs.existsSync("./filtered/tl_2015_us_cbsa.json")) {
    cb();
    return;
  }
  var cbsa = JSON.parse(fs.readFileSync("./intermediate/cbsa_filtered_unclipped.json"));
  fs.writeFileSync("./filtered/tl_2015_us_cbsa.json", JSON.stringify(clip_cbsa(cbsa), null, " "));
  cb();
});
gl.gulp.task("filter_geojson", ["ogr2ogr","split_data"], function(cb) {
  function existsInData(feature, data) {
    var geoid = feature.properties.GEOID10;
    if (typeof(geoid)==="undefined") {
      geoid = feature.properties.GEOID;
    }
    geoid*=1;
    if (typeof(data[geoid])!=="undefined") {
      var r = {exists: true};
      if (data[geoid][0]) {
        r.cbsa = data[geoid][0];
      }
      return r;
    }
    return -1;
  }
  if (fs.existsSync("./filtered/tl_2010_tract_47900.json")) {
    cb();
    return;
  }
  var r = {};
  var index = {};
  var tract_data = JSON.parse(fs.readFileSync("./intermediate/data_by_tract.json"));
  var cbsa_org = JSON.parse(fs.readFileSync("./geojson/tl_2015_us_cbsa.json"));
  var cbsa_names = JSON.parse(fs.readFileSync("./intermediate/names.json"));
  var cbsa = {
    "type": "FeatureCollection",
    "features" : []
  };

  for (var i = 0, ii = cbsa_org.features.length; i<ii; i++) {
    if (existsInData(cbsa_org.features[i], cbsa_names)!==-1) {
      cbsa.features.push(cbsa_org.features[i]);
    }
  }
  fs.writeFileSync("./intermediate/cbsa_filtered_unclipped.json", JSON.stringify(cbsa, null, " "));

  gl.makeDirectory("./filtered", function() {
    /*if (fs.existsSync("./filtered/tl_2015_us_cbsa.json")) {
      cb();
      return;
    }
    cbsa = clip_cbsa(cbsa);
    fs.writeFileSync("./filtered/tl_2015_us_cbsa.json", JSON.stringify(cbsa, null, " "));*/
    var files = fs.readdirSync("./geojson");
    var filterTasks = [];
    files.forEach(function(f) {
      filterTasks.push(new Promise(function(resolve, reject) {
        filterToCBSA(f, resolve);
      }));
    });
    Promise.all(filterTasks).then(function() {
      console.log("made it this far");
      var fileIndex = [];
      for (var file in index) {
        if (index.hasOwnProperty(file)) {
          fileIndex.push(file);
        }
      }
      fs.writeFileSync("./fileIndex.json", JSON.stringify(fileIndex, null, " "));
      for (var cbsa in r) {
        if (r.hasOwnProperty(cbsa)) {
          fs.writeFileSync("./filtered/tl_2010_tract_" + cbsa + ".json", JSON.stringify(r[cbsa], null, " "));
        }
      }

      cb();
    });
  });

  function filterToCBSA(f, cb) {

    if (fs.existsSync("./filtered/" + f)) {
      index[f.replace(".json","")] = true;
      cb();
      return;
    }
    if (f==="tl_2015_us_cbsa.json") {
      index[f.replace(".json","")] = true;
      cb();
      return;
    }
    if (f.indexOf("tract")!==-1) {
      fs.readFile("./geojson/" + f, function(err, d) {
        d = JSON.parse(d);
        for (var i = 0, ii = d.features.length; i<ii; i++) {
          var cbsa = existsInData(d.features[i], tract_data).cbsa;
          //console.log(cbsa);
          if (cbsa!==-1 && cbsa) {
            if (!r[cbsa]) {
              r[cbsa] = {
                "type": "FeatureCollection",
                "features" : []
              };
              index["tl_2010_tract_" + cbsa] = true;
            }
            r[cbsa].features.push(d.features[i]);

          }
        }
        cb();
      });
    } else {
      index[f.replace(".json","")] = true;
      fs.writeFileSync("./filtered/" + f, fs.readFileSync("./geojson/" + f));
      cb();
      return;
    }
  }


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
              gl.fs.writeFileSync('./geojson/' + f + ".json", JSON.stringify(data, null, " "));
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
  makeDirectory("./build/topojson", function() {
    makeDirectory("./build/topojson/high", directoryCB);
  });
  var directoryCB = function() {
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
      function exclude(f, settings) {
        var r = false;
        if (!settings.exclude) {settings.exclude = [];}
        settings.exclude.forEach(function(e) {
          if (f.indexOf(e)!==-1) {
            r = true;
          }
        });
        return r;
      }
      files.forEach(function(f) {
        converts.push(new Promise(function(resolve) {
          gl.makeDirectory(settings.dest, function() {
            if (fs.existsSync(settings.dest + f)) {
              resolve();
            } else if (exclude(f, settings)) {
              resolve();
            } else {
              var geo = JSON.parse(fs.readFileSync("./filtered/" + f, {
                encoding: "utf-8"
              }));
              var topo = topojson.topology({districts:geo}/*, 10000*/);
              for (var i = topo.objects.districts.geometries.length-1; i>=0; i--) {
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
              topo = topojson.quantize(topo, {
                scale:[settings.quantize,settings.quantize],
                translate:[0,0]
              });
              fs.writeFileSync(settings.dest + f, JSON.stringify(topo, null, settings.dest.indexOf("build")===-1 ? " " : null));
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
  };
});
gl.gulp.task("topojson_db", ["topojson"], function(cb) {
  /*to do*/
});
gl.gulp.task("split_data", ["buildDirectory"], function(cb) {
  if (fs.existsSync("./intermediate/names.json")) {
    if (typeof(cb)==="function") {cb();}
    return;
  }
  var r = {};
  var name_lookup = {};
  var data = JSON.parse(fs.readFileSync("./intermediate/data.json")).data.tract_data;
  var split = {};
  data.forEach(function(row, i) {
    if (i===0) {return;}
    var cbsa = row[1];
    if (typeof(name_lookup[cbsa])==="undefined") {
      name_lookup[cbsa] = row[2];
    }
    var tract = row[0]*1;
    row.splice(2, 1);
    r[tract] = row.slice(1);
    if (typeof(split[cbsa])==="undefined") {
      split[cbsa] = {};
    }
    split[cbsa][tract] = r[tract];
  });
  fs.writeFileSync("./intermediate/names.json", JSON.stringify(name_lookup));
  fs.writeFileSync("./intermediate/data_by_tract.json", JSON.stringify(r, null, " "));
  makeDirectory("./build/data", function() {
    for (var cbsa in split) {
      if (split.hasOwnProperty(cbsa)) {
        fs.writeFileSync("./build/data/"+cbsa+".json", JSON.stringify(split[cbsa]));
      }
    }
  });
  cb();


});
