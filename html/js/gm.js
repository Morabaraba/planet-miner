/* global docCookies */
var root = this;

// source our config object gm or create it.
var GameMasterConfig = gm || {};
var GameMaster = function(GameMasterConfig) {
    try { //initialize the application
        var self = this;
        // yes the names seems strange
        self.config = GameMasterConfig.config;
        // let us go eat our cookies in the browser
        self.loadConfig();
        // TODO start our simulation
        self.sim = new Sim();
        // Well who is playing with you and who do you trust?
        self.players = {};
        var level = window.location.search.substring(1) || window.top.location.search.substring(1);
        // we use the hash as a instance identifier
        gm.config.game.instance = window.location.hash.slice(1) || window.top.location.hash.slice(1);
        
        if (level !== '') {
            console.log('loading level', level);
            gm.config.game.level = level;
        }
       
        m.mount(document.getElementById('chat-app'), {
            controller: chat.controller,
            view: chat.view
        });

        // let the cookie monster eat our state.
        self.saveConfig();
    } catch (e) {
        debugger;
        console.error(e, arguments, this);
        //tell our screen loader loop something went wrong
        self.err = e;
        //GameMaster.mqtt.publish(bert.encode(e));
        throw e // we do not die silently
    }
};
var isNode = false;
// Export the Underscore object for **CommonJS**, with backwards-compatibility
// for the old `require()` API. If we're not in CommonJS, add `_` to the
// global object.
if (typeof module !== 'undefined' && module.exports) {
        module.exports = GameMaster;
        root.GameMaster = GameMaster;
        isNode = true;
} else {
    // watch out we replace it below with a instance of a GameMaster class    
    root.GameMaster = GameMaster;
}


GameMaster.prototype.saveConfig = function() {
    var self = this;
    console.debug('Saving state for ' + chat.Message.prototype.sessionId())
    docCookies.setItem( 'clientId', self.config.chat.clientId);
    docCookies.setItem('nick', self.config.game.player.nick);
    docCookies.setItem('level', self.config.game.level);
    docCookies.setItem('breakCounter', self.config.game.breakCounter);
    if (gm.player) {
        docCookies.setItem('playerx', gm.player.body.x);
        docCookies.setItem('playery', gm.player.body.y);
    }
}

GameMaster.prototype.loadConfig = function() {
    var self = this;
    self.config.chat.clientId = docCookies.getItem('clientId' ) || self.config.chat.clientId;
    self.config.game.player.nick = docCookies.getItem('nick' ) || self.config.game.player.nick;
    self.config.game.player.x = docCookies.getItem('playerx' ) || self.config.game.player.x;
    self.config.game.player.y = docCookies.getItem('playery' ) || self.config.game.player.y;
    self.config.game.level = docCookies.getItem('level' ) || self.config.game.level;
    self.config.game.breakCounter = docCookies.getItem('breakCounter' ) || self.config.game.breakCounter;
    self.config.game.diamondCounter = docCookies.getItem('diamondCounter' ) || self.config.game.diamondCounter;
}

GameMaster.prototype.actions = {
    MESSAGE: 'msg',
    MOVE: 'mov',
    CREATE: 'crt',
    ACTION: 'act',
    BREAK: 'brk',
    DAMAGE: 'dmg'
};
GameMaster.prototype.movePlayerRight = function() {
    var self = this;
    //self.sim.addAction(self.actions.MOVE, )
}

GameMaster.prototype.createPlayer = function(msg) {
    var self = this;
    //self.sim.addAction(self.actions.MOVE, )
    msg = msg || {clientId : self.currentSessionId()};
    if (self.players[msg.clientId]) return self.players[msg.clientId];

    var x = 128;
    var y = 128;
    var localPlayer = msg.clientId === self.currentSessionId();
    if (localPlayer) {
        x = gm.config.game.player.x || x;
        y = gm.config.game.player.y || y;
    } 
    
    var player = game.add.sprite(Number(x), Number(y), 'dude');
    if (localPlayer) gm.player = player;
    console.log('player created x y', msg.clientId, player.x, player.y)

    var style = { font: "16px Arial", fill: "#ffffff", width: "480px", wordWrap: true, height: "230px"};
    var text = game.add.text(0, 0, msg.clientId, style);
    //text.anchor.x = 0.5;
    text.anchor.y = 1;
    //player.addChild(text);
    // TODO fix hack
    player.text = text;
    player.opts = msg;
    
    player.animations.add('left', [0, 1, 2, 3], 10, true);
    player.animations.add('turn', [4], 20, true);
    player.animations.add('right', [5, 6, 7, 8], 10, true);

    game.physics.enable(player, Phaser.Physics.ARCADE);
    player.body.bounce.y = gm.config.game.player.bounceY;

    if (!msg.body) {
        if (msg.x) player.x = msg.x;
        if (msg.y) player.y = msg.y
    }
    
    self.players[msg.clientId] = player;

    chat.mq.send({type: 'crt'});
    return player;
}

