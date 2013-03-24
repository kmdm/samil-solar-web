var dgram    = require('dgram'),
    logger   = require('winston'),
    protocol = require('./protocol.js')
;

/**
 * Default port number to broadcast on.
 *
 * @type {number}
 */
DEFAULT_PORT = 1300;


/**
 * Default broadcast interval.
 *
 * @type {number}
 */
DEFAULT_INTERVAL = 5;

/**
 * The SamilSolarInverterBroadcaster class which broadcasts at interval to announce our presence to the network.
 *
 * @param port The port number to broadcast on.
 * @param interval The interval to broadcast at.
 * @constructor
 */
function SamilSolarInverterBroadcaster(port, interval)
{
    this.port = port || DEFAULT_PORT;
    this.interval = interval || DEFAULT_INTERVAL;
    this.protocol = new protocol.SamilSolarInverterProtocol();
}

/**
 * Start broadcasting.
 */
SamilSolarInverterBroadcaster.prototype.start = function()
{
    var self = this,
        msg  = this.protocol.broadcastMessage()
    ;

    // Stop if we are already running.
    this.stop();

    // Create the socket.
    this.socket = dgram.createSocket('udp4');
    this.socket.bind();

    // Wait for the socket to be bound and set the broadcast flag
    this.socket.on('listening', function() {
        self.socket.setBroadcast(true);

        // At interval, broadcast the announcement
        self.runner = setInterval(function() {
            self.socket.send(msg, 0, msg.length, self.port, '255.255.255.255', function(err, bytes) {
                logger.debug('Broadcast sent bytes: ' + bytes);
            });
        }, self.interval * 1000);
    });
};

/**
 * Stop broadcasting.
 */
SamilSolarInverterBroadcaster.prototype.stop = function()
{
    this.runner && clearInterval(this.runner);
    this.socket && this.socket.close();

}

module.exports.SamilSolarInverterBroadcaster = SamilSolarInverterBroadcaster;