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
var jumpTimer = 0;
var jumpButton;
var actionButton;
var bg;
var speed;

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
    var level = window.location.search.substring(1) || window.top.location.search.substring(1);
    if (level === '') {
        level = gm.config.game.level;
    }
    game.load.tilemap('level1', level, null, Phaser.Tilemap.TILED_JSON);

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

}

function create() {
    game.stage.disableVisibilityChange = true;
    //game.physics.startSystem(gm.config.game.physicsSystem);
    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.stage.backgroundColor = gm.config.game.backgroundColor;

    bg = game.add.tileSprite(0, 0, game.width, game.height, 'background');
    bg.fixedToCamera = true;

    map = game.add.tilemap('level1');
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

    //  Un-comment this on to see the collision tiles
    // layer.debug = true;

    layer.resizeWorld();

    game.physics.arcade.gravity.y = 250;

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
    game.input.keyboard.addKeyCapture([ Phaser.Keyboard.LEFT, Phaser.Keyboard.RIGHT, Phaser.Keyboard.ALT, Phaser.Keyboard.CONTROL, Phaser.Keyboard.SHIFT  ]);
    
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
        return sprite;
    }
    createButton(game.width - 56, 48, 'btn-fullscreen', goFullscreen).scale = {
        x: 0.5,
        y: 0.5
    };
    
    rightTouch = createButton(game.width - 128, game.height - 120, 'btn-right');
    leftTouch = createButton(game.width - 224, game.height - 120, 'btn-left');
    actionTouch = createButton(32, game.height - 112, 'btn-ctrl');
    jumpTouch = createButton(144, game.height - 112, 'btn-alt');
    breakTouch = createButton(92, game.height - 182, 'btn-shift');
    
    chatTouch = createButton(game.width - 48, 8, 'btn-chat', chatFunction);
    chatTouch.width = 34;
    chatTouch.height = 34;

    rightTouch.visible = false;
    leftTouch.visible = false; 
    actionTouch.visible = false;
    jumpTouch.visible = false; 
    breakTouch.visible = false;

    joystickFunction = function(){
        rightTouch.visible  = !rightTouch.visible ;
        leftTouch.visible   = !leftTouch.visible  ; 
        actionTouch.visible = !actionTouch.visible;
        jumpTouch.visible   = !jumpTouch.visible  ; 
        breakTouch.visible  = !breakTouch.visible ;
    }    
    joystickTouch = createButton(game.width - 48, 108, 'btn-joystick', joystickFunction);
    joystickTouch.width = 34;
    joystickTouch.height = 34;
    
    emitter = game.add.emitter(0, 0, 1000);

    emitter.makeParticles('rock');
    emitter.gravity = 200;
    
    var style = { font: "16px Arial", fill: "#ffffff"};
    breakCounterText = game.add.text(8, 8, gm.config.game.breakCounter, style);
    breakCounterText.fixedToCamera = true;
}


function actionTouchButton() {
    if (facing !== 'idle') {
        if (player.body.onFloor()) {
            particleBurst(player, facing === 'left' ? player.width : 1);
            speed = gm.config.game.player.superSpeed;
            gm.actionPlayer();
        }
    }
}

function update() {
    var playerMoved = false;
    //game.physics.arcade.collide(player, layer);
    _.values(gm.players).forEach(function(sprite) {
        game.physics.arcade.collide(sprite, layer);
        //game.physics.arcade.collide(player.text, layer);  
        sprite.text.x = Math.floor(sprite.x + sprite.width / 2 - (sprite.text.width / 2));
        sprite.text.y = Math.floor(sprite.y - 10);
    })

    // TODO fix hack
    if (!player || !player.body) return;

    player.body.velocity.x = 0;

    function testTouch(sprite) {
        if (sprite.input.pointerDown(game.input.activePointer.id)) return true;
        var result = false;
        for (var x = 1; x <= game.input.totalActivePointers; x++) {
            result = result || sprite.input.pointerDown(game.input['pointer' + x].id);
            if (result)
                return result;
        }
        return result;
    }
    if (cursors.left.isDown ||
        testTouch(leftTouch)) {
        movePlayerLeft();
    }
    else if (cursors.right.isDown ||
        testTouch(rightTouch)) {
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

            facing = 'idle';

            gm.movePlayer(player, {
                idle: facing === 'idle'
            });

        }
    }

    if (actionButton.isDown ||
        testTouch(actionTouch)) {
        actionTouchButton();
    }
    else {
        speed = gm.config.game.player.normalSpeed;
    }
    if (jumpButton.isDown ||
        testTouch(jumpTouch)) {
        jumpTouchButton();
    }

    if (breakButton.isDown || testTouch(breakTouch)) {
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
            breakCounterText.text  = gm.config.game.breakCounter;
            docCookies.setItem('breakCounter', gm.config.game.breakCounter);
        }
        var tile = map.getTileWorldXY(x, player.y + 32);
        if (tile) {
            particleBurst(new Phaser.Point(tile.worldX, tile.worldY));
            map.removeTileWorldXY(tile.worldX, tile.worldY, 16, 16)
            gm.breakTile(x, player.y + 32)
        }
    }
    


}

function render() {

    //game.debug.text(game.time.physicsElapsed, 32, 32);
    //game.debug.body(player);
    //game.debug.bodyInfo(player, 16, 24);

}


function goFullscreen() {
    if (!game.scale) {
        window.setTimeout(goFullscreen, 500, true);
        return;
    }
    game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;
    game.scale.fullScreenTarget = document.getElementById('game-screen')
    if (game.scale.isFullScreen) {
        game.scale.stopFullScreen()
    }
    else {
        game.scale.startFullScreen(false)
    };
}


function jumpTouchButton() {
    function jumpUp() {
        player.body.velocity.y = -250;
        jumpTimer = game.time.now + 750;
        gm.movePlayer(player, {
            idle: facing === 'idle'
        });
    }
    if (player.body.onFloor() && game.time.now > jumpTimer) {
        jumpUp()
        facingJump = undefined; //facing == 'right' ? 'left' : 'right';
    }
    else if (player.body.onWall() && game.time.now > jumpTimer && (facingJump == undefined || facingJump != facing)) {
        facingJump = facing;
        jumpUp();
    }
}
/*
function breakTouchButton() {
    function jumpUp() {
        player.body.velocity.y = -250;
        jumpTimer = game.time.now + 750;
        gm.movePlayer(player, {
            idle: facing === 'idle'
        });
    }
    if (player.body.onFloor() && game.time.now > jumpTimer) {
        jumpUp()
        facingJump = undefined; //facing == 'right' ? 'left' : 'right';
    }
    else if (player.body.onWall() && game.time.now > jumpTimer && (facingJump == undefined || facingJump != facing)) {
        facingJump = facing;
        jumpUp();
    }
}
*/
function movePlayerLeft() {
    player.body.velocity.x = -1 * speed;
    if (facing != 'left') {
        player.animations.play('left');
        facing = 'left';
    }
    gm.movePlayer(player, {
        idle: facing === 'idle'
    });
}

function movePlayerRight() {
    player.body.velocity.x = speed;
    if (facing != 'right') {
        player.animations.play('right');
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
/*
var TestSprite = {
        create: function() {
                this.sprite = game.add.sprite(100, 100, 'my sprite');
                this.sprite.input.start(); // start the inputHandler of the sprite	
                },	update: function() {                
                    // test if the pointer is down over the sprite		
                    if (this.sprite.input.pointerDown(game.input.activePointer.id)) {			
                        this.sprite.frame = 1;		} else {			this.sprite.frame = 0;		}	},}*/