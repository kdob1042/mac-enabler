# Cursor／Codexの併用

端末設定は[README](../README.md)、repoへの配布は[同期](integration.md)、再開記録は[引き継ぎ](compact-protocol.md)を参照する。この文書は担当交代とCloud環境の境界だけを扱い、各repoへ配布しない。

## 担当を交代する

- 同一Issueの実装担当は一つ。既存の着手・担当取得・Draft PRの仕組みを使い、別々の自動起動を同じIssueへ重ねない。担当宣言だけを排他ロックとみなさない。
- 独立Issueは別作業ツリーで並列化する。共有ファイル・スキーマの変更は順序を決める。
- 交代時は前担当を停止し、前担当・次担当と停止確認を引き継ぎ記録へ追加する。未push成果物も渡す。
- 受け手は最新のIssue／PRとhead SHAを照合して再開する。確定した設計判断は対象repoへ保存する。

モデル設定、Skill、認証、Secrets、会話、課金枠はホスト間で共有されたと仮定しない。資格情報を記録へ入れない。軽微な変更に毎回の分類・計画書・交代手順を課さない。

## Cloud Agentの環境

`npm run cursor:setup` は端末のCLI設定だけを導入する。Projectsのcoordinator、Cloud環境、購読、ログインはCursor側で別途設定する。

| 対象 | 設定場所 |
| --- | --- |
| GitHub接続・repo権限・利用プラン | Cursorアカウント |
| 依存導入・起動・複数repo | 対象repoの `.cursor/environment.json` または保存済みCloud環境 |
| Cloud固有のテスト・受入 | 対象repoのAGENTS・既存scripts・CI |
| 必要なテスト／監査hook | 対象repoの `.cursor/hooks.json` |
| PR・CI・Slack・スケジュールの購読 | Project側 |
| SecretsとOS制約 | 実行するCloud環境 |

Cloud Agentはローカルの `~/.cursor/`・認証・ユーザー設定を読まない。CodexのTOMLをCursorへコピーしない。共通Skillの読込みは実環境で確認する。

このrepoに別の配布基盤、スケジューラー、consumer用checker／CIを増やさない。旧スナップショットや独自Skillの削除は所有者・参照確認後に別PRで扱う。併用規則の配布テストは `test/cursor-codex.test.mjs` に置く。

端末導入・Cloud準備・実際の担当交代は、それぞれ実施結果を記録する。規則を書いただけで実運用を検証済みとしない。

公式資料：[Projects](https://cursor.com/docs/agent/projects)、[環境設定](https://cursor.com/docs/cloud-agent/setup)、[Cloud Agents](https://cursor.com/docs/cloud-agent)。
