<?php


require_once("api_key.php");

// only accept a real tile address: integer z 0-18, x/y 0..2^z-1, r 1 or 2
function tile_int($name) {
  if (!isset($_GET[$name]) || !is_string($_GET[$name]) || !ctype_digit($_GET[$name])) {
    return -1;
  }
  return (int) $_GET[$name];
}
$z = tile_int("z");
$x = tile_int("x");
$y = tile_int("y");
$r = isset($_GET["r"]) && $_GET["r"] === "2" ? 2 : 1;
if ($z < 0 || $z > 18 || $x < 0 || $y < 0 || $x >= (1 << $z) || $y >= (1 << $z)) {
  http_response_code(400);
  die();
}

// referer check now runs before anything touches the disk or the API
$referer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : "";
if (!(
  strpos($referer,"https://apps.cbpp.org")!==false ||
  strpos($referer,"http://apps.cbpp.org")!==false ||
  strpos($referer,"https://www.cbpp.org")!==false ||
  strpos($referer,"https://www.cbpp-multimedia.org")!==false
)) {
  http_response_code(403);
  die();
}

$ext = ($r===2) ? "@2x.png" : ".png";

$zdir = __DIR__ . "/cache/" . $z;
$dir = $zdir . "/" . $x;
$filename = $dir . "/" . $y . $ext;
$raw = false;
try {
  if (!file_exists($filename)) {
    $url = "https://tiles.stadiamaps.com/tiles/stamen_toner/".$z."/".$x."/".$y. $ext;
    //$url = "http://b.tile.stamen.com/toner/".$z."/".$x."/".$y. $ext;
    $url .= "?api_key=" . $stamen_key;
    $ch = curl_init ($url);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $raw=curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close ($ch);
    // don't cache upstream errors; only store real PNGs
    if ($status !== 200 || !is_string($raw) || substr($raw, 0, 8) !== "\x89PNG\r\n\x1a\n") {
      http_response_code(502);
      die();
    }
    if (!file_exists($dir)) {
      @mkdir($dir, 0755, true);
    }
    /*It's maybe possible for the file to get created by another request during the cURL request*/
    if (!file_exists($filename)) {
      $fp = @fopen($filename,'x');
      if ($fp) {
        fwrite($fp, $raw);
        fclose($fp);
      }
    }
  }
  // fixed allow-list instead of reflecting any Origin
  $origin = "https://www.cbpp.org";
  $allowed_origins = array("https://www.cbpp.org", "https://apps.cbpp.org", "http://apps.cbpp.org", "https://www.cbpp-multimedia.org");
  if (array_key_exists("HTTP_ORIGIN",$_SERVER) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins, true)) {
    $origin = $_SERVER['HTTP_ORIGIN'];
  }
  header('Access-Control-Allow-Origin: '.$origin);
  header('max-age: 86400');
  header('Vary: Origin');
  header('Access-Control-Allow-Headers: referer, range, accept-encoding, x-requested-with');
  header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
  header('Content-type: image/png');
  if ($raw !== false) {
    echo $raw;
  } else {
    readfile($filename);
  }
} catch (Exception $e) {
  die();
}

