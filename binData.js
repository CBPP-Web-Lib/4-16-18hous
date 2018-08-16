var numBins = 8;
var thresholds = require("./intermediate/thresholds.json");

var config = {
  "nonwhite": {
    dataSplit: function(cbsa) {
      if (cbsa===null) {return 0.5;}
      return thresholds[cbsa];
    },
    binSplit: 4
  }
};

module.exports = function(data, hasHeaders, specialOptions, cbsa) {
  var bins = [];
  var data_by_col = [];
  if (typeof(specialOptions)==="undefined") {
    specialOptions = {};
  }
  var configByCol = {};
  for (var columnName in specialOptions) {
    if (specialOptions.hasOwnProperty(columnName)) {
      configByCol[specialOptions[columnName]] = config[columnName];
    }
  }
  console.log(specialOptions);
  console.log(configByCol);
  if (typeof(hasHeaders)==="undefined") {
    hasHeaders = true;
  }
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
    var c = configByCol[j];
    if (typeof(c)!=="undefined") {
      if (typeof(c.dataSplit)!=="undefined") {
        var dataSplit = c.dataSplit(cbsa);
        console.log(c);
        var l1=0, l2=0;
        for (var i = 0, ii = col.length;i<ii;i++) {
          if (col[i] < dataSplit) {
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