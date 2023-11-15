function index_pop_density(tract, density) {
  var index = [];
  density.forEach((point, i) => {
    if (bbox_contains(tract.bbox, point)) {
      index.push(i)
    }
  })
  return index
}

var bbox_contains = function(bbox, point) {
  var inside_box = true;
  if (point[0] < bbox[0] - 0.01) {inside_box = false;}
  if (point[0] > bbox[2] + 0.01) {inside_box = false;}
  if (point[1] < bbox[1] - 0.01) {inside_box = false;}
  if (point[1] > bbox[3] + 0.01) {inside_box = false;}
  return inside_box
}

module.exports = { index_pop_density }