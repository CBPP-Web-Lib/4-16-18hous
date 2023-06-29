import colorgen from "cbpp_colorgen"

const colorConfig = {
  "poverty_pov_pct": {
    customBins: [0,5,10,15,20,25,30,35,40,100.01],
    colors: (function() {
      var secRange = colorgen("#9dbed4","#edaf42", 5);
      secRange.shift();
      return colorgen("#f9fbff", "#9dbed4", 5).concat(secRange);
    })()
  },
  "ethnicity_nonwhite_percentage" : {
    colors: colorgen("#d7cabd","#a3876a",4).concat(colorgen("#b2b2f8","#6a6aa3",4))
  },
  "none": {
    customBins: [0, 1],
    colors: ["rgba(0, 0, 0, 0)"]
  }
}

export { colorConfig }