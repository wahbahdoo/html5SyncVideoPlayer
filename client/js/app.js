var syncMgr, videoMgr;

// manage communication with server
syncMgr = {

    // connect with server using web sockets
    init: function() {
	var initialized = $.Deferred(); 
	syncMgr.socket = io.connect(window.location.protocol + '//' + window.location.host);
	syncMgr.socket.on('connect', function() {
	    console.log('connected to server');
	    // install event handlers to receive commands from the server
	    syncMgr.socket.on('reset', videoMgr.reset);
	    syncMgr.socket.on('loadVideo', videoMgr.loadVideo);
	    syncMgr.socket.on('pauseVideo', videoMgr.pauseVideo);
	    syncMgr.socket.on('resumeVideo', videoMgr.resumeVideo);
	    syncMgr.socket.on('syncVideo', videoMgr.syncVideo);
	    syncMgr.socket.on('disconnect', videoMgr.disable);
	    syncMgr.socket.on('reconnect', videoMgr.reset);
	    // connected with server and initialized, can proceed with rest of app
	    initialized.resolve(); 
	});
	return initialized;
    },

    // broadcast reset command to all clients
    broadcastReset: function() {
	syncMgr.socket.emit('reset');
    },

    // broadcast load video command to all clients
    broadcastLoad: function(video) {
	syncMgr.socket.emit('loadVideo', video);
    },

    // broadcast pause video command to all clients
    broadcastPause: function() {
	syncMgr.socket.emit('pauseVideo');
    },

    // broadcast resume video command to all clients
    broadcastResume: function(time) {
	syncMgr.socket.emit('resumeVideo', time);
    },

    // broadcast synchronize command to all others (only done if you're the master who initiated video playing)
    broadcastSyncVideo: function(time) {
	syncMgr.socket.emit('syncVideo', time);
    }

};

