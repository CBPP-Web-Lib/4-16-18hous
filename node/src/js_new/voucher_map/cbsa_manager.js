import { downloadTractShapefiles } from "../shapefile_downloader"
import { downloadTractData, downloadTractBins } from "../tract_data_downloader"
import { processTractShapefiles } from "./tract_shapefile_processor"
import { downloadWaterFiles, processWaterFiles } from "./handle_water_files"
import waterIndex from "../../../tmp/waterIndex.json"

const CBSAManager = function(app) {

  var tractShapefiles, tractBins, waterShapes

  this.loadCBSA = function(cbsa) {
    return Promise.all([
      new Promise((resolve)=>{
        downloadTractShapefiles("topojson/high/tl_2010_tract_" + cbsa + ".bin")
          .then(processTractShapefiles)
          .then((d)=>{
            tractShapefiles = d
            resolve(d)
          })
      }),
      new Promise((resolve)=>{
        downloadTractData("data/" + cbsa + ".bin").then((d)=>{
          resolve(d)
        })
      }),
      new Promise((resolve)=>{
        downloadTractBins("data/bin_" + cbsa + ".json").then((d)=>{
          tractBins = d
          resolve()
        })
      }),
      new Promise((resolve)=>{
        var water_files = waterIndex["tl_2010_tract_" + cbsa + ".json"];
        downloadWaterFiles(water_files)
          .then(processWaterFiles)
          .then((d)=>{
            waterShapes = d
            resolve()
          })
      }),
    ]).then(function(d) {
      return new Promise((resolve)=>{
        var geoData = d[0]
        var housingData = d[1]
        geoData.geojson.features.forEach((tract)=>{
          var tract_id = tract.properties.GEOID10
          if (typeof(housingData[tract_id])) {
            tract.properties.housing_data = housingData[tract_id]
          }
        })
        resolve(d)
      })
    })
  }

  this.getTractBins = () => {
    return tractBins
  }

  this.getWaterShapes = () => {
    return waterShapes
  }

  this.getTractShapefiles = ()=> {
    return tractShapefiles
  }

}

export {CBSAManager}