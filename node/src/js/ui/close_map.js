
const closeMap = (map)=> {
  document.body.classList.remove("no-scroll")
  document.querySelectorAll("#" + map.getId() + " .map-outer-lightbox")[0]
    .style.visibility = "hidden"
  //window.location.hash = "";
  history.pushState("", document.title, window.location.pathname + window.location.search);
  //var cbsa = 25540;
    //cbsa = 35620;
    //cbsa = 13820;
}

export { closeMap }