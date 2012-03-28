/* About: Version

   jSparc-0-3-1

   About: Copyright & License
   
   Copyright (c) 2010 - 2011 Niek Schultheiss / HiSPARC
   jSparc is currently available for use in all personal or commercial projects 
   under both the MIT and GPL version 2.0 licenses. This means that you can 
   choose the license that best suits your project and use it accordingly.
   
   See http://www.gnu.org/licenses/gpl-2.0.html
   and http://www.opensource.org/licenses/mit-license.php for further information. 

   About: Introduction

   The function "showerEnergy(data)" is used to make a map with the stations and the
   showerlocation for the HiSPARC-project. The shower can be dragged across the map.
   The measured number of MIP's (minimal ionising particles) of one station is used to
   calculate the number of MIP's of the other stations. When the number of measured
   MIP's is equal to the the number of calculated MIP's, a location of the shower and an
   energy of the shower have been found.
   The variable "data" is a JSON of the form:

   {timestamp:"coincidence timestamp",
    nanoseconds:"nanoseconds of coincidence timestamp",
    events:[status:"statusinformation",
            timestamp:"event timestamp",
            nanoseconds:"nanoseconds of event"
            lon:"longitude of station",
            lat:"latitude of station",
            alt:"altitude of station",
            number:"numbers of station",
            pulseheights:["the pulseheights of the trace 0/3 in mV"],
            integrals:["the area above the trace in mVns"],
            mips:["numper of mips for each detector"],
            traces:[["arrays of data of the traces 0/3"]]
           ],
   }

   The variable "htmlInfo" contains information of the script wich calls the function and gives
   the names of input (output) instances, for intance:

   {mapId:"id of the map",
    distId:"id of the inputs for distances",
    chartId:"id for the plotted charts",
    mipId:"id for the input of the MIP-flux",
    mipCalcId:"id for the input of the calculated flux",
    energyId:"id for the input for the calculated energy",
    stationEr:"id for the error of the energy using the station averages",
    showerEr:"id for the input of the error using the detected values"};

   Several functions to calculate the energie of the primary particle. The azimuth
   dependency is not used!!

*/

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Vincenty Inverse Solution of Geodesics on the Ellipsoid (c) Chris Veness 2002-2010             */
/* http://www.movable-type.co.uk/scripts/latlong-vincenty.html                                    */
/* from: Vincenty inverse formula - T Vincenty, "Direct and Inverse Solutions of Geodesics on the */
/*       Ellipsoid with application of nested equations", Survey Review, vol XXII no 176, 1975    */
/*       http://www.ngs.noaa.gov/PUBS_LIB/inverse.pdf                                             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/**
 * Calculates geodetic distance between two points specified by latitude/longitude using 
 * Vincenty inverse formula for ellipsoids
 *
 * @param   {Number} lat1, lon1: first point in decimal degrees
 * @param   {Number} lat2, lon2: second point in decimal degrees
 * @returns (Number} distance in metres between points
 */

function toRad(x){
 return x*Math.atan(1)/45;
}

function toDeg(x){
 return x*45/Math.atan(1);
}

