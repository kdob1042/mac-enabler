# エージェントの入口

共通運用と端末設定を管理する。プロジェクト固有の設計・ブランチ・テストは対象repoが正本。

[README](README.md)で目的を選び、該当する文書と実装だけを読む。

| 変更対象 | 正本・入口 |
| --- | --- |
| モデル選択 | `config/model-routing.json`、`scripts/route-task.mjs` |
| 作業工程・引き継ぎ項目 | `config/workflow.json`、[引き継ぎ](docs/compact-protocol.md) |
| Codex／Cursorの端末設定 | `runtime/`、`scripts/setup-*.mjs` |
| repoへの共通指示の配布 | `templates/shared-agents-block.md`、[同期](docs/integration.md) |
| 複数ホストの担当交代 | [併用](docs/cursor-codex.md) |

- 作業ブランチ→PRで変更する。mainへ直接pushしない。変更後は `npm test` と `npm run validate`。
- 端末設定は `npm run codex:setup` / `npm run cursor:setup` を使う。認証・履歴・キャッシュと未管理設定を直接上書きしない。
- repoへ配るのは短い管理ブロックだけ。`scripts/sync-agents.mjs`を使い、既存AGENTS本文を保持する。端末設定・共通Skill・検査CIのコピーや同期対象の拡大はしない。
- ルーターは選択候補を返す。ホストのモデル変更・コンパクション・認証共有が実行されたと仮定しない。
- コンパクション・交代前にIssue／PR等へ状態を保存する。詳細は引き継ぎ文書に集約し、プロジェクト仕様をここへ転載しない。
