import { getURLBase } from "./get_url_base"
import pako from "pako"
import axios from 'axios'

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
      resolve(data)
      
    })
  })
}

export { downloadTractShapefiles }