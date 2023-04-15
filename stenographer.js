const ELENARIA_USER_ID = process.env.ELENARIA_USER_ID

const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai')
const { Client, Events, GatewayIntentBits } = require('discord.js')
const { joinVoiceChannel } = require('@discordjs/voice')
const recordAudio = require('./recordAudio.js')

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

const client = new Client({
  intents: [GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds],
})

client.on(Events.ClientReady, () => console.log('Ready!'))

let recordedUsers = {}

const userSpeakHandler = async (voiceChannel, connection, notableUserId) => {
  const receiver = connection.receiver
  if (recordedUsers[notableUserId]) return
  recordedUsers[notableUserId] = true
  receiver.speaking.on('start', async (speakingUserId) => {
    if (speakingUserId == notableUserId) {
      try {
        const fileName = await recordAudio(receiver, speakingUserId)
        const transcription = await openai.createTranscription(fs.createReadStream(fileName), 'whisper-1')
        voiceChannel.send(`${ELENARIA_USER_ID} ${transcription.data.text}`)
      } catch (error) {
        console.log(error)
      }
    }
  })
}

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  newState.guild.members.fetch(newState.id).then((member) => {
    if (member.user.bot) return
    if (newState.channelId && !oldState.channelId) {
      console.log(`👋 ${member.user.username} joined ${newState.channel.name}`)
      const notableUserId = member.user.id
      const voiceChannel = newState.channel
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      })
      connection.on('close', () => {
        console.log('❌ Connection closed')
      })
      connection.on('disconnect', () => {
        console.log('❌ Disconnected')
      })
      connection.on('error', (error) => {
        console.log('❌ Error', error)
      })
      connection.on('ready', () => {
        console.log('🎙️ Ready')
        userSpeakHandler(voiceChannel, connection, notableUserId)
      })
      connection.on('stateChange', (oldState, newState) => {
        console.log(`🎙️ State changed ${oldState.status} -> ${newState.status}`)
      })
    } else if (!newState.channelId && oldState.channelId) {
      console.log(`👋 ${member.user.username} left ${oldState.channel.name}`)
    }
  })
})

client.on(Events.Error, console.warn)

client.login(process.env.STENOGRAPHER_BOT_TOKEN)
