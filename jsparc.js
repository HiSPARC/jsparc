/* About: Version

   jSparc-0-4-3

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
    events:[status: "statusinformation",
            timestamp: "event timestamp",
            nanoseconds: "nanoseconds of event"
            longitude: "longitude of station",
            latitude: "latitude of station",
            altitude: "altitude of station",
            number: "numbers of station",
            pulseheights: ["the pulseheights of the trace 0/3 in mV"],
            integrals: ["the area above the trace in mVns"],
            mips: ["numper of mips for each detector"],
            traces: [["arrays of data of the traces 0/3"]]]}

   The variable "htmlInfo" contains information of the script wich calls the
   function and gives the names of input (output) instances, for intance:

   {mapId: "id of the map",
    distId: "id of the inputs for distances",
    chartId: "id for the plotted charts",
    mipId: "id for the input of the MIP-flux",
    mipCalcId: "id for the input of the calculated flux",
    energyId: "id for the input for the calculated energy",
    stationEr: "id for the error of the energy using the station averages",
    showerEr: "id for the input of the error using the detected values"};

   Several functions to calculate the energy of the primary particle.
   The azimuth dependency is not used!!

*/
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  *
 * Vincenty Inverse Solution of Geodesics on the Ellipsoid (c) Chris Veness 2002-2010             *
 * http://www.movable-type.co.uk/scripts/latlong-vincenty.html                                    *
 * from: Vincenty inverse formula - T Vincenty, "Direct and Inverse Solutions of Geodesics on the *
 *       Ellipsoid with application of nested equations", Survey Review, vol XXII no 176, 1975    *
 *       http://www.ngs.noaa.gov/PUBS_LIB/inverse.pdf                                             *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  *
 *
 *
 * Calculates geodetic distance between two points specified by latitude/longitude using
 * Vincenty inverse formula for ellipsoids
 *
 * @param   {Number} latitude1, longitude1: first point in decimal degrees
 * @param   {Number} latitude2, longitude2: second point in decimal degrees
 * @returns (Number} distance in metres between points
 */
var c = 299792458;

function toRad(x) {
    return x * Math.atan(1) / 45;
}

function toDeg(x) {
    return x * 45 / Math.atan(1);
}

function distVincenty(latitude1, longitude1, latitude2, longitude2) {
    var a = 6378137,
        b = 6356752.314245,
        f = 1 / 298.257223563; // WGS-84 ellipsoid params
    var L = toRad((longitude2 - longitude1));
    var U1 = Math.atan((1 - f) * Math.tan(toRad(latitude1)));
    var U2 = Math.atan((1 - f) * Math.tan(toRad(latitude2)));
    var sinU1 = Math.sin(U1),
        cosU1 = Math.cos(U1);
    var sinU2 = Math.sin(U2),
        cosU2 = Math.cos(U2);
    var sinSigma;
    var cosSigma;
    var sigma;
    var cosSqAlpha;
    var cos2SigmaM;

    var lambda = L,
        lambdaP, iterLimit = 100;

    do {
        var sinLambda = Math.sin(lambda),
            cosLambda = Math.cos(lambda);
        sinSigma = Math.sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
        if (sinSigma === 0) {
            return 0;
        } // co-incident points
        cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
        sigma = Math.atan2(sinSigma, cosSigma);
        var sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
        cosSqAlpha = 1 - sinAlpha * sinAlpha;
        cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
        if (isNaN(cos2SigmaM)) {
            cos2SigmaM = 0;
        } // equatorial line: cosSqAlpha=0 (§6)
        var C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
        lambdaP = lambda;
        lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
    } while ((Math.abs(lambda - lambdaP) > 1e-12) && (--iterLimit > 0));

    if (iterLimit === 0) {
        return NaN;} // formula failed to converge

    var uSq = cosSqAlpha * (a * a - b * b) / (b * b);
    var A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    var B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    var deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
    var s = b * A * (sigma - deltaSigma);

    s = s.toFixed(0); // round to 1m precision
    return s;

    // note: to return initial/final bearings in addition to distance, use something like:
    //  var fwdAz = Math.atan2(cosU2*sinLambda,  cosU1*sinU2-sinU1*cosU2*cosLambda);
    //  var revAz = Math.atan2(cosU1*sinLambda, -sinU1*cosU2+cosU1*sinU2*cosLambda);

    //  return {distance:s;initialBearing:toDeg(fwdAz);finalBearing:toDeg(revAz)};
}

