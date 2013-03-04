/* About: Version

   jSparc-0-4-3

   About: Copyright & License

   Copyright (c) 2010 - 2011 Niek Schultheiss / HiSPARC
   jSparc is currently available for use in all personal or commercial projects
   under both the MIT and GPL version 2.0 licenses. This means that you can
   choose the license that best suits your project and use it accordingly.

   See http://www.gnu.org/licenses/gpl-2.0.html
   and http://www.opensource.org/licenses/mit-license.php for further information.

   Code available on https://github.com/HiSPARC/jsparc

   About: Introduction

   The function "showerEnergy(data)" is used to make a map with the stations and the
   showerlocation for the HiSPARC-project. The shower can be dragged across the map.
   The measured number of MIP's (minimal ionising particles) of one station is used to
   calculate the number of MIP's of the other stations. When the number of measured
   MIP's is equal to the the number of calculated MIP's, a location of the shower and an
   energy of the shower have been found.
   The variable "data" is a JSON of the form:

   {timestamp: "coincidence timestamp",
    nanoseconds: "nanoseconds of coincidence timestamp",
    events:[status: "statusinformation",
            timestamp: "event timestamp",
            nanoseconds: "nanoseconds of event"
            lon: "longitude of station",
            lat: "latitude of station",
            alt: "altitude of station",
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
 * @param   {Number} lat1, lon1: first point in decimal degrees
 * @param   {Number} lat2, lon2: second point in decimal degrees
 * @returns (Number} distance in metres between points
 */

var c = 299792458, toRad=Math.atan(1)/45;


function distVincenty(lat1, lon1, lat2, lon2) {
    var a = 6378137, b = 6356752.314245, f = 1 / 298.257223563; // WGS-84 ellipsoid params
    var L = toRad*(lon2 - lon1);
    var U1 = Math.atan((1 - f) * Math.tan(toRad*lat1)), U2 = Math.atan((1 - f) * Math.tan(toRad*lat2));
    var sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
    var sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
    var sinSigma, cosSigma, sigma, cosSqAlpha, cos2SigmaM;

    var lambda = L, lambdaP, iterLimit = 100;

    do {
        var sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
        sinSigma = Math.sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
        if (sinSigma === 0) return 0; // co-incident points
        cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
        sigma = Math.atan2(sinSigma, cosSigma);
        var sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
        cosSqAlpha = 1 - sinAlpha * sinAlpha;
        cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
        if (isNaN(cos2SigmaM)) cos2SigmaM = 0; // equatorial line: cosSqAlpha=0 (§6)
        var C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
        lambdaP = lambda;
        lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
    } while ((Math.abs(lambda - lambdaP) > 1e-12) && (--iterLimit > 0));

    if (iterLimit === 0) {
        return NaN;} // formula failed to converge

    var uSq = cosSqAlpha * (a * a - b * b) / (b * b);
    var A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq))), B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    var deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
    var s = b * A * (sigma - deltaSigma);

    s = s.toFixed(0); // round to 1m precision
    return s;

    // note: to return initial/final bearings in addition to distance, use something like:
    //  var fwdAz = Math.atan2(cosU2*sinLambda,  cosU1*sinU2-sinU1*cosU2*cosLambda);
    //  var revAz = Math.atan2(cosU1*sinLambda, -sinU1*cosU2+cosU1*sinU2*cosLambda);

    //  return {distance:s;initialBearing:(fwdAz/toRad);finalBearing:(revAz/toRad)};
}

/* End of Vincenty Inverse Solution of Geodesics on the Ellipsoid (c) Chris Veness 2002-2010       */
/* Code clean up by N.G.Schultheiss using http://jslint.com/                                       */

var showerMerc, shower4326, PI = 4 * Math.atan(1), OpenLayers, r0 = 92, alfa = 1.2, eta = 3.97; //3,97 – 1,79⋅((1/cos θ) – 1)
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
    return detectorNumbers
}

function toScient(x, dx) {
    dx = Math.round(Math.log(x / dx) / Math.log(10));
    return parseFloat(x).toExponential(dx);
}

function invNKG(shower4326, stationIndex, data, htmlInfo) {
    var S = $("#" + htmlInfo.mipId + stationIndex).val(), r;
    if (data.events[stationIndex].lat !== "") {
        r = distVincenty(shower4326.y, shower4326.x, data.events[stationIndex].lat, data.events[stationIndex].lon);}
    return S * Math.pow((r / r0), (alfa)) * Math.pow((1 + (r / r0)), (eta - alfa));
}

