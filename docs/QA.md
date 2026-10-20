# 検証手順と限界

対象SHA、環境、コマンド、成功/失敗/未実行と理由、観測結果をPRへ記録する。
同じコマンド名でも現行 `package.json` の内容を確認する。実行済みの範囲だけを証拠にする。

## 現行のチェック

| 確認 | コマンド・対象 | 限界 |
|---|---|---|
| 構文・ルール | Node 22+で `npm run check` | 決定論、HP6、出撃・保存・UIモデル等。実機の操作感を保証しない |
| 方策比較 | `npm run simulate` | 固定方策の例。成功終了は全マップの勝利や最適解を意味しない |
| 現行ブラウザ回帰 | 静的サーバー起動後 `npm run test:browser` | `hp6-browser-check.mjs` と `sound-room-check.mjs`。ChromiumでHP6・出撃・保存・複数画面幅・音楽を検証 |
| 差分 | `git diff --check`、変更範囲の確認 | 既存記録・保存形式・配信パスの意図しない変更を確認 |
| 公開 | main統合後のActionsとPages | 作業PRから公開済みとは言わない |

ブラウザの一時導入・起動方法は [DEVELOPMENT.md](DEVELOPMENT.md)。
旧 `browser-check` / `interaction-check` / `readability-check` 等にはHP6以前の期待値もある。
過去の全スクリプトを現行回帰スイートと称さず、関連テストを選ぶ際に対象版を確認する。
旧検証JSON・設計記録は削除せず、当時の証拠として [DESIGN.md](DESIGN.md) から参照する。

## PR CIと監査

`.github/workflows/check.yml` の `SRPG rules` はpush mainと全PRで実行される。
既存ジョブ `rules` はNode 22の `npm run check`、`browser` はPlaywright 1.57.0 / Chromiumと現行ブラウザ回帰。
今回の導入ではワークフローやジョブ名、権限 `contents: read` を変更しない。
人間が成功したPRの正確なチェック名をRulesetへ登録するまで、必須化されたとはみなさない。
監査のPASS/WARN/BLOCKは別の報告であり、CI結果にも人間の承認にも置換できない。

## 導入前の現状確認（2026-10-18）

- 基準main：`a42c97106ba945f4124bc1b2c7cdb89653c942f0`、v0.8.0。
- ローカルNode 24.19.0：`npm run check` は49件成功。`npm run simulate` は終了0だが固定方策に敗北・timeoutがある。バランス良好の証明とはしない。
- mainの既存Actions：[run 39113335512](https://github.com/hane-san/SRPG/actions/runs/39113335512) は成功。今回のPR結果はPRの対象SHAで別途確認する。
- Pagesはmain / root、mainの `protected` はfalse。管理画面設定はこの導入で変更していない。
- 以前の独立した初期監査結果・ゲーム確定仕様引継ぎMDは未提供。提供マニュアルと最新mainの既存資料・テストを読み、今回の運用導入範囲を確認した。

## 現在名の確認（2026-10-19）

- 現在の正本は `hane-san/SRPG-01-FEstyle`。人間が承認・統合した最新main `46e17724accda307c1ab8ee9ced2da43a45745cd` を基準に検証する。現在の公開URLと旧案の区別は[移行記録](rename-preparation.md#確定した現在地2026-10-19)を参照。
- 既存の移行検査へ現在のrepoパスを追加。過去のパスも回帰用に保持するが、旧案のURLが公開済みという意味ではない。
- main保護のRulesetとチェック名は改名後も維持されている。以前の失敗CI実地確認の記録も保持する。新しいPRの対象SHAとCI結果はPR本文へ記録する。

## 人間の試遊・未検証

- main保護の実地確認（2026-10-18）：[検証専用PR #14](https://github.com/hane-san/SRPG/pull/14) / [CI](https://github.com/hane-san/SRPG/actions/runs/39177205008) で、最新mainが直接の親・競合なし・draftでないPRのrules=failure / browser=success時にGitHubがblockedになることを確認。意図的なNodeテストの失敗をログでも確認し、PRを閉じた。マージを試みずmain SHA不変。独立コード監査・実機試遊の代わりにはしない。

- iPhone Safari実機：縦横画面、城からの出撃、攻撃/待機/取消、HP6、再読込と保存、背景復帰と音の解禁。Chromiumのモバイル画面模擬とは分ける。
- HP6再調整後の3章連戦、初期2隊・一般兵編成の難度と楽しさ。
- 公開版、ホーム画面追加、実機性能と出音。今回の文書整備で検証済みにしない。
- 独立監査・人間承認は担当者が対象SHAと実施結果を記録する。実装担当の自己確認は独立監査として数えない。
- lowの文書のみのPRでは、ゲーム試遊を省く理由と、文書・テンプレートの人間確認をPRへ記録できる。

## Issue #17（2026-10-20）

[固定状況・合否・前後比較](issue17-verification.md)と[結果JSON](issue17-balance-results.json)を追加。`npm run audit:issue17`で出撃込みの同一方策24条件を再計算する。`npm run test:browser`は既存検査に`issue17-browser-check.mjs`の入力境界・4画面幅×6マップ・4種類SE波形を含む。HP・戦闘計算・保存形式を維持。実機試遊は未実施。
