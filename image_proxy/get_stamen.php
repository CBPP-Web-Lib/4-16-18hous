<?php

$z = $_GET["z"]*1;
$x = $_GET["x"]*1;
$y = $_GET["y"]*1;
$r = $_GET["r"]*1;

$ext = ($r===2) ? "@2x.png" : ".png";

$filename = getcwd() . "/cache/" . $z . "_" . $x . "_" . $y . $ext;

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
if (
  $_SERVER['HTTP_ORIGIN']==="https://apps.cbpp.org" || 
  $_SERVER['HTTP_ORIGIN']==="http://apps.cbpp.org" ||
  $_SERVER['HTTP_ORIGIN']==="https://www.cbpp.org" ||
  $_SERVER["HTTP_ORIGIN"]==="https://www.cbpp-multimedia.org" ||
  $_SERVER["HTTP_ORIGIN"]==="http://localhost:8000" ||
  $_SERVER["HTTP_ORIGIN"]==="http://127.0.0.1:8000"
) {
  header('Access-Control-Allow-Origin: '.$_SERVER['HTTP_ORIGIN']);
  header('max-age: 86400');
  header('Vary: Access-Control-Allow-Origin');
  header('Access-Control-Allow-Headers: referer, range, accept-encoding, x-requested-with');
  header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
  header('Content-type: image/png');
  echo file_get_contents($filename); 
}

