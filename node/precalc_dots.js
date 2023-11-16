const fs = require("fs")
const pako = require("pako")
const { processWaterFiles } = require("./src/js/voucher_map/process_water_files.js")
const { feature } = require("topojson")
const geojson_bbox = require("geojson-bbox")
const { featureContains } = require("./src/js/voucher_map/feature_contains.js")
const seedrandom  = require("seedrandom")
const { bbox_overlap } = require("./src/js/voucher_map/bbox_overlap.js")
const { handle_dots_for_feature } = require("./src/js/voucher_map/handle_dots_for_feature.js")
const { process_pop_density_csv } = require("./src/js/process_pop_density_csv.js")
const dotDensities = JSON.parse(fs.readFileSync("./tmp/cbsa_densities.json"));
const { index_pop_density } = require("./src/js/voucher_map/index_pop_density.js")
const { get_deflator } = require("./src/js/voucher_map/dot_deflator.js")
const { calculateNumberOfDots } = require("./src/js/voucher_map/calculate_number_of_dots.js")
const { fork } = require('node:child_process');
const os = require("os")


var programs = ["hcv", "pbra", "ph"]
var households = ["total", "children", "children_poc", "disability"];
var others = [
  "ethnicity_white_dots",
  "ethnicity_aian_dots",
  "ethnicity_asian_dots",
  "ethnicity_black_dots",
  "ethnicity_hisp_dots",
  "ethnicity_multi_dots",
  "ethnicity_nhpi_dots",
  "ethnicity_other_dots",
  "ethnicity_tot_pop",
  "safmr_tot_safmr_vau_dots"
]
const represents = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 12].reverse();

const layers = [];


others.forEach((other) => {
  represents.forEach((represent) => {
    layers.push([other, represent])
  })
})

programs.forEach((program) => {
  households.forEach((household) => {
    represents.forEach((represent) => {
      layers.push([[program, household].join("_"), represent])
    })
  })
})

var child_process_tracker = function() {
  this.status = "ready"
  var child;
  var self = this;
  this.start = function(args) {
    return new Promise((resolve) => {
      this.status = "busy";
      child = fork("./precalc_dots.js", ["child"])
      child.send(args)
      child.on("message", (m) => {
        self.status = "ready";
        console.log("child says " + m)
        resolve(m);
      })
    })
  }
}

