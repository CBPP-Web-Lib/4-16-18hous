export function updateShapesLayer() {
  var map = this
  var tract_shapefiles = map.shapefileManager.getTractShapefiles()
  var pathGen = map.projectionManager.getPathGen()
  var svg = map.getSvg()
  var tracts = svg.selectAll("path.tract")
    .data(tract_shapefiles.features, d=>d.properties.GEOID10);
  tracts
    .enter()
    .append("path")
    .attr("class","tract")
    .merge(tracts)
    .attr("d", pathGen)
    .attr("fill", "rgba(0, 0, 0, 0.1)")
    .attr("stroke-width", 0.3)
    .attr("stroke", "rgba(0, 0, 0, 0.5)")

}