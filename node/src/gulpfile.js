/*globals require, Promise*/
var gulp = require("gulp");
var fs = require("fs");
var request = require("request");
var decompress = require("gulp-decompress");
var ogr2ogr = require("ogr2ogr");
var topojson = require("topojson");
var pako = require("pako");
var geojson_bbox = require("geojson-bbox");
var fips = require("./fips.json");
var turf_area = require("@turf/area").default;

var makeDirectory = function(dir) {
  try {
    fs.mkdirSync(dir)
  } catch (ex) {
    console.log(ex);
  }
}

/*newer turf seems to have problems with intersects and multipolygons so need old as well*/
var turf = require("turf");
//var truncate = require("@turf/truncate").default;
//var clip_poly = polygon_clip_lib.martinez;
function zeroPad(fips) {
  fips = fips + "";
  while (fips.length < 2) {
    fips = "0" + fips;
  }
  return fips;
}
gulp.task("redlining_shapefiles", ["intermediate"], function(cb) {
  if (!fs.existsSync("./intermediate/redlining.json")) {
    var dest = fs.createWriteStream("./intermediate/redlining.json");
    request("https://digitalscholarshiplab.carto.com/api/v2/sql?q=select%20*%20from%20digitalscholarshiplab.holc_polygons&format=GeoJSON")
      .pipe(dest);
    dest.on("finish", cb);
  } else {
    if (typeof(cb)==="function") {
      cb();
    }
  }
});
gulp.task("download_shapefiles", function(cb) {
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
  var waterfiles = fs.readFileSync("./water_files.csv","utf-8");
  waterfiles = waterfiles.split(/\r?\n/);
  waterfiles.forEach(function(f) {
    files.push("https://www2.census.gov/geo/tiger/TIGER2017/AREAWATER/" + f);
  });
  var requests = [];
  var max_simultaneous = 8;
  var RequestMaker = function(f, j) {
    return new Promise(function(resolve, reject) {
      try {
        var filename = f.split("/")[f.split("/").length - 1];
        if (fs.existsSync("./download/" + filename)) {
          console.log("file exists " + f);
          resolve(j);
        } else {
          var ws = fs.createWriteStream("./download/" +  filename);
          request(f)
            .pipe(ws);
          ws.on("finish", function() {
            console.log("finished downloading " + f);
            resolve(j);
          });
        }
      } catch (ex) {
        console.log(ex);
        reject(ex);
      }
    });
  };
  makeDirectory("./download");
  var fIndex = 0;
  function clearRequest(j) {
    console.log("clearing slot " + j);
    requests[j] = null;
    tryFile();
  }
  function tryFile() {
    if (fIndex >= files.length) {return;}
    for (var j = 0; j<max_simultaneous;j++) {
      var f = files[fIndex];
      if (requests[j]===null || typeof(requests[j])==="undefined") {

        console.log("trying " + f, j);
        requests[j] = new RequestMaker(f, j).then(clearRequest);
        fIndex++;
      }
    }
    console.log("done trying, waiting...");
  }
  tryFile();
});
gulp.task("unzip_shapefiles", function(cb) {
  makeDirectory("./shp");
  var zips = fs.readdirSync("./download");
  var requests = [];
  var index = [];
  zips.forEach(function(f) {
    var name = f.split(".")[0];
    index.push(name);
    requests.push(new Promise(function(resolve, reject) {
      try {
        makeDirectory("./shp/" + name);
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
      } catch (ex) {
        console.log(ex);
        resolve();
      }
    }));
    Promise.all(requests).then(function() {
      cb();
    });
  });
});
gulp.task("clip_cbsa", /*["filter_geojson"],*/ function(cb) {
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
    gulp.watch();
    try {
      cbsa.features.forEach(function(f) {
        //console.log(merged, f.geometry);
        console.log(merged, f.geometry, f.properties.GEOID);
        intersect = turf.intersect(merged, f.geometry);
        intersect.properties = f.properties;
        console.log(intersect);

        r.push(intersect);

      });
    } catch (ex) {
      console.log(ex);
    }
    cbsa.features = r;
    return cbsa;
  }
//  if (fs.existsSync("./filtered/tl_2015_us_cbsa.json")) {
//    cb();
//    return;
//  }
  var cbsa = JSON.parse(fs.readFileSync("./intermediate/cbsa_filtered_unclipped.json"));
  fs.writeFileSync("./filtered/tl_2015_us_cbsa.json", JSON.stringify(clip_cbsa(cbsa), null, " "));
  cb();
});
gulp.task("filter_redline", function(cb) {
  gulp.watch();
  var cbsas = JSON.parse(fs.readFileSync("./intermediate/cbsa_filtered_unclipped.json", "utf-8"));
  var redlining = JSON.parse(fs.readFileSync("./intermediate/redlining.json","utf-8"));
  cbsas.features.forEach(cbsa => {
    var cbsa_id = cbsa.properties.GEOID;
    var r = {
      "type": "FeatureCollection",
      "features": []
    };
    redlining.features.forEach(redline => {
      var a = geojson_bbox(redline);
      var b = geojson_bbox(cbsa);
      /*x1, y1, x2, y2*/
      if (!(
          a[2] < b[0] ||
          b[2] < a[0] ||
          a[1] > b[3] ||
          b[3] < a[1]
        )) {
          try {
            if (typeof(turf.intersect(redline, cbsa))!=="undefined") {
              console.log("intersect");
              r.features.push(redline);
            } else {
              console.log("no intersect");
            }
          } catch (ex) {
            console.log(ex);
          }
      }
    });
    fs.writeFileSync("./filtered/redlining_"+cbsa_id+".json", JSON.stringify(r, null, " "));
  }); 
  cb(); 
});
gulp.task("filter_geojson", ["ogr2ogr","split_data"], function(cb) {
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
  /*if (fs.existsSync("./filtered/tl_2010_tract_47900.json")) {
    cb();
    return;
  }*/
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

  makeDirectory("./filtered");
  /*if (fs.existsSync("./filtered/tl_2015_us_cbsa.json")) {
    cb();
    return;
  }
  cbsa = clip_cbsa(cbsa);
  fs.writeFileSync("./filtered/tl_2015_us_cbsa.json", JSON.stringify(cbsa, null, " "));*/
  var files = fs.readdirSync("./geojson");
  files = files.filter(function(f) {
    return f.indexOf("areawater")===-1;
  });
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
        if (file.indexOf("tl_2010_tract")!==-1) {
          fileIndex.push(file.replace("tl_2010_tract_","redlining_"));
        }
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

gulp.task("simplify_water", [/*"ogr2ogr"*/], function(cb) {
  makeDirectory("water_simple");
  var files = fs.readdirSync("./geojson");
  files = files.filter(function(f) {
    return f.indexOf("areawater")!==-1;
  });
  var settings = gridConfig.high;
  makeDirectory("./build/water");
  fs.writeFileSync("./build/water/.htaccess",fs.readFileSync("./.htaccess"),"utf-8");
  files.forEach(function(f) {
    var geo = JSON.parse(fs.readFileSync("./geojson/" + f, "utf-8"));
    geo.features = geo.features.filter(function(o) {
      return turf_area(o)>10000;
    });
    var topo = topojson.topology({districts:geo});
    topo = topojson.presimplify(topo);
    topo = topojson.simplify(topo, settings.simplify);
    topo = topojson.quantize(topo, {
      scale:[settings.quantize,settings.quantize],
      translate:[0,0]
    });
    topo.objects.districts.geometries.forEach(function(el) {
      delete(el.properties);
    });
    f = f.replace(".json",".binary");
    fs.writeFileSync("./build/water/" + f, pako.deflate(JSON.stringify(topo)));
  });
  cb();
});

gulp.task("index_water", [/*"ogr2ogr"*/], function(cb) {
  var files = fs.readdirSync("./filtered");
  files = files.filter(function(e) {
    return e.indexOf("tract")!==-1;
  });
  var r = {};
  files.forEach(function(f) {
    var fIndex = {};
    var features = JSON.parse(fs.readFileSync("./filtered/" + f)).features;
    features.forEach(function(f) {
      fIndex[f.properties.STATEFP10*1000 + f.properties.COUNTYFP10*1] = true;
    });
    var fArr = [];
    for (var cfips in fIndex) {
      if (fIndex.hasOwnProperty(cfips)) {
        fArr.push(cfips);
      }
    }
    r[f] = fArr;
  });
  fs.writeFileSync("./waterIndex.json", JSON.stringify(r, null, " "));
});

gulp.task("ogr2ogr", ["geojson_dir","unzip_shapefiles"], function(cb) {
  var shp = fs.readdirSync("./shp");
  var requests = [];
  var Converter = function(f, j) {
    return new Promise(function(resolve, reject) {
      try {
        if (fs.existsSync("./geojson/" + f + ".json")) {
          resolve(j);
        } else {
          var geojson = ogr2ogr('./shp/' + f + "/" + f + ".shp")
            .format('GeoJSON')
            .timeout(600000);
          geojson.exec(function(err, data) {
            if (err) {
              console.log(err);
            } else {
              console.log("finished ogr2ogr for " + f);
              fs.writeFileSync('./geojson/' + f + ".json", JSON.stringify(data, null, " "));
              resolve(j);
            }
          });
        }
      } catch (ex) {
        console.log(ex);
        reject(ex);
      }
    });
  };
  var max_simultaneous = 8;
  var fileIndex = 0;
  function clearConvert(i) {
    requests[i] = null;
    tryConvert();
  }
  function tryConvert() {
    for (var i = 0; i<max_simultaneous;i++) {
      if (typeof(requests[i])==="undefined" || requests[i]===null) {
        if (fileIndex >= shp.length) {
          var done = true;
          for (var j = 0; j<max_simultaneous;j++) {
            if (requests[j]!==null) {done = false;}
          }
          if (done) {
            console.log("finished ogr2ogr for all");
            cb();
          }
          return;
        }
        var f = shp[fileIndex];
        console.log("starting for " + f);
        requests[i] = new Converter(f, i).then(clearConvert);
        fileIndex++;
      }
    }
  }
  tryConvert();
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
gulp.task("geojson_dir", function(cb) {
  makeDirectory("./geojson", cb);
});
gulp.task("topojson_dir", function(cb) {
  makeDirectory("./topojson", cb);
});
var gridConfig = require("./gridConfig.json");

gulp.task("topojson", [/*"topojson_dir","filter_geojson","buildDirectory"*/], function(done) {
  var files = fs.readdirSync("./filtered");
  files = files.filter(function(f) {
    if (f.indexOf("areawater")===-1) {
      return true;
    }
    return false;
  });
  var sizes = [];
  makeDirectory("./build/topojson", function() {
    fs.writeFileSync("./build/topojson/.htaccess",fs.readFileSync("./.htaccess"),"utf-8");
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
          makeDirectory(settings.dest);
          if (fs.existsSync(settings.dest + f)) {
            resolve();
          } else if (exclude(f, settings)) {
            resolve();
          } else {
            var geo = JSON.parse(fs.readFileSync("./filtered/" + f, {
              encoding: "utf-8"
            }));
            try {
            
            var topo = topojson.topology({districts:geo}/*, 10000*/);
            for (var i = topo.objects.districts.geometries.length-1; i>=0; i--) {
              var obj = topo.objects.districts.geometries[i].properties;

              for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                  if (prop.indexOf("GEOID")===-1 && prop.indexOf("NAME")===-1 && prop.indexOf("holc")===-1) {
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
            var compressedf;
            if (settings.dest==="./topojson/low/") {
              compressedf = f.replace(".json", ".txt");
              fs.writeFileSync(settings.dest + compressedf,
                pako.deflate(
                  JSON.stringify(topo, null, settings.dest.indexOf("build")===-1 ? " " : null),
                  {to:"string"}
                )
              );
            } else {
              compressedf = f.replace(".json", ".binary");
              fs.writeFileSync(settings.dest + compressedf,
                pako.deflate(
                  JSON.stringify(topo, null, settings.dest.indexOf("build")===-1 ? " " : null)
                )
              );
            }
            console.log("wrote " + settings.dest + f);
          } catch (ex) {
            console.log(ex);
          }
            resolve();
          }
        }));
      });
      Promise.all(converts).then(function() {
        _cb();
      });
    }
  };
});
gulp.task("topojson_db", ["topojson"], function(cb) {
  /*to do*/
});
gulp.task("split_data", ["buildDirectory"], function(cb) {
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
    /*do this to comply w/ HUD reporting requirements*/
    for (var j = 8;j<=10;j++) {
      r[tract][j] = Math.round(r[tract][j]/12);
    }
  });

  //setTimeout(function(){},86400000);

 
  fs.writeFileSync("./intermediate/names.json", JSON.stringify(name_lookup));
  fs.writeFileSync("./intermediate/data_by_tract.json", JSON.stringify(r, null, " "));
  makeDirectory("./build/data", function() {
    fs.writeFileSync("./build/data/.htaccess",fs.readFileSync("./.htaccess"),"utf-8");
    for (var cbsa in split) {
      if (split.hasOwnProperty(cbsa)) {
        fs.writeFileSync("./build/data/"+cbsa+".json", JSON.stringify(split[cbsa]));
      }
    }
  });
  cb();

});

