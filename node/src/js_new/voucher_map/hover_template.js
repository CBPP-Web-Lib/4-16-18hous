import { data_keys } from "./ethnicity_data_keys"

function hoverTemplate(data) {
  var html = `<h3>${data.properties.NAMELSAD10}</h3>
    <ul>
      <li>Poverty Rate: ${data.properties.housing_data.poverty_pov_pct + "%"}</li>
      <li>Nonwhite Percentage: ${
        Math.round(data.properties.housing_data.ethnicity_nonwhite_percentage*1000)/10 + "%"
      }</li>
    </ul>`;
  html += "<ul>"
  return html;
  Object.keys(data_keys).forEach((key)=>{
    html += "<li>" + data_keys[key] + ": " + Math.round(data.properties.housing_data[key]) + "</li>"
  })
  html += "</ul>"
  html += "<p>GEOID: " + data.properties.GEOID10 + "</p>"
  return html
}

export { hoverTemplate }