/* End of Vincenty Inverse Solution of Geodesics on the Ellipsoid (c) Chris Veness 2002-2010       */
/* Code clean up by N.G.Schultheiss using http://jslint.com/                                           */

var showerMerc, shower4326;
var PI = 4 * Math.atan(1);
var OpenLayers;
var alfa = 1.2;
var eta = 3.97; //3,97 – 1,79⋅((1/cos θ) – 1)
var r0 = 92;
var result = {};
var proj4326 = new OpenLayers.Projection("EPSG:4326"); // projection according WGS 1984
var projmerc = new OpenLayers.Projection("EPSG:900913"); // projection according Mercator


Array.max = function(array) {
    // Get the Max value in Array
    return Math.max.apply(Math, array);
};

Array.min = function(array) {
    // Get the Min value in Array
    return Math.min.apply(Math, array);
};

function detectorNumber(data) {
    // Determine number of detectors for each station
    detectorNumbers = [];
    for(j=0; j < data.events.length; j++){
        detectorNumbers[j] = data.events[j].detectors;}
    return detectorNumbers;
}

function toScient(x, dx) {
    dx = Math.round(Math.log(x / dx) / Math.log(10));
    return parseFloat(x).toExponential(dx);
}

function invNKG(shower4326, stationIndex, data) {
    var S = $("#MIP" + stationIndex).val();
    var r;
    if (data.events[stationIndex].latitude !== "") {
        r = distVincenty(shower4326.y, shower4326.x, data.events[stationIndex].latitude, data.events[stationIndex].longitude);}
    return S * Math.pow((r / r0), (alfa)) * Math.pow((1 + (r / r0)), (eta - alfa));
}

function invAgase(shower4326, stationIndex, data) {
    var S = $("#MIP" + stationIndex).val();
    var r;
    if (data.events[stationIndex].latitude !== "") {
        r = distVincenty(shower4326.y, shower4326.x, data.events[stationIndex].latitude, data.events[stationIndex].longitude);}
    return S * Math.pow((r / r0), (-1.2)) * Math.pow((1 + (r / r0)), (-2.64)) * Math.pow((1 + r * r / 1000000), (-0.6));
}

function NKG(pMerc, k, stationIndex, data) {
    var p4326 = (pMerc);
    var r = distVincenty(p4326.y, p4326.x, data.events[stationIndex].latitude, data.events[stationIndex].longitude);
    return k * Math.pow((r / r0), (-alfa)) * Math.pow((1 + (r / r0)), (alfa - eta));
}

function agase(pMerc, k, stationIndex, data) {
    var p4326 = (pMerc);
    var r = distVincenty(p4326.y, p4326.x, data.events[i].latitude, data.events[i].longitude);
    return k * Math.pow((r / r0), (1.2)) * Math.pow((1 + (r / r0)), (2.64)) * Math.pow((1 + r * r / 1000000), (0.6));
}

function energy(k) {
    return 2.15e17 * Math.pow((k * Math.pow((600 / r0), (-alfa)) * Math.pow((1 + (600 / r0)), (alfa - eta))), 1.015);
}

function calcError(htmlInfo, data) {
    var chiKwad = 0;
    var delta;
    for (i = 0; i < data.events.length; i++) {
        delta = $("#" + htmlInfo.mipId + i).val() - $("#" + htmlInfo.mipCalcId + i).val();
        chiKwad += delta * delta / $("#" + htmlInfo.mipCalcId + i).val();}
    $("#" + htmlInfo.stationEr).val(chiKwad.toFixed(4));
    result.error = chiKwad;
    for (j = 0; j < 4; j++) {
        for (i = 0; i < data.events.length; i++) {
            if ($("#" + htmlInfo.mipId + i + j).val() === "no data") {
                delta = 0;}
            else {
                delta = $("#" + htmlInfo.mipId + i + j).val();}
            delta = delta - $("#" + htmlInfo.mipCalcId + i).val();
            chiKwad += delta * delta / $("#" + htmlInfo.mipCalcId + i).val();}}
    $("#" + htmlInfo.showerEr).val(chiKwad.toFixed(4));
}

