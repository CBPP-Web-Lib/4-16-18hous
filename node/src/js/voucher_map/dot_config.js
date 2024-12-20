import distinctColors from 'distinct-colors'

const voucher_num_dots = function(z) {
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

const pop_num_dots = function(z) {
  if (z < 5) {
    return 10000; 
  }
  if (z > 12) {
    return 12;
  }
  return {
    5: 5000,
    6: 2000,
    7: 1000,
    8: 500,
    9: 200,
    10: 100,
    11: 50,
    12: 20
  }[z]
}

function get_name(code) {
  code = code.split("_")
  var program = code[0]
  code.shift()
  var household = code.join("_")
  return (
    {
      "total": "households using ",
      "children": "families with children using ",
      "children_poc": "families of color with children using ",
      "disability": "households with a member with a disability using ",
    }[household] + {
      "hcv": "housing vouchers",
      "pbra": "project-based rental assistance",
      "ph": "public housing"
    }[program]
  )
}

const voucher_dot_config = (code)=>{

  var name = get_name(code)

  return {
    //fill: "#39178f",
    fill: "rgba(111, 66, 245, 0.8)",
    "fill-opacity":0.5,
    "stroke-opacity": 0.8,
    stroke: "#fff",
    radius: 3,
    "stroke-width": 1.5,
    numDots: voucher_num_dots,
    name: name,
    type: "voucher"
  }
}

var ethnicity_palette = distinctColors({
  count: 8,
  chromaMin:80,
  chromaMax:100,
  lightMin:50,
  lightMax:80
})

const dotConfig = {
  "default": {
    fill: "#000",
    "fill-opacity":1,
    "stroke-opacity":1,
    stroke:"rgba(0, 0, 0, 0.2)",
    "stroke-width":0.5,
    radius:1.5,
    numDots: pop_num_dots
  },
  "ethnicity_aian_dots": {fill:"#31d9dd88"},
  "ethnicity_asian_dots": {fill:"#1ad35c88"},
  "ethnicity_black_dots": {fill:"#e28f4488"},
  "ethnicity_hisp_dots": {fill:"#c1c11a88"},
  "ethnicity_multi_dots": {fill:"#a3a3a388"},
  "ethnicity_nhpi_dots": {fill:"#3f3f3f88"},
  "ethnicity_nonwhite_dots": {fill:ethnicity_palette[5].hex()+ "bb"},
  "ethnicity_other_dots": {fill:"#1ea5a588"},
  "ethnicity_tot_pop_dots": {fill:"#2228"},
  "ethnicity_white_dots": {fill:"#99b9d688"},
  "safmr_tot_safmr_vau_dots": {
    fill: "rgba(185, 89, 194, 0.4)",
    "stroke-opacity": 0.8,
    stroke: "rgb(0, 0, 0, 0)",
    radius: 3,
    "stroke-width": 0,
    numDots: voucher_num_dots,
    name: "Voucher-affordable units",
    type: "safmr_dots"
  }
}

var programs = ["hcv", "ph", "pbra"];
var household_types = ["total", "children", "children_poc", "disability"];
programs.forEach((program) => {
  household_types.forEach((household_type) => {
    var layer_name = [program, household_type].join("_")
    dotConfig[layer_name] = voucher_dot_config(layer_name)
  })
})

export { dotConfig }