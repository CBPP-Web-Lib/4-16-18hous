import { colorConfig } from "./color_config"

const tractFill = function(data) {
  var {
    d,
    active_layer,
    tract_bins
  } = data
  const value = d.properties.housing_data[active_layer]
  var bins = tract_bins[active_layer]
  if (colorConfig[active_layer].customBins) {
    bins = colorConfig[active_layer].customBins
  }
  var colors = colorConfig[active_layer].colors
  var fill
  bins.forEach((bin, i)=>{
    if (value > bin) {
      fill = colors[i]
    }
  })
  if (typeof(fill)==="undefined") {
    return "#fff"
  }
  return fill
}

export { tractFill }