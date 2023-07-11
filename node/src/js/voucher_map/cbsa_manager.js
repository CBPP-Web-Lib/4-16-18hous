import { downloadTractShapefiles } from "../shapefile_downloader"
import { downloadTractData, downloadTractBins } from "../tract_data_downloader"
import { processTractShapefiles } from "./tract_shapefile_processor"
import { downloadWaterFiles, processWaterFiles } from "./handle_water_files"
import waterIndex from "../../../tmp/waterIndex.json"
import { cbsaUi } from "../ui/cbsa_ui"
import { calculateNumberOfDots } from "./calculate_number_of_dots"
import { updateLegend } from "./update_legend"

const CBSAManager = function(app) {

  var tractShapefiles, tractBins, waterShapes, _cbsa

  this.loadCBSA = function(cbsa) {
    _cbsa = cbsa
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

        /*This step has already been done for the voucher numbers, since
        it requires HUD approval and the raw data is subject to privacy 
        restrictions; repeat the technique for the publicly available
        race/ethnicity data. The cbsa is needed so the random seed
        is different for each cbsa*/
        geoData.geojson.features = calculateNumberOfDots(geoData.geojson.features, cbsa)
        resolve(d)
      })
    })
  }

  this.getLoadedCbsa = () => {
    return _cbsa
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

  this.setupEvents = () => {
    cbsaUi(app)
  }

}

export {CBSAManager}