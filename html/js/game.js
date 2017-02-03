// We have pixi.js's to colour our screen and Phaser to challenge the player! 
/* global Phaser */
// The Boss, or GameMaster
/* global gm */

// our game variables that is used with phaser.
var game;
var bg;
var map;
var ui
var tileset;
var layer;

// player information and status
var player;
var facing = 'left';
var lastFacing = 'left';
var facingJump;
var jumpTimer = 0;
var jumping = false;
var jumpMoveDelay;

var speed;
var normalSpeed;
// disabled for now
var inWater = false;

// water sprite
var water;
// sprite for text with counter for tile breaks
var breakCounterText;
var tileHealthText;

// Keyboard cursors
var cursors;
// Our Touch Button callbacks
var actionTouch;
var jumpTouch;
var pad;
var stick;

// Sound
var music;
var crumblingSound;

// Particle emitters
var emitter;

function createMap(opt) {
    opt = opt || {};
    // cleanout our current layer and map before creating the new objects
    if (layer) {
        layer.visible = false;
        layer.parent.remove(layer);
        layer.destroy();
        layer = undefined;
    }
    if (map) {
        map.visible = false;
        map.destroy();
        map = undefined;
    };
    
    var load;
    function onLoadComplete () {
        var self = this;
        setTimeout(function() {
            map = game.add.tilemap('level1');
            // see functions below
            map.breakTile = breakTile;
            map.damageTile = damageTile;
            map.addTilesetImage('tiles-1');
            map.addTilesetImage('RPGpack_sheet');
            map.setCollisionByExclusion([
                // Starstruck
                13, 14, 15, 16, 46, 47, 48, 49, 50, 51,
                // RPG Pack
                // crate
                3317, 3318, 3397, 3398, 3477, 3478,
                // 
            ]);
            layer = map.createLayer('Tile Layer 1');
            layer.resizeWorld();
            game.world.setChildIndex(layer, 1)
            levelText.text = gm.config.game.level;
            root.gm.showGameScreen()
            game.paused = false;
        }, 100)

    }
    function onFileError() {
        chat.mq.client.unsubscribe(buildTopic());
        gm.config.game.level = 'levels/level2.json';    
        chat.mq.client.subscribe(buildTopic());
        createMap({load: true})
    }
    
    if (opt.load) {
        game.paused = true;
        load = game.load.tilemap('level1', gm.config.game.level, null, Phaser.Tilemap.TILED_JSON);
        load.onLoadComplete.addOnce(onLoadComplete);
        load.onFileError.addOnce(onFileError);
        game.load.start()
    } else {
        console.log('WARNINGL why not load it?')
        addTilemap();
    }
}


function createWater() {
    // TODO disabled for now
    return;
    water = game.add.tileSprite(0, game.world.height - 128, 128 * 16, 24 * 16, 'waters');
    water.alpha = 0.5;

    water.animations.add('waves0', [0, 1, 2, 3, 2, 1]);
    water.animations.add('waves1', [4, 5, 6, 7, 6, 5]);
    water.animations.add('waves2', [8, 9, 10, 11, 10, 9]);
    water.animations.add('waves3', [12, 13, 14, 15, 14, 13]);
    water.animations.add('waves4', [16, 17, 18, 19, 18, 17]);
    water.animations.add('waves5', [20, 21, 22, 23, 22, 21]);
    water.animations.add('waves6', [24, 25, 26, 27, 26, 25]);
    water.animations.add('waves7', [28, 29, 30, 31, 30, 29]);

    // change to animation num
    var n = 7;
    water.animations.play('waves' + n, 8, true);
    game.physics.enable(water, Phaser.Physics.ARCADE);
    water.body.collideWorldBounds = true;
    water.body.immovable = true;
    water.body.allowGravity = false;
}

