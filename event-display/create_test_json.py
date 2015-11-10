import datetime
import json
import re

import tables

from sapphire import Network, Station, download_data, download_coincidences
from sapphire.transformations.clock import datetime_to_gps


# Excluded 510 because it overlaps with 501
STATIONS = [501, 502, 503, 504, 505, 506, 508, 509, 511]
START = datetime.datetime(2015, 9, 5, 10)
END = datetime.datetime(2015, 9, 5, 11)
LIMITS = [datetime_to_gps(START) * int(1e9),
          datetime_to_gps(END) * int(1e9)]


re_station_number = re.compile(".*/station_([0-9]+)$")


def download_data_coincidences(data):
    if '/coincidences' not in data:
        download_coincidences(data, stations=STATIONS, start=START, end=END)

    for station in STATIONS:
        group = '/s%d' % station
        if group not in data:
            download_data(data, group, station, start=START, end=END)


def build_coincidence_json(data):
    vis_coincidences = []

    coincidences = data.root.coincidences.coincidences
    c_index = data.root.coincidences.c_index
    s_index = data.root.coincidences.s_index

    for coincidence in coincidences:
        vis_coincidence = {'timestamp': coincidence['timestamp'],
                           'nanoseconds': coincidence['nanoseconds'],
                           'ext_timestamp': coincidence['ext_timestamp']}
        events = []
        for s_idx, e_idx in c_index[coincidence['id']]:
            node_str = s_index[s_idx]
            station = data.get_node(node_str)
            station_event = station.events[e_idx]
            station_number = re_station_number.match(node_str).group(1)

            event = {u: float(station_event[u])
                     if station_event[u] >= 0. else 0. for u in
                     ['n1', 'n2', 'n3', 'n4']}
            event['station'] = station_number
            events.append(event)
        vis_coincidence['events'] = events
        vis_coincidences.append(vis_coincidence)

    return vis_coincidences


def build_events_json(data, station):
    output = []

    events = data.get_node('/s%d/events' % station)

    for event in events:
        output_event = {u: event[u] for u in ['timestamp', 'nanoseconds',
                                              'ext_timestamp']}
        output_event.update({u: event[u] if event[u] >= 0. else 0. for u
                             in ['n1', 'n2', 'n3', 'n4']})
        output.append(output_event)

    return output


def build_station_json(data):
    stations = {}
    for station_number in STATIONS:
        try:
            loc = get_latlon_coordinates(station_number)
            if 0. not in loc:
                stations[station_number] = loc
        except:
            continue
    station_json = {'limits': LIMITS, 'stations': stations}
    return station_json


def write_jsons(data):
    stations = build_station_json(data)
    with open('stations.json', 'w') as f:
        json.dump(stations, f, indent=4)

    coincidences = build_coincidence_json(data)
    with open('coincidences.json', 'w') as f:
        json.dump(coincidences, f, indent=4)

    for station in STATIONS:
        events = build_events_json(data, station)
        with open('events-s%d.json' % station, 'w') as f:
            json.dump(events, f, indent=4)


def get_latlon_coordinates(station_number):
    station = Station(station_number)
    gps_location = station.location()
    if gps_location['latitude'] == 0.:
        raise Exception
    return gps_location['latitude'], gps_location['longitude']


if __name__ == '__main__':
    if 'data' not in globals():
        data = tables.open_file('data.h5', 'w')

    download_data_coincidences(data)
    write_jsons(data)
