import legendTemplate from "../../legend_template.html"
import { dotConfig } from "./dot_config"
import { colorConfig } from './color_config'
import { select as d3_select } from 'd3'
import high_density_cbsa from "../high_density_cbsa";

const updateLegend = function(map) {
  var dataLayerManager = map.dataLayerManager
  var legend_container = document.querySelectorAll("#" + map.getId() + " .legend-container")[0]
  var active_dots_layer = dataLayerManager.getActiveDotsLayers()
  var active_data_layer = dataLayerManager.getActiveLayer()
  var active_hcv_dot_layer = dataLayerManager.getActiveVoucherDotLayer()
  legend_container.innerHTML = legendTemplate
  legend_container.querySelectorAll("[name='voucher-layer-name']")[0].innerText = dotConfig[active_hcv_dot_layer].name.toLowerCase()
  updateLegendDotRepresents.call(this, map)
  var tract_config = colorConfig[active_data_layer]
  var tract_bins = map.cbsaManager.getTractBins()
  var bin_container = document.createElement("div");
  bin_container.className = "legend-bins-inner";
  legend_container.querySelector(".legend-bins").appendChild(bin_container)
  if (tract_bins) {
    var { colors } = tract_config;
    var bin_data = []
    var bins = tract_bins[active_data_layer]
    if (tract_config.customBins) {
      bins = tract_config.customBins
    }
    bins.forEach((bin, i)=>{
      if (colors[i]) {
        bin_data.push({
          text: i===0 ? "" : tract_config.f(bin),
          fill: colors[i]
        })
      }
    })
    var bin_selection = d3_select(bin_container).selectAll("div.legend-bin")
      .data(bin_data);
    bin_selection.enter()
      .append("div")
      .attr("class","legend-bin")
      .merge(bin_selection)
      .style("width", 100/bin_data.length + "%")
      .style("left", (d,i)=>100*i/bin_data.length + "%")
      .each(function(d) {
        d3_select(this).append("svg")
          .attr("viewBox", "1 1 8 8")
          .attr("preserveAspectRatio","none")
          .append("rect")
          .attr("x","0")
          .attr("y","0")
          .attr("width", 10)
          .attr("height", 10)
          .attr("fill", d.fill)
        d3_select(this).append("div")
          .attr("class","legend-bin-label")
          .html("<label>" + d.text + "</label>")
      })
      .exit()
      .remove()
  }
}

const updateLegendDotRepresents = function(map) {
  var dataLayerManager = map.dataLayerManager
  var coords = map.coordTracker.getCoords()
  var cbsa = map.cbsaManager.getLoadedCbsa()
  var legend_container = document.querySelectorAll("#" + map.getId() + " .legend-container")[0]
  var active_hcv_dot_layer = dataLayerManager.getActiveVoucherDotLayer()
  if (active_hcv_dot_layer!=="none") {
    var {z} = coords
    if (high_density_cbsa[cbsa]) {
      z += high_density_cbsa[cbsa]
    }
    var dotRepresents = dotConfig[active_hcv_dot_layer].numDots(z)
    legend_container.querySelectorAll("[name='voucher-dot-represents']")[0].innerText = dotRepresents
  }
}

export { updateLegend, updateLegendDotRepresents }