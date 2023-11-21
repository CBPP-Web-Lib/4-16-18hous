function make_autocomplete(sel_input) {
  return new AutocompleteInput(sel_input)
}

var AutocompleteInput = function(sel_input) {
  var new_wrap = document.createElement("div")
  new_wrap.classList.add("autocomplete_wrap")
  var down_arrow = document.createElement("span");
  down_arrow.classList.add("down-arrow-autocomplete");
  down_arrow.innerHTML = "&#x25BC;"
  new_wrap.append(down_arrow)
  var text_input = document.createElement("input");
  text_input.setAttribute("type","text")
  new_wrap.append(text_input)
  sel_input.style.display = "none"
  sel_input.after(new_wrap)
  var throttle_timer;
  sel_input.hous41618_associated_autocomplete_textinput = text_input
  var input_handler = function(e) {
    var self = this
    clearTimeout(throttle_timer)
    throttle_timer = setTimeout(function() {
      throttled_change.call(self, e)
    }, 200) 
  }
  var old_text

  document.addEventListener("click", function(e) {
    var el = e.target;
    while (el.parentNode) {
      if (el.classList.contains("autocomplete_wrap")) {
        return;
      }
      el = el.parentNode
    }
    removeOptions()
    if (old_text) {
      text_input.value = old_text
      old_text = null;
    }
  })

  function removeOptions() {
    new_wrap.querySelectorAll(".autocomplete_options").forEach((autocomplete_list) => {
      autocomplete_list.parentNode.removeChild(autocomplete_list)
    })
  }

  var throttled_change = function(old_text) {
    if (typeof(old_text)==="undefined") {
      old_text = ""
    }
    var options = get_options(this.value)
    removeOptions()
    var list = document.createElement("ul")
    list.classList.add("autocomplete_options")
    var selected_li
    options.forEach((option)=>{
      if (option[0] !== "") {
        var li = document.createElement("li")
        li.innerText = option[0]
        if (option[0] === old_text) {
          li.classList.add("selected-autocomplete")
          selected_li = li
        }
        list.appendChild(li)
        li.addEventListener("click", function() {
          li_click_handler(option)
        })
      }
    })
    new_wrap.append(list)
    if (selected_li) {
      var offset = selected_li.getBoundingClientRect()
      var parent_offset = list.getBoundingClientRect()
      var distance_down = offset.y - parent_offset.y
      list.scrollTop = Math.max(0, distance_down - 50)
    }
  }

  var li_click_handler = function(val) {
    removeOptions()
    sel_input.value = val[1]
    var event = new Event("change")
    sel_input.dispatchEvent(event)
    text_input.value = val[0]
    old_text = text_input.value
  }

  var get_options = function(text) {
    var options = sel_input.querySelectorAll("option")
    var results = []
    options.forEach((option)=>{
      if (option.innerText.toLowerCase().indexOf(text.toLowerCase())!==-1) {
        results.push([option.innerText, option.value])
      }
    })
    return results
  }

  
  text_input.addEventListener("input", input_handler)
  text_input.addEventListener("focus", function() {
    old_text = text_input.value
    text_input.value = ""
    throttled_change.call(this, old_text)
  })

}

export { make_autocomplete }