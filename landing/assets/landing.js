/* LittleRainbowRights landing — hero choropleth + stats. Self-contained. */
(function () {
  "use strict";

  var EXPLORER = "https://grimdata.org/scorecard/explorer/";

  // current year in footer
  var y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());

  function dark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function whenPlotly(cb, tries) {
    tries = tries || 0;
    if (typeof window.Plotly !== "undefined") return cb();
    if (tries > 60) return;            // ~6s
    setTimeout(function () { whenPlotly(cb, tries + 1); }, 100);
  }

  function fmt(v) { return (v === null || v === undefined) ? "—" : v; }

  // Live-first: always show the freshest grimdata.org data; fall back to the
  // bundled copy if the live fetch fails (offline / blocked).
  var LIVE = "https://grimdata.org/scorecard/data/scorecard.json";
  function loadData() {
    return fetch(LIVE)
      .then(function (r) { if (!r.ok) throw new Error("live " + r.status); return r.json(); })
      .catch(function () { return fetch("data/scorecard.json").then(function (r) { return r.json(); }); });
  }

  loadData()
    .then(function (data) {
      // stats
      var sc = document.getElementById("stat-countries");
      var si = document.getElementById("stat-indicators");
      if (sc && data.meta) sc.textContent = data.meta.country_count;
      if (si && data.meta) si.textContent = data.meta.indicators.length;

      whenPlotly(function () { renderMap(data); });
    })
    .catch(function (err) {
      console.error("landing data error:", err);
      var n = document.getElementById("hero-map");
      if (n) n.innerHTML = '<p style="text-align:center;color:#888;padding:2rem">' +
        'Map unavailable — <a href="' + EXPLORER + '">open the explorer →</a></p>';
    });

  function renderMap(data) {
    var node = document.getElementById("hero-map");
    if (!node) return;
    var rows = data.countries.filter(function (c) {
      return c.iso3 && c.protection_score !== null && c.protection_score !== undefined;
    });
    var ink = dark() ? "#ececf2" : "#15151f";

    var trace = {
      type: "choropleth",
      locationmode: "ISO-3",
      locations: rows.map(function (c) { return c.iso3; }),
      z: rows.map(function (c) { return c.protection_score; }),
      customdata: rows.map(function (c) { return c.country; }),
      text: rows.map(function (c) {
        return "<b>" + c.country + "</b><br>" + (c.region || "") +
          "<br>Protection " + fmt(c.protection_score) + "/20 · Risk " + fmt(c.risk_index) + "/100";
      }),
      hoverinfo: "text",
      colorscale: [[0, "#d64545"], [0.5, "#e8a33d"], [1, "#2e8b57"]],
      zmin: 0, zmax: 20,
      showscale: false,
      marker: { line: { color: "rgba(130,130,150,0.35)", width: 0.4 } }
    };

    var layout = {
      margin: { t: 0, r: 0, b: 0, l: 0 },
      paper_bgcolor: "rgba(0,0,0,0)",
      geo: {
        showframe: false, showcoastlines: false, showland: true,
        landcolor: dark() ? "#20202b" : "#eef0f4",
        bgcolor: "rgba(0,0,0,0)",
        projection: { type: "natural earth" }
      },
      font: { color: ink },
      dragmode: false
    };
    var config = { displayModeBar: false, responsive: true, scrollZoom: false };

    Plotly.newPlot(node, [trace], layout, config).then(function () {
      node.on("plotly_click", function () { window.location.href = EXPLORER; });
    });
  }
})();
