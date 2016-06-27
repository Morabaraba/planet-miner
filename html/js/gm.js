/* global docCookies */
var root = this;

// Up until now GameMaster was a object now we promote it to a function.
// But let us store the current config objecr
var GameMasterConfig = gm || {};
var GameMaster = function(GameMasterConfig) {
    var self = this;
    // yes the names seems strange
    self.config = GameMasterConfig.config;
    self.loadConfig();
    self.sim = new Sim();
    self.players = [];
    try { //initialize the application
        m.mount(document.getElementById('chatapp'), {
            controller: chat.controller,
            view: chat.view
        });

        // let the cookie monster eat our state.
        self.saveConfig();
    } catch (e) {
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
}

GameMaster.prototype.loadConfig = function() {
    var self = this;
    self.config.chat.clientId = docCookies.getItem('clientId' ) || self.config.chat.clientId;
    self.config.game.player.nick = docCookies.getItem('nick' ) || self.config.game.player.nick;
    self.config.game.level = docCookies.getItem('level' ) || self.config.game.level;
}

GameMaster.prototype.actions = {
    MESSAGE: 'msg',
    MOVE: 'mov',
    CREATE: 'crt',
    ACTION: 'act'
};
GameMaster.prototype.movePlayerRight = function() {
    var self = this;
    //self.sim.addAction(self.actions.MOVE, )
}
GameMaster.prototype.createPlayer = function(msg) {
    var self = this;
    //self.sim.addAction(self.actions.MOVE, )
    msg = msg || {clientId : self.currentSessionId()};
    if (self.players[msg.clientId]) return;
    
    var player = game.add.sprite(32, 32, 'dude');
    
    var style = { font: "16px Arial", fill: "#ffffff"};
    var text = game.add.text(0, 0, msg.clientId, style);
    //player.addChild(text);
    // TODO fix hack
    player.text = text;
    
    player.animations.add('left', [0, 1, 2, 3], 10, true);
    player.animations.add('turn', [4], 20, true);
    player.animations.add('right', [5, 6, 7, 8], 10, true);
    
    self.players[msg.clientId] = player;
    chat.mq.send({type: 'crt'});
    return player;
}

GameMaster.prototype.currentSessionId = function() {
    return gm.config.chat.clientId //+ '-' + gm.config.game.player.nick;
}

GameMaster.prototype.movePlayer = function(player, opts) {
    opts = opts || {};
    var msg = {
        type: 'mov',
        x: player.x,
        y: player.y,
    };
    msg = _.assignIn(msg, opts);
    chat.mq.send(msg);
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
        return;
    }
    particleBurst(player, facing === 'left' ? player.width : 0);
}

GameMaster.prototype.updatePlayer = function(msg) {
    var self = this;
    if (msg.clientId === self.currentSessionId()) return;
    var player = self.players[msg.clientId];
    if (!player) {
        console.error('no player found', msg);
        return;
    }
    if (msg.idle) {
        var facing = player.animations.name;
        player.animations.stop();
        if (facing == 'left')
        {
            player.frame = 0;
        }
        else
        {
            player.frame = 5;
        }
    //} else if (player.x === msg.x) {
        // nothing
    } else if (player.x < msg.x) {
        player.animations.play('right');    
    } else {
        player.animations.play('left')
    }
    player.x = msg.x;
    player.y = msg.y;
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
                game.play();
            })
        }
    }
    function simQueue() {
        var self = this;
        //self.
    }    
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
    root.gm.showGameScreen()
}