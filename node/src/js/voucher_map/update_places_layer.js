import { select } from "d3"
import { bbox_overlap } from "./bbox_overlap";

var updatePlacesLayer = function() {
  var places = this.cbsaManager.getPlaces();
  var proj = this.projectionManager.getProjection();
  var viewBox = this.getSvg().attr("viewBox").split(" ");
  var viewWidth = viewBox[2];
  var viewHeight = viewBox[3];
  var to_draw = [];
  var layer = select("#" + this.getId() + " .text-svg g.shapeLayer");
  places.forEach((place, i)=>{
    var _place = {};
    _place.coords = proj(place[0])
    if (_place.coords[0] < 0 || _place.coords[0] > viewWidth) {
      return;
    }
    if (_place.coords[1] < 0 || _place.coords[1] > viewHeight) {
      return;
    }
    _place.population = place[3]*1
    _place.type = place[1]
    _place.name = place[2]
    _place.id = i
    _place.weight = _place.population/10000000 + {
      'country': 0,
      'state' : 1,
      'city' : 16,
      'town' : 14 ,
      'village' : 12, 
      'hamlet' : 10, 
      'suburb' : 8,
      'neighbourhood' : 6, 
      'locality' : 4
    }[_place.type]
    to_draw.push(_place)
  })
  to_draw.sort((a, b)=>{
    return b.weight - a.weight
  })
  //to_draw = filter_collision(to_draw, 50)
  //console.log(to_draw);
  var place_sel = layer.selectAll("g.place")
    .data(to_draw)
  place_sel.enter()
    .append("g")
    .each(function() {
      select(this).append("text").attr("class","text-stroke")
        .text(d=>d.name)
      select(this).append("text").attr("class","text-fill")
        .text(d=>d.name)
    })
    .merge(place_sel)
    .attr("class",d=>"place " + make_class_name(d.type))
    .attr("transform",d=>"translate(" + d.coords.join(",") + ")")
    .each(function(d) {
      select(this).selectAll("text").text(d.name)
    })
  place_sel
    .exit()
    .remove();
  layer.selectAll("g.place").each(function(d) {
    var place = select(this);
    var bbox = this.getBoundingClientRect()
    d.bbox = bbox;
    place.datum(d);
  })
  layer.selectAll("g.place").each(function(d, i) {
    if (this.classList.contains("hide-place")) {return;}
    var largerNode = [d.bbox.x, d.bbox.y, d.bbox.x + d.bbox.width, d.bbox.y + d.bbox.height];
    layer.selectAll("g.place").each(function(d, j) {
      if (j <= i) {return;}
      var smallerNode = [d.bbox.x, d.bbox.y, d.bbox.x + d.bbox.width, d.bbox.y + d.bbox.height];
      if (bbox_overlap(largerNode, smallerNode)) {
        this.classList.add("hide-place")
      }
    })
  })

}

/*function filter_collision(places, distance) {
  var dsquared = distance*distance;
  for (var i = 0, ii = places.length; i<ii; i++) {
    var bigger_place = places[i];
    if (!bigger_place.hide) {
      for (let j = i + 1, jj = ii; j<jj; j++) {
        var smaller_place = places[j];
        var _dsquared = Math.pow(
          bigger_place.coords[0] - 
          smaller_place.coords[0]
        , 2) + Math.pow(
          bigger_place.coords[1] - 
          smaller_place.coords[1]
        , 2);
        if (_dsquared < dsquared) {
          smaller_place.hide = true
        }
      }
    }
  }
  places = places.filter((a)=>{
    return a.hide !== true
  })
  return places
}*/

function make_class_name(str) {
  return str.replace(/\s/g,"_").toLowerCase()
}

export { updatePlacesLayer }