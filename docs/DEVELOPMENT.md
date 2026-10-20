# 共通の開発手順

GPTのチャット（GitHub接続あり）、Codex、Claude Codeから同じ `hane-san/SRPG-01-FEstyle` を扱う。
共通契約はルートの `AGENTS.md`。Claude Codeは `CLAUDE.md` から同じ契約を読み込む。
この文書とGit履歴で作業を引き継ぐ。チャット履歴や個人の設定ファイルは不要。

## 作業の始め方

1. `git status --short` と `git log -5 --oneline` で現在地と未コミット変更を確認。
2. 新規環境は `git clone https://github.com/hane-san/SRPG-01-FEstyle.git`。既存環境がクリーンなら `git pull --ff-only`。
3. `AGENTS.md`、[DESIGN.md](DESIGN.md)、[DECISIONS.md](DECISIONS.md)、[ROADMAP.md](ROADMAP.md)、対応Issueを読む。現行ルールは `hp6-campaign-design.md`。`flow-0.4.0.md` は当時の操作設計記録。
4. `npm run check` で基準を確認してから編集。
5. `git fetch origin` 後、最新 `origin/main` から `git switch -c <type>/<issue>-<topic> origin/main` で専用ブランチを作る。作業ツリーが汚れている場合は先に内容を確認し、他者の変更を破棄しない。

別の作業者の未コミット変更は消さない。同時作業では小さいブランチを使う。
公開前に `git fetch origin` し、mainが進んでいれば差分を確認して統合・再検証する。
force push、履歴の置き換え、他のゲームの変更を行わない。
通常の実装・修正・リファクタリング・検証は作業範囲内で進める。
ルールの不変条件を変える場合は、まず今回の依頼に含まれるかを確認する。

## 採用判断からmainまで

1. **Chatで採用判断**：人間が採用した内容だけを実装依頼にする。提案・保留・旧仕様・未検証を区別し、採用元と理由をIssueや [DECISIONS.md](DECISIONS.md) に残す。未共有の会話・AIの記憶を根拠にしない。
2. **Issue**：目的、採用済み仕様、肯否を判定できる受入条件、対象外、不変条件、リスクと理由、検証・試遊、未決事項を書く。実装に必要な仕様が矛盾・不足していれば、その箇所を切り出して決裁を求め、創作で埋めない。
3. **実装ラインとブランチ**：CodexとClaude Code/Sonnetから、利用枠・接続・端末・既存文脈で選ぶ。モデルの利用可否は実環境で確認する。開いているPRと担当を確認し、同じファイルの作業はIssue/PRへ範囲を記録して調整する。
4. **PR**：対応Issue、実際の担当・環境、差分、受入条件ごとの結果、検証したSHA、保存・公開・入力への影響、未実行理由、試遊項目をテンプレートに記録。`git push -u origin <work-branch>` で専用ブランチだけを送る。
5. **CIと監査**：PRのActionsを確認し、下表のリスクに応じ独立監査を実施。実装者の自己確認と独立監査を区別する。指摘は作業ブランチで修正し、関連検証を再実行する。
6. **人間の試遊・承認**：はねさんが実機で確認し、面白さと仕様の採否・main統合を判断する。文書だけならゲーム試遊を対象外にした理由と文書の確認結果を残せる。
7. **mainへ統合・公開**：人間の承認後にPRをマージ。mainへ直接push、force-push、自動マージを行わない。main更新後のActionsとPages、公開版を確認する。

| リスク | 例 | 監査の扱い |
|---|---|---|
| low | 文言、独立資料、影響が限定された小修正 | 関連CIと人間確認。独立監査を省く場合は理由をPRに記録 |
| medium | UIフロー、マップ、個別機能 | 実装者と別担当・別セッションで変更周辺と境界条件を独立レビュー |
| high | 4フェーズ、保存互換、地形基盤、世界状態の横断変更 | 実装前の技術設計と深い独立監査。必要ならClaude Code/Opusへ重点監査を依頼 |

監査は役割で指定し、特定のモデル名・版に固定しない。レビュー担当が使えない場合は
PRに未実施と理由を残し、必要な監査を完了扱いにせず、人間に経路を判断してもらう。
監査結果には **PASS/WARN/BLOCK、対象コミットSHA、再現条件・期待/実際、実行済み・未検証、修正方針、Opus上申要否、試遊項目** を記録する。
BLOCK相当の問題は実装へ差し戻し、WARNは残リスクを人間へ伝える。
これらは報告語でありGitHubの必須チェックではない。PASSでもCI成功や人間承認の代わりにならない。
監査後に差分が増えたら、対象SHAを更新して影響範囲を再検証する。

## 実行と検証

Node.js 22以降とPython 3。ビルド・実行時パッケージ・外部CDNは不要。

```sh
npm run dev
# 別のターミナル。http://localhost:4173
npm run check
npm run simulate
```

ブラウザ検証用の開発依存だけを一時導入する場合：

```sh
npm install --no-save --package-lock=false playwright@1.57.0
npx playwright install chromium
npm run test:browser
```

`TEST_URL` で検証先を変更できる。既存Chromiumなら `CHROMIUM_EXECUTABLE`、
共有のPlaywrightなら `PLAYWRIGHT_MODULE` にモジュールの絶対パスを指定する。
`test-results/` は未追跡。確定した観測値だけを `docs/` に移す。
Chromiumの画面サイズ・タッチ模擬はSafari/iOS実機テストではない。
現行スイート、旧版検証の扱い、未検証項目は [QA.md](QA.md) を参照。

