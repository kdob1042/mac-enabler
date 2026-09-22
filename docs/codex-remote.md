# Codex Remote / 自走運用

## 目的

Macを実行母艦にし、GitHubを永続的な作業状態の正本にし、スマートフォンからCodexの進捗確認・方向修正・承認を行える状態を作る。

## 初回セットアップ

```bash
git clone git@github.com:kdob1042/mac-enabler.git
cd mac-enabler
npm run mac:bootstrap -- --install
npm run doctor
```

既存の同名Codexプロフィールがあり、mac-enabler管理値へ置き換える場合だけ次を使う。

```bash
npm run mac:bootstrap -- --install --force
```

置換前のプロフィールと既存のユーザー `AGENTS.md` はバックアップされる。

## 何が入るか

`~/.codex/` には次だけを導入する。

- `luna_max.config.toml`
- `astra_light.config.toml`
- `AGENTS.md` 内の `MAC-ENABLER-USER` 管理ブロック

認証情報、履歴、ログ、キャッシュ、既存 `config.toml` 全体は上書きしない。

2つのプロフィールは共通して以下を持つ。

- `approval_policy = "on-request"`
- `sandbox_mode = "workspace-write"`
- `approvals_reviewer = "auto_review"`
- workspace-write内のネットワークアクセス有効化

これにより通常のworkspace境界は維持しつつ、日常的な承認待ちは自動レビューへ寄せる。

## 起動

通常作業：

```bash
codex --profile luna_max
```

難しい設計・実装：

```bash
codex --profile astra_light
```

モデル切替は外側から別プロフィールでCodexを起動する。実行中プロセス自身がプロフィールを後付け変更する前提にはしない。

## スマートフォンからのRemote

Remoteはリポジトリ設定ではなく、CodexアプリとChatGPTモバイルアプリのペアリング機能。

1. MacでCodexアプリを最新版にする
2. Codex側でRemoteを有効にする
3. 表示されたQRコードをChatGPTモバイルアプリからペアリングする
4. Macを起動・オンライン・Codex実行状態に保つ
5. スマートフォンのRemoteからスレッド開始／継続、質問への回答、方向修正、承認、diff・terminal・test結果確認を行う

Remoteのアカウント状態やQRペアリングは `mac-enabler` から自動変更しない。

## 長時間タスクを止めにくくするルール

ユーザー `AGENTS.md` に次の方針を配る。

- 安全で可逆な仮定なら明示して先へ進む
- 解析だけで止まらず、可能なら実装・検証まで進む
- 実機確認だけが残った場合はIssue/PRへ残し、独立してできる作業を継続する
- コンパクション前にIssue/PRへ状態を保存する
- 復帰後は保存済み状態から再開する
- main merge、production deploy、credential変更など不可逆操作は明示承認を待つ

## GitHubを作業状態の正本にする

長時間作業では会話だけを正本にしない。

Issue/PRへ最低限次を残す。

- goal / acceptance criteria
- branch / PR
- head SHA
- 実施済み検証
- 未実施検証と理由
- blocker
- next action

Codex Remoteが一時的に切れても、Mac側または次セッションでここから再開できる。

## 復旧

状態確認：

```bash
npm run doctor
npm run mac:bootstrap -- --check
```

プロフィールまたは共通AGENTSが古ければ：

```bash
git pull
npm run mac:bootstrap -- --install --force
```

Codex自体やRemoteが落ちている場合、mac-enablerはOSレベルの遠隔ログインを代替しない。必要になった時点でTailscale/SSHを非常用経路として追加する。