function distVincenty(lat1, lon1, lat2, lon2) {
  var a = 6378137, b = 6356752.314245,  f = 1/298.257223563;  // WGS-84 ellipsoid params
  var L = toRad((lon2-lon1));
  var U1 = Math.atan((1-f) * Math.tan(toRad(lat1)));
  var U2 = Math.atan((1-f) * Math.tan(toRad(lat2)));
  var sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  var sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
  var sinSigma;
  var cosSigma;
  var sigma;
  var cosSqAlpha;
  var cos2SigmaM;
  
  var lambda = L, lambdaP, iterLimit = 100;
  do {
    var sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt((cosU2*sinLambda)*(cosU2*sinLambda)+(cosU1*sinU2-sinU1*cosU2*cosLambda)*(cosU1*sinU2-sinU1*cosU2*cosLambda));
    if(sinSigma===0){return 0;}  // co-incident points
    cosSigma=sinU1*sinU2+cosU1*cosU2*cosLambda;
    sigma=Math.atan2(sinSigma,cosSigma);
    var sinAlpha=cosU1*cosU2* sinLambda / sinSigma;
    cosSqAlpha=1-sinAlpha*sinAlpha;
    cos2SigmaM=cosSigma-2*sinU1*sinU2/cosSqAlpha;
    if(isNaN(cos2SigmaM)){cos2SigmaM=0;}  // equatorial line: cosSqAlpha=0 (§6)
    var C=f/16*cosSqAlpha*(4+f*(4-3*cosSqAlpha));
    lambdaP=lambda;
    lambda=L+(1-C)*f*sinAlpha*(sigma + C*sinSigma*(cos2SigmaM+C*cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)));
  } while((Math.abs(lambda-lambdaP)>1e-12)&&(--iterLimit>0));

  if (iterLimit===0){return NaN;}  // formula failed to converge

  var uSq=cosSqAlpha*(a*a-b*b)/(b*b);
  var A=1+uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq)));
  var B=uSq/1024*(256+uSq*(-128+uSq*(74-47*uSq)));
  var deltaSigma=B*sinSigma*(cos2SigmaM+B/4*(cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)-B/6*cos2SigmaM*(-3+4*sinSigma*sinSigma)*(-3+4*cos2SigmaM*cos2SigmaM)));
  var s=b*A*(sigma-deltaSigma);
  
  s=s.toFixed(0); // round to 1m precision
  return s;

// note: to return initial/final bearings in addition to distance, use something like:
//  var fwdAz = Math.atan2(cosU2*sinLambda,  cosU1*sinU2-sinU1*cosU2*cosLambda);
//  var revAz = Math.atan2(cosU1*sinLambda, -sinU1*cosU2+cosU1*sinU2*cosLambda);

//  return {distance:s;initialBearing:toDeg(fwdAz);finalBearing:toDeg(revAz)};
}

/* End of Vincenty Inverse Solution of Geodesics on the Ellipsoid (c) Chris Veness 2002-2010       */
/* Code clean up by N.G.Schultheiss using http://jslint.com/                                           */

var showerMerc, shower4326;
var PI=4*Math.atan(1);
var OpenLayers;
var diagramColor=[];
diagramColor=["#000000","#660000","#ff0000","#ff9900","#ffff00","#66ff00","#66ffff","#ff00ff","#cccccc"];
var alfa=1.2;
var eta=3.97; //3,97 – 1,79⋅((1/cos θ) – 1) 
var r0=92;
var result={};
var proj4326 = new OpenLayers.Projection("EPSG:4326"); // projection according WGS 1984
var projmerc = new OpenLayers.Projection("EPSG:900913"); // projection according Mercator
//var data;

function toScient(x,dx){
 dx=Math.round(Math.log(x/dx)/Math.log(10));
 return parseFloat(x).toExponential(dx);
}

function invNKG(shower4326,stationIndex,data){
 var S=$("#MIP"+stationIndex).val();
 var r;
 if(data.events[stationIndex].lat!==""){
  r=distVincenty(shower4326.y,shower4326.x,data.events[stationIndex].lat,data.events[stationIndex].lon);
 }
 return S*Math.pow((r/r0),(alfa))*Math.pow((1+(r/r0)),(eta-alfa));
}

function invAgase(shower4326,stationIndex,data){
 var S=$("#MIP"+stationIndex).val();
 var r;
 if(data.events[stationIndex].lat!==""){
  r=distVincenty(shower4326.y,shower4326.x,data.events[stationIndex].lat,data.events[stationIndex].lon);
 }
 return S*Math.pow((r/r0),(-1.2))*Math.pow((1+(r/r0)),(-2.64))*Math.pow((1+r*r/1000000),(-0.6));
}

