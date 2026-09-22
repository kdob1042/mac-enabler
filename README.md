# mac-enabler

Codex・Cursor・ChatGPT Workで使う共通運用と端末セットアップを管理します。

## はじめに

cloneしたこのディレクトリで、使うCLIだけを設定します。

| 操作 | Codex | Cursor CLI |
| --- | --- | --- |
| 確認 | `npm run codex:setup -- --check` | `npm run cursor:setup -- --check` |
| 導入 | `npm run codex:setup -- --install` | `npm run cursor:setup -- --install` |

既存の管理値を置き換える場合だけ `--force` を追加します。置換前にバックアップを作り、未管理設定・認証・履歴・ログ・キャッシュは保持します。導入先はCodexの `--codex-home PATH` / `CODEX_HOME`、Cursorの `--cursor-config-dir PATH` / `CURSOR_CONFIG_DIR` で指定できます。

Codexの導入対象は `runtime/profiles/` の2ファイルです。`~/.codex/config.toml`は変更しません。共通デフォルトが必要なら `runtime/base-config.snippet.toml` を既存設定に確認しながら統合します。Cursorは `~/.cursor/cli-config.json` の管理項目だけを更新し、ログイン・IDE・Cloud Agent・Grok Botの設定は変更しません。

## モデルを選ぶ

| プロファイル | 主な用途 |
| --- | --- |
| `luna_max`（Luna Max） | 既存ソース解析、変更箇所の特定、簡単な実装・検証 |
| `astra_light`（Astra Light） | 難しい設計・実装、本番・破壊・移行・認証・公開契約の判断 |

モデルIDと推論量は `config/model-routing.json`、導入値は `runtime/profiles/` が正本です。解析後、必要なら引き継ぎを保存してコンパクションし、実装難易度で再選択します。

```bash
codex --profile luna_max
codex --profile astra_light
```

これは新しいCLIプロセスの起動指定です。実行中のモデルやChatGPT Workの画面を変更するコマンドではありません。利用可能なモデルと実際の切替は起動側で確認します。CursorのモデルはCursor側で選びます。

任意の選択補助：

```bash
node scripts/route-task.mjs --phase source_analysis --task "変更箇所を特定する"
node scripts/route-task.mjs --phase implementation --task "難しい実装を行う"
```

返された `codex_profile` を起動側へ渡します。ルーター自身はモデルを切り替えません。

## 何をどこで管理するか

| 対象 | 正本・配布先 |
| --- | --- |
| 共通運用・選択規則・セットアップ | このrepoの `config/`、`runtime/`、`scripts/` |
| Codex／Cursorのモデル・承認・sandbox・個人設定 | 利用端末。各repoへコピーしない |
| 共通Skill | ホストのユーザー領域またはプラグイン |
| プロジェクトの設計・ブランチ・コマンド・受入 | 各repoの `AGENTS.md`、docs、scripts、CI |
| Cloud Agentに必要な共通規則 | 許可リストにあるrepoの短いAGENTS管理ブロックのみ |
| 新規repoのIssue／PR／Project自動化 | `dev-template` |
| 作業の現在地 | 対象repoのIssue／PR |

このrepoを置くだけでは他のrepoへ設定は適用されません。端末とCloud Agentの認証・会話・課金枠も別です。

## 必要な手順を読む

| 目的 | 参照先 |
| --- | --- |
| 共通ブロックをrepoへ同期する | [同期](docs/integration.md) |
| 中断・圧縮・担当交代から再開する | [引き継ぎ](docs/compact-protocol.md) |
| Cursor／Codex／Cloud Agentを併用する | [併用](docs/cursor-codex.md) |
| このrepoを変更する | [AGENTS.md](AGENTS.md) |

設定後は対象repoのAGENTS→Issue／PR→該当設計・コードを読み、変更範囲に必要な検証を行います。軽微な変更に毎回の分類・計画書・引き継ぎを追加しません。

開発時の必須検証：`npm test`、`npm run validate`。
