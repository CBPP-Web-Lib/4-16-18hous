module.exports = function(data, numBins) {
  var bins = [];
  var data_by_col = [];
  data.forEach((row, i)=> {
    if (i===0) return;
    row.forEach((cell,j)=> {
      if (!isNaN(cell*1)) {
        if (typeof(data_by_col[j])==="undefined") {
          data_by_col[j] = [];
        }
        data_by_col[j].push(cell*1);
      }
    });
  });
  data_by_col.forEach((col,j)=> {
    col = col.sort((a,b)=> {
      return a-b;
    });
    var l = col.length;
    for (var n = 0; n<numBins;n++) {
      if (typeof(bins[j])==="undefined") {
        bins[j] = [];
      }
      bins[j].push(col[Math.floor(n/numBins*l)]);
    }
    bins[j].push(col[col.length-1]);
  });
  return bins;
};