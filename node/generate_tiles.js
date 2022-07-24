var axios = require("axios").default;

var tile_project = function(lat, long) {
  var siny = Math.sin(lat * Math.PI / 180);
  siny = Math.min(Math.max(siny, -0.9999), 0.9999);
  return [
    (0.5 + long / 360),
    (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
  ];
};

var get_tile_from_long_lat = function(long, lat, zoom, exact) {
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

var leftmost = 172 + 45;
var rightmost = -60 + 45;
var northmost = 72;
var southmost = 19;
var rotate = 45;


var tiles = [];
var zoom = 0;
var x, y, n, shift, tl, br;
/*shift latitude by 45 degrees for Alaska wrapping*/


x = 99; y = 0;zoom=-1, n = 0;
find_next_tile();

var errors = [];


function request_tile(x, y, z, cb) {
  var url = "http://host.docker.internal:8888/image_proxy/get_stamen.php?z=" + z + "&x=" + x + "&y=" + y + "&r=2&dynamic=true";
  console.log(url);
  axios.get(url).catch(function(err) {
    errors.push(url);
    console.log(err);
    cb();
  }).then(function() {
    cb(); 
  });
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

function test_tile(x, y, zoom) {
  var shift = get_tile_from_long_lat(rotate, 0, zoom, false)[0] - get_tile_from_long_lat(0, 0, zoom, false)[0];
  x += shift;
  var tl = get_tile_from_long_lat((leftmost + rotate + 180)%360-180, northmost, zoom, false);
  var br = get_tile_from_long_lat((rightmost + rotate + 180)%360-180, southmost, zoom, false);
  return (x >= tl[0] && (x-1) <= br[0] && y >= tl[1] && (y-1) <= br[1]);
}

//console.log(test_tile(141, 201, 9));


function find_next_tile() {
  if (y >= n) {
    x++;
    y = 0; 
  } else {
    y++;
  }
  if (x >= n) {
    zoom++;
    n = Math.pow(2, zoom);
    console.log(zoom);
    shift = get_tile_from_long_lat(45, 0, zoom, false)[0] - get_tile_from_long_lat(0, 0, zoom, false)[0];
    tl = get_tile_from_long_lat((leftmost + 45)%n, northmost, zoom, false);
    br = get_tile_from_long_lat(rightmost + 45, southmost, zoom, false);
    x = 0;
    y = 0;
  }
  if (zoom <= 13) {
    next_tile();
  } else {
    fs.writeFileSync("./errors.json", JSON.stringify(errors), "utf-8");
  }
}
