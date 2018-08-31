module.exports = function($, m) {
  function filterCachedCanvas() {
    var arr = [];
    for (var src in m.cachedCanvasData) {
      if (m.cachedCanvasData.hasOwnProperty(src)) {
        arr.push([src, m.cachedCanvasData[src][1]]);
      }
    }
    console.log("number of cached images: " + arr.length);
    arr.sort(function(a, b) {
      return a[1] - b[1];
    });
    for (var i = 0, ii = arr.length; i<ii; i++) {
      if (i < ii - 50) {
        console.log("old: " + arr[i][0]);
        delete(m.cachedCanvasData[arr[i][0]]);
      }
    }
  }
  var png_to_canvas_transparent = function(image) {
    var inline_styles = $(image).attr("style");
    var canvas = document.createElement("canvas");
    $(canvas).attr({"width":image.naturalWidth,"height":image.naturalHeight});
    $(canvas).css({"position":"absolute","top":"0px","left":"0px"});
    var ctx = canvas.getContext("2d");
    var imageData;
    try {
      if (m.cachedCanvasData[$(image).attr("src")]) {
        console.log("using cache for " + $(image).attr("src"));
        imageData = m.cachedCanvasData[$(image).attr("src")][0];
      } else {
        console.log("getting new for " + $(image).attr("src"));
        ctx.drawImage(image,0,0);
        imageData = ctx.getImageData(0,0,image.naturalWidth,image.naturalHeight);
        var data = imageData.data;
        
        for (var i = 0, ii = data.length-4;i<ii;i+=4) {
          var avg = Math.round((data[i] + data[i+1] + data[i+2])/3);
          data[i] = 0;
          data[i+1] = 0;
          data[i+2] = 0;
          data[i+3] = 255 - avg;
        }
      }
      ctx.putImageData(imageData,0,0);
      //m.cachedCanvasData[$(image).attr("src")] = [imageData, Date.now()];
    } catch (ex) {
      console.error(ex);
    }
    $(canvas).attr("style",inline_styles);
    $(image).replaceWith(canvas);
    $(canvas).attr("data-src",$(image).attr("src"));
    //filterCachedCanvas();
    return canvas;
  };

  return png_to_canvas_transparent;

};
