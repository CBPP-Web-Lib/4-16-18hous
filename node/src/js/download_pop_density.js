import { getURLBase } from "./get_url_base"
import axios from 'axios'
import { process_pop_density_csv } from "./process_pop_density_csv"

function downloadPopDensity(filename) {
  return new Promise((resolve)=>{
    const url_base = getURLBase()
    var options = {
      responseType: 'arraybuffer'
    }
    axios.get(url_base + "/" + filename, options).then((res)=>{
      resolve(process_pop_density_csv(res.data));
    })
  })
}

export { downloadPopDensity }