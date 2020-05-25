
// For IBM Cloud

const server = require('ws').Server;
const s = new server({ port: 8080 });

var logic = require('./MikkyouLogic.js');

s.on("connection", ws => {
    logic.connection(ws);
    ws.on("message", message => {
        logic.message(message, ws, s);
    });
});


//For Local
/*
var ws = require('ws');
var fs = require('fs');
var https = require('https');
var express = require('express');
var app = express();

app.use(express.static(__dirname + '/'));

var opts = {
    cert: fs.readFileSync('./server.crt'),
    key: fs.readFileSync('./server.key')
};

var content = '<html><head><title>WSS Test</title></head><body><div id="out"></div><script>' +
    'var wss = new WebSocket("wss://mikkyou.us-south.cf.appdomain.cloud/");' +
    'var out = document.getElementById("out");' +
    'wss.onmessage = function(e) {out.innerHTML = "<div>" + e.data + "</div>";}' +
    '</script></body></html>';

var ssl_server = https.createServer(opts, function (req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Length': content.length
    }
    );
    res.end(content);
}
);

var logic = require('./MikkyouLogic.js');
var wss = new ws.Server({ server: ssl_server });

wss.on('connection', function (socket) {
    logic.connection(socket);
    socket.on("message", message => {
        logic.message(message, socket, wss);
    });

    socket.on("close", (code, reason) => {
        logic.disconnect(socket, code, reason, wss)
    }
    )
});

ssl_server.listen(8080, function () {
    console.log("server start");
}
);*/