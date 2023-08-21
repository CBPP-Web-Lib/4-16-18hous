import legendTemplate from "../../legend_template.html"
import { dotConfig } from "./dot_config"
import { colorConfig } from './color_config'
import { select as d3_select, select } from 'd3'
import high_density_cbsa from "../high_density_cbsa"
import { data_keys } from "./ethnicity_data_keys"

const updateLegend = function(map) {
  var dataLayerManager = map.dataLayerManager
  var legend_container = document.querySelectorAll("#" + map.getId() + " .legend-container")[0]
  var active_dots_layer = dataLayerManager.getActiveDotsLayers()
  var active_data_layer = dataLayerManager.getActiveLayer()
  var active_hcv_dot_layer = dataLayerManager.getActiveVoucherDotLayer()
  legend_container.innerHTML = legendTemplate
  legend_container.querySelectorAll("[name='voucher-layer-name']")[0].innerText = dotConfig[active_hcv_dot_layer].name.toLowerCase()
  if (active_dots_layer.indexOf("safmr_tot_safmr_vau_dots")!==-1) {
    legend_container.querySelector(".safmr-indicator").style.display = "inline-block"
  } else {
    legend_container.querySelector(".safmr-indicator").style.display = "none"
  }
  var tract_config = colorConfig[active_data_layer]
  var tract_bins = map.cbsaManager.getTractBins()
  var bin_container = document.createElement("div");
  bin_container.className = "legend-bins-inner";
  legend_container.querySelector(".legend-bins").appendChild(bin_container)
  legend_container.querySelector(".legend-bins-wrapper").querySelector("label").innerText = tract_config.name
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
  if (active_data_layer==="none") {
    legend_container.querySelector(".legend-bins-wrapper").style.display = "none";
    var eth_legend = document.createElement("div")
    eth_legend.classList.add("ethnicity-legend")
    const eth_dots = Object.keys(dotConfig).filter((a)=>{
      if (a.indexOf("tot_pop")!==-1 || a.indexOf("nonwhite")!==-1) return false
      return a.indexOf("ethnicity_")!==-1
    })
    eth_legend.innerHTML = `<label class='ethnicity-label'><span name='num-ethnicity-dot-represents'></span> individuals:</label><div class='eth-legend-inner'></div>`
    var eth_legend_inner = eth_legend.querySelector(".eth-legend-inner")
    eth_dots.forEach((dot_name)=>{
      var eth_legend_item = document.createElement("div")
      eth_legend_item.classList.add("eth-legend-item")
      var name = data_keys[dot_name.replace("_dots","")]
      svg_circle(eth_legend_item, dotConfig[dot_name].fill)
      var name_el = document.createElement("span")
      name_el.innerText = name
      eth_legend_item.appendChild(name_el)
      eth_legend_inner.appendChild(eth_legend_item)
    })
    legend_container.querySelector(".legend-inner").appendChild(eth_legend)
  } else {
    legend_container.querySelector(".legend-bins-wrapper").style.display = "block";
  }
  updateLegendDotRepresents.call(this, map)
} 

const svg_circle = (el, fill) => {
  fill = fill.substr(0, 7)
  select(el).append("svg")
    .attr("viewBox", "0 0 10 10")
    .append("circle")
    .attr("r","4")
    .attr("cx", "5")
    .attr("cy", "5")
    .attr("fill", fill)
    .attr("stroke-width", 0)
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
    var ethDotRepresents = dotConfig.default.numDots(z)
    legend_container.querySelectorAll("[name='voucher-dot-represents'], [name='safmr-dot-represents']").forEach((item)=>{
      item.innerText = dotRepresents
    })
    var ethnicity_dot_represents_span = legend_container.querySelectorAll("[name='num-ethnicity-dot-represents']")
    if (ethnicity_dot_represents_span.length > 0) {
      ethnicity_dot_represents_span[0].innerText = ethDotRepresents
    }
  }
}

export { updateLegend, updateLegendDotRepresents }