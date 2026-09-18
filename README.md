# mac-enabler

Codex・ChatGPT Work・Cloud Agentで使う共通運用を、必要な範囲だけ管理するためのリポジトリです。

プロジェクトのコード、設計、ブランチ、テスト、データの正本ではありません。各プロジェクトの正本は、それぞれのリポジトリに残します。

## 管理境界

| 対象 | 正本 | 各リポジトリへの同期 |
| --- | --- | --- |
| Codex本体のモデル・承認・sandbox設定 | 利用端末の `~/.codex/` | しない |
| 個人共通の短いエージェント指示 | 利用端末のユーザー領域 | しない |
| 成熟した共通Skill | Codex／Cursorのユーザー領域またはプラグイン | 原則しない |
| プロジェクト固有の指示・コマンド・検証 | 各リポジトリの `AGENTS.md`、docs、scripts、CI | そのrepoで管理 |
| Cloud Agentが必ず読む最小の共通運用 | 各対象repoのルート `AGENTS.md` の管理ブロック | 明示した対象だけ |
| 新規repo用のIssue／PR／Project自動化 | `dev-template` | テンプレートとして利用 |

`mac-enabler`をGitHubに置いただけで、他のrepoのエージェントが自動的に読み込むことはありません。一方で、すべてのrepoへ中央設定のスナップショットを配る必要もありません。

このrepoから対象repoへ同期するのは、Cloud Agentなどがそのrepo内で自動的に読む必要がある短い `AGENTS.md` 管理ブロックだけです。モデルルーティング、workflow設定、コンパクション文書を `.codex/mac-enabler/` として配布しません。

## 責務分担

- `mac-enabler`：共通運用の設計、短い管理ブロック、任意のルーティング補助、同期スクリプト
- `dev-template`：新規repo向けのIssue／PR／Project自動化テンプレート
- 各プロジェクトrepo：固有の設計、ブランチ、テスト、データ、受入条件
- 利用端末：Codex本体のモデル、推論量、承認、sandbox、サブエージェント上限

`config/model-routing.json` は作業種別と必要能力を整理する補助資料です。現在のChatGPT／Codex画面のモデルを自動で切り替える設定ではありません。毎回の作業で必ず分類することも要求しません。

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
├── scripts/
│   ├── route-task.mjs
│   ├── sync-agents.mjs
│   ├── sync-repositories.mjs
│   └── validate.mjs
├── templates/
│   ├── project-profile.example.json
│   └── shared-agents-block.md
└── test/
```

## 端末側のCodex設定

本体設定は各repoへ同期せず、利用端末の `~/.codex/` に置きます。

- `runtime/base-config.snippet.toml`：`config.toml`へ手動で反映する共通デフォルト
- `runtime/profiles/*.config.toml`：CLIの `--profile` で選ぶモデル・推論量
- `scripts/install-codex-profiles.mjs`：プロフィールだけを `CODEX_HOME`（既定は `~/.codex`）へ導入

既存の `config.toml`、認証、履歴、ログ、キャッシュは自動上書きしません。プロフィールを導入する場合は次を実行します。

```bash
npm run codex:profiles -- --install
```

既存プロフィールを中央正本で置き換える場合だけ `--force` を追加します。置換前にはバックアップを作成します。

## 任意のルーティング補助

必要なときだけ、作業種別から能力プロファイルを確認できます。

```bash
node scripts/route-task.mjs --task "設計を見直して実装方針を決める"
node scripts/route-task.mjs --json --task "Issueの状態を一覧化する"
```

出力は `fast`、`balanced`、`strong`、`max` の能力目安です。実際のモデル選択は利用ホストまたは呼び出し側で行います。

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
2. 変更範囲と受入条件を決める
3. 必要な実装を行う
4. 変更範囲を満たす最小の検証を行う
5. 未実行の検証と理由をIssue／PRへ残す
6. コンパクションまたは引き継ぎの前に、永続的な引き継ぎ記録を保存する

## 検証

```bash
npm test
npm run validate
```
