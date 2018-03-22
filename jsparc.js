/* About: Version

   jSparc Analysis

   About: Copyright & License

   Copyright (c) 2010 - 2011 Niek Schultheiss / HiSPARC
   jSparc is currently available for use in all personal or commercial
   projects under the GPLv3.0 license.

   For more information:
   https://github.com/HiSPARC/jsparc/blob/master/LICENSE

   Code available on https://github.com/HiSPARC/jsparc

   About: Introduction

   The function "makeShowerMap" is used to make a map with the HiSPARC
   stations and the shower core location. The shower core can be dragged
   across the map. The measured number of MIP's (minimum ionizing
   particles) of one station is used to calculate the number of MIP's of
   the other stations. When the number of measured MIP's is equal to the
   the number of calculated MIP's, a location of the shower and an
   energy of the shower have been found.

   The variable "data" is a JSON of the form:

   {timestamp: "coincidence timestamp",
    nanoseconds: "nanoseconds of coincidence timestamp",
    events: {status: "statusinformation",
             timestamp: "event timestamp",
             nanoseconds: "nanoseconds of event"
             longitude: "longitude of station",
             latitude: "latitude of station",
             altitude: "altitude of station",
             number: "numbers of station",
             pulseheights: ["the pulseheights of the trace 0/3 in ADC"],
             integrals: ["the area above the trace in ADC.sample"],
             mips: ["numper of mips for each detector"],
             traces: [["arrays of data of the traces 0/3"]]}}

   Several functions to calculate the energy of the primary particle.
   The azimuth dependency is not used!!

*/

/* global get_coincidence: true, detector_number: true, showEvent: true,  station_number: true, diagramColor: true */
"use strict";

var showerMerc, shower4326;
var map, station_layer, shower_core;
var core_distances, calculated_mips, calculated_energies;
var BASE_URL = "http://data.hisparc.nl/jsparc/";
var c = 299792458;
var result = {};

// NKG variables
var alfa = 1.2;
var eta = 3.97; // 3,97 – 1,79 * ((1 / cos θ) – 1)
var r0 = 92;

function radians(degrees) {
    // Convert degrees to radians
    return degrees * Math.PI / 180;
}

function degrees(radians) {
    // Convert radians to degrees
    return radians * 180 / Math.PI;
}

Array.max = function(array) {
    // Get the Max value in Array
    return Math.max.apply(Math, array);
};

Array.min = function(array) {
    // Get the Min value in Array
    return Math.min.apply(Math, array);
};

function toScientific(x, dx) {
    // Parse the value as scientific notation
    dx = Math.round(Math.log(x / dx) / Math.log(10));
    return parseFloat(x).toExponential(dx);
}

function detectorNumber(data) {
    // Determine number of detectors for each station
    var detectorNumbers = [];
    for(var j = 0; j < data.events.length; j++){
        detectorNumbers[j] = data.events[j].detectors;}
    return detectorNumbers;
}

function invNKG(stationIndex, distance) {
    var S = $("#MIP" + stationIndex).val();
    return S * Math.pow((distance / r0), (alfa)) *
           Math.pow((1 + (distance / r0)), (eta - alfa));
}

function NKG(k, distance) {
    return k * Math.pow((distance / r0), (-alfa)) *
           Math.pow((1 + (distance / r0)), (alfa - eta));
}

function energy(k) {
    return 2.15e17 * Math.pow(k * Math.pow((600 / r0), -alfa) *
                              Math.pow((1 + (600 / r0)), (alfa - eta)), 1.015);
}

function calculateError() {
    var chiSquared = 0;
    var delta, expected, i;
    for (i = 0; i < calculated_mips.length; i++) {
        expected = $("#calculated_mip_" + i).val();
        delta = $("#MIP" + i).val() - expected;
        chiSquared += Math.pow(delta, 2) / expected;}
    $("#energy_error").html(toScientific(chiSquared, (chiSquared / 10)));
    result.error = chiSquared;
}

function calculateEnergy() {
    /* Calculate energy
    */
    var k = invNKG(0, core_distances[0]);
    calculated_mips = [];
    for (var i = 0; i < core_distances.length; i++) {
        calculated_mips[i] = NKG(k, core_distances[i]);
        $("#calculated_mip_" + i).val(calculated_mips[i].toFixed(2));}
    var calculated_energy = energy(k);
    $("#calculated_energy").html(toScientific(calculated_energy, (calculated_energy / 10)));
    result.logEnergy = Math.log(calculated_energy) / Math.log(10);
}

