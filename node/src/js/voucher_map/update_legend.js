import legendTemplate from "../../legend_template.html"
import { dotConfig } from "./dot_config"
import { colorConfig } from './color_config'
import { select as d3_select, select } from 'd3'
//import high_density_cbsa from "../high_density_cbsa"
import { data_keys } from "./ethnicity_data_keys"
import { get_deflator } from "./dot_deflator"

const updateLegend = function(map) {
  var dataLayerManager = map.dataLayerManager
  var legend_container = document.querySelectorAll("#" + map.getId() + " .legend-container")[0]
  var active_dots_layer = dataLayerManager.getActiveDotsLayers()
  var active_data_layer = dataLayerManager.getActiveLayer()
  var active_hcv_dot_layer = dataLayerManager.getActiveVoucherDotLayer()
  var color_override = dataLayerManager.getColorOverride()
  legend_container.innerHTML = legendTemplate
  if (active_hcv_dot_layer.split("_")[0]==="none") {
    legend_container.querySelector(".voucher-indicator").style.display = "none"
  } else {
    legend_container.querySelector(".voucher-indicator").style.display = "block"
    legend_container.querySelectorAll("[name='voucher-layer-name']")[0].innerText = dotConfig[active_hcv_dot_layer].name.toLowerCase()
  }
  if (active_dots_layer.indexOf("safmr_tot_safmr_vau_dots")!==-1) {
    legend_container.querySelector(".safmr-indicator").style.display = "block"
  } else {
    legend_container.querySelector(".safmr-indicator").style.display = "none"
  }
  var tract_config = colorConfig[active_data_layer]
  var tract_bins = map.cbsaManager.getTractBins()
  var bin_container = document.createElement("div");
  bin_container.className = "legend-bins-inner";
  legend_container.querySelector(".legend-bins").appendChild(bin_container)
  var legend_label = legend_container.querySelector(".legend-bins-wrapper").querySelector("label")
  legend_label.innerText = tract_config.name
  if (tract_config.name ==="Percent People of Color") {
    legend_label.className = "label-offset"
    legend_container.querySelector(".hud-poc-note").style.display="block"
  } else {
    legend_label.className = ""
    legend_container.querySelector(".hud-poc-note").style.display="none"
  }
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
  var eth_dots = [];
  if (active_data_layer==="none") {
    legend_container.querySelector(".legend-bins-wrapper").style.display = "none";
    var eth_legend = document.createElement("div")
    eth_legend.classList.add("ethnicity-legend")
    eth_dots = Object.keys(dotConfig).filter((a)=>{
      if (a.indexOf("tot_pop")!==-1 || a.indexOf("nonwhite")!==-1) return false
      if (active_dots_layer.indexOf(a)===-1) return false
      return a.indexOf("ethnicity_")!==-1
    })
    if (eth_dots.length > 0) {
      eth_legend.innerHTML = `<label class='ethnicity-label'><span name='num-ethnicity-dot-represents'></span> individuals:</label><div class='eth-legend-inner'></div>`
      var eth_legend_inner = eth_legend.querySelector(".eth-legend-inner")
      eth_dots.forEach((dot_name)=>{
        var eth_legend_item = document.createElement("div")
        eth_legend_item.classList.add("eth-legend-item")
        var name = data_keys[dot_name.replace("_dots","")]
        var fill = dotConfig[dot_name].fill;
        if (color_override[dot_name]) {
          fill = color_override[dot_name]
        }
        svg_circle(eth_legend_item, fill)
        var name_el = document.createElement("span")
        name_el.innerText = name
        eth_legend_item.appendChild(name_el)
        eth_legend_inner.appendChild(eth_legend_item)
      })
      legend_container.querySelector(".legend-inner").appendChild(eth_legend)
    }
  } else {
    legend_container.querySelector(".legend-bins-wrapper").style.display = "block";
  }
  updateLegendDotRepresents.call(this, map)
  const source_components = {
    hud: "2020 HUD administrative data",
    acs: "2017-2021 American Community Survey data",
    dec: "2020 Decennial Census data"
  }
  var source_text = [];
  if (active_hcv_dot_layer.split("_")[0] !== "none") {
    source_text.push(source_components.hud);
  }
  if (active_data_layer !== "none") {
    source_text.push(source_components.acs);
  }
  if (eth_dots.length > 0) {
    source_text.push(source_components.dec);
  }
  var notes_container = document.querySelector("#" + map.getId() + " .legend-and-notes"); 
  if (document.querySelectorAll(".cbpp-maps-story-mode").length > 0) {
    if (source_text.length === 0) {
      notes_container.querySelector(".source-line").style.display = "none";
    } else {
      notes_container.querySelector(".source-line").style.display = "inline";
    }
  } else {
    source_text = [
      source_components.hud,
      source_components.acs,
      source_components.dec
    ]
  }
  if (source_text.length <= 2) {
    source_text = source_text.join(" and " );
  } else {
    var final = source_text.pop()
    source_text = source_text.join(", ") + " and " + final;
  }
  notes_container.querySelector(".notes-datasets").innerText = source_text;
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
  var dot_deflator = get_deflator(map.cbsaManager.getDotDensity(cbsa))
  var {z} = coords
  if (active_hcv_dot_layer.split("_")[0] !=="none") {
    /*if (high_density_cbsa[cbsa]) {
      z += high_density_cbsa[cbsa]
    }*/
    var dot_type = active_hcv_dot_layer.split("_")[0]
    legend_container.querySelector(".voucher-indicator > div").style.display = "none";
    if (dot_type === "hcv") {
      legend_container.querySelector(".voucher-circle").style.display = "inline-block";
    } else if (dot_type === "ph") {
      legend_container.querySelector(".voucher-square").style.display = "inline-block";
    } else if (dot_type === "pbra") {
      legend_container.querySelector(".voucher-triangle").style.display = "inline-block";
    }
    var dotRepresents = dotConfig[active_hcv_dot_layer].numDots(z)
    if (dotRepresents) {
      legend_container.querySelectorAll("[name='voucher-dot-represents'], [name='safmr-dot-represents']").forEach((item)=>{
        item.innerText = Math.round(dotRepresents/dot_deflator)
      })  
    }
  }
  var ethDotRepresents = dotConfig.default.numDots(z)
  var ethnicity_dot_represents_span = legend_container.querySelectorAll("[name='num-ethnicity-dot-represents']")
  if (ethnicity_dot_represents_span.length > 0) {
    ethnicity_dot_represents_span[0].innerText = Math.round(ethDotRepresents/dot_deflator)
  }
}

export { updateLegend, updateLegendDotRepresents }