function createJoystick() {
    pad = game.plugins.add(Phaser.VirtualJoystick);
    
    stick = pad.addStick(0, 0, 200, 'arcade');
    stick.alignBottomLeft();
    stick.showOnTouch = true; // remove default handlers
    stick.pad.game.input.onDown.remove(stick.checkDown, stick);// add in your own
    game.input.onDown.add(checkDown, this);function checkDown(pointer) {  
        if (pointer.x < game.width / 2)  {    
        // right place? then call the Sticks checkDown method    
            stick.checkDown(pointer);  
        
        }
    }
}

function actionTouchButton() {
    if (facing !== 'idle') {
        if (player.body.onFloor()) {
            particleBurst(player, facing === 'left' ? player.width : 1);
            speed = gm.config.game.player.superSpeed;
            normalSpeed = gm.config.game.player.normalSpeed;
            gm.actionPlayer();
        }
    }
}

function stickLeft() {
    return stick.isDown &&
        // This is a value between -1 and 1 calculated based on the distance of the stick from its base. Where -1 is to the left of the base and +1 is to the right.
        stick.x < 0; 
}

function stickUp() {
    return stick.isDown &&
        stick.y < -0.3; 
}

function stickDown() {
    return stick.isDown &&
        stick.y > 0.5; 
}

function stickRight() {
    return stick.isDown &&
        // This is a value between -1 and 1 calculated based on the distance of the stick from its base. Where -1 is to the left of the base and +1 is to the right.
        stick.x > 0; 
}

function testTouch(sprite) {
    if (!sprite || !sprite.input) return false;
    if (sprite.input.pointerDown(game.input.activePointer.id)) return true;
    var result = false;
    for (var x = 1; x <= game.input.totalActivePointers; x++) {
        result = result || sprite.input.pointerDown(game.input['pointer' + x].id);
        if (result)
            return result;
    }
    return result;
}

function createButton(x, y, z, cb) {
    var sprite = game.add.button(x, y, z);
    sprite.inputEnabled = true;
    sprite.fixedToCamera = true;
    if (cb) {
        sprite.events.onInputDown.add(cb, this);
    }
    else {
        sprite.input.start();
    }
    ui.add(sprite);
    return sprite;
}


function damageTile(x, y, tile, fromGM, health) {
    map.damagedTiles = map.damagedTiles || {};
    var key = x + '-' + y;
    if (!health)
        health = map.damagedTiles[key] || gm.config.game.defaultTileHealth;
    health = health - 1;
    tileHealthText.text = 'Tile Health: ' + health;
    map.damagedTiles[key] = health;
    // late night math to only allow 0.7 % in alpha drop
    tile.alpha = (((health / gm.config.game.defaultTileHealth) * 70) + 30) / 100;
    layer.dirty = true;
    if (!fromGM)
        gm.damageTile(x, y, health);
    return health;
}

var breakDelay = 0;
function breakTile(tile, x, y) {
    //debugger;
    if (!(game.time.now - breakDelay > gm.config.game.defaultBreakDelay)) return;
    breakDelay = game.time.now;
    var health = damageTile(tile.worldX, tile.worldY, tile);
    console.log('x', x, 'y', y, 'health', health)
    if (!crumblingSound.isPlaying) {
            crumblingSound.play();
    }
    particleBurst(new Phaser.Point(tile.worldX, tile.worldY));
    if (health <= 0) {

        
        map.removeTileWorldXY(tile.worldX, tile.worldY, 16, 16)
        gm.breakTile(x, player.y + y)
        
        
        gm.config.game.breakCounter = Number(gm.config.game.breakCounter) + 1;
        breakCounterText.text  = gm.config.game.breakCounter + ' Tiles Busted';
        docCookies.setItem('breakCounter', gm.config.game.breakCounter);
    }
}


