.. include:: subst.inc

Data retrieval
==============

This page describes the `Data retrieval
<http://data.hisparc.nl/media/jsparc/data_retrieval.html>`_ web
application. It is webpage on which you can retrieve |hisparc| data,
with which you can make plots.

Here is a step by step guide for the functions of the page.


Get data
--------

The page will be quite empty at first and only show the |hisparc| logo
and a form with which you can download data. First you can choose a
|hisparc| station, the Start and End date (and time) and the type of
data you want to get. Once you have made your choices press *Get Data*.

The |hisparc| logo should become animated, indicating that data is being
retrieved from the |hisparc| servers. Once the data has been downloaded
a new section of the website appears giving you and overview of all the
datasets that you have downloaded. It is possible to get multiple
datasets, simply use the form again.


Data overview
-------------

The next section is the overview of all datasets that you have loaded.
For each dataset you can see the variables used to get it, the number of
entries it contains, and some controls.


Controls
^^^^^^^^

Here you can select which datasets you wish to use for creating plots by
selecting them in the *Choice* columns. The *Preview* button creates a
table overview of the dataset. The Download button downloads the dataset
as a .csv file (tab-separated), which can be imported in other
applications like Excel. Finally there is a *Remove* button, this simply
removes the dataset from the browser memory.


Plot options
------------

Once you choose at least one dataset (with the *Choice* column) the plot
controls appear. Here you can select the type of plots you want to make:
*Scatter*, *Histogram* or a *Time series*. You can also choose wether to
display the x and y axes as linear or logarithmic and the number of bins
for the histogram plot.

Next to these options are the available variables from the chosen
dataset, you can choose which variable to use for the x, and which to
use for the y-axis. When selecting a plot type that requires only one
variable the other column will be disabled. For instance a histogram
requires only x-axis values, the y-axis values are the number of counts
in each bin, so the y-axis selection will be disabled.

Once you have made your choices you can click the *Create Plot* button
and the plot will be shown in a new section appearing under these
settings. If you wish to create a different plot, or change the
settings, simply change the settings and click *Create Plot* button
again.


Interpolation
^^^^^^^^^^^^^

It is possible to get multiple datasets and then select one as choice 1
and the other as choice 2. When this is done the variables for each
dataset will appear side by side, and variables for the x or y axes can
be chosen from either dataset. When this is done the data will be
interpolated based on the timestamps to get matching timestamps, this
can create strange values in some cases, especially when the start and
end dates for the two datasets do not match.


Plot
----

This view appears as soon as you made a plot. It will simply show the
plot. On the top right is a *Save image* button that will open a new
window with a png version of the plot that can be saved to your pc.
Currently there are no options to change axis limits (zoom in, move
around).


Data preview
------------

If you click the *show* button for a dataset this section will show a
table with some rows of data. Each row shows all variables in the
dataset for each event. At first a small subset will be shown, since it
would take the browser to long to display all data rows. You can shows
more by clicking the line in the middle of the shown data. However, if
you wish to see all data, it is better to download the data to your pc.


Multiple detectors
------------------

Depending on your choice of variables a plot may contain datapoints with
multiple colors, this is because some variables are measured by multiple
detectors. For cosmic-ray data there are either 2 or 4 detectors for the
*Pulseheights*, *Integral*, *Number of mips* and *Arrival times*, the
colors are respectively black, red, green and blue. For weather data the
*Temperature* and *Humidity* are measured both inside (black) and
outside (red).


Missing data
------------

Sometimes a weather sensor does not work or a cosmic-ray station will
have only 2 detectors instead of 4. In those cases the missing data will
be given the value -999 or -1. Those error values are not plotted
because the distort the plots. The only problem is that a temperature of
-1 can be real, so this filter may remove real data. Luckily a
temperature of -1 °C is fairly rare.
