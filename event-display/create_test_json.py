import datetime
import json
import re
import os
from random import uniform
from math import pi

import tables

from sapphire import (Network, Station, download_data, download_coincidences,
                      datetime_to_gps)
from sapphire.utils import pbar


STATIONS = Network().station_numbers()
START = datetime.datetime(2016, 2, 1, 11, 0)
END = datetime.datetime(2016, 2, 1, 11, 20)
LIMITS = [datetime_to_gps(START) * int(1e9),
          datetime_to_gps(END) * int(1e9)]

re_station_number = re.compile(".*/station_([0-9]+)$")


def download_coincidences_data(data):
    for subcluster in Network().subclusters():
        group = ('/coincidences_%s' %
                 subcluster['name'].lower().replace(' ', '_'))
        if group in data:
            continue
        stations = Network().station_numbers(subcluster=subcluster['number'])
        if len(stations) < 2:
            continue
        download_coincidences(data, group=group, stations=stations,
                              start=START, end=END)

    # Entire network
    if '/coincidences' not in data:
        download_coincidences(data, start=START, end=END)


def download_events_data(data):
    for station in pbar(STATIONS):
        group = '/s%d' % station
        if group not in data:
            download_data(data, group, station, start=START, end=END,
                          progress=False)


def build_coincidence_json(data, subcluster=None):
    vis_coincidences = []

    if subcluster is None:
        group = '/coincidences/'
    else:
        group = '/coincidences_%s/coincidences/' % subcluster

    try:
        coincidences = data.get_node(group, 'coincidences')
        c_index = data.get_node(group, 'c_index')
        s_index = data.get_node(group, 's_index')
    except tables.NoSuchNodeError:
        return []

    for coincidence in coincidences:
        vis_coincidence = {u: coincidence[u] for u in
                           ['timestamp', 'nanoseconds', 'ext_timestamp']}
        events = []
        coin_direction = {'azimuth': round(uniform(-pi, pi), 4),
                          'zenith': round(uniform(0, pi / 4), 4)}
        for s_idx, e_idx in c_index[coincidence['id']]:
            node_str = s_index[s_idx]
            station = data.get_node(node_str)
            station_event = station.events[e_idx]
            station_number = re_station_number.match(node_str).group(1)

            event = {u: round(float(station_event[u]), 2)
                     if station_event[u] >= 0. else 0.
                     for u in ['n1', 'n2', 'n3', 'n4']}
            event.update(coin_direction)
            event['station'] = station_number
            events.append(event)
        vis_coincidence['events'] = events
        vis_coincidences.append(vis_coincidence)

    return vis_coincidences


def build_events_json(data, station):
    output = []

    events = data.get_node('/s%d/events' % station)

    for event in events:
        output_event = {u: event[u] for u in [#'timestamp', 'nanoseconds',
                                              'ext_timestamp']}
        output_event.update({u: round(float(event[u]), 2)
                             if event[u] >= 0. else 0.
                             for u in ['n1', 'n2', 'n3', 'n4']})
        output_event.update({'azimuth': round(uniform(-pi, pi), 4),
                             'zenith': round(uniform(0, pi / 4), 4)})
        output.append(output_event)

    return output


def build_station_json(data, subcluster=None):
    stations = {}
    if subcluster is None:
        station_numbers = STATIONS
    else:
        station_numbers = Network().station_numbers(subcluster=subcluster)
    for station_number in station_numbers:
        try:
            loc = get_latlon_coordinates(station_number)
            if 0. not in loc:
                stations[station_number] = loc
        except:
            continue
    station_json = {'limits': LIMITS, 'stations': stations}
    return station_json


def write_jsons(data):
    if not os.path.exists('data/'):
        os.mkdir('data')

    for subcluster in Network().subclusters():
        subcluster_name = subcluster['name'].lower().replace(' ', '_')

        stations = build_station_json(data, subcluster['number'])
        with open('data/stations_' + subcluster_name + '.json', 'w') as f:
            json.dump(stations, f)

        coincidences = build_coincidence_json(data, subcluster_name)
        with open('data/coincidences_' + subcluster_name + '.json', 'w') as f:
            json.dump(coincidences, f)

    stations = build_station_json(data)
    with open('data/stations_network.json', 'w') as f:
        json.dump(stations, f)

    coincidences = build_coincidence_json(data)
    with open('data/coincidences_network.json', 'w') as f:
        json.dump(coincidences, f)

    for station in pbar(STATIONS):
        events = build_events_json(data, station)
        with open('data/events_s%d.json' % station, 'w') as f:
            json.dump(events, f)


def get_latlon_coordinates(station_number):
    station = Station(station_number)
    gps_location = station.gps_location(START)
    if gps_location['latitude'] == 0.:
        raise Exception
    return gps_location['latitude'], gps_location['longitude']


if __name__ == '__main__':
    if 'data' not in globals():
        data = tables.open_file('data.h5', 'w')

    download_events_data(data)
    download_coincidences_data(data)

    write_jsons(data)
