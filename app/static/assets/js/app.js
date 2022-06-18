var map, featureList, boroughSearch = [], theaterSearch = [], museumSearch = [];

$(window).resize(function() {
  sizeLayerControl();
});

$(document).on("click", ".feature-row", function(e) {
  $(document).off("mouseout", ".feature-row", clearHighlight);
  sidebarClick(parseInt($(this).attr("id"), 10));
});

if ( !("ontouchstart" in window) ) {
  $(document).on("mouseover", ".feature-row", function(e) {
    highlight.clearLayers().addLayer(L.circleMarker([$(this).attr("lat"), $(this).attr("lng")], highlightStyle));
  });
}

$(document).on("mouseout", ".feature-row", clearHighlight);

$("#about-btn").click(function() {
  $("#aboutModal").modal("show");
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#full-extent-btn").click(function() {
  map.fitBounds(boroughs.getBounds());
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#legend-btn").click(function() {
  $("#legendModal").modal("show");
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#login-btn").click(function() {
  $("#loginModal").modal("show");
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#list-btn").click(function() {
  animateSidebar();
  return false;
});

$("#nav-btn").click(function() {
  $(".navbar-collapse").collapse("toggle");
  return false;
});

$("#sidebar-toggle-btn").click(function() {
  animateSidebar();
  return false;
});

$("#sidebar-hide-btn").click(function() {
  animateSidebar();
  return false;
});

function animateSidebar() {
  $("#sidebar").animate({
    width: "toggle"
  }, 350, function() {
    map.invalidateSize();
  });
}

function sizeLayerControl() {
  $(".leaflet-control-layers").css("max-height", $("#map").height() - 50);
}

function clearHighlight() {
  highlight.clearLayers();
}


function syncSidebar(val) {
  /* Empty sidebar features */
  $("#feature-list tbody").empty();

  $("#feature-list tbody").append(val)
}

/* Basemap Layers */
var cartoLight = L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>'
});

/* Overlay Layers */
var highlight = L.geoJson(null);
var highlightStyle = {
  stroke: false,
  fillColor: "#00FFFF",
  fillOpacity: 0.7,
  radius: 10
};
/* Single marker cluster layer to hold all clusters */
var markerClusters = new L.MarkerClusterGroup({
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: true,
  zoomToBoundsOnClick: true,
  disableClusteringAtZoom: 8,
  maxClusterRadius: 60
});

function hex2rgb(colour, alpha) {
  var r,g,b;
    if ( colour.charAt(0) == '#') {
        colour = colour.substr(1);
  }

  r = colour.charAt(0) + colour.charAt(1);
  g = colour.charAt(2) + colour.charAt(3);
  b = colour.charAt(4) + colour.charAt(5);

  r = parseInt( r,16 );
  g = parseInt( g,16 );
  b = parseInt( b ,16);
  return 'rgba(' + r + ',' + g + ',' + b + ','+ alpha + ')';
}

var riverColors = {'Fiume Po': "#ff3135", 'Po': "#ff3135",
                   'Adige - Etsch': "#009b2e", 'Fiume Adige': '#009b2e', 'Adige': '#009b2e',
                   'Tevere': '#ce06cb', 'Fiume Tevere': '#ce06cb',
                   'Adda': '#fd9a00', 'Fiume Adda':'#fd9a00',
                   'Oglio': '#ffff00', 'Fiume Oglio': '#ffff00',
                   'Tanaro': '#9ace00', 'Fiume Tanaro': '#9ace00',
                   'Ticino': '#6e6e6e', 'Fiume Ticino': '#6e6e6e',
                   'Arno': '#976900',
                   'Piave': '#969696',
                   'Fiume Reno': '#0099ff'}

