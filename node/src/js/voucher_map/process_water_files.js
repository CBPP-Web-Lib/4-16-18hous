const processWaterFiles = function(d, imports) {
  var {feature, geojson_bbox} = imports
  var promises = [];
  d.forEach((topology)=>{
    promises.push(new Promise((resolve)=>{
      var geojson = feature(topology, topology.objects.districts);
      geojson.features.forEach((feature)=>{
        feature.bbox =  geojson_bbox(feature)
      })
      resolve(geojson)
    }));
  });
  return Promise.all(promises)
}

module.exports = { processWaterFiles }