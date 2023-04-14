var numBins = 8;
var thresholds = require("../tmp/thresholds.json");

var config = {
  "znonwhite": {
    dataSplit: function(cbsa) {
      if (!cbsa) {return 0.5;}
      if (!thresholds[cbsa]) {
        return 0.5;
      }
      return thresholds[cbsa].replace("%","")*0.01;
    },
    binSplit: 4
  }
};

module.exports = function(data, hasHeaders, cbsa) {
  var bins = {};
  var data_by_col = {};
  if (typeof(hasHeaders)==="undefined") {
    hasHeaders = true;
  }
  data.forEach((row, i)=> {
    if (i===0) return;
    row.forEach((cell,j)=> {
      if (!isNaN(cell*1)) {
        var header_name = data[0][j];
        if (typeof(data_by_col[header_name])==="undefined") {
          data_by_col[header_name] = [];
        }
        data_by_col[header_name].push(cell*1);
      }
    });
  });
  
  Object.keys(data_by_col).forEach((col_name,j)=> {
    var col = data_by_col[col_name];
    col = col.sort((a,b)=> {
      return a-b;
    });
    var l = col.length;
    var n;
    var c = config[col_name];
    if (typeof(bins[col_name])==="undefined") {
      bins[col_name] = [];
    }
    if (typeof(c)!=="undefined") {
      if (typeof(c.dataSplit)!=="undefined") {
        var dataSplit = c.dataSplit(cbsa);
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
          
          //console.log(n/binSplit*l1);
          bins[col_name].push(col[Math.floor(n/binSplit*l1)]);
        }
        for (n = 0; n<numBins-binSplit;n++) {
          //console.log(l1+n/(numBins-binSplit)*l2);
          bins[col_name].push(col[l1+Math.floor(n/(numBins-binSplit)*l2)]);
        }
        console.log(bins[col_name]);
      }
    } else {
      for (n = 0; n<numBins;n++) {
        bins[col_name].push(col[Math.floor(n/numBins*l)]);
      }
    }
    bins[col_name].push(col[col.length-1]+0.001);
  });
  console.log(bins);
  return bins;
};