function jumpTouchButton() {
    function jumpUp() {
        if (inWater)  player.body.velocity.y = -150;
        else  player.body.velocity.y = -250;
        jumpTimer = game.time.now + 750;
        jumping = true;
        jumpMoveDelay =  game.time.now + gm.config.game.jumpMsgDelay;
        gm.movePlayer(player, {
            idle: facing === 'idle',
        });
    }
    if (player.body.onFloor() && game.time.now > jumpTimer || inWater) {
        jumpUp()
        facingJump = undefined; //facing == 'right' ? 'left' : 'right';
    }
    else if (player.body.onWall() && game.time.now > jumpTimer && (facingJump == undefined || facingJump != facing)) {
        facingJump = facing;
        jumpUp();
    }
}

function movePlayerLeft() {
    player.body.velocity.x = -1 *  gm.config.game.player.normalSpeed;
    if (facing != 'left') {
        player.animations.play('left');
        lastFacing = facing === 'idle' ? lastFacing : facing;
        facing = 'left';
    }
    gm.movePlayer(player, {
        idle: facing === 'idle',
    });
}

function movePlayerRight() {
    player.body.velocity.x =  gm.config.game.player.normalSpeed;
    if (facing != 'right') {
        player.animations.play('right');
        lastFacing = facing === 'idle' ? lastFacing : facing;
        facing = 'right';
    }
    gm.movePlayer(player, {
        idle: facing === 'idle',
    });
}

function particleBurst(pointer, offset) {
    offset = offset || 0;
    //  Position the emitter where the mouse/touch event was
    if (offset) {
        emitter.x = pointer.x + offset;
        emitter.y = pointer.y + pointer.height;
    }
    else {
        emitter.x = pointer.x
        emitter.y = pointer.y
    }
    //  The first parameter sets the effect to "explode" which means all particles are emitted at once
    //  The second gives each particle a 2000ms lifespan
    //  The third is ignored when using burst/explode mode
    //  The final parameter (10) is how many particles will be emitted in this single burst
    emitter.start(true, 1000, null, 2);

}

function startGame() {
    // party allready going?
    if (game) return game;
    // else lets get the `game` started
    game = new Phaser.Game(gm.config.game.width,
        gm.config.game.height,
        Phaser.CANVAS,
        'phaser', {
            preload: preload,
            create: create,
            update: update,
            render: render
        }
    );
    return game;
};

function preload() {
     game.time.advancedTiming = true;
    // we load our JSON tiled map in our createMap
    game.load.image('tiles-1', 'images/games/starstruck/tiles-1.png');
    game.load.image('RPGpack_sheet', 'images/RPGpack_sheet.png');
    game.load.spritesheet('dude', 'images/games/starstruck/dude.png', 32, 48);
    game.load.spritesheet('droid', 'images/games/starstruck/droid.png', 32, 32);
    game.load.image('starSmall', 'images/games/starstruck/star.png');
    game.load.image('starBig', 'images/games/starstruck/star2.png');
    game.load.image('background', 'images/games/starstruck/background2.png');
    game.load.image('diamond', 'images/sprites/diamond.png');
    game.load.image('rock', 'images/rock.png');
    game.load.spritesheet('waters', 'images/sprites/waters.png', 32, 400, 32);
    
    // keyboard and input assets
    game.load.image("btn-fullscreen", "images/Blank_White_Resize.png");
    game.load.image("btn-chat", "images/chat-bubble.png");
    game.load.image("btn-joystick", "images/joystick100.png");
    game.load.image("btn-a", "images/shadedLight36.png");
    game.load.image("btn-b", "images/shadedLight37.png");    
    game.load.atlas('arcade', 'images/arcade-joystick.png', 'js/arcade-joystick.json');
    
    // music and sound
    game.load.audio('crumbling', ['sound/Crumbling.mp3']);
    game.load.audio('spaceloop', ['sound/SpaceLoop.mp3']);
}

