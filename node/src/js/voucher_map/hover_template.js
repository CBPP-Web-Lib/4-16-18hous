function hoverTemplate(data) {
  var html = `<h3>${data.properties.NAMELSAD10}</h3>
    <ul>
      <li>Poverty Rate: ${
        Math.round(data.properties.housing_data.poverty_pov_pct*10)/10 + "%"
      }</li>
      <li>Percentage People of Color: ${
        Math.round(data.properties.housing_data.ethnicity_nonwhite_percentage*1000)/10 + "%"
      }</li>
    </ul>`;
  html += "<ul>"
  return html;
}

export { hoverTemplate }