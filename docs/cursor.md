# Cursorマニュアル

Cursor固有のCLI、Projects、Cloud Agentsを扱う。Codexの端末設定は
[`codex.md`](codex.md)、共通のIssue／PR運用は [`agent-workflow.md`](agent-workflow.md) を参照する。

## 端末側CLIの一発セットアップ

```bash
cd <mac-enabler-dir>
npm run cursor:setup -- --install
```

確認だけ行う場合：

```bash
npm run cursor:setup -- --check
```

管理するのは公式CLIの `~/.cursor/cli-config.json` だけで、未管理フィールドと権限項目は保持する。
認証、IDEの個人設定、Cloud Agent、Projects、モデル選択は変更しない。既存の管理値を置き換える場合だけ `--force` を使う。

## 対象repoのCloud環境をコード化する

プロジェクト固有のコマンドを確認したうえで、対象repoを明示して実行する。

```bash
npm run cursor:project -- --install \
  --target ../target-repository \
  --install-command "npm ci" \
  --test-command "npm test" \
  --start-command "npm run dev" \
  --terminal "web=npm run dev"
```

このコマンドが書くのは次の2箇所だけである。

- 対象repoの `.cursor/environment.json`（依存インストール、任意の起動コマンド、永続terminal）
- 対象repoの `AGENTS.md` にある `MAC-ENABLER:CURSOR-CLOUD` 管理ブロック

既存の `AGENTS.md` 本文、`.cursor/hooks.json`、設計書、CI、Secretsは自動で置き換えない。
既存の環境ファイルや管理ブロックを変更する場合は `--force` を付ける。変更前に同じ場所へバックアップを作る。
導入後の検査は読み取り専用で行う。

```bash
npm run cursor:project -- --check --target ../target-repository
```

`--install-command` はCloud Buildごとに再実行されるため冪等にする。Secretsをコマンド文字列へ埋め込まず、Cursor Cloud Secretsまたは環境変数を参照する。
引数なしの `--check` はファイルの存在・形式・管理ブロックを検査する。コマンド値まで照合したい場合は、導入時に渡した `--install-command`、`--test-command`、任意の `--start-command`／`--terminal` を同じ値で指定する。

## Projects／Cloud Agentsで手動設定すること

1. Cursorへログインし、GitHubを接続して対象repoへのread/write権限を確認する。
2. Cursor Projectsで対象repoまたはrepoグループを選び、coordinatorモデルと作業方針を設定する。
3. Cloud Agent環境のBuildを作成し、依存インストールが成功することを確認する。
4. 複数repo、Docker、データベース、外部APIが必要ならCloud環境側で明示的に準備する。
5. 必要なSecrets、環境変数、ネットワーク許可をCursor Cloudの設定画面へ登録する。
6. PR／CI／Slack／スケジュールなどの購読をProject側で有効にする。自動起動しても、同じIssueへ担当を重ねない。
7. 生成PRのテスト、設計、受入条件を確認してからmainへ統合する。

ProjectsのcoordinatorやCloud Agentは、ローカル端末の `~/.cursor/` やローカル認証を読み込まない。Projectの自律性は、repoの環境、AGENTS、Secrets、購読、レビューを揃えた範囲で成立する。

## Hooksを使う場合

`.cursor/hooks.json` はプロジェクトごとの責任で追加する。たとえば `beforeShellExecution` で危険なコマンドを監査したり、`afterFileEdit` でフォーマッタを呼べるが、対象repoの実行環境と受入条件に依存するため、mac-enablerから一律コピーしない。

プロジェクトhooksを追加する場合は、実行スクリプトもrepoへ登録し、Cloud Agentで通ることを検証する。ユーザー領域の `~/.cursor/hooks.json` はCloud Agentから見えない。

## 自動化できない範囲

- Cursorアカウント、GitHub OAuth、料金プラン、Enterprise権限
- Projectsのcoordinator、購読、通知、スケジュール、PR承認設定
- Cloud Secrets、環境変数、ネットワーク、外部サービスのアカウント
- 実行中のCursorモデル変更、IDEの個人設定、会話履歴
- 生成コードの設計妥当性、テストの十分性、PRレビュー、mainへのマージ

公式ドキュメント：[Projects](https://cursor.com/docs/agent/projects)、[Cloud Agents](https://cursor.com/docs/cloud-agent)、[Cloud Environment Setup](https://cursor.com/docs/cloud-agent/setup)、[Hooks](https://cursor.com/docs/hooks)。
