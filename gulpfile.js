/*globals require, Promise*/
var gl = require("./CBPP_shared_gulp/gulplib.js")(), gulp = gl.gulp, fs = gl.fs;
var request = require("request");
var unzip = require("gulp-unzip");
var ogr2ogr = require("ogr2ogr");
var topojson = require("topojson");
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
gl.gulp.task("topojson", ["topojson_dir","geojson"], function(cb) {
  /*var geocounties = require("./geojson/alaska.json");
  var topocounties = topojson.topology({districts:geocounties});
  topocounties = topojson.quantize(topocounties, 40000);
  topocounties = topojson.presimplify(topocounties);
  topocounties = topojson.simplify(topocounties,0.003);
  fs.writeFileSync("topojson/alaska.json", JSON.stringify(topocounties));
  cb();*/
});
