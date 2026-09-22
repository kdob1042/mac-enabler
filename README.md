# mac-enabler

Codex・ChatGPT Work・Cloud Agentで使う共通運用を、必要な範囲だけ管理するリポジトリです。

プロジェクトのコード、設計、ブランチ、テスト、データの正本ではありません。各プロジェクトの正本は、それぞれのリポジトリに残します。

## 管理境界

| 対象 | 正本 | 各リポジトリへの同期 |
| --- | --- | --- |
| Codex本体のモデル・承認・sandbox設定 | 利用端末の `~/.codex/` | しない |
| Cursor CLIのモデル・権限・表示設定 | 利用端末の `~/.cursor/cli-config.json` | しない |
| 個人共通の短いエージェント指示 | 利用端末のユーザー領域 | しない |
| 成熟した共通Skill | Codex／Cursorのユーザー領域またはプラグイン | 原則しない |
| プロジェクト固有の指示・コマンド・検証 | 各リポジトリの `AGENTS.md`、docs、scripts、CI | そのrepoで管理 |
| Cloud Agentが必ず読む最小の共通運用 | 各対象repoのルート `AGENTS.md` の管理ブロック | 明示した対象だけ |
| 新規repo用のIssue／PR／Project自動化 | `dev-template` | テンプレートとして利用 |

`mac-enabler`をGitHubに置いただけで、他のrepoのエージェントが自動的に読み込むことはありません。一方で、すべてのrepoへ中央設定のスナップショットを配る必要もありません。

このrepoから対象repoへ同期するのは、Cloud Agentなどがそのrepo内で自動的に読む必要がある短い `AGENTS.md` 管理ブロックだけです。モデルルーティング、workflow設定、コンパクション文書を `.codex/mac-enabler/` として配布しません。

## 責務分担

- `mac-enabler`：共通運用の設計、端末セットアップスクリプト（Codex／Cursor）、任意のルーティング補助、同期スクリプト
- `dev-template`：新規repo向けのIssue／PR／Project自動化テンプレート
- 各プロジェクトrepo：固有の設計、ブランチ、テスト、データ、受入条件
- 利用端末：Codex本体のモデル、推論量、承認、sandbox、サブエージェント上限

## 構成

```text
mac-enabler/
├── .github/
│   ├── sync-targets.json
│   └── workflows/
│       └── sync-targets.yml
├── AGENTS.md
├── config/
│   ├── model-routing.json
│   └── workflow.json
├── docs/
│   ├── compact-protocol.md
│   └── integration.md
├── runtime/
│   ├── base-config.snippet.toml
│   ├── cursor/
│   │   └── cli-config.json
│   └── profiles/
│       ├── astra_light.config.toml
│       └── luna_max.config.toml
├── scripts/
│   ├── bootstrap-mac.mjs
│   ├── doctor.mjs
│   ├── install-codex-profiles.mjs
│   ├── install-user-agents.mjs
│   ├── route-task.mjs
│   ├── setup-codex.mjs
│   ├── setup-cursor.mjs
│   ├── sync-agents.mjs
│   ├── sync-repositories.mjs
│   └── validate.mjs
└── test/
```

## Mac到着時の初期セットアップ

新しいMacでは、mac-enablerをcloneしたあと次を実行します。

```bash
npm run mac:bootstrap -- --install
npm run doctor
```

この入口で `~/.codex/` に導入するのは、2つのCodexプロフィールとユーザー `AGENTS.md` の管理ブロックです。認証、履歴、ログ、キャッシュ、既存 `config.toml` 全体は上書きしません。

詳細とCodex Remoteの手順は `docs/codex-remote.md` を参照してください。RemoteのQRペアリングやアカウント状態はリポジトリから自動変更しません。

## 端末側のCodex設定

本体設定は各repoへ同期せず、利用端末の `~/.codex/` に置きます。モデルプロファイルは次の2つだけを管理します。

| CLI profile | 表示名 | モデル設定 | 主な用途 |
| --- | --- | --- | --- |
| `luna_max` | Luna Max | `gpt-5.6-luna` / `xhigh` | 既存ソース解析、変更箇所の特定、簡単な実装 |
| `astra_light` | Astra Light | `gpt-6-astra` / `low` | 難しい設計、難しい実装、重大なリスク |

### Codexプロフィールだけを更新する場合

通常の初期導入は `npm run mac:bootstrap -- --install` を使います。プロフィールだけを個別に更新・確認する場合は従来のコマンドも使えます。

```bash
npm run codex:setup -- --install
npm run codex:setup -- --check
```

作業時の起動例：

```bash
codex --profile astra_light
codex --profile luna_max
```

### プロフィールの起動主体

セットアップは、ユーザーが端末で実行しても、端末上でシェル操作が許可されたCodex CLIに実行を依頼しても構いません。ただし、`codex --profile ...` は起動時の指定です。すでに動いているCodex自身が、そのプロセスのモデルを後から切り替えるコマンドではありません。別のプロファイルを使う場合は、ユーザーまたは外側のランチャーが、そのプロファイルで新しいCodex CLIプロセスを起動します。

ルーターとこの指針は、作業段階ごとにどのプロファイルを選ぶかを固定するためにあります。ルーターは `codex_profile` を出力しますが、モデル切り替え自体はCLIの起動側が行います。ChatGPT Workの画面から、ユーザー端末上のCLIを自動起動・切替するものではありません。

`--force`を付けた場合だけ既存の同名プロフィールを置き換え、置換前にバックアップを作成します。`config.toml`、認証、履歴、ログ、キャッシュはこのスクリプトでは変更しません。