function calculateDistances() {
    /* Calculate distances from shower core to stations
    */
    var station_layers = station_layer.getLayers();
    result.latitude = shower_core.getLatLng().lat;
    result.longitude = shower_core.getLatLng().lng;
    $("#core_latitude").html(result.latitude.toFixed(6));
    $("#core_longitude").html(result.longitude.toFixed(6));
    core_distances = [];
    for (var i = 0; i < station_layers.length; i++) {
        core_distances[i] = shower_core.getLatLng().distanceTo(station_layers[i].getLatLng());
        $("#core_distance_" + i).val(core_distances[i].toFixed(1));
    }
}

function initializeShowerCore(data) {
    /* Create the shower core marker
    */

    // Determine center location between the stations as initial core location
    var stations_center = {lat: 0, lng: 0};
    for (var i = 0; i < data.events.length; i++) {
        stations_center.lat += data.events[i].latitude / data.events.length;
        stations_center.lng += data.events[i].longitude / data.events.length;
    }

    var shower_icon = new L.DivIcon({
        iconSize: null,
        iconAnchor: null,
        className: 'shower_core'
    });

    shower_core = L.marker(
        stations_center,
        {icon: shower_icon,
         draggable: true,
         title:'Shower core',
         zIndexOffset: 1000}
    );
}


function initializeStationLayer(data) {
    /* Create a layer containing the station markers
    */
    station_layer = L.featureGroup();

    var event,
        station,
        station_icon,
        station_position;
    for (var i = 0; i < data.events.length; i++) {
        event = data.events[i];
        station_icon = new L.DivIcon({
            iconSize: null,
            iconAnchor: null,
            className: 'station_marker station_' + i,
            html: '<span>' + event.number + '</span>'
        });
        station_position = L.latLng(event.latitude, event.longitude);
        station = L.marker(
            station_position,
            {icon: station_icon}
        );
        station_layer.addLayer(station);
    }
}

function makeShowerMap(data) {
    /* Create the map showing the shower core and station locations
    */
    result.pk = data.pk;

    // Initialize the map
    map = createMap("map");

    initializeStationLayer(data);
    station_layer.addTo(map);

    map.fitBounds(station_layer.getBounds(), {padding: boundsPadding});

    initializeShowerCore(data);
    shower_core.addTo(map);

    calculateDistances();
    calculateEnergy();
    calculateError();

    shower_core.on(
        'drag',
        function(e) {
            calculateDistances();
            calculateEnergy();
            calculateError();
        }
    );
}

function sendResult() {
    /* Send the analysis result to the server
    */
    result.session_title = get_coincidence.session_title;
    result.session_pin = get_coincidence.session_pin;
    result.student_name = get_coincidence.student_name;
    $.getJSON(BASE_URL + 'result/', result, function(data) {
        $("#analyseTab").hide();
        window.alert(data.msg + "\nYou are number " + data.rank + ".");
        // FIXME: This 'reload' should be smarter and remember the Title and PIN (possible probably also the Student name)
        window.location.reload();
    });
}

function showEvent(station_id) {
    for (var i = 0; i < station_number; i++) {
        if (i != station_id) {
            $("#trace_" + i).hide();}}
    $("#trace_" + station_id).show();
}

