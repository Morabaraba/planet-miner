 var gm = {};
    gm.players = {};
    gm.createPlayer = function(msg) {
        msg = msg || {clientId : chat.config.clientId};
        if (gm.players[msg.clientId]) return;
        
        var player = game.add.sprite(32, 32, 'dude');
        
        var style = { font: "16px Arial", fill: "#ffffff"};
        var text = game.add.text(0, 0, msg.clientId, style);
        //player.addChild(text);
        // TODO fix hack
        player.text = text;
        
        player.animations.add('left', [0, 1, 2, 3], 10, true);
        player.animations.add('turn', [4], 20, true);
        player.animations.add('right', [5, 6, 7, 8], 10, true);
        
        gm.players[msg.clientId] = player;
        chat.mq.send({type: 'crt'});
        return player;
    }
    
    gm.movePlayer = function(player, opts) {
        opts = opts || {};
        var msg = {
            type: 'mov',
            x: player.x,
            y: player.y,
        };
        msg = _.assignIn(msg, opts);
        chat.mq.send(msg);
    }
    
    gm.actionPlayer = function(msg) {
        if (!msg) {
            // $@#$ HACK TODO
            chat.mq.send({type: 'act', });
            return;
        }
        var player = gm.players[msg.clientId];
        if (!player) {
            console.error('no player found', msg);
            return;
        }
        particleBurst(player, facing === 'left' ? player.width : 0);
    }
    
    gm.updatePlayer = function(msg) {
        if (msg.clientId === chat.config.clientId) return;
        var player = gm.players[msg.clientId];
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

function gofull() {
    if (!game.scale) {
        window.setTimeout(gofull, 500, true);
        return;
    }
    game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;
    //game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
    //game.scale.windowConstraints.right =  'visual';
    //game.scale.windowConstraints.bottom = 'visual';
    var wrapper = document.getElementById('game-screen')
    game.scale.fullScreenTarget = wrapper;
    // {"right":"layout","bottom":""}
    if (game.scale.isFullScreen)
    {
        game.scale.stopFullScreen();
    }
    else
    {
        game.scale.startFullScreen(false);
    }

}

var button = document.querySelector('#btn-fullscreen');
button.addEventListener('click', gofull);
