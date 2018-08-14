var numBins = 8;

var config = {
  6: {
    dataSplit: 0.5,
    binSplit: 4
  }
};

module.exports = function(data) {
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
    var n;
    var c = config[j-2];
    if (typeof(c)!=="undefined") {
      if (typeof(c.dataSplit)!=="undefined") {
       
        console.log(c);
        var l1=0, l2=0;
        for (var i = 0, ii = col.length;i<ii;i++) {
          if (col[i] < c.dataSplit) {
            l1++;
          } else {
            l2++;
          }
        }
        console.log(l1, l2);
        var binSplit = c.binSplit;
        for (n = 0; n<binSplit;n++) {
          if (typeof(bins[j])==="undefined") {
            bins[j] = [];
          }
          console.log(n/binSplit*l1);
          bins[j].push(col[Math.floor(n/binSplit*l1)]);
        }
        for (n = 0; n<numBins-binSplit;n++) {
          if (typeof(bins[j])==="undefined") {
            bins[j] = [];
          }
          console.log(l1+n/(numBins-binSplit)*l2);
          bins[j].push(col[l1+Math.floor(n/(numBins-binSplit)*l2)]);
        }
      }
    } else {
      for (n = 0; n<numBins;n++) {
        if (typeof(bins[j])==="undefined") {
          bins[j] = [];
        }
        bins[j].push(col[Math.floor(n/numBins*l)]);
      }
    }
    bins[j].push(col[col.length-1]);
  });
  return bins;
};