
var dotExplainer = require("../dotExplainer.html");
var legend_dot_svg = require("../legend_dot_svg.html");

module.exports = function($, d3, m, sel) {
  var exports = {};
  function makeGradientDef(conf, svg) {
    var defs = svg.append("defs");
    var grad = defs.append("linearGradient")
      .attr("id","legend_gradient_def");
    var min = conf[0][0];
    var max = conf[conf.length-1][0];
    grad.selectAll("stop")
      .data(conf)
      .enter()
      .append("stop")
      .attr("offset", function(d) {
        return Math.round(1000*(d[0]-min)/(max-min))/10+"%";
      })
      .attr("stop-color", function(d) {
        return "rgba(" + d[1].join(",") + ")";
      });
  }

  function makeGradientText(conf, container) {
    var max = conf.colors[conf.colors.length-1][0];
    var min = conf.colors[0][0];
    container.selectAll("div.label")
      .data(conf.colors)
      .enter()
      .append("div")
      .attr("class","label")
      .style("left", function(d) {
        return 100*(d[0]-min)/(max-min) + "%";
      })
      .html(function(d, i) {
        return "<div>" + conf.labels[i] + "</div>";
      });
    
  }

  m.makeRedliningLegend = function(on) {
    function makeEntry(letter) {
      var label = $(document.createElement("div")).addClass("redliningLabel");
      var box = $(document.createElement("div")).addClass("redliningBox");
      label.text({
        "A":"Best",
        "B":"Still desireable",
        "C":"Declining",
        "D":"Hazardous"
      }[letter]);
      box.css("border","2px solid " + m.redlining_colors[letter]);
      var r = $(document.createElement("div")).addClass("entry");
      r.append(box, label);
      return r;
    }
    var wrap = $(sel).find(".redliningLegend").empty();
    if (typeof(m.active_cbsa)==="undefined" || m.acitve_cbsa===null) {
      return;
    }
  
    var checkboxWrap = $(document.createElement("div")).addClass("checkboxWrap");
    var checkbox = $(document.createElement("input")).attr("type","checkbox")
      .prop("checked",on);
    var checkboxLabel = $(document.createElement("div")).addClass("checkboxLabel")
      .text("Show 1930s HOLC Neighborhood Risk Assessment Grades");
    checkboxWrap.append(checkbox, checkboxLabel);
    wrap.append(checkboxWrap);
    var entryWrap = $(document.createElement("div")).addClass("entries");
    var grades = ["A","B","C","D"];
    for (var i = 0, ii = grades.length; i<ii; i++) {
      entryWrap.append(makeEntry(grades[i]));
    }
    wrap.append(entryWrap);
  };
  m.makeDotExplainer = function(dotRepresents) {
    $(sel).find(".voucherHouseholdType").off();
    $(sel).find(".dotExplainwrap").empty();
    if (typeof(m.active_cbsa)==="undefined" || m.active_cbsa===null) return; 
    var theDotExplainer = $(document.createElement("div")).html(dotExplainer).attr("class","dotExplainer");
    $(sel).find(".dotExplainwrap").append(theDotExplainer);
    if (typeof(dotRepresents)==="undefined") {return;}
    $(sel).find(".dotExplainer").find(".dotRepresents.vouchers").html(dotRepresents.vouchers);
    $(sel).find(".dotExplainer").find(".dotRepresents.affordable_units").html(dotRepresents.affordable_units);
    $(sel).find(".dotExplainer").find(".dotRepresentsIsPlural.vouchers").html(
      dotRepresents.vouchers !== 1 ? "s" : "");
    $(sel).find(".dotExplainer").find(".dotRepresentsIsPlural.affordable_units").html(
      dotRepresents.affordable_units !== 1 ? "s" : "");
    $(sel).find(".legend_dot_svg_ex").html(legend_dot_svg);
    if (m.dataset==="nonwhite") {
      theDotExplainer.addClass("shrunk");
    } 

    $(sel).find(".voucherHouseholdType").on("change", function() {
      m.updateVoucherHouseholdType();
      m.checked_dots = m.getCheckedDots();
      m.updateDrawData();
    }); 
    if (typeof(m.voucherHouseholdType)!=="undefined") {
      $(sel).find("select.voucherHouseholdType").val(m.voucherHouseholdType);
    }
    m.updateVoucherHouseholdType();
    d3.select(sel).select(".legend_dot_svg_ex.vouchers svg").select("circle").attr("fill","#EB9123")
      .attr("stroke","#333333");
    d3.select(sel).select(".legend_dot_svg_ex.affordable_units svg").select("circle").attr("fill","#ffffff")
      .attr("stroke","#B9292F");
  };

  m.makeLegend = function() {
    function makeEntry(bin, final) {
      if (typeof(final)==="undefined") {
        final = false;
      }
      var label = $(document.createElement("div")).addClass("legendBinLabel");
      if (m.gradientConfig[m.dataset].binLabel==="central") {
        label.addClass("central");
      }
      var labelInner = $(document.createElement("div"));
      labelInner.html(bin.label);
      label.append(labelInner);
      var r = $(document.createElement("div")).addClass("entry");
      if (!final) {
        var box = $(document.createElement("div")).addClass("legendBinBox");
        box.css("background-color",bin.color);
        box.css("width",
          Math.round(1000/(m.gradientConfig[m.dataset].bins.length - (m.gradientConfig[m.dataset].binLabel!=="central" ? 1 : 0))
        )/10+"%");
        r.append(box, label);
      } else {
        r.append(label);
      }
      return r;
    }
    $(sel).find(".legendwrap").empty();
    var gradientwrap = $(document.createElement("div"))
      .attr("class","gradientwrap");
    var labelwrap = $(document.createElement("div"))
      .attr("class","labelwrap");
    $(sel).find(".legendwrap").append(gradientwrap);
    
    
    var titlewrap = $(document.createElement("div"));
    titlewrap.addClass("titlewrap");
    titlewrap.attr("data-dataset",m.dataset);
    titlewrap.text(m.gradientConfig[m.dataset].name);
    var i, ii;

    if (m.gradientConfig[m.dataset].bins) {
      var boxwrap = $(document.createElement("div")).addClass("boxWrap");
      for (i = 0, ii = m.gradientConfig[m.dataset].bins.length-1;i<ii;i++) {
        boxwrap.append(makeEntry(m.gradientConfig[m.dataset].bins[i]));
      }
      if (m.gradientConfig[m.dataset].binLabel!=="central") {
        boxwrap.append(makeEntry(m.gradientConfig[m.dataset].bins[i],"final"));
      } else {
        boxwrap.append(makeEntry(m.gradientConfig[m.dataset].bins[i]));
      }
      gradientwrap.append(boxwrap);
    } else {
      var legend_gradient_svg = d3.select(".gradientwrap").append("svg")
        .attr("viewBox", "0 0 100 10")
        .attr("preserveAspectRatio","none");
      gradientwrap.append(labelwrap);
      makeGradientDef(m.gradientConfig[m.dataset].colors, legend_gradient_svg);
      legend_gradient_svg.append("rect")
        .attr("x",0)
        .attr("y",0)
        .attr("width",100)
        .attr("height",10)
        .attr("opacity",0.7)
        .attr("class","legend_gradient_rect")
        .attr("stroke","none")
        .attr("fill","url(#legend_gradient_def)");
      makeGradientText(m.gradientConfig[m.dataset], d3.select(labelwrap[0]));
    }
    gradientwrap.append(titlewrap);
    if (m.dataset==="nonwhite") {
      var minorityCExp = $(document.createElement("div"))
        .addClass("minorityConcExp");
      var exp = $(document.createElement("div"))
        .html("HUD-Defined Minority-Concentrated Neighborhood")
        .addClass("exp");
      minorityCExp.append(exp);
      gradientwrap.append(minorityCExp);
    } else {
      $(sel).find(".minorityConcExp").remove();
    }
    m.makeDotExplainer(m.dotRepresents);
    var toCheck;
    for (i = 0, ii = m.checked_dots.length; i<ii; i++) {
      toCheck = m.checked_dots[i];
      if ($.inArray(m.checked_dots[i],["vouchers","with_kids","with_kids_nonwhite"])!==-1) {
        toCheck = "vouchers";
      }
      $(sel).find("input[type='checkbox'][value='"+toCheck + "']").prop("checked",true);
    }
    if (m.active_cbsa) {
      $(sel).find(".dotExplainer").append(
        "<div class='hidePopupOption'><input type='checkbox' " + (m.showTractInfo ? "checked" : "") + "/> Show neighborhood info</div>"
      );
      var stamen_credit = $(document.createElement("div"))
        .attr("class","stamen_credit")
        .html($(m.initialContents).find(".license_info"));
      $(sel).find(".dotExplainwrap").append(stamen_credit);
    }
  };

  m.showTractInfo = true;
  $(sel).on("change", ".hidePopupOption input", function() {
    m.showTractInfo = $(this).prop("checked");
  });


  
  return exports;
};