(function($) {
    function jSparc() {
        var API_URL = 'http://data.hisparc.nl/api/',
            DATA_URL = 'http://data.hisparc.nl/data/',
            datasets = [],
            jsparc = this;

        // Public functions
        jsparc.get_station_list = get_station_list;
        jsparc.get_station_info = get_station_list;
        jsparc.get_dataset = get_dataset;
        jsparc.make_station_select = make_station_select;

        // AJAX
        // bad: ajax -> fail
        // good: ajax -> complete, done
        // what?: ajax -> promise

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
            
            The csv will be converted to an array

            */
            return $.ajax({url: url,
                           converters: {"text json": parse_csv}
                           dataType: 'text'});
        }

        function get_dataset(station_number, startdate, enddate, type) {
            /* Store the result of downlaoding data to the datasets
            */
            var url = data_download(station_number, startdate, enddate, type);
            for (var i in datasets) {
                if (datasets[i].url == url) { 
                    alert('That dataset is already available');
                    return;}}
            get_csv(url)
            .done(function(data) {
                datasets.push({data: data,
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
            for (var i in datasets) {
                if (datasets[i].url == url) { 
                    datasets.pop(i);
                    return;}}
            update_dataset_list();
        }

        function make_station_select(target) {
            /* Create a select menu to choose a station
            */
            var url = api_stations();
            get_json(url_clusters)
            get_json(url)
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

        function update_dataset_list(target) {
            /* Create a readable overview list of the available datasets
            */
            var list = $('<ol>');
            var item = $('<li>');
            for (var i in datasets) {
                if (datasets[i].data.length > 0) {
                    item.text('Station: ' + datasets[i].station_number + ' - ' + datasets[i].type +
                              '\nDate:' + datasets[i].startdate + '-' + datasets[i].startdate)
                    list.append(item);}
            }
            target.html(list);
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
            return [API_URL + 'stations/';}

        function api_stations_in_subcluster(subcluster_number) {
            return [API_URL + 'subclusters', subcluster_number, ''].join('/');}

        function api_subclusters() {
            return API_URL + 'subclusters/';}

        function api_subclusters_in_cluster(cluster_number) {
            return [API_URL + 'clusters', cluster_number, ''].join('/');}

        function api_clusters() {
            return API_URL + 'clusters/';}

        function api_clusters_in_country(country_number) {
            return [API_URL + 'countries', country_number, ''].join('/');}

        function api_countries() {
            return API_URL + 'countries/';}

        function api_stations_with_data(year, month, day) {
            return [API_URL + 'stations/data', year, month, day, ''].join('/');}

        function api_stations_with_weather(year, month, day) {
            return [API_URL + 'stations/weather', year, month, day, ''].join('/');}

        function api_station_info(station_number) {
            return [API_URL + 'station', station_number, ''].join('/');}

        function api_has_data(station_number, year, month, day) {
            return [API_URL + 'station', station_number, 'data', year, month, day, ''].join('/');}

        function api_has_weather(station_number, year, month, day) {
            return [API_URL + 'station', station_number, 'weather', year, month, day, ''].join('/');}

        function api_configuration(station_number, year, month, day) {
            return [API_URL + 'station', station_number, 'config', year, month, day, ''].join('/');}

        function api_number_of_events(station_number, year, month, day, hour) {
            return [API_URL + 'station', station_number, 'num_events', year, month, day, hour, ''].join('/');}

        // Data Download
        function data_download(station_number, startdate, enddate, type) {
            return [DATA_URL, station_number, type, ''].join('/') + '?' + 'start=' + startdate + '&' + 'end=' + enddate;}

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

        function padZero(number, length) {
            /* Prepend a number with zero's until its length is length
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
