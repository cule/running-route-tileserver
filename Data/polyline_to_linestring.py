import csv
from shapely.geometry import asLineString
from shapely.ops import transform
from functools import partial
import pyproj

# Function for projecting from 4326 to 3785 before loading into PostGIS database
project = partial(pyproj.transform, pyproj.Proj(init="epsg:4326"), pyproj.Proj(init="epsg:3857"))


def decode(point_str):
    """
    Decodes a polyline that has been encoded using Google's algorithm
    http://code.google.com/apis/maps/documentation/polylinealgorithm.html

    This is a generic method that returns a list of (latitude, longitude)
    tuples.

    :param point_str: Encoded polyline string.
    :type point_str: string
    :returns: List of 2-tuples where each tuple is (latitude, longitude)
    :rtype: list
    """

    # One coordinate offset is represented by 4 to 5 binary chunks
    coord_chunks = [[]]
    for char in point_str:

        # Convert each character to decimal from ascii
        value = ord(char) - 63

        # Values that have a chunk following have an extra 1 on the left
        split_after = not (value & 0x20)
        value &= 0x1F

        coord_chunks[-1].append(value)

        if split_after:
            coord_chunks.append([])

    del coord_chunks[-1]

    coords = []

    for coord_chunk in coord_chunks:
        coord = 0

        for i, chunk in enumerate(coord_chunk):
            coord |= chunk << (i * 5)

        # there is a 1 on the right if the coord is negative
        if coord & 0x1:
            coord = ~coord  # invert
        coord >>= 1
        coord /= 100000.0

        coords.append(coord)

    # Convert the 1 dimensional list to a 2 dimensional list and offsets to actual values
    points = []
    prev_x = 0
    prev_y = 0
    for i in range(0, len(coords) - 1, 2):
        if coords[i] == 0 and coords[i + 1] == 0:
            continue

        prev_x += coords[i + 1]
        prev_y += coords[i]
        # A round to 6 digits ensures that the floats are the same as when they were encoded
        points.append((round(prev_x, 6), round(prev_y, 6)))

    return points


# Go through each row of the data file and decode the encoded polyline into an SRID:3857 WKT LineString
output, count = [], 0
file_name = 'gps_routes_sample.tsv'
with open(file_name, 'rU') as f:
    reader = csv.reader(f, delimiter="\t")
    for i, row in enumerate(reader):
        decoded_polyline = decode(row[0])  # decode the polyline into an [x,y] coordinate array of arrays
        linestring = asLineString(decoded_polyline)  # create a WKT LineString from the coordinate array
        output.append([count, "SRID=3857;" + transform(project, linestring).wkt])  # project to SRID: 3857
        count += 1

# Write the transformed LineString data to a tab delimited file - easy to COPY into PostgreSQL database
with open('gps_routes_sample_parsed.tab', 'a') as tab:
    writer = csv.writer(tab, delimiter='\t')
    writer.writerows(output)