
var map, featureList, boroughSearch = [], theaterSearch = [], museumSearch = [];

$(window).resize(function() {
  sizeLayerControl();
});

/*$(document).on("click", ".feature-row", function(e) {
  $(document).off("mouseout", ".feature-row", clearHighlight);
  sidebarClick(parseInt($(this).attr("id"), 10));
});*/

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
  $("#lineChartPredDiv").empty();
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

var riverColors = {'Fiume Po': "#c04c98", 'Po': "#c04c98",
                   'Adige - Etsch': "#a976c1", 'Fiume Adige': '#a976c1', 'Adige': '#a976c1',
                   'Tevere': '#bd8db4', 'Fiume Tevere': '#bd8db4',
                   'Adda': '#d4a39e', 'Fiume Adda':'#d4a39e',
                   'Oglio': '#eab982', 'Fiume Oglio': '#eab982',
                   'Tanaro': '#ffcab9', 'Fiume Tanaro': '#ffcab9',
                   'Ticino': '#fd9291', 'Fiume Ticino': '#fd9291',
                   'Arno': '#e75d6f',
                   'Piave': '#c52a52',
                   'Fiume Reno': '#93003a'}

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
var selected_name = null;

const min_year = 2011 //default year
const max_year = 2022

var plot_dict = {}
plot_dict['dis'] = {}
plot_dict['temp'] = {}
plot_dict['prec'] = {}

var truth = {}

function plot(coords, name) {
  //Show loading thing
  $("#loading").show();
  //get checkboxes
  truth['dis'] = $('#comp-dis').prop('checked');
  truth['temp'] = $('#comp-temp').prop('checked');
  truth['prec'] = $('#comp-prec').prop('checked');
  if(!truth['dis'] && !truth['temp'] && !truth['prec'])
    return;
  $('#chart-div').empty();
  $.ajax({
      type: "GET",
      url: "/plot?coords="+coords,
      dataType: "json",
      success: function(msg) {
        var years = $('#years').val().split(' - ')
        for(var val of values)
          for(var year = parseInt(years[1]); year >= parseInt(years[0]); year--)
            plotVal(name, year, val, msg[year].data)
        
        $("#loading").hide();
      },
      error: function (xhr, status, error) {
          console.log(error);
      }
  });
}



function plotVal(name, year, val, data){
  if(!data) return;
  var canvas = document.createElement("canvas");
  var div = document.createElement("div");
  div.classList = 'divLineChart';
  canvas.id = 'lineChart-'+year+'-'+val;
  plot_dict[val][year] = canvas.id;
  canvas.classList = "chart";
  div.appendChild(canvas);
  chart_div.appendChild(div);
  var ctxL = canvas.getContext('2d');
  if(!truth[val])
    $('#'+plot_dict[val][year]).hide();
  new Chart(ctxL, {
    type: 'line',
    data: {
      labels: data['months'],
      datasets: [{
        label: val + ' ' + year,
        data: data[val]['values'],
        backgroundColor: [
          hex2rgb(riverColors[name], 0.5),
        ],
        borderColor: [
          riverColors[name],
        ],
        borderWidth: 1,
        pointRadius: 0
      },{
        label: "Average",
        data: data[val]['avg'],
        backgroundColor: [
          'rgba(255, 255, 255, 0)',
        ],
        borderColor: [
          'rgba(0, 0, 0, 1)',
        ],
        borderWidth: 1,
        pointRadius: 0
      }
    ]
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
          selected_name = feature.name; 

          //selected_coords = feature.geometry.ref; 
          syncSidebar(content);
          plot(selected_coords, selected_name);
        }
      });
      
    }
  }
});

$.getJSON("static/data/points_new_fill.geojson", function (data) {
  measures.addData(data);
  map.addLayer(measuresLayer);
});

