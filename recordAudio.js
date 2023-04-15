const { createWriteStream } = require('node:fs')
const { pipeline } = require('stream/promises')
const { EndBehaviorType } = require('@discordjs/voice')
const prism = require('prism-media')
const { OpusEncoder } = require('@discordjs/opus')
const { Transform } = require('stream')

class OpusDecodingStream extends Transform {
  encoder

  constructor(options, encoder) {
    super(options)
    this.encoder = encoder
  }

  _transform(data, encoding, callback) {
    this.push(this.encoder.decode(data))
    callback()
  }
}

let recordingUsers = {}

const recordAudio = async (receiver, userId) => {
  if (recordingUsers[userId]) return
  recordingUsers[userId] = true
  const opusStream = receiver.subscribe(userId, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 1000,
    },
  })
  const encoder = new OpusEncoder(16000, 1)
  const opusDecoder = new OpusDecodingStream({}, encoder)
  const filename = `./recordings/${Date.now()}-${userId}.mp3`
  const out = createWriteStream(filename)
  const ffmpeg = new prism.FFmpeg({
    args: [
      '-analyzeduration', '0',
      '-loglevel', '0',
      '-f', 's16le',
      '-ar', '16000',
      '-ac', '1',
      '-i', '-',
      '-f', 'mp3'
    ],
  })

  console.log(`👂 Started recording ${filename}`)
  try {
    await pipeline(opusStream, opusDecoder, ffmpeg, out)
    console.log(`✅ Recorded ${filename}`)
    opusStream.destroy()
    return filename
  } catch (err) {
    console.log(err)
    console.warn(`❌ Error recording file ${filename} - ${err.message}`)
  } finally {
    recordingUsers[userId] = false
  }
}

module.exports = recordAudio
