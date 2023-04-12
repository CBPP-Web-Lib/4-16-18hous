var numBins = 8;
var thresholds = require("../tmp/thresholds.json");

var config = {
  "znonwhite": {
    dataSplit: function(cbsa) {
      if (cbsa===null) {return 0.5;}
      console.log(cbsa, thresholds[cbsa]);
      return thresholds[cbsa];
    },
    binSplit: 4
  }
};

module.exports = function(data, hasHeaders, specialOptions, cbsa) {
  var bins = [];
  var data_by_col = {};
  var configByCol = {};
  /*var configByCol = {};*/
  for (var columnName in specialOptions) {
    configByCol[columnName] = {};
    if (config[columnName]) {
      configByCol[columnName] = {dataSplit: config[columnName].dataSplit, binSplit: config[columnName].binSplit};
    }
    /*if (specialOptions.hasOwnProperty(columnName)) {
      configByCol[columnName] = config[columnName];
    }*/
  }
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
    var c = configByCol[col_name];
    if (typeof(bins[j])==="undefined") {
      bins[j] = [];
    }
    console.log(configByCol);
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
    bins[j].push(col[col.length-1]+0.01);
  });
  return bins;
};