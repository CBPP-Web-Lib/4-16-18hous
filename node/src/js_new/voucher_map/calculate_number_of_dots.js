import { shuffle } from "./shuffle_array"
import { data_keys} from "./ethnicity_data_keys"

const dot_sizes = [
  10000,
  5000,
  2000,
  1000,
  500,
  200,
  100,
  50,
  20,
  12
];

const calculateNumberOfDots = function(features, cbsa) {
  Object.keys(data_keys).forEach((key)=>{
    dot_sizes.forEach((dot_size)=>{
      var _features = Array.from(features);
      get_dots_for_data_key_and_size(_features, key, dot_size, cbsa)
    })
  })
  return features
}

function get_dots_for_data_key_and_size(features, key, dot_size, cbsa) {
  var seed = [key, dot_size, cbsa].join("_")
  features = shuffle(features, seed)
  var remainder = 0
  features.forEach((feature)=>{
    if (feature.properties.housing_data) {
      var value = feature.properties.housing_data[key]
      var unrounded_dots = value / dot_size
      var rounded_dots = Math.floor(unrounded_dots)
      var this_remainder = unrounded_dots - rounded_dots
      remainder += this_remainder
      if (remainder > 1) {
        rounded_dots++
        remainder--;
      }
      feature.properties.housing_data[key + "_dots"] = feature.properties.housing_data[key + "_dots"] || {}
      feature.properties.housing_data[key + "_dots"][dot_size] = rounded_dots
    }
  })
}

export { calculateNumberOfDots }