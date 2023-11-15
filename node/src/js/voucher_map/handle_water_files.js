import { getURLBase } from "../get_url_base"
import { feature } from "topojson"
import pako from "pako"
import axios from 'axios'
import geojson_bbox from "geojson-bbox"
import { processWaterFiles as processWaterFilesUniversal } from "./process_water_files"

const downloadWaterFiles = function(files) {
  const url_base = getURLBase()
  var options = {
    responseType: 'arraybuffer'
  }
  var promises = [];
  files.forEach((file)=>{
    promises.push(new Promise((resolve)=>{
      axios.get(url_base + "/water/tl_2017_" + file + "_areawater.bin", options).then((res)=>{
        var data = res.data;
        data = pako.inflate(data,{to:"string"});
        data = JSON.parse(data)
        resolve(data)
      })
    }));
  })
  return Promise.all(promises)
}

const processWaterFiles = function(d) {
  return processWaterFilesUniversal(d, {
    feature, geojson_bbox
  })
}

export { downloadWaterFiles, processWaterFiles }