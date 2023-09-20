import commaNumber from "comma-number"

const races = {
  "aian":"American Indian/Alaska Native",
  "asian":"Asian",
  "black":"Black",
  "hisp":"Hispanic",
  "multi":"Multiple races",
  "nhpi":"Native Hawaiʻian/Pacific Islander",
  "other":"Another race",
  "white":"White"
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
  var html = `<h3>${data.properties.NAMELSAD10}</h3>
      <div class='hover-data-item'><span class='hover-data-label'>Poverty Rate:</span><span class='hover-data-value'>${
        Math.round(data.properties.housing_data.poverty_pov_pct*10)/10 + "%"
      }</span></div>`;
  html += `<div class='hover-data-item'><span class='hover-data-label'>Percentage People of Color:</span><span class='hover-data-value'>${
    Math.round(data.properties.housing_data.ethnicity_nonwhite_percentage*1000)/10 + "%"
  }</span></div>`
  html += `<div class='hover-data-item'><span class='hover-data-label'>Families using vouchers:</span><span class='hover-data-value'>${
    Math.round(hcv/10)*10
  }</span></div>`
  html += `<div class='hover-data-item'><span class='hover-data-label'>Families using public housing:</span><span class='hover-data-value'>${
    Math.round(ph/10)*10
  }</span></div>`
  html += `<div class='hover-data-item'><span class='hover-data-label'>Families using project-based rental assistance:</span><span class='hover-data-value'>${
    Math.round(pbra/10)*10
  }</span></div>`
  html += `<div class='hover-data-item no-border'><span class='hover-data-label'>Population:</span><span class='hover-data-value'>${
    commaNumber(Math.round(data.properties.housing_data["ethnicity_tot_pop"]))
  }</span></div>`
  html += `
    <div><table>`;
  race_data.forEach((race)=> {
    html += `<tr><td>${race[0]}:</td><td>${commaNumber(Math.round(race[1]))}</td></tr>`
  })
  html += "</table></div>";
  return html;
}

export { hoverTemplate }