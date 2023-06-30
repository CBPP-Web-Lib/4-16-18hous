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

const voucher_dot_config = (name)=>{
  return {
    //fill: "#39178f",
    fill: "rgba(102, 0, 0, 0.5)",
    "fill-opacity":0.5,
    "stroke-opacity": 0.8,
    stroke: "#fff",
    radius: 3,
    "stroke-width": 1,
    numDots: voucher_num_dots,
    name: name,
    type: "voucher"
  }
}

const dotConfig = {
  "default": {
    fill: "#000",
    "fill-opacity":1,
    "stroke-opacity":1,
    stroke:"rgba(255, 255, 255, 0)",
    "stroke-width":0,
    radius:2,
    numDots: pop_num_dots
  },
  "ethnicity_aian_dots": {fill:"#e32b1e"},
  "ethnicity_asian_dots": {fill:"#419c25"},
  "ethnicity_black_dots": {fill:"#66246b"},
  "ethnicity_hisp_dots": {fill:"#998a06"},
  "ethnicity_multi_dots": {fill:"#a10a9c"},
  "ethnicity_nhpi_dots": {fill:"#128257"},
  "ethnicity_nonwhite_dots": {fill:"#593314"},
  "ethnicity_other_dots": {fill:"#290f59"},
  "ethnicity_tot_pop_dots": {fill:"#222"},
  "ethnicity_white_dots": {fill:"#253a5e"},
  "hcv_total": voucher_dot_config("Families with voucher"),
  "hcv_children": voucher_dot_config("Families with children, with voucher"),
  "hcv_children_poc": voucher_dot_config("Families of color, with children, with voucher")
}

export { dotConfig }