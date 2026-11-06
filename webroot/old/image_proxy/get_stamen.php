<?php


require_once("api_key.php");

$z = $_GET["z"]*1;
$x = $_GET["x"]*1;
$y = $_GET["y"]*1;
$r = $_GET["r"]*1;

$ext = ($r===2) ? "@2x.png" : ".png";

$zdir = __DIR__ . "/cache/" . $z;
$dir = $zdir . "/" . $x;
if (!file_exists($zdir)) {
  mkdir($zdir, 0777);
}
if (!file_exists($dir)) {
  mkdir($dir, 0777);
}
$filename = $dir . "/" . $y . $ext;
try {
  if (
    strpos($_SERVER['HTTP_REFERER'],"https://apps.cbpp.org")!==false || 
    strpos($_SERVER['HTTP_REFERER'],"http://apps.cbpp.org")!==false || 
    strpos($_SERVER['HTTP_REFERER'],"https://www.cbpp.org")!==false || 
    strpos($_SERVER['HTTP_REFERER'],"https://www.cbpp-multimedia.org")!==false
  ) {
    if (!file_exists($filename)) {
      $url = "https://tiles.stadiamaps.com/tiles/stamen_toner/".$z."/".$x."/".$y. $ext;
      //$url = "http://b.tile.stamen.com/toner/".$z."/".$x."/".$y. $ext;
      $url .= "?api_key=" . $stamen_key;
      $ch = curl_init ($url);
      curl_setopt($ch, CURLOPT_HEADER, 0);
      curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
      curl_setopt($ch, CURLOPT_BINARYTRANSFER,1);
      $raw=curl_exec($ch);
      curl_close ($ch);
      /*It's maybe possible for the file to get created by another request during the cURL request*/
      if (!file_exists($filename)) {
        $fp = fopen($filename,'x'); 
        if ($fp) {
          fwrite($fp, $raw);
          fclose($fp);
        }
      }
    }
    $origin = "https://www.cbpp.org";
    if (array_key_exists("HTTP_ORIGIN",$_SERVER)) {
      $origin = $_SERVER['HTTP_ORIGIN'];
    }
    header('Access-Control-Allow-Origin: '.$origin);
    header('max-age: 86400');
    header('Vary: Access-Control-Allow-Origin');
    header('Access-Control-Allow-Headers: referer, range, accept-encoding, x-requested-with');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Content-type: image/png');
    echo file_get_contents($filename); 
  }
} catch (Exception $e) {
  die();
}

 