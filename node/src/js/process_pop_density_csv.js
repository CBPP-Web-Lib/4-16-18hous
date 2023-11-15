const pako = require("pako")

function process_pop_density_csv(data) {
  data = pako.inflate(data,{to:"string"});
  data = data.split("\n");
  var r = []
  data.forEach((row, j) => {
    row = row.split(",");
    row[0] = row[0]*1;
    row[1] = row[1]*1;
    if (!isNaN(row[2]*1)) {
      row[2] = row[2]*1
      r.push(row)
    }
  })
  return r;
}

module.exports = { process_pop_density_csv }