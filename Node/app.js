// Routes
var tiles = require('./lib/tile_server');

// Module for multi-core clustering support
// Tutorial: http://rowanmanning.com/posts/node-cluster-and-express/
var cluster = require('cluster');
var port = 8000;

if (cluster.isMaster) {

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }
}
else {

    var app = require('express')();

    app.use('/v1/tiles', tiles);

    // Last resort error handler
    app.use(function (err, req, res, next) {
        console.error(err.name, err.stack);
        res.send(500, 'An error has occurred');
    });

    app.listen(port, function () {
        console.log('listen to app on port ' + port);
    });
}

// Listen for dying workers
cluster.on('exit', function (worker) {

    // Replace the dead worker
    cluster.fork();
});