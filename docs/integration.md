# 対象リポジトリへの統合

## 結論

すべてのrepoへ中央設定を同期しません。

- Codex本体の設定、モデルプロファイル、共通Skillは利用端末またはプラグイン側で管理する
- プロジェクト固有の設定は各repoで管理する
- Cloud Agentなどがrepo内で必ず読む必要がある場合だけ、短い `AGENTS.md` 管理ブロックを同期する
- `dev-template` は新規repo用テンプレートなので、共通ブロックの更新対象にする

`mac-enabler`を置いただけでは、別repoのエージェントはその内容を自動的には継承しません。逆に、中央の `model-routing.json`、`workflow.json`、コンパクション文書を各repoへコピーしても、設定の自動適用やモデル切替にはなりません。

## 端末側のCodexセットアップ

端末で `mac-enabler` をcloneしたら、Codexはリポジトリ内のセットアップスクリプトを実行できます。

```bash
npm run codex:setup -- --install
```

このスクリプトが `~/.codex/` に導入するのは `luna_max` と `astra_light` の2プロフィールだけです。既存の `config.toml`、認証、履歴、ログ、キャッシュは変更しません。

通常は `luna_max` で既存ソースを解析して変更箇所を特定し、コンパクション後に難しい設計・実装だけ `astra_light` へ切り替えます。簡単な実装はそのまま `luna_max` で進めます。

ここでいう切り替えは、ユーザーまたは外側のランチャーが `codex --profile luna_max`／`codex --profile astra_light` で新しいCLIプロセスを起動することを指します。実行中のCodexが自分自身のモデルを後から切り替えるものではありません。ルーターは選択方針と `codex_profile` を示し、起動操作はCLI側で行います。

開発対象repoは別にcloneして使います。mac-enablerの兄弟ディレクトリや、中央repoの詳細設定を対象repoから読む必要はありません。

## ローカルrepo

兄弟repoへ共通ブロックを適用する必要がある場合だけ実行します。

```text
github/
├── mac-enabler/
├── dev-template/
├── manga-mac/
└── その他のプロジェクトrepo
```

```bash
node scripts/sync-agents.mjs --target ../manga-mac
```

この操作で更新されるのは対象ルートの `AGENTS.md` にある `MAC-ENABLER` 管理ブロックだけです。

## 自動同期

`.github/sync-targets.json` は、共通ブロックの同期が必要なrepoだけを明示する許可リストです。

Workflowは対象repoごとに次を行います。

1. 指定ベースブランチをclone
2. 既存 `AGENTS.md` を保持したまま管理ブロックを更新
3. 同期ブランチへpush
4. 既存の同期PRを更新、または新規PRを作成

同期されないもの：

- `.codex/mac-enabler/` の設定スナップショット
- モデル名、推論量、承認、sandbox設定
- プロジェクト固有のdocs、scripts、CI
- 配下の `AGENTS.md`

旧方式の同期PRが未マージなら閉じます。旧スナップショットがすでにマージ済みの場合だけ、対象repoで削除PRを作ります。既存のプロジェクト固有ファイルは削除しません。

Workflowには `MAC_ENABLER_SYNC_TOKEN` secret が必要です。対象repoを追加する場合は、Cloud Agent等で共通ブロックが必要かを先に判断します。

## Cloud Agent

Cloud Agentは対象repo自身の `AGENTS.md`、セットアップ設定、docs、scripts、CIを前提にします。ローカル端末の `~/.codex/` やmac-enablerの兄弟ディレクトリを前提にしません。

したがってCloud Agentへ渡すべきものは、プロジェクト固有の作業入口と、必要なら短い共通管理ブロックです。中央repoの詳細設定を毎回読ませる方式は、コンテキストと実行時間を増やすため採用しません。

## 既存AGENTS.mdとの共存

同期スクリプトは対象ルートの `AGENTS.md` の末尾に管理ブロックを追加します。既に同じブロックがあれば、そのブロックだけを置換します。

- 既存本文は保持する
- 配下の `AGENTS.md` は触らない
- 共通ルールをプロジェクト仕様へ全文転載しない
- プロジェクト固有のブランチ、テスト、設計ルールを共通側へ移さない
- 共通ブロックは、プロジェクト固有の事実や受入条件を上書きしない

## 更新

mac-enablerの共通ブロックを変更した場合、許可リストにある対象repoへ同期PRを作ります。対象repoを許可リストへ追加しない限り、そのrepoへは同期されません。
