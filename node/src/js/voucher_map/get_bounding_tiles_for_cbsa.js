import geojson_bbox from "geojson-bbox"
import { feature } from "topojson"
import cbsa_topo from "../../../topojson/low/tl_2020_us_cbsa.json"
import { latLongToTileCoord } from "./projection_manager"

const get_cbsa_bounds = function(cbsa) {
  var r = null

  /*manual overrides*/

  /*Honolulu - Hawaii is messed up*/
  if (cbsa*1 === 46520) {
    return [
      -158.31, 21.74, -157.64, 21.22
    ];
  }

  cbsa_topo.objects.districts.geometries.forEach((geo)=>{
    if (geo.properties.GEOID*1 === cbsa*1) {
      var obj = feature(cbsa_topo, geo)
      var bbox = geojson_bbox(obj)
      r = bbox
    }
  })
  return r
}

function finalize(r) {
  var extra_width = r.tiles_across - (r.coords[1].x - r.coords[0].x)
  var extra_height = r.tiles_down - (r.coords[1].y - r.coords[0].y)
  var x = r.coords[0].x - extra_width/2;
  var y = r.coords[0].y - extra_height/2;
  return {
    x, y, z: r.z
  }
}

const getBoundingTilesForBbox = function(bbox) {
  console.log(bbox)
  const viewWidth = this.getMap().getViewportWidth()
  const viewHeight = this.getMap().getViewportHeight()
  const tiles_across = Math.min(viewWidth/256)
  const tiles_down = Math.min(viewHeight/256)
  var coords_for_zoom = {}
  for (var z = 1; z <= 13; z++) {
    var tl = latLongToTileCoord(bbox[0], bbox[1], z)
    /*to correct for presence of UI pickers*/
   // tl.x -= 1
    var br = latLongToTileCoord(bbox[2], bbox[3], z)
    /*and legend*/
  // br.y += 1
    coords_for_zoom[z] = [tl, br]
    var across = br.x - tl.x
    var down = tl.y - br.y
    if (across > tiles_across || down > tiles_down || z === 13) {
      return finalize({coords: coords_for_zoom[z-1], z:z-1, tiles_across, tiles_down})
    }
  }
}

const getBoundingTilesForCBSA = function(cbsa) {
  const bbox = get_cbsa_bounds(cbsa)
  return getBoundingTilesForBbox.call(this, bbox);
}

export { getBoundingTilesForCBSA, getBoundingTilesForBbox }