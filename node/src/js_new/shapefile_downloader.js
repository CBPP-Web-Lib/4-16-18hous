import { getURLBase } from "./get_url_base"
import pako from "pako"
import axios from 'axios'
import { feature, merge } from "topojson"

function downloadTractShapefiles(filename) {
  return new Promise((resolve)=>{
    const url_base = getURLBase()
    var options = {
      responseType: 'arraybuffer'
    }
    axios.get(url_base + "/" + filename, options).then((res)=>{
      var data = res.data;
      data = pako.inflate(data,{to:"string"});
      data = JSON.parse(data)
      var geojson = feature(data, data.objects.districts)
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
  })
}

export { downloadTractShapefiles }