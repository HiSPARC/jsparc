var SPEEDUP_FACTOR = 1;

var station_info;

var map = L.map('map');
var svg = d3.select(map.getPanes().overlayPane).append("svg"),
    g = svg.append("g").attr("class", "leaflet-zoom-hide");

function x(coord) { return map.latLngToLayerPoint(coord).x };
function y(coord) { return map.latLngToLayerPoint(coord).y };

function update_layer_position() {
    // update layer's position to top-left of map container
    var pos = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(svg.node(), pos);

    // if you reposition the overlay, translate it with the negative offset to be able to use the conversion functions.
    g.attr("transform", "translate(" + -pos.x + "," + -pos.y + ")");

    // reposition all circles
    g.selectAll("circle")
        .attr("cx", function(d) { return x(station_info[d.station]) })
        .attr("cy", function(d) { return y(station_info[d.station]) });
}

map.on('moveend', update_layer_position);

function marker_size(event) {
    num_particles = event.n1 + event.n2 + event.n3 + event.n4;
    log_particles = Math.log10(1 + num_particles);
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
                console.warn("Updated an element."); })

        stations.enter().append("circle")
            .attr("class", "coincidence")
            .style("opacity", .7)
            .attr("cx", function(d) { return x(station_info[d.station]) })
            .attr("cy", function(d) { return y(station_info[d.station]) })
            .attr("r", 0)
          .transition()
            .attr("r", function(d) { return marker_size(d) })
          .transition()
            .duration(3000)
            .style("opacity", 0)
            .remove();

        c_idx ++;
        delta_t = coincidences[c_idx].ext_timestamp -
            coincidences[c_idx - 1].ext_timestamp;
        delta_t /= 1e6;
        // debug
        delta_t /= SPEEDUP_FACTOR;
        // console.log("delta_t: ", delta_t);
        setTimeout(update, delta_t);
    }

    update();
}

function update_event(events, station) {
    var e_idx = 0;

    function update() {
        event = events[e_idx];
        event.key = 'e-' + station + '-' + e_idx;
        event.station = station;

        g.insert("circle", ":first-child").datum(event)
            .attr("class", "event")
            .style("opacity", .8)
            .attr("cx", function(d) { return x(station_info[d.station]) })
            .attr("cy", function(d) { return y(station_info[d.station]) })
            .attr("r", 0)
          .transition()
            .attr("r", function(d) { return marker_size(d) })
          .transition()
            .duration(500)
            .style("opacity", 0)
            .remove();

        e_idx ++;
        delta_t = events[e_idx].ext_timestamp -
            events[e_idx - 1].ext_timestamp;
        delta_t /= 1e6;
        // debug
        delta_t /= SPEEDUP_FACTOR;
        // console.log("event delta_t: ", delta_t);
        setTimeout(update, delta_t);
    }

    if (events.length > 0) {
        update();
    }
}

d3.json('./stations.json', function(error, data) {
    station_info = data;
    data = Object.keys(data).map(function (value, index, array) {
        return Array(value).concat(data[value])
    });

    function lat(d) { return d[1] };
    function lon(d) { return d[2] };

    lat_min = d3.min(data, lat);
    lat_max = d3.max(data, lat);
    lon_min = d3.min(data, lon);
    lon_max = d3.max(data, lon);

    map.fitBounds([[lat_min, lon_min], [lat_max, lon_max]])
    L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">' +
                     'OpenStreetMap</a> contributors, ' +
                     '&copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        maxZoom: 18
    }).addTo(map);

    d3.json('./coincidences.json', function(error, data) {
        update_coincidence(data);
    });

    stations = Object.keys(station_info);
    for (var i = 0; i < stations.length; i ++) {
        station = stations[i];

        function load_json(station) {
            d3.json('./events-s' + station + '.json',
                    function(error, data) {
                        update_event(data, station);
                    })
        }
        load_json(station);
    }
});
