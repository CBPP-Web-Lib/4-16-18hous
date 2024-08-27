import { WindowScroller  } from "./js/story/window_scroller"
import { MapManager } from "./js/story/map_manager"
import { build_script } from "./js/story/script"
import "./slides.scss"

var map = window.cbpp_housing_voucher_map

window.addEventListener("DOMContentLoaded", function() {

  script.forEach((script_item) => {
    console.log(script_item)
  })

  document.querySelector(".slide-deck").querySelectorAll(".slide").forEach((slide)=> {
    slide.innerHTML = "<div class='slide-inner-wrap'>" + slide.innerHTML + "</div>"
  });

  map.ready(function() {
    var scroller = new WindowScroller({map, script})

    window.addEventListener("resize", windowResize);
    windowResize()
    
    window.addEventListener("scroll", scroller.onScroll);
    scroller.onScroll({scrollY: 0})
  });
})


var windowResize = function() {
  var deck = document.querySelector(".slide-deck");
  var { left, right } = deck.parentElement.getBoundingClientRect()
  var outerRight = window.innerWidth;
  deck.style["margin-left"] = (-left + outerRight - right) + "px"
  calculate_absolute_percentages()

}

function calculate_absolute_percentages() {
  var deck = document.querySelector(".slide-deck");
  var deckRect = deck.getBoundingClientRect()
  var slides = deck.querySelectorAll(".slide");
  var anchors = {}
  slides.forEach((slide) => {
    var slideRect = slide.getBoundingClientRect()
    var height = slideRect.height/deckRect.height
    var start = (slideRect.top - deckRect.top)/deckRect.height
    anchors[slide.getAttribute("name")] = {height, start}
  })
  script.forEach((change) => {
    try {
      var { anchor } = change;
      if (!anchor) {return;}
      var slide_pos = anchors[anchor]
      change.absPosition = slide_pos.start + change.position/100 * slide_pos.height
    } catch (ex) {
      console.error(ex);
    }
  })
  script.sort((a, b) => {
    return a.absPosition - b.absPosition
  })
}

var theMgr = new MapManager(map);

var script = build_script(theMgr);