function calcEnergy(htmlInfo, showerMerc, data) {
    var k = invNKG(showerMerc, 0, data);
    for (i = 0; i < data.events.length; i++) {
        $("#" + htmlInfo.mipCalcId + i).val(NKG(showerMerc, k, i, data).toFixed(3));}
    $("#" + htmlInfo.energyId).val(toScient(energy(k), (energy(k) / 100)));
    result.logEnergy = Math.log(energy(k)) / Math.log(10);
    calcError(htmlInfo, data);
}

function sendResult() {
    result.session_title = get_coincidence.session_title;
    result.session_pin = get_coincidence.session_pin;
    result.student_name = get_coincidence.student_name;
    $.getJSON(URL + 'result/', result, function(data) {
        $("#analyseTab").hide();
        window.alert(data.msg + "\nYou are number " + data.rank + ".");
        // FIXME: This 'reload' should be smarter and remember the Title and PIN (possible probably also the Student name)
        window.location.reload();
    });
}

function transPlace(pMerc) {
    var p4326 = new OpenLayers.Geometry.Point(pMerc.geometry.x, pMerc.geometry.y); // makes a temporary helppoint
    p4326.transform(projmerc, proj4326); // transforms back to WGS 1984
    return p4326;
}

function writeDist(htmlInfo, pMerc, data) {
    var p4326 = transPlace(pMerc);
    result.longitude = p4326.x;
    result.latitude = p4326.y;
    calcEnergy(htmlInfo, p4326, data);
    for (i = 0; i < data.events.length; i++) {
        $("#" + htmlInfo.distId + i).val(distVincenty(p4326.y, p4326.x, data.events[i].latitude, data.events[i].longitude));}
}

function makeShowerMap(htmlInfo, data) { //htmlInfo and data are JSON's!
    var mapData = {
        longitude: 0,
        latitude: 0,
        xmin: 90,
        ymin: 180,
        xmax: -90,
        ymax: -180};
    result.pk = data.pk;
    for (i = 0; i < data.events.length; i++) {
        mapData.longitude += data.events[i].longitude;
        mapData.latitude += data.events[i].latitude;
        if (mapData.xmax < data.events[i].longitude) {mapData.xmax = data.events[i].longitude;}
        if (mapData.xmin > data.events[i].longitude) {mapData.xmin = data.events[i].longitude;}
        if (mapData.ymax < data.events[i].latitude) {mapData.ymax = data.events[i].latitude;}
        if (mapData.ymin > data.events[i].latitude) {mapData.ymin = data.events[i].latitude;}}
    var x = mapData.longitude / data.events.length;
    var y = mapData.latitude / data.events.length;

    var options = {
        controls: [
            new OpenLayers.Control.Navigation(
                    {dragPanOptions: {enableKinetic: true}}),
            new OpenLayers.Control.Attribution(),
            new OpenLayers.Control.ScaleLine()]};
    var map = new OpenLayers.Map(htmlInfo.mapId, options);
    var mapLayer = new OpenLayers.Layer.OSM("Positron",
        ["http://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png",
         "http://b.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png",
         "http://c.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png"],
        {serverResolutions: [156543.03390625, 78271.516953125,
                             39135.7584765625, 19567.87923828125,
                             9783.939619140625, 4891.9698095703125,
                             2445.9849047851562, 1222.9924523925781,
                             611.4962261962891, 305.74811309814453,
                             152.87405654907226, 76.43702827453613,
                             38.218514137268066, 19.109257068634033,
                             9.554628534317017, 4.777314267158508,
                             2.388657133579254, 1.194328566789627,
                             0.5971642833948135],
         transitionEffect: 'resize'});
    map.addLayer(mapLayer);
    map.setCenter(new OpenLayers.LonLat(4.950, 52.355).transform(proj4326, projmerc), 5); //shows the map

    var showerLayer = new OpenLayers.Layer.Vector("Shower"); //makes a vectorlayer for the shower
    showerMerc = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(x, y).transform(proj4326, projmerc),
            {some: 'data'},
            {externalGraphic: 'images/shower.png',
             graphicHeight: 66,
             graphicWidth: 66,
             graphicYOffset: -33});
    showerLayer.addFeatures(showerMerc); // puts the instance in the layer
    map.addLayer(showerLayer); // puts the layer on the map

    var stationLayer = new OpenLayers.Layer.Vector("Stations"); //makes a vectorlayer for the stations
    for (i = 0; i < data.events.length; i++) {
        station = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(data.events[i].longitude, data.events[i].latitude).transform(proj4326, projmerc),
                {some: 'data'},
                {externalGraphic: 'images/marker' + i + '.png',
                 graphicHeight: 25,
                 graphicWidth: 35,
                 graphicYOffset: -25,
                 label: data.events[i].number.toString(),
                 labelYOffset: 17,
                 fontColor: ((i < 2) ? '#fff' : '#000')});
        stationLayer.addFeatures(station);} // puts the instance in the layer
    map.addLayer(stationLayer); // puts the "Stations" layer on the map

    //data the stations on the "Station" layer

    var bounds = stationLayer.getDataExtent();
    map.zoomToExtent(bounds);

    var dragShower = new OpenLayers.Control.DragFeature(showerLayer); // makes features in the vector-layer draggeble
    map.addControl(dragShower); // adds the control to draggeble features
    dragShower.activate(); // switches the control on
    writeDist(htmlInfo, showerMerc, data); // writes the distances to the html-form
    map.events.register("mousemove", map, function (e) {
        writeDist(htmlInfo, showerMerc, data);}); // calls writeDist() when the mouse moves
    map.events.register("touchmove", map, function (e) {
        writeDist(htmlInfo, showerMerc, data);}); // calls writeDist() when the finger moves
}

