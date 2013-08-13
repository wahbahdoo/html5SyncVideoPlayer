A poor man's implementation of synchronized video watching. 

The 'master' is defined as the first person to select the video to watch. All others 
are synchronized to the master. Sychronization is enabled by a node.js server.

The latest implementation speeds up (or pauses) the video whenever a 'slave' is too 
far behind (or ahead of) the 'master'. An earlier implementation seeks the 'slaves' 
at a fixed interval, but that would depend on muting the slaves and having them listen 
to the master's audio over a separate phone connection, as frequent seeking would 
destroy the comprehensibility of the audio. 

Only YouTube is currently supported, but other video sources should be able to be
supported by implementing the 'player' apis and loading in the appropriate JavaScript
files when playing videos from that source.

The list of videos are tracked by client/schedule.json.