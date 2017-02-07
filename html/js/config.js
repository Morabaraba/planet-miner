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
            x: 128,
            y: 128,
            nick : nick,
            bounceY: 0.2,
            normalSpeed: 200,
            superSpeed: 300,
            moveDelay: 500,
        },
        audio: {
            enabled: false,
            music: 0,
            sound: 1,
            volume: 0
        },
        level: 'levels/level2.json',
        defaultTileHealth : 3,
        defaultBreakDelay : 200,
        map: {}, // TODO
        breakCounter: 0, // because deon
        diamondCounter: 0 // because marnus
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