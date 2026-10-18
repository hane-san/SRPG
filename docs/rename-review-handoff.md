# SRPG改名準備PRの独立レビュー引継ぎ

対象は [PR #13](https://github.com/hane-san/SRPG/pull/13) / [Issue #12](https://github.com/hane-san/SRPG/issues/12) だけ。
実装担当とは別担当・別セッションで行う。実装者の再確認は独立レビューに数えない。
ARPGのレビューと並行できるが、対象repo・チェックアウト・報告を混ぜない。

次の依頼を、GitHubへアクセスできる別セッションのCodexまたはClaude Code/Sonnetなどへ渡す。

```text
hane-san/SRPG のPR #13を独立レビューしてください。まず最新mainとPRの現在のhead SHAを取得し、対象SHAを記録してください。
AGENTS.md、docs/DEVELOPMENT.md、docs/DESIGN.md、docs/DECISIONS.md、docs/QA.md、Issue #12、PR本文、docs/rename-preparation.mdを読み、最新mainとの差分を確認してください。
表示正本・同期スクリプト・キャッシュ更新と既存起動の整合、manifestのname/short_nameとstart_url/scope/idの分離、既存5保存キーと内部IDの保全、旧/新サブパスの相対URLを重点確認してください。
既存CIの定義とジョブ名を保ち、ゲームの戦闘・入力・保存形式に意図しない差分がないことを確認してください。
可能な範囲でnpm run checkとnpm run test:browserを実行し、環境・成功/失敗/未実行を記録してください。サーバーとPlaywrightの準備はDEVELOPMENTに従ってください。
同一originのlocalStorage検証を、iPhoneのホーム画面アプリで保存が共有できる証明としないでください。旧Pagesの自動転送も仮定しないでください。
指摘は重要度、ファイル/行、再現条件、期待/実際、修正方針を添えて報告してください。問題が見つからなければ、その範囲と残るリスクを明記してください。
PASS/WARN/BLOCK、対象SHA、実行済み・未検証、人間の試遊項目、Opus重点監査の要否を報告してください。これらの報告語をGitHub必須チェックやマージ承認と混同しないでください。
今回はレビュー結果を報告するところまでです。コード修正、改名、表示名切替、Settings変更、main push、PRマージ、自動マージは行わないでください。
```

指摘は実装側で修正し、CI・レビュー対象SHAを更新する。レビュー中にPRのheadが変わった場合は再確認する。
mediumの独立レビューと人間の試遊・承認が完了するまで準備PRをマージしない。
将来のiPhone実機・実Rename・新Pages・ホーム画面再登録は [移行手順](rename-preparation.md) の別工程として残す。
