/*globals require, Promise*/
var gulp = require("gulp");
var fs = require("fs");
var request = require("request");
var decompress = require("gulp-decompress");
var ogr2ogr = require("ogr2ogr").default;
var topojson = require("topojson");
var pako = require("pako");
var fips = require("./src/fips.json");
var turf_area = require("@turf/area").default;
var csv_parse = require("csv-parse");
const createCsvStringifier = require('csv-writer').createArrayCsvStringifier;
var seedrandom = require("seedrandom");
const {
  Worker,
  isMainThread,
  setEnvironmentData,
  getEnvironmentData,
} = require('worker_threads');

var gridConfig = require("./src/gridConfig.json");

var parallel_exec = function(array_of_promise_factories, num_slots, cb) {
  var i = 0;
  var slots = [];
  for (var s = 0; s < num_slots; s++) {
    slots[s] = next_task(s);
  }
  var started_all = false;
  function next_task(s) {
    if (i >= array_of_promise_factories.length) {
      started_all = true;
    } else {
      slots[s] = array_of_promise_factories[i](s, i).then(function() {
        slots[s] = null;
        if (started_all) {
          check_finish();
        } else {
          slots.forEach((slot, s)=> {
            if (slots[s] === null) {
              next_task(s);
            }
          });
        }
      });
      i++;
    }
  }
  function check_finish() {
    var done = true;
    slots.forEach((slot, s)=> {
      if (slots[s]!==null) {
        done = false;
      }
    });
    if (done) {
      cb();
    }
  }
}

/*for highly parallel tasks to speed things up*/
var chunk_tasks_to_workers = function(parm_list, config, finished) {

  var {num_slots, response_handler, worker_filename, chunk_size} = config;

  var workers = [];
  var Worker_Wrap = function(script) {
    this.worker = new Worker(script);
    var self = this;
    this.worker.on("message", function(e) {
      e.results.forEach((result)=> {
        response_handler(result);
      });
      if (typeof(self.cb)==="function") {
        self.cb();
      }
      self.status = "idle";
    });
  };

  for (var s = 0; s < num_slots; s++) {
    workers[s] = new Worker_Wrap(worker_filename);
  }

  
  function create_chunk(s) {
    var list = [];
    for (var ci = 0; ci < chunk_size; ci++) {
      if (parm_list[i]) {
        list.push(parm_list[i]);
        i++;
      }
    }
    var _i = i;
    return function() {
      return new Promise((resolve, reject) => {
        var worker_wrap = workers[s];
        worker_wrap.status = "active";
        worker_wrap.worker.postMessage({
          list
        });
        worker_wrap.cb = resolve;
        console.log(_i + "/" + n);
      });
    }
  }

  var n = parm_list.length;
  var i = 0;
  function next_group() {
    var tasks = [];

    for (var s = 0; s < num_slots; s++) {
      tasks.push(create_chunk(s));
    }
    var group_cb;
    if (i < n) {
      group_cb = next_group;
    } else {
      group_cb = function() {
        if (check_if_done()) {
          workers.forEach((worker)=> {
            worker.worker.terminate();
          });
          if (typeof(finished)==="function") {
            finished();
          }
        }
      };
    }
    parallel_exec(tasks, num_slots, group_cb);
  }

  next_group();

  function check_if_done() {
    var done = true;
    workers.forEach((worker)=> {
      if (worker.status==="active") {
        done = false;
      }
    });
    return done;
  }

}

