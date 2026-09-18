# 対象リポジトリへの統合

## 責務分担

`mac-enabler`を共通Codex運用設定の中央正本とし、`dev-template`はIssue／PR／Project自動化を含む新規リポジトリ用テンプレートとして残します。

- mac-enabler：共通のルーティング、workflow、compact、AGENTS統合、配布・同期
- dev-template：新規repoへコピーするGitHub自動化、Issueテンプレート、Project運用
- 各プロジェクトrepo：固有の設計、ブランチ、テスト、データ正本

`dev-template`の自動化ロジックを`mac-enabler`へ複製しません。`dev-template`自体をmac-enablerの同期対象に含め、両者を一つの運用体系として更新します。

## ローカル

兄弟リポジトリとして配置します。

```text
github/
├── mac-enabler/
├── dev-template/
├── manga-mac/
├── live-manga/
└── nexus/
```

mac-enablerから対象へ同期します。

```bash
node scripts/sync-agents.mjs --target ../manga-mac
```

同期後、対象リポジトリ側で差分を確認し、対象リポジトリの通常ルールに従ってブランチとPRを作ります。

## 自動同期

`.github/sync-targets.json`に対象repo、ベースブランチ、同期ブランチを登録します。

`mac-enabler`の`main`へ共通設定をマージすると、`.github/workflows/sync-targets.yml`が対象repoごとに次を行います。

1. 対象repoの指定ベースブランチをclone
2. 管理ブロックと`.codex/mac-enabler/`を更新
3. 同期ブランチへpush
4. 既存の同期PRを更新、または新規PRを作成

同期Workflowには`MAC_ENABLER_SYNC_TOKEN` secretが必要です。対象repoのContents writeとPull requests writeが必要で、private repoを含む場合は全対象repoへアクセスできるFine-grained tokenを使います。

## Cloud Agent

Cloud Agentの作業ディレクトリは、ローカルの親ディレクトリや兄弟リポジトリを前提にできません。したがって対象リポジトリへ、次をコミットしておきます。

- ルート `AGENTS.md` の管理ブロック
- `.codex/mac-enabler/` の設定スナップショット
- `dev-template`を使う新規repoでは、テンプレート由来のGitHub自動化

mac-enablerだけを別リポジトリに置き、対象リポジトリから相対パスで参照する方式はCloud Agentでは成立しません。

## 既存AGENTS.mdとの共存

同期スクリプトは、対象ルートの `AGENTS.md` の末尾に管理ブロックを追加します。既に同じブロックがある場合は、そのブロックだけを置換します。

- 既存本文は保持する
- 配下の `AGENTS.md` は触らない
- 共通ルールをプロジェクト仕様へ転載しない
- プロジェクト固有のブランチ・テスト・設計ルールを共通側へ移さない

複数の `AGENTS.md` の優先順位は、Codexが実際にいるディレクトリに近いものを優先し、共通ブロックは手順の補助として扱います。プロジェクト固有の事実と共通手順が矛盾した場合は、推測で統合しません。

## 更新

mac-enablerの設定変更後、各対象リポジトリで同期を実行し、スナップショットの更新をPRにします。同期されていない対象は、古い運用ポリシーで動くため、PR本文にmac-enablerのバージョンを記録します。
