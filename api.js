const https = require("https");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");
const { getInfo } = require("ytdl-core");
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");
const { Guild } = require("discord.js");
const fs = require("fs");
const main = require("./main");
const { channel } = require("diagnostics_channel");

module.exports = {
  searchAndQueueVideo,
  retrieveBoundChannel
}


/**
 * 
 * @param {Array} keywords 
 */
function searchAndQueueVideo(guild, keywords){

  const channel = retrieveBoundChannel(guild);

  if(keywords[0].startsWith("https://www.youtube.com")){
    getInfo(keywords[0]).then((info) => {
      if(info === undefined){
        channel.send(":x: **Could not find song or playlist!**")
        return;
      }
      queueTrack(guild, info.videoDetails.videoId);
    }).catch((error) => {
      queuePlaylist(guild, keywords[0]);
    });

  }else {
    var formattedKeywords = "";
    for(key in keywords){
      if(keywords.length > (parseInt(key) + 1))
        formattedKeywords += keywords[key] + "%20"
        else
        formattedKeywords += keywords[key]
    }
  
  
    console.log(formattedKeywords)
    const url = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${formattedKeywords}&type=video&key=${JSON.parse(fs.readFileSync("./token.json")).youtubeAPI}`
  
    https.get(url, (res) => {
  
      let data = '';
  
      res.on('data', (chunk) => {
        data += chunk;
      })
  
      res.on('end', () => {
        const json = JSON.parse(data);
        queueTrack(guild, json.items[0].id.videoId);
      })
    }) 
  }
}

/**
 * 
 * @param {Guild} guild 
 * @param {*} videoId 
 */
function queueTrack(guild, videoId){

  const channel = retrieveBoundChannel(guild);

  if(main.AUDIO_PLAYERS.get(guild.id) === undefined){
      initAudioPlayer(guild);
      console.log("Audio player initialized!")
  }

  main.TRACK_QUEUES.get(guild.id).push(videoId);
  const player = main.AUDIO_PLAYERS.get(guild.id);
  if(player.state.status === 'idle' ||  player.state.status === 'buffering'){
    main.AUDIO_PLAYERS.get(guild.id).play(createAudioResource(ytdl(`https://www.youtube.com/watch?v=${main.TRACK_QUEUES.get(guild.id)[0]}`, { filter: 'audioonly', liveBuffer: true})))
    getInfo(videoId).then((info) => channel.send(`:arrow_forward: **Playing **${info.videoDetails.title}`))
    main.TRACK_QUEUES.get(guild.id).shift();
  }else
    getInfo(videoId).then((info) => channel.send(`:arrow_forward: **Added **${info.videoDetails.title} ** to queue!**`))
  
}

/**
 * 
 * @param {Guild} guild 
 * @param {*} playlistId 
 */
function queuePlaylist(guild, url){

  const channel = retrieveBoundChannel(guild);

  ytpl(url, {pages: Infinity}).then((playlist) => {
    if(main.AUDIO_PLAYERS.get(guild.id) === undefined){
      initAudioPlayer(guild);
      console.log("Audio player initialized!")
    }


    const videoIds = [true, playlist.title];
    playlist.items.forEach(item => videoIds.push(item.id))

    main.TRACK_QUEUES.get(guild.id).push(videoIds);
    const player = main.AUDIO_PLAYERS.get(guild.id);

    if(player.state.status === 'idle' ||  player.state.status === 'buffering'){
      main.AUDIO_PLAYERS.get(guild.id).play(createAudioResource(ytdl(`https://www.youtube.com/watch?v=${videoIds[2]}`, { filter: 'audioonly', liveBuffer: true})))
      channel.send(`:arrow_forward: **Playing playlist: **${videoIds[1]}`)
      main.TRACK_QUEUES.get(guild.id)[0][0] = false;
      getInfo(videoIds[2]).then((info) => channel.send(`:arrow_forward: **Playing **${info.videoDetails.title}`))
      main.TRACK_QUEUES.get(guild.id)[0].splice(2, 1);
      if(main.TRACK_QUEUES.get(guild.id)[0].length <= 2){
        main.TRACK_QUEUES.get(guild.id).shift();
      }
    }else
      getInfo(videoId).then((info) => channel.send(`:arrow_forward: **Added playlist **${videoIds[1]} ** to queue!**`))

  }).catch((error) => {
    channel.send(":x: **Could not find source!**")
  })

}


/**
 * 
 * @param {Guild} guild 
 */
function initAudioPlayer(guild){

  const channel = retrieveBoundChannel(guild);

  const player = createAudioPlayer({
    behaviors: {
      maxMissedFrames: Number.MAX_SAFE_INTEGER
    }
  });

  getVoiceConnection(guild.id).subscribe(player);
  main.AUDIO_PLAYERS.set(guild.id, player);
  main.TRACK_QUEUES.set(guild.id, []);

  player.on('stateChange', (oldState, newState) => {
    if(newState.status === 'idle'){
      if(main.TRACK_QUEUES.get(guild.id).length > 0){
        //A normal video is in the queue
        if(typeof main.TRACK_QUEUES.get(guild.id)[0] === 'string'){
          player.play(createAudioResource(ytdl(`https://www.youtube.com/watch?v=${main.TRACK_QUEUES.get(guild.id)[0]}`, {filter: 'audioonly', liveBuffer: true})))
          getInfo(main.TRACK_QUEUES.get(guild.id)[0]).then((info) => channel.send(`:notes: **Now playing: **${info.videoDetails.title}`))
  
          main.TRACK_QUEUES.get(guild.id).shift();
        }else {
          //A playlist is in the queue
          if(main.TRACK_QUEUES.get(guild.id)[0][0]){
            channel.send(`:notes: **Now playing playlist: **${main.TRACK_QUEUES.get(guild.id)[0][1]}`);
            main.TRACK_QUEUES.get(guild.id)[0][0] = false;
          }
          player.play(createAudioResource(ytdl(`https://www.youtube.com/watch?v=${main.TRACK_QUEUES.get(guild.id)[0][2]}`, {filter: 'audioonly', liveBuffer: true})))
          getInfo(main.TRACK_QUEUES.get(guild.id)[0][2]).then((info) => channel.send(`:notes: **Now playing: **${info.videoDetails.title}`))
          main.TRACK_QUEUES.get(guild.id)[0].splice(2, 1);


          if(main.TRACK_QUEUES.get(guild.id)[0].length <= 2){
            main.TRACK_QUEUES.get(guild.id).shift();
          }
        }
      }
    }
  });
}


/**
 * 
 * @param {Guild} guild 
 * @returns {Channel}
 */
 function retrieveBoundChannel(guild){
  return guild.channels.cache.get(main.BOUND_TEXT_CHANNELS.get(guild.id));
}

