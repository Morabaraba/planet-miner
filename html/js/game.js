// We have pixi.js's to colour our screen and Phaser to challenge the player! 
/* global Phaser */
// Die baas.
/* global gm */

// our game variables that is used with phaser.
var game;
var map;
var tileset;
var layer;
var player;
var facing = 'left';
var lastFacing = 'left';
var jumpTimer = 0;
var jumpButton;
var actionButton;
var bg;
var speed;
var normalSpeed ;
var inWater;
var breakCounterText;
var facingJump;
// Keyboard cursors
var cursors;
// Our Touch Button callbacks
var rightTouch;
var leftTouch;
var actionTouch;
var jumpTouch;

var emitter;

function startGame() {
    // party allready going? return out of the function.
    if (game) return;
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
    // we load our JSON tiled map in our createMap
    game.load.image('tiles-1', 'assets/games/starstruck/tiles-1.png');
    game.load.image('RPGpack_sheet', 'images/RPGpack_sheet.png');
    game.load.spritesheet('dude', 'assets/games/starstruck/dude.png', 32, 48);
    game.load.spritesheet('droid', 'assets/games/starstruck/droid.png', 32, 32);
    game.load.image('starSmall', 'assets/games/starstruck/star.png');
    game.load.image('starBig', 'assets/games/starstruck/star2.png');
    game.load.image('background', 'assets/games/starstruck/background2.png');
    game.load.image('diamond', 'assets/sprites/diamond.png');
    game.load.image('rock', 'images/rock.png');

    game.load.image("btn-fullscreen", "images/Blank_White_Resize.png");
    game.load.image("btn-left", "images/Keyboard_White_Arrow_Left.png");
    game.load.image("btn-right", "images/Keyboard_White_Arrow_Right.png");
    game.load.image("btn-alt", "images/Keyboard_White_Alt.png");
    game.load.image("btn-ctrl", "images/Keyboard_White_Ctrl.png");
    game.load.image("btn-shift", "images/Keyboard_White_Shift.png");
    game.load.image("btn-chat", "images/chat-bubble.png");
    game.load.image("btn-joystick", "images/joystick100.png");

    game.load.spritesheet('waters', 'assets/sprites/waters.png', 32, 400, 32);
}

