function hoverTemplate(data) {
  var html = `<h3>${data.properties.NAMELSAD10}</h3>
    <ul>
      <li>Poverty Rate: ${data.properties.housing_data.poverty_pov_pct + "%"}</li>
      <li>Nonwhite Percentage: ${
        Math.round(data.properties.housing_data.ethnicity_nonwhite_percentage*1000)/10 + "%"
      }</li>
    </ul>`;
  return html
}

export { hoverTemplate }