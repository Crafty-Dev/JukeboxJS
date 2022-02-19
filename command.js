const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");
const { GuildMember, Guild, Channel } = require("discord.js");
const main = require("./main");
const api = require("./api");

 

module.exports = {
    play,
    disconnect,
    skipTrack,
    skipPlaylist,
    clearQueue,
    pauseTrack,
    resumeTrack

}

/**
 * 
 * @param {GuildMember} member 
 * @param {Array} args 
 */
function play(member, args){

    const guild = member.guild;
    const channel = api.retrieveBoundChannel(guild);

    if(args.length !== 0 && args.length !== undefined){
        if(checkJoin(member)){
            if(args[0].startsWith("https://www.youtube.com")){
                channel.send(`:mag_right: **Searching for:** <${args[0]}>`)
            }else {
                let query = "";
                args.forEach((arg) => {
                    query += arg + " "
                })
                channel.send(`:mag_right: **Searching for:** ${query}`)
            }

            api.searchAndQueueVideo(guild, args)
        }

    }else{
        channel.send(":x: **Invalid arguments!**")
    }


}

/**
 * 
 * @param {GuildMember} member 
 */
function disconnect(member){
    const guild = member.guild;
    const channel = api.retrieveBoundChannel(guild);

    if((connection = getVoiceConnection(member.guild.id)) !== undefined){
        if(member.voice.channelId === main.getBotVoiceChannel(guild).id){
            channel.send(`:wave: **Disconnected from channel** ${main.getBotVoiceChannel(guild).name}`)
            main.TRACK_QUEUES.set(guild.id, [])
            main.AUDIO_PLAYERS.set(guild.id, undefined);
            connection.destroy();
        }else {
            channel.send(":x: **You have to be in the same voice channel as the bot!**")
        }
    }else {
        channel.send(`:x: **Bot is not connected to a voice channel!**`)
    }
}


/**
 * 
 * @param {GuildMember} member 
 */
function skipTrack(member){
    const guild = member.guild;
    const channel = api.retrieveBoundChannel(guild);

    if(isMemberInBotChannel(member)){
        if(main.AUDIO_PLAYERS.get(guild.id).state.status === 'idle' || main.AUDIO_PLAYERS.get(guild.id).state.status === 'buffering'){
            channel.send(":x: **There is no track to skip!**")
            return;
        }
        main.AUDIO_PLAYERS.get(guild.id).stop();    
        channel.send(':fast_forward: **Skipped!**')
    }else
        channel.send(":x: **You need to be in the same voice channel as the bot**")

}

/**
 * 
 * @param {GuildMember} member 
 */
function skipPlaylist(member){
    const guild = member.guild;
    const channel = api.retrieveBoundChannel(guild);

    if(isMemberInBotChannel(member)){
        if(typeof main.TRACK_QUEUES.get(guild.id)[0] === 'string'){
            channel.send(":x: **There is no playlist playing!**")
            return;
        }
    
        const playlistName = main.TRACK_QUEUES.get(guild.id)[0][1];
        main.TRACK_QUEUES.get(guild.id).shift();
        main.AUDIO_PLAYERS.get(guild.id).stop();
        channel.send(`:fast_forward: **Skipped playlist** ${playlistName}**!**`)
    }else
        channel.send(":x: **You need to be in the same voice channel as the bot**")

}

/**
 * 
 * @param {GuildMember} member 
 */
function clearQueue(member){
    const guild = member.guild;
    const channel = api.retrieveBoundChannel(guild);

    if(isMemberInBotChannel(member)){
        main.TRACK_QUEUES.set(guild.id, [])
        channel.send(':put_litter_in_its_place: **Queue cleared!**')
    }else
        channel.send(":x: **You need to be in the same voice channel as the bot**")

}


/**
 * 
 * @param {GuildMember} member 
 */
function pauseTrack(member){
    const guild = member.guild;
    const channel = api.retrieveBoundChannel(guild);

    if(isMemberInBotChannel(member)){
        const player = main.AUDIO_PLAYERS.get(guild.id);
        console.log(player.state.status)
    
        if(player.state.status === 'paused'){
            channel.send(':x: **Bot is already paused!**')
            return;
        }
    
        main.AUDIO_PLAYERS.get(guild.id).pause();
        channel.send('⏸️ **Paused!**')
    }else
        channel.send(":x: **You need to be in the same voice channel as the bot**")


}

function resumeTrack(member){
    const guild = member.guild;
    const channel = api.retrieveBoundChannel(guild);

    if(isMemberInBotChannel(member)){
        const player = main.AUDIO_PLAYERS.get(guild.id);

        if(player.state.status !== 'paused'){
            channel.send(':x: **Bot is not paused!**')
            return;
        }
        
        main.AUDIO_PLAYERS.get(guild.id).unpause();
        channel.send('➡️ **Resumed!**')
    }else
        channel.send(":x: **You need to be in the same voice channel as the bot**")
}



/**
 * 
 * @param {GuildMember} member 
 */
function checkJoin(member){

    const guild = member.guild;
    const channel = api.retrieveBoundChannel(guild);

    const isMemberInVoiceChannel = member.voice.channel != null;
    const isBotInVoiceChannel = getVoiceConnection(guild.id) !== undefined;

    if(!isMemberInVoiceChannel){
        channel.send(":x: **You need to be in a voice channel to use this command!**");
        return false;
    }


    if(isBotInVoiceChannel){
        if(member.voice.channel.id !== main.getBotVoiceChannel(guild).id){

            if(main.getBotVoiceChannel(guild).members.size > 1){
                channel.send(":x: **Bot is already in use!**");
                return false;
            }

        }

    }else {
        joinChannel(member, () => {
            channel.send(`:wave: **Connected to channel** ${main.getBotVoiceChannel(guild).name}`);
        })
    }
    return true;
}

/**
 * 
 * @param {GuildMember} member 
 * @param {*} callback 
 */
function joinChannel(member, callback){
    joinVoiceChannel({
        channelId: member.voice.channel.id,
        guildId: member.guild.id,
        adapterCreator: member.guild.voiceAdapterCreator
    })
    callback();
}

/**
 * 
 * @param {GuildMember} member 
 */
function isMemberInBotChannel(member){
    if(getVoiceConnection(member.guild.id) === undefined)
        return false;

    return member.voice.channel.id === main.getBotVoiceChannel(member.guild).id;
}