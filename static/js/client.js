function SamilSolarWebClient()
{

}

SamilSolarWebClient.prototype.log = function(msg)
{
    if(typeof console != 'undefined' && typeof console.log == 'function') {
        console.log(msg);
    }
};

SamilSolarWebClient.prototype.createDevice = function(device)
{
    if($('#' + device.serial).length) return;

    $('#devices').append(
        '<div id="'+device.serial+'" class="device well">'+
            '<h5>'+device.manufacturer+' '+device.model+' (' + device.serial + ')</h5>'+
            '<div class="row-fluid">'+
                '<div class="stats-label span3">Mode</div>'+'<div class="operatingMode value span3"></div>'+
                '<div class="stats-label span3">Uptime</div>'+'<div class="uptime value span3"></div>'+
            '</div>'+
            '<div class="row-fluid">'+
                '<div class="stats-label span3">PV1 Voltage</div>'+'<div class="pv1Voltage value span3"></div>'+
                '<div class="stats-label span3">PV2 Voltage</div>'+'<div class="pv2Voltage value span3"></div>'+
            '</div>'+
            '<div class="row-fluid">'+
                '<div class="heading span6">Single Phase</div>'+
                '<div class="heading span6">Output Data</div>'+
            '</div>'+
            '<div class="row-fluid">'+
                '<div class="stats-label span3">Grid Voltage</div>'+'<div class="gridVoltage value span3"></div>'+
                '<div class="stats-label span3">Output Power</div>'+'<div class="outputPower value span3"></div>'+
            '</div>'+
            '<div class="row-fluid">'+
                '<div class="stats-label span3">Grid Current</div>'+'<div class="gridCurrent value span3"></div>'+
                '<div class="stats-label span3">Energy Today</div>'+'<div class="energyToday value span3"></div>'+
            '</div>'+
            '<div class="row-fluid">'+
                '<div class="stats-label span3">Grid Frequency</div>'+'<div class="gridFrequency value span3"></div>'+
                '<div class="stats-label span3">Energy Today</div>'+'<div class="energyTotal value span3"></div>'+
            '</div>'+
        '</div>'
    );

    $('#status').html(
        '<strong>Inverter(s) detected...</strong>'+
        $('.device').length + ' inverter(s) connected!'
    ).removeClass('alert-info').addClass('alert-success');
};

SamilSolarWebClient.prototype.updateDeviceStats = function(serial, stats)
{
    var device$ = $('#' + serial);
    if(!device$.length) return;

    switch(stats.operatingMode) {
        case 1: stats.operatingMode = 'Normal'; break;
        case 5: stats.operatingMode = 'PV power off'; break;
        default: stats.operatingMode = 'Unknown (' + stats.operatingMode + ')';
    }

    for(var stat in stats) {
        if(!stats.hasOwnProperty(stat)) continue;
        device$.find('.value.' + stat).text(stats[stat]);
    }
};

SamilSolarWebClient.prototype.handleData = function(data)
{
    if(data.device) {
        this.createDevice(data.device);

        if(data.stats) {
            this.updateDeviceStats(data.device.serial, data.stats);
        }
    }

};

SamilSolarWebClient.prototype.start = function()
{
    var self = this;

    this.log('Connecting to socket.io server...');
    this.socket = io.connect();

    this.socket.on('connect', function() {
        self.log('Connected to socket.io server!');
    });

    this.socket.on('data', function(data) {
        self.handleData(data);
    });
};

var client = new SamilSolarWebClient();
client.start();