import { select } from "d3"

function handle_annotations(annotations, map) {
  if (typeof(annotations)==="undefined") {
    annotations = [];
  }
  map.getTextSvg().selectAll("g.annotations")
    .data([1])
    .enter()
    .append("g")
    .attr("class","annotations");
  var annotation_els = map.getTextSvg().select("g.annotations").selectAll("g.annotation")
    .data(annotations, ann=>ann.id);
  annotation_els.enter()
    .append("g")
    .attr("class","annotation")
    .merge(annotation_els)
    .each(function(d) {
      draw_annotation(this, d, map)
    }); 
  annotation_els.exit().remove();
  
}

function draw_annotation(el, d, map) {
  if (d.type === "ellipse") {
    var coords = map.coordTracker.getCoords();
    var z = Math.floor(coords.z);
    var coords1 = map.projectionManager.latLongToTileCoord(d.major_axis.x1, d.major_axis.y1, z);
    var coords2 = map.projectionManager.latLongToTileCoord(d.major_axis.x2, d.major_axis.y2, z);
    var x1c = (coords1.x - coords.x)*256;
    var y1c = (coords1.y - coords.y)*256;
    var x2c = (coords2.x - coords.x)*256;
    var y2c = (coords2.y - coords.y)*256;
    var center = {
      x: (x1c + x2c)/2,
      y: (y1c + y2c)/2
    };
    var length = Math.sqrt(Math.pow((x1c - x2c), 2) + Math.pow((y1c - y2c), 2));
    var rotate = Math.atan((y2c - y1c)/(x2c - x1c))*180/Math.PI;
    var ellipse = select(el).selectAll("ellipse")
      .data([1]);
    ellipse
      .enter()
      .append("ellipse")
      .merge(ellipse)
      .attr("cx", center.x)
      .attr("cy", center.y)
      .attr("rx", length/2)
      .attr("ry", length/2 * d.minor_axis.length)
      .attr("transform-origin", [center.x, center.y].join(" "))
      .attr("transform", "rotate(" + rotate + ")")
      .attr("stroke-width", 2)
      .attr("stroke", "#a00")
      .attr("fill","none")
  }
}

export { handle_annotations }