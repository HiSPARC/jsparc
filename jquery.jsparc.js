(function($) {
    function jSparc() {
        var jsparc = this,
            API_URL = 'http://data.hisparc.nl/api',
            DATA_URL = 'http://data.hisparc.nl/data',
            JSPARC_URL = "http://data.hisparc.nl/jsparc";
            datasets = {},
            events_columns = ['date', 'time',
                              'timestamp', 'nanoseconds',
                              'pulseheights(4x)',
                              'integral(4x)',
                              'number_of_mips(4x)',
                              'arrival_times(4x)'],
            weather_columns = ['date', 'time', 'timestamp',
                               'temperature_inside', 'temperature_outside',
                               'humidity_inside', 'humidity_outside',
                               'atmospheric_pressure',
                               'wind_direction', 'wind_speed',
                               'solar_radiation', 'uv_index',
                               'evapotranspiration', 'rain_rate',
                               'heat_index', 'dew_point', 'wind_chill'];

        // Public functions
        jsparc.make_station_select = make_station_select;
        jsparc.make_datepicker = make_datepicker;
        jsparc.download_dataset = download_dataset;
        jsparc.remove_dataset = remove_dataset;
        jsparc.datasets = function() {return datasets};


        function get_multiple_json(urls) {
            /* Asynchronously download multiple urls of type json
            */
            return $.when.apply(null, urls.map(function (url) {return get_json(url);}));
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
            return data.sort(sortfunction)
        }

        function sortfunction(a, b) {
            /* Sort by extended timestamps
 
            First sort by timestamp, if they are the same, use the nanoseconds

            */
            return (a[2] == b[2]) ? a[3] - b[3] : a[2] - b[2]
        }

        function combine_datasets(urls) {
            /* Concat several array into one
            */
            var datatype = datasets[urls[0]].type;
            for (i in urls) {
                if (urls[i].indexOf(datatype) == -1) {
                    return false}} // Not all of same type!

            var combined_dataset = [];
            combined_dataset = combined_dataset.concat.apply([], urls.map(function (url) {return datasets[url].data;}))
            return combined_dataset
        }

        function make_ext_timestamp(timestamp, nanoseconds) {
            /* Combine timestamp and nanoseconds to one value
            */
            return timestamp * 1e9 + nanoseconds
        }

        function make_datepicker(target) {
            /* Create an date input field
            
            Possible choices are limited to dates between start of
            HiSPARC (9/1/2004) and yesterday.

            Requires jQuery UI

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
                       for (var i in station_json) {
                           number = station_json[i].number;
                           name = station_json[i].name;
                           select.append($('<option>').attr('value', number).text(number + ' - ' + name));}
                       target.html(select);
                   });
        }

        function set_dataset_list_controls(target) {
            var target = target || $('#dataset_list');
            target.on("click", "span.delete", function() {remove_dataset_from_list(this)})
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

        // URL formatters

        // API
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

        function api_station_info(station_number) {
            return [API_URL, 'station', station_number, ''].join('/');}

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
            return [DATA_URL, station_number, type].join('/') + '?start=' + startdate + '&end=' + enddate;}

        // jSparc
        function jsparc_get_coincidence(get_coincidence) {
            /* Create url with query to get a coincidence from a jSparc session
            
            get_coincidence should be an object with the following keys:
            session_title, session_pin, student_name

            */
            return [JSPARC_URL, 'get_coincidence', null].join('/') +  '?' + $.param(get_coincidence);}

        function jsparc_result(result) {
            /* Create url with query to send the jSparc results to the server
            
            result should be an object with the following keys:
            session_title, session_pin, student_name, pk, logEnergy, error, lon, lat

            */
            return [JSPARC_URL, 'result', null].join('/')  + '?' + $.param(result);}


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
            for (var i in lines) {
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
