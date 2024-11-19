import { closeMap } from "./close_map"

const setupLightbox = function(dom) {
  var id = this.getId()
  const lightboxEl = document.createElement("div")
  lightboxEl.className = "map-outer-lightbox"
  const lightboxInner = document.createElement("div")
  lightboxInner.className = "map-inner-lightbox"
  document.getElementById(id).appendChild(lightboxEl)
  lightboxEl.appendChild(lightboxInner)
  lightboxInner.innerHTML = dom
  const closeBox = document.createElement("div");
  closeBox.className= "map-close-lightbox"
  closeBox.innerHTML = "<span>&#10006;</span>"
  closeBox.addEventListener("click", (e)=>{
    e.preventDefault()
    closeMap(this)
    document.querySelectorAll("body")[0].classList.remove("no-scroll")
    document.querySelectorAll("html")[0].classList.remove("no-scroll")
  })
  //document.querySelectorAll("body")[0].classList.add("no-scroll")
  //document.querySelectorAll("html")[0].classList.add("no-scroll")
  lightboxEl.append(closeBox)
}

export { setupLightbox }