// manage video player
videoMgr = {

    // whether you are the master (who initiated video playing, and establishes the clock for synchronization)
    master: false,

    // whether a video has been selected and has started to play
    started: false,

    // whether a video that's been started has been paused
    paused: false,

    // state to track whether user typed 'reset' to reset all client and server state for new video session
    backupResetState: 0,

    // initialize
    init: function() {
	// set up overlay to block clicks from the video to limit user interaction to custom controls
	$('#overlay').on('click', function(event) { return false; });
	// install event handlers to initiate commands prompted by user button clicks
	$('#pause').on('click', syncMgr.broadcastPause);
	$('#resume').on('click', function() { syncMgr.broadcastResume(); });
	$('#rewind').on('click', videoMgr.rewindVideo);
	$('#reset').on('click', syncMgr.broadcastReset);
	// initialize keyboard event listener to reset when user types 'reset'
	videoMgr.initBackupReset();
	// start the video after the video has been loaded and the player is ready
	$(document).on('videoReady', videoMgr.startVideo);
	// get list of available videos, then populate & enable the user widget to select a video
	videoMgr.getList().then(videoMgr.enableSelect);
    },

    // initialize backup reset method
    initBackupReset: function() {
	// listen for user to type 'reset'
	$(window).on('keypress', function(event) {
  	    switch(videoMgr.backupResetState) {	
	        case 0:
		    if (event.keyCode == 114 /* r */) {
			videoMgr.backupResetState = 1;
		    }
	            break;
	        case 1:
		    if (event.keyCode == 101 /* e */) {
			videoMgr.backupResetState = 2;			
		    }
	            break;
	        case 2:
		    if (event.keyCode == 115 /* s */) {
			videoMgr.backupResetState = 3;			
		    }
	            break;
	        case 3:
		    if (event.keyCode == 101 /* e */) {
			videoMgr.backupResetState = 4;			
		    }
	            break;
	        case 4:
		    if (event.keyCode == 116 /* t */) {
			videoMgr.backupResetState = 0;
			// 'reset' was typed, reset
			syncMgr.broadcastReset();
		    }
	            break;
	        default:
		    // 'reset' was not typed, back to listening 
		    videoMgr.backupResetState = 0;
  		    break;
	    }
	});
    },

    // reload the client app
    reset: function() {
	window.location.reload();
    },

    // stop the video & disable user controls
    disable: function() {
	$('#menu').hide();
	$('#menuDisabled').show();
	videoMgr.stopVideo();
    },

    // get list of available videos, then dynamically populate the user select widget with data
    getList: function() {
	return $.getJSON('schedule.json', function(data) {
	    videoMgr.list = data;
	    // get html template for the user select widget
	    var tmpl = _.template($('#videoListTmpl').html());
	    // generate sublist of videos that are for today
	    var forToday = function(video) { return (video.date == (new Date()).toDateString()); }
	    // dynamically generate the user select widget
	    $('#videoList').html(tmpl({ videos: data, videosForToday: _.filter(data, forToday) }));
	});
    },

    // enable user selection of videos
    enableSelect: function() {
	// install event handlers for video selection
	$('#videoList').on('click', 'li', function(event) {		
	    videoMgr.master = true;
	    var title = $(event.target).text();
	    var video = _.find(videoMgr.list, function(v) { return v.title == title; });
	    syncMgr.broadcastLoad(video);
	});
	// display user select widget
	$('#videoSelect').show();
    },

    // disable user selection of videos
    disableSelect: function() {
	$('#videoSelect').hide();
    },

    // create tooltip over info button to display info about the selected video
    displayInfo: function(video) {
	var tmpl = _.template($('#videoInfoTmpl').html());
	$('#info').tooltip({
   	    title: tmpl({ video: video }),
	    html: true,
	    placement: 'bottom'    
	});
    },

    // load video into player
    loadVideo: function(video) {
	console.log('loading video player');
	// can no longer select another video
	videoMgr.disableSelect();
	// display info about the video
	videoMgr.displayInfo(video);
	// load scripts necessary to play the given source of video
	yepnope({
  	    test: (video.source == 'YouTube'),
	    yep: ['js/youtube.js', 'http://www.youtube.com/iframe_api'],
	    complete: function() {
	        console.log('loaded youtube');
		// initialize player with desired video
		player.init(video);
	    } 
        });
    },

    // start video 
    startVideo: function() {
	// track video playing state
	videoMgr.started = true;
	// mute all other players
	if (!videoMgr.master) {
	    player.mute();
	}
	// play video
	videoMgr.playVideo();
    },

    // play video (starting at given time, if any)
    playVideo: function(time) {
	// play video 
	player.play(time);
	// if master, broadcast current video position every second to enable others to sync
	if (videoMgr.master) {
	    videoMgr.setSyncRefRef = setInterval(function() {
		syncMgr.broadcastSyncVideo(player.getCurrentTime());
	    }, 1000);
	    $('#reset').show();
	}
	// enable user controls over video 
	$('#videoControls').show(); 
    },

    // stop video
    stopVideo: function() {
	if (videoMgr.started) {
	    // if master, stop broadcasting current video position
	    if (videoMgr.master) {
		clearInterval(videoMgr.setSyncRef);
	    }
	    // if already paused, dismiss resume dialog
	    if (videoMgr.paused) {
		$('#resumeDialog').modal('hide');	    
	    }
	    // stop video
	    player.stop();
	} else {
	    // video not yet loaded & player not ready, queue stopVideo command
	    $(document).on('videoReady', videoMgr.stopVideo);	
	}
    },

    // pause video
    pauseVideo: function() {
	if (videoMgr.started) {
	    // track video playing state
	    videoMgr.paused = true;
	    // if master, stop broadcasting current video position
	    if (videoMgr.master) {
		clearInterval(videoMgr.setSyncRef);
	    }
	    // pause video
	    player.pause();
	    // display resume dialog for user to resume video
	    $('#resumeDialog').modal({ backdrop: 'static', keyboard: 'false' });
	    console.log('pausing video at ' + player.getCurrentTime());
	} else {
	    // video not yet loaded & player not ready, queue pauseVideo command
	    $(document).on('videoReady', videoMgr.pauseVideo);	    
	}
    },

    // resume video (at given time, if any)
    resumeVideo: function(time) {
	if (videoMgr.started) {
	    // track video playing state
	    videoMgr.paused = false;
	    // dismiss resume dialog
	    $('#resumeDialog').modal('hide');
	    if (time) { console.log('resuming video at ' + time); }
	    // resume video
	    videoMgr.playVideo(time);
	} else {
	    $(document).on('videoReady', _.bind(videoMgr.playVideo, time));
	}
    },

    // resume video at 30 seconds prior to pause point
    rewindVideo: function() {
	syncMgr.broadcastResume(player.getCurrentTime() - 30);
    },

    // synchronize with master 
    syncVideo: function(time) {
	player.sync(time);
    }

};

// start app when page is loaded
$(document).ready(function() {
    // need to be connected with server before app can begin
    syncMgr.init().then(videoMgr.init);
});

