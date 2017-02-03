// Paho is our mqtt client lib
/* global Paho */
// Marked is a Markdown parser
/* global marked */
// m is our mvc
/* global m */
// underscore is a functional utility lib
/* global _ */
// Bert encodes and decodes our payload
/* global Bert */
// Handles time just a bit better in js
/* global moment */

/** @namespace our chat namespace */
var chat = {};

// source our chat config from the gm.
chat.config = gm.config.chat;

// Wraps our messages with created timestamp, text and clientId
chat.Message = function(text) {
    var msg = this.msg = {
        created: moment().format(),
        clientId: chat.config.clientId,
        text: text,
        type: this.types.MESSAGE,
        trust: true    
    };
    if (text instanceof Object) {
        msg.text = undefined;
        msg = _.assignIn(msg, text);
    }
    this.text = m.prop(msg.text);
};

chat.Message.prototype.sessionId = function() {
    return chat.config.clientId //+ '-' + gm.config.game.player.nick;
}

function buildTopic() {
    return chat.config.topic + '.' + gm.config.game.level.split('/')[1] + gm.config.game.instance
}

// convert a Message to a Paho Mqtt message
chat.Message.prototype.mqtt = function(topic) {
    var qos = 0;
    if (this.msg.type === chat.Message.types.BREAK || this.msg.type === chat.Message.types.DAMAGE) qos = 2;
    console.log('Msg Created QOS', qos, this.msg.type, (this.msg.type === chat.Message.types.MESSAGE ? this.msg.text : ''));
    var encodedData = msgpack.encode(this.msg);
    //console.log(encodedData);
    var message = new Paho.MQTT.Message(encodedData);
    message.qos = qos;
    message.destinationName = topic || buildTopic();
    //console.log(message.payloadBytes);
    return message;    
};

chat.Message.prototype.types = {
    MESSAGE: 'msg',
    MOVE: 'mov',
    CREATE: 'crt',
    ACTION: 'act',
    BREAK : 'brk',
    DAMAGE : 'dmg'
}
// TODO HACK HACK HHACK
chat.Message.types  = chat.Message.prototype.types 
chat.MessageList = Array;

chat.mq = {};
chat.mq.init = function() {
    this.client = new Paho.MQTT.Client(
        chat.config.hostname,
        Number(chat.config.port),
        chat.config.path,
        chat.config.clientId);
    
    // hook our mq callbacks
    this.client.onConnectionLost = chat.mq.onConnectionLost;
    this.client.onMessageArrived = chat.mq.onMessageArrived;
    
    /* hook up our chat onConnect and onFailure functions to our mqtt connection options */
    gm.config.mqtt.onSuccess = chat.mq.onConnect;
    gm.config.mqtt.onFailure = chat.mq.onFailure;
    
    // debugger;
    gm.config.mqtt.willMessage = (new chat.Message('have left.')).mqtt();

    // we shallow clone our connectOptions so that if we reconnect we don't inherit previous connection information.
    this.client.connect(_.clone(gm.config.mqtt));
}
chat.mq.onConnect = function() {
    // Once a connection has been made, make a subscription and send a message.
    var topic = buildTopic();
    console.log('on Connect, topic', topic)
    chat.mq.client.subscribe(topic);
    //var message = new chat.Message("has entered " + chat.config.topic + ".");
    //chat.mq.client.send(message.mqtt());
    
    
}
// called when the client connects
chat.mq.onFailure = function() {
    // Once a connection has been made, make a subscription and send a message.
    console.log('On Failure', arguments)
    chat.vm.addMessage(new chat.Message(
        JSON.stringify(arguments)
    ));
}
/** @memberof! chat# */
// called when the client loses its connection
chat.mq.onConnectionLost = function(responseObject) {
    console.log('On Connection Lost', arguments)
    if (responseObject.errorCode !== 0) {
        chat.vm.addMessage(new chat.Message(
            responseObject.errorMessage
        ));
        chat.mq.client.connect(_.clone(chat.config.connectOptions));
    }
}
chat.mq.mps = 0;
_mps_timer = 0
resetInterval = undefined;
chat.mq.onMessageArrived = function(message) {
    chat.mq.mps = chat.mq.mps + 1;
    if (_mps_timer < Date.now() ) {
        if (resetInterval) clearTimeout(resetInterval);
        chat.mq.mps = 0
        _mps_timer = Date.now() + 1000;
        resetInterval = setTimeout(function() { chat.mq.mps = 0; }, 1100);
    }
    
    var msg = msgpack.decode(message.payloadBytes)
    console.log('Msg Arrived', msg.type , msg.clientId)
    if (msg.type == chat.Message.types.MESSAGE) {
        if (msg.clientId == gm.currentSessionId()) return;
        
        chat.vm.addMessage(new chat.Message(msg))
        gm.chatPlayer(msgObj);
        gm.showChat(false)
    } else
    if (msg.type ==  chat.Message.types.MOVE) {
        gm.updatePlayer(msg);
    } else
    if (msg.type == chat.Message.types.CREATE) {
        if (msg.clientId != chat.config.clientId) {
            gm.createPlayer(msg)
        }
    } else 
    if (msg.type == chat.Message.types.ACTION) {
        var msgObj = msg;
        if (msgObj.clientId != chat.config.clientId) {
            gm.actionPlayer(msgObj)
        }
    } else 
    if (msg.type == chat.Message.types.BREAK) {
        var tile = map.getTileWorldXY(msg.x, msg.y);
        if (tile) {
            particleBurst(new Phaser.Point(tile.worldX, tile.worldY));
            map.removeTileWorldXY(tile.worldX, tile.worldY, 16, 16)
        }
    } else
    if (msg.type == chat.Message.types.DAMAGE) {
        if (msg.clientId != chat.config.clientId) {
            var tile = map.getTileWorldXY(msg.x, msg.y);
            if (tile) {
                map.damageTile(tile.worldX, tile.worldY, tile, true, msg.health);
            }
        }
    } else {
        var textMsg = 'Something unknown is happening.';
        console.error(textMsg + ' Unknown message type received.', msg)
        chat.vm.addMessage(new chat.Message(textMsg, 'msg', true));
    }
}
chat.mq.queue = [];
chat.mq.send = function(text) {
    function trySend(msg) {
            try {
               chat.mq.client.send(msg.mqtt());
            }
            catch (e) {
                // statements to handle any exceptions
                var textMsg = 'Sending of MQTT Data failed.';
                console.error(textMsg, e); // pass exception object to error handler
                chat.vm.addMessage(new chat.Message(textMsg, 'msg', true));
            }
    }
    var msg = new chat.Message(text);
    if (!chat.mq.client.isConnected()) {
        chat.mq.queue.push(msg);
        return;
    }
    if (chat.mq.queue.length != 0) {
        while (chat.mq.queue.length != 0) {
            var queueMsg = chat.mq.queue.shift();
            chat.mq.client.send(queueMsg.mqtt());
        }    
    }
    chat.mq.client.send(msg.mqtt());
}

