/* jSparc - Javascript library for HiSPARC

This library contains functions to work with HiSPARC data.


Warnings
--------

In HiSPARC we use GPS timestamps record event times, these timestamps
have nanosecond accuracy. The timestamp (normally only seconds) that
includes this nanosecond part is called the `extended timestamp`.
However, this number is so long it only fits in a 64-bit integer, but
javascript numbers only has 53 bits of accuracy. So using an extended
timestamp like "1380412812090648357" would result in
1380412812090648300. To work with extended timestamps, the values should
be stored as strings.

*/

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
            events_format = {'date': {'column': 0, 'name': 'Date', 'units': 'GPS date'},
                             'time': {'column': 1, 'name': 'Time', 'units': 'GPS time'},
                             'timestamp': {'column': 2, 'name': 'Timestamp', 'units': 's'},
                             'nanoseconds': {'column': 3, 'name': 'Nanoseconds', 'units': 'ns'},
                             'pulseheights': {'column': [4, 5, 6, 7], 'name': 'Pulseheight', 'units': 'ADC'},
                             'integral': {'column': [8, 9, 10, 11], 'name': 'Pulseintegral', 'units': 'ADC.ns'},
                             'number_of_mips': {'column': [12, 13, 14, 15], 'name': 'Number of MIPs', 'units': 'N'},
                             'arrival_times': {'column': [16, 17, 18, 19], 'name': 'Arrival time', 'units': 'ns'},
                             't_trigger': {'column': 20, 'name': 'Trigger time', 'units': 'ns'}},
            weather_format = {'date': {'column': 0, 'name': 'Date', 'units': 'GPS date'},
                              'time': {'column': 1, 'name': 'Time', 'units': 'GPS time'},
                              'timestamp': {'column': 2, 'name': 'Timestamp', 'units': 's'},
                              'temperature': {'column': [3, 4], 'name': 'Temperature', 'units': '°C'},
                              'humidity': {'column': [5, 6], 'name': 'Humidity', 'units': '%'},
                              'atmospheric_pressure': {'column': 7, 'name': 'Atmospheric pressure', 'units': 'hPa'},
                              'wind_direction': {'column': 8, 'name': 'Wind direction', 'units': '°'},
                              'wind_speed': {'column': 9, 'name': 'Wind speed', 'units': 'm/s'},
                              'solar_radiation': {'column': 10, 'name': 'Solar radiation', 'units': 'W/m/m'},
                              'uv_index': {'column': 11, 'name': 'UV index', 'units': '0-16'},
                              'evapotranspiration': {'column': 12, 'name': 'Evapotranspiration', 'units': 'mm'},
                              'rain_rate': {'column': 13, 'name': 'Rain rate', 'units': 'mm/h'},
                              'heat_index': {'column': 14, 'name': 'Heat index', 'units': '°C'},
                              'dew_point': {'column': 15, 'name': 'Dew point', 'units': '°C'},
                              'wind_chill': {'column': 16, 'name': 'Wind chill', 'units': '°C'}},
            lightning_format = {'date': {'column': 0, 'name': 'Date', 'units': 'GPS date'},
                                'time': {'column': 1, 'name': 'Time', 'units': 'GPS time'},
                                'timestamp': {'column': 2, 'name': 'Timestamp', 'units': 's'},
                                'nanoseconds': {'column': 3, 'name': 'Nanoseconds', 'units': 'ns'},
                                'latitude': {'column': 4, 'name': 'Latitude', 'units': '°'},
                                'longitude': {'column': 5, 'name': 'Longitude', 'units': '°'},
                                'current': {'column': 6, 'name': 'Current', 'units': 'A'}},
            eventtime_format = {'hour_of_day': {'column': 0, 'name': 'Hour of day', 'units': 'hour'},
                                'n_events': {'column': 1, 'name': 'Number of events', 'units': 'count'}},
            pulseheight_format = {'pulseheight_bins': {'column': 0, 'name': 'Pulseheight', 'units': 'mV'},
                                  'n_pulseheight': {'column': [1, 2, 3, 4], 'name': 'Occurrence', 'units': 'count'}},
            pulseintegral_format = {'integral_bins': {'column': 0, 'name': 'Pulseintegral', 'units': 'mV.ns'},
                                    'n_integral': {'column': [1, 2, 3, 4], 'name': 'Occurrence', 'units': 'count'}},
            temperature_format = {'timestamp': {'column': 0, 'name': 'Timestamp', 'units': 's'},
                                  'temperature_outside': {'column': 1, 'name': 'Temperature', 'units': '°C'}},
            barometer_format = {'timestamp': {'column': 0, 'name': 'Timestamp', 'units': 's'},
                                'atmospheric_pressure': {'column': 1, 'name': 'Atmospheric pressure', 'units': 'hPa'}},
            voltage_format = {'timestamp': {'column': 0, 'name': 'Timestamp', 'units': 's'},
                              'pmt_voltage': {'column': [1, 2, 3, 4], 'name': 'PMT voltage', 'units': 'V'}},
            current_format = {'timestamp': {'column': 0, 'name': 'Timestamp', 'units': 's'},
                              'pmt_current': {'column': [1, 2, 3, 4], 'name': 'PMT current', 'units': 'mA'}},
            coincidencenumber_format = {'n_stations': {'column': 0, 'name': 'Number of stations', 'units': 'count'},
                                        'n_coincidences': {'column': 1, 'name': 'Number of coincidences', 'units': 'count'}},
            coincidencetime_format = {'hour_of_day': {'column': 0, 'name': 'Hour of day', 'units': 'hour'},
                                      'n_coincidences': {'column': 1, 'name': 'Number of coincidences', 'units': 'count'}},
            gps_format = {'timestamp': {'column': 0, 'name': 'Timestamp', 'units': 's'},
                          'latitude': {'column': 1, 'name': 'Latitude', 'units': '°'},
                          'longitude': {'column': 2, 'name': 'Longitude', 'units': '°'},
                          'altitude': {'column': 3, 'name': 'Altitude', 'units': 'm'}};

        jsparc.API_URL = API_URL;
        jsparc.DATA_URL = DATA_URL;
        jsparc.JSPARC_URL = JSPARC_URL;
        jsparc.events_format = events_format;
        jsparc.weather_format = weather_format;
        jsparc.lightning_format = lightning_format;
        jsparc.eventtime_format = eventtime_format;
        jsparc.pulseheight_format = pulseheight_format;
        jsparc.pulseintegral_format = pulseintegral_format;
        jsparc.temperature_format = temperature_format;
        jsparc.barometer_format = barometer_format;
        jsparc.voltage_format = voltage_format;
        jsparc.current_format = current_format;
        jsparc.coincidencenumber_format = coincidencenumber_format;
        jsparc.coincidencetime_format = coincidencetime_format;
        jsparc.gps_format = gps_format;

        // Create format for unknown type

        jsparc.unknown_format = unknown_format;
        function unknown_format(url) {
            /* Create a generic column format for unknown dataset types
            */
            var generic_format = {} ,
                n_columns = datasets[url].data[0].length;
            for (var i = 0; i < n_columns; i++) {
                generic_format['column_' + i] = {'column': i, 'name': 'Column ' + i, 'units': '?'};}
            return generic_format;
        }

        // Data container

        jsparc.datasets = function() {return datasets;};
        var datasets = {};


        // Datasets

        jsparc.download_dataset = download_dataset;
        function download_dataset(station_number, startdate, enddate, type) {
            /* Store the result of downlaoding data to the datasets

            The url will be used as key to reference the data

            */
            // var url = data_example(station_number, startdate, enddate, type);
            var url = data_download(station_number, startdate, enddate, type);
            if (datasets[url]) {
                alert('That dataset is already available');
                return;}
            return get_csv(url)
                   .done(function(data) {
                       if (!data.length) {
                           alert('No data found for the requested variables');}
                       else {
                           datasets[url] = ({data: data,
                                             station_number: station_number,
                                             startdate: startdate,
                                             enddate: enddate,
                                             type: type,
                                             url: url});
                           update_dataset_table();}
                   });
        }

        jsparc.load_dataset = load_dataset;
        function load_dataset(file, done) {
            /* Load datafiles from the local machine

            The filename will be used as key to reference the data

            */
            var reader = new FileReader();
            if (datasets[file.name]) {
                alert('That dataset is already available');
                return;}
            reader.onload = function(event) {
                var data = parse_csv(event.target.result),
                    info = parse_filename(file.name);
                if (!data.length) {
                    alert('No data in the chosen file');}
                else {
                    datasets[file.name] = ({data: data,
                                            station_number: info.station_number,
                                            startdate: info.startdate,
                                            enddate: info.enddate,
                                            type: info.type,
                                            url: file.name});
                    update_dataset_table();}
                };
            reader.readAsText(file);

            // Return the reader object so we can listen for the onloadend event
            // and easily recheck all previous checked radio buttons
            return reader;
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

            Data from the ESD is already sorted.
            However, this can be useful after merging datasets

            */
            return data.sort(sort_extendedtimestamps);
        }

        jsparc.sort_weather = sort_weather;
        function sort_weather(data) {
            /* Sort weather data by timestamps

            Data from the ESD is already sorted.
            However, this can be useful after merging datasets

            */
            return data.sort(sort_timestamps);
        }

        jsparc.sort_extendedtimestamps = sort_extendedtimestamps;
        function sort_extendedtimestamps(a, b) {
            /* Sort events by extended timestamps

            First sort by timestamp, if they are the same, use the nanoseconds

            */
            var t = events_format.timestamp.column,
                n = events_format.nanoseconds.column;
            return (a[t] == b[t]) ? a[n] - b[n] : a[t] - b[t];
        }

        jsparc.sort_timestamps = sort_timestamps;
        function sort_timestamps(a, b) {
            /* Sort weather data by timestamp
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
            combined_dataset = combined_dataset.concat.apply(
                    [], urls.map(function(url) {return datasets[url].data;}));
            return combined_dataset;
        }

        jsparc.make_ext_timestamp_str = make_ext_timestamp_str;
        function make_ext_timestamp_str(timestamp, nanoseconds) {
            /* Combine timestamp and nanoseconds to one value

            See Warnings

            */
            if (timestamp instanceof Array) {
                var ext_timestamps = [];
                for (var i = 0; i < timestamp.length; i++) {
                    var ns = nanoseconds instanceof Array ? nanoseconds[i] : null;
                    ext_timestamps.push(make_ext_timestamp(timestamp[i], ns));}
                return ext_timestamps;}
            nanoseconds = nanoseconds || null;
            // return timestamp * 1e9 + nanoseconds;
            return timestamp.toString() + pad_zero(nanoseconds, 9);
        }

        jsparc.make_ext_timestamp = make_ext_timestamp;
        function make_ext_timestamp(timestamp, nanoseconds) {
            /* Combine timestamp and nanoseconds to one value

            See Warnings

            */
            if (timestamp instanceof Array) {
                var ext_timestamps = [];
                for (var i = 0; i < timestamp.length; i++) {
                    var ns = nanoseconds instanceof Array ? nanoseconds[i] : null;
                    ext_timestamps.push(make_ext_timestamp(timestamp[i], ns));}
                return ext_timestamps;}
            nanoseconds = nanoseconds || null;
            return timestamp * 1e9 + nanoseconds;
            // return timestamp.toString() + pad_zero(nanoseconds, 9);
        }

        jsparc.make_javascript_timestamp = make_javascript_timestamp;
        function make_javascript_timestamp(timestamp, nanoseconds) {
            /* Combine timestamp and nanoseconds to one value

            flot recognizes javascript timestamps for time series data

            */
            if (timestamp instanceof Array) {
                nanoseconds = nanoseconds || [];
                var js_timestamps = [];
                for (var i = 0; i < timestamp.length; i++) {
                    var ns = nanoseconds instanceof Array ? nanoseconds[i] : null;
                    js_timestamps.push(make_javascript_timestamp(timestamp[i], ns));}
                return js_timestamps;}
            nanoseconds = nanoseconds || null;
            return timestamp * 1e3 + Math.round(nanoseconds / 1e6);
        }

        jsparc.get_ext_timestamp = get_ext_timestamp;
        function get_ext_timestamp(url) {
            /* Get ext_timestamps

            See Warnings

            */
            var type = datasets[url].type,
                ext_timestamps;
            if (type == 'events') {
                ext_timestamps = make_ext_timestamp(get_column('timestamp', url),
                                                    get_column('nanoseconds', url));}
            else {
                ext_timestamps = make_ext_timestamp(get_column('timestamp', url));}
            return ext_timestamps;
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
                column = [],
                format;

            if (column_name == 'event_rate') {
                return generate_event_rate(url);}

            if (jsparc.hasOwnProperty(type + '_format')) {
                format = jsparc[type + '_format'];}
            else {
                format = unknown_format(url);}

            try {
                var col = format[column_name].column;}
            catch (e) {
                var error = 'No column named: ' + column_name + ', in dataset: ' + url;
                alert(error);
                throw error;}

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

        jsparc.generate_event_rate = generate_event_rate;
        function generate_event_rate(url) {
            /* Generate event rate from timestamps
            */
            var window = 300,
                data = get_column('timestamp', url),
                bins = range(data[0], data[data.length-1], window),
                hist = histogram(data, bins),
                rate = linear_interpolation(data, bins, hist[0]);
            for (var i = 0; i < rate.length; i++) {
                rate[i] /= window;}
            return rate;
        }


        // User Interface

        jsparc.make_datepicker = make_datepicker;
        function make_datepicker(target, offset) {
            /* Create an date input field

            Possible choices should be limited to dates between start of
            HiSPARC (9/1/2004) and yesterday.

            Requires jquery-ui.js, jquery-ui-timepicker-addon.js

            */
            var offset = (offset) ? offset : -1;
            target.datetimepicker({minDate: new Date(2004, 1, 1),
                                   maxDate: -1,
                                   timezone:'UTC',
                                   dateFormat: 'yy-mm-dd'});
            target.datepicker("setDate", offset);
        }

        jsparc.make_station_select = make_station_select;
        function make_station_select(target, type) {
            /* Create a select menu to choose a single station
            */
            var url;
            if (type == 'events') {
                url = api_stations_with_data();}
            else if (type == 'weather') {
                url = api_stations_with_weather();}
            else {
                url = api_stations();}
            return get_json(url)
                   .done(function(station_json) {
                       var select = $('<select>'),
                           selected = Math.round(Math.random() * (station_json.length - 1)),
                           number,
                           name;
                       for (var i = 0; i < station_json.length; i++) {
                           number = station_json[i].number;
                           name = station_json[i].name;
                           if (i == selected) {
                               select.append($('<option>').text(number + ' - ' + name)
                                                          .attr('value', number)
                                                          .prop('selected', true));}
                           else {
                               select.append($('<option>').text(number + ' - ' + name)
                                                          .attr('value', number));}}
                       target.html(select);
                   });
        }

        jsparc.set_dataset_list_controls = set_dataset_list_controls;
        function set_dataset_list_controls(target) {
            var target = target || $('#dataset_list');
            target.on('click', 'td.delete', function() {
                // Use array to store the set names ('set1' or 'set2') of div's
                // that should be deleted
                var set_array = [];

                // Get selected radio button i.e. set1 or set2 in row we want
                // to remove to know which div to empty out
                $(this).parent().find('input:checked').each(function() {
                    set_array.push($(this).attr('name'));});

                // find and empty divs
                if (set_array.length) {
                    $.each(set_array, function( index, value ){
                        $('#' + value + '_variables').empty();});}

                // remove the dataset
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
            firstrow.append($('<th>').text('Select').attr('colspan', 2));
            firstrow.append($('<th>').text('Station'));
            firstrow.append($('<th>').text('Type'));
            firstrow.append($('<th>').text('Start date'));
            firstrow.append($('<th>').text('End date'));
            firstrow.append($('<th>').text('Entries'));
            firstrow.append($('<th>').text('Preview'));
            firstrow.append($('<th>').text('Download'));
            firstrow.append($('<th>').text('Remove'));
            list.append(firstrow);
            for (var i in datasets) {
                var row = $('<tr>').attr('name', datasets[i].url);
                row.append($('<td>').append($('<input>').attr('type', 'radio')
                                    .attr('title', 'Choose which dataset you want to use.' +
                                                   'Using both radio buttons you could select different datasets to interpolate data.')
                                    .attr('name', 'set1').attr('alt', 'set2').val(i)));
                row.append($('<td>').append($('<input>').attr('type', 'radio')
                                    .attr('title', 'Select a second dataset, for example from a different row, to interpolate data.')
                                    .attr('name', 'set2').attr('alt', 'set1').val(i)));
                row.append($('<td>').text(datasets[i].station_number).addClass('station'));
                row.append($('<td>').text(datasets[i].type).addClass('type'));
                row.append($('<td>').text(datasets[i].startdate).addClass('start'));
                row.append($('<td>').text(datasets[i].enddate).addClass('end'));
                row.append($('<td>').text(datasets[i].data.length).addClass('entries'));
                row.append($('<td>').text('show').addClass('preview').attr('name', datasets[i].url));
                row.append($('<td>').text('csv').addClass('download')
                                    .attr('name', datasets[i].url + '&download=true'));
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

        jsparc.make_variable_plot_table = make_variable_plot_table;
        function make_variable_plot_table(url, target) {
            /* Make an overview of available variables in the dataset for plot
            */
            var type = datasets[url].type,
                target = target || $('#set_variables'),
                format,
                header = $('<span>').addClass('key').text(datasets[url].station_number + ' (' + datasets[url].type + ')'),
                list = $('<table>').attr('name', url),
                firstrow = $('<tr>');
                eventraterow = $('<tr>');
            if (jsparc.hasOwnProperty(type + '_format')) {
                format = jsparc[type + '_format'];}
            else {
                format = unknown_format(url);}

            firstrow.append($('<th>').text('x-Axis'));
            firstrow.append($('<th>').text('y-Axis'));
            firstrow.append($('<th>').text('Variable'));
            firstrow.append($('<th>').text('Units'));
            list.append(firstrow);
            /* Add Event Rate as variable
            */
            if (format.hasOwnProperty('timestamp')) {
                eventraterow.append($('<td>').append($('<input>').attr('type', 'radio')
                            .attr('name', 'x-axis').attr('alt', 'y-axis')
                            .data('label', 'Event rate [Hz]').val('event_rate')));
                eventraterow.append($('<td>').append($('<input>').attr('type', 'radio')
                            .attr('name', 'y-axis').attr('alt', 'x-axis')
                            .data('label', 'Event rate [Hz]').val('event_rate')));
                eventraterow.append($('<td>').text('Event rate'));
                eventraterow.append($('<td>').text('Hz').addClass('units'));
                list.append(eventraterow);}
            for (var i in format) {
                if (i == 'date' || i == 'time') {continue}
                var row = $('<tr>').attr('name', i);
                row.append($('<td>').append($('<input>').attr('type', 'radio')
                   .attr('name', 'x-axis').attr('alt', 'y-axis')
                   .data('label', format[i].name + ' [' + format[i].units + ']').val(i)));
                row.append($('<td>').append($('<input>').attr('type', 'radio')
                   .attr('name', 'y-axis').attr('alt', 'x-axis')
                   .data('label', format[i].name + ' [' + format[i].units + ']').val(i)));
                row.append($('<td>').text(format[i].name).addClass('variable'));
                row.append($('<td>').text(format[i].units).addClass('units'));
                list.append(row);}
            target.html(header);
            target.append(list);
        }

        jsparc.create_dataset_table = create_dataset_table;
        function create_dataset_table(url, target, limit) {
            /* Create a table representation of a dataset
            */
            var dataset = datasets[url],
                type = dataset.type,
                target = (target) ? target : $('#dataTable'),
                limit = (limit) ? limit : dataset.data.length,
                table = $('<table>').addClass(dataset.type);

            if (limit > dataset.data.length) {
                limit = dataset.data.length;}

            // Header row
            var firstrow = $('<tr>'),
                format;

            if (jsparc.hasOwnProperty(type + '_format')) {
                format = jsparc[type + '_format'];}
            else {
                format = unknown_format(url);}

            firstrow.append($('<th>').text('#'));
            for (var key in format) {
                var ncol = (format[key].column.length) ? format[key].column.length : 1;
                firstrow.append($('<th>').text(format[key].name).attr('colspan', ncol));}
            if (type == 'events') {
                firstrow.append($('<th>').text('trace'));}
            table.append(firstrow);

            // Data rows
            for (var i = 0; i < dataset.data.length; i++) {
                var row = $('<tr>');
                row.append($('<td>').text(i + 1));
                for (var j = 0; j < dataset.data[i].length; j++) {
                    row.append($('<td>').text(dataset.data[i][j]));}
                if (type == 'events') {
                    var t = make_ext_timestamp_str(dataset.data[i][2], dataset.data[i][3]);
                    var trace_url = api_event_trace(dataset.station_number, t);
                    row.append($('<td>').text('show').addClass('trace').attr('data-url', trace_url));}
                table.append(row);
                if (limit != dataset.data.length && i == Math.floor(limit / 2) - 1) {
                    var truncrow = $('<tr>');
                    truncrow.append($('<td>')
                                    .text('... truncated table, click here to show more rows ...')
                                    .attr('colspan', dataset.data[0].length + 1)
                                    .css({'text-align': 'left',
                                    	  'cursor': 'pointer'})
                                    .click(function() {create_dataset_table(url, target, limit * 2);}));
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

        jsparc.api_man = api_man;
        function api_man() {
            return API_URL;}

        jsparc.api_stations = api_stations;
        function api_stations() {
            return build_url([API_URL, 'stations', '']);}

        jsparc.api_stations_in_subcluster = api_stations_in_subcluster;
        function api_stations_in_subcluster(subcluster_number) {
            return build_url([API_URL, 'subclusters', subcluster_number, '']);}

        jsparc.api_subclusters = api_subclusters;
        function api_subclusters() {
            return build_url([API_URL, 'subclusters', '']);}

        jsparc.api_subclusters_in_cluster = api_subclusters_in_cluster;
        function api_subclusters_in_cluster(cluster_number) {
            return build_url([API_URL, 'clusters', cluster_number, '']);}

        jsparc.api_clusters = api_clusters;
        function api_clusters() {
            return build_url([API_URL, 'clusters', '']);}

        jsparc.api_clusters_in_country = api_clusters_in_country;
        function api_clusters_in_country(country_number) {
            return build_url([API_URL, 'countries', country_number, '']);}

        jsparc.api_countries = api_countries;
        function api_countries() {
            return build_url([API_URL, 'countries', '']);}

        jsparc.api_stations_with_data = api_stations_with_data;
        function api_stations_with_data(year, month, day) {
            return build_url([API_URL, 'stations/data', year, month, day, '']);}

        jsparc.api_stations_with_weather = api_stations_with_weather;
        function api_stations_with_weather(year, month, day) {
            return build_url([API_URL, 'stations/weather', year, month, day, '']);}

        jsparc.api_station_info = api_station_info;
        function api_station_info(station_number, year, month, day) {
            return build_url([API_URL, 'station', station_number, year, month, day, '']);}

        jsparc.api_has_data = api_has_data;
        function api_has_data(station_number, year, month, day) {
            return build_url([API_URL, 'station', station_number, 'data', year, month, day, '']);}

        jsparc.api_has_weather = api_has_weather;
        function api_has_weather(station_number, year, month, day) {
            return build_url([API_URL, 'station', station_number, 'weather', year, month, day, '']);}

        jsparc.api_configuration = api_configuration;
        function api_configuration(station_number, year, month, day) {
            return build_url([API_URL, 'station', station_number, 'config', year, month, day, '']);}

        jsparc.api_number_of_events = api_number_of_events;
        function api_number_of_events(station_number, year, month, day, hour) {
            return build_url([API_URL, 'station', station_number, 'num_events', year, month, day, hour, '']);}

        jsparc.api_event_trace = api_event_trace;
        function api_event_trace(station_number, ext_timestamp) {
            return build_url([API_URL, 'station', station_number, 'trace', ext_timestamp, '']);}

        // Process urls
        jsparc.build_url = build_url;
        function build_url(components) {
            return components.join('/').replace(/\/+$/,'/');}

        // Data Download

        jsparc.data_example = data_example;
        function data_example(station_number, startdate, enddate, type) {
            /* Construct URLs to access local example data
            */
            if (type == 'events') {
                return './examples/events-s501-20130910.csv';}
                //return './examples/events-s8006-20130910.csv';}
            else {
                return './examples/weather-s501-20130910.csv';}}
                //return './examples/weather-s8006-20130910.csv';}}

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
            return [JSPARC_URL, 'get_coincidence', ''].join('/') + '?' + $.param(get_coincidence);}

        jsparc.jsparc_result = jsparc_result;
        function jsparc_result(result) {
            /* Create url with query to send the jSparc results to the server

            result should be an object with the following keys:
            session_title, session_pin, student_name, pk, logEnergy, error, lon, lat

            */
            return [JSPARC_URL, 'result', ''].join('/') + '?' + $.param(result);}


        // Flot
        // Requires jquery.flot.js

        jsparc.make_plot = make_plot;
        function make_plot(target, data) {
            /* Create a plot of data

            data can be a single dataset: [[x1, y1], [x2, y2], ... ]
            or consist of multiple datasets i.e. serie 1 and 2: [[[x11, y11], ... ], [[x21, y21], ...], ...]

            Warning: This function filters all data points for which
            either the x or y value is -999 or -1.

            */
            var target = (target) ? target : $('#plot'),
                datas = [{data: [1, 1], lines: {show: false}, xaxis: 2, yaxis: 2}];

            if (data[0][0] instanceof Array) {
                for (var i = data.length - 1; i >= 0; i--) {
                    datas.unshift({data: data[i], yaxis: 1});}}
            else {
                datas.unshift({data: data, yaxis: 1});}

            return $.plot(target, datas, flot_active);
        }

        jsparc.download_plot = download_plot;
        function download_plot(target) {
            /* Open a new window with a png version (base64 encoded) of the plot
            */
            var target = (target) ? target : $('#plot');
            var dataurl = target.find('.flot-base')[0].toDataURL();
            window.open(dataurl, '_blank', 'height=450, width=820, toolbar=yes');
        }

        jsparc.zip_data = zip_data;
        function zip_data(x, y) {
            /* Create a zipped array of 2 arrays

            Give two equal length arrays (x, y)
            They will be zipped to: [[x1, y1], [x2, y2], [x3, y3], ...]

            If x OR y contains multiple arrays each will be zipped with the other:
            [[[x1, y11], [x2, y12], ...], [[x1, y21], [x2, y22], ...], ...]
            [[[x11, y1], [x12, y2], ...], [[x21, y1], [x22, y2], ...], ...]

            If both x AND y contain multiple arrays each will be zipped with their counterpart:
            [[[x11, y11], [x12, y12], ...], [[x21, y21], [x22, y22], ...], ...]

            */
            var data = [],
                i;
            if (x[0] instanceof Array && y[0] instanceof Array) {
                if (x.length == y.length) {
                    for (i = 0; i < x.length; i++) {
                        data[i] = zip_data(x[i], y[i]);}}
                else {
                    for (i = 0; i < x.length; i++) {
                        for (var j = 0; j < y.length; j++) {
                            data[i + j * (y.length - 1)] = zip_data(x[i], y[j]);}}}}
            else if (x[0] instanceof Array) {
                for (i = 0; i < x.length; i++) {
                    data[i] = zip_data(x[i], y);}}
            else if (y[0] instanceof Array) {
                for (i = 0; i < y.length; i++) {
                    data[i] = zip_data(x, y[i]);}}
            else {
                for (i = 0; i < x.length; i++) {
                    data.push([x[i], y[i]]);}}
            return data;
        }

        jsparc.linear_interpolation = linear_interpolation;
        function linear_interpolation(x1, x2, y2) {
            /* Make a linear interpolation to get y2 to be the same length as x1
            */
            var y1 = [];
            if (y2[0] instanceof Array) {
                for (var k = 0; k < y2.length; k++) {
                    y1[k] = [];}}
            for (var i = 0; i < x1.length; i++) {
                var j = bisect_search(x1[i], x2);
                if (y2[0] instanceof Array) {
                    for (var k = 0; k < y2.length; k++) {
                        var dydx = (y2[k][j + 1] - y2[k][j]) / (x2[j + 1] - x2[j]);
                        y1[k][i] = y2[k][j] + dydx * (x1[i] - x2[j]);}}
                else {
                    var dydx = (y2[j + 1] - y2[j]) / (x2[j + 1] - x2[j]);
                    y1.push(y2[j] + dydx * (x1[i] - x2[j]));}}
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

            Apply these options to the float_base options

            line style (histogram, line, scatter)
            axis (x, y: linear, log)
            variables (x, y: labels)

            */
            var extend_default = [true, {}, flot_base];
            for (var i = 0; i < options.length ; i++) {
                extend_default.push(options[i]);}
            flot_active = $.extend.apply([], extend_default);
        }

        jsparc.add_flot_options = add_flot_options;
        function add_flot_options(options) {
            /* Append plot options to the currently active options
            */
            flot_active = $.extend(true, {}, flot_active, options);
        }


        // Flot options
        // Requires jquery.flot.axislabels.js, jquery.flot.time.js

        jsparc.flot_active = function() {return flot_active;};
        var flot_active = {};

        jsparc.flot_base = function() {return flot_base;};
        var flot_base = {
            colors: ['#222', '#D22', '#1C1', '#1CC', '#C1C', '#15C', '#AA1', '#C51'],
            legend: {show: false},
            xaxis: {
                show: true,
                font: {
                    size: 14,
                    lineHeight: 14,
                    family: 'sans-serif',
                    color: '#000'},
                color: '#000',
                tickColor: '#000',
                labelHeight: 23,
                tickLength: 4,
                axisLabelUseCanvas: true},
            yaxis: {
                show: true,
                font: {
                    size: 14,
                    lineHeight: 14,
                    family: 'sans-serif',
                    color: '#000'},
                color: '#000',
                tickColor: '#000',
                tickLength: 4,
                axisLabelUseCanvas: true},
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
                points: {
                    show: false,
                    symbol: 'pixel',
                    radius: .9,
                    lineWidth: 0.00001,
                    fill: true,
                    fillColor: false},
                lines: {
                    lineWidth: 1.5,
                    steps: false},
                shadowSize: 0},
            grid: {
                aboveData: 1,
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
                    show: true},
                lines: {
                    show: false}}
        };

        jsparc.flot_ylog = function() {return flot_ylog;};
        var flot_ylog = {
            yaxis: {
                mode: 'log',
                transform: _make_log_axis,
                inverseTransform: _inverse_make_log_axis}
        };

        jsparc.flot_xlog = function() {return flot_xlog;};
        var flot_xlog = {
            xaxis: {
                mode: 'log',
                transform: _make_log_axis,
                inverseTransform: _inverse_make_log_axis}
        };

        jsparc.flot_timeseries = function() {return flot_timeseries;};
        var flot_timeseries = {
            series: {
                points: {
                    show: true},
                lines: {
                    show: false}},
            xaxis: {
                axisLabel: 'Date/Time (GPS)',
                mode: 'time'}
        };

        jsparc.flot_x_axis_labels = flot_x_axis_labels;
        function flot_x_axis_labels(x_label) {
            /* Create an flot options object with the x axis labels
            */
            return {xaxis: {
                        axisLabel: x_label}};
        }

        jsparc.flot_y_axis_labels = flot_y_axis_labels;
        function flot_y_axis_labels(y_label) {
            /* Create an flot options object with the y axis labels
            */
            return {yaxis: {
                        axisLabel: y_label}};
        }

        jsparc.flot_none = function() {return flot_none;};
        var flot_none = {
        };

        jsparc.flot_xlimits = flot_xlimits;
        function flot_xlimits(min, max) {
            /* Set plot limits for the x-axis, use null for no limit.
            */
            if (isNaN(min)) {min = null;}
            if (isNaN(max)) {max = null;}
            return {xaxis: {
                        min: min,
                        max: max}};
        }

        jsparc.flot_ylimits = flot_ylimits;
        function flot_ylimits(min, max) {
            /* Set plot limits for the y-axis, use null for no limit.
            */
            if (isNaN(min)) {min = null;}
            if (isNaN(max)) {max = null;}
            return {yaxis: {
                        min: min,
                        max: max}};
        }


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

        jsparc.parse_filename = parse_filename;
        function parse_filename(filename) {
            /* Get data type, station number, start and end date from csv name

            name should be of format: '[type]-s[station number]-[date]'
            where date can be one of the following formats:
                '[start date]'
                '[start date]_[end date]'
                '[start date]_[start time]_[end date]_[end time]'
            where date should be yyyymmdd and time hhmmss

            */
            var delimiter = '-',
                date_delimiter = '_',
                empty = '',
                extension = '.csv';

            var station_number, start, end;

            try {
                var parts = filename.replace(extension, empty).split(delimiter);
                if (parts[1][0] == 's') {
                    station_number = parts[1].substring(1)}
                else {
                    station_number = parts[1]}
                if (parts.length > 2) {
                    var date = parts[2].split(date_delimiter);

                    if (date.length == 1) {
                        start = date[0].substr(0, 4) + '-' +
                                date[0].substr(4, 2) + '-' +
                                date[0].substr(6, 2) + ' 00:00';
                        end = '1 day later';}
                    else if (date.length == 2) {
                        start = date[0].substr(0, 4) + '-' +
                                date[0].substr(4, 2) + '-' +
                                date[0].substr(6, 2) + '00:00';
                        end = date[1].substr(0, 4) + '-' +
                              date[1].substr(4, 2) + '-' +
                              date[1].substr(6, 2) + ' 00:00';}
                    else if (date.length == 4) {
                        start = date[0].substr(0, 4) + '-' +
                                date[0].substr(4, 2) + '-' +
                                date[0].substr(6, 2) + ' ' +
                                date[1].substr(0, 2) + ':' +
                                date[1].substr(2, 2);
                        end = date[2].substr(0, 4) + '-' +
                              date[2].substr(4, 2) + '-' +
                              date[2].substr(6, 2) + ' ' +
                              date[3].substr(0, 2) + ':' +
                              date[3].substr(2, 2);}}
                else {
                    start = 'start';
                    end = 'now';}

                return {'type': parts[0],
                        'station_number': station_number,
                        'startdate': start,
                        'enddate': end};}
            catch (e) {
                return {'type': 'other',
                        'station_number': filename,
                        'startdate': 'unknown',
                        'enddate': 'unknown'};}
        }

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
            while (lines.length != 0 && lines[0][0] == comments) {
                lines.splice(0, 1);}
            while (lines.length != 0 && lines[lines.length - 1] == empty) {
                lines.splice(lines.length - 1, 1);}
            for (var i = 0; i < lines.length; i++) {
                values = lines[i].split(delimiter);
                for (var j = 0; j < values.length; j++) {
                    // If parsed float value is different from original use the string value (date or time)
                    values[j] = (parseFloat(values[j]) == values[j]) ? parseFloat(values[j]) : values[j];}
                data.push(values);}
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
        function histogram(a, bins) {
            /* Compute the histogram of a set of data.

            The last bin includes values that would be equal to the edge
            of the next bin, i.e. [[1, 2), [2, 3), [3, 4), [4, 5]].
            The returned bins are the left edges of the bins.

            */
            var nbins, mn, mx;

            if (bins instanceof Array) {
                // Use given bins
                nbins = bins.length;
                mn = bins[0];
                mx = bins[nbins - 1] + (bins[1] - bins[0]);}
            else {
                // Determine min/max for bin range
                nbins = bins || 100;
                if (a[0] instanceof Array) {
                    mn = a[0][0];
                    mx = a[0][0];
                    for (var i = 0; i < a.length; i++) {
                        for (var j = 0; j < a[i].length; j++) {
                            mn = (a[i][j] > mn) ? mn : a[i][j];
                            mx = (a[i][j] < mx) ? mx : a[i][j];}}}
                else {
                    mn = a[0];
                    mx = a[0];
                    for (var i = 0; i < a.length; i++) {
                        mn = (a[i] > mn) ? mn : a[i];
                        mx = (a[i] < mx) ? mx : a[i];}}
                var bin_width = (mx - mn) / nbins;
                bins = range(mn, mx - (0.001 * bin_width), bin_width);}

            if (bins[0] === undefined) {
                return [[], []]}

            var n = [];

            if (a[0] instanceof Array) {
                // histogram for each set of values
                for (var i = 0; i < a.length; i++) {
                    n[i] = histogram(a[i], bins)[0];}
                return [n, bins];}

            for (var i = 0; i < nbins; i++) {
                // prepare count array
                n[i] = 0;}

            for (var j = 0; j < a.length; j++) {
                // bin the values
                if (a[j] == mx) {
                    n[nbins - 1]++;}
                else if (a[j] < mn || a[j] > mx) {
                    // Due to rounding issues the max value in the
                    // array may be larger than the max bin edge.
                    // This value is currently ignored..
                    }
                else {
                    var i = Math.floor((a[j] - mn) / (mx - mn) * nbins);
                    n[i]++;}}

            return [n, bins];
        }

        jsparc.is_data_empty = is_data_empty
        function is_data_empty(data) {
            /* returns true if there is no data in the array

            Expects data in the form of:
            [[[x11, y11], [x12, y12], ...], [[x21, y21], [x22, y22], ...], ...]
            Empty:
            [[], [], []]

            */
            for (var i = 0; i < data.length; i++) {
                if (data[i].length) {
                    return false;}}
            return true;
        }

        jsparc.remove_invalid_log_values = remove_invalid_log_values;
        function remove_invalid_log_values(data, axis) {
            /* Remove all zero and negative values from the chosen axis

            These points are not valid for logarithmic axes.
            Choose axis 0 for x values and axis 1 for y values.

            */
            return data.filter(function(v) {return v[0] > 0 && v[1] > 0;})
        }

        jsparc.remove_invalid_log_values_1d = remove_invalid_log_values_1d;
        function remove_invalid_log_values_1d(data) {
            /* Remove all zero and negative values

            These values are not valid for logarithmic axes.

            */
            return data.filter(function(v) {return v > 0;})
        }

        jsparc.remove_error_values = remove_error_values;
        function remove_error_values(data) {
            /* Remove error values from the data points

            Removes a point if either the x or y value is -999, -1 or NaN.

            */
            return data.filter(function(v) {return v[0] !== -999 && v[0] !== -1 && !isNaN(v[0]) &&
                                                   v[1] !== -999 && v[1] !== -1 && !isNaN(v[1]);})
        }

        jsparc.remove_error_values_1d = remove_error_values_1d;
        function remove_error_values_1d(data) {
            /* Remove error values from the data points from 1d array

            Removes an element if the value is -999, -1 or NaN.

            */
            return data.filter(function(v) {return v !== -999 && v !== -1 && !isNaN(v);})
        }

        jsparc.sort_stringvalues = sort_stringvalues;
        function sort_stringvalues(a, b) {
            /* Sort by the value of the string

            Prevents this: ['1', '10', '11', '2', '23', '9']

            */
            return parseFloat(a) - parseFloat(b);
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

        jsparc.enable_radio_set = enable_radio_set;
        function enable_radio_set(name) {
            /* Enable all radio buttons of a certain set (name)
            */
            var input = $('input[name=' + name + ']');
            input.removeAttr('disabled');
        }

        jsparc.disable_radio_set = disable_radio_set;
        function disable_radio_set(name) {
            /* Enable all radio buttons of a certain set (name)
            */
            var input = $('input[name=' + name + ']');
            input.prop('disabled', true);
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

        jsparc.show_id = show_id;
        function show_id(id) {
            /* Goto element with the given id if it is not visible
            */
            if (!jsparc.element_in_viewport($('#' + id)[0])) {
                location.href = "#";
                location.href = "#" + id;}
        }

        jsparc.element_in_viewport = element_in_viewport;
        function element_in_viewport(target) {
            /* Check if an element is visible in the current viewport
            */
            var rect = target.getBoundingClientRect();
            return (rect.top < $(window).height() - 20 && rect.bottom > 20 &&
                    rect.left < $(window).width() - 20 && rect.right > 20);
        }
    }

    $.jsparc = function() {
        var jsparc = new jSparc();
        return jsparc;
    };

})(jQuery);
