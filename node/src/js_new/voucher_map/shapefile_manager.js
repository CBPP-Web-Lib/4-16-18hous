import {downloadTractShapefiles} from "../shapefile_downloader"

const ShapefileManager = function(app) {

  var tractShapefiles

  this.loadCBSA = function(cbsa) {
    return new Promise((resolve)=>{
      downloadTractShapefiles("topojson/high/tl_2010_tract_" + cbsa + ".bin").then((d)=>{
        tractShapefiles = d
        resolve()
      })
    })
  }

  this.getTractShapefiles = ()=> {
    return tractShapefiles
  }


}

export {ShapefileManager}