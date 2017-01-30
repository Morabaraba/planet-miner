var gm = gm || {};
var nick =  "clientId-Anon" + Math.trunc(Math.random() * 1000);
var mqtt = {
        useSSL: false, // atleast it is encrypted
        //userName: 'anon', // I know this is insecure
        //password: 'pleasebegentle',
        keepAliveInterval: 30 // check every 30 sec if we are still allive
    }
gm.config = {
    game: {
        version: "20160704",
        debug: false,
        width: 848,
        height: 480,
        physicsSystem: Phaser.Physics.ARCADE,
        backgroundColor: '#000000',
        player: {
            nick : nick,
            bounceY: 0.2,
            normalSpeed: 200,
            superSpeed: 300
        },
        level: 'levels/level2.json',
        breakCounter: 0 // because deon
    },
    mqtt: mqtt,
    chat: {
        hostname: 'broker.mqttdashboard.com',
        port: 8000,
        path: '/mqtt',
        clientId: nick,
        connectOptions: mqtt,
        topic: 'actionspaceminer'
    },

}