import colorgen from "cbpp_colorgen"

const colorConfig = {
  "poverty_pov_pct": {
    customBins: [0,5,10,15,20,25,30,35,40,100.01],
    name: "Poverty Rate",
    f: d=>d+"%",
    colors: (function() {
      var secRange = colorgen("#dbd3b6","#db6409", 5);
      //secRange.shift();
      //return colorgen("#e6f5f5", "#4a8270", 4).concat(secRange);
      return colorgen("#e6f5f5", "#96c3ba", 4).concat(secRange);
      return colorgen("#e6f5f5", "#4a8270", 9)
    })()
  },
  "ethnicity_nonwhite_percentage" : {
    f: d=>Math.round(d*100)+"%",
    name: "Percent People of Color",
    colors: (()=>{
      var r1 = colorgen("#d7cabd","#a3876a",4)
      var r2 = colorgen("#a3876a","#f2c0fc",5)
      r2.shift()
      return r1.concat(r2)
    })()
  },
  "none": {
    customBins: [0, 1],
    colors: ["rgba(0, 0, 0, 0)"]
  }
}

export { colorConfig }