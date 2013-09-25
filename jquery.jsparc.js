(function($) {
    function jSparc() {
        // Development
        /* Most functions are made public to make development easier,
           some might not be when the library is released.
        */


        // Constants

        var jsparc = this,
            API_URL = 'http://data.hisparc.nl/api',
            DATA_URL = 'http://data.hisparc.nl/data',
            JSPARC_URL = 'http://data.hisparc.nl/jsparc',
            events_format = {'date': {'column': 0, 'units': 'GPS date'},
                             'time': {'column': 1, 'units': 'GPS time'},
                             'timestamp': {'column': 2, 'units': 's'},
                             'nanoseconds': {'column': 3, 'units': 'ns'},
                             'pulseheights': {'column': [4, 5, 6, 7], 'units': 'ADC'},
                             'integral': {'column': [8, 9, 10, 11], 'units': 'ADC.ns'},
                             'number_of_mips': {'column': [12, 13, 14, 15], 'units': 'N'},
                             'arrival_times': {'column': [16, 17, 18, 19], 'units': 'ns'}},
            weather_format = {'date': {'column': 0, 'units': 'GPS date'},
                              'time': {'column': 1, 'units': 'GPS time'},
                              'timestamp': {'column': 2, 'units': 's'},
                              'temperature_inside': {'column': 3, 'units': 'deg C'},
                              'temperature_outside': {'column': 4, 'units': 'deg C'},
                              'humidity_inside': {'column': 5, 'units': '%'},
                              'humidity_outside': {'column': 6, 'units': '%'},
                              'atmospheric_pressure': {'column': 7, 'units': 'hPa'},
                              'wind_direction': {'column': 8, 'units': 'deg'},
                              'wind_speed': {'column': 9, 'units': 'm/s'},
                              'solar_radiation': {'column': 10, 'units': 'W/m/m'},
                              'uv_index': {'column': 11, 'units': '0-16'},
                              'evapotranspiration': {'column': 12, 'units': 'mm'},
                              'rain_rate': {'column': 13, 'units': 'mm/h'},
                              'heat_index': {'column': 14, 'units': 'deg C'},
                              'dew_point': {'column': 15, 'units': 'deg C'},
                              'wind_chill': {'column': 16, 'units': 'deg C'}};


        // Data container

        jsparc.datasets = function() {return datasets;};
        var datasets = {};


        // Datasets

        jsparc.download_dataset = download_dataset;
        function download_dataset(station_number, startdate, enddate, type) {
            /* Store the result of downlaoding data to the datasets

            The url will be used as key to reference the data

            */
            var url = data_download(station_number, startdate, enddate, type);
            if (datasets[url]) {
                alert('That dataset is already available');
                return;}
            return get_csv(url)
                   .done(function(data) {
                       datasets[url] = ({data: data,
                                         station_number: station_number,
                                         startdate: startdate,
                                         enddate: enddate,
                                         type: type,
                                         url: url});
                       update_dataset_table();
                   });
        }

        jsparc.remove_dataset = remove_dataset;
        function remove_dataset(url) {
            /* Remove a specific dataset
            */
            delete datasets[url];
        }

        jsparc.remove_dataset_from_list = remove_dataset_from_list;
        function remove_dataset_from_list(span) {
            /* Remove the clicked dataset
            */
            remove_dataset($(span).parent().attr('name'));
        }

        jsparc.sort_events = sort_events;
        function sort_events(data) {
            /* Sort event data by extended timestamps
            */
            return data.sort(sort_extendedtimestamps);
        }

        jsparc.sort_weather = sort_weather;
        function sort_weather(data) {
            /* Sort weather data by timestamps
            */
            return data.sort(sort_timestamps);
        }

        jsparc.sort_extendedtimestamps = sort_extendedtimestamps;
        function sort_extendedtimestamps(a, b) {
            /* Sort by extended timestamps

            First sort by timestamp, if they are the same, use the nanoseconds

            */
            var t = events_format.timestamp.column,
                n = events_format.nanoseconds.column;
            return (a[t] == b[t]) ? a[n] - b[n] : a[t] - b[t];
        }

        jsparc.sort_timestamps = sort_timestamps;
        function sort_timestamps(a, b) {
            /* Sort by timestamp
             */
            var t = weather_format.timestamp.column;
            return a[t] - b[t];
        }

        jsparc.combine_datasets = combine_datasets;
        function combine_datasets(urls) {
            /* Concat several array into one
            */
            var datatype = datasets[urls[0]].type;
            for (var i = 0; i < urls.length; i++) {
                if (urls[i].indexOf(datatype) == -1) {
                    return false;}} // Not all of same type!

            var combined_dataset = [];
            combined_dataset = combined_dataset.concat.apply([], urls.map(function (url) {return datasets[url].data;}));
            return combined_dataset;
        }

        jsparc.make_ext_timestamp = make_ext_timestamp;
        function make_ext_timestamp(timestamp, nanoseconds) {
            /* Combine timestamp and nanoseconds to one value
            */
            if (timestamp.length) {
                var ext_timestamps = [];
                for (var i = 0; i < timestamp.length; i++) {
                    ext_timestamps.push(make_ext_timestamp(timestamp[i], nanoseconds[i]));}
                return ext_timestamps;}
            var nanoseconds = nanoseconds || null;
            return timestamp * 1e9 + nanoseconds;
        }

        jsparc.make_javascript_timestamp = make_javascript_timestamp;
        function make_javascript_timestamp(timestamp, nanoseconds) {
            /* Combine timestamp and nanoseconds to one value

            flot recognizes javascript timestamps for time series data

            */
            var nanoseconds = nanoseconds || null;
            return timestamp * 1e3 + Math.round(nanoseconds / 1e6);
        }

        jsparc.get_column = get_column;
        function get_column(column_name, url) {
            /* Get a column from a dataset

            If a column occurs more than once (e.g. pulseheights, integrals)
            it will return an array containing each column:
            [[x1, x2, x3, x4], [y1, y2, y3, y4]]

            */
            var data = datasets[url].data,
                type = datasets[url].type,
                column = [];
            if (type == 'events') {
                var col = events_format[column_name].column;}
            else if (type == 'weather') {
                var col = weather_format[column_name].column;}

            if (col.length) {
                for (var i = 0; i < col.length; i++) {
                    var values = [];
                    for (var j = 0; j < data.length; j++) {
                        values[j] = data[j][col[i]];}
                    column[i] = values;}}
            else {
                for (var i = 0; i < data.length; i++) {
                    column[i] = data[i][col];}}

            return column;
        }


        // User Interface

        jsparc.make_datepicker = make_datepicker;
        function make_datepicker(target) {
            /* Create an date input field

            Possible choices are limited to dates between start of
            HiSPARC (9/1/2004) and yesterday.

            Requires jquery-ui.js, jquery-ui-timepicker-addon.js

            */
            target.datetimepicker({minDate: new Date(2004, 1, 9),
                                   maxDate: -1,
                                   timezone:'UTC',
                                   dateFormat: 'yy-mm-dd'});
        }

        jsparc.make_station_select = make_station_select;
        function make_station_select(target) {
            /* Create a select menu to choose a station
            */
            var url = api_stations();
            return get_json(url)
                   .done(function(station_json) {
                       var select = $('<select>');
                       var number, name;
                       for (var i = 0; i < station_json.length; i++) {
                           number = station_json[i].number;
                           name = station_json[i].name;
                           select.append($('<option>').text(number + ' - ' + name)
                                                      .attr('value', number));}
                       target.html(select);
                   });
        }

        jsparc.set_dataset_list_controls = set_dataset_list_controls;
        function set_dataset_list_controls(target) {
            var target = target || $('#dataset_list');
            target.on('click', 'td.delete', function() {
                remove_dataset_from_list(this);
                $(this).parent().remove();});
        }

        jsparc.update_dataset_table = update_dataset_table;
        function update_dataset_table(target) {
            /* Create a readable overview table of the available datasets
            */
            var target = target || $('#dataset_list'),
                list = $('<table>'),
                firstrow = $('<tr>');
            firstrow.append($('<th>').text('Choice 1'));
            firstrow.append($('<th>').text('Choice 2'));
            firstrow.append($('<th>').text('Station'));
            firstrow.append($('<th>').text('Type'));
            firstrow.append($('<th>').text('Start date'));
            firstrow.append($('<th>').text('End date'));
            firstrow.append($('<th>').text('Remove'));
            list.append(firstrow);
            for (var i in datasets) {
                var row = $('<tr>').attr('name', datasets[i].url);
                row.append($('<td>').append($('<input>').attr('type', 'radio').attr('name', 'set1')));
                row.append($('<td>').append($('<input>').attr('type', 'radio').attr('name', 'set2')));
                row.append($('<td>').text(datasets[i].station_number).addClass('station'));
                row.append($('<td>').text(datasets[i].type).addClass('type'));
                row.append($('<td>').text(datasets[i].startdate).addClass('start'));
                row.append($('<td>').text(datasets[i].enddate).addClass('end'));
                row.append($('<td>').text('x').addClass('delete'));
                list.append(row);}
            target.html(list);
            set_dataset_list_controls(target);
        }

        jsparc.update_dataset_select = update_dataset_select;
        function update_dataset_select(target) {
            /* Create a readable select menu of the available datasets
            */
            var select = $('<select>');
            var station_number, startdate, enddate, type, url, str;
            for (var i in datasets) {
                station_number = datasets[i].station_number;
                startdate = datasets[i].startdate;
                enddate = datasets[i].enddate;
                type = datasets[i].type;
                url = datasets[i].url;
                str = 'Station ' + station_number + ' - ' + type + ': ' + startdate + ' - ' + enddate;
                select.append($('<option>').attr('value', url).text(str));}
            target.html(select);
        }

        jsparc.create_dataset_table = create_dataset_table;
        function create_dataset_table(url, target, limit) {
            /* Create a table representation of a dataset
            */
            var dataset = datasets[url],
                target = (target) ? target : $('#dataTable'),
                limit = (limit) ? limit : dataset.data.length,
                table = $('<table>').addClass(dataset.type);

            // Header row
            var firstrow = $('<tr>'),
                type = (dataset.type == 'events') ? events_format : weather_format;
            firstrow.append($('<th>').text('#'));
            for (var key in type) {
                var ncol = (type[key].column.length) ? type[key].column.length : 1;
                firstrow.append($('<th>').text(key).attr('colspan', ncol));}
            table.append(firstrow);

            // Data rows
            for (var i = 0; i < dataset.data.length; i++) {
                var row = $('<tr>');
                row.append($('<td>').text(i + 1));
                for (var j = 0; j < dataset.data[i].length; j++) {
                    row.append($('<td>').text(dataset.data[i][j]));}
                table.append(row);
                if (limit != dataset.data.length && i == Math.floor(limit / 2) - 1) {
                    var truncrow = $('<tr>');
                    truncrow.append($('<td>')
                                    .text('... truncated table (click to expand)')
                                    .attr('colspan', dataset.data[0].length + 1)
                                    .css('text-align', 'left')
                                    .click(function() {create_dataset_table(url, target, dataset.data.length);}));
                    table.append(truncrow);
                    i = dataset.data.length - 1 - Math.ceil(limit / 2);}}

            target.html(table);
        }


        // AJAX

        jsparc.get_multiple_json = get_multiple_json;
        function get_multiple_json(urls) {
            /* Asynchronously download multiple urls of type json
            */
            return $.when.apply(null, urls.map(function (url) {return get_json(url);}));
        }

        jsparc.get_multiple_csv = get_multiple_csv;
        function get_multiple_csv(urls) {
            /* Asynchronously download multiple urls of type csv
            */
            return $.when.apply(null, urls.map(function (url) {return get_csv(url);}));
        }

        jsparc.get_json = get_json;
        function get_json(url) {
            /* Asynchronously download data of type json
            */
            return $.ajax({url: url,
                           dataType: 'json',
                           type: 'GET'});
        }

        jsparc.get_csv = get_csv;
        function get_csv(url) {
            /* Asynchronously download data of type csv

            The csv data will be converted to an array
            Comment headers will be removed

            */
            return $.ajax({url: url,
                           converters: {'text json': parse_csv},
                           dataType: 'json',
                           type: 'GET'});
        }


        // API
        /* Functions to construct URLs to access the publicdb API
        */

        jsparc.api_stations = api_stations;
        function api_stations() {
            return [API_URL, 'stations', ''].join('/');}

        jsparc.api_stations_in_subcluster = api_stations_in_subcluster;
        function api_stations_in_subcluster(subcluster_number) {
            return [API_URL, 'subclusters', subcluster_number, ''].join('/');}

        jsparc.api_subclusters = api_subclusters;
        function api_subclusters() {
            return [API_URL, 'subclusters', ''].join('/');}

        jsparc.api_subclusters_in_cluster = api_subclusters_in_cluster;
        function api_subclusters_in_cluster(cluster_number) {
            return [API_URL, 'clusters', cluster_number, ''].join('/');}

        jsparc.api_clusters = api_clusters;
        function api_clusters() {
            return [API_URL, 'clusters', ''].join('/');}

        jsparc.api_clusters_in_country = api_clusters_in_country;
        function api_clusters_in_country(country_number) {
            return [API_URL, 'countries', country_number, ''].join('/');}

        jsparc.api_countries = api_countries;
        function api_countries() {
            return [API_URL, 'countries', ''].join('/');}

        jsparc.api_stations_with_data = api_stations_with_data;
        function api_stations_with_data(year, month, day) {
            return [API_URL, 'stations/data', year, month, day, ''].join('/');}

        jsparc.api_stations_with_weather = api_stations_with_weather;
        function api_stations_with_weather(year, month, day) {
            return [API_URL, 'stations/weather', year, month, day, ''].join('/');}

        jsparc.api_station_info = api_station_info;
        function api_station_info(station_number, year, month, day) {
            return [API_URL, 'station', station_number, year, month, day, ''].join('/');}

        jsparc.api_has_data = api_has_data;
        function api_has_data(station_number, year, month, day) {
            return [API_URL, 'station', station_number, 'data', year, month, day, ''].join('/');}

        jsparc.api_has_weather = api_has_weather;
        function api_has_weather(station_number, year, month, day) {
            return [API_URL, 'station', station_number, 'weather', year, month, day, ''].join('/');}

        jsparc.api_configuration = api_configuration;
        function api_configuration(station_number, year, month, day) {
            return [API_URL, 'station', station_number, 'config', year, month, day, ''].join('/');}

        jsparc.api_number_of_events = api_number_of_events;
        function api_number_of_events(station_number, year, month, day, hour) {
            return [API_URL, 'station', station_number, 'num_events', year, month, day, hour, ''].join('/');}


        // Data Download

        jsparc.data_example = data_example;
        function data_example(station_number, startdate, enddate, type) {
            /* Construct URLs to access local example data
            */
            if (type == 'events') {
                return './examples/events-s501-20130910.csv';}
            else {
                return './examples/weather-s501-20130910.csv';}}

        jsparc.data_download = data_download;
        function data_download(station_number, startdate, enddate, type) {
            /* Construct URLs to access the publicdb data download
            */
            return [DATA_URL, station_number, type].join('/') + '?start=' + startdate + '&end=' + enddate;}


        // jSparc

        jsparc.jsparc_get_coincidence = jsparc_get_coincidence;
        function jsparc_get_coincidence(get_coincidence) {
            /* Create url with query to get a coincidence from a jSparc session

            get_coincidence should be an object with the following keys:
            session_title, session_pin, student_name

            */
            return [JSPARC_URL, 'get_coincidence', ''].join('/') +  '?' + $.param(get_coincidence);}

        jsparc.jsparc_result = jsparc_result;
        function jsparc_result(result) {
            /* Create url with query to send the jSparc results to the server

            result should be an object with the following keys:
            session_title, session_pin, student_name, pk, logEnergy, error, lon, lat

            */
            return [JSPARC_URL, 'result', ''].join('/')  + '?' + $.param(result);}


        // Flot
        // Requires jquery.flot.js

        jsparc.make_plot = make_plot;
        function make_plot(target, data) {
            /* Create a plot of data
            */
            var target = (target) ? target : $('#plot'),
                datas = [{data: [0, 0], lines: {show: false}, xaxis: 2, yaxis: 2}];

            if (data[0][0] instanceof Array) {
                var colors = ['#222', '#D22', '#1C1', '#1CC', '#C1C', '#15C', '#CC1'];
                for (var i = 0; i < data.length; i++) {
                    datas.unshift({data: data[i], yaxis: 1, points: {fillColor: colors[i]}});}}
            else {
                datas.unshift({data: data, yaxis: 1});}
            return $.plot(target,
                          datas,
                          flot_active);
        }

        jsparc.download_plot = download_plot;
        function download_plot(target) {
            /* Open a new window with a png version (base64 encoded) of the plot
            */
            var target = (target) ? target : $('#plot');
            var dataurl = target.find('.flot-base')[0].toDataURL();
            window.open(dataurl, '_blank', 'height=350, width=630, toolbar=yes');
        }

        jsparc.zip_data = zip_data;
        function zip_data(x, y) {
            /* Create a zipped array of 2 arrays

            Give two equal length arrays (x, y)
            They will be zipped to: [[x1, y1], [x2, y2], [x3, y3], ...]

            If y contains multiple arrays each will be zipped with x:
            [[[x1, y11], [x2, y12], ...], [[x1, y21], [x2, y22], ...]]

            */
            if (y[0] instanceof Array) {
                var data = [];
                for (var i = 0; i < y.length; i++) {
                    data[i] = zip_data(x, y[i]);}
                return data;}

            var data = [];
            for (var i = 0; i < x.length; i++) {
                data.push([x[i], y[i]]);}
            return data;
        }

        jsparc.linear_interpolation = linear_interpolation;
        function linear_interpolation(x1, x2, y2) {
            /* Make a linear interpolation to get y2 to be the same length as x1
            */
            var y1 = [];
            for (var i = 0; i < x1.length; i++) {
                var j = bisect_search(x1[i], x2);
                var dydx = (y2[j + 1] - y2[j]) / (x2[j + 1] - x2[j]);
                y1.push(y2[j] + dydx * (x1[i] - x2[j]));
            }
            return y1;
        }

        jsparc.bisect_search = bisect_search;
        function bisect_search(point, array) {
            /* Use bisection to find an index i where array[i] <= point < array[i + 1].
            */
            if (point >= array[array.length - 2]) {
                return array.length - 2;}
            if (point < array[1]) {
                return 0;}

            var imin = 0;
            var imax = array.length;
            while (imin < imax) {
                var imid = imin + ((imax - imin) >> 1);
                if (point >= array[imid]) {
                    imin = imid + 1;}
                else {
                    imax = imid;}}
            return imin - 1;
        }

        jsparc.set_flot_options = set_flot_options;
        function set_flot_options(options) {
            /* Combine plot options

            line style (histogram, line, scatter)
            axis (x, y: linear, log)
            variables (x, y: labels)

            */
            var extend_default = [true, {}, flot_base];
            for (var i = 0; i < options.length ; i++) {
                extend_default.push(options[i]);}
            flot_active = $.extend.apply([], extend_default);
        }


        // Flot options
        // Requires jquery.flot.axislabels.js, jquery.flot.time.js

        jsparc.flot_active = function() {return flot_active;};
        var flot_active = {};

        jsparc.flot_base = function() {return flot_base;};
        var flot_base = {
            colors: ['#222', '#D22', '#1C1', '#1CC', '#C1C', '#15C', '#CC1'],
            legend: {show: false},
            xaxis: {
                show: true,
                font: {
                    size: 12,
                    lineHeight: 13,
                    family: 'sans-serif',
                    color: '#000'},
                color: '#000',
                tickColor: '#000',
                labelHeight: 23,
                tickLength: 4,
                tickDecimals: 0},
            yaxis: {
                show: true,
                font: {
                    size: 12,
                    lineHeight: 13,
                    family: 'sans-serif',
                    color: '#000'},
                color: '#000',
                tickColor: '#000',
                tickLength: 4,
                tickDecimals: 0},
            y2axis: {
                show: true,
                position: 'right',
                tickFormatter: _hide_tick_labels,
                labelWidth: 0,
                tickLength: 2,
                alignTicksWithAxis: 1,
                axisLabel: ''},
            x2axis: {
                show: true,
                position: 'top',
                tickFormatter: _hide_tick_labels,
                labelHeight: 0,
                tickLength: 2,
                alignTicksWithAxis: 1,
                axisLabel: ''},
            series: {
                lines: {
                    lineWidth: 1.5,
                    steps: false},
                shadowSize: 0},
            grid: {
                aboveData: 0,
                color: '#000',
                backgroundColor: 'rgba(255, 255, 255, 0)',
                labelMargin: 7,
                axisMargin: 0,
                borderWidth: 1,
                minBorderMargin: 0,
                clickable: false,
                hoverable: false,
                autoHighlight: false},
            canvas: true
        };

        jsparc.flot_histogram = function() {return flot_histogram;};
        var flot_histogram = {
            yaxis: {
                min: 0},
            series: {
                lines: {
                    steps: true}}
        };

        jsparc.flot_lines = function() {return flot_lines;};
        var flot_lines = {
        };

        jsparc.flot_scatter = function() {return flot_scatter;};
        var flot_scatter = {
            series: {
                points: {
                    show: true,
                    radius: 1,
                    lineWidth: 0.00001,
                    fillColor: '#222'},
                lines: {
                    show: false}}
        };

        jsparc.flot_ylog = function() {return flot_ylog;};
        var flot_ylog = {
            yaxis: {
                transform: _make_log_axis,
                inverseTransform: _inverse_make_log_axis}
        };

        jsparc.flot_xlog = function() {return flot_xlog;};
        var flot_xlog = {
            xaxis: {
                transform: _make_log_axis,
                inverseTransform: _inverse_make_log_axis}
        };

        jsparc.flot_timeseries = function() {return flot_timeseries;};
        var flot_timeseries = {
            xaxis: {
                axisLabel: 'Date/Time (GPS)',
                mode: 'time'}
        };

        jsparc.flot_axis_labels = flot_axis_labels;
        function flot_axis_labels(x_label, y_label) {
            /* Create an flot options object with axis labels
            */
            return {yaxis: {
                        axisLabel: x_label},
                    xaxis: {
                        axisLabel: y_label}}
        }

        jsparc.flot_none = function() {return flot_none;};
        var flot_none = {
        };


        // Flot helpers

        jsparc._hide_tick_labels = _hide_tick_labels;
        function _hide_tick_labels(v, axis) {
            /* Make the ticklabels for the top/right axes empty
            */
            return ' ';
        }

        jsparc._make_log_axis = _make_log_axis;
        function _make_log_axis(v) {
            /* Transform an axis to log
            */
            if (v <= 0) {
                return null;}
            return Math.log(v) / Math.LN10;
        }

        jsparc._inverse_make_log_axis = _inverse_make_log_axis;
        function _inverse_make_log_axis(v) {
            /* Inverse for transforming an axis to log
            */
            return Math.pow(10, v);
        }


        // Helper functions

        jsparc.parse_csv = parse_csv;
        function parse_csv(csv) {
            /* Convert downloaded csv to 2D Array
            */
            var eol = '\n',
                delimiter = '\t',
                empty = '',
                comments = '#';
            var data = [];
            var lines = csv.split(eol);
            while (lines[0][0] == comments) {
                lines.splice(0, 1);}
            while (lines[lines.length - 1] == empty) {
                lines.splice(lines.length - 1, 1);}
            for (var i = 0; i < lines.length; i++) {
                data.push(lines[i].split(delimiter));}
            return data;
        }

        jsparc.range = range;
        function range(start, stop, step) {
            /* Generate a range array, similar to range() in Python

            From: http://stackoverflow.com/a/8273091/1033535
            Fixed to allow non-integer steps

            */
            if (typeof stop == 'undefined') {
                var stop = start,
                    start = 0;}
            if (typeof step == 'undefined') {
                var step = 1;}
            if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
                return [];}

            var result = [],
                counter = 0,
                current = start;
            while (step > 0 ? current < stop : current > stop) {
                result.push(current);
                counter++;
                current = start + (counter * step);}
            return result;
        }

        jsparc.histogram = histogram;
        function histogram(a, nbins) {
            /* Compute the histogram of a set of data.

            The last bin includes values that would be equal to the edge
            of the next bin, i.e. [[1, 2), [2, 3), [3, 4), [4, 5]].

            */
            var data = a.sort(),
                nbins = nbins || 20,
                mn = data[0],
                mx = data[data.length - 1],
                n = [];

            for (var i = 0; i < nbins; i++) {
                n[i] = 0;}

            for (var j = 0; j < data.length; j++) {
                if (a[j] == mx) {
                    n[nbins - 1]++;}
                else {
                    var i = Math.floor((a[j] - mn) / (mx - mn) * nbins);
                    n[i]++;}}

            var bins = range(parseFloat(mn), parseFloat(mx), parseFloat((mx - mn) / nbins));

            return [n, bins];
        }

        jsparc.transpose = transpose;
        function transpose(a) {
            /* Make the transpose of a 2D Array

            From: http://www.shamasis.net/2010/02/transpose-an-array-in-javascript-and-jquery/
            Changed to be a seperate function.

            */
            var w = a.length ? a.length : 0,
                h = a[0] instanceof Array ? a[0].length : 0;
            if (h === 0 || w === 0) {
                return [];}
            var t = [];
            for (var i = 0; i < h; i++) {
                t[i] = [];
                for (var j = 0; j < w; j++) {
                    t[i][j] = a[j][i];}}
            return t;
        }

        jsparc.pad_zero = pad_zero;
        function pad_zero(number, length) {
            /* Prepend a number with zero's until its length is length

            e.g. pad_zero(5, 5) -> '00005'

            */
            var str = '' + number;
            while (str.length < length) {
                str = '0' + str;}
            return str;
        }
    }

    $.jsparc = function() {
        var jsparc = new jSparc();
        return jsparc;
    };

})(jQuery);
