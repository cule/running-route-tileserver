// Name: tile_server.js
// Trigger: Anytime user is panning or zooming the google map
// Test: None
// Result: PNG map tile displaying GPS running routes within the visible map

var config = require('../config');
var _ = require('lodash');
var Promise = require('bluebird');
var router = require('express').Router();
var mercator = require('./sphericalmercator');

var mapnik = Promise.promisifyAll(require('mapnik'));
Promise.promisifyAll(mapnik.Map.prototype);
Promise.promisifyAll(mapnik.Image.prototype);

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

var createPostGISConnectionDetails = function () {
    return _.defaults({
    }, config.postGIS);
};

router.get('/:z/:x/:y', function (req, res) {

    // Get zoom, x and y coordinates from google maps
    var z = req.params.z;
    var x = req.params.x;
    var y = req.params.y;

    // Create a bounding box from the map parameters
    var bbox = mercator.xyz_to_envelope(parseInt(x), parseInt(y), parseInt(z), false);

    // Create map
    var map = new mapnik.Map(256, 256, mercator.proj4);
    map.bufferSize = 64; // amount of edging provided for each tile rendered

    // Draw layers asynchronously to avoid upwards of 100ms blocking
    map.fromStringAsync(createStyles()).then(function (map) {
        map.extent = bbox;

        // Initialize static layer
        var layer = new mapnik.Layer('tile', mercator.proj4);
        layer.datasource = new mapnik.Datasource(new createPostGISConnectionDetails());
        layer.styles = ['line'];
        map.add_layer(layer);

        // Draw single layer as PNG
        return map;
    }).then(function (map) {
        var im = new mapnik.Image(map.width, map.height);
        return map.renderAsync(im);
    }).then(function (im) {
        return im.encodeAsync('png');
    }).then(function (buffer) {
        res.set({ 'Content-Type': 'image/png' });
        res.send(200, buffer);
    }).error(function (error) {
        res.json(500, {message: 'error creating image layer'});
    });
});

module.exports = router;