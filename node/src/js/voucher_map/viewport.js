var viewport;

import { viewportEvents } from "../ui/viewport"

const getViewport = function() {
  if (typeof(viewport)==="undefined") {
    viewport = document.querySelectorAll("#" + this.getId() + " .map-viewport")[0]
  }
  return viewport
}

const getViewportWidth = function() {
  const viewport = this.getViewport()
  return viewport.clientWidth

}

const getViewportHeight = function() {
  const viewport = this.getViewport()
  return viewport.clientHeight
}

export {
  getViewport,
  getViewportWidth,
  getViewportHeight,
  viewportEvents,
}