GameMaster.prototype.destroyPlayer = function(msg) {
    if (msg.clientId === chat.config.clientId) return;
    var player = this.players[msg.clientId];
    if (!player) {
        console.log('could not find player', msg.clientId, 'dropping destroy' );
        return
    }
    player.text.destroy();
    player.destroy();
    //delete this.players[msg.clientId];
    this.players[msg.clientId] = undefined;
}

GameMaster.prototype.currentSessionId = function() {
    return gm.config.chat.clientId //+ '-' + gm.config.game.player.nick;
}

var moveDelay;
var oldMoveMsg;
GameMaster.prototype.movePlayer = function(player, opts) {
    // it there no player don't move it.
    if (!player || !player.body) return; // into the ether you go
    opts = opts || {};
    
    // allow movement every x amount(delay movement)
    if (player.body.velocity.x == 0) moveDelay = game.time.now;
    
    if (!opts.force && moveDelay > game.time.now) {
        console.debug('move delay blocking msg')
        return;
    }
    moveDelay = game.time.now + gm.config.game.moveDelay;
    
    // build msg
    var msg = {
        type: 'mov',
        x: player.x,
        y: player.y,
        body: { 
            velocity: {
                x: player.body.velocity.x, 
                y: player.body.velocity.y
            }
        }
    };
    /*
    if (oldMoveMsg && oldMoveMsg.x == msg.x && oldMoveMsg.x == msg.x) {
        console.debug('No movement, dropping msg')
        return;
    }
    */
    
    // ignore why for gravity
    /*if (!opts.force && oldMoveMsg && oldMoveMsg.body.velocity.x === msg.body.velocity.x 
        // && oldMoveMsg.body.velocity.y === msg.body.velocity.y
        && oldMoveMsg.y === msg.y
        ) {
        console.debug('No movement, dropping msg')
        return;
    }*/
    
    
    // mix in our options
    msg = _.extend(msg, opts);
    oldMoveMsg = _.clone(msg);
    // send it to our mq
    chat.mq.send(msg);
    
    docCookies.setItem('playerx', player.x);
    docCookies.setItem('playery', player.y);
}

GameMaster.prototype.chatPlayer = function(msg) {
    var self = this;
    console.log('Player chat', msg)
    var player = self.players[msg.clientId];
    if (!player) {
        console.error('no player found', msg);
        gm.createPlayer(msg);
        return;
    }
    //if (msg.text.length > 256)
    //    substring
    player.text.text = msg.clientId + ': ' + msg.text;
    if (player.timeoutID) window.clearTimeout(player.timeoutID);
    player.timeoutID = window.setTimeout(function() {
        player.text.text = msg.clientId    
    }, 15 * 1000 // 15 sec
    );
}

GameMaster.prototype.actionPlayer = function(msg) {
    var self = this;
    if (!msg) {
        // $@#$ HACK TODO
        chat.mq.send({type: 'act', });
        return;
    }
    var player = self.players[msg.clientId];
    if (!player) {
        console.error('no player found', msg);
        self.createPlayer(msg)
        return;
    }
    particleBurst(player, facing === 'left' ? player.width : 0);
}

GameMaster.prototype.takeDiamond = function(gameId) {
    var self = this;
    chat.mq.send({type: 'my$', gameId: gameId});
}

GameMaster.prototype.breakTile = function(x, y) {
    var self = this;
    chat.mq.send({type: 'brk', x: x, y: y});
}

GameMaster.prototype.createDiamond = function(tile, sprite) {
    var msg = {
        gameId: sprite.gameId,
        type: '$$$',
        tile : { x : tile.x, y : tile.y },
        body: { velocity: { x : sprite.body.velocity.x, y : sprite.body.velocity.y } }
    }
    chat.mq.send(msg);
}

GameMaster.prototype.damageTile = function(x, y, health) {
    var self = this;
    chat.mq.send({type: 'dmg', x: x, y: y, health: health});
}

