var WindowScroller = function(config) {
  var { map, script } = config
  var current_item;
  var deferred_action;
  var force_after_500ms = true;
  var prev = window.scrollY;
  this.onScroll = function(e) {
    var direction = window.scrollY >= prev ? "down" : "up"
    prev = window.scrollY;
    var deck = document.querySelector(".slide-deck");
    var deck_rect = deck.getBoundingClientRect();
    var sections = deck.querySelectorAll("section");
    var active_section, section_rect;
    sections.forEach((section) => {
      var this_section_rect = section.getBoundingClientRect()
      if (this_section_rect.top < window.innerHeight && this_section_rect.top + this_section_rect.height > 0) {
        active_section = section;
        section_rect = this_section_rect;
      }
    })
    if (!active_section) {
      var opacity = 0;
    } else {
      //var intro_text = document.querySelector(".intro-text").getBoundingClientRect();
      var height = window.innerHeight;
      var progress = 0 - deck_rect.top/deck_rect.height
      var opacity = Math.min(1, 1.5 + (0 - section_rect.top) / (window.innerHeight/4))
      opacity = Math.min(opacity, (section_rect.top - window.innerHeight + section_rect.height)/(window.innerHeight/4));
      //var opacity = Math.max(0, Math.min(1, 1 - (intro_text.height + intro_text.y) / (height*0.5)))
    }
    document.querySelector("#" + map.getId() + " .map-outer-lightbox").style.opacity = opacity;
    document.querySelector(".slide-custom-backgrounds").style.opacity = opacity;
    var item_to_do, next_item;
    script.sort((a, b) => {
      return a.absPosition - b.absPosition
    });
    script.forEach((item, i) => {
      if (progress > item.absPosition) {
        item_to_do = item;
        //next_item = direction === "down" ? script[i+1] : script[i-1]
      }
    })
    if (!item_to_do) {
      item_to_do = script[0];
      if (direction === "down") {
        //next_item = script[1];
      } 
    }
    function do_item_and_next() {
      item_to_do.action();
      /*if (next_item) {
        if ((item_to_do.type === "customBackground" || item_to_do.config.hideMap) && next_item.type === "mapConfig") {
          next_item.action({backgroundChange: true})
        }
      }*/
    }
    if (current_item !== item_to_do) {
      clearTimeout(deferred_action);
      deferred_action = setTimeout(() => {
        do_item_and_next()
      }, 50);
      current_item = item_to_do
    }
    if (force_after_500ms) {
      if (current_item !== item_to_do) {
        force_after_500ms = false;
        setTimeout(() => {
          clearTimeout(deferred_action);
          do_item_and_next()
          force_after_500ms = true;
        }, 50);
      }
    }
    
  }
}

export { WindowScroller }