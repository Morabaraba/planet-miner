var gm = gm || {};
var nick =  "Anon" + Math.trunc(Math.random() * 1000);
gm.config = {
    game: {
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
        level: 'levels/level3-town.json'
    },
    mqtt: {
        useSSL: true, // atleast it is encrypted
        userName: 'anon', // I know this is insecure
        password: 'pleasebegentle',
        keepAliveInterval: 30 // check every 30 sec if we are still allive
    },
    chat: {
        hostname: 'haasdas-morabaraba.c9users.io',
        port: 443,
        path: '/ws',
        clientId: nick,
        connectOptions: gm.mqtt,
        topic: 'lobby.beta'
    },

}