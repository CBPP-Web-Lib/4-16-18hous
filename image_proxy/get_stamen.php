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
header('Content-type: image/png');
echo file_get_contents($filename);