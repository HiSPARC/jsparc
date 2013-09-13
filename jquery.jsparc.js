(function($) {
    function jSparc() {


        // Constants

        var jsparc = this,
            API_URL = 'http://data.hisparc.nl/api',
            DATA_URL = 'http://data.hisparc.nl/data',
            JSPARC_URL = "http://data.hisparc.nl/jsparc",
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

        var datasets = {};


        // Public functions

        jsparc.datasets = function() {return datasets};
        jsparc.download_dataset = download_dataset;
        jsparc.remove_dataset = remove_dataset;
        jsparc.make_station_select = make_station_select;
        jsparc.make_datepicker = make_datepicker;


        // Development
        /* The following functions are made public to make
           development easier, some might be added to the above
           list, and some may become private.
        */
        jsparc.remove_dataset_from_list = remove_dataset_from_list;
        jsparc.sort_events = sort_events;
        jsparc.sort_weather = sort_weather;
        jsparc.sort_extendedtimestamps = sort_extendedtimestamps;
        jsparc.sort_timestamps = sort_timestamps;
        jsparc.combine_datasets = combine_datasets;
        jsparc.make_ext_timestamp = make_ext_timestamp;
        jsparc.make_javascript_timestamp = make_javascript_timestamp;
        jsparc.get_column = get_column;
        jsparc.set_dataset_list_controls = set_dataset_list_controls;
        jsparc.update_dataset_list = update_dataset_list;
        jsparc.update_dataset_select = update_dataset_select;
        jsparc.get_multiple_json = get_multiple_json;
        jsparc.get_multiple_csv = get_multiple_csv;
        jsparc.get_json = get_json;
        jsparc.get_csv = get_csv;
        jsparc.api_stations = api_stations;
        jsparc.api_stations_in_subcluster = api_stations_in_subcluster;
        jsparc.api_subclusters = api_subclusters;
        jsparc.api_subclusters_in_cluster = api_subclusters_in_cluster;
        jsparc.api_clusters = api_clusters;
        jsparc.api_clusters_in_country = api_clusters_in_country;
        jsparc.api_countries = api_countries;
        jsparc.api_stations_with_data = api_stations_with_data;
        jsparc.api_stations_with_weather = api_stations_with_weather;
        jsparc.api_station_info = api_station_info;
        jsparc.api_has_data = api_has_data;
        jsparc.api_has_weather = api_has_weather;
        jsparc.api_configuration = api_configuration;
        jsparc.api_number_of_events = api_number_of_events;
        jsparc.data_download = data_download;
        jsparc.jsparc_get_coincidence = jsparc_get_coincidence;
        jsparc.jsparc_result = jsparc_result;
        jsparc.make_plot = make_plot;
        jsparc.download_graph = download_graph;
        jsparc.zip_data = zip_data;
        jsparc.linear_interpolation = linear_interpolation;
        jsparc.bisect_search = bisect_search;
        jsparc.set_flot_options = set_flot_options;
        jsparc.flot_axis_labels = flot_axis_labels;
        jsparc._hide_tick_labels = _hide_tick_labels;
        jsparc._make_log_axis = _make_log_axis;
        jsparc._inverse_make_log_axis = _inverse_make_log_axis;
        jsparc.parse_csv = parse_csv;
        jsparc.transpose = transpose;
        jsparc.pad_zero = pad_zero;


        // Datasets

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
                       update_dataset_list();
                   });
        }

        function remove_dataset(url) {
            /* Remove a specific dataset
            */
            delete datasets[url];
            update_dataset_list();
        }

        function remove_dataset_from_list(span) {
            /* Remove the clicked dataset
            */
            remove_dataset($(span).parent().attr('name'));
        }

        function sort_events(data) {
            /* Sort event data by extended timestamps
            */
            return data.sort(sort_extendedtimestamps);
        }

        function sort_weather(data) {
            /* Sort weather data by timestamps
            */
            return data.sort(sort_timestamps);
        }

        function sort_extendedtimestamps(a, b) {
            /* Sort by extended timestamps
 
            First sort by timestamp, if they are the same, use the nanoseconds

            */
            t = events_format['timestamp'].column;
            n = events_format['nanoseconds'].column;
            return (a[t] == b[t]) ? a[n] - b[n] : a[t] - b[t];
        }

        function sort_timestamps(a, b) {
            /* Sort by timestamp
             */
            t = weather_format['timestamp'].column;
            return a[t] - b[t];
        }

        function combine_datasets(urls) {
            /* Concat several array into one
            */
            var datatype = datasets[urls[0]].type;
            for (var i = 0; i < urls.length; i++) {
                if (urls[i].indexOf(datatype) == -1) {
                    return false}} // Not all of same type!

            var combined_dataset = [];
            combined_dataset = combined_dataset.concat.apply([], urls.map(function (url) {return datasets[url].data;}));
            return combined_dataset;
        }

        function make_ext_timestamp(timestamp, nanoseconds) {
            /* Combine timestamp and nanoseconds to one value
            */
            var nanoseconds = nanoseconds || null;
            return timestamp * 1e9 + nanoseconds;
        }

        function make_javascript_timestamp(timestamp, nanoseconds) {
            /* Combine timestamp and nanoseconds to one value
            
            flot recognizes javascript timestamps for time series data
            
            */
            var nanoseconds = nanoseconds || null;
            return timestamp * 1e3 + Math.round(nanoseconds / 1e6);
        }

        function get_column(column_name, data, type) {
            /* Get a column from a dataset
            */
            var column = [];
            if (type == 'events') {
                var col = events_format[column_name].column;}
            else if (type == 'weather') {
                var col = weather_format[column_name].column;}

            if (col.length) {
                for (var i = 0; i < data.length; i++) {
                    var values = [];
                    for (var j = 0; j < col.length; j++) {
                        values[i] = data[i][j];}
                    column[i] = values}}
            else {
                for (var i = 0; i < data.length; i++) {
                    column[i] = data[i][col];}}

            return column;
        }


        // User Interface

        function make_datepicker(target) {
            /* Create an date input field
            
            Possible choices are limited to dates between start of
            HiSPARC (9/1/2004) and yesterday.

            Requires jquery-ui

            */
            target.datepicker({minDate: new Date(2004, 1, 9), maxDate: -1, dateFormat: 'yy-mm-dd'})
                  .datepicker("setDate", -1);
        }

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
                           select.append($('<option>').attr('value', number).text(number + ' - ' + name));}
                       target.html(select);
                   });
        }

        function set_dataset_list_controls(target) {
            var target = target || $('#dataset_list');
            target.on("click", "span.delete", function() {remove_dataset_from_list(this)});
        }

        function update_dataset_list(target) {
            /* Create a readable overview list of the available datasets
            */
            var target = target || $('#dataset_list');
            var list = $('<ol>');
            for (var i in datasets) {            
                var item = $('<li>');
                var del = $('<span>').attr('class', 'delete').text('x');
                item.text('Station: ' + datasets[i].station_number + ' - ' + datasets[i].type +
                          '. Date: ' + datasets[i].startdate + ' - ' + datasets[i].enddate)
                    .attr('name', datasets[i].url);
                item.append(del);
                list.append(item);
            }
            target.html(list);
            set_dataset_list_controls(target);
        }

        function update_dataset_select(target) {
            /* Create a readable select menu of the available datasets
            */
            var select = $('<select>');
            var station_number, startdate, enddate, type, url;
            for (var i in dataset) {
                station_number = dataset[i].station_number;
                startdate = dataset[i].startdate;
                enddate = dataset[i].enddate;
                type = dataset[i].type;
                url = dataset[i].url;
                select.append($('<option>').attr('value', url).text('Station ' + station_number + ' - ' + type + ': ' + startdate + ' - ' + enddate));}
            target.html(select);
        }


        // AJAX

        function get_multiple_json(urls) {
            /* Asynchronously download multiple urls of type json
            */
            return $.when.apply(null, urls.map(function (url) {return get_json(url);}));
        }

        function get_multiple_csv(urls) {
            /* Asynchronously download multiple urls of type csv
            */
            return $.when.apply(null, urls.map(function (url) {return get_csv(url);}));
        }

        function get_json(url) {
            /* Asynchronously download data of type json
            */
            return $.ajax({url: url,
                           dataType: 'json',
                           type: 'GET'});
        }

        function get_csv(url) {
            /* Asynchronously download data of type csv
            
            The csv data will be converted to an array
            Comment headers will be removed

            */
            return $.ajax({url: url,
                           converters: {"text json": parse_csv},
                           dataType: 'json',
                           type: 'GET'});
        }


        // API
        /* Functions to construct URLs to access the publicdb API
        */

        function api_stations() {
            return [API_URL, 'stations', ''].join('/');}

        function api_stations_in_subcluster(subcluster_number) {
            return [API_URL, 'subclusters', subcluster_number, ''].join('/');}

        function api_subclusters() {
            return [API_URL, 'subclusters', ''].join('/');}

        function api_subclusters_in_cluster(cluster_number) {
            return [API_URL, 'clusters', cluster_number, ''].join('/');}

        function api_clusters() {
            return [API_URL, 'clusters', ''].join('/');}

        function api_clusters_in_country(country_number) {
            return [API_URL, 'countries', country_number, ''].join('/');}

        function api_countries() {
            return [API_URL, 'countries', ''].join('/');}

        function api_stations_with_data(year, month, day) {
            return [API_URL, 'stations/data', year, month, day, ''].join('/');}

        function api_stations_with_weather(year, month, day) {
            return [API_URL, 'stations/weather', year, month, day, ''].join('/');}

        function api_station_info(station_number, year, month, day) {
            return [API_URL, 'station', station_number, year, month, day, ''].join('/');}

        function api_has_data(station_number, year, month, day) {
            return [API_URL, 'station', station_number, 'data', year, month, day, ''].join('/');}

        function api_has_weather(station_number, year, month, day) {
            return [API_URL, 'station', station_number, 'weather', year, month, day, ''].join('/');}

        function api_configuration(station_number, year, month, day) {
            return [API_URL, 'station', station_number, 'config', year, month, day, ''].join('/');}

        function api_number_of_events(station_number, year, month, day, hour) {
            return [API_URL, 'station', station_number, 'num_events', year, month, day, hour, ''].join('/');}


        // Data Download

        function data_download(station_number, startdate, enddate, type) {
            /* Construct URLs to access the publicdb data download
            */
            return [DATA_URL, station_number, type].join('/') + '?start=' + startdate + '&end=' + enddate;}


        // jSparc

        function jsparc_get_coincidence(get_coincidence) {
            /* Create url with query to get a coincidence from a jSparc session
            
            get_coincidence should be an object with the following keys:
            session_title, session_pin, student_name

            */
            return [JSPARC_URL, 'get_coincidence', ''].join('/') +  '?' + $.param(get_coincidence);}

        function jsparc_result(result) {
            /* Create url with query to send the jSparc results to the server
            
            result should be an object with the following keys:
            session_title, session_pin, student_name, pk, logEnergy, error, lon, lat

            */
            return [JSPARC_URL, 'result', ''].join('/')  + '?' + $.param(result);}


        // Flot
        // Requires jquery.flot.js

        function make_plot(target, data, type) {
            /* Create a plot of data
            */
            var target = (target) ? target : $('#plot');
            return $.plot(target,
                    [{data: data, yaxis: 1},
                     {data: [0, 0], lines: {show: false}, xaxis: 2, yaxis: 2}],
                    flot_active);
        }

        function download_graph(target) {
            /* Open a new window with a png version (base64 encoded) of the graph
            */
            var target = (target) ? target : $('#plot');
            var dataurl = $(target + ' .flot-base')[0].toDataURL();
            window.open(dataurl, '_blank', "height=350, width=630, toolbar=yes");
        }

        function zip_data(x, y) {
            /* Create a zipped array of 2 arrays
            
            Give two equal length arrays (x, y)
            They will be zipped to: [[x1, y1], [x2, y2], [x3, y3], ...]

            */
            if (x.length != y.length) {
                return null;}

            var data = [];
            for (var i = 0; i < x.length; i++) {
                data.push([x[i], y[i]]);}
            return data;
        }

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

        function set_flot_options(options) {
            /* Combine plot options
            
            line style (histogram, line, scatter)
            axis (x, y: linear, log)
            
            */
            var extend_default = [true, {}, flot_base];
            var apply_args = extend_default.concat(options);
            flot_active = $.extend.apply([], apply_args);
        }


        // Flot options
        // Requires jquery.flot.axislabels.js, jquery.flot.time.js

        var flot_active = {
        };

        var flot_base = {
            colors: ['#222', '#D22', '#1C1', '#1CC', '#C1C', '#15C', '#CC1'],
            legend: {show: false},
            xaxis: {
                show: true,
                font: {
                    size: 12},
                color: '#000',
                tickColor: '#000',
                labelHeight: 23,
                tickLength: 4,
                tickDecimals: 0,
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 16},
            yaxis: {
                show: true,
                font: {
                    size: 12},
                color: '#000',
                tickColor: '#000',
                labelWidth: 33,
                tickLength: 4,
                tickDecimals: 0,
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 16},
            y2axis: {
                show: true,
                position: 'right',
                tickFormatter: _hide_tick_labels,
                labelWidth: 11,
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
                borderWidth: 0,
                minBorderMargin: 0,
                clickable: false,
                hoverable: false,
                autoHighlight: false}
        };

        var flot_histogram = {
            yaxis: {
                min: 0},
            series: {
                lines: {
                    steps: true}}
        };

        var flot_lines = {
        };

        var flot_scatter = {
            series: {
                points: {
                    show: true,
                    radius: .75,
                    lineWidth: 0.00001,
                    fillColor: "#222"},
                lines: {
                    show: false}}
        };

        var flot_ylog = {
            yaxis: {
                transform: _make_log_axis,
                inverseTransform: _inverse_make_log_axis}
        };

        var flot_xlog = {
            xaxis: {
                transform: _make_log_axis,
                inverseTransform: _inverse_make_log_axis}
        };

        var flot_timeseries = {
            xaxis: {
                axisLabel: 'Date/Time (GPS)',
                mode: 'time'}
        };

        function flot_axis_labels(x_label, y_label) {
            /* Create an flot options object with axis labels
            */
            return {yaxis: {
                        axisLabel: x_label},
                    xaxis: {
                        axisLabel: y_label}}
        }


        // Flot helpers

        function _hide_tick_labels(v, axis) {
            /* Make the ticklabels for the top/right axes empty
            */
            return ' ';
        }

        function _make_log_axis(v) {
            /* Transform an axis to log
            */
            return Math.log(v);
        }

        function _inverse_make_log_axis(v) {
            /* Inverse for transforming an axis to log
            */
            return Math.exp(v);
        }


        // Helper functions

        function parse_csv(csv) {
            /* Convert downloaded csv to 2D Array
            */
            var eol = '\n',
                delimiter = '\t',
                comments = '#';
            var data = [];
            var lines = csv.split(eol);
            while (lines[0][0] == comments) {
                lines.splice(0, 1);}
            for (var i = 0; i < lines.length; i++) {
                data.push(lines[i].split(delimiter));}
            return data;
        }

        function transpose(a) {
            /* Make the transpose of a 2D Array
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
