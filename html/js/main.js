/* global Paho */
/* global marked */
/* global m */
/* glabal moment */
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
        //keepAliveInterval: 60 * 10 // 60 sec * 10 = 10 min
    },
    filter: '/world'
};

// Wraps our messages with created timestamp, text and clientId
chat.Message = function(text) {
    if (text instanceof Object) {
        var obj = text;
        this.text = m.prop(obj.text);
        this.created = moment(obj.created);
        this.clientId = obj.clientId;
    } else {
        this.created = moment();
        this.clientId = chat.config.clientId;
        this.text = m.prop(text);
    }
};
// convert a Message to a Paho Mqtt message
chat.Message.prototype.mqtt = function(filter) {
    var msg = {
        text: this.text(),
        created: this.created.format(),
        clientId: chat.config.clientId,
        sent: moment().format()
    }
    var message = new Paho.MQTT.Message(JSON.stringify(msg));
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
    this.client.connect(_.clone(chat.config.connectOptions));
}
chat.mq.onConnect = function() {
    // Once a connection has been made, make a subscription and send a message.
    chat.mq.client.subscribe(chat.config.filter);
    var message = new chat.Message("have entered.");
    message.destinationName = chat.config.filter;
    chat.mq.client.send(message.mqtt());
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
    console.log(message);
    var msg = JSON.parse(message.payloadString);
    chat.vm.addMessage(new chat.Message(msg));
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
        chat.mq.client.unsubscribe(chat.config.filter);    
        chat.config.filter = cmdParts[1];    
        chat.mq.client.subscribe(chat.config.filter);
        chat.mq.send('Changed filter to ' + chat.config.filter);
        return true;
    };
    if (cmd === '/clientid') {
        var old = chat.config.clientId;
        chat.config.clientId = cmdParts[1];    
        chat.mq.send('was ' + old);
        return true;
    };
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
            m("input[type=text][placeholder=Enter message...].input-msg", {
                oninput: m.withAttr("value", chat.vm.messageText),
                value: chat.vm.messageText()
            }),
            m("button[type=submit]", "Send"),
            m("div", chat.vm.list.map(function(message) {
                return m("div", message.created.fromNow() + ' '  + message.clientId + ' ' + message.text());
            })),
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