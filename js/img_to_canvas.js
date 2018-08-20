module.exports = function($) {

  var png_to_canvas_transparent = function(image) {
    var inline_styles = $(image).attr("style");
    var canvas = document.createElement("canvas");
    $(canvas).attr({"width":image.naturalWidth,"height":image.naturalHeight});
    $(canvas).css({"position":"absolute","top":"0px","left":"0px"});
    var ctx = canvas.getContext("2d");
    try {
      ctx.drawImage(image,0,0);
      var imageData = ctx.getImageData(0,0,image.naturalWidth,image.naturalHeight);
      var data = imageData.data;
      
      for (var i = 0, ii = data.length-4;i<ii;i+=4) {
        var avg = Math.round((data[i] + data[i+1] + data[i+2])/3);
        data[i] = 0;
        data[i+1] = 0;
        data[i+2] = 0;
        data[i+3] = 255 - avg;
      }
      ctx.putImageData(imageData,0,0);
    } catch (ex) {
    }
    $(canvas).attr("style",inline_styles);
    $(image).replaceWith(canvas);
    $(canvas).attr("data-src",$(image).attr("src"));
    return canvas;
  };

  return png_to_canvas_transparent;

};
