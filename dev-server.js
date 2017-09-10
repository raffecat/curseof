var fs = require('fs');
var express = require('express'), app = express();

app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

app.get('/', function(req, res) { res.sendfile(__dirname+'/out/index.html') });

app.use('/bgm/', function(req, res) {
    res.header('Content-Type', 'audio/ogg');
    res.sendfile(__dirname+'/assets/bgm'+req.url);
});

app.use('/assets/', express.static(__dirname+'/assets'));
app.use(express.static(__dirname+'/out'));

app.listen(8000);
