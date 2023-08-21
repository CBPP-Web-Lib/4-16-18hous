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
  var html = `<h3>${data.properties.NAMELSAD10}</h3>
    <ul>
      <li>Poverty Rate: ${
        Math.round(data.properties.housing_data.poverty_pov_pct*10)/10 + "%"
      }</li>`;
    
  html += `
  <li>Percentage People of Color: ${
    Math.round(data.properties.housing_data.ethnicity_nonwhite_percentage*1000)/10 + "%"
  }</li>
  <li>`;
  html += `
      <li>Number of people of race: <table>`;
  race_data.forEach((race)=> {
    html += `<tr><td>${race[0]}:</td><td>${commaNumber(Math.round(race[1]))}</td></tr>`
  })
  html += "</table></li></ul>";
  return html;
}

export { hoverTemplate }