function plotGraph(data) {
    var tmin = 999999999;
    var tmax = 0;
    var station_trace;
    var offset;
    var plotStyle = {
        seriesDefaults: {
            lineWidth: 1.5,
            shadow: false,
            showLine: true,
            showMarker: false,
            markerOptions: {
                show: false,
                size: 0,
                lineWidth: 0}},
        legend: {
            show: false},
        cursor: {
            tooltipLocation: 'se',
            zoom: true,
            clickReset: true},
        axesDefaults: {
            labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
            labelOptions: {
                textColor: '#222',
                enableFontSupport: true},
            tickRenderer: $.jqplot.CanvasAxisTickRenderer,
            tickOptions: {
                textColor: '#222',
                enableFontSupport: true,
                showGridline: false,
                mark: 'outside',
                markSize: 4}},
        axes: {
            xaxis: {
                numberTicks: 5,
                label: "Time [ns]"},
            yaxis: {
                numberTicks: 3,
                min: 0,
                label: "Pulseheight [ADC]"}},
        grid: {
            shadow: false,
            background: "#fff",
            gridLineWidth: 1,
            gridLineColor: "#000",
            borderWidth: 1,
            borderColor: "#000"}};

    $.jqplot.config.enablePlugins = true; // on the page before plot creation.

    // Plot the overal coincidence trace diagram
    var i, j, k;

    // find the smallest and biggest value of nanoseconds
    for (j = 0; j < data.events.length; j++) {
        offset = data.events[j].nanoseconds;
        if (tmin > offset) {
            tmin = offset;}
        if (tmax < data.events[j].traces[0].length * 2.5 + offset) {
            tmax = data.events[j].traces[0].length * 2.5 + offset;}}

    var tracedata = [],
        eventdata = [],
        trace_min = 0;

    for (j = 0; j < data.events.length; j++) {
        for (k = 0; k < detector_number[j]; k++) {
            tracedata[k] = [[(data.events[j].nanoseconds - tmin), data.events[j].traces[k][0]]];
            if (Array.min(data.events[j].traces[k]) < trace_min) {
                trace_min = Array.min(data.events[j].traces[k]);}
            for (i = 1; i < data.events[j].traces[k].length; i++) {
                tracedata[k].push([(i * 2.5 + data.events[j].nanoseconds - tmin), data.events[j].traces[k][i]]);}
            eventdata.push(tracedata[k]);}}

    var eventColors = [];

    for (j = 0; j < data.events.length; j++) {
        for (k = 0; k < detector_number[j]; k++) {
            eventColors.push(diagramColor[j]);}}

    var _eventPlotStyle = {
        seriesColors: eventColors,
        title: "Coincidence",
        axes: {
            xaxis: {
                min: 0,
                max: Math.ceil((tmax - tmin) / 40.0) * 40.0},
            yaxis: {
                min: Math.ceil(trace_min * 1.1 / 2.0) * 2.0,
                max: 0}}};

    var eventPlotStyle = $.extend(true, {}, plotStyle, _eventPlotStyle);

    $.jqplot("chartdiv", eventdata, eventPlotStyle);

    // Plot the individual station trace diagrams

    for (j = 0; j < data.events.length; j++) {

        tracedata = [];
        eventdata = [];
        trace_min = 0;
        for (k = 0; k < detector_number[j]; k++) {
            tracedata[k] = [[(data.events[j].nanoseconds - tmin), data.events[j].traces[k][0]]];
            for (i = 1; i < data.events[j].traces[k].length; i++) {
                tracedata[k].push([(i * 2.5 + data.events[j].nanoseconds - tmin), data.events[j].traces[k][i]]);}
            if (Array.min(data.events[j].traces[k]) < trace_min) {
                trace_min = Array.min(data.events[j].traces[k]);}
            eventdata.push(tracedata[k]);}

        var _tracePlotStyle = {
            seriesColors: ["#222", "#D22", "#1C2", "#1CC"],
            title: "Station " + data.events[j].number,
            axes: {
                xaxis: {
                    min: 0,
                    max: Math.ceil((data.events[j].traces[0].length * 2.5 + data.events[j].nanoseconds - tmin) / 40.0) * 40.0},
                yaxis: {
                    min: Math.ceil(trace_min * 1.1 / 2.0) * 2.0,
                    max: 0}}};

        var tracePlotStyle = $.extend(true, {}, plotStyle, _tracePlotStyle);

        station_trace = "trace_" + j;
        $('#tracegraphs').append("<div id='" + station_trace + "' class='tracegraph'></div>");
        showEvent(j);
        $.jqplot(station_trace, eventdata, tracePlotStyle);
    }

    showEvent(0);
}

function toOrthogonal(i, latitude, longitude, altitude) {
    var coordinate = {};
    var a = 6378137.000;
    var b = 6356752.315;
    coordinate.x = (b + altitude) * Math.sin(latitude);
    coordinate.y = (a + altitude) * Math.cos(latitude) * Math.sin(longitude);
    coordinate.z = (a + altitude) * Math.cos(latitude) * Math.cos(longitude);
    return coordinate;
}