chat.vm = {};
chat.vm.init = function() {
    this.list = new chat.MessageList();
    this.messageText = m.prop("");
    this.post = function() {
        try {
                if (this.messageText() && this.messageText().trim() !== '') {
                    var text = this.messageText();
                    if (text[0] == '/') {
                        if (chat.vm.executeCommand(text)) {
                            m.startComputation();
                            this.messageText("");   
                            m.endComputation();
                            return;
                        }
                    } else {
                        chat.mq.send(this.messageText());
                        m.startComputation();
                        this.messageText("");
                        m.endComputation();    
                        gm.hideChat();
                    }
                } else {
                    if (this.messageText().trim() === '') {
                        gm.hideChat();    
                    }
                }
        }
        catch (e) {
          console.error(e);
        }
        finally {
                return false;
        }
    }.bind(this);
};
chat.vm.addMessage = function(msg) {
    m.startComputation();
    chat.vm.list.unshift(msg);
    m.endComputation();    
} 
chat.vm.executeCommand = function (cmd) {
    var cmdParts = cmd.split(' ');
    cmd = cmdParts[0].toLowerCase();
    if (cmd === '/topic') {
        if (cmdParts.length === 1) {
            chat.vm.addMessage(new chat.Message('subscribed to topic '+ chat.config.topic));
            return true;
        }
        chat.mq.client.unsubscribe(chat.config.topic /* TODO map? */);    
        chat.config.topic = cmdParts[1];    
        chat.mq.client.subscribe(chat.config.topic);
        chat.mq.send('Changed topic to ' + chat.config.topic /* TODO map? */);
        return true;
    };

    if (cmd === '/debug' || cmd === '/debug') {
        gm.config.game.debug != gm.config.game.debug;
        return true;
    }
    if (cmd === '/?' || cmd === '/help') {
        var msg;
        if (gm.game.device.desktop) {
            msg = 'Move around with the [ARROW KEYS] and use [Z] for action and [X] for break.';
        }
        else {
            msg = 'Tap the joystick icon on your right to see the on-screen touchpad. Tap on left to see virtual joystick';
        }
            
        msg +='<br>You can also execute the following commands: <br>' + 
            '<li> /level level1 - Loads a level. level1 to level5. eg, "/level level5" </li>' +
            //'<li> /config - Print and set config.</li>' +
            //'<li> /msg [type] [message] - Construct a network message.</li>' +
            //'<li> /repl [eval statement] - JS eval for people who like to type /repl, instead of using the console.</li>' +
            //'<li> /clientid [new client id] - Change your name.</li>' +
            '<li> /clear - Remove all previous chat and command messages.</li>' +
            '<li> /version - Print the version number.</li>' +
            '<li> /version - Print the version number.</li>' +
            '<li> /setbreakcooldown [number]- How long it takes in milliseconds to attack/break.</li>' +
            '<li> /settilehealth [number]- Default tile health on first hit/collision.</li>' +
            
            '';//'<li> /topic [topic key] - listen to another topic key.</li>';
            
        chat.vm.addMessage(new chat.Message(msg));
        return true;
    };

    if (cmd === '/clear') {
        chat.vm.list.length = 0;
        return true;
    }
    
    if (cmd === '/setbreakcooldown') {
        gm.config.game.defaultBreakDelay = cmdParts[1];
        return true;
    }    

    if (cmd === '/settilehealth') {
        gm.config.game.defaultTileHealth = cmdParts[1];
        return true;
    }   
    
    if (cmd === '/version') {
        var msg = gm.config.game.version; 
        chat.vm.addMessage(new chat.Message(msg));
        return true;
    }
    
    if (cmd === '/level') {
        if (cmdParts.length === 1) {
            //var msg = JSON.stringify(gm.config);
            //chat.vm.addMessage(new chat.Message(msg));
            //console.log('/level "levels/level1.json');
            return true;
        }
        chat.mq.client.unsubscribe(buildTopic());
        gm.config.game.level = 'levels/' + (cmdParts.slice(1).join(' ')) + '.json';
        chat.mq.client.subscribe(buildTopic());
        createMap({load: true});
        return true;
    };
    
    if (cmd === '/repl') {
        if (cmdParts.length === 1) {
            //var msg = JSON.stringify(gm.config);
            //chat.vm.addMessage(new chat.Message(msg));
            console.log('/repl <eval statement>');
            return true;
        }
        eval(cmdParts.slice(1).join(' '));
        return true;
    };
    
    if (cmd === '/config') {
        if (cmdParts.length === 1) {
            var msg = JSON.stringify(gm.config);
            chat.vm.addMessage(new chat.Message(msg));
            return true;
        }
        return true;
    };

    if (cmd === '/reconnect') {
        chat.mq.client.connect(_.clone(gm.config.mqtt));
        return true;
    };
    
    if (cmd === '/clientid') {
        if (cmdParts.length === 1) {
            chat.vm.addMessage(new chat.Message('is your clientid.'));
            return true;
        }
        var old = chat.config.clientId;
        chat.config.clientId = cmdParts[1];    
        chat.mq.send('was ' + old);
        return true;
    };
    if (cmd === '/msg') {
        if (cmdParts[1] === '-t') {
            var type = cmdParts[2]; 
            var text = cmdParts.splice(3).join(' ');
        } else {
            var type = 'msg'; 
            var text = cmdParts.splice(1). join(' ');
        }
        var msg = new chat.Message(text, type);
        chat.mq.client.send(msg.mqtt());
        return true;
    };
    chat.vm.addMessage(new chat.Message('no "' + cmd + '" command found.'));
    return false;
}

chat.controller = function() {
    chat.vm.init();
    chat.mq.init();
};

chat.view = function() {
    return m('div', [
        m("div" /*"form"*/, {
            //onsubmit: chat.vm.post
        }, [
            m("input.chat-input[type=text][placeholder=Enter a message to send or /? for help...]", {
                oninput: m.withAttr("value", chat.vm.messageText),
                value: chat.vm.messageText(),
                onkeydown: function(event) {
                    if (event.keyCode == 13) {
                        chat.vm.post();
                    }
                }
            }),
            //m("button[id=chat-send][type=submit]", "Send"),
            m("pre", [
                m("code#chat-textarea", 
                    chat.vm.list.filter(function(msg) {
                        return msg.msg.type === 'msg';
                    })
                    .map(function(message) {
                        var text = message.msg.trust ? 
                            m.trust(moment(message.msg.created).format('LTS') + ' '  + message.msg.clientId + ' ' + message.text()) : 
                            moment(message.msg.created).format('LTS') + ' '  + message.msg.clientId + ' ' + message.text();
       
                        return m("div.chatline", text);
                    })
                )]
            ),
        ])
    ]);

};



// TODO remove hack for debugging
window.__chat = chat;