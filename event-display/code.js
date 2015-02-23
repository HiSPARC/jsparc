var width = 400,
    height = 300;
var margin = 20;

var event_display = d3.select("#event_display")
    .attr("width", width)
    .attr("height", height);

var x = d3.scale.linear()
    .range([margin, width - margin]);
var y = d3.scale.linear()
    .range([height - margin, margin]);

var c_idx = 0;
function update_event() {
    var stations = event_display.selectAll("circle")
      .data(coincidences[c_idx].events, function(d) { return d.station });

    stations.transition(500)
        .attr("r", function(d) {
            return Math.sqrt(d.n1 + d.n2 + d.n3 + d.n4) });

    stations.enter()
        .append("circle")
            .attr("cx", function(d) {
                return x(station_info[d.station][0])
            })
            .attr("cy", function(d) {
                return y(station_info[d.station][1])
            })
            .attr("r", 0)
        .transition(500)
            .attr("r", function(d) {
                return Math.sqrt(d.n1 + d.n2 + d.n3 + d.n4) });

    stations.exit().transition(500).attr("r", 0).remove();

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

    x.domain([d3.min(data, function (d) { return d[1] }),
              d3.max(data, function (d) { return d[1] })]);
    y.domain([d3.min(data, function (d) { return d[2] }),
              d3.max(data, function (d) { return d[2] })]);


    d3.json('./coincidences.json', function(error, data) {
        coincidences = data;
        update_event();
    });
});
