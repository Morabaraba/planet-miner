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
// convert a Message to a Paho Mqtt message
chat.Message.prototype.mqtt = function(topic) {
    var t;
    if (this.msg.type == this.types.MESSAGE) {
        t = Bert.tuple(this.msg.type, this.sessionId()  , Date.now(), this.msg.text)
    } else
    if (this.msg.type == this.types.MOVE) {
        t = Bert.tuple(this.msg.type, this.sessionId(), Date.now(), this.msg.x, this.msg.y, this.msg.idle)
    } else
    if (this.msg.type == this.types.CREATE) {
        t = Bert.tuple(this.msg.type, this.sessionId(), Date.now())
    } else
    if (this.msg.type == this.types.ACTION) {
        t = Bert.tuple(this.msg.type, this.sessionId(), Date.now(), this.msg.floor)
    } else 
    if (this.msg.type == this.types.BREAK) {
        t = Bert.tuple(this.msg.type, this.sessionId(), Date.now(), this.msg.x, this.msg.y)
    } else 
    {
        console.error('unknown type for mqtt', msg)
        chat.vm.addMessage(new chat.Message('Sending unknown message type', 'msg', true));
        return;
    }
    var message = new Paho.MQTT.Message(Bert.encode(t));
    message.destinationName = topic || chat.config.topic;
    return message;
}
chat.Message.prototype.types = {
    MESSAGE: 'msg',
    MOVE: 'mov',
    CREATE: 'crt',
    ACTION: 'act',
    BREAK : 'brk'
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
    gm.config.mqtt.willMessage = (new chat.Message('have left.')).mqtt();
    // we shallow clone our connectOptions so that if we reconnect we don't inherit previous connection information.
    this.client.connect(_.clone(gm.config.mqtt));
}
chat.mq.onConnect = function() {
    // Once a connection has been made, make a subscription and send a message.
    chat.mq.client.subscribe(chat.config.topic);
    chat.mq.client.subscribe(chat.config.topic);
    var message = new chat.Message("has entered " + chat.config.topic + ".");
    chat.mq.client.send(message.mqtt());
    
    
}
// called when the client connects
chat.mq.onFailure = function() {
    // Once a connection has been made, make a subscription and send a message.
    chat.vm.addMessage(new chat.Message(
        JSON.stringify(arguments)
    ));
}
/** @memberof! chat# */
// called when the client loses its connection
chat.mq.onConnectionLost = function(responseObject) {
    if (responseObject.errorCode !== 0) {
        chat.vm.addMessage(new chat.Message(
            responseObject.errorMessage
        ));
        chat.mq.client.connect(_.clone(chat.config.connectOptions));
    }
}
chat.mq.onMessageArrived = function(message) {
    //console.debug('onMessageArrived', arguments);
    var msg = Bert.decode(message.payloadString);
    
    if (msg[0] == chat.Message.types.MESSAGE) {
        //t = Bert.tuple(this.msg.type, chat.config.clientId, Date.now(), msg.text)
        var msgObj = {
            clientId: msg[1],
            text: msg[3],
            created: moment(msg[2]).format()
        }
        chat.vm.addMessage(new chat.Message(msgObj))
    } else
    if (msg[0] ==  chat.Message.types.MOVE) {
        //t = Bert.tuple(this.msg.type, chat.config.clientId, Date.now(), msg.x, msg.y, msg.idle)
        var msgObj = {
            clientId: msg[1],
            msg: msg[3],
            created: moment(msg[2]).format(),
            x:  msg[3],
            y:  msg[4],
            idle:  msg[5]
        }
        gm.updatePlayer(msgObj);
    } else
    if (msg[0] == chat.Message.types.CREATE) {
        var msgObj = {
            clientId: msg[1],
            created: moment(msg[2]).format(),
        }
        if (msgObj.clientId != chat.config.clientId) {
            gm.createPlayer(msgObj)
        }
    } else 
    if (msg[0] == chat.Message.types.ACTION) {
        var msgObj = {
            clientId: msg[1],
            created: moment(msg[2]).format(),
        }
        if (msgObj.clientId != chat.config.clientId) {
            gm.actionPlayer(msgObj)
        }
    } else 
    if (msg[0] == chat.Message.types.BREAK) {
        var tile = map.getTileWorldXY(msg[3], msg[4]);
        if (tile) {
            particleBurst(new Phaser.Point(tile.worldX, tile.worldY));
            map.removeTileWorldXY(tile.worldX, tile.worldY, 16, 16)
        }
    } else {
        var textMsg = 'BERT showed up with something unknown.';
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
                if (this.messageText()) {
                    var text = this.messageText();
                    if (text[0] == '/') {
                        if (chat.vm.executeCommand(text)) {
                            this.messageText("");    
                        }
                    } else {
                        chat.mq.send(this.messageText());
                        this.messageText("");
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
        chat.mq.client.unsubscribe(chat.config.topic);    
        chat.config.topic = cmdParts[1];    
        chat.mq.client.subscribe(chat.config.topic);
        chat.mq.send('Changed topic to ' + chat.config.topic);
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
        m("form", {
            onsubmit: chat.vm.post
        }, [
            m("input[id=chat-input][type=text][placeholder=Enter message...]", {
                oninput: m.withAttr("value", chat.vm.messageText),
                value: chat.vm.messageText()
            }),
            m("button[id=chat-send][type=submit]", "Send"),
            m("div", 
                chat.vm.list.filter(function(msg) {
                    return msg.msg.type === 'msg';
                })
                .map(function(message) {
                    var text = message.msg.trust ? 
                        m.trust(moment(message.msg.created).format('LTS') + ' '  + message.msg.clientId + ' ' + message.text()) : 
                        moment(message.msg.created).format('LTS') + ' '  + message.msg.clientId + ' ' + message.text();
                        
                    return m("div.chatline", text);
                })
            ),
        ])
    ]);

};



// TODO remove hack for debugging
window.__chat = chat;