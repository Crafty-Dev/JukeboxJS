const { getVoiceConnection } = require("@discordjs/voice");
const { Client, Intents, Guild, Channel, GuildMember } = require("discord.js");
const fs = require("fs");
const command = require("./command")

const PREFIX = "§";
const COMMANDS = [
    'play',
    'p',
    'disconnect',
    'dc',
    'skip',
    's',
    'skipplaylist',
    'spl',
    'clear',
    'pause',
    'resume'
]

//Map<String, Channel>
const BOUND_TEXT_CHANNELS = new Map();

//Map<String, AudioPlayer>
const AUDIO_PLAYERS = new Map();

//Map<String, Array>
const TRACK_QUEUES = new Map(); 



const client = new Client({intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES", "GUILD_MEMBERS"]});

client.on('ready', () => {
    console.log(`Bot is online as ${client.user.tag}`)
    client.user.setActivity(`${PREFIX}help`, {type: "LISTENING"})
})

client.on('messageCreate', (msg) => {
    if(!msg.content.startsWith(PREFIX)) return;

    if((i = COMMANDS.indexOf(msg.content.replace(PREFIX, "").split(" ")[0])) > -1){
        var args = msg.content.split(" ");
        args.splice(0, 1);
        processCommand(msg.channel, msg.member, COMMANDS[i], args)
    }
    
})


client.login(JSON.parse(fs.readFileSync("./token.json")).discord)


/**
 * 
 * @param {Channel} channel 
 * @param {GuildMember} member 
 * @param {*} cmd 
 * @param {*} args 
 */

function processCommand(channel, member, cmd, args){

    //Channel Management
    if(BOUND_TEXT_CHANNELS.get(member.guild.id) !== channel.id){
        BOUND_TEXT_CHANNELS.set(member.guild.id, channel.id)
        console.log(`Bot was bound to ${channel.name} in Guild: ${member.guild.name}`)
    }

    //Command execution
    switch(cmd){
        case 'play': case 'p':
            command.play(member, args)
            break;
        case 'disconnect': case 'dc':
            command.disconnect(member);
            break;
        case 'skip': case 's':
            command.skipTrack(member);        
            break;
        case 'skipplaylist': case 'spl':
            command.skipPlaylist(member);
            break;    
        case 'clear':
            command.clearQueue(member);
            break;
        case 'pause':
            command.pauseTrack(member);
            break;
        case 'resume':
            command.resumeTrack(member);                       
    }


}

/**
 * 
 * @param {Guild} guild 
 */
function getBotVoiceChannel(guild){
    return guild.channels.cache.get(getVoiceConnection(guild.id).joinConfig.channelId);
}

module.exports.client = client;
module.exports.BOUND_TEXT_CHANNELS = BOUND_TEXT_CHANNELS;
module.exports.AUDIO_PLAYERS = AUDIO_PLAYERS;
module.exports.TRACK_QUEUES = TRACK_QUEUES;

module.exports.getBotVoiceChannel = getBotVoiceChannel;

