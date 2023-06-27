import { getURLBase } from "./get_url_base"
import pako from "pako"
import axios from 'axios'
import {feature} from "topojson"

function downloadTractShapefiles(filename) {
  return new Promise((resolve)=>{
    filename = filename.split(".")
    var ext = filename[filename.length - 1]
    filename = filename.join(".")
    const url_base = getURLBase()
    console.log(url_base + "/" + filename)
    var options = {}
    if (ext==="bin") {
      options.responseType = 'arraybuffer'
    }
    axios.get(url_base + "/" + filename, options).then((res)=>{
      var data = res.data;
      if (ext==="bin") {
        data = pako.inflate(data,{to:"string"});
      }
      data = JSON.parse(data)
      var geojson = feature(data, data.objects.districts)
      resolve(geojson)
    })
  })
}

export { downloadTractShapefiles }