function create() {
    game.stage.disableVisibilityChange = true;
    
    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.physics.arcade.gravity.y = 250;
    
    game.stage.backgroundColor = gm.config.game.backgroundColor;
    
    bg = game.add.tileSprite(0, 0, game.width, game.height, 'background');
    bg.fixedToCamera = true;

    //  Un-comment this on to see the collision tiles
    // layer.debug = true;
    
    mapGroup = game.add.group();
    ui = game.add.group();
    
    var style = { font: "16px Arial", fill: "#ffffff"};
    breakCounterText = game.add.text(16, 16, gm.config.game.breakCounter + ' Tiles Busted', style);
    breakCounterText.fixedToCamera = true;
    
    breakCounterText = game.add.text(16, 16, gm.config.game.breakCounter + ' Tiles Busted', style);
    breakCounterText.fixedToCamera = true;
    tileHealthText = game.add.text(16, 64, 'Tile Health: 0', style);
    tileHealthText.fixedToCamera = true;
    
    levelText = game.add.text(16, 32, gm.config.game.level, style);
    levelText.fixedToCamera = true;
    
    mpsText = game.add.text(16, 48, '0', style);
    mpsText.fixedToCamera = true;

    helpText = game.add.text(256, 64, ''
        + 'Desktop:\n\n'
        + 'Use the <ARROW KEYS> to move\n' 
        + '<X> for break and <Y> for action\n' 
        + '<ENTER> opens a chat window, \n'
        + 'or u can use the top right button.\n\n'
        + 'Mobile:\n\n'
        + 'Tap and drag on the right side to move\n' 
        + 'Button <A> for break <B> for action\n' 
        + 'Use the joystick button top right\n'
        + 'if you can not see the buttons\n\n'
        + 'This message will destruct in 15 seconds...\n'
        , style);
    helpText.fixedToCamera = true;
    setTimeout(function(){ helpText.visible = false; }, 15000);
    
    createJoystick();
    createWater();
    createMap({load: true});
    
    player = gm.createPlayer();

    player.body.collideWorldBounds = true;
    player.body.setSize(20, 32, 5, 16);
    game.camera.follow(player);

    cursors = game.input.keyboard.createCursorKeys();
    jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.UP);
    actionButton = game.input.keyboard.addKey(Phaser.Keyboard.Z);
    breakButton = game.input.keyboard.addKey(Phaser.Keyboard.X);
    enterButton = game.input.keyboard.addKey(Phaser.Keyboard.ENTER)
    escButton = game.input.keyboard.addKey(Phaser.Keyboard.ESC)

    var chatOpen = false;
    function chatFunction() {
        chatOpen = !chatOpen;
        gm.showChat(chatOpen);
    }
    enterButton.onDown.add(chatFunction, this);
    escButton.onDown.add(chatFunction, this);
    // allow the user to open chat with a button
    chatTouch = createButton(game.width - 48, 8, 'btn-chat', chatFunction);
    chatTouch.width = 34;
    chatTouch.height = 34;
    
    // allow the user to set the game fullscreen
    createButton(game.width - 56, 48, 'btn-fullscreen', gm.goFullscreen).scale = {
        x: 0.5,
        y: 0.5
    };

    // btn-a break
    breakTouch = createButton(game.width - 154 , game.height - 148, 'btn-b');
    breakTouch.scale = {
        x: 1.2,
        y: 1.2
    };
    breakTouch.alpha = 0.3;
   
    // btn-b action
    actionTouch = createButton(game.width - 300, game.height - 148, 'btn-a');
    actionTouch.scale = {
        x: 1.2,
        y: 1.2
    };
    actionTouch.alpha = 0.3;
    
    if (game.device.desktop) {
        actionTouch.visible = false;
        breakTouch.visible = false;
    };
    
    function joystickFunction(){
        actionTouch.visible = !actionTouch.visible;
        breakTouch.visible  = !breakTouch.visible ;
    }    
    joystickTouch = createButton(game.width - 48, 108, 'btn-joystick', joystickFunction);
    joystickTouch.width = 34;
    joystickTouch.height = 34;
    
    emitter = game.add.emitter(0, 0, 1000);
    emitter.makeParticles('rock');
    emitter.gravity = 200;
    
    crumblingSound = game.add.audio('crumbling');
    
    music = game.add.audio('spaceloop');
    music.loop = true
    
    // let the magic begin
    music.play();
    music.volume = 0.2;
    
    game.world.setChildIndex(ui, game.world.children.length - 1);
    
}

