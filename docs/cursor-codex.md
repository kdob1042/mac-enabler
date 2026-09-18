# Cursor／Codex併用の入口

端末固有の手順を混ぜないため、マニュアルを分けて管理する。

- 共通のIssue／PR、同期境界、引き継ぎ：[agent-workflow.md](agent-workflow.md)
- Codexのプロフィール、ルーティング、端末設定：[codex.md](codex.md)
- CursorのCLI、Projects、Cloud Agents、hooks：[cursor.md](cursor.md)

## 結論

CodexとCursorでマニュアルを分けるのが適切である。共通化するのは、正本、ブランチ→PR→mainの流れ、担当、引き継ぎ、検証、資格情報を保存しない境界だけにする。
Codexの `~/.codex/` とCursorの `~/.cursor/` は別の端末設定であり、どちらかをもう一方へコピーしない。

## 現在コード化されている入口

```bash
npm run codex:setup -- --install
npm run cursor:setup -- --install
npm run cursor:project -- --install \
  --target ../target-repository \
  --install-command "npm ci" \
  --test-command "npm test"
```

最後のコマンドは、対象repoで明示したCloud環境とAGENTS管理ブロックだけを生成する。
Cursor Projectsのアカウント接続、Secrets、coordinator、購読、レビューは手動で設定する。

## 変更履歴上の位置づけ

PR #3でCodexの端末設定と最小AGENTS同期を確定し、PR #4でCursor CLI入口とProjects／Cloud Agentの境界を追加した。
以後も、共通運用を理由に端末設定・Skill・設定検査用CIを各repoへ配布しない。