const nameMatch ={'Fiume Po': 'Po', 'Po': 'Po',
                  'Adige - Etsch': 'Adige', 'Fiume Adige': 'Adige', 'Adige': 'Adige',
                  'Tevere': 'Tevere', 'Fiume Tevere': 'Tevere',
                  'Adda': 'Adda', 'Fiume Adda':'Adda',
                  'Oglio': 'Oglio', 'Fiume Oglio': 'Oglio',
                  'Tanaro': 'Tanaro', 'Fiume Tanaro': 'Tanaro',
                  'Ticino': 'Ticino', 'Fiume Ticino': 'Ticino',
                  'Arno': 'Arno',
                  'Piave': 'Piave',
                  'Fiume Reno': 'Reno'
}

const values = ['dis', 'temp', 'prec'];
const chart_div = document.getElementById('chart-div')
var selected_coords = null;

function plot(coords, name) {
  var year = 2011 //default year
  var year = $('#year').val()
  $('#chart-div').empty();
  $.ajax({
      type: "GET",
      url: "/plot?coords="+coords+'&year='+year,
      dataType: "json",
      success: function(msg) {
        for(var i = 0; i < values.length; i++){ 
          var canvas = document.createElement("canvas");
          var div = document.createElement("div");
          div.classList = 'divLineChart';
          canvas.id = 'lineChart-'+year+'-'+i;
          canvas.classList = "chart";
          div.appendChild(canvas);
          chart_div.appendChild(div);
          var ctxL = canvas.getContext('2d');
          new Chart(ctxL, {
            type: 'line',
            data: {
              labels: msg.data[year]['time'],
              datasets: [{
                label: values[i] + ' ' + year,
                data: msg.data[year][values[i]],
                backgroundColor: [
                  hex2rgb(riverColors[name], 0.5),
                ],
                borderColor: [
                  riverColors[name],
                ],
                borderWidth: 1,
                pointRadius: 0
              }]
            },
            options: {
              responsive: true,
              scales: {
                xAxes: [{
                  ticks: {
                    maxTicksLimit: 4
                  }
                }]
              }
            }
          });
        }
      },
      error: function (xhr, status, error) {
          console.log(error);
      }
  });
}

var measuresLayer = L.geoJson(null);
var measures = L.geoJson(null, {
  
  pointToLayer: function (feature, latlng) {
    //console.log(invertedLatLng, feature)
    return L.circleMarker(latlng, {
      radius: 4,
      color: riverColors[feature.name],
      weight: 3,
      opacity: 0.8,
      fill: true,
      title: feature.id,
    });
  },
  onEachFeature: function (feature, layer) {
    if (feature.name) {
      var content = "<tr><th>River</th><td>" + nameMatch[feature.name] + "</td></tr>\
                     <tr><th>Coords</th><td><" + feature.geometry.coordinates[1].toFixed(3) +','+ feature.geometry.coordinates[0].toFixed(3) +"></td></tr>" ;
      layer.on({
        click: function (e) {
          selected_coords = feature.geometry.coordinates;
          syncSidebar(content);
          plot(feature.geometry.coordinates, feature.name);
        }
      });
      
    }
  }
});

$.getJSON("static/data/points_new.geojson", function (data) {
  measures.addData(data);
  map.addLayer(measuresLayer);
});

map = L.map("map", {
  //zoom: 10,
  //center: [40.702222, -73.979378],
  zoom: 8,
  center: [45.394869, 10.352758],
  layers: [cartoLight, markerClusters],//, boroughs, markerClusters, highlight],
  zoomControl: false,
  attributionControl: false
});

/* Layer control listeners that allow for a single markerClusters layer */
map.on("overlayadd", function(e) {

  if (e.layer === measuresLayer) {
    markerClusters.addLayer(measures);
  }
});

map.on("overlayremove", function(e) {
  if (e.layer === measuresLayer) {
    markerClusters.removeLayer(measures);
  }
});

/* Filter sidebar feature list to only show features in current map bounds */
map.on("moveend", function (e) {
});

/* Clear feature highlight when map is clicked */
map.on("click", function(e) {
  highlight.clearLayers();
});

/* Attribution control */
function updateAttribution(e) {
  $.each(map._layers, function(index, layer) {
    if (layer.getAttribution) {
      $("#attribution").html((layer.getAttribution()));
    }
  });
}
map.on("layeradd", updateAttribution);
map.on("layerremove", updateAttribution);

