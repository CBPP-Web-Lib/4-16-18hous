import "./slides.scss"

var map = window.cbpp_housing_voucher_map



window.addEventListener("DOMContentLoaded", function() {

  document.querySelector(".slide-deck").querySelectorAll(".slide").forEach((slide)=> {
    console.log(slide)
    slide.innerHTML = "<div class='slide-inner-wrap'>" + slide.innerHTML + "</div>"
  })

  var scroller = new WindowScroller()

  window.addEventListener("resize", windowResize);
  windowResize()

  
  window.addEventListener("scroll", scroller.onScroll);
  scroller.onScroll()
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
    var { anchor } = change;
    if (!anchor) {return;}
    var slide_pos = anchors[anchor]
    change.absPosition = slide_pos.start + change.position/100 * slide_pos.height
  })
  console.log(script)
}

var WindowScroller = function() {
  var current_item;
  var deferred_action;
  this.onScroll = function() {
    var deck = document.querySelector(".slide-deck").getBoundingClientRect();
    var progress = 0 - deck.top/deck.height
    var item_to_do;
    script.forEach((item) => {
      if (progress > item.absPosition) {
        item_to_do = item;
      }
    })
    if (!item_to_do) {
      item_to_do = script[0];
    }
      
    if (current_item !== item_to_do) {
      clearTimeout(deferred_action);
      deferred_action = setTimeout(() => {
        item_to_do.action()
      }, 500);
      current_item = item_to_do
    }
    
  }
}

var MapManager = function() {
  var _cbsa;
  var _bounds;
  var _active_layers = {};
  var _active_races = {};
  var _household_type;

  this.customBackground = function(config) {
    var { name } = config
    document.querySelector("#" + map.getId()).classList.add("map-hidden")
    document.querySelector(".slide-custom-backgrounds > div").classList.remove("active");
    document.querySelector(".slide-custom-backgrounds [name='" + name + "']").classList.add("active")
  }

  this.setNewConfig = function(config) {
    var {cbsa, bounds, active_layers, active_races, mode, hideMap, household_type} = config;
    document.querySelector(".slide-custom-backgrounds > div").classList.remove("active");
    if (hideMap) {
      document.querySelector("#" + map.getId()).classList.add("map-hidden")
    } else {
      document.querySelector("#" + map.getId()).classList.remove("map-hidden")
    }
    if (mode === "story") {
      document.body.classList.add("cbpp-maps-story-mode");
    } else {
      document.body.classList.remove("cbpp-maps-story-mode");
    }
    if (cbsa !== _cbsa) {
      _cbsa = cbsa;
      if (cbsa) {
        document.querySelectorAll("#" + map.getId() + " .map-outer-lightbox")[0]
          .style.visibility = "visible"
        map.cbsaManager.loadCBSA(cbsa).then(() => {
          setCoords(bounds)
          afterCoordsSet()
        });
      }
    } else {
      setCoords(bounds)
      afterCoordsSet()
    }
    
    function afterCoordsSet() {
      if (household_type !== _household_type) {
        map.dataLayerManager.setActiveDotsLayer(household_type)
        map.updateView()
      }
    }

  }


  function setCoords(bounds) {
    if (!bounds) {return;}
    console.log(bounds, _bounds)
    if (!arrEqual(bounds, _bounds)) {
      var tileCoords = map.coordTracker.getBoundingTilesForBbox(bounds)
      map.coordTracker.setCoords(tileCoords)
      _bounds = bounds;
    }
  }

  function arrEqual(a1, a2) {
    if (!a1 || !a2) {return false}
    if (a1.length !== a2.length) {return false}
    var r = true;
    a1.forEach((el, i) => {
      if (a1[i] !== a2[i]) {
        r = false;
      }
    })
    return r;
  }

}

var theMgr = new MapManager;

var script = [
  {
    position: "lessThanMin",
    action: () => {
      theMgr.setNewConfig({hideMap: true})
    }
  },
  {
    position: -50,
    anchor: "milwaukee-1",
    action: () => {
      theMgr.setNewConfig({
        cbsa: 33340,
        mode: "story",
        bounds: [-88.1447, 42.8989, -87.7661, 43.2077],
        household_type: "hcv_total"
      })
    }
  },
  {
    position: -50,
    anchor: "milwaukee-2",
    action: () => {
      theMgr.setNewConfig({
        cbsa: 33340,
        mode: "story",
        bounds: [-88.1447, 42.8989, -87.7661, 43.2077],
        household_type: "hcv_children_poc"
      })
    }
  },
  {
    position: -50,
    anchor: "milwaukee-3",
    action: () => {
      theMgr.customBackground({
        name: "families_poc_milwaukee_chart"
      })
    }
  }
]

console.log(map)