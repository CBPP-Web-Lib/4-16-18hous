import { feature, merge } from "topojson"
import geojson_bbox from "geojson-bbox"

const processTractShapefiles = function(data) {
  return new Promise((resolve)=>{
    var geojson = feature(data, data.objects.districts)

    geojson.features.forEach((tract)=>{
      tract.bbox =  geojson_bbox(tract)
    })

    var merged = merge(data, data.objects.districts.geometries)
    var inverted_merged = JSON.parse(JSON.stringify(merged));
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
