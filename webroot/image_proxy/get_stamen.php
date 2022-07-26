<?php


//print_r($_SERVER);
$z = $_GET["z"]*1;
$x = $_GET["x"]*1;
$y = $_GET["y"]*1;
$r = $_GET["r"]*1;
$allow_dynamic = isset($_GET["dynamic"]);
$ext = ($r==2) ? ".png?scale=3&metatile=4" : ".png?scale=1.5&metatile=4";
$size = pow(2, $z);
$dir = getcwd() . "/cache/";
if ($r==2) {
  $dir .= "@2x/";
}
$dir .= $z . "/" . $x . "/";
if (!file_exists($dir)) {
  mkdir($dir, 0755, true);
}
$filename = $dir . $y . ".png";
if ($r==2) {
  $z+=1;
  $x = ($x*2)%$size;
  $y = ($y*2)%$size;
}

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
$valid_referer = true;
try {
  if (
   $valid_referer || $is_cgi
  ) {
    if (!file_exists($filename) && $allow_dynamic) {
      if ($r==2) {
        $mh = curl_multi_init();
        $urls = array(
          "http://host.docker.internal:20008/tile/OSMBright/".$z."/".$x."/".$y. $ext,
          "http://host.docker.internal:20008/tile/OSMBright/".$z."/".($x+1)."/".$y. $ext,
          "http://host.docker.internal:20008/tile/OSMBright/".$z."/".$x."/".($y+1). $ext,
          "http://host.docker.internal:20008/tile/OSMBright/".$z."/".($x+1)."/".($y+1). $ext,
        );
        $image = imagecreate(512, 512);
        $curl_arr = [];
        foreach ($urls as $i=>$url) {
          $curl_arr[$i] =curl_init ($url);
          curl_setopt( $curl_arr[$i], CURLOPT_HEADER, 0);
          curl_setopt( $curl_arr[$i], CURLOPT_RETURNTRANSFER, 1);
          curl_setopt( $curl_arr[$i], CURLOPT_BINARYTRANSFER,1);
          curl_multi_add_handle($mh,  $curl_arr[$i]);
        }
        do {
          curl_multi_exec($mh,$running);
          if( $running>0) {
            curl_multi_select($mh,1);
          }
        } 
        while($running > 0);
        for($i = 0; $i < 4; $i++){
            $subimage=imagecreatefromstring(curl_multi_getcontent  ( $curl_arr[$i]  ));
            imagecopymerge($image, $subimage, $i%2===0 ? 0 : 256, $i%4>=2 ? 256 : 0, 0, 0, 256, 256, 100);
        }
        ob_start();
        imagepng($image);
        $raw = ob_get_clean();
      } else {
        $url = "http://host.docker.internal:20008/tile/OSMBright/".$z."/".$x."/".$y. $ext;
        $ch = curl_init ($url);
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_BINARYTRANSFER,1);
        $raw=curl_exec($ch);
        curl_close ($ch);
      }
      $fp = fopen($filename,'x'); 
      fwrite($fp, $raw);
      fclose($fp);
    }
    $origin = "https://www.cbpp.org";
    if (array_key_exists("HTTP_ORIGIN",$_SERVER)) { 
      $origin = $_SERVER['HTTP_ORIGIN'];
    }
    if (file_exists($filename)) {
      header('Access-Control-Allow-Origin: '.$origin);
      header('max-age: 86400');
      header('Vary: Access-Control-Allow-Origin');
      header('Access-Control-Allow-Headers: referer, range, accept-encoding, x-requested-with');
      header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
      header('Content-type: image/png');
      echo file_get_contents($filename);
    } else {
      http_response_code(404);
      echo "<!doctype html><html><head><title>Not found</title></head><body>Not found</body></html>";
      die();
    }
  }
} catch (Exception $e) {
  die();
}

 