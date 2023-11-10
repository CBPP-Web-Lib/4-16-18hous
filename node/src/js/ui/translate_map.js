var translateMap = function(dx, dy) {
  var map = this;
  var shapeLayers = map.getTransparencyContainer().querySelectorAll("g.shapeLayer");
  var dotsLayer = map.getTransparencyContainer().querySelectorAll("canvas")[0];
  shapeLayers.forEach((shapeLayer)=>{
    shapeLayer.style.transform = "translate(" + dx + "px," + dy + "px)";
  })
  dotsLayer.style.transform = "translate(" + dx + "px," + dy + "px)";
}

var untranslateMap = function() {
  var map = this;
  var shapeLayers = map.getTransparencyContainer().querySelectorAll("g.shapeLayer");
  var dotsLayer = map.getTransparencyContainer().querySelectorAll("canvas")[0];
  shapeLayers.forEach((shapeLayer)=>{
    shapeLayer.style.transform = "";
  })
 // dotsLayer.style.transform = "";
}

export { translateMap, untranslateMap }