gulp.task("binCBSA", ["intermediate","split_data"], function() {
  var binner = require("./binData.js");
  var names= require("./intermediate/names.json");
  for (var cbsa in names) {
    if (names.hasOwnProperty(cbsa)) {
      var data = JSON.parse(fs.readFileSync("./build/data/"+cbsa+".json","utf-8"));
      var dArr = [];
      for (var tract in data) {
        if (data.hasOwnProperty(tract)) {
          dArr.push(data[tract]);
        }
      }
      var bins = binner(dArr, false, {"nonwhite":6}, cbsa);
      fs.writeFileSync("./build/data/bin_"+cbsa+".json", JSON.stringify(bins));
    }
  }
});

gulp.task("copyProxy", function() {
  gulp.src(['./image_proxy/**/*']).pipe(gulp.dest('./build/image_proxy'));
});



gulp.task("server", function(cb) {
  var http = require('http');
  var fs = require("fs");
  var exec = require("child_process").exec;
  
  var server = http.createServer(function(req, res) {
    function parse_php_res(f) {
      var offset;
      for (var i = 0, ii = f.length; i<ii; i++) {
        //utf8 double line break
        if (f[i]===13 && f[i+1]===10 && f[i+2]==13 && f[i+3]===10) {
          offset = i;
        }
      }
      var headers = [];
      for (i = 0; i<offset;i++) {
        headers.push(f[i]);
      }
      var body = [];
      for (i = offset+4, ii = f.length; i<ii; i++) {
        body.push(f[i]);
      }
      headers = Buffer.from(headers).toString("utf8").split("\r\n");
      body = Buffer.from(body);
      var headersObj = {};
      headers.forEach(function(header) {
        header = header.split(":");
        headersObj[header[0]] = header[1];
      });
      var result = {};
      result.headers = headersObj;
      result.body = body;
      return result;
    }
    try {
      var headers = {
        'max-age':86400,
        'Access-Control-Allow-Origin':"*",
        'Vary':"Access-Control-Allow-Origin",
        'Access-Control-Allow-Headers':'referrer, range, accept-encoding, x-requested-with',
        'Access-Control-Allow-Methods':'POST, GET, OPTIONS'
      };
      var file = req.url.split("?")[0];
      var ext = file.split(".")[file.split(".").length-1];
      if (ext==="php") {
        var command = "php-cgi \"" + __dirname + "/build" + file + "\" " + req.url.split("?")[1].split("&").join(" ");
        exec(command, {encoding:"Buffer"}, function(err, f) {
          var parsed = parse_php_res(f);
          res.writeHead(200, parsed.headers);
          res.write(parsed.body);
          res.end();
        });
      } else {
        fs.readFile("./build" + file, function (err, file) {
          if (err) {
            res.end('HTTP/1.1 400 Bad Request\r\n\r\n');
            return;
          }
          if (ext === "json") {
            headers['Content-Type'] = 'application/json';
          }
          res.writeHead(200, headers);
          res.write(file);
          res.end();
        });
      }
    } catch (ex) {
      res.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
  });
  server.on('clientError', function (err, socket) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  server.listen(8000);
  cb(); 
});

gulp.task("minorityconc", ["data","split_data"], function() {
  var data = require("./intermediate/data.json").data.minority_threshhold;
  var names = invert(require('./intermediate/names.json'));
  function invert(o) {
    var r = {};
    for (var key in o) {
      if (o.hasOwnProperty(key)) {
        r[o[key]] = key;
      }
    }
    return r;
  }
  var threshholds = {};
  for (var i = 0, ii = data.length; i<ii;i++) {
    for (var cbsa in names) {
      if (names.hasOwnProperty(cbsa)) {
        if (cbsa.indexOf(data[i][0])!==-1 || data[i][0].indexOf(cbsa)!==-1) {
          threshholds[names[cbsa]] = data[i][1];
        }
      }
    }
  }
  fs.writeFileSync("./intermediate/thresholds.json", JSON.stringify(threshholds, null, " "), "utf-8");
});



gulp.task("binData", ["intermediate"], function() {
  var binner = require("./binData.js");
  console.log(JSON.parse(fs.readFileSync("./intermediate/data.json","utf-8")).data.tract_data);
  var bins = binner(JSON.parse(fs.readFileSync("./intermediate/data.json","utf-8")).data.tract_data, true, {"nonwhite":8}, null);
  bins.splice(2, 1);
  bins = bins.slice(1);
  fs.writeFileSync("./intermediate/bins.json",JSON.stringify(bins),"utf-8");
  setTimeout(function(){},86400000);
});