map = L.map("map", {
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

/*var attributionControl = L.control({
  position: "bottomright"
});
attributionControl.onAdd = function (map) {
  var div = L.DomUtil.create("div", "leaflet-control-attribution");
  div.innerHTML = "<span class='hidden-xs'>Developed by <a href='http://bryanmcbride.com'>bryanmcbride.com</a> | </span><a href='#' onclick='$(\"#attributionModal\").modal(\"show\"); return false;'>Attribution</a>";
  return div;
};
map.addControl(attributionControl);*/

var zoomControl = L.control.zoom({
  position: "bottomright"
}).addTo(map);

/* GPS enabled geolocation control set to follow the user's location */

/* Larger screens get expanded layer control and visible sidebar */

var baseLayers = {
  "Street Map": cartoLight,
};

var groupedOverlays = {
  "points of Interest": {
    "Measures": measuresLayer
  }
};

var layerControl = L.control.groupedLayers(baseLayers, groupedOverlays, {
  collapsed: true,
  
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
/*var container = $(".leaflet-control-layers")[0];
if (!L.Browser.touch) {
  L.DomEvent
  .disableClickPropagation(container)
  .disableScrollPropagation(container);
} else {
  L.DomEvent.disableClickPropagation(container);
}*/


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
  if(!selected_coords){
    Swal.fire({
      icon: 'info',
      text: 'Select a point',
    })
    return;
  }
  $('#chart-div-pred').empty();
  var months = $('#days').val();
  if(!months || months === '-' || months === 0)
    return;
  $('#loading').show();
  $.post('/predict/'+months+'/'+selected_coords, (msg) => {
    var canvas = document.createElement("canvas");
    var div = document.createElement("div");
    div.classList = 'divLineChart';
    div.id = 'lineChartPredDiv'
    canvas.id = 'lineChartPred';
    canvas.classList = "chart";
    div.appendChild(canvas);
    pred_div.appendChild(div);
    var ctxL = canvas.getContext('2d');
    console.log(msg.data)
    new Chart(ctxL, {
      type: 'line',
      data: {
        labels: msg.data['months'],
        datasets: [{
          label: 'predicted discharge',
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
    $("#loading").hide();
  })
})

$('#pred_live').click( () => {
  if(!selected_coords){
    Swal.fire({
      icon: 'info',
      text: 'Select a point',
    })
    return;
  }
  Swal.fire({
    icon: 'info',
    text: 'This operation may take time',
  })
  $('#chart-div-pred').empty();
  var months = $('#days').val();
  if(!months || months === '-' || months === 0)
    return;
  $('#loading').show();
  $.post('/predict_live/'+months+'/'+selected_coords, (msg) => {
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
        labels: msg.data['months'],
        datasets: [{
          label: 'predicted discharge',
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
        responsive: true
      }
    });
    $("#loading").hide();
  })
})


/*CHECKBOXES*/

$('#comp-dis').click(() => visibilityPlot($('#comp-dis').prop('checked'), 'dis'));
$('#comp-temp').click(() => visibilityPlot($('#comp-temp').prop('checked'), 'temp'));
$('#comp-prec').click(() => visibilityPlot($('#comp-prec').prop('checked'), 'prec'));

function visibilityPlot(t, val){
  var years = $('#years').val().split(' - ');
  truth[val] = t;
  if(t)
    for(var year = parseInt(years[0]); year <= parseInt(years[1]); year++)
      $('#'+plot_dict[val][year]).show();
  else
    for(year in plot_dict[val])
      $('#'+plot_dict[val][year]).hide();
  window.dispatchEvent(new Event('resize'));
}

/*RANGES*/

$( function() {
  $( "#slider-range" ).slider({
    range: true,
    min: min_year,
    max: max_year,
    values: [ min_year, max_year-1 ],
    slide: function( event, ui ) {
      $("#years").val(ui.values[ 0 ] + " - " + ui.values[ 1 ]);
    }
  });
  $("#years").val($( "#slider-range" ).slider( "values", 0 ) +
    " - " + $( "#slider-range" ).slider( "values", 1 ) );
} );


$(function() {
  $("#slider-range-min").slider({
    range: "min",
    value: 6,
    min: 1,
    max: 12,
    slide: function( event, ui ) {
      $( "#days" ).val(ui.value );
    }
  });
  $( "#days" ).val($( "#slider-range-min" ).slider( "value" ) );
});


function slider(){
  var years = $('#years').val().split(' - ')
  for(var year = min_year; year < parseInt(years[0]); year++)
    for(var val of values)
        $('#'+plot_dict[val][year]).hide();

  for(var year = max_year; year > parseInt(years[1]); year--)
    for(var val of values)
        $('#'+plot_dict[val][year]).hide();

  for(var year = parseInt(years[0]); year <= parseInt(years[1]); year++)
    for(var val of values)
      if(truth[val])
        $('#'+plot_dict[val][year]).show();
  window.dispatchEvent(new Event('resize'));
  document.removeEventListener('mouseup', slider)
}

$('#slider-range').on('mousedown', function() {
  document.addEventListener('mouseup', slider)
});