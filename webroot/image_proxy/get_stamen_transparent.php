<?php




$z = $_GET["z"]*1;
$x = $_GET["x"]*1;
$y = $_GET["y"]*1;
$r = $_GET["r"]*1;

$ext = ($r===2) ? "@2x.png" : ".png";

$filename = getcwd() . "/cache/" . $z . "_" . $x . "_" . $y . $ext;
$converted_filename = getcwd(). "/transparent/" . $z . "_" . $x . "_" . $y . $ext;
echo $filename;
echo $converted_filename;
try {
  if (
    true ||
    strpos($_SERVER['HTTP_REFERER'],"https://apps.cbpp.org")!==false || 
    strpos($_SERVER['HTTP_REFERER'],"http://apps.cbpp.org")!==false || 
    strpos($_SERVER['HTTP_REFERER'],"https://www.cbpp.org")!==false || 
    strpos($_SERVER['HTTP_REFERER'],"https://www.cbpp-multimedia.org")!==false
  ) {
    if (!file_exists($converted_filename) || true) {
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
      $destimg = convert_transparent($filename);
      imagepng($destimg, $converted_filename); 
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
    echo file_get_contents($converted_filename); 
  }
} catch (Exception $e) {
  die();
} 

function convert_transparent($filename) {
  $srcimg = imagecreatefrompng($filename);
  $srcsize = getimagesize($filename);
  $width = $srcsize[0];
  $height = $srcsize[1];
  print_r($srcsize);
  $destimg = imagecreatetruecolor($width, $height);
  imagealphablending($destimg, false);
  imagesavealpha($destimg, true);
  for ($x = 0; $x<$width;$x++) {
    for ($y = 0; $y<$height;$y++) {
      $rgb = imagecolorat($srcimg, $x, $y);
      $r = ($rgb >> 16) & 0xFF;
      imagesetpixel($destimg, $x, $y, imagecolorallocatealpha($destimg, 0, 0, 0, $r/2));
    }
  }
  return $destimg;
}

  