function NKG(pMerc,k,stationIndex,data){
 var p4326=(pMerc);
 var r=distVincenty(p4326.y,p4326.x,data.events[i].lat,data.events[i].lon);
 return k*Math.pow((r/r0),(-alfa))*Math.pow((1+(r/r0)),(alfa-eta));
}

function agase(pMerc,k,stationIndex,data){
 var p4326=(pMerc);
 var r=distVincenty(p4326.y,p4326.x,data.events[i].lat,data.events[i].lon);
 return k*Math.pow((r/r0),(1.2))*Math.pow((1+(r/r0)),(2.64))*Math.pow((1+r*r/1000000),(0.6));
}

function energy(k){
 return 2.15e17*Math.pow((k*Math.pow((600/r0),(-alfa))*Math.pow((1+(600/r0)),(alfa-eta))),1.015);
}

function calcError(htmlInfo,data){
 var chiKwad=0;
 var delta;
 for(i=0;i<data.events.length;i++){
  delta=$("#"+htmlInfo.mipId+i).val()-$("#"+htmlInfo.mipCalcId+i).val();
  chiKwad+=delta*delta/$("#"+htmlInfo.mipCalcId+i).val();
 }
 $("#"+htmlInfo.stationEr).val(chiKwad.toFixed(4));
 result.error=chiKwad;
 for(j=0;j<4;j++){
  for(i=0;i<data.events.length;i++){
   if($("#"+htmlInfo.mipId+i+j).val()==="no data"){delta=0;}
   else{delta=$("#"+htmlInfo.mipId+i+j).val();}
   delta=delta-$("#"+htmlInfo.mipCalcId+i).val();
   chiKwad+=delta*delta/$("#"+htmlInfo.mipCalcId+i).val();
  }
 }
 $("#"+htmlInfo.showerEr).val(chiKwad.toFixed(4));
}

function calcEnergy(htmlInfo,showerMerc,data){
 var k=invNKG(showerMerc,0,data);
 for(i=0;i<data.events.length;i++){
  $("#"+htmlInfo.mipCalcId+i).val(NKG(showerMerc,k,i,data).toFixed(3));
 }
 $("#"+htmlInfo.energyId).val(toScient(energy(k),(energy(k)/100)));
 result.logEnergy=Math.log(energy(k))/Math.log(10);
 calcError(htmlInfo,data);
}

function sendResult(){
 result.session_title=get_coincidence.session_title;
 result.session_pin=get_coincidence.session_pin;
 result.student_name=get_coincidence.student_name;
 $.getJSON('http://data.hisparc.nl/django/jsparc/result/', result, function(data){
  $("#analyseTab").hide();
  window.alert("You are number "+data.rank+".");
  window.location.reload();
 });
}

function transPlace(pMerc){
 var p4326=new OpenLayers.Geometry.Point(pMerc.geometry.x,pMerc.geometry.y); // makes a temporary helppoint
 p4326.transform(projmerc, proj4326); // transforms back to WGS 1984
 return p4326;
}

function writeDist(htmlInfo,pMerc,data){
 var p4326=transPlace(pMerc);
 result.lon=p4326.x;
 result.lat=p4326.y;
 calcEnergy(htmlInfo,p4326,data);
 for(i=0;i<data.events.length;i++){
  $("#"+htmlInfo.distId+i).val(distVincenty(p4326.y,p4326.x,data.events[i].lat,data.events[i].lon));
 }
}

