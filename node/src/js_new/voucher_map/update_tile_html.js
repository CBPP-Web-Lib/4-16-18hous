import {select} from "d3"
const d3 = {select}

export function updateTileHtml() {
  var map = this;
  var coord_tracker = this.coordTracker
  var url_base = map.getURLBase()
  var width = map.getViewportWidth()
  var height = map.getViewportHeight()
  var coords = coord_tracker.getCoords()
  var tileLayer = map.getTileLayer()
  var x_images = Math.ceil(width/256) + 1
  var y_images = Math.ceil(height/256) + 1
  var img_data = [{opacity:1, images: [], scale: 1, z: coords.z}];
  if (coords.z%1 !== 0) {
    img_data = [
      {opacity: 1 - coords.z%1, images: [], scale: 1+coords.z%1, z: Math.floor(coords.z)},
      {opacity: coords.z%1, images: [], scale: (1+coords.z%1)/2, z: Math.ceil(coords.z)}
    ];
  }
  image_layer(
    coords.x,
    coords.y,
    coords.z, 
    img_data[0]
  );
  function image_layer(x_start, y_start, z, d) {
    var x_floor = Math.floor(x_start);
    var y_floor = Math.floor(y_start);
    var x_offset = x_start - x_floor;
    var y_offset = y_start - y_floor;
    for (var x = 0; x<x_images;x++) {
      for (var y = 0; y<y_images;y++) {
        var _x = x + x_floor
        var _y = y + y_floor
        d.images.push({
          src: url_base + "/image_proxy/get_stamen.php?x=" + _x + "&y=" + _y + "&z=" + Math.floor(z) + "&r=2",
          left: (x - x_offset)*256,
          top: (y - y_offset)*256 
        });
      }
    }
  }
  if (coords.z%1 !== 0) {
    image_layer(coords.x*2, coords.y*2, coords.z+1, img_data[1]);
  }
  var zoomLayers = tileLayer.selectAll("div.zoom-layer")
    .data(img_data, d=>d.z);
  zoomLayers
    .enter()
    .append("div")
    .attr("class",d=>"zoom-layer zoom-layer-" + d.z)
    .each(function(d) {
      //console.log("creating layer ", d)
    })
    .merge(zoomLayers)
    .style("transform",d=>{
      return "scale(" + d.scale + ")"
    })
    .style("transform-origin", "0 0")
    .style("opacity", d=>{
      return d.opacity
    })
    .each(function(d) {
      var imgs = d3.select(this).selectAll("img")
        .data(d.images, (d)=>{
          //console.log(d)
          return d.src
        });
      imgs.each(function(d) {
        //console.log("already exists: ", d);
      })
      imgs
        .enter()
        .append("img")
        .each(function(d) {
          console.log("downloading image " + d.src)
        })
        .attr("src", d=>d.src)
        .merge(imgs)
        .style("left",d=>d.left + "px")
        .style("top",d=>d.top + "px");
      imgs.exit().remove();
    });
  zoomLayers.exit().each(function(d) {
    //console.log("removing layer", d)
  }).
  remove();

}