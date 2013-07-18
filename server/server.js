/* create an express server that listens on port 8000 */
var express = require('express');
var app = express.createServer();
app.listen(8000);

/* configure server params & routes */
app.configure(function() {
    var path = require('path');
    app.use("/", express.static(path.normalize(__dirname + '/../client/')));
    app.use(express.bodyParser());    
    app.set("view options", { layout: false });
});

/* create a socket.io channel */
var io = require('socket.io').listen(app);

/* server state */
var videoLoaded = false; // video sharing in progress
var videoPaused = false; // video paused

/* configure client-server communication */
// all events are broadcast to all clients (except sync)
// even the original client who initiated the action
io.sockets.on('connection', function(socket) {

    console.log('client connected');

    // if video already in progress, join
    if (videoLoaded) {
	socket.emit('loadVideo', videoLoaded);
	if (videoPaused) {
	    socket.emit('pauseVideo');
	}
    }

    // client disconnect warning
    socket.on('disconnect', function() {
        console.log('client disconnected');
    });

    // reset all client and server state for new video session
    socket.on('reset', function() {
	videoLoaded = false;    
	videoPaused = false;
	io.sockets.emit('reset');
    });

    // load new video
    socket.on('loadVideo', function(video) {
        // only allow one client (the 1st request) to select a video to play
        if (!videoLoaded) { 
	    videoLoaded = video;
	    io.sockets.emit('loadVideo', video);
	}
    });

    // pause video
    socket.on('pauseVideo', function(requester) {
	videoPaused = true;
	io.sockets.emit('pauseVideo', requester);
    });

    // resume video
    // if no time given, then resume at where the video was paused
    // otherwise seek to given time
    socket.on('resumeVideo', function(time) {
	videoPaused = false;    
	io.sockets.emit('resumeVideo', time);
    });

    // sync video with master (defined by the client who initiated the load)
    // broadcast to all but the master
    socket.on('syncVideo', function(time) {
        socket.broadcast.emit('syncVideo', time);
    });

});

