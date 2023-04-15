const fs = require('fs')
const AudioContext = require('web-audio-api').AudioContext

const isSoundRecorded = async (fileName) => {
  const audioContext = new AudioContext()
  const mp3data = fs.readFileSync(fileName)
  return new Promise((resolve, reject) => {
    audioContext.decodeAudioData(mp3data, (audioBuffer) => {
      // 音声データのチャンネル数を取得する
      let numberOfChannels = audioBuffer.numberOfChannels
      // 音声データの最大振幅（dB）を取得する
      let maxAmplitude = 0
      for (let i = 0; i < numberOfChannels; i++) {
        // チャンネルごとの音声データを取得する
        let channelData = audioBuffer.getChannelData(i)
        // 音声データの最大値と最小値を求める
        let max = null
        let min = null
        for (const value of channelData) {
          if (max === null || value > max) {
            max = value
          }
          if (min === null || value < min) {
            min = value
          }
        }
        // 最大値と最小値の絶対値の大きい方を振幅とする
        let amplitude = Math.max(Math.abs(max), Math.abs(min))
        // 振幅が最大振幅より大きければ更新する
        if (amplitude > maxAmplitude) {
          maxAmplitude = amplitude
        }
      }
      // 振幅をデシベルに変換する
      let decibel = 20 * Math.log10(maxAmplitude)
      console.log('Max amplitude: ' + decibel + ' dB')
      // 振幅が-10 dB以下なら音が入っていないと判断する
      if (decibel <= -10) {
        console.log('No sound detected.')
        resolve(false)
      } else {
        console.log('Sound detected.')
        resolve(true)
      }
    })
  })
}

module.exports = isSoundRecorded
