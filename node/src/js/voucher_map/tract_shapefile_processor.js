import { feature, merge } from "topojson"
import { removeHoles } from "./remove_holes"
import geojson_bbox from "geojson-bbox"
import * as deepcopy from 'deepcopy/index.js' 

const processTractShapefiles = function(data) {
  return new Promise((resolve)=>{
    console.log(data);
    var geojson = feature(data, data.objects.districts)

    geojson.features.forEach((tract)=>{
      tract.bbox =  geojson_bbox(tract)
    })

    var merged = merge(data, data.objects.districts.geometries)
    merged = removeHoles(merged)
    var inverted_merged = deepcopy(merged)
    inverted_merged.coordinates[0].forEach((ring, i)=>{
      inverted_merged.coordinates[0][i].reverse()
    })

    /*put a huge box as the first polygon - we want the merged cbsa
    to "punch a hole" in it*/
    var invert_box = [
      [-179, 0],
      [-179, 70],
      [0, 70],
      [0, 0],
      [-179, 0]
    ]
    inverted_merged.coordinates[0].unshift(invert_box)
    resolve({geojson, merged, inverted_merged})
  })
}

export { processTractShapefiles }
