const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
var topojson = require("topojson");
var pako = require("pako");
var fs = require("fs");

var makeDirectory = function(dir) {
  try {
    fs.mkdirSync(dir)
  } catch (ex) {
    if (ex.code!=="EEXIST") {
      throw (ex);
    }
  }
}

parentPort.on("message", function(e) {
  var list = e.list;
  var results = [];
  var Promises = [];
  list.forEach((item)=> {
    var result = do_topojson(item);
    Promises.push(result.file_promise);
    results.push({
      dest: result.dest
    });
  });
  Promise.all(Promises).then(function() {
    parentPort.postMessage({results});
  });
});


function do_topojson(item) {
  var {settings, f} = item;
  makeDirectory(settings.dest);
  var ext = "";
  if (settings.dest==="./topojson/low/") {
    ext = ".json";
  }
  var compressedf = f.replace(".json", ext);
  var dest = settings.dest + compressedf;

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

  if (fs.existsSync(dest) || exclude(f, settings)) {
    return {
      dest: dest,
      filePromise: new Promise((resolve)=>{resolve();})
    }
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
      var toWrite = JSON.stringify(topo);
      if (ext!==".json") {
        return {
          filePromise: new Promise((resolve)=> {
            fs.writeFile(dest, pako.deflate(toWrite), resolve);
          }),
          dest: dest
        }
      } else {
        return {
          filePromise: new Promise((resolve)=> {
            fs.writeFile(dest, toWrite, "utf-8", resolve);
          }),
          dest: dest
        }
      }
    } catch (ex) {
      console.log(ex);
    }
    resolve();
  }
}