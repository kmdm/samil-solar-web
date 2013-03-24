var util = require('util');

/**
 * Protocol header.
 *
 * @type {string}
 */
HEADER = 0x55aa;

/**
 * Minimum packet size (e.g. size excluding data)
 * @type {number}
 */
MIN_PACKET_SIZE = 9;

/**
 * Broadcast command.
 *
 * @type {number}
 */
CMD_BROADCAST = 0x40;

/**
 * Broadcast data.
 *
 * @type {string}
 */
DATA_BROADCAST = 'I AM SERVER';

/**
 * Device stats command.
 *
 * @type {number}
 */
CMD_DEVICE_STATS = 0x102;

/**
 * Device info command.
 *
 * @type {number}
 */
CMD_DEVICE_INFO = 0x103;

/**
 * Device params command.
 *
 * @type {number}
 */
CMD_DEVICE_PARAMS = 0x400;

/**
 * A class to abstract the Samil Power Inverter protocol.
 *
 * Packet structure (Big Endian format):
 *
 * HEADER(2) | COMMAND(2) | UNKNOWN(1) | LENGTH(2) | DATA(LENGTH) | CHECKSUM(2)
 *
 * Example:
 *
 * HEADER: 0x55aa
 * COMMAND: 0x104 us->inverter, 0x104|0x80 inverter->us
 * UNKNOWN: 0x02 us->inverter, 0x00 inverter->us
 * LENGTH: DATA length
 * CHECKSUM: Sum of all previous & 0xffff
 *
 * Known commands:
 *
 * 0x0040: UDP broadcast message, data: 'I AM SERVER'
 * 0x0100: Get unknown information
 * 0x0102: Get device statistics
 * 0x0103: Get device information (manufacturer, model, serial, type, various versions)
 * 0x0400: Get device parameters (includes wifi config)
 *
 * Flow:
 *
 * 1. Broadcast on UDP port 1300 with command 0x0040.
 * 2. Inverter connects back on port 1200.
 * 3. Wait a second or two to let inverter get set-up.
 * 4. Begin issuing commands for required information.
 *
 * @constructor
 */
function SamilSolarInverterProtocol()
{

}

/**
 * Calculate the checksum for the given buffer.
 *
 * @param buffer
 */
SamilSolarInverterProtocol.prototype.checksum = function(buffer)
{
    var chk = 0;

    for(var i=0; i < buffer.length - 2; i++) {
        chk += buffer.readUInt8(i);
    }

    return chk & 0xffff;
}

/**
 * Generates a request message from the cmd and data parameters.
 *
 * @param cmd
 * @param data
 * @returns {Buffer}
 */
SamilSolarInverterProtocol.prototype.message = function(cmd, data)
{
    data = data || '';

    var b = Buffer(MIN_PACKET_SIZE + data.length),
        p = 0
    ;

    b.writeUInt16BE(HEADER, p); p += 2;
    b.writeUInt16BE(cmd, p); p += 2;
    b.writeUInt8(2, p++);
    b.writeUInt16BE(data.length, p); p += 2;
    b.write(data, p, data.length, 'binary'); p += data.length;
    b.writeUInt16BE(this.checksum(b), p); p += 2;
    return b;
};

/**
 * Generates a broadcast message.
 *
 * @returns {Buffer}
 */
SamilSolarInverterProtocol.prototype.broadcastMessage = function()
{
    return this.message(CMD_BROADCAST, DATA_BROADCAST);
};


/**
 * Generates a device information request message.
 *
 * @returns {Buffer}
 */
SamilSolarInverterProtocol.prototype.deviceInfoRequestMessage = function()
{
    return this.message(CMD_DEVICE_INFO);
};

/**
 * Generates a device stats request message.
 *
 * @returns {Buffer}
 */
SamilSolarInverterProtocol.prototype.deviceStatsRequestMessage = function()
{
    return this.message(CMD_DEVICE_STATS);
};

SamilSolarInverterProtocol.prototype.deviceParamsRequestMessage = function()
{
    return this.message(CMD_DEVICE_PARAMS);
}

/**
 * Validate a message
 *
 * @param buffer
 */
