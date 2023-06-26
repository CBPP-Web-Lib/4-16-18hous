function getURLBase(script_id) {
  var url_base = document.getElementById(script_id).src.split("/");
  url_base.pop()
  url_base.pop()
  url_base = url_base.join("/")
  return url_base
}

export {getURLBase}