承認とsandboxの自走向け既定値は各プロフィールファイル自体に含めます。両プロフィールとも `workspace-write`、`on-request`、自動承認レビュー、workspace内ネットワークアクセスを使います。これにより通常のsandbox境界を残しつつ、日常的な承認待ちを減らします。

`runtime/base-config.snippet.toml` は、同じ既定値をプロフィール外でも使いたい場合の参照用です。セットアップスクリプトは既存設定の破壊を避けるため、`~/.codex/config.toml` へ自動追記しません。

このセットアップは端末側のCodex用です。Cursorのモデル選択やCursor固有の設定を、このrepoから自動変更するものではありません。

## 端末側のCursor CLI設定

Cursor CLIのグローバル設定は `~/.cursor/cli-config.json` で管理します。mac-enablerは、Cursor公式のCLI設定形式に合わせた権限・表示デフォルトを、既存設定を保持しながら一度に導入します。

```bash
npm run cursor:setup -- --install
```

確認だけ行う場合：

```bash
npm run cursor:setup -- --check
```

既存設定を管理値へ更新する場合だけ `--force` を付けます。更新前にバックアップを作成し、ユーザー独自の未管理フィールドと権限項目は保持します。`CURSOR_CONFIG_DIR` または `--cursor-config-dir PATH` で導入先を変更できます。

このスクリプトはCursor CLIの設定、認証、IDEの個人設定、Cloud Agent／Grok Botの設定を同時に変更するものではありません。モデル選択はCursor側の `/model` または利用環境で行います。

Cursor公式のプロジェクト規約入口は各repoの `AGENTS.md` です。共通規約のrepo配布はPR #3の短い管理ブロックに限定します。


## 任意のルーティング補助

基本導線は、Lunaで既存ソースを解析して変更箇所を特定し、必要ならコンパクションを挟み、その後の実装難易度で再選択する流れです。

1. 既存ソースとの関係・変更箇所の特定：`luna_max`
2. Issue／PRへ状態を保存し、必要ならコンパクション
3. 難しい設計・実装：`astra_light`
4. 簡単な実装：`luna_max`

ルーターはこの判断を補助します。

```bash
node scripts/route-task.mjs --phase source_analysis --task "既存ソースとの関係と変更箇所を特定する"
node scripts/route-task.mjs --phase implementation --task "難しい実装を行う"
node scripts/route-task.mjs --phase implementation --task "小さな文言修正を実装する"
```

出力された `codex_profile` を `codex --profile <name>` に渡します。ChatGPT Workの画面上のモデル切り替えをスクリプトが強制するものではありません。

## 明示対象repoへの同期

同期対象は `.github/sync-targets.json` の許可リストです。現在は次の2種類を想定します。

- `dev-template`：新規repoへ配るテンプレートの共通ブロックを更新する
- Cloud Agentで共通ブロックが必要な既存repo：必要なrepoだけ登録する

対象repoに対して同期されるのは、既存のルート `AGENTS.md` と共存する管理ブロックだけです。既存本文と配下の `AGENTS.md` は変更しません。

ローカルの兄弟repoへ適用する場合：

```bash
node scripts/sync-agents.mjs --target ../target-repository
node scripts/sync-agents.mjs --target ../target-repository --check
```

`--check` は変更が必要なら終了コード1になります。

旧方式で作られた対象repo内の `.codex/mac-enabler/` スナップショットは、プロジェクト固有の設定ではないため、未マージの同期PRは閉じ、マージ済みのものだけ対象repo側で削除PRを作ります。既存のプロジェクト固有 `AGENTS.md` 本文、docs、scripts、CIは削除しません。

## 自動同期

`mac-enabler`の`main`へ共通ブロックをマージすると、`.github/sync-targets.json`に明示された対象repoへ更新PRを作成します。

Workflowは次を行います。

1. 対象repoの指定ベースブランチをcloneする
2. ルート `AGENTS.md` の管理ブロックだけを更新する
3. 指定された同期ブランチへpushする
4. 既存PRがあれば更新し、なければ新規PRを作る

モデル設定やプロジェクト固有のファイルは変更しません。対象repoを増やす場合は、Cloud Agentなどでrepo内の共通ブロックが必要かを確認してから `.github/sync-targets.json` に登録します。

Workflowには対象repoへpushとPR作成ができる `MAC_ENABLER_SYNC_TOKEN` Repository secret が必要です。未設定の状態は同期成功とは扱いません。

## 通常の作業順

1. 対象リポジトリの `AGENTS.md`、Issue／PR、設計の正本を読む
2. Lunaで既存ソースとの関係、変更箇所、影響範囲を特定する
3. 変更範囲と受入条件を決め、必要ならコンパクション用の引き継ぎを保存する
4. コンパクション後に実装難易度を再判定する
5. 難しい設計・実装はAstra、簡単な実装はLunaで行う
6. 変更範囲を満たす最小の検証を行う
7. 未実行の検証と理由をIssue／PRへ残す

## Codex Remote / スマホ運用

Mac上でCodexを起動し、Codexアプリ側でRemoteを有効化してChatGPTモバイルアプリとQRペアリングします。スマホ側は、スレッド開始・継続、方向修正、承認、diff・terminal・test結果の確認に使います。

Macは起動・オンライン・Codex実行状態である必要があります。詳細は `docs/codex-remote.md` を参照してください。

## 検証

```bash
npm test
npm run validate
npm run doctor
```
