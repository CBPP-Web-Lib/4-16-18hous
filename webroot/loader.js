var is_safari = (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1);
console.log(is_safari);
var url = document.getElementById("loader_hous4-16-18").src.replace("loader.js","");
//is_safari = true;
if (is_safari) {
  document.getElementById("hous4-16-18").innerHTML = "";
  var iframe = document.createElement("iframe");
  iframe.src="https://apps.cbpp.org/4-16-18hous/index.html";
  var height = window.innerHeight;
  iframe.style = "width:100% !important;height:1100px;max-height:" + height + "px;border:0px;overflow-y:scroll";
  document.getElementById("hous4-16-18").appendChild(iframe);
} else {
  var app = document.createElement("script");
  app.src = url + "js/app.js";
  app.id = "script_hous4-16-18";
  document.querySelectorAll("head")[0].appendChild(app); 
}
 
//<script src="js/app.js" id="script_hous4-16-18"></script>