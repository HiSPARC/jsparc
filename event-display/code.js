var width = 400,
    height = 300;
var margin = 20;

var map = L.map('map');
var svg = d3.select(map.getPanes().overlayPane).append("svg"),
    g = svg.append("g").attr("class", "leaflet-zoom-hide");

var event_display = d3.select("#event_display")
    .attr("width", width)
    .attr("height", height);

var x = d3.scale.linear()
    .range([margin, width - margin]);
var y = d3.scale.linear()
    .range([height - margin, margin]);

function marker_size(event) {
    num_particles = event.n1 + event.n2 + event.n3 + event.n4;
    log_particles = Math.log10(1 + num_particles);
    size = 5 * Math.sqrt(log_particles);
    return size;
}

var c_idx = 0;
function update_event() {
    var stations = event_display.selectAll("circle")
      .data(coincidences[c_idx].events, function(d) { return d.station });

    stations
        .transition()
            .style("opacity", 1)
            .attr("r", function(d) { return marker_size(d) })
        .transition()
            .duration(2000)
            .style("opacity", 0)
            .remove();

    stations.enter()
        .append("circle")
            .style("opacity", 1)
            .attr("cx", function(d) {
                return x(station_info[d.station][1])
            })
            .attr("cy", function(d) {
                return y(station_info[d.station][0])
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

    lat = function (d) { return d[1] };
    lon = function (d) { return d[2] };
    lat_min = d3.min(data, lat);
    lat_max = d3.max(data, lat);
    lon_min = d3.min(data, lon);
    lon_max = d3.max(data, lon);

    x.domain([lon_min, lon_max]);
    y.domain([lat_min, lat_max]);

    // map.setView([51.505, -0.09], 13);
    console.log(lat_min, lat_max, lon_min, lon_max);
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
