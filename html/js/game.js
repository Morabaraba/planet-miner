/* global Phaser */
var game;
function startGame() {
    if (game) return;
    game = new Phaser.Game(848, 480, Phaser.CANVAS, 'phaser', { preload: preload, create: create, update: update, render: render });
    
};

    function preload() {
    
        game.load.tilemap('level1', 'assets/games/starstruck/level1.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.image('tiles-1', 'assets/games/starstruck/tiles-1.png');
        game.load.spritesheet('dude', 'assets/games/starstruck/dude.png', 32, 48);
        game.load.spritesheet('droid', 'assets/games/starstruck/droid.png', 32, 32);
        game.load.image('starSmall', 'assets/games/starstruck/star.png');
        game.load.image('starBig', 'assets/games/starstruck/star2.png');
        game.load.image('background', 'assets/games/starstruck/background2.png');
        game.load.image('diamond', 'assets/sprites/diamond.png');
        game.load.image('rock', 'images/rock.png');
    }
    
    var map;
    var tileset;
    var layer;
    var player;
    var facing = 'left';
    var jumpTimer = 0;
    var cursors;
    var jumpButton;
    var actionButton;
    var bg;
 
    var emitter;
   
    function create() {
    
        game.physics.startSystem(Phaser.Physics.ARCADE);
    
        game.stage.backgroundColor = '#000000';
    
        bg = game.add.tileSprite(0, 0, 848, 480, 'background');
        bg.fixedToCamera = true;
    
        map = game.add.tilemap('level1');
    
        map.addTilesetImage('tiles-1');
    
        map.setCollisionByExclusion([ 13, 14, 15, 16, 46, 47, 48, 49, 50, 51 ]);
    
        layer = map.createLayer('Tile Layer 1');
    
        //  Un-comment this on to see the collision tiles
        // layer.debug = true;
    
        layer.resizeWorld();
    
        game.physics.arcade.gravity.y = 250;
    
        player = gm.createPlayer();
        
        game.physics.enable(player, Phaser.Physics.ARCADE);
        player.body.bounce.y = 0.2;
        player.body.collideWorldBounds = true;
        player.body.setSize(20, 32, 5, 16);
    
        game.camera.follow(player);
    
        cursors = game.input.keyboard.createCursorKeys();
        jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.ALT);
        actionButton = game.input.keyboard.addKey(Phaser.Keyboard.CONTROL);
        
        
        emitter = game.add.emitter(0, 0, 1000);

        emitter.makeParticles('rock');
        emitter.gravity = 200;
        
        game.scale.onFullScreenChange.add(function () {
            var wrapper = document.getElementById('wrapper');
            wrapper.classList.toggle("center");
            document.getElementById("chat-input").focus(); 
        })
        document.body.style.display = "block";
        document.getElementById("loading-screen").style.display = "none";
        document.getElementById("game-screen").style.display = "block";
        document.getElementById("chat-input").focus(); 
        
        game.stage.disableVisibilityChange = true;
    }
    
function particleBurst(pointer, offset) {
    offset = offset || 0;
    //  Position the emitter where the mouse/touch event was
    emitter.x = pointer.x + offset;
    emitter.y = pointer.y + pointer.height;

    //  The first parameter sets the effect to "explode" which means all particles are emitted at once
    //  The second gives each particle a 2000ms lifespan
    //  The third is ignored when using burst/explode mode
    //  The final parameter (10) is how many particles will be emitted in this single burst
    emitter.start(true, 750, null, 10);

}    
    var speed = 150;
    function update() {
        var playerMoved = false; 
        //game.physics.arcade.collide(player, layer);
        _.values(gm.players).forEach(function(sprite) {
            game.physics.arcade.collide(sprite, layer);    
            //game.physics.arcade.collide(player.text, layer);  
            sprite.text.x = Math.floor(sprite.x + sprite.width / 2 - (sprite.text.width / 2 )) ;
            sprite.text.y = Math.floor(sprite.y - 10);
        })
    
        // TODO fix hack
        if (!player || !player.body) return;
        
        player.body.velocity.x = 0;
    
        if (cursors.left.isDown)
        {
            playerMoved = true;
            player.body.velocity.x = -1 * speed;
    
            if (facing != 'left')
            {
                player.animations.play('left');
                facing = 'left';
            }
        }
        else if (cursors.right.isDown)
        {
            playerMoved = true;
            player.body.velocity.x = speed;
    
            if (facing != 'right')
            {
                player.animations.play('right');
                facing = 'right';
            }
        }
        else
        {
            if (facing != 'idle')
            {
                playerMoved = true;
                
                player.animations.stop();
                
                if (facing == 'left')
                {
                    player.frame = 0;
                }
                else
                {
                    player.frame = 5;
                }
    
                facing = 'idle';
                
            }
        }
        
        
        if (actionButton.isDown && facing !== 'idle') {
            if (player.body.onFloor()) {
                particleBurst(player, facing === 'left' ? player.width : 0);    
                gm.actionPlayer();
            }
            speed = 450;
        } else {
            speed = 150;
        }
        if (jumpButton.isDown && player.body.onFloor() && game.time.now > jumpTimer)
        {
            player.body.velocity.y = -250;
            jumpTimer = game.time.now + 750;
            playerMoved = true;
        }
        if (playerMoved || !player.body.onFloor()) {
            gm.movePlayer(player, { idle: facing === 'idle'});
        }
    
    }
   
    function render () {
    
        // game.debug.text(game.time.physicsElapsed, 32, 32);
        // game.debug.body(player);
        // game.debug.bodyInfo(player, 16, 24);
    
    }
    
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
            chat.mq.send({type: 'act'});
            return;
        }
        var player = gm.players[msg.clientId];
        if (!player) {
            console.error('no player found', msg);
            return;
        }
        particleBurst(player);
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