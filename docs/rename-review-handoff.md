# SRPG改名準備の統合後レビュー引継ぎ

対象は統合済み [PR #13](https://github.com/hane-san/SRPG-01-FEstyle/pull/13) / [Issue #12](https://github.com/hane-san/SRPG-01-FEstyle/issues/12) と、現在参照を修正する [Issue #15](https://github.com/hane-san/SRPG-01-FEstyle/issues/15) のPR。
人間の承認・統合は確認済み。GitHub上では独立レビュー記録を確認できず、外部での実施有無も未確認のため、統合後レビューとして依頼する。
実装担当とは別担当・別セッションで行う。実装者の再確認は独立レビューに数えない。
ARPGのレビューと並行できるが、対象repo・チェックアウト・報告を混ぜない。

次の依頼を、GitHubへアクセスできる別セッションのCodexまたはClaude Code/Sonnetなどへ渡す。

```text
hane-san/SRPG-01-FEstyle の統合済みPR #13と、Issue #15の現在参照修正PRを独立レビューしてください。まず現在名・最新main・各PRのhead SHAを取得し、対象SHAを記録してください。
AGENTS.md、docs/DEVELOPMENT.md、docs/DESIGN.md、docs/DECISIONS.md、docs/QA.md、Issue #12/#15、PR本文、docs/rename-preparation.mdを読んでください。PR #13は基盤統合後main 31b6cd8c999ace1a188914378c161ee2e3e18fdb から統合後main 206a62b4053382c70a6fe69b764fb6e0e1bb9853 までを確認し、現在参照の修正PRは別のbase/headで確認してください。現在のmainには出撃UI等のPR #7も統合済みです。BGM42曲化のPR #9は未統合で取り込まないでください。
表示正本・同期スクリプト・キャッシュ更新と既存起動の整合、manifestのname/short_nameとstart_url/scope/idの分離、既存5保存キーと内部IDの保全、旧/新サブパスの相対URLを重点確認してください。
既存CIの定義とジョブ名を保ち、ゲームの戦闘・入力・保存形式に意図しない差分がないことを確認してください。現在パスは /SRPG-01-FEstyle/、旧 /SRPG/ は404、hane-no-*は旧案です。ゲーム内のGitHubリンクも現在の正本へ向くことを確認してください。
可能な範囲でnpm run checkとnpm run test:browserを実行し、環境・成功/失敗/未実行を記録してください。サーバーとPlaywrightの準備はDEVELOPMENTに従ってください。
同一originのlocalStorage検証を、iPhoneのホーム画面アプリで保存が共有できる証明としないでください。旧Pagesの自動転送も仮定しないでください。
指摘は重要度、ファイル/行、再現条件、期待/実際、修正方針を添えて報告してください。問題が見つからなければ、その範囲と残るリスクを明記してください。
PASS/WARN/BLOCK、対象SHA、実行済み・未検証、人間の試遊項目、Opus重点監査の要否を報告してください。これらの報告語をGitHub必須チェックやマージ承認と混同しないでください。
今回はレビュー結果を報告するところまでです。コード修正、改名、表示名切替、Settings変更、main push、PRマージ、自動マージは行わないでください。
```

指摘は実装側で修正し、CI・レビュー対象SHAを更新する。レビュー中にPRのheadが変わった場合は再確認する。
準備PR #13は統合済みという事実を保持し、レビューをさかのぼって実施済みと記録しない。問題は別の修正ブランチ/PRへ戻す。
iPhone実機・ホーム画面の保存と再登録、外部AIの対象選択、将来の表示名切替は [移行手順](rename-preparation.md) の別工程として残す。追加Renameは行わない。
