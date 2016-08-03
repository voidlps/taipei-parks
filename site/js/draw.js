var map;
var park_layer;
var popup;
var park_info=d3.map();

function initialize() {
  prepareData('facilities');
  prepareData('plays');
  prepareData('gyms');
  initMap();
  drawParks();
}

function prepareData(type) {
  var url='data/' + type + '.json?t='+(new Date().getDate());
  d3.json(url, function (error,json) {
    var data = d3.nest()
     .key(function (d) { return d.parkname; })
     .rollup(function (leaves) { return leaves.map(function(d){return [type,d.facility_name];}); })
     .map(json.result.results);
    data.each(function(v,k) { 
      var p=park_info.get(k); 
      if (!p) p=[];
      park_info.set(k,p.concat(v));
    });
  });
}

function initMap() {
  var layers = [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    })
  ];

  map = new ol.Map({
        target: 'map_canvas',
        layers: layers,
        view: new ol.View({
          center: ol.proj.fromLonLat([121.55, 25.05]),
          zoom: 14
        })
      });
  park_layer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: []
    }),
    style: parkStyle 
  });
  map.addLayer(park_layer);

  popup = new ol.Overlay({
    element: document.getElementById('popup')
  });
  map.addOverlay(popup);

  map.on('pointermove',showlonlat);

  var select = new ol.interaction.Select({
    condition: ol.events.condition.pointerMove,
    layers: [park_layer]
  });
  select.on("select", showFacilities);
  map.addInteraction(select);
}

function showlonlat(event) {
  var lonlat=ol.proj.toLonLat(event.coordinate);
  document.getElementById('loc').innerText=lonlat[0].toFixed(5)+","+lonlat[1].toFixed(5);
}

function parkStyle(feature, resolution) {
  var parkName = feature.get('ParkName');
  var facilities = park_info.get(parkName);
  var num = facilities?facilities.length:0;
  var display= resolution<3?parkName + '(' + num + ')':num.toString();
  var style= new ol.style.Style({
    zIndex: num,
    image: new ol.style.Circle({
      fill: new ol.style.Fill({
        color: 'rgba(51,153 ,255,0.9)'
      }),
      stroke: new ol.style.Stroke({
        color: '#0000cc',
        width: 1.25
      }),
      radius: 4 + 2 * num
    }),
    text: new ol.style.Text({
      font: (12 + num).toString() + 'px helvetica,sans-serif',
      text: display,
      fill: new ol.style.Fill({
        color: '#a00020'
      }),
      stroke: new ol.style.Stroke({
        color: '#a00020',
        width: 1
      })
    })
  });
  return style;
}

function drawParks() {
  var url="data/park.json?t="+(new Date().getDate());
  d3.json(url, function (error,json) {
    var parks=json.result.results;
    var markers=[];
    parks.forEach(function(park) {
       var marker=new ol.Feature({
         geometry: new ol.geom.Point(ol.proj.fromLonLat([parseFloat(park.Longitude),parseFloat(park.Latitude)])),
         ParkName: park.ParkName,
       });
       markers.push(marker);
    });
    var layer_source=park_layer.getSource();
    layer_source.clear(true);
    layer_source.addFeatures(markers);
    layer_source.changed();
  });
}


function showFacilities(event) {
  var select=event.selected;
  if (select!=null && select.length>0) {
    var feature = select[0];
    var parkName = feature.get('ParkName');
    var facilities = park_info.get(parkName);
    if (facilities) facilities = facilities.map(function(d){return d[0]+':'+d[1]});
    var extent=feature.getGeometry().getExtent();
    var coordinate = [(extent[0] + extent[2])/2,(extent[1]+extent[3])/2];
    var lonlat=ol.proj.toLonLat(coordinate);
    $('#popup').popover('destroy');
    popup.setPosition(coordinate);
    $('#popup').popover({
      'placement': 'right',
      'animation': false,
      'html': true,
      'content': '<div style="width:250px"><h4><span class="label label-success">' +  parkName + '</span></h4>' + (facilities?facilities.join('<br/>'):'')+'</div>'
    })
    $('#popup').popover('show');
  } else {
    $('#popup').popover('destroy');
  }
}

