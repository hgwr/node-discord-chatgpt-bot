const HISTORY_SIZE = 20
const GPT_MODEL = 'gpt-3.5-turbo'
const GPT_MAX_TOKENS = 4090
const GPT_NUM_TOKENS_FOR_REPLY = 500
const GPT_NUM_TOKENS_FOR_PROMPT = GPT_MAX_TOKENS - GPT_NUM_TOKENS_FOR_REPLY
const DO_SPEECH = true

const { Client, Events, GatewayIntentBits } = require('discord.js')
const { joinVoiceChannel } = require('@discordjs/voice')
const { createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice')
const { Configuration, OpenAIApi } = require('openai')
const { encoding_for_model } = require('@dqbd/tiktoken')
const synthesizeSpeech = require('./textToSpeech')

const tokenEncoding = encoding_for_model(GPT_MODEL)

let createMessageTemplate
if (process.argv[2]) {
  createMessageTemplate = require(process.argv[2])
} else {
  createMessageTemplate = require('./config/Elenaria')
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] })

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}!`)
})

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const getChannelHistory = async (channel) => {
  let templates = createMessageTemplate()
  let numTokens = 0
  for (const template of templates) {
    numTokens += tokenEncoding.encode(template.content).length
  }

  let messages = []
  let lastPushedMessage
  let limitReached = false
  while (!limitReached && numTokens < GPT_NUM_TOKENS_FOR_PROMPT) {
    console.log('numTokens: ', numTokens)
    const fetchOption = { limit: HISTORY_SIZE }
    if (lastPushedMessage) {
      fetchOption.before = lastPushedMessage.id
    }
    const channelMessages = await channel.messages.fetch(fetchOption)
    if (channelMessages.size === 0) {
      break
    }
    channelMessages.forEach((msg) => {
      lastPushedMessage = msg
      if (msg.content.trim() === '') return
      if (msg.content.startsWith('!')) return
      const msgTokens = tokenEncoding.encode(msg.content).length
      if (numTokens + msgTokens > GPT_NUM_TOKENS_FOR_PROMPT) {
        limitReached = true
        return
      }
      if (limitReached) return
      msg.mentions.users.forEach((user) => {
        msg.content = msg.content.replace(`<@${user.id}>`, user.username)
      })
      msg.author.username = msg.author.username
      messages.push({
        role: msg.author.id === client.user.id ? 'assistant' : 'user',
        content: `${msg.author.username}: ${msg.content}`,
      })
      numTokens += msgTokens
    })
    if (channelMessages.size < HISTORY_SIZE) {
      break
    }
  }
  templates.reverse()
  messages.push(...templates)
  messages.reverse()
  console.log('Composed message tokens:', numTokens)
  return messages
}

let sendTypingIntervalId

const startSendTyping = (channel) => {
  channel.sendTyping()
  sendTypingIntervalId = setInterval(() => {
    channel.sendTyping()
  }, 5000)
}

const stopTyping = () => {
  clearInterval(sendTypingIntervalId)
}

const speech = async (voiceChannel, answer) => {
  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    })
    const player = createAudioPlayer()
    connection.subscribe(player)
    const speechData = await synthesizeSpeech(answer)
    const resource = createAudioResource(speechData, { inputType: StreamType.OggOpus })
    player.play(resource)
  } catch (error) {
    console.log('Failed to play speech', error)
  }
}

const completeChat = async (messages) => {
  let answer = ''
  try {
    while (true) {
      console.log('Completing chat...: ', messages)
      let completion
      while (!completion) {
        try {
          completion = await openai.createChatCompletion({
            model: GPT_MODEL,
            messages: messages,
          })
        } catch (error) {
          if (error.response.status === 400) {
            console.log('Error 400 bad request. Retrying...')
            await sleep(1000)
            let newMessages = []
            for (const _ of createMessageTemplate()) {
              newMessages.push(messages.shift())
            }
            messages.shift()
            newMessages = newMessages.concat(messages)
            messages = newMessages
            console.log('New messages:', messages)
          } else {
            throw error
          }
        }
      }
      answer += completion.data.choices[0].message.content
      let finishReason = completion.data.choices[0].finish_reason
      console.log('Chat completed: ', finishReason)
      if (finishReason === 'stop') {
        break
      }
      messages.push(completion.data.choices[0].message)
    }
  } catch (error) {
    console.error(error)
    answer = 'エラーが発生しました。'
  }
  return answer
}

const getVoiceChannel = async (message) => {
  try {
    const guild = message.guild
    const member = await guild.members.fetch(message.member.id)
    const voiceChannel = member.voice.channel
    return voiceChannel
  } catch (error) {
    return null
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.id === client.user.id) return
  if (message.content.startsWith('!')) return
  if (message.content.trim() === '') return

  console.log(`[${message.createdAt}] ${message.author.username}: ${message.content}`)

  try {
    const botMentioned = message.mentions.users.has(client.user.id)
    if (botMentioned) {
      const messages = await getChannelHistory(message.channel)
      startSendTyping(message.channel)
      const answer = await completeChat(messages)
      stopTyping()
      await message.channel.send(answer)
      const voiceChannel = await getVoiceChannel(message)
      if (DO_SPEECH && voiceChannel) {
        await speech(voiceChannel, answer)
      }
    }
  } catch (error) {
    console.error('Error fetching messages:', error)
    message.channel.send('エラーが発生しました。')
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)
