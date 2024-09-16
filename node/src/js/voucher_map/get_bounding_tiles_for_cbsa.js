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

const getBoundingTilesForBbox = function(bbox, screenBox) {
  const viewWidth = screenBox[2] - screenBox[0];
  const viewHeight = screenBox[3] - screenBox[1];
  const tiles_across = Math.min(screenBox[2]/256)
  const tiles_down = Math.min(screenBox[3]/256)
  var tile_x_offset = screenBox[0]/256;
  var tile_y_offset = screenBox[1]/256;
  var coords_for_zoom = {}
  for (var z = 1; z <= 13; z++) {
    var tl = latLongToTileCoord(bbox[0], bbox[1], z)
    tl.x -= tile_x_offset;
    var br = latLongToTileCoord(bbox[2], bbox[3], z)
    br.y += tile_y_offset;
    coords_for_zoom[z] = [tl, br]

    var across = br.x - tl.x
    var down = tl.y - br.y
    if (across > tiles_across || down > tiles_down || z === 12) {
      return finalize({coords: coords_for_zoom[z], z:z, tiles_across, tiles_down})
    }
  }
}

const getBoundingTilesForCBSA = function(cbsa) {
  const bbox = get_cbsa_bounds(cbsa)
  console.log(this)
  return getBoundingTilesForBbox.call(this, bbox, [0, 0, this.getMap().getViewportWidth(), this.getMap().getViewportHeight()]);
}

export { getBoundingTilesForCBSA, getBoundingTilesForBbox }