# node-discord-chatgpt-bot

[OpenAI Chat API](https://platform.openai.com/docs/guides/chat) を使用して Discord サーバーのメッセージへの応答を生成するシンプルなボット。

## 前提条件

- node.js v18.12.0 以降
- このリポジトリの `stenographer.js` は、Apple Silicon プロセッサでは動作しません。

## 設定

1. リポジトリのクローンを作成し、依存関係をインストールします。

```bash
npm i
```

1. 2 つの Discord ボットを作成します。 1 つは、言及されたときに応答するボット index.js です。 もう 1 つは stenographer.js というボットで、音声チャネルで音声を聞いて書き起こします。 詳細については、[このガイド](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)を参照してください。
1. OpenAI API キーを作成します。 詳細については、[このガイド](https://beta.openai.com/docs/developer-quickstart/your-api-keys) を参照してください。
1. Google Cloud Text-to-Speech API を有効にし、サービスアカウントキーを作成します。サービスアカウントを作成し、秘密鍵 json ファイルをダウンロードし、適切なディレクトリに配置します。詳細については、[このガイド](https://cloud.google.com/text-to-speech/docs/quickstart-client-libraries?hl=ja) を参照してください。
1. `.envrc.sample` を参照して環境変数を作成し、値を入力します。 `.envrc` など新しいファイルを作成することをおすすめします。
1. ボットを実行します。

ターミナル1：

```bash
node index.js
```

ターミナル2：

```bash
node stenographer.js
```

## 仕組み

- ターミナル1で動いているボットは、メンションされたときにテキストで応答します。ユーザがボイスチャンネルにいる時は、テキストと音声で応答します。
- ターミナル2で動いているボットは、音声チャネルでユーザの音声を聞いて文字起こしします。
- その際、環境変数 ELENARIA_USER_ID に設定したユーザーをメンションする形で、文字起こししたテキストをチャンネルに送信します。
- 環境変数 ELENARIA_USER_ID がターミナル1で動いているボットの ID になっていれば、メンションされたボットが文字起こしされたテキストに対して音声で応答します。