function interactionTrace(data) {
    var x = [], y = [], z = [], t = [];
    var A, B, C, D, E, F, G;
    var coordinate;

    for (var i = 0; i < data.events.length; i++) {
        coordinate = toOrthogonal(i, data.events[i].longitude, data.events[i].latitude, data.events[i].altitude);
        x[i] = coordinate.x;
        y[i] = coordinate.y;
        z[i] = coordinate.z;
        t[i] = data.events[i].nanoseconds / 1e9;}
    if (i == 3) {
        A = 2 * ((x[0] - x[1]) * (y[0] - y[2]) - (x[0] - x[2]) * (y[0] - y[1]));
        B = 2 * ((x[0] - x[2]) * (z[0] - z[1]) - (x[0] - x[1]) * (z[0] - z[2]));
        C = 2 * ((x[0] - x[1]) * (t[2] - t[0]) - (x[0] - x[2]) * (t[1] - t[0])) * Math.pow(c, 2);
        D = (x[0] - x[2]) * (Math.pow(x[0] - x[1], 2) + Math.pow(y[0] - y[1], 2) + Math.pow(z[0] - z[1], 2) + Math.pow(t[0] - t[1], 2) * Math.pow(c, 2)) -
            (x[0] - x[1]) * (Math.pow(x[0] - x[2], 2) + Math.pow(y[0] - y[2], 2) + Math.pow(z[0] - z[2], 2) + Math.pow(t[0] - t[2], 2) * Math.pow(c, 2));
        E = 2 * ((y[0] - y[1]) * (z[0] - z[2]) - (y[0] - y[2]) * (z[0] - z[1]));
        F = 2 * ((y[0] - y[2]) * (t[1] - t[0]) - (y[0] - y[1]) * (t[2] - t[0])) * Math.pow(c, 2);
        G = (y[0] - x[1]) * (Math.pow(x[0] - x[2], 2) + Math.pow(y[0] - y[2], 2) + Math.pow(z[0] - z[2], 2) + Math.pow(t[0] - t[2], 2) * Math.pow(c, 2)) -
            (y[0] - y[2]) * (Math.pow(x[0] - x[1], 2) + Math.pow(y[0] - y[1], 2) + Math.pow(z[0] - z[1], 2) + Math.pow(t[0] - t[1], 2) * Math.pow(c, 2));
        var travelTime = Math.sqrt(Math.pow(x[0] - x[1], 2) + Math.pow(y[0] - y[1], 2) + Math.pow(z[0] - z[1], 2)) +
                         Math.sqrt(Math.pow(x[1] - x[2], 2) + Math.pow(y[1] - y[2], 2) + Math.pow(z[1] - z[2], 2)) +
                         Math.sqrt(Math.pow(x[0] - x[2], 2) + Math.pow(y[0] - y[2], 2) + Math.pow(z[0] - z[2], 2)) /
                         (4 * c) - t[0];
        alert(c * (travelTime + t[0]) + ", " + c * (travelTime + t[1]) + ", " + c * (travelTime + t[2]));
        var ALFA = ((travelTime + t[0]) * (B * C + E * F) + B * D + E * G) / (Math.pow(A, 2) + Math.pow(B, 2) + Math.pow(E, 2));
        var BETA = (Math.pow(D, 2) + Math.pow(G, 2) + 2 * (C * D + F * G) * (travelTime + t[0]) +
                    (C + F - Math.pow(c, 2) * Math.pow(A, 2)) * (travelTime + t[0]) * (travelTime + t[0])) /
                   (Math.pow(A, 2) + Math.pow(B, 2) + Math.pow(E, 2));

        if ((ALFA * ALFA - BETA) < 0) {
            alert("No solution, D = " + (ALFA * ALFA - BETA) + ", ALFA = " + ALFA + ", BETA = " + BETA);}
        else {
            var dz1 = -ALFA + Math.sqrt(ALFA * ALFA - BETA),
                dz2 = -ALFA - Math.sqrt(ALFA * ALFA - BETA),
                dy1 = (dz1 * B + (travelTime + t[0]) * C + D) / A,
                dy2 = (dz2 * B + (travelTime + t[0]) * C + D) / A,
                dx1 = (dz1 * E + (travelTime + t[0]) * F + G) / A,
                dx2 = (dz2 * E + (travelTime + t[0]) * F + G) / A;
            alert("(" + dx1 + ", " + dy1 + ", " + dz1 + ") and (" + dx2 + ", " + dy2 + ", " + dz2 + ")");}}
}
