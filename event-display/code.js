"use strict";

// Fix Math.log10 support for IE
Math.log10 = Math.log10 || function(x) {
    return Math.log(x) / Math.LN10;
};

// Reload when changing cluster
window.onhashchange = function() {
    window.location.reload();
};

function get_hash() {
    return location.hash.substring(1).toLowerCase()
                   .split(' ').join('_').split('%20').join('_');
}

function set_hash() {
    location.hash = document.getElementById("cluster").value;
}

var CLUSTERS = ['network', 'aarhus', 'alphen_aan_de_rijn', 'amsterdam',
                'bath', 'birmingham', 'bristol', 'eindhoven', 'enschede',
                'groningen', 'haarlem', 'kennemerland', 'leiden',
                'middelharnis', 'nijmegen', 'science_park', 'tilburg',
                'utrecht', 'venray', 'weert', 'zaanstad', 'zwijndrecht'];

// if no cluster is selected set cluster to science park
if (location.hash === '' || CLUSTERS.indexOf(get_hash()) === -1) {
    location.hash = 'science_park';}

var SPEEDUP_FACTOR = 1;

var station_info, timestamp_start, timestamp_end;

// create map and add scale controls
var map = L.map('map');
L.control.scale().addTo(map);

// Create SVG on the map overlay pane to paint the events on
var svg = d3.select(map.getPanes().overlayPane).append("svg"),
    g = svg.append("g").attr("class", "leaflet-zoom-hide");

function x(coord) { return map.latLngToLayerPoint(coord).x; }
function y(coord) { return map.latLngToLayerPoint(coord).y; }

function update_layer_position() {
    // update layer's position to top-left of map container
    var pos = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(svg.node(), pos);

    // if you reposition the overlay, translate it with the negative offset
    // to be able to use the conversion functions.
    g.attr("transform", "translate(" + -pos.x + "," + -pos.y + ")");

    // reposition all circles
    g.selectAll("circle")
        .attr("cx", function(d) { return x(station_info[d.station]); })
        .attr("cy", function(d) { return y(station_info[d.station]); });
}

map.on('moveend', update_layer_position);

// add a legend
var legend = L.control({position: 'topright'});
legend.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'legend leaflet-bar');
    div.innerHTML = '<div id="pageHeader"></div><br>' +
                    '<i class="legend-coincidence"></i>coincidence<br>' +
                    '<i class="legend-event"></i>event';
    return div;
};

legend.addTo(map);

// add subcluster select
var legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
    var div = L.DomUtil.create('div');
    var select = '<select id="cluster" onchange="set_hash()">';
    for (var i = 0; i < CLUSTERS.length; i ++) {
        if (CLUSTERS[i] == get_hash()) {
            select += '<option selected>' + CLUSTERS[i] + '</option>';
        } else {
            select += '<option>' + CLUSTERS[i] + '</option>';
        }
    }
    select += '</select>';
    div.innerHTML = select;
    return div;
};

legend.addTo(map);

function marker_size(event, multiplier) {
    /* Calculate marker size for an event based on particle counts
    */
    var num_particles = event.n1 + event.n2 + event.n3 + event.n4,
        log_particles = Math.log10(1 + num_particles),
        size = multiplier * 20 * Math.sqrt(log_particles);
    return size;
}

function initiate_updates(dataset) {
    /* Determine initial delay for the dataset, then start updates.
    */
    if (dataset.data.length > 0) {
        // delay of first event after the start timestamp
        var delta_t = dataset.data[0].ext_timestamp - timestamp_start;
        // nanoseconds to milliseconds
        delta_t /= 1e6;
        // debug
        delta_t /= SPEEDUP_FACTOR;
        setTimeout(update, delta_t, dataset);
    }
}

function update(dataset) {
    /* Paint the current data, then progress to the next and Update the dataset
    */
    dataset.painter(dataset);
    progress(dataset);
}

function progress(dataset) {
    /* Progress the dataset by updating the index, and determine delay until next update.
    */
    var index = dataset.index,
        data = dataset.data,
        delta_t;

    index ++;
    if (index == data.length) {
        delta_t = (data[0].ext_timestamp - timestamp_start) +
                  (timestamp_end - data[data.length - 1].ext_timestamp);
        index = 0;
    } else {
        delta_t = data[index].ext_timestamp -
                  data[index - 1].ext_timestamp;
    }
    // nanoseconds to milliseconds
    delta_t /= 1e6;
    // debug
    delta_t /= SPEEDUP_FACTOR;

    // Update dataset object
    dataset.index = index;

    setTimeout(update, delta_t, dataset);
}

function paint_coincidence(coincidences) {
    /* Paint a coincidence on the map
    */
    var events = coincidences.data[coincidences.index].events;
    events.forEach(function (value) {
        value.key = 'c-' + coincidences.index + '-' + value.station; });

    var stations = g.selectAll(".coincidence")
        .data(events, function(data) { return data.key; });

    stations.enter().append("circle")
        .attr("class", "coincidence")
        .style("opacity", 0.7)
        .attr("cx", function(data) { return x(station_info[data.station]); })
        .attr("cy", function(data) { return y(station_info[data.station]); })
        .attr("r", 0)
      .transition()
        .attr("r", function(data) { return marker_size(data, 1.25); })
      .transition()
        .duration(3000)
        .style("opacity", 0)
        .remove();
}

function paint_event(events) {
    /* Paint an event on the map
    */
    var event = events.data[events.index];
    event.key = 'e-' + events.station + '-' + events.index;
    event.station = events.station;

    g.insert("circle", ":first-child").datum(event)
        .attr("class", "event")
        .style("opacity", 0.8)
        .attr("cx", function(data) { return x(station_info[data.station]); })
        .attr("cy", function(data) { return y(station_info[data.station]); })
        .attr("r", 0)
      .transition()
        .attr("r", function(data) { return marker_size(data, 1); })
      .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();
}

// Get stations for the currently selected subcluster
d3.json('./data/stations_' + get_hash() + '.json?nocache=' + Math.random(), function(error, data) {
    timestamp_start = data.limits[0];
    timestamp_end = data.limits[1];
    station_info = data.stations;
    var stations_latlon = Object.keys(station_info).map(function (key) {
        return station_info[key];
    });

    function lat(d) { return d[0]; }
    function lon(d) { return d[1]; }

    var lat_min = d3.min(stations_latlon, lat),
        lat_max = d3.max(stations_latlon, lat),
        lon_min = d3.min(stations_latlon, lon),
        lon_max = d3.max(stations_latlon, lon);

    map.fitBounds([[lat_min, lon_min], [lat_max, lon_max]]);
    L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
            attribution: '<a href="../index.html">jSparc</a>, ' +
                         '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
                         '&copy; <a href="https://cartodb.com/attributions">CartoDB</a>',
            maxZoom: 20
        }
    ).addTo(map);

    // Load coincidences data
    d3.json(
        './data/coincidences_' + get_hash() + '.json?cache=' + timestamp_start + timestamp_end,
        function(error, coincidences_data) {
            var coincidences = {
                data: coincidences_data,
                painter: paint_coincidence,
                index: 0,
            };
            initiate_updates(coincidences);
        }
    );

    // Load station data
    function load_json(station) {
        d3.json(
            './data/events_s' + station + '.json?cache=' + timestamp_start + timestamp_end,
            function(error, events_data) {
                var events = {
                    data: events_data,
                    station: station,
                    painter: paint_event,
                    index: 0,
                };
                initiate_updates(events);
            }
        );
    }

    Object.keys(station_info).forEach(load_json);
});
