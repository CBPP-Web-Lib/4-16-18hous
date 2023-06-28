import { select as d3_select} from "d3"
import { hoverTemplate } from "../voucher_map/hover_template"

const TractHover = function(map) {
  var container = document.getElementById(map.getId())

  var hovered_tract
  var tooltip = document.createElement("div")
  tooltip.classList.add("tract_tooltip")
  tooltip.innerHTML = `
    <div class='tooltip-inner'>
      <div class='tooltip-actual'>

      </div>
    </div>
  `;
  var tooltip_container = document.createElement("div");
  tooltip_container.classList.add("tooltip-container");
  container.querySelectorAll(".map-viewport")[0].append(tooltip_container);
  tooltip_container.append(tooltip);
  const eventHandler = (e)=>{
    if (hovered_tract !== e.target && hovered_tract) {
      hovered_tract.classList.remove("hovered")
    }
    var new_tract = false
    if (e.target) {
      if (e.target.classList) {
        if (e.target.classList.contains("tract")) {
          if (hovered_tract !== e.target || !hovered_tract) {
            hovered_tract = e.target
            new_tract = true
            hovered_tract.classList.add("hovered")
          }
        } else {
          hovered_tract = null
        }
      }
    }
    if (hovered_tract && new_tract) {
      var html = hoverTemplate(d3_select(hovered_tract).datum())
      tooltip.querySelectorAll(".tooltip-actual")[0].innerHTML = html
    }
    if (hovered_tract) {
      tooltip.style.display = "block"
      var boundingRect = container.querySelectorAll(".map-viewport")[0].getBoundingClientRect();
      var el_pos = {
        left: (e.clientX - boundingRect.x),
        top:  (e.clientY - boundingRect.y),
      }
      console.log(boundingRect)
      var box_width = boundingRect.width * 0.3
      tooltip.querySelectorAll(".tooltip-inner")[0].style.width = box_width + "px"
      
      var percent_right = el_pos.left / boundingRect.width
      var percent_down = el_pos.top / boundingRect.height
      tooltip.querySelectorAll(".tooltip-inner")[0].style.left = ((-percent_right)*(box_width + 20)) + "px"
      if (percent_down < 0.5) {
        tooltip.querySelectorAll(".tooltip-inner")[0].style.bottom = ""
        tooltip.querySelectorAll(".tooltip-inner")[0].style.top = "20px"
      } else {
        tooltip.querySelectorAll(".tooltip-inner")[0].style.bottom = "20px"
        tooltip.querySelectorAll(".tooltip-inner")[0].style.top = ""
      }
      tooltip.style.left = el_pos.left + "px"
      tooltip.style.top = el_pos.top + "px"
    } else {
      tooltip.style.display = "none"
    }
    
  }

  container.addEventListener("mousemove", eventHandler)
  container.addEventListener("touch", eventHandler)
}

export { TractHover }