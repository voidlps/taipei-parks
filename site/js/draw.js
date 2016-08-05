var map;
var park_layer;
var geolocation;
var marker_layer;
var popup;
var park_info=d3.map();
var all_facilities=d3.set();
var init_tasks=3;

function initialize() {
  prepareData('facilities');
  prepareData('plays');
  prepareData('gyms');
  register_event();
  initMap();
  drawParks();
}

function register_event() {
  $("#searchclear").on('click',function() {
    $("#searchinput").val('');
    park_layer.changed();
  });
  $("#searchinput").on('input',function() {
    park_layer.changed();
  });
}

function prepareData(type) {
  var url='data/' + type + '.json?v=1&t='+(new Date().getDate());
  d3.json(url, function (error,json) {
    var data = d3.nest()
     .key(function (d) { return d.parkname; })
     .rollup(function (leaves) { return leaves.map(function(d){return [type,d.facility_name,type+':'+d.facility_name];}); })
     .map(json.result.results);
    data.each(function(v,k) { 
      var p=park_info.get(k); 
      if (!p) p=[];
      park_info.set(k,p.concat(v));
      v.forEach(function(d){all_facilities.add(d[2]);});
    });
    d3.select('#list-facilities')
      .selectAll('li')
      .data(all_facilities.values())
      .enter().append('li')
      .text(function(d){ return d;})
      .on('click',function(d) {
         $("#searchinput").val(d);
         park_layer.changed();
       });
    init_tasks--;
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

  marker_layer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: []
    })
  });
  map.addLayer(marker_layer);

  if (ol.has.GEOLOCATION) {
    geolocation = new ol.Geolocation({
    // take the projection to use from the map's view
      projection: map.getView().getProjection(),
      tracking: true
    });
    // listen to changes in position
    geolocation.on('change', centerOnGeolocation);
  }

  popup = new ol.Overlay({
    element: document.getElementById('popup')
  });
  map.addOverlay(popup);

  map.on('pointermove',showlonlat);

  var select = new ol.interaction.Select({
    condition: ol.has.TOUCH?ol.events.condition.click:ol.events.condition.pointerMove,
    layers: [park_layer]
  });
  select.on("select", showFacilities);
  map.addInteraction(select);
}

function centerOnGeolocation(event) {
  var pos=geolocation.getPosition();
  geolocation.setTracking(false);
  map.getView().setCenter(pos);
  var marker = new ol.Feature({
    geometry: new ol.geom.Point(pos),
    name: 'geolocation'
  });
  marker.setStyle(new ol.style.Style({
    image: new ol.style.Circle({
      fill: new ol.style.Fill({
        color: 'rgba(255,80,80,0.9)'
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(255,0,0,1)',
        width: 1.25
      }),
      radius: 5 
    })
  }));
  var layer_source=marker_layer.getSource();
  layer_source.clear(true);
  layer_source.addFeature(marker);
  layer_source.changed();
}

function showlonlat(event) {
  var lonlat=ol.proj.toLonLat(event.coordinate);
  document.getElementById('loc').innerText=lonlat[0].toFixed(5)+","+lonlat[1].toFixed(5);
}

function parkStyle(feature, resolution) {
  var parkName = feature.get('ParkName');
  var facilities = park_info.get(parkName);
  var check = $("#searchinput").val();
  var hit = check && facilities && facilities.find(function(d) { return d[2].includes(check); });
  var num = facilities?facilities.length:0;
  var display= resolution<3?parkName + '(' + num + ')':num.toString();
  var style= new ol.style.Style({
    zIndex: hit?100+num:num,
    image: new ol.style.Circle({
      fill: new ol.style.Fill({
        color: hit?'rgba(51,153,255,0.9)':(check?'rgba(92,184,92,0.5)':'rgba(92,184,92,0.9)')
      }),
      stroke: new ol.style.Stroke({
        color: hit?'#cc0000':'#007000',
        width: hit?3.0:1.25
      }),
      radius: 4 + 2 * num
    }),
    text: new ol.style.Text({
      font: (12 + num).toString() + 'px helvetica,sans-serif',
      text: display,
      fill: new ol.style.Fill({
        color: 'rgba(32,64,32,0.9)'
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(12,104,12,0.9)',
        width: 1
      })
    })
  });
  var mobile_circle = new ol.style.Style({
    image: new ol.style.Circle({
      fill: new ol.style.Fill({
        color: 'rgba(0,0,0,0)'
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(0,0,0,0)',
        width: 1.25
      }),
      radius: 30
    })
  });
  return ol.has.TOUCH?[style,mobile_circle]:style;
}

function drawParks() {
  if (init_tasks) {
    setTimeout(drawParks,200);
    return;
  }
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
    var check = $("#searchinput").val();
    if (facilities) facilities = facilities.map(function(d){
      if (check && d[2].includes(check)) {
        return d[2].fontcolor("#800000");
      }
      return d[2];
    });
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

