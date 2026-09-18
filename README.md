# mac-enabler

複数のGitHubリポジトリを、Codex・ChatGPT Work・Cloud Agentで一貫した手順に乗せるための共通運用レイヤーです。

これはプロジェクトの生成元ではありません。プロジェクト固有のコードや設計は各リポジトリに残し、ここでは次だけを共通化します。

- 作業種別からモデル能力を選ぶルーティングポリシー
- Issue／PRを正本にした作業フェーズ
- `compact`／コンパクション前後の引き継ぎ
- 既存の `AGENTS.md` と共存するための管理ブロック
- ローカルの兄弟リポジトリへ適用する同期スクリプト
- 対象リポジトリへ更新PRを作る自動同期

## 重要な制約

`mac-enabler` をGitHubに置いただけでは、他のリポジトリのCodexやCloud Agentが自動的にこのリポジトリを読み込むことはありません。

そのため、対象リポジトリへ次のスナップショットをコミットします。

- ルート `AGENTS.md` の `MAC-ENABLER` 管理ブロック
- `.codex/mac-enabler/model-routing.json`
- `.codex/mac-enabler/workflow.json`
- `.codex/mac-enabler/compact-protocol.md`

ローカル環境では、兄弟リポジトリを指定して同期できます。Cloud Agentでは兄弟ディレクトリを前提にせず、同期結果を対象リポジトリ自身へコミットしてください。

## 責務分担

- `mac-enabler`：共通Codex設定、管理ブロック、同期スクリプト、同期Workflowの正本
- `dev-template`：Issue／PR／Project自動化を含む新規リポジトリ用テンプレート
- 各プロジェクトrepo：プロジェクト固有の設計、ブランチ、テスト、データの正本

`dev-template`のGitHub自動化ロジックを`mac-enabler`へ重複コピーせず、`dev-template`自体もmac-enablerの同期対象として管理します。

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

## 使い方

### 1. ルートを決める

タスクをそのまま実装に投げず、まずルーターへ渡します。

```bash
node scripts/route-task.mjs --task "設計を見直して実装方針を決める"
node scripts/route-task.mjs --json --task "Issueの状態を確認して一覧化する"
```

出力される `profile` は、利用するモデル能力の目安です。

- `fast`: 分類、抽出、単純な整形、状態確認
- `balanced`: 通常の実装、文書更新、通常の検証
- `strong`: 複雑な実装、レビュー、障害対応、データ移行
- `max`: アーキテクチャ、正本設計、重大な破壊リスクを伴う判断

このスクリプトは現在の会話のモデルを強制変更しません。API／CLI／SDKなど呼び出し側でモデルを切り替える場合は、`binding_env` を使ってプロファイルをモデルIDへ対応付けます。ChatGPT WorkやCloud Agentで切り替えができない場合でも、作業開始時に選択されたプロファイルを明示します。

### 2. 対象リポジトリへ同期する

兄弟ディレクトリが次のようになっている場合：

```text
github/
├── mac-enabler/
└── manga-mac/
```

```bash
node scripts/sync-agents.mjs --target ../manga-mac
```

変更せずに差分だけ確認するには：

```bash
node scripts/sync-agents.mjs --target ../manga-mac --check
```

同期スクリプトは、対象リポジトリの既存 `AGENTS.md` を保持したまま管理ブロックだけを追加・更新します。配下の `AGENTS.md` は削除・上書きしません。

### 3. 自動同期

`main`へ共通設定をマージすると、`.github/sync-targets.json`に登録された対象repoへ同期Workflowが走ります。

Workflowは次を行います。

1. 対象repoの指定ベースブランチをcloneする
2. `sync-agents.mjs`で共通ブロックとスナップショットを更新する
3. `chore/sync-mac-enabler`ブランチへpushする
4. 既存PRがあれば更新し、なければ新規PRを作る

対象repoの一覧とベースブランチは`.github/sync-targets.json`で中央管理します。現在は`dev-template`と`manga-mac`を登録しています。

Workflowには、対象repoへpushとPR作成ができる`MAC_ENABLER_SYNC_TOKEN`というRepository secretが必要です。private repoを含める場合は、両方の対象repoへアクセスできるFine-grained tokenを登録します。Tokenが未登録の状態ではWorkflowは意図的に失敗し、同期済みとは扱いません。

手動確認はGitHub Actionsの`Sync mac-enabler consumers`から、対象repo指定または`dry_run`で実行できます。

### 4. 通常の作業順

1. タスクを分類し、ルートとモデルプロファイルを決める
2. Issue／PR、対象ブランチ、受入条件を確認する
3. 対象リポジトリの `AGENTS.md` と設計の正本を読む
4. 小さな作業単位で実装する
5. 必要最小限の検証を実行する
6. Issue／PRへ検証結果と残件を書く
7. コンパクションまたは引き継ぎの前に、引き継ぎパケットを保存する

## AGENTS.mdの責務分離

- 共通管理ブロック：作業手順、ルーティング、コンパクション、引き継ぎ
- 対象リポジトリのルート `AGENTS.md`：プロジェクト固有の設計・ブランチ・テスト・正本
- 配下の `AGENTS.md`：ディレクトリ固有の制約
- Issue／PR：現在の作業状態、受入条件、検証結果、残件

同じ仕様を複数箇所へ全文転載しません。共通ルールとプロジェクトルールが衝突した場合、プロジェクトの事実・ブランチ・検証条件は対象リポジトリ側を優先し、解決できない場合は推測で進めず差分を報告します。

## 検証

```bash
npm test
npm run validate
```
