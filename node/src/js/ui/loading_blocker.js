import { getURLBase } from "../get_url_base"

var blocker

function displayLoadingBlocker() {
  if (typeof(blocker)==="undefined") {
    blocker = createBlocker()
  }
  blocker.style.display = "block"
}

function hideLoadingBlocker() {
  blocker.style.display = "none"
}

function createBlocker() {
  var el = document.createElement("div")
  var url_base = getURLBase()
  el.classList.add("hous4-16-18-loading-blocker")
  el.innerHTML = `<img src="${url_base}/loading.gif" alt="loading" />`
  document.querySelector("body").appendChild(el)
  return el
}

export { displayLoadingBlocker, hideLoadingBlocker }