SamilSolarInverterProtocol.prototype.validateMessage = function(buffer)
{
    if(buffer.length < MIN_PACKET_SIZE) {
        throw new Error('Invalid message length: ' + b.length);
    }

    if(buffer.readUInt16BE(0) != HEADER) {
        throw new Error('Invalid message header: 0x' + buffer.readUInt16BE(0).toString(16));
    }

    if(this.checksum(buffer) != buffer.readUInt16BE(buffer.length - 2)) {
        throw new Error('Invalid message checksum, '+
                        'got: 0x' + buffer.readUInt16BE(buffer.length - 2).toString(16) +
                        'expected: 0x' + this.checksum(buffer));
    }
};

/**
 * Parses the device stats message into a more usable object.
 *
 * @param data
 * @returns {*}
 */
SamilSolarInverterProtocol.prototype.parseDeviceStats = function(data)
{
    var stats = {};

    for(var i=0; i < data.length; i+=2) switch(i) {
        case  0: stats.internalTemperature = data.readUInt16BE(i) / 10; break;
        case  2: stats.pv1Voltage          = data.readUInt16BE(i) / 10; break;
        case  4: stats.pv2Voltage          = data.readUInt16BE(i) / 10; break;
        case 12: stats.uptime              = data.readUInt16BE(i); break;
        case 14: stats.operatingMode       = data.readUInt16BE(i); break;
        case 16: stats.energyToday         = data.readUInt16BE(i) / 100; break;
        case 42: stats.gridCurrent         = data.readUInt16BE(i) / 10; break;
        case 44: stats.gridVoltage         = data.readUInt16BE(i) / 10; break;
        case 46: stats.gridFrequency       = data.readUInt16BE(i) / 100; break;
        case 52: stats.energyTotal         = data.readUInt16BE(i) / 10; break;
    }

    return stats;
};

/**
 * Parses the device info message into a more usable object.
 *
 * @param data
 * @returns {*}
 */
SamilSolarInverterProtocol.prototype.parseDeviceInfo = function(data)
{
    var N = function(str) {
        var pos = str.indexOf('\x00');
        pos = (pos < 0) ? null : pos;
        return str.substring(0, pos);
    };

    return {
        type: data.toString('ascii', 0, 1),
        vaRating: data.toString('ascii', 1, 7),
        firmwareVersion: data.toString('ascii', 7, 12),
        model: N(data.toString('ascii', 12, 27)),
        manufacturer: N(data.toString('ascii', 27, 43)),
        serial: N(data.toString('ascii', 44, 59)),
        communicationVersion: data.toString('ascii', 60, 65),
        otherVersion: data.toString('ascii', 65, 70),
        general: data.toString('ascii', 70)
    };
}

/**
 * Parses and validates a response message.
 *
 * @param msg
 */
SamilSolarInverterProtocol.prototype.parseResponseMessage = function(msg)
{
    // Put the received data into a buffer and validate it.
    var b = new Buffer(msg, 'binary');
    this.validateMessage(b);

    // Verify the command is valid.
    var cmd = b.readUInt16BE(2);
    if(!(cmd & 0x80)) {
        throw new Error('Invalid response command: 0x' + cmd);
    }

    // Verify the unknown byte is valid.
    if(b.readUInt8(4) != 0) {
        throw new Error('Invalid response byte: 0x' + b.readUInt8(4).toString(16));
    }

    // Extract the data and verify the length.
    var data = b.slice(7, -2);
    if(data.length != b.readUInt16BE(5)) {
        throw new Error('Invalid data length, '+
                        'got: ' + data.length,
                        'expected: ' + b.readUInt16BE(5));
    }

    // Handle the command response
    switch(cmd &~ 0x80) {
        case CMD_DEVICE_STATS:
            return util._extend({responseType: 'stats'}, this.parseDeviceStats(data));
        case CMD_DEVICE_INFO:
            return util._extend({responseType: 'info'}, this.parseDeviceInfo(data));
        case CMD_DEVICE_PARAMS:
        //    return this.parseDeviceParamsData(data);
        default:
            throw new Error('Unknown command response: 0x' + cmd);
    }
};

module.exports.SamilSolarInverterProtocol = SamilSolarInverterProtocol;