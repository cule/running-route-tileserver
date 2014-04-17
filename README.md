Running Route Tile Server
=========================

###Introduction

Nautilytics was recently approached by WalkJogRun, one of the leaders in iOS GPS running applications, to create a visualization of the most popular public running routes in their global network.
We didn’t want to simply create pieces of art from the three plus years of running routes;
we wanted to make the routes as dynamic as possible by creating overlays to add the popular routes on top of a Google Map.
The result of the project was to give users of the application a better understanding of where people were running and where they may want to run in a new city.
In theory, if many runners are running the same route then it may be safer, more scenic, and less polluted.

###Examples

[Nautilytics Web Demo](http://nautilytics.azurewebsites.net/WJR-Popular-Routes/)

[WalkJogRun iOS App](http://go.appapult.com/p)

###Tile Server

The approach we took to creating the tile server was to spin up a new small Ubuntu LTS virtual machine using Windows Azure –
we chose Azure because of their great [BizSpark](http://www.microsoft.com/bizspark/) program for startups. After some deliberation,
we decided our best technology stack for this project was the [PostGIS extension](http://postgis.net/) of PostgreSQL, node.js, and Mapnik.
[node.js](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager#ubuntu-mint)
and [PostgreSQL](http://trac.osgeo.org/postgis/wiki/UsersWikiPostGIS21UbuntuPGSQL93Apt)
were easy to get up and running correctly; Mapnik on the other hand was a bit trickier, so we’ll outline the steps.

####Mapnik Installation

We’ve had the best success running the v.2.3x version of [mapnik](https://github.com/mapnik/mapnik/wiki/Mapnik-Installation):

```
[nautilytics]$ sudo apt-get install -y python-software-properties
[nautilytics]$ sudo add-apt-repository ppa:mapnik/nightly-2.3
[nautilytics]$ sudo apt-get update
[nautilytics]$ sudo apt-get install libmapnik libmapnik-dev mapnik-utils python-mapnik
[nautilytics]$ sudo apt-get install mapnik-input-plugin-postgis
```

To ensure mapnik installed correctly:

```
[nautilytics]$ mapnik-config
Usage: mapnik-config [OPTION]

Known values for OPTION are:

  -h --help         display this help and exit
  -v --version      version information (MAPNIK_VERSION_STRING)
  --version-number  version number (MAPNIK_VERSION) (new in 2.2.0)
  --git-revision    git hash from "git rev-list --max-count=1 HEAD"
  --git-describe    git decribe output (new in 2.2.0)
  --fonts           default fonts directory
  --input-plugins   default input plugins directory
  --defines         pre-processor defines for Mapnik build (new in 2.2.0)
  --prefix          Mapnik prefix [default /usr]
  --lib-name        Mapnik library name
  --libs            library linking information
  --dep-libs        library linking information for Mapnik dependencies
  --ldflags         library paths (-L) information
  --includes        include paths (-I) for Mapnik headers (new in 2.2.0)
  --dep-includes    include paths (-I) for Mapnik dependencies (new in 2.2.0)
  --cxxflags        c++ compiler flags and pre-processor defines (new in 2.2.0)
  --cflags          all include paths, compiler flags, and pre-processor defines (for back-compatibility)
  --cxx             c++ compiler used to build mapnik (new in 2.2.0)
  --all-flags       all compile and link flags (new in 2.2.0)
```

####Setting up the Backend

We're going to walk through setting up a PostgreSQL/PostGIS database to hold the GPS routes as LineStrings. In our situation,
we received a tab delimited file of encoded polylines, so we'll start from there.

Using polyline_to_linestring.py and specifically the great [Shapely](https://pypi.python.org/pypi/Shapely) Python library for manipulating geometry objects,
we were able to transform the encoded polylines into well-known-text (WKT) representations of [Spherical Mercator Projection](http://alastaira.wordpress.com/2011/01/23/the-google-maps-bing-maps-spherical-mercator-projection/)
LineStrings for easy copying into the database.

Once we have transformed the data and written the results to gps_routes_sample_parsed.tab,
we can now COPY the tab delimited file into our database.

```
[nautilytics]$ createdb gps_routes // create a database named gps_routes
[nautilytics]$ psql gps_routes // enter the database
gps_routes=# CREATE EXTENSION POSTGIS; // add PostGIS functionality to our newly created database
gps_routes=# CREATE TABLE gps_routes(id serial); // create a table with a single id column
gps_routes=# SELECT AddGeometryColumn('gps_routes', 'the_web_geom', 3857, 'LINESTRING', 2);  // append a Geometry SRID: 3857 column
gps_routes=# COPY gps_routes FROM 'gps_routes_sample_parsed.tab';  // use the blazing fast COPY command to insert the data into the table
gps_routes=# CREATE INDEX gps_routes_gix ON gps_routes USING GIST (the_web_geom); // create an index on the_web_geom column
```

One could stop here and add simplification to the database settings in the node-mapnik script, but for faster drawing on the server side
we created a new table with the routes [simplified](http://www.postgis.org/docs/ST_Simplify.html).

```
gps_routes=# CREATE TABLE gps_routes_simplified AS SELECT id, ST_Simplify(the_web_geom, 16.0) AS the_web_geom FROM gps_routes;
gps_routes=# CREATE INDEX gps_routes_simplified_gix ON gps_routes_simplified USING GIST (the_web_geom);
```

For the node.js script to serve up the requested tiles, we need to use the package manager [npm](https://www.npmjs.org/) to
install the node module that contains the bindings from mapnik to node - [node-mapnik](https://github.com/mapnik/node-mapnik).
This can be tricky, so we'll outline how we've been successful with this installation.

```
[nautilytics]$ sudo apt-get install automake libtool g++ protobuf-compiler libprotobuf-dev libboost-dev libutempter-dev libncurses5-dev zlib1g-dev libio-pty-perl libssl-dev pkg-config
[nautilytics]$ cd /directory/to_node_script
[nautilytics]$ sudo npm install mapnik
```

Test to see if the installation is complete.

```
[nautilytics]$ node
> var mapnik = require('mapnik');
undefined
> mapnik
{ register_datasources: [Function],
  datasources: [Function],
  register_fonts: [Function],
  fonts: [Function],
  fontFiles: [Function],
  clearCache: [Function],
  gc: [Function],
  Map: [Function: Map],
  Color: [Function: Color],
  Geometry:
   { [Function: Geometry]
     Point: 1,
     LineString: 2,
     Polygon: 3 },
  ...
  versions:
   { node: '0.10.26',
     v8: '3.14.5.9',
     boost: '1.53.0',
     boost_number: 105300,
     mapnik: '2.3.0',
     mapnik_number: 200300,
     cairo: '1.12.16' },
  supports:
   { grid: true,
     cairo: true,
     jpeg: true },
  ...
  settings:
   { paths:
      { fonts: '/usr/share/fonts/truetype',
        input_plugins: '/usr/lib/mapnik/input' } },
  version: '0.7.28',
  register_system_fonts: [Function] }
> process.exit();
```

We now need to create a node.js script to query the database and return those LineStrings within the bounds of the client 256x256 requested tile.
Fortunately, node-mapnik makes this process quite seamless.

```
var mapnik = require('mapnik'),
    mercator = require('./sphericalmercator'),
    url = require('url'),
    http = require('http'),
    parseQueryParams = require('./tile.js').parseQueryParams,
    TMS_SCHEME = false,
    port = 8000;

// the db connection info
var postgis_settings = {
    'host': 'localhost',
    'dbname': 'gps_routes',
    'table': 'gps_routes_simplified',
    'user': 'user_name',
    'password': 'password',
    'type': 'postgis',
    'initial_size': '10',
    'geometry_field': 'the_web_geom',
    //'simplify_geometries' = true, // not needed if using simplified table
    //'extent' = '-166939.292534432, 893098.25883008, 35265.2514503532, 1006172.1881666',
    'srid': 3857
};

function createStyles() {
    // Create an XML style sheet for styling the LineStrings
    var s = '<?xml version="1.0" encoding="utf-8"?>';
    s += '<!DOCTYPE Map [';
    s += '    ]>';
    s += '<Map minimum-version="2.0.0">';
    s += '<Style name="line">';
    s += '    <Rule>';
    s += '        <LineSymbolizer stroke="red" stroke-width="1.5" stroke-opacity=".5"/>';
    s += '    </Rule>';
    s += '</Style>';
    s += '</Map>';
    return s;
}

http.createServer(function (req, res) {

    parseQueryParams(req, TMS_SCHEME, function (err, params) {
        if (err) {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end(err.message);
        } else {
            try {
                var map = new mapnik.Map(256, 256, mercator.proj4);
                var bbox = mercator.xyz_to_envelope(parseInt(params.x),
                    parseInt(params.y),
                    parseInt(params.z), false);

                // Create a new mapnik layer with the running routes
                var layer = new mapnik.Layer('tile', mercator.proj4);
                layer.datasource = new mapnik.Datasource(postgis_settings);
                layer.styles = ['line'];

                // Initialize line styles
                map.fromStringSync(createStyles());

                // Draw the map tile as a 256x256 PNG image and return to client
                map.bufferSize = 64; // edging for each tile rendered
                map.add_layer(layer);
                map.extent = bbox;
                var im = new mapnik.Image(map.width, map.height);
                map.render(im, function (err, im) {
                    if (err) {
                        throw err;
                    } else {
                        res.writeHead(200, {'Content-Type': 'image/png'});
                        res.end(im.encodeSync('png'));
                    }
                });
            }
            catch (err) {
                res.writeHead(500, {'Content-Type': 'text/plain'});
                res.end(err.message);
            }
        }
    });
}).listen(port);
```

To run the script in the background and test to see if it is working:

```
[nautilytics]$ nohup node tile_server.js &
[nautilytics]$ curl localhost:8000/z/x/y.png
'no x,y,z provided'
```

One final obstacle we had to navigate was keeping the node script up and running when the servers inevitably rebooted for
scheduled system maintenance. We initially tried this with [Upstart](http://upstart.ubuntu.com/), an event-based init daemon,
and [forever](https://github.com/nodejitsu/forever), a tool for ensuring that a node script runs continuously, but found that forever
didn't play nice with Upstart. We did discover that node on its own integrated very nicely with Upstart.

```
[nautilytics]$ cd /etc/init
[nautilytics]$ sudo nano tile_start.conf

/* Begin Text of Upstart Script */
start on runlevel [2345]
stop on shutdown

respawn

script
    exec sudo -u nobody nodejs /directory/to_node_script/tile_server.js 2>&1 >> /tmp/tile_server.log
end script
/* End Text of Upstart Script */
```

####Setting up the Frontend

Given the seamless integration between [wax](http://www.mapbox.com/wax/) and mapnik, the frontend was a breeze to set up.

```
<html>
<head>
    <script src='http://maps.google.com/maps/api/js?sensor=false' type='text/javascript'>
    </script>
    <script src='wax/dist/wax.g.min.js' type='text/javascript'></script>
    <style type="text/css">
        html, body {
            height: 100%;
            overflow: hidden;
        }
        #map {
            height: 100%;
        }
    </style>
</head>
<body>
<div id="map"></div>
<script>
    var runningTiles = {
        tilejson: '2.0.0',
        tiles: ['localhost:8000/{z}/{x}/{y}.png'] // make sure port lines up with port in node
    };
    var map = new google.maps.Map(document.getElementById('map'), {
        center: new google.maps.LatLng(42.3133735, -71.0571571), // Boston
        zoom: 10,
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.SMALL
        }
    });
    map.overlayMapTypes.insertAt(0, new wax.g.connector(runningTiles));
</script>
</body>
</html>
```

####Caching the Tiles

One of the keys to making this simple tile server efficient and fast for both iOS and the web, is the use of a content delivery network (CDN) for caching the tiles.
For the technically savvy reader, this content delivery can be done by setting up [Varnish](https://www.varnish-cache.org/) on your server,
but for those looking for as little overhead as possible, check out [Fastly](http://www.fastly.com/). Fastly handles all the heavy lifting of
caching the tile images and is a breeze to set up.


####iOS Map Tiles

We’re not going to walk through the intricacies of getting the map tiles working with Google Maps on iOS,
but if you’re at that step check out [this article](http://www.viggiosoft.com/blog/blog/2014/01/21/custom-and-offline-maps-using-overlay-tiles/) on iOS overlay tiles for assistance.


LICENSE
=======

BSD, see LICENSE.txt