function makeShowerMap(htmlInfo,data){ //htmlInfo and data are JSON's!
 var mapData={lon:0,lat:0,xmin:90,ymin:180,xmax:-90,ymax:-180};
 result.pk=data.pk;
 for(i=0;i<data.events.length;i++){
  mapData.lon=mapData.lon+data.events[i].lon;
  mapData.lat=mapData.lat+data.events[i].lat;
  if(mapData.xmax<data.events[i].lon){mapData.xmax=data.events[i].lon;}
  if(mapData.xmin>data.events[i].lon){mapData.xmin=data.events[i].lon;}
  if(mapData.ymax<data.events[i].lat){mapData.ymax=data.events[i].lat;}
  if(mapData.ymin>data.events[i].lat){mapData.ymin=data.events[i].lat;}
 }
 var x=mapData.lon/data.events.length;
 var y=mapData.lat/data.events.length;
 var lonlat=new OpenLayers.LonLat(x,y);
 var zoom=18;
 var zoomLon=Math.log(360/(mapData.xmax-mapData.xmin))/Math.log(2);
 var zoomLat=Math.log(360/((mapData.ymax-mapData.ymin)*Math.cos(PI*y/180)))/Math.log(2);
 if(zoomLon>zoomLat){zoom=parseInt(zoomLat, 10);}else{zoom=parseInt(zoomLon, 10);}

 var map=new OpenLayers.Map(htmlInfo.mapId); //makes a "map"-instance
 map.addLayer(new OpenLayers.Layer.OSM()); //gets a rendered map
 map.setCenter(lonlat.transform(proj4326,projmerc),zoom); //shows the map
 map.addControl(new OpenLayers.Control.ScaleLine());

// map.addControl(new OpenLayers.Control.MousePosition()); //shows the mouse position

 var showerLayer=new OpenLayers.Layer.Vector("Shower"); //makes a vectorlayer for the shower
 showerMerc=new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(x,y).transform(proj4326,projmerc),{some:'data'},
    {externalGraphic: '../javascript/openlayers/img/shower.png',graphicHeight:50,graphicWidth:50,graphicYOffset:-25});
 //makes a "showerMerc"-instance
 showerLayer.addFeatures(showerMerc); // puts the instance in the layer
 map.addLayer(showerLayer); // puts the layer on the map

 var stationLayer=new OpenLayers.Layer.Vector("Stations"); //makes a vectorlayer for the stations
 map.addLayer(stationLayer); // puts the "Stations" layer on the map
 for(i=0;i<data.events.length;i++){
 if(i<2){
 station=new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(data.events[i].lon,data.events[i].lat).transform(proj4326,projmerc),{some:'data'},
    {externalGraphic: '../javascript/openlayers/img/marker'+i+'.png',graphicHeight:25,graphicWidth:35,graphicYOffset:-25,
     label:data.events[i].number,labelYOffset:17,fontColor:'#aaf'});}
 else{
 station=new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(data.events[i].lon,data.events[i].lat).transform(proj4326,projmerc),{some:'data'},
    {externalGraphic: '../javascript/openlayers/img/marker'+i+'.png',graphicHeight:25,graphicWidth:35,graphicYOffset:-25,
     label:data.events[i].number,labelYOffset:17,fontColor:'#336'});}
 //makes a "showerMerc"-instance
 stationLayer.addFeatures(station); // puts the instance in the layer
 } //data the stations on the "Station" layer

 var dragShower=new OpenLayers.Control.DragFeature(showerLayer); // makes features in the vector-layer draggeble
 map.addControl(dragShower); // adds the control to draggeble features
 dragShower.activate(); // switches the control on
 writeDist(htmlInfo,showerMerc,data); // writes the distances to the html-form
 map.addControl(new OpenLayers.Control.LayerSwitcher()); //makes the button on the rightside of the map
 map.events.register("mousemove",map,function(e){writeDist(htmlInfo,showerMerc,data);}); // calls writePlace() when the mouse moves
}