function update() {
    var playerMoved = false;
    _.values(gm.players).forEach(function(sprite) {
        game.physics.arcade.collide(sprite, layer);
        sprite.text.x = Math.floor(sprite.x);
        sprite.text.y = Math.floor(sprite.y);
    })

    // TODO fix hack
    if (!player || !player.body) return;
    mpsText.text = String(chat.mq.mps + ' msg/s');

    player.body.velocity.x = 0;

    if (jumping && player.body.onFloor()) {
        jumping = false;
        console.log('player landed on floor')
        gm.movePlayer(player, {
            idle: facing === 'idle'
        });
    }
    if (stickUp() ||
        jumpButton.isDown ||
        testTouch(jumpTouch) ) {
        jumpTouchButton();
    }
    
    if (stickLeft() || cursors.left.isDown ) {
        movePlayerLeft();
        playerMoved = true;
    }
    else if (stickRight() || cursors.right.isDown ) {
        movePlayerRight();
        playerMoved = true;
    }
    else {
        if (facing != 'idle') {
            player.animations.stop();

            if (facing == 'left') {
                player.frame = 0;
            }
            else {
                player.frame = 5;
            }

            lastFacing = facing === 'idle' ? lastFacing : facing;
            facing = 'idle';

            gm.movePlayer(player, {
                idle: facing === 'idle'
            });

        }
    }

    if (jumping && !playerMoved) {
        gm.movePlayer(player, {
            idle: facing === 'idle'
        });
    }
    
    if (actionButton.isDown ||
        testTouch(actionTouch)
        //||
        //testTouch(breakActionTouch)
        ) {
        actionTouchButton();
    }
    else {
        speed = normalSpeed;
    }
    // TODO fix water
    //inWater = water.worldPosition.y < player.worldPosition.y;
    //if (inWater) speed = 100;




    if (breakButton.isDown || testTouch(breakTouch) 
        //|| testTouch(breakActionTouch)
        ) {
        //map.layers[0].data
        var x = facing == 'left' ?
            player.x - 8 :
            player.x + 32;
        var tile = map.getTileWorldXY(x, player.y + 16);
        if (tile) {
            breakTile(tile, x, 16)
        }
        var tile = map.getTileWorldXY(x, player.y + 32);
        if (tile) {
            breakTile(tile, x, 32)
        }
        
        if (jumpButton.isDown ||
            testTouch(jumpTouch) 
        ) {
            var tile = map.getTileWorldXY(player.x, player.y + 4);
            if (tile) {
                breakTile(tile, x, 32)
            }      

            var tile = map.getTileWorldXY(player.x + 16, player.y + 4);
            if (tile) {
                breakTile(tile, player.x + 16, player.height + 4)
            } 
            
        }
        
        if (cursors.down.isDown
          || stickDown()
        ) {
            var x = lastFacing == 'left' ?
            player.x - ( cursors.left.isDown ? 24 : 8):
            player.x + player.width + ( cursors.right.isDown ? 24 : 8);
            var tile = map.getTileWorldXY(x, player.y + player.height + 4);
            if (tile) {
                breakTile(tile, x, player.height + 4)
            }      
            
        }
    }
}

function render() {
    game.debug.text(game.time.fps || '--', 2, 14, "#00ff00")
    if(gm.config.game.debug) {
        game.debug.text(game.time.physicsElapsed, 16, 248);
        game.debug.body(player);
        game.debug.bodyInfo(player, 16, 264);
    }
}
