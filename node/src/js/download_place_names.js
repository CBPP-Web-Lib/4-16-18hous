import { getURLBase } from "./get_url_base"
import axios from 'axios'

function downloadPlaceNames(filename) {
  return new Promise((resolve)=>{
    const url_base = getURLBase()
    axios.get(url_base + "/" + filename).then((res)=>{
      var data = res.data;
      console.log(data);
      resolve(data)
    })
  })
}

export { downloadPlaceNames }