function invAgase(shower4326, stationIndex, data, htmlInfo) {
    var S = $("#" + htmlInfo.mipId+ stationIndex).val(), r;
    if (data.events[stationIndex].lat !== "") {
        r = distVincenty(shower4326.y, shower4326.x, data.events[stationIndex].lat, data.events[stationIndex].lon);}
    return S * Math.pow((r / r0), (-1.2)) * Math.pow((1 + (r / r0)), (-2.64)) * Math.pow((1 + r * r / 1000000), (-0.6));
}

function NKG(pMerc, k, stationIndex, data) {
    var p4326 = (pMerc), r = distVincenty(p4326.y, p4326.x, data.events[stationIndex].lat, data.events[stationIndex].lon);
    return k * Math.pow((r / r0), (-alfa)) * Math.pow((1 + (r / r0)), (alfa - eta));
}

function agase(pMerc, k, stationIndex, data) {
    var p4326 = (pMerc), r = distVincenty(p4326.y, p4326.x, data.events[i].lat, data.events[i].lon);
    return k * Math.pow((r / r0), (1.2)) * Math.pow((1 + (r / r0)), (2.64)) * Math.pow((1 + r * r / 1000000), (0.6));
}

function energy(k) {
    return 2.15e17 * Math.pow((k * Math.pow((600 / r0), (-alfa)) * Math.pow((1 + (600 / r0)), (alfa - eta))), 1.015);
}

function calcDev(measurement, calculation){
    var deviation=0;
    var delta
    for (i = 0; i < measurement.length; i++) {
        delta = measurement[i]-calculation[i];
        deviation += delta * delta;
    }
    return Math.sqrt(deviation / measurement.length);
}

function calcChiSq(measurement, calculation){
    var chiSq = 0, delta;
    for (i = 0; i < measurement.length; i++) {
        if(measurement[i] != 0){
        delta = measurement[i]-calculation[i];
        chiSq += delta * delta / measurement[i];}
    }
    return chiSq;
}

function calcError(htmlInfo, data) {
    var chiSq = 0, delta, measurement = new Array, calculation = new Array;
    for (i = 0; i < data.events.length; i++) {
        measurement[i] = $("#" + htmlInfo.mipId + i).val();
        calculation[i] = $("#" + htmlInfo.mipCalcId + i).val();
    }
    chiSq = calcChiSq(measurement, calculation);
    $("#" + htmlInfo.stationEr).val(chiSq.toFixed(4));
    result.error = chiSq;
/*    for (j = 0; j < 4; j++) {
        for (i = 0; i < data.events.length; i++) {
            if ($("#" + htmlInfo.mipId + i + j).val() === "no data") {
                delta = 0;}
            else {
                delta = $("#" + htmlInfo.mipId + i + j).val();}
            delta = delta - $("#" + htmlInfo.mipCalcId + i).val();
            chiSq += delta * delta / $("#" + htmlInfo.mipCalcId + i).val();}}
    $("#" + htmlInfo.showerEr).val(chiSq.toFixed(4));*/
}

function calcEnergy(htmlInfo, showerMerc, data) {
    var k = invNKG(showerMerc, 0, data, htmlInfo), mipData = new Array();
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
    result.lon = p4326.x;
    result.lat = p4326.y;
    calcEnergy(htmlInfo, p4326, data);
    for (i = 0; i < data.events.length; i++) {
        $("#" + htmlInfo.distId + i).val(distVincenty(p4326.y, p4326.x, data.events[i].lat, data.events[i].lon));}
}


function makeShowerMap(htmlInfo, data) { //htmlInfo and data are JSON's!
    var mapData = {lon: 0, lat: 0, xmin: 90, ymin: 180, xmax: -90, ymax: -180};
    result.pk = data.pk;
    for (i = 0; i < data.events.length; i++) {
        mapData.lon += data.events[i].lon;
        mapData.lat += data.events[i].lat;
        if (mapData.xmax < data.events[i].lon) {mapData.xmax = data.events[i].lon;}
        if (mapData.xmin > data.events[i].lon) {mapData.xmin = data.events[i].lon;}
        if (mapData.ymax < data.events[i].lat) {mapData.ymax = data.events[i].lat;}
        if (mapData.ymin > data.events[i].lat) {mapData.ymin = data.events[i].lat;}}
    var shower = {x:(mapData.lon / data.events.length),y:(mapData.lat / data.events.length)}

    var options = {
        controls: [
            new OpenLayers.Control.Navigation(
                    {dragPanOptions: {enableKinetic: true}}),
            new OpenLayers.Control.Attribution(),
            new OpenLayers.Control.ScaleLine()]};
    var map = new OpenLayers.Map(htmlInfo.mapId, options), mapLayer = new OpenLayers.Layer.OSM();
    map.addLayer(mapLayer);
    map.setCenter(new OpenLayers.LonLat(4.950, 52.355).transform(proj4326, projmerc), 5); //shows the map

    var showerLayer = new OpenLayers.Layer.Vector("Shower"); //makes a vectorlayer for the shower
    showerMerc = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(shower.x, shower.y).transform(proj4326, projmerc),
            {some: 'data'},
            {externalGraphic: 'images/shower.png',
             graphicHeight: 66,
             graphicWidth: 66,
             graphicYOffset: -33});
    showerLayer.addFeatures(showerMerc); // puts the instance in the layer
    map.addLayer(showerLayer); // puts the layer on the map

    var stationLayer = new OpenLayers.Layer.Vector("Stations"); //makes a vectorlayer for the stations
    for (i = 0; i < data.events.length; i++) {
        station = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(data.events[i].lon, data.events[i].lat).transform(proj4326, projmerc),
                {some: 'data'},
                {externalGraphic: 'images/marker' + i + '.png',
                 graphicHeight: 25,
                 graphicWidth: 35,
                 graphicYOffset: -25,
                 label: data.events[i].number.toString(),
                 labelYOffset: 17,
                 fontColor: ((i < 2) ? '#ddf' : '#333')});
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

    return shower;
}

