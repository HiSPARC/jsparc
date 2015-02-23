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

var stations = event_display.selectAll(".station")

d3.json('./stations.json', function(error, data) {
    data = Object.keys(data).map(function (value, index, array) {
        return Array(value).concat(data[value])
    });

    x.domain([d3.min(data, function (d) { return d[1] }),
              d3.max(data, function (d) { return d[1] })]);
    y.domain([d3.min(data, function (d) { return d[2] }),
              d3.max(data, function (d) { return d[2] })]);

    stations.data(data).enter()
      .append("circle")
        .attr("r", 5)
        .attr("cx", function(d) { return x(d[1]); })
        .attr("cy", function(d) { return y(d[2]); })
});
