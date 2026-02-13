# n8n-nodes-ffmpeg

[n8n](https://n8n.io/) コミュニティノード。ワークフロー内で [FFmpeg](https://ffmpeg.org/) を使って音声ファイルを変換します。

## 前提条件

n8n が動作する環境に `ffmpeg` コマンドがインストールされている必要があります。

## インストール

n8n の Settings > Community Nodes で以下を入力してインストール:

```
n8n-nodes-ffmpeg
```

## オペレーション

### Convert（フォーマット変換）

音声ファイルを別のフォーマットに変換します。

| パラメータ | 説明 | デフォルト |
|---|---|---|
| Output Format | 出力フォーマット（MP3, WAV, OGG, FLAC, AAC, M4A） | MP3 |
| Bitrate (option) | 出力ビットレート（64k〜320k） | Auto |
| Sample Rate (option) | サンプルレート（22050, 44100, 48000 Hz） | Auto |

### Change Bitrate（ビットレート変換）

音声ファイルのビットレートを変更します（フォーマットはそのまま）。

| パラメータ | 説明 | デフォルト |
|---|---|---|
| Bitrate | 出力ビットレート（64k〜320k） | 128k |

## 共通パラメータ

| パラメータ | 説明 | デフォルト |
|---|---|---|
| Binary Property | 入力バイナリデータのプロパティ名 | `data` |
| Output Binary Property | 出力バイナリデータのプロパティ名 | `data` |

## 使用例

### WAV を MP3 128kbps に変換

1. **Read Binary File** ノード: WAV ファイルを読み込み
2. **FFmpeg** ノード: Operation = Convert, Output Format = MP3, Bitrate = 128k
3. **Write Binary File** ノード: 変換後のファイルを保存

## 互換性

- n8n 1.0+
- FFmpeg が n8n 実行環境にインストール済みであること

## リンク

- [npm](https://www.npmjs.com/package/n8n-nodes-ffmpeg)
- [GitHub](https://github.com/yambal/n8n-node-ffmpeg)

## ライセンス

MIT