var makeDirectory = function(dir) {
  try {
    fs.mkdirSync(dir)
  } catch (ex) {
    if (ex.code!=="EEXIST") {
      throw (ex);
    }
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


gulp.task("temp", function(cb) {
  makeDirectory("./tmp");
  cb();
});


gulp.task("geojson_dir", function(cb) {
  makeDirectory("./geojson");
  cb();
});


gulp.task("unzip_shapefiles", function(cb) {
  makeDirectory("./shp");
  var zips = fs.readdirSync("./download");
  var requests = [];
  var index = [];
  var problems = [];
  zips.forEach(function(f) {
    var name = f.split(".")[0];
    index.push(name);
    requests.push(function() {
      return new Promise(function(resolve, reject) {
        try {
          makeDirectory("./shp/" + name);
          if (fs.readdirSync("./shp/" + name ).length > 0) {
            resolve();
          } else {
            console.log(f);
            gulp.src("./download/" + f)
              .pipe(decompress().on("error", function(err) {
                problems.push(f);
                resolve();
              }))
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
      })
    });
  });
  parallel_exec(requests, 8, function() {
    console.log(problems);
    cb(); 
  });
});

gulp.task("ogr2ogr", gulp.series("geojson_dir","unzip_shapefiles", function(cb) {
  var shp = fs.readdirSync("./shp");
  var requests = [];
  var problems = [];
  shp.forEach((f)=> {
    requests.push(function() {
      return new Promise((resolve, reject)=> {
        try {
          console.log(f);
          if (fs.existsSync("./geojson/" + f + ".json")) {
            resolve();
          } else {
            ogr2ogr('./shp/' + f + "/" + f + ".shp", {
              format: "GeoJSON",
              maxBuffer: 1024*2014*500
            }).exec(function(err, result) {
              if (err) {
                problems.push(f);
                console.log(err);
                resolve();
              } else {
                console.log("finished ogr2ogr for " + f);
                fs.writeFileSync('./geojson/' + f + ".json", JSON.stringify(result.data));
                resolve();
              }
            });
          }
        } catch (ex) {
          console.log(ex);
          reject(ex);
        }
      });
    });
  });
  parallel_exec(requests, 8, function() {
    console.log("problems");
    console.log(problems);
    cb(); 
  });
}));
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


gulp.task("simplify_water", gulp.series("ogr2ogr", function(cb) {
  makeDirectory("water_simple");
  var files = fs.readdirSync("./geojson");
  files = files.filter(function(f) {
    return f.indexOf("areawater")!==-1;
  });
  var settings = gridConfig.high;
  makeDirectory("./webroot/water");
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
    f = f.replace(".json","");
    fs.writeFileSync("./webroot/water/" + f + ".bin", pako.deflate(JSON.stringify(topo)));
  });
  cb();
}));

gulp.task("index_water",  gulp.series("ogr2ogr", function(cb) {
  var files = fs.readdirSync("./filtered");
  files = files.filter(function(e) {
    return e.indexOf("tract")!==-1;
  });
  var r = {};
  function lpad(n, l) {
    n = n + "";
    while (n.length < l) {
      n = "0" + n;
    }
    return n;
  }
  files.forEach(function(f) {
    var fIndex = {};
    var features = JSON.parse(fs.readFileSync("./filtered/" + f)).features;
    features.forEach(function(f) {
      fIndex[f.properties.STATEFP10*1000 + f.properties.COUNTYFP10*1] = true;
    });
    var fArr = [];
    for (var cfips in fIndex) {
      if (fIndex.hasOwnProperty(cfips)) {
        fArr.push(lpad(cfips,5));
      }
    }
    r[f] = fArr;
  });
  fs.writeFileSync("./tmp/waterIndex.json", JSON.stringify(r, null, " "));
  cb();
}));

gulp.task("download_shapefiles", function(cb) {
  var files = [
    "https://www2.census.gov/geo/tiger/TIGER2020/CBSA/tl_2020_us_cbsa.zip",
    "https://www2.census.gov/geo/tiger/TIGER2020/CNECTA/tl_2020_us_cnecta.zip",
    "https://www2.census.gov/geo/tiger/TIGER2020/CSA/tl_2020_us_csa.zip",
    "https://www2.census.gov/geo/tiger/TIGER2020/METDIV/tl_2020_us_metdiv.zip",
    "https://www2.census.gov/geo/tiger/TIGER2020/NECTA/tl_2020_us_necta.zip",
    "https://www2.census.gov/geo/tiger/TIGER2020/NECTADIV/tl_2020_us_nectadiv.zip",
    "http://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_us_state_500k.zip",
    "https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/cultural/ne_10m_populated_places.zip"
  ];
  for (var state in fips) {
    if (fips.hasOwnProperty(state)) {
      files.push("https://www2.census.gov/geo/tiger/TIGER2010/TRACT/2010/tl_2010_" + zeroPad(state) + "_tract10.zip");
      files.push("https://www2.census.gov/geo/tiger/TIGER2020/PLACE/tl_2020_" + zeroPad(state) + "_place.zip");
    }
  }
  var waterfiles = fs.readFileSync("./src/water_files.csv","utf-8");
  waterfiles = waterfiles.split(/\r?\n/);
  waterfiles.forEach(function(f) {
    files.push("https://www2.census.gov/geo/tiger/TIGER2017/AREAWATER/" + f);
  });
  var array_of_promise_factories = [];
  files.forEach((f)=> {
    array_of_promise_factories.push(function() {
      return new Promise((resolve)=> {
        var filename = f.split("/")[f.split("/").length - 1];
        if (fs.existsSync("./download/" + filename)) {
          console.log("file exists " + f);
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
      });
    });
  });
  makeDirectory("./download");
  parallel_exec(array_of_promise_factories, 8, cb);
});
gulp.task("clip_cbsa", /*["filter_geojson"],*/ function(cb) {
  function clip_cbsa(cbsa) {
    var states = JSON.parse(fs.readFileSync("./geojson/cb_2020_us_state_500k.json"));
    var topostate = topojson.topology({districts:states});
    topostate = topojson.quantize(topostate, {
      scale:[0.00001,0.00001],
      translate:[0,0]
    });
    var merged = topojson.merge(topostate, topostate.objects.districts.geometries);
    var r = [];
    var intersect;
    try {
      cbsa.features.forEach(function(f, i) {
        //console.log(merged, f.geometry);
        //if (f.properties.GEOID*1 !== 41980) return;
        intersect = turf.intersect(merged, f.geometry);
        intersect.properties = f.properties;
        r.push(intersect);

      });
    } catch (ex) {
      console.log(ex);
    }
    console.log(r)
    cbsa.features = r;
    return cbsa;
  }
//  if (fs.existsSync("./filtered/tl_2020_us_cbsa.json")) {
//    cb();
//    return;
//  }
  var cbsa = JSON.parse(fs.readFileSync("./tmp/cbsa_filtered_unclipped.json"));
  var clipped_cbsa = clip_cbsa(cbsa);
  //console.log(clipped_cbsa)
  fs.writeFileSync("./filtered/tl_2020_us_cbsa.json", JSON.stringify(clipped_cbsa, null, " "));
  clipped_cbsa.features.forEach((feature)=>{
    console.log(feature.properties.GEOID)
    var cbsa_file = {
      type: "FeatureCollection",
      features: [feature]
    };
    fs.writeFileSync("./filtered/tl_2020_us_cbsa_" + feature.properties.GEOID + ".json", JSON.stringify(cbsa_file, null, " "));
  });
  cb();
});

gulp.task("consolidate_place_names", function(cb) {
  var files = fs.readdirSync("./geojson/").filter(function(a) {
    return a.indexOf("_place.json")!==-1;
  })
  var combined = [];
  files.forEach((file)=>{
    var places = JSON.parse(fs.readFileSync("./geojson/" + file, "utf-8"));
    places.features.forEach((place)=>{
      combined.push(place.properties);
    })
  })
  fs.writeFileSync("./tmp/places.json", JSON.stringify(combined));
})

gulp.task("tract_csv_parse", function(cb) {
  var files = fs.readdirSync("./src/csv");
  var csvs = [];
  files.forEach((file)=>{
    csvs.push([fs.readFileSync("./src/csv/" + file, "utf-8"), file]); 
  });
  makeDirectory("./tmp");
  csvs.forEach((csv)=>{
    csv_parse(csv[0], function(err, d) {
      fs.writeFileSync("./tmp/" + csv[1].replace(".csv",".json"), JSON.stringify(d), "utf-8");
      cb();
    });
  });
});

gulp.task("minority_threshold_parse", function(cb) {
  var csv = fs.readFileSync("./src/csv/minority_threshold.csv", "utf-8");
  makeDirectory("./tmp");
  csv_parse(csv, function(err, d) {
    fs.writeFileSync("./tmp/minority_threshold.json", JSON.stringify(d), "utf-8");
    cb();
  });
});

gulp.task("merge_csv", function(cb) {
  /*filename, merge_column*/

  var files = fs.readdirSync("./tmp").filter((f)=>{
    return f.indexOf("_2023.json") !== -1;
  });

  var other_data_layers = ["tract_ethnicity","tract_poverty", "tract_safmr"];

  var postprocess = {
    "tract_ethnicity" : function(row) {
      row.data.ethnicity_nonwhite = row.data.ethnicity_tot_pop - row.data.ethnicity_white;
      row.data.ethnicity_nonwhite_percentage = row.data.ethnicity_nonwhite / row.data.ethnicity_tot_pop;
      return row;
    },
    "tract_safmr" : function(row) {
      var hcv_total = 0;
      if (row.data.hcv_total) {
        hcv_total = row.data.hcv_total[12]*12
      }
      row.data.safmr_unused = Math.max(0, row.data.safmr_tot_safmr_vau - hcv_total)
      return row;
    }
  }

  var r = {};
  var name_lookup = {};

  files.forEach((filename)=>{
    var file = JSON.parse(fs.readFileSync("./tmp/" + filename, "utf-8"));
    var header1 = file.shift();
    var header2 = file.shift();
    var dataset = filename.replace("_2023.json","");
    file.forEach((row, i)=> {
      var tract_id = row[0];
      r[tract_id] = r[tract_id] || {};
      var d = r[tract_id];
      d.cbsa = row[1];
      name_lookup[row[1]] = row[2];
      d.data = d.data || {};
      d.data[dataset] = {};
      header2.forEach((cell, j)=> {
        if (j < 3) {
          header_name = cell;
        } else {
          var dots = cell.replace(" HH","")*1;
          var value = isNaN(row[j]*1) ? row[j] : row[j]*1;
          d.data[dataset][dots] = value;
        }
      });
    });
  });

  other_data_layers.forEach((layer)=> {
    var data = JSON.parse(fs.readFileSync("./tmp/" + layer + ".json", "utf-8"));
    var headers = data.shift();
    console.log(headers);
    data.forEach((row)=>{
      var id = row[0];
      var cbsa = row[1];
      r[id] = r[id] || {cbsa: cbsa, data:{}};
      headers.forEach((header, j)=>{
        if (j > 2) {
          var value = isNaN(row[j]*1) ? row[j] : row[j]*1;
          r[id].data[layer.replace("tract_","") + "_" + header] = value;
        }
      });
      if (postprocess[layer]) {
        r[id] = postprocess[layer](r[id]);
      }
    });
    //fs.writeFileSync("./tmp/tract_" + layer + "_by_id.json", JSON.stringify(r), "utf-8");
  });

  
  fs.writeFileSync("./tmp/tract_data_all.json", JSON.stringify(r, null, " "), "utf-8");
  fs.writeFileSync("./tmp/names.json", JSON.stringify(name_lookup, null, " "), "utf-8");
  cb();

});

gulp.task("split_data",  function(cb) {
  /*if (fs.existsSync("./tmp/names.json")) {
    if (typeof(cb)==="function") {cb();}
    return;
  }*/
  var r = {};
  var data = JSON.parse(fs.readFileSync("./tmp/tract_data_all.json"));
  var split = {};

  Object.keys(data).forEach(function(tract, i) {
    var row = data[tract];
    var {cbsa} = row;
    /*row.splice(2, 1);
    r[tract] = row.slice(1);*/
    //r[tract] = row;
    if (typeof(split[cbsa])==="undefined") {
      split[cbsa] = {};
    }
    split[cbsa][tract] = row.data;
    /*do this to comply w/ HUD reporting requirements*/
    /*for (var j = 8;j<=10;j++) {
      r[tract][j] = Math.round(r[tract][j]/12);
    }*/
    
  });
  makeDirectory("./webroot/data");
  for (var cbsa in split) {
    if (split.hasOwnProperty(cbsa)) {
      //var csv_split_data = splitDataToCSV(blurred_split[cbsa]);
      fs.writeFileSync("./webroot/data/"+cbsa + ".inflated.json", JSON.stringify(split[cbsa], null, " "),"utf-8");
      /*fs.writeFileSync("./webroot/data/"+cbsa + ".inflated.csv", csv_split_data);*/
      fs.writeFileSync("./webroot/data/"+cbsa+".bin", pako.deflate(JSON.stringify(split[cbsa])));
    }
  }
  cb();

});


gulp.task("filter_geojson", gulp.series(/*"ogr2ogr","split_data", */function(cb) {
  function existsInData(feature, data) {
    var geoid = feature.properties.GEOID10;
    if (typeof(geoid)==="undefined") {
      geoid = feature.properties.GEOID;
    }
    //geoid*=1;
    if (typeof(data[geoid])!=="undefined") {
      var r = {exists: true};
      r.cbsa = data[geoid].cbsa
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
  var tract_data = JSON.parse(fs.readFileSync("./tmp/tract_data_all.json"));
  var cbsa_org = JSON.parse(fs.readFileSync("./geojson/tl_2020_us_cbsa.json"));
  var cbsa_names = JSON.parse(fs.readFileSync("./tmp/names.json"));
  var cbsa = {
    "type": "FeatureCollection",
    "features" : []
  };

  for (var i = 0, ii = cbsa_org.features.length; i<ii; i++) {
    if (existsInData(cbsa_org.features[i], cbsa_names)!==-1) {
      cbsa.features.push(cbsa_org.features[i]);
    }
  }
  fs.writeFileSync("./tmp/cbsa_filtered_unclipped.json", JSON.stringify(cbsa, null, " "));

  makeDirectory("./filtered");
  /*if (fs.existsSync("./filtered/tl_2020_us_cbsa.json")) {
    cb();
    return;
  }
  cbsa = clip_cbsa(cbsa);
  fs.writeFileSync("./filtered/tl_2020_us_cbsa.json", JSON.stringify(cbsa, null, " "));*/
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
    var fileIndex = [];
    for (var file in index) {
      if (index.hasOwnProperty(file)) {
        fileIndex.push(file);
        if (file.indexOf("tl_2010_tract")!==-1) {
          fileIndex.push(file.replace("tl_2010_tract_","redlining_"));
        }
      }
    }
    fs.writeFileSync("./tmp/fileIndex.json", JSON.stringify(fileIndex, null, " "));
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
    if (f==="tl_2020_us_cbsa.json") {
      index[f.replace(".json","")] = true;
      cb();
      return;
    }
    if (f.indexOf("tract")!==-1) {
      fs.readFile("./geojson/" + f, function(err, d) {
        d = JSON.parse(d);
        for (var i = 0, ii = d.features.length; i<ii; i++) {
          var cbsa = existsInData(d.features[i], tract_data).cbsa;
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


}));


gulp.task("topojson_dir", function(cb) {
  makeDirectory("./topojson");
  cb();
});

gulp.task("topojson", gulp.series(/*"topojson_dir","filter_geojson","buildDirectory"*/ function(done) {
  var files = fs.readdirSync("./filtered");
  files = files.filter(function(f) {
    if (f.indexOf("areawater")===-1) {
      return true;
    }
    return false;
  });
  var sizes = [];
  makeDirectory("./webroot/topojson");
  makeDirectory("./webroot/topojson/high");
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
      converts.push({
        settings,
        f
      });
    });
    chunk_tasks_to_workers(converts, {
      response_handler: (result) => {
        console.log(result.dest);
      },
      chunk_size: 10,
      num_slots: 16,
      worker_filename: "./worker_scripts/topojson.js"
    }, _cb);
  }
}));


gulp.task("minorityconc", gulp.series("split_data", function(cb) {
  var data = require("./tmp/minority_threshold.json");
  var names = invert(require('./tmp/names.json'));
  function invert(o) {
    var r = {};
    for (var key in o) {
      if (o.hasOwnProperty(key)) {
        r[o[key]] = key;
      }
    }
    return r;
  }
  var thresholds = {};
  for (var i = 0, ii = data.length; i<ii;i++) {
    for (var cbsa in names) {
      if (names.hasOwnProperty(cbsa)) {
        if (cbsa.indexOf(data[i][0])!==-1 || data[i][0].indexOf(cbsa)!==-1) {
          thresholds[names[cbsa]] = data[i][1];
        }
      }
    }
  }
  fs.writeFileSync("./tmp/thresholds.json", JSON.stringify(thresholds, null, " "), "utf-8");
  cb();
}));


/*gulp.task("binData", gulp.series("temp", function(cb) {
  var binner = require("./src/binData.js");
  
  fs.writeFileSync("./tmp/bins.json",JSON.stringify(bins),"utf-8");
  cb();
}));*/

gulp.task("binCBSA", gulp.series("temp","split_data", function(cb) {
  var file_handler = require("./src/binData.js");
  var names= require("./tmp/names.json");
  var tasks = [];
  var all_bins_data = JSON.parse(fs.readFileSync("./tmp/tract_data_all.json","utf-8"));
  var all_bins = file_handler(all_bins_data, null);
  fs.writeFileSync("./tmp/bins.json", JSON.stringify(all_bins));
  Object.keys(names).forEach((cbsa)=> {
    tasks.push(new Promise((resolve)=>{
      var data = JSON.parse(pako.inflate(fs.readFileSync("./webroot/data/" + cbsa + ".bin"),{to:"string"}));
      var bin_json = file_handler(data, cbsa);
      fs.writeFileSync("./webroot/data/bin_"+cbsa+".json", JSON.stringify(bin_json));
      resolve();
    }))
    
  });
  Promise.all(tasks).then(function() {
    if (typeof(cb)==="function") {
      cb();
    }
  });
}));