"use strict";

var SPEEDUP_FACTOR = 1;

var station_info, timestamp_start, timestamp_end;

var map = L.map('map');
L.control.scale().addTo(map);

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
    div.innerHTML = '<i class="legend-coincidence"></i>coincidence<br>' +
                    '<i class="legend-event"></i>event';
    return div;
};

legend.addTo(map);

function marker_size(event) {
    /* Calculate marker size for an event based on particle counts
    */
    var num_particles = event.n1 + event.n2 + event.n3 + event.n4,
        log_particles = Math.log10(1 + num_particles),
        size = 10 * Math.sqrt(log_particles);
    return size;
}

function update_coincidence(coincidences) {
    var c_idx = 0;

    function update() {
        var events = coincidences[c_idx].events;
        events.forEach(function (value) {
            value.key = 'c-' + c_idx + '-' + value.station; });

        var stations = g.selectAll(".coincidence")
            .data(events, function(d) { return d.key; });

        stations
            .each(function() {
                console.warn("Updated an element."); });

        stations.enter().append("circle")
            .attr("class", "coincidence")
            .style("opacity", 0.7)
            .attr("cx", function(d) { return x(station_info[d.station]); })
            .attr("cy", function(d) { return y(station_info[d.station]); })
            .attr("r", 0)
          .transition()
            .attr("r", function(d) { return marker_size(d); })
          .transition()
            .duration(3000)
            .style("opacity", 0)
            .remove();

        c_idx ++;
        var delta_t;
        if (c_idx == coincidences.length) {
            delta_t = (coincidences[0].ext_timestamp - timestamp_start) +
                      (timestamp_end - coincidences[coincidences.length - 1].ext_timestamp);
            c_idx = 0;
        } else {
            delta_t = coincidences[c_idx].ext_timestamp -
                      coincidences[c_idx - 1].ext_timestamp;
        }
        delta_t /= 1e6;
        // debug
        delta_t /= SPEEDUP_FACTOR;
        // console.log("delta_t: ", delta_t);
        setTimeout(update, delta_t);
    }

    if (coincidences.length > 0) {
        var delay = (coincidences[0].ext_timestamp - timestamp_start);
        delay /= 1e6;
        // debug
        delay /= SPEEDUP_FACTOR;
        setTimeout(update, delay);
    }
}

function update_event(events, station) {
    var e_idx = 0;

    function update() {
        var event = events[e_idx];
        event.key = 'e-' + station + '-' + e_idx;
        event.station = station;

        g.insert("circle", ":first-child").datum(event)
            .attr("class", "event")
            .style("opacity", 0.8)
            .attr("cx", function(d) { return x(station_info[d.station]); })
            .attr("cy", function(d) { return y(station_info[d.station]); })
            .attr("r", 0)
          .transition()
            .attr("r", function(d) { return marker_size(d); })
          .transition()
            .duration(500)
            .style("opacity", 0)
            .remove();

        e_idx ++;
        var delta_t;
        if (e_idx == events.length) {
            delta_t = (events[0].ext_timestamp - timestamp_start) +
                      (timestamp_end - events[events.length - 1].ext_timestamp);
            e_idx = 0;
        } else {
            delta_t = events[e_idx].ext_timestamp -
                      events[e_idx - 1].ext_timestamp;
        }
        delta_t /= 1e6;
        // debug
        delta_t /= SPEEDUP_FACTOR;
        // console.log("event delta_t: ", delta_t);
        setTimeout(update, delta_t);
    }

    if (events.length > 0) {
        var delay = (events[0].ext_timestamp - timestamp_start);
        delay /= 1e6;
        // debug
        delay /= SPEEDUP_FACTOR;
        setTimeout(update, delay);
    }
}

d3.json('./stations.json', function(error, data) {
    timestamp_start = data['limits'][0];
    timestamp_end = data['limits'][1];
    station_info = data['stations'];
    var values = Object.keys(station_info).map(function (key) {
        return station_info[key];
    });

    function lat(d) { return d[0]; }
    function lon(d) { return d[1]; }

    var lat_min = d3.min(values, lat),
        lat_max = d3.max(values, lat),
        lon_min = d3.min(values, lon),
        lon_max = d3.max(values, lon);

    map.fitBounds([[lat_min, lon_min], [lat_max, lon_max]]);
    L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">' +
                     'OpenStreetMap</a> contributors, ' +
                     '&copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        maxZoom: 18
    }).addTo(map);

    d3.json('./coincidences.json', function(error, data) {
        update_coincidence(data);
    });

    function load_json(station) {
        d3.json('./events-s' + station + '.json',
                function(error, data) {
                    update_event(data, station);
                });
    }

    var stations = Object.keys(station_info),
        station;
    for (var i = 0; i < stations.length; i ++) {
        station = stations[i];
        load_json(station);
    }
});
