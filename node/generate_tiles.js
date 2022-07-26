var axios = require("axios").default;
var topojson = require("topojson");
var tl_2015_us_cbsa = require("./topojson/low/tl_2015_us_cbsa.json");
var fs = require("fs");
var geo_tl_2015_us_cbsa = topojson.feature(tl_2015_us_cbsa, tl_2015_us_cbsa.objects.districts);
var geojson_bbox = require("geojson-bbox");
var feature_index = 0;
var feature = geo_tl_2015_us_cbsa.features[feature_index];
function next_feature() {
  var bbox = geojson_bbox(feature);
  do_box(bbox[0], bbox[2], bbox[3], bbox[1], feature.properties.NAME).then(function() {
    feature_index++;
    feature = geo_tl_2015_us_cbsa.features[feature_index];
    if (feature) {
      next_feature();
    } else {
      console.log("done");
    }
  })
}
next_feature();


function tile_project (lat, long) {
  var siny = Math.sin(lat * Math.PI / 180);
  siny = Math.min(Math.max(siny, -0.9999), 0.9999);
  return [
    (0.5 + long / 360),
    (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
  ];
};

function get_tile_from_long_lat(long, lat, zoom, exact) {
  var scale = 1 << zoom;
  var rounder = Math.floor;
  if (exact===true) {
    rounder = function(n) {return n;};
  }
  var worldCoordinate = tile_project(lat, long);
  return [
    rounder(worldCoordinate[0] * scale),
    rounder(worldCoordinate[1] * scale)
  ];
};

function do_box(leftmost, rightmost, northmost, southmost, name) {
  return new Promise((resolve, reject)=> {
    console.log(leftmost, rightmost, northmost, southmost);
    var rotate = 45;
   // leftmost+= rotate;
    //rightmost += rotate;

    var tiles = [];
    var zoom = 0;
    var x, y, xn, yn, n, shift, tl, br;
    /*shift latitude by 45 degrees for Alaska wrapping*/
    
    
    zoom=-1, n = 0;
    find_next_tile();
    
    var errors = [];

    function request_tile(x, y, z, cb) {
      var filename = "./tiles/@2x/" + z + "/" + x + "/" + y + ".png";
      if (fs.existsSync(filename)) {
        cb();
        return;
      }
      var url = "http://host.docker.internal:8888/image_proxy/get_stamen.php?z=" + z + "&x=" + x + "&y=" + y + "&r=2&dynamic=true";
      console.log(url, name);
      var moved_on = false;
      function _cb() {
        if (moved_on) {
          return;
        }
        moved_on = true;
        cb();
      }
      axios.get(url).catch(function(err) {
        errors.push(url);
        console.log(err);
        _cb();
      }).then(function() {
        _cb(); 
      });
      setTimeout(_cb, 5000);
    }

    function next_tile() {
      if (test_tile(x, y, zoom)) {
      //if (x >= tl[0] && (x-1) <= br[0] && y >= tl[1] && (y-1) <= br[1]) {
        request_tile((x-shift+n)%n, y, zoom, function() {
          find_next_tile();
        });
      } else {
        setTimeout(find_next_tile, 1);
      }
    }

    function test_tile(x, y) {
      return (x >= tl[0] && (x-1) <= br[0] && y >= tl[1] && (y-1) <= br[1]);
    }

    //console.log(test_tile(141, 201, 9));


    function find_next_tile() {
      //xn = xn || -1;
      br = br || [-1];
      //console.log(x, br[0]);
      if (x-1 > br[0]|| typeof(x)==="undefined") {
        zoom++;
        
        n = Math.pow(2, zoom);
        shift = get_tile_from_long_lat(rotate, 0, zoom, false)[0] - get_tile_from_long_lat(0, 0, zoom, false)[0];
        tl = get_tile_from_long_lat((leftmost + rotate + 180)%360-180, northmost, zoom, false);
        br = get_tile_from_long_lat((rightmost + rotate + 180)%360-180, southmost, zoom, false);
        xn = br[0] - tl[0];
        yn = br[1] - tl[1];
        //console.log(zoom);
        //console.log([tl[0] - shift, tl[1]]);
        //console.log([br[0] - shift, br[1]]);
        x = tl[0] - 1;
        y = tl[1] - 1;
      }
      if (y - 1 > br[1]) {
        x++;
        y = tl[1] - 1; 
      } else {
        y++;
      }
      
      if (zoom <= 13) {
        next_tile();
      } else {
        console.log(errors);
        resolve();
        //fs.writeFileSync("./errors.json", JSON.stringify(errors), "utf-8");
      }
    }


  })
}