function plotGraph(htmlInfo,data){
 var tmin=999999999;
 var tmax=0;
 var diagramColor=[];
 diagramColor=["#000000","#660000","#ff0000","#ff9900","#ffff00","#66ff00","#66ffff","#ff00ff","#cccccc"];
 var maxHeight=125;
 var diagramID;
 var offset;
 $.jqplot.config.enablePlugins = true; // on the page before plot creation.

// coincidence diagram

 for(j=0;j<data.events.length;j++){
  for(k=0;k<4;k++){
   for(;maxHeight<data.events[j].pulseheights[k];){
    maxHeight=maxHeight*2;
   }
  }
 }
  
 for(j=0;j<data.events.length;j++){ // find the smallest and biggest value of nanoseconds
  offset=data.events[j].nanoseconds;
  if(tmin>offset){tmin=offset;}
  for(k=0;k<4;k++){
   if(tmax<data.events[j].traces[k].length*2.5+offset){tmax=data.events[j].traces[k].length*2.5+offset;}
  }
 }

 var tracedata=[];
 var eventdata=[];
 var styledata={legend:{show:false},
             title:"Coincidence",
             cursor:{tooltipLocation:'sw', zoom:true, clickReset:true}, 
             axes:{xaxis:{min:0,max:tmax-tmin,label:"Time [ns]",numberTicks:3},
                   yaxis:{label:"Pulseheight [mV]",ticks:[-maxHeight,-maxHeight/2,0],
                          labelRenderer:$.jqplot.CanvasAxisLabelRenderer}},
             series:[{showMarker:false,color:"#000000"}]
 };

 for(j=0;j<data.events.length;j++){
  for(k=0;k<4;k++){
   tracedata[k]=[[(data.events[j].nanoseconds-tmin),data.events[j].traces[k][0]]];
  }
  for(k=0;k<4;k++){
   for(i=1;i<data.events[j].traces[k].length;i++){
    tracedata[k].push([(i*2.5+data.events[j].nanoseconds-tmin), data.events[j].traces[k][i]]);
   }
   eventdata.push(tracedata[k]);
  }
 }

 for(j=0;j<data.events.length;j++){
  for(k=1;k<4*data.events.length;k++){
   styledata.series.push({showMarker:false});
  }
  for(k=0;k<4;k++){
   styledata.series[j*4+k].color=diagramColor[1+j];
  }
 }

 $.jqplot(htmlInfo.chartId, eventdata, styledata);

// a set of event diagrams

 for(j=0;j<data.events.length;j++){

// an event diagram
/*
  tmin=999999999;
  tmax=0;*/

  maxHeight=125;
  for(k=0;k<4;k++){
   for(;maxHeight<data.events[j].pulseheights[k];){
    maxHeight=maxHeight*2;
   }
  }

/*  offset=data.events[j].nanoseconds;
  if(tmin>offset){tmin=offset;}
  for(k=0;k<4;k++){
   if(tmax<data.events[j].traces[k].length*2.5+offset){tmax=data.events[j].traces[k].length*2.5+offset;}
  }*/

  tracedata=[];
  eventdata=[];
  styledata={legend:{show:false},
              title:"Station "+data.events[j].number,
              cursor:{tooltipLocation:'sw', zoom:true, clickReset:true}, 
              axes:{xaxis:{min:0,max:tmax-tmin,label:"Time [ns]",numberTicks:3},
                    yaxis:{label:"Pulseheight [mV]",ticks:[-maxHeight,-maxHeight/2,0],labelRenderer: $.jqplot.CanvasAxisLabelRenderer}},
              series:[{showMarker:false, color:"#000000"}]
  };

  for(k=0;k<4;k++){
   tracedata[k]=[[(data.events[j].nanoseconds-tmin),data.events[j].traces[k][0]]];
  }
  for(k=0;k<4;k++){
   for(i=1;i<data.events[j].traces[k].length;i++){
    tracedata[k].push([(i*2.5+data.events[j].nanoseconds-tmin), data.events[j].traces[k][i]]);
   }
   eventdata.push(tracedata[k]);
  }

  diagramID=htmlInfo.chartId+j;

  for(k=1;k<4*data.events.length;k++){
   styledata.series.push({showMarker:false});
  }
  for(k=0;k<4;k++){
   styledata.series[k].color=diagramColor[1+k];
  }
 $.jqplot(diagramID, eventdata, styledata);
 }
}
