import commaNumber from "comma-number"

const races = {
  "aian":"American Indian/Alaska Native",
  "asian":"Asian",
  "black":"Black",
  "hisp":"Latine",
  "multi":"Multiple races",
  "nhpi":"Native Hawaiʻian/Pacific Islander",
  "other":"Another race",
  "white":"White"
}

function round_bin_12(n) {
  if (n > 0 && n < 15) {
    return 12;
  }
  return Math.round(n/10)*10
}

function hoverTemplate(data) {
  var race_data = [];
  Object.keys(races).forEach((race) => {
    race_data.push([races[race], data.properties.housing_data["ethnicity_" + race]])
  })
  race_data.sort((a, b)=> {
    return b[1] - a[1]
  })
  var hcv = 0;
  var ph = 0;
  var pbra = 0;
  if (data.properties.housing_data.hcv_total) {
    hcv = data.properties.housing_data.hcv_total[12]*12
  }
  if (data.properties.housing_data.ph_total) {
    ph = data.properties.housing_data.ph_total[12]*12
  }
  if (data.properties.housing_data.pbra_total) {
    pbra = data.properties.housing_data.pbra_total[12]*12
  }
  var html = `<h3>${data.properties.NAMELSAD10}</h3>`;
  
  /*html += `<div class='hover-data-item'><span class='hover-data-label'>Percentage People of Color:</span><span class='hover-data-value'>${
    Math.round(data.properties.housing_data.ethnicity_nonwhite_percentage*1000)/10 + "%"
  }</span></div>`*/
  var total_assisted = hcv + ph + pbra
  html += `<div class='hover-data-item no-border'><span class='hover-data-label'>Total Assisted Households</span><span class='hover-data-value'>${
    round_bin_12(total_assisted)
  }</span></div>`
  html += `<div><table>`
  html += `<tr><td>Using vouchers:</td><td>${
    round_bin_12(hcv)
  }</td></tr>`
  html += `<tr><td>Using public housing:</td><td>${
    round_bin_12(ph)
  }</td></tr>`
  html += `<tr><td>Using project-based rental assistance:</td><td>${
    round_bin_12(pbra)
  }</td></tr>`
  html += `</table></div>`
  html += `
      <div class='hover-data-item top-border'><span class='hover-data-label'>Poverty Rate:</span><span class='hover-data-value'>${
        Math.round(data.properties.housing_data.poverty_pov_pct*10)/10 + "%"
      }</span></div>`;
  var total_pop = data.properties.housing_data["ethnicity_tot_pop"]
  html += `<div class='hover-data-item no-border'><span class='hover-data-label'>Population:</span><span class='hover-data-value'>${
    commaNumber(Math.round(total_pop))
  }</span></div>`
  html += `
    <div><table>`;
  race_data.forEach((race)=> {
    var perc = Math.round(race[1]/total_pop*1000)/10;
    perc = perc + "";
    perc = perc.split(".");
    if (perc.length === 1) {
      perc[1] = "0"
    }
    perc = perc.join(".")
    html += `<tr><td>${race[0]}:</td><td>` + perc + `%</td><td>${commaNumber(Math.round(race[1]))}</td></tr>`
  })
  html += "</table></div>";
  return html;
}

export { hoverTemplate }