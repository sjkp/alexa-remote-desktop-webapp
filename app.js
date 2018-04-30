var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var jwt = require('express-jwt');
var alexa = require('alexa-app');
var axios = require('axios');

server.listen(8022);

// ALWAYS setup the alexa app and attach it to express before anything else.
var alexaApp = new alexa.app("alexa");
var nsp = io;


alexaApp.express({
    expressApp: app,
    //router: express.Router(),

    // verifies requests come from amazon alexa. Must be enabled for production.
    // You can disable this if you're running a dev environment and want to POST
    // things to test behavior. enabled by default.
    checkCert: false,

    // sets up a GET route when set to true. This is handy for testing in
    // development, but not recommended for production. disabled by default
    debug: true
});

app.use(express.static('public'))

alexaApp.launch(function (request, response) {
    response.say("Welcome the Alexa Remote Desktop skill");
    if (request.data.context.System.user.accessToken != null) {
        response.linkAccount();
    }
});
//https://github.com/alexa-js/alexa-app/issues/340
alexaApp.intent("SearchIntent", {
    "slots": { "Query": "AMAZON.SearchQuery" },
    "utterances": [
        "{Query}"
    ]
},
    function (request, response) {
        console.log(request);
        return getUser(request.context.System.user.accessToken).then(res => {
            console.log(res);
            nsp.to(res.data.user_id).emit(res.data.user_id, { cmd: request.slots.Query.value });
            response.say("Success!");
        })

    }
);

function getUser(accessToken) {
    return axios.get('https://api.amazon.com/user/profile?access_token=' + accessToken);
}


app.use(express.static('public'))

app.get('/api/plugins', function (req, res) {
    axios.get(`https://registry.npmjs.com/-/v1/search?text=alexa-remote-desktop ${req.query.q || ''}&size=200`).then(d => {
        return res.send(d.data);
    });    
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/api/send', function (req, res) {
    nsp.to(req.query.id).emit(req.query.id, { cmd: req.query.q });
    res.sendStatus(200);
});

nsp.on('connection', function (socket) {
    // socket.emit('news', { hello: 'world' });
    // socket.on('my other event', function (data) {
    //     console.log(data);
    // });

    socket.on('userid', function(data) {
        socket.join(data);
    })
});