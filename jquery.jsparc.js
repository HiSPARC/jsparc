(function($) {
    function jSparc() {
        var API_URL = 'http://data.hisparc.nl/api',
            DATA_URL = 'http://data.hisparc.nl/data',
            datasets = [],
            jsparc = this;

        // Public functions
        jsparc.make_station_select = make_station_select;
        jsparc.make_datepicker = make_datepicker;
        jsparc.get_dataset = get_dataset;
        jsparc.remove_dataset = remove_dataset;
        jsparc.datasets = function() {return datasets};

        function get_multiple_json(urls) {
            /* Asynchronously download multiple urls of type json
            */
            return $.when.apply(null,
                                urls.map(function (url) {return get_json(url);}));
        }

        function get_json(url) {
            /* Asynchronously download data of type json
            */
            return $.ajax({url: url,
                           dataType: 'json'});
        }

        function get_csv(url) {
            /* Asynchronously download data of type csv
            
            The csv data will be converted to an array
            Comment headers will be removed

            */
            return $.ajax({url: url,
                           converters: {"text json": parse_csv},
                           dataType: 'json'});
        }

        function get_dataset(station_number, startdate, enddate, type) {
            /* Store the result of downlaoding data to the datasets
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
            remove_dataset($(span).parent().attr('name'));
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
                          '. Date: ' + datasets[i].startdate + ' - ' + datasets[i].startdate)
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
            return [DATA_URL, station_number, type].join('/') + '?' + 'start=' + startdate + '&' + 'end=' + enddate;}

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
