/* glabal moment */
/* global Paho */
/* global marked */
/* global m */
/* global _ */

// our chat namespace
var chat = {};

chat.config = {
    hostname: 'haasdas-morabaraba.c9users.io',
    port: 443,
    path: '/ws',
    clientId: "Anon" + Math.trunc(Math.random() * 1000),
    connectOptions: {
        useSSL: true,
        userName: 'anon',
        password: 'pleasebegentle',
        keepAliveInterval: 60 * 10 // 60 sec * 10 = 10 min
    },
    filter: 'lobby'
};

// Wraps our messages with created timestamp, text and clientId
chat.Message = function(text) {
    var msg = this.msg = {
        created: moment().format(),
        clientId: chat.config.clientId,
        text: text,
        type: 'msg',
        trust: true    
    };
    if (text instanceof Object) {
        msg.text = undefined;
        msg = _.assignIn(msg, text);
    }
    this.text = m.prop(msg.text);
};
// convert a Message to a Paho Mqtt message
chat.Message.prototype.mqtt = function(filter) {
    var message = new Paho.MQTT.Message(JSON.stringify(this.msg));
    message.destinationName = filter || chat.config.filter;
    return message;
}
chat.MessageList = Array;

chat.mq = {};
chat.mq.init = function() {
    this.client = new Paho.MQTT.Client(
        chat.config.hostname,
        Number(chat.config.port),
        chat.config.path,
        chat.config.clientId);
    this.client.onConnectionLost = chat.mq.onConnectionLost;
    this.client.onMessageArrived = chat.mq.onMessageArrived;
    chat.config.connectOptions.onSuccess = chat.mq.onConnect;
    chat.config.connectOptions.onFailure = chat.mq.onFailure;
    chat.config.connectOptions.willMessage = (new chat.Message('have left.')).mqtt();
    this.client.connect(_.clone(chat.config.connectOptions));
}
chat.mq.onConnect = function() {
    // Once a connection has been made, make a subscription and send a message.
    chat.mq.client.subscribe(chat.config.filter);
    var message = new chat.Message("have entered.");
    chat.mq.client.send(message.mqtt());
    startGame ? startGame() : null; 
}
// called when the client connects
chat.mq.onFailure = function() {
    // Once a connection has been made, make a subscription and send a message.
    chat.vm.addMessage(new chat.Message(
        JSON.stringify(arguments)
    ));
}
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
    var msg = JSON.parse(message.payloadString);
    if (msg.type === 'msg') {
        msg.trust = false;
        chat.vm.addMessage(new chat.Message(msg))
    } else if (msg.type === 'crt') {
        if (msg.clientId != chat.config.clientId) {
            gm.createPlayer(msg)
        }
    } else if (msg.type === 'mov') {
        gm.updatePlayer(msg);
    } else {
        console.error('unknown type', message)
        chat.vm.addMessage(new chat.Message('Unknown type<br>' + JSON.stringify(msg), 'msg', true));
    }
}
chat.mq.send = function(text) {
    var msg = new chat.Message(text);
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
    if (cmd === '/filter') {
        if (cmdParts.length === 1) {
            chat.vm.addMessage(new chat.Message('subscribed to filter '+ chat.config.filter));
            return true;
        }
        chat.mq.client.unsubscribe(chat.config.filter);    
        chat.config.filter = cmdParts[1];    
        chat.mq.client.subscribe(chat.config.filter);
        chat.mq.send('Changed filter to ' + chat.config.filter);
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
            m("input[id=chat-input][type=text][placeholder=Enter message...].input-msg", {
                oninput: m.withAttr("value", chat.vm.messageText),
                value: chat.vm.messageText()
            }),
            m("button[type=submit]", "Send"),
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

//initialize the application
m.mount(document.getElementById('chatapp'), {
    controller: chat.controller,
    view: chat.view
});

// TODO remove hack for debugging
window.__chat = chat;