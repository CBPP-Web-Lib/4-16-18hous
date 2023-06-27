import { tractFill } from "./tract_fill"

export function updateShapesLayer() {
  var map = this
  var tract_shapefiles = map.cbsaManager.getTractShapefiles()
  var tract_features = tract_shapefiles.geojson
  var merged = tract_shapefiles.merged
  var inverted_merged = tract_shapefiles.inverted_merged
  var tract_bins = map.cbsaManager.getTractBins()
  var active_layer = map.dataLayerManager.getActiveLayer()
  var pathGen = map.projectionManager.getPathGen()
  var svg = map.getSvg()
  var cbsa_group = svg.selectAll("g.cbsa_group")
    .data([1]);
  cbsa_group.enter()
    .append("g")
    .attr("class","cbsa_group")
    .merge(cbsa_group);
  var cbsa_path_string = pathGen(merged);
  var cbsa_inverted =svg.selectAll("path.cbsa_inverted")
    .data([inverted_merged]);
  cbsa_inverted
    .enter()
    .append("path")
    .attr("class","cbsa_inverted")
    .merge(cbsa_inverted)
    .attr("d", pathGen)
    .attr("fill", "rgba(255, 255, 255, 0.5");
  var cbsa_path = svg.select("g.cbsa_group").selectAll("path.cbsa")
    .data([1, 1]);
  cbsa_path.enter()
    .append("path")
    .attr("class","cbsa")
    .merge(cbsa_path)
    .attr("d", cbsa_path_string)
    .attr("fill", (d, i)=>{
      return "#fff"
    })
    .attr("stroke-width", (d, i)=>{
      if (i===0) {return 10}
      if (i===1) {return 1}
    })
    .attr("stroke", (d, i)=>{
      if (i===0) {return "#f57b42"}
      if (i===1) {return "#aaa"}
    })
    .attr("filter", (d, i)=>{
      if (i===0) {
        return "url(#blur)"
      }
    })
  var tracts = svg.selectAll("path.tract")
    .data(tract_features.features, d=>d.properties.GEOID10);
  tracts
    .enter()
    .append("path")
    .attr("class","tract")
    .merge(tracts)
    .attr("d", pathGen)
    .attr("fill", (d)=>{
      return tractFill({
        d,
        active_layer,
        tract_bins
      })
    })
    .attr("stroke-width", 0)
}