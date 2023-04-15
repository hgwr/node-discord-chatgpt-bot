const { Readable } = require('stream')
const textToSpeech = require('@google-cloud/text-to-speech')

const synthesizeSpeech = async (text) => {
  const client = new textToSpeech.TextToSpeechClient()
  /*
  client.listVoices({}, (err, voices) => {
    console.log('Voices:', voices.voices.filter((voice) => voice.languageCodes.includes('ja-JP')))
  })
  */
  const request = {
    input: { text: text },
    voice: {
      languageCode: 'ja-JP',
      name: 'ja-JP-Wavenet-B',
      ssmlGender: 'FEMALE',
    },
    audioConfig: {
      audioEncoding: 'OGG_OPUS',
      speakingRate: 1.1,
      pitch: 0.0,
    },
  }
  const [response] = await client.synthesizeSpeech(request)
  const audioContent = response.audioContent
  const audioStream = new Readable({ read: () => {} })
  audioStream.push(new Uint8Array(Buffer.from(audioContent, 'base64').buffer))
  return audioStream
}

module.exports = synthesizeSpeech
