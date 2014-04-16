var mapnik = require('mapnik');
var mercator = require('./sphericalmercator');
var url = require('url');
var http = require('http');
var parseQueryParams = require('./tile.js').parseQueryParams;
var TMS_SCHEME = false;

// the db connection info
var postgis_settings = {
    'host': 'localhost',
    'dbname': <database_name>,
    'table': <table_with_geometry_column>,
    'user': <user_name>,
    'password': <password>,
    'type': 'postgis',
    'initial_size': '10',
    'geometry_field': 'the_web_geom',
    'srid': 3857,
};

function createStyles() {
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

                // Create a new layer with the running routes
                var layer = new mapnik.Layer('tile', mercator.proj4);
                layer.datasource = new mapnik.Datasource(postgis_settings);
                layer.styles = ['line'];

                // Create style filters
                map.fromStringSync(createStyles());

                // Draw the map as a PNG image
                map.bufferSize = 64; // how much edging is provided for each tile rendered
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
}).listen(8000);