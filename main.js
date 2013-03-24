BCAST_PORT = 1300;
DATA_PORT  = 1200;
WEB_PORT   = 8080;

var cons    = require('consolidate'),
    express = require('express'),
    http    = require('http'),
    sio     = require('socket.io'),
    swig    = require('swig'),
    ssib    = require('./lib/broadcaster'),
    ssis    = require('./lib/server')
;

var app = express(),
    broadcaster = new ssib.SamilSolarInverterBroadcaster(BCAST_PORT),
    server = new ssis.SamilSolarInverterServer(DATA_PORT),
    web = http.createServer(app),
    io = sio.listen(web)
;

// Fire up the inverter comms
server.start();
broadcaster.start();

// Connect the inverter to the socket.io server
server.on('data', function(data) { io.sockets.emit('data', data) });

// Configure express
app.engine('html', cons.swig);
app.set('view engine', 'html');
app.set('views', __dirname + '/html');

// Initialise swig
swig.init({
    cache: false,
    root: __dirname + '/html',
    allowErrors: true
});

// Define static path
app.use('/static', express.static(__dirname + '/static'));

// Define the routes
app.get('/', function(req, res) {
    return res.render('index');
});

// Fire up the http server
web.listen(WEB_PORT);