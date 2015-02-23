import datetime
import json
import re

import tables

import sapphire.esd


STATIONS = [501, 502, 503, 504, 505, 506, 508]
START = datetime.datetime(2015, 2, 1, 10)
END = datetime.datetime(2015, 2, 1, 11)


re_station_number = re.compile(".*/station_([0-9]+)$")


def build_json(data):
    vis_coincidences = []

    coincidences = data.root.coincidences.coincidences
    c_index = data.root.coincidences.c_index
    s_index = data.root.coincidences.s_index

    for coincidence in coincidences:
        vis_coincidence = {'timestamp': coincidence['timestamp'],
                           'nanoseconds': coincidence['nanoseconds']}
        events = []
        for s_idx, e_idx in c_index[coincidence['id']]:
            node_str = s_index[s_idx]
            station = data.getNode(node_str)
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


def build_station_json(data):
    stations = {}
    cluster = data.root.coincidences.coincidences._v_attrs['cluster']
    for station_number, station in zip(STATIONS, cluster.stations):
        stations[station_number] = station.get_coordinates()[:2]

    return stations


if __name__ == '__main__':
    if 'data' not in globals():
        data = tables.open_file('data.h5', 'w')

    if '/coincidences' not in data:
        sapphire.esd.download_coincidences(data, stations=STATIONS,
                                           start=START, end=END)

    coincidences = build_json(data)
    with open('coincidences.json', 'w') as f:
        json.dump(coincidences, f)

    stations = build_station_json(data)
    with open('stations.json', 'w') as f:
        json.dump(stations, f)
