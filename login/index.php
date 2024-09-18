<?php

/*100HousingM@ps!*/
require_once("login_cookie.php");
require_once("password_hash.php");

$path = str_replace("../","",$_GET["path"]);

if (realpath($path) === __DIR__) {
    header("HTTP/1.1 301 Moved Permanently"); header("Location: ./protected/"); exit();
}

$logged_in = false;


if (isset($_COOKIE["metro_maps_embargo"])) {
    if ($_COOKIE["metro_maps_embargo"] === $login_cookie) {
        $logged_in = true;
    }
} else if (isset($_POST["embargo_password"])) {
    if (password_verify($_POST["embargo_password"], $password_hash)) {
        $path = str_replace($_SERVER["DOCUMENT_ROOT"], "/", __DIR__);
        setcookie("metro_maps_embargo", $login_cookie, time() + 3600);
        header("HTTP/1.1 301 Moved Permanently"); header("Location: ./"); exit();
    } else { ?>
<!doctype html>
<html>
    <head>
    <title>Incorrect</title>
    <meta http-equiv="refresh" content="2; URL=./">
    </head>
    <body>
        Incorrect
    </body></html> <?
    die();
    }
}






if (file_exists($path . "index.html")) {
    $path .= "index.html";
}

if (file_exists($path . "/index.html")) {
    $path .= "/index.html";
}


if (file_exists($path . "index.php")) {
    $path .= "index.php";
}

if (file_exists($path . "/index.php")) {
    $path .= "/index.php";
}

//var_dump($path);
//die();

//if ($path === "/") {
 //   die();
//}

//if (empty($path)) {
//    die();
//}

$mimes = [
    "json" => "application/json",
    "png"=> "image/png",
    "jpeg" => "image/jpeg",
    "js" => "application/javascript",
    "css" => "text/css",
    "bin" => "application/octet-stream",
    "html" => "text/html",
    "svg" => "image/svg+xml"
];

$file_ext = pathinfo($path, PATHINFO_EXTENSION);
if (isset($mimes[$file_ext])) {
    if ($mimes[$file_ext]) {
        header("Content-type: " . $mimes[$file_ext]);
    }
}

if ($logged_in) {
    if ($file_ext === "php") {
        include($path);
    } else {
        echo file_get_contents($path);
    }
} else {?>
<!doctype html>
<html>
    <head>
        <title>Password protection</title>
        <meta charset="utf-8" />
    </head>
    <body>
        This content is embargoed until &lt;date&gt;. <br> If the embargo password has been shared with you, enter it here:
        <form method="POST">
            <input type="password" name="embargo_password" />
            <input type="submit" value="Submit" />
        </form>
    </body>
</html>
<?php }