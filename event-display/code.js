var width = 400,
    height = 300;
var margin = 20;

var map = L.map('map');
var svg = d3.select(map.getPanes().overlayPane).append("svg"),
    g = svg.append("g").attr("class", "leaflet-zoom-hide");

function x(coord) { return map.latLngToLayerPoint(coord).x };
function y(coord) { return map.latLngToLayerPoint(coord).y };

function marker_size(event) {
    num_particles = event.n1 + event.n2 + event.n3 + event.n4;
    log_particles = Math.log10(1 + num_particles);
    size = 5 * Math.sqrt(log_particles);
    return size;
}

var c_idx = 0;
function update_event() {
    var events = coincidences[c_idx].events;
    events.forEach(function (value) { value.key = 'c-' + c_idx + '-' + value.station; });

    var stations = g.selectAll("circle")
      .data(events, function(d) { return d.key; });

    stations
        .transition()
            .style("opacity", 1)
            .attr("r", function(d) { return 10 * marker_size(d) })
            .style("fill", "blue")
        .transition()
            .duration(2000)
            .style("opacity", 0)
            .remove();

    stations.enter()
        .append("circle")
            .attr("class", "coincidence")
            .style("opacity", 1)
            .attr("cx", function(d) {
                return x(station_info[d.station])
            })
            .attr("cy", function(d) {
                return y(station_info[d.station])
            })
            .attr("r", 0)
        .transition()
            .attr("r", function(d) {
                return marker_size(d) })
        .transition()
            .duration(2000)
            .style("opacity", 0)
            .remove();

    c_idx ++;
    delta_t = coincidences[c_idx].ext_timestamp -
        coincidences[c_idx - 1].ext_timestamp;
    delta_t /= 1e6;
    // debug
    delta_t /= 10;
    console.log("delta_t: ", delta_t);
    setTimeout(update_event, delta_t);
}

var station_info;
var coincidences;
d3.json('./stations.json', function(error, data) {
    station_info = data;
    data = Object.keys(data).map(function (value, index, array) {
        return Array(value).concat(data[value])
    })

    function lat(d) { return d[1] };
    function lon(d) { return d[2] };

    lat_min = d3.min(data, lat);
    lat_max = d3.max(data, lat);
    lon_min = d3.min(data, lon);
    lon_max = d3.max(data, lon);

    map.fitBounds([[lat_min, lon_min], [lat_max, lon_max]])
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 18
}).addTo(map);

    d3.json('./coincidences.json', function(error, data) {
        coincidences = data;
        update_event();
    });
});
