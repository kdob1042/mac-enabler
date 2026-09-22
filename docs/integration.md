# 共通指示の同期

管理範囲は[README](../README.md#何をどこで管理するか)。端末セットアップは同書に集約する。

## ローカルの対象repoへ適用

```bash
node scripts/sync-agents.mjs --target ../target-repository --check
node scripts/sync-agents.mjs --target ../target-repository
```

`--check`は読取りだけ。差分があれば終了コード1を返す。適用時はルートAGENTSの `MAC-ENABLER` 管理ブロックを追加・置換し、既存本文と配下のAGENTSは保持する。プロジェクト固有の規則を共通側へ移さない。

## GitHubへの自動同期

`.github/sync-targets.json` が同期先・base・作業ブランチの正本。mainへ共通ブロックをマージすると、許可リストの各repoで「base取得→管理ブロック更新→同期ブランチpush→PR作成／更新」を行う。

- 対象repoへのpush・PR作成権限を持つ `MAC_ENABLER_SYNC_TOKEN` Repository secretが必要。未設定・失敗を同期済みと扱わない。
- 追加先はCloud Agent等が共通ブロックを必要とするrepoに限定する。`dev-template`は新規repo用テンプレートとして使う。
- 端末設定、モデル値、承認、sandbox、共通Skill、docs、scripts、CIは配布しない。`.codex/mac-enabler/` のスナップショットも作らない。
- 旧方式の未マージ同期PRは閉じる。既に取り込んだ旧スナップショットは所有者と参照を確認し、対象repoの削除PRで整理する。プロジェクト固有ファイルは保持する。

Cloud Agentは対象repo自身のAGENTS・準備・検証を読む。ローカルの `~/.codex/`、`~/.cursor/` や兄弟repoを前提にしない。共通ブロックを読むために中央設定の全文を取得させない。

PR作成、CI成功、マージ、同期先への配布、端末への導入は別々に確認する。