function createMap(opt) {
    opt = opt || {};
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
             //map = mapGroup.create(0,0,0,0,'level1');
            map = game.add.tilemap('level1');
            //game.world.setChildIndex(ui,0)
            //ui.bringToTop();
            //mapGroup.add(map);
            //game.world.swap(ui, map);
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
            water.y = game.world.height - 128;           
            levelText.text = gm.config.game.level;
            root.gm.showGameScreen()
            game.paused = false;
        }, 100)

    }
    function onFileError() {
        chat.mq.client.unsubscribe(chat.config.topic + '.' +  gm.config.game.level.split('/')[1]);
        gm.config.game.level = 'levels/level2.json';    
        chat.mq.client.subscribe(chat.config.topic + '.' +  gm.config.game.level.split('/')[1]);
        createMap({load: true})
    }
    
    if (opt.load) {
        game.paused = true;
        load = game.load.tilemap('level1', gm.config.game.level, null, Phaser.Tilemap.TILED_JSON);
        load.onLoadComplete.addOnce(onLoadComplete);
        load.onFileError.addOnce(onFileError);
        game.load.start()
    } else {
        addTilemap();
    }
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
    
    levelText = game.add.text(16, 32, gm.config.game.level, style);
    levelText.fixedToCamera = true;
    
    
    mpsText = game.add.text(16, 48, '0', style);
    mpsText.fixedToCamera = true;
    
    createMap({load: true});
    
    player = gm.createPlayer();
    game.physics.enable(player, Phaser.Physics.ARCADE);
    
    player.body.bounce.y = gm.config.game.player.bounceY;
    player.body.collideWorldBounds = true;
    player.body.setSize(20, 32, 5, 16);

    game.camera.follow(player);

    cursors = game.input.keyboard.createCursorKeys();
    jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.ALT);
    actionButton = game.input.keyboard.addKey(Phaser.Keyboard.CONTROL);
    breakButton = game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);
    enterButton = game.input.keyboard.addKey(Phaser.Keyboard.ENTER)
    escButton = game.input.keyboard.addKey(Phaser.Keyboard.ESC)

    var chatOpen = false;
    chatFunction = function(){
        chatOpen = !chatOpen;
        gm.showChat(chatOpen);
    }
    enterButton.onDown.add(chatFunction, this);
    escButton.onDown.add(chatFunction, this);

    //  Stop the following keys from propagating up to the browser
    // game.input.keyboard.addKeyCapture([ Phaser.Keyboard.LEFT, Phaser.Keyboard.RIGHT, Phaser.Keyboard.ALT, Phaser.Keyboard.CONTROL, Phaser.Keyboard.SHIFT  ]);

    //var actionTouch = game.add.tileSprite(game.width - 128 , 128, 96 , 96, 'fullscreen');
    //actionTouch.scale = 0.5;
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
        //sprite.input.onDown.add(cb, this);
        //
        ui.add(sprite);
        return sprite;
    }
    createButton(game.width - 56, 48, 'btn-fullscreen', gm.goFullscreen).scale = {
        x: 0.5,
        y: 0.5
    };
    
    rightTouch = createButton(game.width - 154, game.height - 128, 'btn-right');
    rightTouch.scale = {
        x: 1.2,
        y: 1.2
    };
    rightTouch.alpha = 0.3;
    leftTouch = createButton(game.width - 256, game.height - 128, 'btn-left');
    leftTouch.scale = {
        x: 1.2,
        y: 1.2
    };
    leftTouch.alpha = 0.3;
    
    rightJumpTouch = createButton(game.width - 154, game.height - 218, 'btn-right');
    rightJumpTouch.scale = {
        x: 1.2,
        y: 1.2
    };
    rightJumpTouch.alpha = 0.3;
    leftJumpTouch = createButton(game.width - 256, game.height - 218, 'btn-left');
    leftJumpTouch.scale = {
        x: 1.2,
        y: 1.2
    };
    leftJumpTouch.alpha = 0.3;
    actionTouch = createButton(32, game.height - 128, 'btn-ctrl');
    actionTouch.scale = {
        x: 1.2,
        y: 1.2
    };
    actionTouch.alpha = 0.3;
    //jumpTouch = createButton(144, game.height - 112, 'btn-alt');
    //jumpTouch.scale = {
    //    x: 1.2,
    //    y: 1.2
    //};
    breakTouch = createButton(144, game.height - 128, 'btn-shift');
    breakTouch.scale = {
        x: 1.2,
        y: 1.2
    };
    breakTouch.alpha = 0.3;
    breakActionTouch = createButton(32, game.height - 208, 'btn-shift');
    breakActionTouch.scale = {
        x: 2.4,
        y: 1.2
    };
    breakActionTouch.alpha = 0.3;
    chatTouch = createButton(game.width - 48, 8, 'btn-chat', chatFunction);
    chatTouch.width = 34;
    chatTouch.height = 34;

    if (game.device.desktop) {
        rightTouch.visible = false;
        leftTouch.visible = false; 
        actionTouch.visible = false;
        //jumpTouch.visible = false; 
        breakTouch.visible = false;
        rightJumpTouch.visible = false; 
        leftJumpTouch.visible = false;
        breakActionTouch.visible = false;
    
    };
    joystickFunction = function(){
        rightTouch.visible  = !rightTouch.visible ;
        leftTouch.visible   = !leftTouch.visible  ; 
        actionTouch.visible = !actionTouch.visible;
        //jumpTouch.visible   = !jumpTouch.visible  ; 
        breakTouch.visible  = !breakTouch.visible ;
        rightJumpTouch.visible = !rightJumpTouch.visible; 
        leftJumpTouch.visible = !leftJumpTouch.visible;
        breakActionTouch.visible = !breakActionTouch.visible;
    }    
    joystickTouch = createButton(game.width - 48, 108, 'btn-joystick', joystickFunction);
    joystickTouch.width = 34;
    joystickTouch.height = 34;
    
    emitter = game.add.emitter(0, 0, 1000);

    emitter.makeParticles('rock');
    emitter.gravity = 200;
    

    
    water = game.add.tileSprite(0, game.world.height - 128, 128 * 16, 24 * 16, 'waters');
    water.alpha = 0.5;

    // water = game.add.sprite(0, 0, 'waters');

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
    
    // let the magic begin
    game.world.setChildIndex(ui, game.world.children.length - 1);
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

