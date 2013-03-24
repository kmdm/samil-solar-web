var events   = require('events'),
    logger   = require('winston'),
    net      = require('net'),
    protocol = require('./protocol.js'),
    util     = require('util')
;

/**
 * Default port to listen on.
 *
 * @type {number}
 */
DEFAULT_PORT = 1200;

/**
 * The SamilSolarInverterServer which listens for connections in response to the broadcast message.
 *
 * @param port
 * @constructor
 */
function SamilSolarInverterServer(port)
{
    this.port = port || DEFAULT_PORT;
    this.server = null;
    this.inverters = {};
    this.protocol = new protocol.SamilSolarInverterProtocol();

    events.EventEmitter.call(this);
}

util.inherits(SamilSolarInverterServer, events.EventEmitter);

/**
 * Handles a connection from an inverter.
 *
 * @param socket
 */
SamilSolarInverterServer.prototype.handleClient = function(socket)
{
    var self = this;
    socket.on('data', function(data) {
        console.log('Got a RAW reply: ' + util.inspect(data));

        var response = self.protocol.parseResponseMessage(data),
            type     = response.responseType
        ;

        console.log('Got a reply: ' + util.inspect(response));

        delete response.responseType;

        switch(type) {
            case 'info':
                if(self.inverters[response.serial]) {
                    socket.close();
                    return;
                }

                socket.deviceInfo = response;
                self.inverters[response.serial] = socket;

                socket.statsInterval = setInterval(function() {
                    socket.write(self.protocol.deviceStatsRequestMessage());
                }, 5000);

                self.emit('data', { device: socket.deviceInfo, stats: null });

                break;
            case 'stats':
                self.emit('data', {
                    device: socket.deviceInfo,
                    stats:  response
                });
                break;
        }

    }).on('end', function() {
        if(!socket.deviceInfo || !socket.deviceInfo.serial) return;
        delete self.inverters[socket.deviceInfo.serial];
    });

    setTimeout(function() {
        socket.write(self.protocol.deviceInfoRequestMessage());
    }, 1000);
};

/**
 * Starts the server to wait for connections from the inverter
 */
SamilSolarInverterServer.prototype.start = function()
{
    var self = this;
    if(!this.server) {
        this.server = net.createServer(function(socket) {
            self.handleClient(socket);
        }).listen(this.port);
    }
};

/**
 * Stops the server.
 */
SamilSolarInverterServer.prototype.stop = function()
{
    if(this.server) {
        this.server.close();
        this.server = null;
    }
};

module.exports.SamilSolarInverterServer = SamilSolarInverterServer;