const waterIndex = JSON.parse(fs.readFileSync("./tmp/waterIndex.json"));
async function precalc_dots() {
  var topo = fs.readdirSync("./webroot/topojson/high");
  try {
    fs.mkdirSync("./webroot/data/dots");
  } catch (ex) {}
  var slots = Math.max(1, os.cpus().length - 1);
  var workers = [];
  for (var i = 0; i <= slots; i++) {
    workers.push(new child_process_tracker())
  }
  var jobs = [];
  //topo.length = 2;
  var water_by_cbsa = {}
  for (file of topo) {
    if (file.indexOf("tl_2010_tract_","")===-1) {continue;}
    var water_files = waterIndex[file.replace(".bin",".json")];
    var cbsa = file.replace("tl_2010_tract_", "").replace(".bin","");
    var water_data = []
    water_files.forEach((water_file) => {
      water_data.push(JSON.parse(pako.inflate(fs.readFileSync("./webroot/water/tl_2017_" + water_file + "_areawater.bin"), {to: "string"})));
    })
    water_by_cbsa[cbsa] = await processWaterFiles(water_data, { feature, geojson_bbox })
    console.log(cbsa);
  }
  console.log("here");
  topo.forEach((file) => {
    if (file.indexOf("tl_2010_tract_","")===-1) {return;}
    var cbsa = file.replace("tl_2010_tract_", "").replace(".bin","");
    console.log(" " + cbsa)
    try {
      fs.mkdirSync("./webroot/data/dots/" + cbsa);
    } catch (ex) {}
    var dot_deflator = get_deflator(dotDensities[cbsa]);
    var pop_density = process_pop_density_csv(fs.readFileSync("./webroot/data/pop_density/compressed/tl_2010_tract_" + cbsa + ".bin"));
    var water = water_by_cbsa[cbsa]
    var data = JSON.parse(pako.inflate(fs.readFileSync("./webroot/topojson/high/" + file),{to:"string"}));
    var housing_data = JSON.parse(pako.inflate(fs.readFileSync("./webroot/data/" + cbsa + ".bin"), {to:"string"}))
    var { features } = feature(data, data.objects.districts);
    var water_features = [];
    water.forEach((water_group)=>{
      water_group.features.forEach((feature)=>{
        water_features.push(feature)
      })
    })
    layers.forEach((layer) => {
      var destfile = "./webroot/data/dots/" + cbsa + "/" + layer.join("_") + ".bin";
      if (fs.existsSync(destfile)) {return;}
      
      jobs.push({
        dot_deflator,
        dot_represents: layer[1],
        layer_id: layer.join("_"),
        name: layer[0],
        pop_density,
        features,
        water_features,
        file,
        housing_data, 
        pop_density, 
        cbsa
      })
      return;
      var csv = []
      features = prepare_features(features, housing_data, pop_density, cbsa)
      features.forEach((feature) => {
        var args = {
          dot_deflator,
          dot_represents: layer[1],
          feature,
          layer_id: layer.join("_"),
          name: layer[0],
          pop_density,
          these_dots: []
        }
        var result = handle_dots_for_feature(args, water_features, {
          featureContains,
          seedrandom,
          bbox_overlap
        });
        result.forEach((coord, i) => {
          csv.push(result[i]);
        })
      })
      fs.writeFileSync(destfile, compress(csv), "utf-8");
    })
  })

  function startNextJob() {
    var still_busy = false;
    workers.forEach((worker) => {
      if (jobs.length) {
        var job = jobs[0];
        if (worker.status === "ready") {
          console.log("start job")
          worker.start(job).then(startNextJob)
          jobs.shift()
        }
      } else {
        if (worker.status === "busy") {
          still_busy = true;
        }
      }
    })
    if (!still_busy && !jobs.length) {
      console.log("finished!");
    }
  }
  startNextJob()
}

function prepare_features(features, housing_data, pop_density, cbsa) {
  features.forEach((feature) => {
    feature.bbox = geojson_bbox(feature)
    var tract_id = feature.properties.GEOID10
    if (typeof(housing_data[tract_id])) {
      feature.properties.housing_data = housing_data[tract_id]
    }
    feature.properties.pop_density_index = index_pop_density(feature, pop_density)
  })
  features = calculateNumberOfDots(features, cbsa)
  return features;
}

function calculate_dots(job) {
  var {
    dot_deflator,
    dot_represents,
    layer_id,
    name,
    pop_density,
    features,
    water_features,
    file,
    housing_data,
    pop_density,
    cbsa
  } = job;
  var csv = []
  features = prepare_features(features, housing_data, pop_density, cbsa)
  features.forEach((feature) => {
    var args = {
      dot_deflator,
      dot_represents,
      feature,
      layer_id,
      name,
      pop_density,
      these_dots: []
    }
    var result = handle_dots_for_feature(args, water_features, {
      featureContains,
      seedrandom,
      bbox_overlap
    });
    result.forEach((coord, i) => {
      csv.push(result[i]);
    })
  })
  fs.writeFileSync("./webroot/data/dots/" + cbsa + "/" + layer_id + ".bin", compress(csv), "utf-8");
}

function compress(csv) {
  var x_tot = 0, y_tot = 0;
  csv.forEach((row) => {
    x_tot += row[0];
    y_tot += row[1];
  })
  var cx = Math.round(x_tot/csv.length*10000)/10000;
  var cy = Math.round(y_tot/csv.length*10000)/10000;
  csv.forEach((row) => {
    row[0] = Math.round((row[0] - cx)*10000)/10000;
    row[1] = Math.round((row[1] - cy)*10000)/10000;
    row = row.join(",");
  })
  csv.unshift([cx, cy].join(","));
  return pako.deflate(csv.join("\n"));
}

if (process.argv.length === 2) {
  precalc_dots()
} else {
  //calculate_dots(process.argv[2])
}

process.on("message", function(msg) {
  calculate_dots(msg);
  process.send({msg:"done"})
  process.exit(1);
})