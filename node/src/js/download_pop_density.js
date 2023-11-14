import { getURLBase } from "./get_url_base"
import pako from "pako"
import axios from 'axios'

function downloadPopDensity(filename) {
  return new Promise((resolve)=>{
    const url_base = getURLBase()
    var options = {
      responseType: 'arraybuffer'
    }
    axios.get(url_base + "/" + filename, options).then((res)=>{
      var data = res.data;
      console.log(data)
      data = pako.inflate(data,{to:"string"});
      data = data.split("\n");
      var r = []
      data.forEach((row, j) => {
        row = row.split(",");
        row[0] = row[0]*1;
        row[1] = row[1]*1;
        if (!isNaN(row[2]*1)) {
          row[2] = row[2]*1
          r.push(row)
        }
      })
      resolve(r)
    })
  })
}

export { downloadPopDensity }