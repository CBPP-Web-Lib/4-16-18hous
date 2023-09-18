import { select as d3_select } from "d3"

var tile_transform

export function updateTileHtml(custom_cords) {
  var map = this;
  var coord_tracker = this.coordTracker
  var urlgen;
  if (false && window.location.hostname!=="apps.cbpp.org" && window.location.hostname !== "www.cbpp.org" && window.location.hostname !== "cbpp.org") {
    urlgen = (coords)=>{
      var {x, y, z} = coords
      return map.getURLBase() + "/image_proxy/get_image_local.php?x=" + x + "&y=" + y + "&z=" + Math.floor(z) + "&r=2";
    }
  } else {
    urlgen = (coords)=>{
      var {x, y, z} = coords
      return "https://www.cbpp-multimedia.org/4-16-18hous_rev6-30-23_tiles/@2x/" + Math.floor(z) + "/" + x + "/" + y + ".png";
    }
  }
  var width = map.getViewportWidth()
  var height = map.getViewportHeight()
  var coords = coord_tracker.getCoords()
  if (custom_cords) {
    coords = custom_cords
  }
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
          src: urlgen({x: _x, y: _y, z}),
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
    .merge(zoomLayers)
    .style("transform",d=>{
      return "scale(" + d.scale + ")"
    })
    .style("transform-origin", "0 0")
    .style("opacity", d=>{
      return d.opacity
    })
    .each(function(d) {
      var imgs = d3_select(this).selectAll("img")
        .data(d.images, (d)=>{
          return d.src
        });
      imgs
        .enter()
        .append("img")
        .attr("src", d=>d.src)
        .merge(imgs)
        .style("left",d=>d.left + "px")
        .style("top",d=>d.top + "px");
      imgs.exit().remove();
    });
  zoomLayers.exit().remove();

}