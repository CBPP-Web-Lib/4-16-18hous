var mode = "download"
var use_pop_density = "on"

if (window.location.href.indexOf("client-calc")!==-1) {
    mode = "client"
}
if (window.location.href.indexOf("pop-density")!==-1) {
    use_pop_density = "off"
}

export { mode , use_pop_density }