function plotGraph(htmlInfo, data) {
    var tmin = 999999999;
    var tmax = 0;
    var diagramID;
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
                max: 0,
                label: "Pulseheight [mV]"}},
        grid: {
            shadow: false,
            background: "#fff",
            gridLineWidth: 1,
            gridLineColor: "#000",
            borderWidth: 1,
            borderColor: "#000"}};

    $.jqplot.config.enablePlugins = true; // on the page before plot creation.

    // Plot the overal coincidence trace diagram

    for (j = 0; j < data.events.length; j++) { // find the smallest and biggest value of nanoseconds
        offset = data.events[j].nanoseconds;
        if (tmin > offset) {
            tmin = offset;}
        if (tmax < data.events[j].traces[0].length * 2.5 + offset) {
            tmax = data.events[j].traces[0].length * 2.5 + offset;}}

    var tracedata = [],
        eventdata = [],
        trace_min = 0;

    for (j = 0; j < data.events.length; j++) {
        for (k = 0; k < detNum[j]; k++) {
            tracedata[k] = [[(data.events[j].nanoseconds - tmin), data.events[j].traces[k][0]]];
            if (Array.min(data.events[j].traces[k]) < trace_min) {
                trace_min = Array.min(data.events[j].traces[k]);}
            for (i = 1; i < data.events[j].traces[k].length; i++) {
                tracedata[k].push([(i * 2.5 + data.events[j].nanoseconds - tmin), data.events[j].traces[k][i]]);}
            eventdata.push(tracedata[k]);}}

    var eventColors = [],
        _eventColors = ["#600", "#f00", "#f90", "#ff0", "#6f0", "#6ff", "#f0f", "#ccc"];

    for (j=0; j < data.events.length; j++) {
        for (k = 0; k < detNum[j]; k++) {
            eventColors.push(_eventColors[j]);}}

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

    $.jqplot(htmlInfo.chartId, eventdata, eventPlotStyle);

    // Plot the individual station trace diagrams

    for (j = 0; j < data.events.length; j++) {

        tracedata = [];
        eventdata = [];
        trace_min = 0;
        for (k = 0; k < detNum[j]; k++) {
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

        diagramID = htmlInfo.chartId + j;
        showEvent(j);
        $.jqplot(diagramID, eventdata, tracePlotStyle);}

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

    for (i = 0; i < data.events.length; i++) {
        coordinate = toOrthogonal(i, data.events[i].longitude, data.events[i].latitude, data.events[i].altitude);
        x[i] = coordinate.x;
        y[i] = coordinate.y;
        z[i] = coordinate.z;
        t[i] = data.events[i].nanoseconds / 1e9;}
    if (i == 3) {
        A = 2 * ((x[0] - x[1]) * (y[0] - y[2]) - (x[0] - x[2]) * (y[0] - y[1]));
        B = 2 * ((x[0] - x[2]) * (z[0] - z[1]) - (x[0] - x[1]) * (z[0] - z[2]));
        C = 2 * ((x[0] - x[1]) * (t[2] - t[0]) - (x[0] - x[2]) * (t[1] - t[0])) * c * c;
        D = (x[0] - x[2]) * ((x[0] - x[1]) * (x[0] - x[1]) + (y[0] - y[1]) * (y[0] - y[1]) + (z[0] - z[1]) * (z[0] - z[1]) + (t[0] - t[1]) * (t[0] - t[1]) * c * c);
        D = D - (x[0] - x[1]) * ((x[0] - x[2]) * (x[0] - x[2]) + (y[0] - y[2]) * (y[0] - y[2]) + (z[0] - z[2]) * (z[0] - z[2]) + (t[0] - t[2]) * (t[0] - t[2]) * c * c);
        E = 2 * ((y[0] - y[1]) * (z[0] - z[2]) - (y[0] - y[2]) * (z[0] - z[1]));
        F = 2 * ((y[0] - y[2]) * (t[1] - t[0]) - (y[0] - y[1]) * (t[2] - t[0])) * c * c;
        G = (y[0] - x[1]) * ((x[0] - x[2]) * (x[0] - x[2]) + (y[0] - y[2]) * (y[0] - y[2]) + (z[0] - z[2]) * (z[0] - z[2]) + (t[0] - t[2]) * (t[0] - t[2]) * c * c);
        G = G - (y[0] - y[2]) * ((x[0] - x[1]) * (x[0] - x[1]) + (y[0] - y[1]) * (y[0] - y[1]) + (z[0] - z[1]) * (z[0] - z[1]) + (t[0] - t[1]) * (t[0] - t[1]) * c * c);
        travelTime = Math.sqrt((x[0] - x[1]) * (x[0] - x[1]) + (y[0] - y[1]) * (y[0] - y[1]) + (z[0] - z[1]) * (z[0] - z[1]));
        travelTime = travelTime + Math.sqrt((x[1] - x[2]) * (x[1] - x[2]) + (y[1] - y[2]) * (y[1] - y[2]) + (z[1] - z[2]) * (z[1] - z[1]));
        travelTime = travelTime + Math.sqrt((x[0] - x[2]) * (x[0] - x[2]) + (y[0] - y[2]) * (y[0] - y[2]) + (z[0] - z[2]) * (z[0] - z[2]));
        travelTime = travelTime / (4 * c);
        travelTime = travelTime - t[0];
        alert(c * (travelTime + t[0]) + ", " + c * (travelTime + t[1]) + ", " + c * (travelTime + t[2]));
        ALFA = ((travelTime + t[0]) * (B * C + E * F) + B * D + E * G) / (A * A + B * B + E * E);
        BETA = (D * D + G * G + 2 * (C * D + F * G) * (travelTime + t[0]) + (C + F - c * c * A * A) * (travelTime + t[0]) * (travelTime + t[0])) / (A * A + B * B + E * E);

        if ((ALFA * ALFA - BETA) < 0) {
            alert("No solution, D = " + (ALFA * ALFA - BETA) + ", ALFA = " + ALFA + ", BETA = " + BETA);}
        else {
            dz1 = -ALFA + Math.sqrt(ALFA * ALFA - BETA);
            dz2 = -ALFA - Math.sqrt(ALFA * ALFA - BETA);
            dy1 = dz1 * B / A + (travelTime + t[0]) * C / A + D / A;
            dy2 = dz2 * B / A + (travelTime + t[0]) * C / A + D / A;
            dx1 = dz1 * E / A + (travelTime + t[0]) * F / A + G / A;
            dx2 = dz2 * E / A + (travelTime + t[0]) * F / A + G / A;
            alert("(" + dx1 + ", " + dy1 + ", " + dz1 + ") and (" + dx2 + ", " + dy2 + ", " + dz2 + ")");}}
}
