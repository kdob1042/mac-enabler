# Codexマニュアル

Codex固有の端末設定、プロフィール、ルーティングを扱う。CursorのCloud環境やProjectsは
[`cursor.md`](cursor.md) を参照し、共通のIssue／PR運用は [`agent-workflow.md`](agent-workflow.md) を参照する。

## 一発セットアップ

```bash
cd <mac-enabler-dir>
npm run codex:setup -- --install
```

確認だけ行う場合：

```bash
npm run codex:setup -- --check
```

この処理が変更するのは利用端末の `~/.codex/` にある管理プロフィールだけである。認証、履歴、ログ、キャッシュ、既存の `config.toml` 全体は変更しない。
既存プロフィールの置き換えには `--force` を付け、置換前のバックアップを確認する。

## 使うプロフィール

| CLI profile | 用途 |
| --- | --- |
| `luna_max` | 既存ソースの解析、変更箇所の特定、簡単な実装 |
| `astra_light` | 難しい設計・実装、重大なリスクを伴う変更 |

起動時にプロフィールを選ぶ：

```bash
codex --profile luna_max
codex --profile astra_light
```

ルーターは推奨名を出すだけで、すでに起動しているCodexのモデルを後から切り替えない。

```bash
node scripts/route-task.mjs --phase source_analysis --task "既存ソースとの関係を調べる"
node scripts/route-task.mjs --phase implementation --task "難しい設計を実装する"
```

承認、sandbox、サブエージェント上限などの共通デフォルトは、必要な場合だけ
`runtime/base-config.snippet.toml` を利用端末の `~/.codex/config.toml` と照合して手動統合する。
このrepoから既存設定全体へ自動追記しない。

## 手動で残ること

- Codex CLIのインストール、ログイン、利用組織、課金・利用上限
- 起動済みプロセスのモデルや推論量の切り替え
- `config.toml` の個人設定、MCP、秘密情報
- プロジェクト固有の設計・コマンド・テスト

これらをCursorの設定やCloud Agentへコピーできるとは仮定しない。プロジェクトの受入判断とmainへのマージも人間または既存のレビュー手順で行う。

## 通常の導線

1. 対象repoの `AGENTS.md` とIssue／PRを読む。
2. 解析は `luna_max` で行い、必要ならIssue／PRへ状態を保存する。
3. 難しい設計・実装は `astra_light`、小さな実装は `luna_max` で行う。
4. 検証結果と未実行項目をPRへ残す。

Cursorへ引き継ぐ場合も、モデル設定や会話を共有したと考えず、Issue／PRとhead SHAを正本にする。