var attributionControl = L.control({
  position: "bottomright"
});
attributionControl.onAdd = function (map) {
  var div = L.DomUtil.create("div", "leaflet-control-attribution");
  div.innerHTML = "<span class='hidden-xs'>Developed by <a href='http://bryanmcbride.com'>bryanmcbride.com</a> | </span><a href='#' onclick='$(\"#attributionModal\").modal(\"show\"); return false;'>Attribution</a>";
  return div;
};
map.addControl(attributionControl);

var zoomControl = L.control.zoom({
  position: "bottomright"
}).addTo(map);

/* GPS enabled geolocation control set to follow the user's location */

/* Larger screens get expanded layer control and visible sidebar */
if (document.body.clientWidth <= 767) {
  var isCollapsed = true;
} else {
  var isCollapsed = false;
}

var baseLayers = {
  "Street Map": cartoLight,
};

var groupedOverlays = {
  "points of Interest": {
    "Measures": measuresLayer
  }
};

var layerControl = L.control.groupedLayers(baseLayers, groupedOverlays, {
  collapsed: isCollapsed
}).addTo(map);

/* Highlight search box text on click */

$("#featureModal").on("hidden.bs.modal", function (e) {
  $(document).on("mouseout", ".feature-row", clearHighlight);
});

/* Typeahead search functionality */
$(document).one("ajaxStop", function () {
  $("#loading").hide();
});

// Leaflet patch to make layer control scrollable on touch browsers
var container = $(".leaflet-control-layers")[0];
if (!L.Browser.touch) {
  L.DomEvent
  .disableClickPropagation(container)
  .disableScrollPropagation(container);
} else {
  L.DomEvent.disableClickPropagation(container);
}


const sidebar = document.getElementById('sidebar')
const resizer = document.getElementById('resize-left')

map.addEventListener('mouseup', (e) => {
  document.removeEventListener('mousemove', resize);
})

resizer.addEventListener('mousedown', function(e) {
  document.addEventListener('mousemove', resize);
})

window.addEventListener('mouseup',  (e)=>{
  document.removeEventListener('mousemove', resize);
})
document.addEventListener('mouseup',  (e)=>{
  document.removeEventListener('mousemove', resize);
})
resizer.addEventListener('mouseup',  (e)=>{
  document.removeEventListener('mousemove', resize);
})


function resize(e) {
  diff = sidebar.getBoundingClientRect().right - e.pageX
  if(diff < 300)
    diff = 300;
  sidebar.style.width = diff + 'px';
}

const pred_div = document.getElementById('chart-div-pred');

$('#days').click( () => {
    $('#days-value').innerHTML = $('#days').val();
    document.getElementById('days-value').innerHTML = $('#days').val();
})

$('#days').mousedown( () => {
  $('#days').mousemove( () => {
    $('#days-value').innerHTML = $('#days').val();
    document.getElementById('days-value').innerHTML = $('#days').val();
  })
})

$('#days').mouseup( () => {
  $('#days').off('mousemove');
})

$('#pred').click( () => {
  if(!selected_coords)
    return;
  $('#chart-div-pred').empty();
  var days = $('#days').val();
  if(!days || days === '-' || days === 0)
    return;
  $.post('/predict/'+days, (msg) => {
    var canvas = document.createElement("canvas");
    var div = document.createElement("div");
    div.classList = 'divLineChart';
    canvas.id = 'lineChartPred';
    canvas.classList = "chart";
    div.appendChild(canvas);
    pred_div.appendChild(div);
    var ctxL = canvas.getContext('2d');
    new Chart(ctxL, {
      type: 'line',
      data: {
        labels: msg.data['days'],
        datasets: [{
          label: 'prediction',
          data: msg.data['pred'],
          backgroundColor: [
            hex2rgb('#ffcc80', 0.5),
          ],
          borderColor: [
            '#ff9900',
          ],
          borderWidth: 1,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        scales: {
          xAxes: [{
            ticks: {
              maxTicksLimit: 4
            }
          }]
        }
      }
    });
  })
})