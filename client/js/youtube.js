/* youtube player */

// the intent is to load in the appropriate player dynamically
// and have each type of player define the player object
// so that videoMgr in app.js can remain oblivious to player details

player = {
    
    // parameters to pass to youtube api to create player
    params: {
	playerVars: {
	    html5: 1,
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

    // track playback rate
    rate: 1,

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

    // synchronize with master, and return current time
    sync: function(time) {
	var now = player.obj.getCurrentTime();
	// seek if way off
	if ((now - time) > 3) {
	    console.log('seek to time ' + time);
	    player.obj.seekTo(time + 1);
	}
	// only adjust when off by 0.5 second or more 
	if ((now - time) >= 0.5) {
	    if (player.rate != 'paused') {
		console.log('slow down');
		player.obj.pauseVideo();
	    } else {
		console.log('keep slowing down');
	    }
	} else if ((time - now) >= 0.5) {
	    if (player.rate != 'sped') {
		console.log('speed up');
		if (player.rate == 'paused') {
		    player.obj.playVideo();
		}
		player.obj.setPlaybackRate(1.5);
		player.rate = 'sped';
	    } else {
		console.log('keep speeding down');
	    }
	} else {
	    if (player.rate != 'normal') {
		console.log('back to normal');
		if (player.rate == 'paused') {
		    player.obj.playVideo();
		} else {
		    player.obj.setPlaybackRate(1);
		}
		player.rate = 'normal';
	    } else {
		console.log('keep normal');
	    }
	}
     },

    // mute video player
    mute: function() {
	player.obj.mute();
    },

    // unmute video player
    unmute: function() {
	player.obj.unMute();
    },

    // get total duration of video
    getDuration: function() {
	return player.obj.getDuration();
    },

    // get current video position (in seconds from beginning)
    getCurrentTime: function() {
	return player.obj.getCurrentTime();
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
