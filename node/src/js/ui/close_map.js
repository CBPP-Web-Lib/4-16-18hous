
const closeMap = (map)=> {
  console.log(map)
  document.querySelectorAll("#" + map.getId() + " .map-outer-lightbox")[0]
    .style.visibility = "hidden"
  //var cbsa = 25540;
    //cbsa = 35620;
    //cbsa = 13820;
}

export { closeMap }