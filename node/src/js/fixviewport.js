module.exports = function(viewport, options) {
  for (var i = 0, ii = viewport.length; i<ii; i++) {
    viewport[i]*=1;

  }
  if (!options.zoomOutLimit) {
    options.zoomOutLimit = [
      viewport[0]*1,
      viewport[1]*1,
      viewport[0]*1+viewport[2]*1,
      viewport[1]*1+viewport[3]*1];
  }
  if (viewport[0]<options.zoomOutLimit[0]) {
    viewport[0] = options.zoomOutLimit[0];
  }
  if (viewport[2]*1 + viewport[0]*1 > options.zoomOutLimit[2]) {
    viewport[2] = options.zoomOutLimit[2] - viewport[0];
  }
  if (viewport[1]*1<options.zoomOutLimit[1]) {
    viewport[1] = options.zoomOutLimit[1];
  }
  if (viewport[3]*1 + viewport[1]*1 > options.zoomOutLimit[3]) {
    viewport[3] = options.zoomOutLimit[3] - viewport[1];
  }
  return viewport;
};
