# Codex／Cursor共通運用

この文書は、CodexとCursorで共通する作業境界だけを定める。端末固有の手順は
[`codex.md`](codex.md) と [`cursor.md`](cursor.md) に分けている。

## 正本と同期範囲

| 対象 | 正本 | 自動同期 |
| --- | --- | --- |
| Codexのプロフィール・承認・sandbox | 利用端末の `~/.codex/` | しない |
| Cursor CLIの端末設定 | 利用端末の `~/.cursor/cli-config.json` | しない |
| Cursor Cloudの環境・hooks | 各プロジェクトの `.cursor/` と Cursor Cloud | 端末からは同期しない |
| プロジェクト固有の設計・コマンド・テスト | 対象repoの `AGENTS.md`、docs、scripts、CI | 対象repoで管理 |
| 共通の短い運用ブロック | 明示対象repoのルート `AGENTS.md` | `sync-agents.mjs` の許可対象だけ |
| Issue／PR／引き継ぎ | GitHubのIssue／PR | 会話だけを正本にしない |

端末設定、共通Skill、認証、Secrets、会話履歴を別ホストへコピーしない。`mac-enabler`
から対象repoへ配るのは、Cloud Agentなどがrepo内で読む必要がある短いAGENTS管理ブロックだけである。
プロジェクト固有の設定を中央のスナップショットで上書きしない。

## 標準の作業順

1. 対象repoの `AGENTS.md`、設計の正本、Issue／PR、受入条件を読む。
2. Issueごとに担当を1つに決め、ブランチを切る。独立Issueだけを別作業ツリーで並列化する。
3. 端末設定はCodexまたはCursorの固有マニュアルに従って確認する。
4. 変更範囲に必要な最小検証を実行する。
5. 未実行の検証と理由をPRへ残し、レビュー後に `main` へ統合する。

保護ブランチへ直接pushしない。担当宣言だけでは排他ロックにならないため、同じIssueへ複数の自動起動経路を重ねない。

## 引き継ぎ・コンパクション

必要な場合だけIssueまたはPRへ次を保存する。

- 目的、制約、設計の正本、対象Issue／PR、担当
- ブランチ名、現在のhead SHA、最後に検証したSHA、未push変更
- 検証結果、未実行項目と理由、残件、次の具体的な一手

受け手は最新のIssue／PRとhead SHAを確認してから再開する。軽微な作業に毎回の計画書や引き継ぎを強制しない。

## コード化できる範囲と手動範囲

### コード化するもの

- `npm run codex:setup`：端末側Codexプロフィールの導入・確認
- `npm run cursor:setup`：端末側Cursor CLI設定の導入・確認
- `npm run cursor:project`：明示した対象repoへCloud環境とAGENTS管理ブロックを生成・検査
- `npm run sync`：許可対象repoのルートAGENTS管理ブロックだけを更新
- `npm run route`：作業種別から推奨Codexプロフィールを出力

いずれも既存ファイルを勝手に全置換しない。既存の管理対象を置き換える場合は `--force` とバックアップを使う。

### コード化しないもの

- Cursor／GitHubのログイン、OAuth接続、read/write権限、料金プラン
- Cursor Projectsの作成、coordinatorモデルの選択、PR／CI／Slack／スケジュール購読
- Cloud AgentのSecrets、環境変数、ネットワーク許可、DockerやOS固有サービス
- 実行中のCodex／Cursorのモデル切り替え、会話履歴、個人Skillの共有
- 生成された変更の設計妥当性、受入判断、mainへのマージ

これらは各サービスの画面と対象repoの所有者が確認する。資格情報の値をrepo、ログ、Issue、PRへ保存しない。
