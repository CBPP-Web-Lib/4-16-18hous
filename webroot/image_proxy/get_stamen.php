<?php


//print_r($_SERVER);
$z = $_GET["z"]*1;
$x = $_GET["x"]*1;
$y = $_GET["y"]*1;
$r = $_GET["r"]*1;

$ext = ($r===2) ? "@2x.png" : ".png";

$filename = getcwd() . "/cache/" . $z . "_" . $x . "_" . $y . $ext;
$is_cgi = false;
$valid_referer = false;



if (array_key_exists("SHELL", $_SERVER)) {
  if ($_SERVER["SHELL"]==="/bin/bash") {
    $is_cgi = true;
  }
}


if (array_key_exists("HTTP_REFERER", $_SERVER)) {
  if (
    strpos($_SERVER['HTTP_REFERER'],"https://apps.cbpp.org")!==false || 
    strpos($_SERVER['HTTP_REFERER'],"http://apps.cbpp.org")!==false || 
    strpos($_SERVER['HTTP_REFERER'],"https://www.cbpp.org")!==false || 
    strpos($_SERVER['HTTP_REFERER'],"https://www.cbpp-multimedia.org")!==false
  ) {
    $valid_referer = true;
  }
}

try {
  if (
   $valid_referer || $is_cgi
  ) {
    if (!file_exists($filename)) { 
      $url = "http://b.tile.stamen.com/toner/".$z."/".$x."/".$y. $ext;
      $ch = curl_init ($url);
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_BINARYTRANSFER,1);
        $raw=curl_exec($ch);
        curl_close ($ch);
        $fp = fopen($filename,'x'); 
        fwrite($fp, $raw);
        fclose($fp);
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

 