var wallTouched
GameMaster.prototype.updatePlayer = function(msg) {
    var self = this;
    if (msg.clientId === self.currentSessionId()) return;
    var player = self.players[msg.clientId];
    if (!player) {
        console.error('no player found', msg);
        // let us create a player;
        gm.createPlayer(msg);
        return;
    }
    if (msg.idle) {
        var facing = msg.facing || player.animations.name;
        player.animations.stop();
        if (facing == 'left')
        {
            player.frame = 0;
        }
        else if (facing == 'right')
        {
            player.frame = 5;
        }
    } else {
        if (msg.facing) {
            player.animations.play(msg.facing); 
        } else
        if (player.x < msg.x) {
            player.animations.play('right');    
        } else {
            player.animations.play('left')
        }
    }
    
    if (player.body.onWall() ) {
        wallTouched = true;
    } else if (!wallTouched){
        player.x = msg.x;
        wallTouched = false;
    }
    player.y = msg.y;
    player.body.velocity.x = msg.body.velocity.x;
    player.body.velocity.y = msg.body.velocity.y;

}


GameMaster.prototype.hideChat = function() {
    document.getElementById("chat-app").style.display = "none";        
};

GameMaster.prototype.showChat = function(show) {
    if (show) {
        document.getElementById("chat-app").style.display = "block";
        document.getElementsByClassName("chat-input")[0].focus();
    } else {
        //chat.vm.post();
    }
}

GameMaster.prototype.showGameScreen = function(show) {
    show = show || true;
    if (show) {
        document.body.style.background = "black";
        document.getElementById("loading-screen").style.display = "none";
        document.getElementById("game-screen").style.display = "block";
    } else {
        document.body.style.background = "white";
        document.getElementById("loading-screen").style.display = "block";
        document.getElementById("game-screen").style.display = "none";        
    }
}

GameMaster.prototype.goFullscreen = function() {
    var game = gm.game;
    if (!game.scale) {
        window.setTimeout(this.goFullscreen, 500, true);
        return;
    }
    game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;
    game.scale.fullScreenTarget = document.getElementById('game-screen')
    if (game.scale.isFullScreen) {
        game.scale.stopFullScreen()
        gm.goFullscreen.goSubFullscreen.isFullScreen = true;
        gm.goFullscreen.goSubFullscreen(true);
    }
    else {
        game.scale.startFullScreen(false)
        gm.goFullscreen.goSubFullscreen.isFullScreen = false;
        gm.goFullscreen.goSubFullscreen(true);
    };
    
}

function Sim() {
    var self = this;
    var tickers = [self];
    var queueCollecting = [];
    var queueProcessing = [];
    var queuePlaying = [];
    var queueDiscarding = [];
    self.tickEvery = 300; // ms
    self.tick = Date.now()
    self.tickPrev = Date.now()
    self.tickNext = Date.now() + self.tickEvery
    function runTick() {
        self.tickPrev = self.tick;
        self.tick = Date.now();
        if (self.tick > self.tickNext) { 
            queuePlaying.forEach(function(event){
                debugger
                game.play();
            })
        }
    }
    function simQueue() {
        var self = this;
        //self.
    }    
}

GameMaster.prototype.loadData = function(data) {
    map.damagedTiles = data.damagedTiles;

    if (data.diamonds) {
        data.diamonds.forEach(function(msg) {
            console.debug('creating diamond', msg)
            var tile;
            if (msg.tile)
                tile = map.getTile(msg.tile.x, msg.tile.y);
            createDiamond(tile, msg);
        })
    }
    
    _.keys(map.damagedTiles).forEach(function (key) {
        var health = map.damagedTiles[key];
        var keyXY = key.split('-');
        var x = Number(keyXY[0]), y = Number(keyXY[1]);
        
        var tile = map.getTile(x, y) ;
        if (health <= 0) {
            console.debug('removing tile', key)
            map.removeTile(x, y)
        }
        else
        {   console.debug('set tile', key, 'health', health)
            tile.alpha = (((health / gm.config.game.defaultTileHealth) * 70) + 30) / 100; 
        }
    });
    layer.dirty = true;
}

Sim.prototype.addAction = function(action, opt) {
    var self = this;
    self.queueCollecting.push({time: Date.now(), action: action, opt: opt});
}



if (typeof module !== 'undefined' && module.exports) {
    // We are in node land so we are only going to export the GameMaster function and not init a gameMaster client
} else {
    root.gm = new GameMaster(GameMasterConfig);
    root.gm.game = startGame(); 
}

