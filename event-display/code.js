var station_info;
var coincidences;
var c_idx = 0;

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

function update_event() {
    var events = coincidences[c_idx].events;
    events.forEach(function (value) {
        value.key = 'c-' + c_idx + '-' + value.station; });

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

    stations.enter().append("circle")
        .attr("class", "coincidence")
        .style("opacity", 1)
        .attr("cx", function(d) { return x(station_info[d.station]) })
        .attr("cy", function(d) { return y(station_info[d.station]) })
        .attr("r", 0)
      .transition()
        .attr("r", function(d) { return marker_size(d) })
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
    L.tileLayer('http://tile.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: ('Map tiles by CartoDB, under CC BY 3.0. Data by '
                      '<a href="http://openstreetmap.org">OpenStreetMap</a>, '
                      'under ODbL'),
        maxZoom: 18
    }).addTo(map);

    d3.json('./coincidences.json', function(error, data) {
        coincidences = data;
        update_event();
    });
});