function plotGraph(htmlInfo, data) {
    var tmin = 999999999, tmax = 0, diagramID, offset;
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

    var tracedata = [], eventdata = [], trace_min = 0;

    for (j = 0; j < data.events.length; j++) {
        for (k = 0; k < detNum[j]; k++) {
            tracedata[k] = [[(data.events[j].nanoseconds - tmin), data.events[j].traces[k][0]]];
            if (Array.min(data.events[j].traces[k]) < trace_min) {
                trace_min = Array.min(data.events[j].traces[k]);}
            for (i = 1; i < data.events[j].traces[k].length; i++) {
                tracedata[k].push([(i * 2.5 + data.events[j].nanoseconds - tmin), data.events[j].traces[k][i]]);}
            eventdata.push(tracedata[k]);}}

    var eventColors = [];
    var _eventColors = ["#600", "#f00", "#f90", "#ff0", "#6f0", "#6ff", "#f0f", "#ccc"]
    
    for (j = 0; j < data.events.length; j++) {
        for (k = 0; k < detNum[j]; k++) {
            eventColors.push(_eventColors[j])}}
    
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
        var trace_min = 0;
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

function toZenith(RA,Dec,Lon,Lat,ST){
    var sinDec = Math.sin(Dec * toRad), cosDec = Math.cos(Dec * toRad), sinLat = Math.sin(Lat * toRad), cosLat = Math.cos(Lat * toRad);
    var ha = ST - Lon - RA, cosZenith = (sinDec * sinLat + cosDec * cosLat * Math.cos(ha * toRad)).toFixed(4);
    var zenith = Math.acos(cosZenith) / toRad, azimuth;
    if (cosLat * Math.sin(zenith * toRad).toFixed(4) == 0) {azimuth = 0;}
    else {azimuth = (Math.acos((sinDec - sinLat * cosZenith) / (cosLat * Math.sin(zenith * toRad)))).toFixed(4) / toRad;}
    if (Math.sin(ha*toRad) > 0) {azimuth = 360 - azimuth;}
    var out = {"zenith":zenith.toFixed(4), "azimuth":azimuth.toFixed(4)};
    return out
}

function zenithData(data, star) {
    var x, y, r, mapData = {lon: 0, lat: 0};
    for (i = 0; i < data.events.length; i++) {
        mapData.lon += data.events[i].lon;
        mapData.lat += data.events[i].lat;}
    var Lon = mapData.lon / data.events.length, Lat = mapData.lat / data.events.length, ST = 0;
    for (i = 0; i < star.length; i++){
       for(j = 0; j < star[i].length; j++){
           var netCoordInput = toZenith(star[i][j][0], star[i][j][1], Lon, Lat, (data.events[0].timestamp / 86400 - 10957));
           star[i][j][1] = netCoordInput.zenith;
           star[i][j][0] = netCoordInput.azimuth;
           if(star[i][j][1] > 45) {star[i].splice(j, 1); j--;}
           else {
               r = star[i][j][1];
               x = r * Math.sin(toRad * star[i][j][0]);
               y = r * Math.cos(toRad * star[i][j][0]);
               star[i][j][0] = -x;
               star[i][j][1] = y;}}}
    return star}


function makeStarMap(htmlInfo, star) {
    var starStyle = {
        title: 'Starmap',
        seriesDefaults: {
            shadow: false,
            showLine: false,
            color: "#111",
            showMarker: true,
            markerOptions: {
                shadow: false,
                size: 6,
                style: "filledCircle",
                lineWidth: 0}},
        series: [{markerOptions: {size: 2}},
                 {markerOptions: {size: 3}},
                 {markerOptions: {size: 4}},
                 {markerOptions: {size: 5}},
                 {markerOptions: {size: 6}},
                 {markerOptions: {size: 7}},
                 {markerOptions: {size: 8}},
                 {markerOptions: {size: 9}}],
        legend: {
            show: false},
        cursor: {
            tooltipLocation: 'se',
            zoom: false},
        axesDefaults: {
            min: -60,
            max: 60,
            numberTicks: 9,
            labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
            labelOptions: {
                textColor: '#222',
                enableFontSupport: true},
            tickRenderer: $.jqplot.CanvasAxisTickRenderer,
            tickOptions: {
                textColor: '#222',
                enableFontSupport: true,
                showGridline: true,
                mark: 'outside',
                markSize: 4}},
        axes: {
            xaxis:{
                label: "delta Right Ascension [degrees]"},
            yaxis: {
                label: "delta Declination [degrees]"}},
        grid: {
            shadow: false,
            background: "#fff",
            gridLineWidth: 1,
            gridLineColor: "#ddd",
            borderWidth: 1,
            borderColor: "#000"}};

    var plot1 = $.jqplot('star-id', star, starStyle)

}

function WGS84toECEF(lat, lon, alt){
    var a=6378137, b=6356752.315;
    lon=toRad*lon;
    lat=toRad*lat;
    var x=(a+alt)*Math.cos(lat)*Math.cos(lon), y=(a+alt)*Math.cos(lat)*Math.sin(lon), z=(b+alt)*Math.sin(lat), coordinate={"x":x,"y":y,"z":z,"lat":lat};
    return coordinate;
}

function netLoc(data, height){
    var netCoord = new Array;
    for(var i = 0; i < data.events.length; i++){
        netCoord.push(WGS84toECEF(data.events[i].lat, data.events[i].lon, (data.events[i].alt+height)));
    }
    return netCoord;
}

function showerDirection(data){
    var showerDir = {}, norm, netCoord = netLoc(data, 20000);
    showerDir.x = 0;
    showerDir.y = 0;
    showerDir.z = 0;
    showerDir.lat = 0;
    for(var i = 0; i< data.events.length; i++){
        showerDir.x += eval(netCoord[i].x);
        showerDir.y += eval(netCoord[i].y);
        showerDir.z += eval(netCoord[i].z); 
        showerDir.lat += eval(netCoord[i].lat);
    }
    showerDir.x = showerDir.x / data.events.length;   
    showerDir.y = showerDir.y / data.events.length;   
    showerDir.z = showerDir.z / data.events.length;
    showerDir.lat = showerDir.lat / data.events.length;
    norm = 1/(Math.sqrt(showerDir.x*showerDir.x+showerDir.y*showerDir.y))
    showerDir.xLon = -showerDir.y*norm;
    showerDir.yLon = showerDir.x*norm;
    showerDir.zLat = Math.cos(showerDir.lat);
    showerDir.yLat = -showerDir.y*norm*Math.sin(showerDir.lat);
    showerDir.xLat = -showerDir.x*norm*Math.sin(showerDir.lat);
    return showerDir;
}

function timeCalc(htmlInfo, data, dRA, dDec){ 
    var measurement = new Array, calculation = new Array, netCoord = netLoc(data, 0), showerDir = showerDirection(data);
    var z = (showerDir.z+20000*showerDir.zLat*Math.tan(dDec*toRad)).toFixed(0);
    var y = (showerDir.y+20000*(showerDir.yLat*Math.tan(dDec*toRad)+showerDir.xLon*Math.tan(dRA*toRad))).toFixed(0);
    var x = (showerDir.x+20000*(showerDir.xLat*Math.tan(dDec*toRad)+showerDir.yLon*Math.tan(dRA*toRad))).toFixed(0);
    var dx = x-netCoord[0].x, dy = y-netCoord[0].y, dz = z-netCoord[0].z, time = Math.sqrt(dx*dx+dy*dy+dz*dz)/c;
    for(var i = 0; i < netCoord.length; i++){
        dx = x-netCoord[i].x; dy = y-netCoord[i].y; dz = z-netCoord[i].z;
        measurement[i] = data.events[i].nanoseconds-data.events[0].nanoseconds;
        calculation[i] = 1e9*(Math.sqrt(dx*dx+dy*dy+dz*dz)/c-time).toFixed(9);
        $('#nanoCalc' + i).val((calculation[i]).toFixed(0));
    }
    var chiSq = calcDev(measurement, calculation);
    $('#dirEr').val(chiSq.toFixed(0));
    $('#RA').val(calculation[2]);
    $('#Dec').val(calculation[1]);
}