## 実装の境界

| 場所 | 役割 |
|---|---|
| `engine.js` | 同期・決定論のルール。DOM、タイマー、保存を持たない |
| `data.js` / `config.js` | 地形、配置、編成、数値と説明 |
| `ui-model.js` | 攻撃候補・残HP予測・連続スライド・未行動の巡回。ルールはengineに委譲 |
| `app.js` / `ui-input.js` | 画面、明示確認、キー・タッチ、表示用の行動再生 |
| `playback.js` / `audio.js` / `music.js` | 移動・交互攻撃の描画補間、効果音とユーザー操作による音の解禁 |
| `render.js` / `style.css` | オリジナル描画、範囲、カメラに干渉しないウィンドウ |
| `save.js` | 安定状態だけの保存、互換性と入れ子データの検証 |
| `assets/` | 仮アイコンの原画と配信用PNG |

engineのobserverは `(state, actor, event)` で deploy / move / hit / heal / settled を通知する。出撃確定時は deploy を移動・攻撃より前に通知し、城を起点とする出撃演出を行う。
moveには合法な隣接マスの経路、hitには攻撃側・対象・量・反撃フラグを持たせる。
UIは別の状態を同期解決し、移動の補間→攻撃→反撃を順に表示して最終状態へ揃える。
P1の直接選択は最終状態を先に保存し、演出中の再読込でも命令を失わない。
敵フェーズ途中は保存しない。再生速度・音・動きを減らす設定で結果は変えない。
テスト用操作は `?debug=1` のときだけ。通常起動にデバッグ状態を公開しない。

## 仮アイコン

`assets/icon-source.png` が画像生成したオリジナルのナイト駒の原画。
配信用32/180/192/512pxと、余白を追加したmaskable版を同梱。
ホーム画面の見た目はOSが決めるため、角丸を原画に焼き込まない。

```sh
npm install --no-save --package-lock=false sharp@0.34.5
npm run icons
```

アイコン生成の変更では、HTMLのfaviconとApple touch icon、manifestの各画像の
読込・実寸を確認する。実ゲームの駒や盤面はこのアイコンに置き換えない。

## リリースと引継ぎ

1. 変更理由と実際の観測、残る問題を `docs/` に記録。完了した項目をroadmapへ反映。
2. `node scripts/release.mjs X.Y.Z` で全ES moduleの参照とCSS、version.jsonを更新。
3. `npm run check`。ルール・数値変更はsimulationも比較。UI変更は `npm run test:browser` で全スイートを実行。
4. 保存互換性を `save.js` と現行仕様で確認。現行0.8.0は0.7.0以前の途中保存と非互換。0.8.0の安定状態と独立した設定・音量を保護する。
5. `git diff --check` と差分確認。ソース・検証文書を作業ブランチへコミットし、PRでCI・必要な監査・人間承認を受ける。文書だけの整備では版番号を更新しない。
6. 人間がPRをmainへ統合した後、GitHub ActionsとPagesの結果を確認。公開後も版番号と主要操作を確認して記録。

GitHub接続ツールだけの環境でも同じファイルを取得・編集できる。
テストを実行できない場合は、その制約と実行できた範囲を明記する。
別ツールへ渡すためにトークンをコードや文書へ保存しない。

## 導入後に人間が行う管理画面設定

- **Settings → Actions**：既存の `SRPG rules` を有効にし、PRで `rules` / `browser` が実際に成功することを確認。CIは `contents: read` を維持する。
- **Settings → Rules → Rulesets**：main対象でActiveにし、PR必須、force push禁止、削除制限、必須ステータスチェックを設定する。成功したPRに表示される正確な `rules` / `browser` のチェック名を選ぶ。個人開発で取得できない他者承認数を必須にしない。利用プランと適用状態を確認し、失敗CIのPRがマージを制限されるか確認する。
- **Settings → Pages**：現行main / rootと `https://hane-san.github.io/SRPG-01-FEstyle/` を維持し、マージ後の公開を確認。今回の導入で改名・表示名変更は行わない。
- **Codex / Claude Code**：実リポジトリ、Node 22+、必要なPython/ブラウザ、実モデルと権限を確認。初回は手動でIssue→PRの受け渡しを試す。
- **夜間Routineを導入する場合**：対象はまず1リポジトリの未処理PR。対象SHA・権限・モデル・スケジュールを確認し、監査結果をPRに残す。main直接push・自動マージを許さない。

文書・PRの作成だけで保護設定やRoutineが有効になったとは扱わない。

描画キャッシュは `render.js` の内部。演出とルール解決を分けたまま、能力・天候・盤面編集の更新をキーへ含める。`tests/tap-performance-check.mjs` は2タップ移動・取消・敵へのスライド・演出失敗復帰と、6マップの再利用／無効化を検証する。将来のマップ追加は `tests/audit.test.js` の配置・地形・連結検査も通す。

## Claude Codeによる監督・夜間巡回

Codex/GPT等が作ったPRをClaude Codeが受け取るときの手順（競合→CI→差分監査→1件の記録コメント→人間待ち）と、夜間巡回の範囲は `.claude/skills/steward/SKILL.md`。クラウドのセッションでは `.claude/hooks/session-start.sh` がブラウザ検査の依存を用意する。マージ・承認・Settings変更はしない。
