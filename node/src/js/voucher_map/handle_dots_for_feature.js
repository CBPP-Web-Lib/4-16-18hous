function get_density_for_dot(dot, tiles, max) {
  var nearest_tiles = tiles.filter((a) => {
    if (Math.abs(a[0] - dot[0]) > 0.01) {
      return false;
    }
    if (Math.abs(a[1] - dot[1]) > 0.01) {
      return false;
    }
    return true;
  })
  var dsquared = [];
  nearest_tiles.forEach((a) => {
    dsquared.push([a, Math.pow(a[0] - dot[0], 2) + Math.pow(a[1] - dot[1], 2)])
  })
  if (dsquared.length === 0) {
    return 0;
  }
  var min = dsquared[0][1]; 
  var minIndex = 0;
  dsquared.forEach((a, i) => {
    if (min > a[1]) {
      min = a[1]
      minIndex = i
    }
  })
  var density = dsquared[minIndex][0][2]
  return density/max
  
}

/*The idea here is that we want to draw the dots in the same places for
hcv_total, hcv_children, and hcv_children_poc because each subsequent one
is a smaller subset of the previous, so visually it should just look like dots
are disappearing/appearing when switching between them without them moving
around. But hcv_disability overlaps with all three, so it should be a different
unrelated subset of the total. By messing with the seed for the rng we can
achieve this*/
function get_layer_seed(name, data, dot_represents) {
  if (name.indexOf("_total") !== -1 || name.indexOf("_children") !== -1) {
    return {
      layer_seed_name: name.split("_")[0] + "subset",
      layer_seed_skip_percent: 0
    }
  }
  if (name.indexOf("_disability") !== -1) {
    var base = name.split("_")[0]
    return {
      layer_seed_name: base + "subset",
      layer_seed_skip_percent: data[name][dot_represents]/data[base + "_total"][dot_represents]
    }
  }
  return {
    layer_seed_name: name,
    layer_seed_skip_percent: 0
  }
}

function handle_dots_for_feature(args, water, imports, do_not_use_density) {
  if (typeof(do_not_use_density) === "undefined") {
    do_not_use_density = false;
  }
  var { featureContains, seedrandom, bbox_overlap } = imports;
  var { feature, name, dot_represents, layer_id, these_dots, dot_deflator, pop_density } = args
  var pop_density_tract = []
  feature.properties.pop_density_index.forEach((key) => {
    pop_density_tract.push(pop_density[key])
  })
  var max_density = 0;
  pop_density_tract.forEach((tile) => {
    max_density = Math.max(tile[2], max_density);
  })
  var geoid = feature.properties.GEOID10
  var bbox = feature.bbox
  var width = bbox[2] - bbox[0]
  var height = bbox[3] - bbox[1]

  if (!feature.properties.housing_data[name]) {
    return [];
  }
  if (!feature.properties.housing_data[name][dot_represents]) {
    return [];
  }
  var num_dots = Math.round(feature.properties.housing_data[name][dot_represents] * dot_deflator)
  these_dots = []
  var dots_made = these_dots.length
  var attempt = 0
  var total_attempts = 0
  var skip_rng = new seedrandom(geoid)
  var skipped = 0;
  var {layer_seed_name, layer_seed_skip_percent} = get_layer_seed(name, feature.properties.housing_data, dot_represents)
  while (dots_made < num_dots && total_attempts <= num_dots*20000) {
    total_attempts++
    if (total_attempts >= num_dots*20000) {
      console.log("Warning: aborted dot draw after too many failed attempts")
    }
    var seed = [geoid, layer_seed_name, dot_represents, (dots_made + skipped), attempt].join("")
    attempt++;
    var rng = new seedrandom(seed)
    var dot = [
      rng()*width + bbox[0],
      rng()*height + bbox[1]
    ]
    dot[0] = Math.round(dot[0]*10000)/10000
    dot[1] = Math.round(dot[1]*10000)/10000
    var in_water = false;
    water.forEach((water_feature)=>{
      if (in_water) return;
      if (!bbox_overlap(feature.bbox, water_feature.bbox)) {
        return;
      }
      if (featureContains(dot, water_feature)) {
        in_water = true;
      }
    })
    //in_water = false
    var pop_density_of_max
    if (!in_water) {
      pop_density_of_max = get_density_for_dot(dot, pop_density_tract, max_density)
    } else {
      pop_density_of_max = 0
    }
    var pop_density_test = rng();
    if (do_not_use_density === true) {
      pop_density_of_max = 1
    }
    if (featureContains(dot, feature) && !in_water && pop_density_test < pop_density_of_max) {
      these_dots.push(dot)
      if (skip_rng() < layer_seed_skip_percent) {
        skipped++;
      }
      skipped = Math.min(skipped, num_dots - dots_made)
      dots_made = these_dots.length
      attempt = 0
    }
  }
  //these_dots = these_dots.slice(0, num_dots)
  return these_dots
}

module.exports = { handle_dots_for_feature }