function update() {
    var playerMoved = false;
    _.values(gm.players).forEach(function(sprite) {
        game.physics.arcade.collide(sprite, layer);
        sprite.text.x = Math.floor(sprite.x);
        sprite.text.y = Math.floor(sprite.y);
    })

    // TODO fix hack
    if (!player || !player.body) return;
    mpsText.text = String(chat.mq.mps + ' m/s');

    player.body.velocity.x = 0;

    if (cursors.left.isDown ||
        testTouch(leftTouch) ||
        testTouch(leftJumpTouch)) {
        movePlayerLeft();
    }
    else if (cursors.right.isDown ||
        testTouch(rightTouch) ||
        testTouch(rightJumpTouch)) {
        movePlayerRight();
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

    if (actionButton.isDown ||
        testTouch(actionTouch) ||
        testTouch(breakActionTouch)
        ) {
        actionTouchButton();
    }
    else {
        speed = normalSpeed;
    }
    inWater = water.worldPosition.y < player.worldPosition.y;
    if (inWater) speed = 100;
    
    if (jumpButton.isDown ||
        testTouch(jumpTouch) ||
        testTouch(leftJumpTouch) ||
        testTouch(rightJumpTouch)) {
        jumpTouchButton();
    }

    if (breakButton.isDown || testTouch(breakTouch) || testTouch(breakActionTouch)) {
        //map.layers[0].data
        var x = facing == 'left' ?
            player.x - 8 :
            player.x + 32;
        var tile = map.getTileWorldXY(x, player.y + 16);
        if (tile) {
            particleBurst(new Phaser.Point(tile.worldX, tile.worldY));
            map.removeTileWorldXY(tile.worldX, tile.worldY, 16, 16)
            gm.breakTile(x, player.y + 16)
            
            
            gm.config.game.breakCounter = Number(gm.config.game.breakCounter) + 1;
            breakCounterText.text  = gm.config.game.breakCounter + ' Tiles Busted';
            docCookies.setItem('breakCounter', gm.config.game.breakCounter);
        }
        var tile = map.getTileWorldXY(x, player.y + 32);
        if (tile) {
            particleBurst(new Phaser.Point(tile.worldX, tile.worldY));
            map.removeTileWorldXY(tile.worldX, tile.worldY, 16, 16)
            gm.breakTile(x, player.y + 32)
            
            gm.config.game.breakCounter = Number(gm.config.game.breakCounter) + 1;
            breakCounterText.text  = gm.config.game.breakCounter + ' Tiles Busted';
            docCookies.setItem('breakCounter', gm.config.game.breakCounter);
        }
        
        if (jumpButton.isDown ||
        testTouch(jumpTouch) ||
        testTouch(leftJumpTouch) ||
        testTouch(rightJumpTouch)) {
            var tile = map.getTileWorldXY(player.x, player.y + 4);
            if (tile) {
                particleBurst(new Phaser.Point(tile.worldX, tile.worldY));
                map.removeTileWorldXY(tile.worldX, tile.worldY, 16, 16)
                gm.breakTile(player.x, player.y + 4);
                
                gm.config.game.breakCounter = Number(gm.config.game.breakCounter) + 1;
                breakCounterText.text  = gm.config.game.breakCounter + ' Tiles Busted';
                docCookies.setItem('breakCounter', gm.config.game.breakCounter);
            }      

            var tile = map.getTileWorldXY(player.x + 16, player.y + 4);
            if (tile) {
                particleBurst(new Phaser.Point(tile.worldX, tile.worldY));
                map.removeTileWorldXY(tile.worldX, tile.worldY, 16, 16)
                gm.breakTile(player.x + 16, player.y + 4);
                
                gm.config.game.breakCounter = Number(gm.config.game.breakCounter) + 1;
                breakCounterText.text  = gm.config.game.breakCounter + ' Tiles Busted';
                docCookies.setItem('breakCounter', gm.config.game.breakCounter);
            } 
            
        }
        
        if (cursors.down.isDown) { //||
        //testTouch(jumpTouch) ||
        //testTouch(leftJumpTouch) ||
        //testTouch(rightJumpTouch)) {
            var x = lastFacing == 'left' ?
            player.x - ( cursors.left.isDown ? 24 : 8):
            player.x + player.width + ( cursors.right.isDown ? 24 : 8);
            var tile = map.getTileWorldXY(x, player.y + player.height + 4);
            if (tile) {
                particleBurst(new Phaser.Point(tile.worldX, tile.worldY));
                map.removeTileWorldXY(tile.worldX, tile.worldY, 16, 16)
                gm.breakTile(x, player.y + player.height + 4);
                
                gm.config.game.breakCounter = Number(gm.config.game.breakCounter) + 1;
                breakCounterText.text  = gm.config.game.breakCounter + ' Tiles Busted';
                docCookies.setItem('breakCounter', gm.config.game.breakCounter);
            }      
/*
            var tile = map.getTileWorldXY(player.x + 16, player.y + 4);
            if (tile) {
                particleBurst(new Phaser.Point(tile.worldX, tile.worldY));
                map.removeTileWorldXY(tile.worldX, tile.worldY, 16, 16)
                gm.breakTile(player.x + 16, player.y + 4);
                
                gm.config.game.breakCounter = Number(gm.config.game.breakCounter) + 1;
                breakCounterText.text  = gm.config.game.breakCounter + ' Tiles Busted';
                docCookies.setItem('breakCounter', gm.config.game.breakCounter);
            } */
            
        }
    }
}

function render() {
    //game.debug.text(game.time.physicsElapsed, 32, 32);
    //game.debug.body(player);
    //game.debug.bodyInfo(player, 16, 24);
}

function jumpTouchButton() {
    function jumpUp() {
        if (inWater)  player.body.velocity.y = -150;
        else  player.body.velocity.y = -250;
        jumpTimer = game.time.now + 750;
        gm.movePlayer(player, {
            idle: facing === 'idle'
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
        idle: facing === 'idle'
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
        idle: facing === 'idle'
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