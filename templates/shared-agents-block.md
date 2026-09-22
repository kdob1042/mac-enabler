<!-- MAC-ENABLER:BEGIN -->
## Shared agent workflow (Cursor / Codex)

`kdob1042/mac-enabler`の管理ブロック。直接編集せず、中央を更新して同期する。

- このrepoのAGENTS・設計・scripts・CIを正本とする。固有の事実・ブランチ・受入条件は本ブロックより優先し、兄弟repoの規則を推測で適用しない。保護ブランチへ直接pushしない。
- 設計・スキーマ・デプロイ・公開契約の変更前に該当の正本と受入条件を読む。必要な検証を行い、未実行項目と理由をIssue／PRへ残す。
- 同一Issueの実装担当は一つ。既存の着手手順と最新PRを確認する。並列作業は独立Issue・別作業ツリーに分け、交代時は前担当の停止を確認する。
- 圧縮・交代前に目標、制約、正本、担当、ブランチ／PR、head SHA、検証済みSHA、未push変更、検証結果、残件、未解決事項、次の一手をIssue／PR等の永続記録へ保存する。
- 再開時は適用AGENTS・最新記録・head SHAを照合し、次の一手から進める。
- モデル設定・Skill・認証・Secrets・会話履歴のホスト間共有を仮定しない。資格情報をrepoや引き継ぎへ含めない。

<!-- MAC-ENABLER:END -->
