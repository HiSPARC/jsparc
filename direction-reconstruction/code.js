var station_info;

var FRONT_LENGTH = 1000;
var ROTATE_LENGTH = 100;

var map = L.map('map', { scrollWheelZoom: false, zoomControl: false,
                         dragging: false });
var svg = d3.select(map.getPanes().overlayPane).append("svg"),
    g = svg.append("g").attr("class", "leaflet-zoom-hide");

var drag_core = d3.behavior.drag()
    .origin(function() {
        var fd = front.datum();
        return map.latLngToContainerPoint([fd.lat, fd.lng]); })
    .on("drag", move_core);
    // .on("dragstart", function() { map.dragging.disable(); })
    // .on("dragend", function() { map.dragging.enable(); });

var drag_alpha = d3.behavior.drag()
    .origin(function() {
        var x = front_rotate_handle.attr("cx");
        var y = front_rotate_handle.attr("cy");
        return map.layerPointToContainerPoint([x, y]); })
    .on("drag", rotate_front);
    // .on("dragstart", function() { map.dragging.disable(); })
    // .on("dragend", function() { map.dragging.enable(); });

var stations = g.selectAll('.station');
var distances = g.selectAll('.distance');
var distance_labels = g.selectAll('.distance_label');

var front = g.append("line")
    .datum({ 'lat': 0, 'lng': 0, 'alpha': Math.PI / 8 })
    .attr("id", "front");
var core = g.append("circle")
    .attr("r", 5)
    .call(drag_core);
var front_rotate_handle = g.append("circle")
    .attr("r", 7)
    .attr("fill", 'white')
    .attr("stroke", 'black')
    .call(drag_alpha);


// LDF plots
var fullwidth = 400,
    fullheight = 300;
var margin = {top: 20, right: 20, bottom: 30, left: 50};
var width = fullwidth - margin.left - margin.right,
    height = fullheight - margin.top - margin.bottom;

var key_idx = 0;

var x_scale = d3.scale.linear()
    .range([0, width])
    .domain([0, 500]);
var y_scale = d3.scale.linear()
    .range([0, height])
    .domain([0, 20]);


var ldf_svg = d3.select("#ldf").append("svg")
    .attr("width", fullwidth)
    .attr("height", fullheight)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

ldf_svg.append("rect")
    .attr("class", "data_rectangle")
    .attr("width", width)
    .attr("height", height);

var xAxis = d3.svg.axis()
    .scale(x_scale)
    .ticks(5)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y_scale)
    .ticks(5)
    .orient("left");

ldf_svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")");

ldf_svg.append("g")
    .attr("class", "y axis");


var arrival_times = ldf_svg.selectAll("circle");


function x(coord) { return map.latLngToLayerPoint(coord).x; }
function y(coord) { return map.latLngToLayerPoint(coord).y; }

function update_layer_position() {
    // update layer's position to top-left of map container
    var pos = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(svg.node(), pos);

    // if you reposition the overlay, translate it with the negative offset to
    // be able to use the conversion functions.
    g.attr("transform", "translate(" + -pos.x + "," + -pos.y + ")");

    // reposition all circles
    g.selectAll(".station")
        .each(function(d) {
          d.x = x(station_info[d.station]);
          d.y = y(station_info[d.station]);
        })
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });

    // update shower front position
    update_shower_front();
}

map.on('moveend', update_layer_position);

function marker_size(event) {
    num_particles = event.n1 + event.n2 + event.n3 + event.n4;
    log_particles = Math.log10(1 + num_particles);
    size = 10 * Math.sqrt(log_particles);
    return size;
}

function update_coincidence(coincidences) {
    var c_idx = 2;

    function update() {
        var events = coincidences[c_idx].events;
        events.forEach(function (value) {
            value.key = 'c-' + c_idx + '-' + value.station; });

        stations = g.selectAll('.station')
            .data(events, function(d) { return d.key; });

        stations
            .each(function() {
                console.warn("Updated an element."); });

        stations.enter().append("circle")
            .attr("class", "station")
            .style("opacity", 1)
            .attr("r", 0)
          .transition()
            .attr("r", function(d) { return marker_size(d); });

        distances = g.selectAll('.distance')
            .data(events, function(d) { return d.key; })
          .enter().append("line")
            .attr("class", "distance");

        distance_labels = g.selectAll('.distance_label')
            .data(events, function(d) { return d.key; })
          .enter().append("text")
            .attr("class", "distance_label");

        arrival_times = ldf_svg.selectAll("circle")
            .data(events, function(d) { return d.key; })
          .enter().append("circle")
            .attr("r", 5);

        update_layer_position();
    }

    update();
}

