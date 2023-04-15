# node-discord-chatgpt-bot

A simple bot that uses the [OpenAI Chat API](https://platform.openai.com/docs/guides/chat) to generate responses to messages in a Discord server.

## Prerequisites

- node.js v18.12.0 or higher
- `stenographer.js` from this repository dose not work with Apple Silicon processors.

## Setup

1. Clone the repository and install dependencies:

```bash
npm i
```

1. Create two Discord bots. One is the bot index.js that responds when mentioned. The other will be a bot, stenographer.js, that listens and transcribes audio on the voice channel. See [this guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot) for more information.
1. Create an OpenAI API key. See [this guide](https://beta.openai.com/docs/developer-quickstart/your-api-keys) for more information.
1. Enable the Google Cloud Text-to-Speech API and create a service account key. Create a service account, download the private key json file and place it in the appropriate directory. See [this guide](https://cloud.google.com/text-to-speech/docs/quickstart-client-libraries?hl=en) for more information.
1. Create environment variables by referring to `.envrc.sample` and enter values. We recommend creating a new file such as `.envrc`.
1. Run the bot:

Terminal 1:

```bash
node index.js
```

Terminal 2:

```bash
node stenographer.js
```

## Structure

- A bot running in Terminal 1 will respond with a text when mentioned. When a user is on a voice channel, respond with text and voice.
- A bot running in terminal 2 listens and transcribes the user's speech on the voice channel.
- At that time, send the transcribed text to the channel in the form of mentioning the user set in the environment variable ELENARIA_USER_ID.
- If the environment variable ELENARIA_USER_ID is the id of the bot running in terminal 1, the mentioned bot will respond to the transcribed text by voice.
