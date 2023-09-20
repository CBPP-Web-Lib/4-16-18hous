var get_deflator = function(dot_density) {
  var m = 1
  var ms = [2.5, 2, 2]
  var msi = 0
  var _dot_density = dot_density
  while (_dot_density > 0.02) {
    m *= ms[msi]
    _dot_density = dot_density / m;
    msi++
    msi = msi%(ms.length+1)
  }
  return 1/m
}

export { get_deflator }
      