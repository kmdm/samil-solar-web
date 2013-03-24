var sswb        = require('../lib/broadcaster'),
    broadcaster = new sswb.SamilSolarInverterBroadcaster();

broadcaster.start();

setTimeout(function() {
    broadcaster.stop();
}, 20000);
