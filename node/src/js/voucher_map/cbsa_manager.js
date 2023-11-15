import { downloadTractShapefiles } from "../shapefile_downloader"
import { downloadTractData, downloadTractBins } from "../tract_data_downloader"
import dotDensities from "../../../tmp/cbsa_densities"
import { processTractShapefiles } from "./tract_shapefile_processor"
import { downloadWaterFiles, processWaterFiles } from "./handle_water_files"
import { downloadPlaceNames } from "../download_place_names"
import waterIndex from "../../../tmp/waterIndex.json"
import { cbsaUi } from "../ui/cbsa_ui"
import { calculateNumberOfDots } from "./calculate_number_of_dots"
import { downloadPopDensity } from "../download_pop_density"
import { updateLegend } from "./update_legend"
import { index_pop_density } from "./index_pop_density"
import { mode } from "./mode"

const CBSAManager = function(app) {

  var tractShapefiles, tractBins, waterShapes, _cbsa, places, dotDensity, popDensity

  this.loadCBSA = function(cbsa) {
    _cbsa = cbsa
    app.remakeTransparencyElement()
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
      new Promise((resolve)=>{
        downloadPlaceNames("data/place_names/places_" + cbsa + ".json").then((d)=>{
          places = d
          resolve(d)
        })
      }),
      new Promise((resolve)=> {
        if (mode === "download") {
          resolve();
          return;
        }
        downloadPopDensity("data/pop_density/compressed/tl_2010_tract_" + cbsa + ".bin").then((d) => {
          popDensity = d
          resolve(d)
        })
      })
    ]).then(function(d) {
      return new Promise((resolve)=>{
        var geoData = d[0]
        var housingData = d[1]
        dotDensity = dotDensities[cbsa]
        geoData.geojson.features.forEach((tract)=>{
          var tract_id = tract.properties.GEOID10
          if (typeof(housingData[tract_id])) {
            tract.properties.housing_data = housingData[tract_id]
          }
          if (mode !== "download") {
            tract.properties.pop_density_index = index_pop_density(tract, popDensity)
          }
        })

        /*This step has already been done for the voucher numbers, since
        it requires HUD approval and the raw data is subject to privacy 
        restrictions; repeat the technique for the publicly available
        race/ethnicity data. The cbsa is needed so the random seed
        is different for each cbsa*/
        if (mode !== "download") {
          geoData.geojson.features = calculateNumberOfDots(geoData.geojson.features, cbsa)
        }
        resolve(d);
        /*Promise.all(worker_setup_tasks).then(()=>{
          resolve(d)
        })*/
      })
    })
  }

  this.getPopDensity = () => {
    return popDensity
  }

  this.getDotDensity = () => {
    return dotDensity
  }

  this.getPlaces = () => {
    return places;
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