d3.json('./stations.json', function(error, data) {
    station_info = data;
    data = Object.keys(data).map(function (value, index, array) {
        return Array(value).concat(data[value]);
    });

    function lat(d) { return d[1]; }
    function lon(d) { return d[2]; }

    lat_min = d3.min(data, lat);
    lat_mean = d3.mean(data, lat);
    lat_max = d3.max(data, lat);
    lon_min = d3.min(data, lon);
    lon_mean = d3.mean(data, lon);
    lon_max = d3.max(data, lon);

    L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">' +
                     'OpenStreetMap</a> contributors, ' +
                     '&copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    }).addTo(map);

    map.fitBounds([[lat_min, lon_min], [lat_max, lon_max]]);

    front.datum().lat = lat_mean;
    front.datum().lng = lon_mean;

    update_shower_front();

    d3.json('./coincidences.json', function(error, data) {
        update_coincidence(data);
    });
});

function front_line_x(fd, dist) { return fd.x + dist * Math.cos(fd.alpha); }
function front_line_y(fd, dist) { return fd.y + dist * Math.sin(fd.alpha); }

function update_shower_front() {
  var fd = front.datum();

  layer_pos = map.latLngToLayerPoint([fd.lat, fd.lng]);
  fd.x = layer_pos.x;
  fd.y = layer_pos.y;

  front
      .attr("x1", front_line_x(fd, -FRONT_LENGTH))
      .attr("y1", front_line_y(fd, -FRONT_LENGTH))
      .attr("x2", front_line_x(fd, FRONT_LENGTH))
      .attr("y2", front_line_y(fd, FRONT_LENGTH));

  core.attr("cx", x([fd.lat, fd.lng]))
      .attr("cy", y([fd.lat, fd.lng]));

  front_rotate_handle
      .attr("cx", front_line_x(fd, ROTATE_LENGTH))
      .attr("cy", front_line_y(fd, ROTATE_LENGTH));

  distances.each(calculate_distances);

  distances
    .attr("x1", function(d) { return d.x; })
    .attr("y1", function(d) { return d.y; })
    .attr("x2", function(d) { return d.xp; })
    .attr("y2", function(d) { return d.yp; });

  distance_labels
    .attr("x", function(d) { return d.label_x + 5; })
    .attr("y", function(d) { return d.label_y + 5; })
    .text(function(d) { return d.dist.toFixed(); });

  arrival_times
    .attr("cx", function(d) { return x_scale(d.dist); })
    .attr("cy", function(d) { return y_scale(5); });
}

function move_core() {
  var fd = front.datum();

  container_pos = [d3.event.x, d3.event.y];
  latlng = map.containerPointToLatLng(container_pos);
  fd.lat = latlng.lat;
  fd.lng = latlng.lng;
  distances.each(calculate_distances);
  update_shower_front();
}

function calculate_distances(d) {
  var fd = front.datum();
  d.r = (d.x - fd.x) * Math.cos(fd.alpha) + (d.y - fd.y) * Math.sin(fd.alpha);
  d.xp = front_line_x(fd, d.r);
  d.yp = front_line_y(fd, d.r);
  d.dist = Math.sqrt(Math.pow(d.x - d.xp, 2) + Math.pow(d.y - d.yp, 2));
  d.label_x = (d.x + d.xp) / 2;
  d.label_y = (d.y + d.yp) / 2;
}

function rotate_front() {
  var fd = front.datum();
  var container_pos = map.latLngToContainerPoint([fd.lat, fd.lng]);
  var x0 = container_pos.x;
  var y0 = container_pos.y;
  fd.alpha = Math.atan2(d3.event.y - y0, d3.event.x - x0);
  distances.each(calculate_distances);
  update_shower_front();
}

distances.each(calculate_distances);
