const dotConfig = {
  "hcv_total": {
    //fill: "#39178f",
    fill: "#660000",
    "fill-opacity":0.5,
    "stroke-opacity": 0.8,
    stroke: "#fff",
    radius: 3,
    "stroke-width": 1,
    numDots: function(z) {
      if (z < 7) {
        return 1000; 
      }
      if (z > 11) {
        return 12;
      }
      return {
        7: 500,
        8: 200,
        9: 100,
        10: 50,
        11: 20,
      }[z]
    }
  }
}

export { dotConfig }