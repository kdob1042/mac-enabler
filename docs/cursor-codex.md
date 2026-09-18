# Cursor / Codex併用 — 最小同期方針の上に追加する

## 基準

PR #3の端末設定／repo指示の分離と最小同期方針を基準にする。
併用のために別の設定配布基盤・検査Workflow・スケジューラーを追加しない。
現在の管理境界は `../README.md`、配布方法は `integration.md`、
引き継ぎの基本形式は `compact-protocol.md` を参照する。
この文書はmac-enabler内の案内であり、各repoへ配布しない。

## 役割

| 範囲 | 管理方法 |
| --- | --- |
| Codex本体設定 | PR #3の `runtime/` と `scripts/install-codex-profiles.mjs` を利用。ユーザー領域へ導入し、各repoへ配らない |
| Cursor CLI設定 | `runtime/cursor/cli-config.json` を `npm run cursor:setup` で端末の `~/.cursor/cli-config.json` へ導入。未管理の設定・認証・履歴は保持する |
| Cursor IDE／Cloud／Bot設定 | Cursor側で別管理。CodexのTOML・プロフィールをそのままコピーしない |
| 成熟した共通Skill | 各ホストのユーザー領域またはプラグインで管理。読込・クラウド利用可否は実環境で確認し、未確認の自動共有に依存しない |
| Cloud Agentに必要な最低限の規則 | 許可リスト対象repoのルートAGENTS.md管理ブロックのみ。Skillの読込を前提にせず、この短い規則で作業を開始できる形にする |
| プロジェクト固有の設計・準備・検証 | 対象repoの既存docs・scripts・CIをそのまま正本にする |
| 現在の作業状態 | GitHub Issue／PR。各ツールの会話だけを正本にしない |
| 新規repoのIssue／PR／Project自動化 | dev-templateを利用。既存repoへの設定一括コピーと混同しない |

## 端末セットアップ

mac-enablerをclone後、CodexとCursorの端末側設定を同じ入口から確認・導入できる。

```bash
npm run codex:setup -- --install
npm run cursor:setup -- --install
```

Cursor用スクリプトが管理するのは公式CLIの `cli-config.json` だけで、モデル選択・ログイン・IDE設定・Cloud Agent／Grok Bot設定は自動設定しない。
既存ファイルは未管理フィールドを保持し、更新には `--force`、差分確認には `--check` を使う。

## 併用時に追加する最小規則

同一Issueの実装担当は1つ。既存の開始・担当取得・Draft PRの仕組みを使う。
独立Issueは別作業ツリーで並列化できる。共有ファイルやスキーマの変更は順序を決める。
担当宣言だけでは原子的な排他ロックにならないので、別々の自動起動経路を同じIssueへ重ねない。

交代が必要になった時だけ、既存の引き継ぎ記録へ次を追加する。

- 前担当と次担当、前担当の停止確認、対象Issue／PR
- 現在のhead SHAと最後に検証したSHA、未push変更や引き継げていない成果物
- 検証結果・未実行項目と理由、残件、具体的な次の一手

受け手は最新のIssue／PR・head SHAを確認してから再開する。確定した設計判断はrepoへ残す。
モデル、認証、Secrets、課金枠、会話履歴がホスト間で共有されたと仮定しない。
規則の共有は認証・課金・権限の同期ではない。資格情報の値をrepoや引き継ぎへ保存しない。
軽微な作業に毎回の分類・計画書・引き継ぎ作成を義務付けず、PR #3の任意工程を維持する。

## Cursor Projects／Cloud Agentsとの関係

今回のPR #4は、端末のCursor CLI設定とCursor／Codex共通のrepo入口までを整える。Cursor Projectsのcoordinator、Cloud Agentsの環境、購読（PR／CI／Slack／スケジュール）はCursor側の機能であり、`npm run cursor:setup`では設定しない。

自律開発まで進めるには、対象repoまたはCursor側のCloud環境で次を別途整える。

- CursorアカウントでGitHubを接続し、対象repoへのread/write権限と有料プランを用意する
- `.cursor/environment.json` または保存済みCloud環境に、依存インストール、起動コマンド、必要な複数repoを定義する
- 対象repoの `AGENTS.md` に、Cloud専用の起動・テスト・受入条件を記述する
- 必要に応じて `.cursor/hooks.json` に、テスト・監査・停止時の検査を追加する
- Projectの購読でPR、CI、Slack、スケジュールをcoordinatorへ接続する

Cloud Agentはローカル端末の `~/.cursor/`、ローカルの認証、ユーザー設定を読みません。SecretsはCursor側のCloud Agent環境で管理します。したがって、Projects対応の環境設定は各プロジェクトrepoまたは `dev-template` 側で管理し、`mac-enabler`の端末共通設定へ混ぜません。

公式：[Projects](https://cursor.com/docs/agent/projects)、[Cloud Environment Setup](https://cursor.com/docs/cloud-agent/setup)、[Cloud Agents](https://cursor.com/docs/cloud-agent)。
## ToDoと実装境界

| 項目 | 対応 |
| --- | --- |
| 中央の管理境界・端末プロフィール・最小repo同期 | PR #3。併用側から同期対象・権限・runtimeを書き換えない |
| 併用時の担当・引き継ぎ | 短い既存AGENTS管理ブロックに追記する |
| 配布範囲の回帰検査 | mac-enablerの `test/cursor-codex.test.mjs` で実施。consumerへの検査スクリプトやCI配布は不要 |
| 個人設定・必要なSkill・各サービスの認証と課金上限 | 各ホストで一度設定・確認。repoへコピーしない。今回の変更では未実施 |
| クラウド環境 | 既存の準備・検証スクリプトを再利用し、SecretsとOS制約は各環境で確認。今回の変更では未実施 |
| 小さなIssueで往復引き継ぎ | 最小ブロック配布後にCursor→Codex／逆方向を確認。今回の変更では未実施 |

## PR #4旧案から取り下げたもの

`.codex/mac-enabler/`の設定スナップショット、共通Skillの各repoへの配布、
manifest v2、配布先checkerと専用CIを追加する案は撤回した。
PR #3のgit addや監視パスをこれらへ拡張する必要も、配布のためのWorkflows write権限追加もない。
既存repoに残る旧ファイルや独自Skillはこの変更で削除しない。削除が必要な場合は別途所有者・参照を確認する。

## 統合順序

PR #3はmainへマージ済み。PR #4は現行mainをbaseにし、PR #3のCodex差分を重複して取り込まない。
PR作成、CI成功、マージ、各repoへの配布、ユーザー端末への導入はそれぞれ別の状態として報告する。
