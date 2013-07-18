/* youtube player */

// the intent is to load in the appropriate player dynamically
// and have each type of player define the player object
// so that videoMgr in app.js can remain oblivious to player details

player = {
    
    // parameters to pass to youtube api to create player
    params: {
	playerVars: {
	    origin: window.location.protocol + '//' + window.location.host,
	    enablejsapi: 1,
	    controls: 0,
	    disablekb: 1,
	    showinfo: 0,
	    rel: 0,
	    wmode: 'opaque'
	},
	events: {
	    'onReady': onPlayerReady,
	    'onStateChange': onPlayerStateChange
	}
    },

    // track whether video has been selected to finish initializing player
    initialized: $.Deferred(),

    // initialize player with selected video
    init: function(video) {
	console.log('init video player');
	player.video = video;
	_.extend(player.params, _.pick(video, 'videoId', 'start', 'end'));
	player.initialized.resolve();
    },

    // create video player
    create: function() {
	console.log('creating video player');
	console.log(player.params);
	player.obj = new YT.Player('video', player.params);
	console.log('created video player');
	// resize player to take up maximum window real estate
	player.resize();
	// resize player whenever browser window is resized
	$(window).on('resize', player.resize);
    },

    // mute video player
    mute: function() {
	player.obj.mute();
    },

    // play video (start at given time, if any)
    play: function(time) {
	if (player.obj.getPlayerState() == YT.PlayerState.PAUSED) {
	    // rewind to given time
	    if (time) {
		console.log('rewind');
		player.obj.seekTo(time);
	    }
	    // resume video if paused
	    console.log('resume');
	    player.obj.playVideo();
	} else {
	    // start playing video (from beginning or specified beginning)
	    console.log('play');
	    player.obj.seekTo(time || player.video.start || 0); 
	}
    },

    // pause video
    pause: function() {
	player.obj.pauseVideo();
    },

    // stop video
    stop: function() {
	player.obj.stopVideo();
    },

    // get total duration of video
    getDuration: function() {
	return player.obj.getDuration();
    },

    // get current video position (in seconds from beginning)
    getCurrentTime: function() {
	return player.obj.getCurrentTime();
    },

    // synchronize with master, and return current time
    sync: function(time) {
	var now = player.obj.getCurrentTime();
	// only adjust when off by 1/2 second or more (otherwise seek op expensive and not worth it)
	if (Math.abs(now - time) >= 0.5) {
	    // heuristic: add an additional second to account for seek op 
	    console.log('sync video to ' + (time + 1));
	    player.obj.seekTo(time + 1);
	    return time + 1;
	} else {
	    return now;
	}
     },

    // resize player to fill most of available window real estate
    resize: function() {
	// 40 to account for bootstrap header height; 6 for margin aesthetics
	player.obj.setSize(window.innerWidth - 6, window.innerHeight - 46);
    }

};

// when youtube api ready & video selected, create the video player
function onYouTubeIframeAPIReady() {
    $.when(player.initialized).done(player.create);
};

// alert (video manager) when video loaded & player ready
function onPlayerReady(event) {
    $.event.trigger('videoReady');
};

// not responding to state changes b/c video manager is in full control already
function onPlayerStateChange(event) {
};
