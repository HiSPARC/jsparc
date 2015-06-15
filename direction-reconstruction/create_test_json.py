import datetime
import json
import re

import tables

import sapphire.esd
import sapphire.api


STATIONS = [501, 502, 503, 504, 505, 506, 508]
START = datetime.datetime(2015, 3, 6, 10)
END = datetime.datetime(2015, 3, 6, 11)


re_station_number = re.compile(".*/station_([0-9]+)$")


def download_data(data):
    if '/coincidences' not in data:
        sapphire.esd.download_coincidences(data, stations=STATIONS, n=3,
                                           start=START, end=END)


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
        t0 = None
        for s_idx, e_idx in c_index[coincidence['id']]:
            node_str = s_index[s_idx]
            station = data.get_node(node_str)
            station_event = station.events[e_idx]
            station_number = re_station_number.match(node_str).group(1)

            if t0 is None:
                t0 = station_event['ext_timestamp']

            event = {u: float(station_event[u])
                     if station_event[u] >= 0. else 0. for u in
                     ['n1', 'n2', 'n3', 'n4']}
            event['station'] = station_number
            event['t'] = float(station_event['ext_timestamp'] - t0)
            events.append(event)
        vis_coincidence['events'] = events
        vis_coincidences.append(vis_coincidence)

    return vis_coincidences


def build_station_json(data):
    stations = {}
    for station_number in STATIONS:
        stations[station_number] = get_latlon_coordinates(station_number)

    return stations


def write_jsons(data):
    stations = build_station_json(data)
    with open('stations.json', 'w') as f:
        json.dump(stations, f, indent=4)

    coincidences = build_coincidence_json(data)
    with open('coincidences.json', 'w') as f:
        json.dump(coincidences, f, indent=4)


def get_latlon_coordinates(station_number):
    station = sapphire.api.Station(station_number)
    gps_location = station.location()
    return gps_location['latitude'], gps_location['longitude']


if __name__ == '__main__':
    if 'data' not in globals():
        data = tables.open_file('data.h5', 'w')

    download_data(data)
    write_jsons(data)
