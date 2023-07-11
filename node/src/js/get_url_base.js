var url_base

function getURLBase() {
  return url_base
}

function getURLBaseFromScript(script_id) {
  url_base = document.getElementById(script_id).src.split("/");
  url_base.pop()
  url_base.pop()
  url_base = url_base.join("/")
  return url_base
}

export {getURLBase, getURLBaseFromScript}