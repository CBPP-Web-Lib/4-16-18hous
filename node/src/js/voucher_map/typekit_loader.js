const load_typekit = (cb) => {
  /*typekit fonts*/
  const typekit_script = document.createElement("script")
  typekit_script.setAttribute("src", "//use.typekit.net/bwe8bid.js")
  typekit_script.setAttribute("type", "text/javascript")
  typekit_script.addEventListener("load", ()=>{
    try{Typekit.load({
      active: cb
    });}catch(e){}
  })
  document.body.appendChild(typekit_script)
}

export { load_typekit }