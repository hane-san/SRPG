# SRPG改名・表示名移行の事前監査と手順

2026-10-18。対象は **hane-san/SRPGだけ**。基準main：`a42c97106ba945f4124bc1b2c7cdb89653c942f0`、v0.8.0。
対応：[Issue #12](https://github.com/hane-san/SRPG/issues/12)。今回、GitHubの改名・表示名切替・main統合・Settings操作は行わない。
Koitototsukuruの改名準備は、SRPGの移行を確認してから別タスクで扱う。

## 新旧の対応と現在地

| 項目 | 現在 | 人間の改名後の目標 |
|---|---|---|
| Repository | `hane-san/SRPG` | `hane-san/hane-no-SRPG01` |
| Git URL | `https://github.com/hane-san/SRPG.git` | `https://github.com/hane-san/hane-no-SRPG01.git` |
| Pages | `https://hane-san.github.io/SRPG/` | `https://hane-san.github.io/hane-no-SRPG01/` |
| HTML title | `戦線指揮 — FIELD COMMAND` | `英雄叙事詩`（後日の表示名PR） |
| ゲーム内説明 | `戦線指揮 / FIELD COMMAND` | `英雄叙事詩`（同上） |
| manifest name / short_name | `戦線指揮 SRPG` / `戦線指揮` | `英雄叙事詩` / `英雄叙事詩`（同上） |

GitHubリポジトリの旧URLの転送と、旧PagesのプロジェクトサイトURLは別。
**旧Pagesは自動転送されない前提**で新URLを案内し、旧ブックマーク・ホーム画面を再登録する。
新URLの実公開と改名先の利用可否は、改名を実施する工程で確認する。

## 影響一覧

| 対象・根拠 | 監査結果 | 今回 / 改名時の扱い |
|---|---|---|
| [README](../README.md) | 公開URL・正本リンクは旧repo、見出しに旧表示名と仮名が併記 | 今回は手順へのリンクを追加。改名後に現在のURLと見出しを更新 |
| [app.js](../app.js) の「このゲーム・検証記録」 | 可視の旧名とGitHubソースURLが直書き | 表示名だけDISPLAY_NAMEへ。ソースURLは実改名後の修復PRで更新 |
| [display-name.js](../display-name.js) | 今回追加する表示専用の正本。内部ID・URLを含まない | 現行名を保持し、後日の名前切替を一か所で行う |
| [index.html](../index.html) | 静的title。rootが配信入口。JS/CSS/manifest/画像は相対URL | titleを同期スクリプトで管理。起動経路は維持。appのURLタグだけ更新し、旧キャッシュとの混在を避ける |
| [manifest](../manifest.webmanifest) name / short_name | 上表の旧名 | 表示正本から同期。今回の出力は現状と同一 |
| manifest start_url / scope / id | `./` / `./` / **idなし** | 今回すべて維持。改名後の相対解決は新Pages配下。明示idを推測して追加しない |
| manifest実効識別子 | 明示idがない場合はstart_url由来。パス変更はインストール識別に影響し得る | 表示名と別の判断。既存ホーム画面アプリの同一性・保存共有は実機検証が必要 |
| Apple / favicon | Apple touch 180×180、favicon 32×32。apple-mobile-web-app-titleは未指定 | PNGは維持。端末が採用する名前・アイコンと再登録を実機で確認 |
| manifestアイコン | 192×192、512×512、maskable 512×512。すべて `assets/` 相対 | ファイル名・画像・purposeは維持。新パスで取得と実寸を確認 |
| ES modules / CSS / docsリンク | `./*.js?v=…`、CSS、`docs/balance.md` は相対 | 新プロジェクトパスで読める。root固定の `/SRPG/` アセットパスはゲームにない |
| 更新確認 [app.js](../app.js) | `./version.json` を取得し、更新時は `./?v=…` へ移動 | 相対パスを維持。新URLで「最新版を確認」を検証 |
| [version.json](../version.json) / [config.js](../config.js) | releaseは0.8.0。保存互換性判定と関係する | 名称移行だけを理由にrelease・保存形式を変更しない |
| [package.json](../package.json) | 技術ID `field-command-srpg`、static ES modules | 表示名から導出しない。名称同期コマンド/チェックと回帰を追加 |
| [save.js](../save.js) / [audio.js](../audio.js) / [music.js](../music.js) | 固定の5保存キー。下表参照 | 変更なし。表示名から再生成・一括置換しない |
| 診断・書出し [app.js](../app.js) | `window.srpgDebug`、`srpg-playtest.json` | 技術上の入口/ファイル名として維持。ゲーム名へ連動させない |
| [CI](../.github/workflows/check.yml) | `SRPG rules`、PR/main、rules/browser、contents:read。checkoutで対象repoを取得 | 定義・ジョブ名を維持し、既存npmコマンド経由で新検証を実行。改名後もPR/mainとチェックの適用を確認 |
| GitHub Pages設定（API確認） | legacy、main / root、旧URL、基準SHAのビルド成功 | 今回未変更。実改名後にPages設定・再配信・新URLを確認。旧URLへの転送を保証しない |
| git remote（取得済み） | origin fetch/pushとも `https://github.com/hane-san/SRPG.git` | 今回変更なし。実改名後に新URLへ更新。worktreeはremote設定を共有するため担当間で調整 |
| 外部リンク・文書 | README / AGENTS / DEVELOPMENTの現在参照、ゲーム内GitHubリンクに旧名。過去の監査・配信記録にも旧URL | 現在参照は実改名後に更新。過去の版・SHA・run/Issue/PRの記録を無差別置換しない |
| 外部AI・Routine・共有先 | Codex/Claudeの環境選択、Routine、ChatGPTの指示、ショートカット等の管理状態は未確認 | 人間が実改名後に新repoを再選択・再接続し、権限・対象ブランチを確認 |
| サービスワーカー | 登録コード・配布ファイルなし | 新たなキャッシュ層は追加しない。既存ブラウザ/ホーム画面のキャッシュは別途確認 |

他の外部URLは主に過去のGitHub証拠・設計研究リンク。改名準備で削除しない。
GitHubのhomepageは未設定。mainのprotectedはfalseで、品質ゲート設定もまだ別途必要。
旧公開URLのroot / manifest / version.json / Apple touch iconは実HTTPで200を確認し、titleとmanifestは上表の旧名、versionは0.8.0だった。新URLの実公開は未確認。

### 保存と設定の固定キー

| キー | 所有元 | 内容 |
|---|---|---|
| `field-command-save-v1` | save.js | release・state・campaignを含む戦闘保存 |
| `field-command-fast` | app.js | 進行速度 |
| `field-command-sound` | audio.js | 効果音ON/OFF |
| `field-command-music` | music.js | 音楽ON/OFF |
| `field-command-music-volume` | music.js | 音量 |

通常ブラウザのlocalStorageはパス単位ではなくorigin単位。
旧/新Pagesは同じ `https://hane-san.github.io` なので、**同じブラウザ・プロファイル・保存領域なら**同じキーを参照する。
この性質は別端末、別ブラウザ、プライベートモードや、ホーム画面アプリ間の保存共有を保証しない。
特にid未指定のPWAの識別子・Safari/ホーム画面の保存領域は実機確認が必要。
既存の「検証記録JSON」は進捗を復元するセーブのエクスポート/インポート機能ではない。
保存継続が必須の利用環境で移送手段が確認できない場合は、実改名を保留してその課題を先に解決する。
この準備PRは保存の読み書き・互換性判定・消去/移送処理を変更しない。

## 表示名を後日切り替える方法

`display-name.js` の表示用オブジェクトだけを変更する。目標名への切替例：

```js
const display=Object.freeze({name:'英雄叙事詩',subtitle:'',manifestSuffix:''});
```

```sh
npm run sync:display-name
npm run check
npm run test:browser
```

生成対象はHTML titleとmanifestのname / short_name。ゲーム内説明は同じモジュールを参照する。
生成物をコミットし、未同期ならcheckが失敗する。静的配信を維持し、起動時に名称JSONをfetchする仕組みやビルド基盤は追加しない。
Apple専用タイトルの新設、manifest idの追加、内部ID・保存キー・アセット名変更を名前切替へ混ぜない。
READMEの説明見出しは、そのPRで人間向けに編集する。歴史資料の作品名まで自動置換しない。

## 人間が行う順番

### 改名前

1. 基盤PR #11は本監査時点で未マージ。先に運用資料・main保護を確認する。#7（出撃/SE/HP）と#9（42曲化）も未マージでapp.js / index.html / README等が重なる。担当を調整し、後から統合する側で表示正本の参照を保持する。
2. この準備PRを、CI・独立レビュー・人間確認後にmainへ統合。今回はmedium。自己検証だけを独立監査と数えない。改名操作の許可とは別。
3. 旧PagesのURL、main SHA、release、起動、続きからの復元、音量・進行速度、既存ホーム画面の状態を記録。ブラウザデータを消さない。
4. 必要な環境では5キーの復旧可能なバックアップを安全なローカル場所へ取る。PCの開発者ツールやiPhoneのWeb Inspectorが使える場合はキーごとの値を控え、公開Issue/PRに進捗や個人データを貼らない。既存UIに復元機能があるとは扱わない。
5. GitHubの改名先の空き、実行中PR/CI、Pages設定、mainのRuleset適用を確認する。

### Renameと直後

1. **人間が** GitHub Settings → General → Repository nameで `SRPG` を `hane-no-SRPG01` にRename。別repoの新規作成・コードの複製移行は行わない。
2. 各clone/worktreeの担当者と調整して、`git remote set-url origin https://github.com/hane-san/hane-no-SRPG01.git`。新repoのmain・Issue・PR・Actionsへアクセスできるか確認する。
3. 改名後の修復は専用ブランチ/PRで行う。README/AGENTS/DEVELOPMENTと基盤PR #11で増えた現在参照、ゲーム内GitHubリンク、外部環境の対象repoを更新。過去の観測・runリンクは履歴として保持する。
4. Pagesをmain / rootのまま確認・再配信し、`https://hane-san.github.io/hane-no-SRPG01/` で下表を検証。旧Pages URLの自動転送は期待しない。
5. 表示名は上記の小PRで切り替える。repo改名と同時でなくてもよい。main直接push・自動マージは行わない。
6. 新URLで復元と操作を確認し、新しいホーム画面アイコンを追加。旧アイコンは新環境の保存が使えることを確認してから整理し、共有リンク・ブックマークも更新する。
7. Codex / Claude Code / Routine / ChatGPTの対象repo・権限・mainブランチと指示を更新。次の実装・監査が新repoを扱うことを試す。

## 移行後の受入テスト

| 確認 | 期待値 | 事前準備時の検証 |
|---|---|---|
| 名称同期 | title・ゲーム内説明・manifestが同じ表示正本に追随。パス/id/画像は不変 | Nodeの一時コピーで将来名と特殊文字を試し、未同期検出/同期を確認 |
| 新プロジェクトURL | 新URLのHTML、JS、CSS、version、docsが取得できる | ローカルで旧/新のサブパスを同じゲームへ割当。実Pages新URLは改名後 |
| アイコン・manifest | start_url/scopeが新パス配下、favicon/Apple/manifestアイコン取得成功 | ローカルのブラウザ回帰。OSのホーム画面は未検証 |
| 保存・設定 | 同じ保存領域で既存0.8のmap/turn/campaignと5キーが保たれる | 旧パスで既存形式を保存し、新パスで復元・設定一致を確認 |
| PWA/実機保存 | 新しいホーム画面から起動し、必要な続行と設定が使える | iPhone Safari・再登録は未検証。idの扱いは実機で確認 |
| 更新確認 | 新パスのversion.jsonを取得。「最新版です」または正しい更新導線 | ローカル旧/新サブパスで検証 |
| ゲーム回帰 | HP6、城出撃、P3、攻撃/反撃、保存、26曲の既存挙動を維持 | `npm run check` と既存 `npm run test:browser` |
| 配信・CI | 新repoのmain/PRでrules/browserが成功し、Pagesが対象SHAを配信 | 改名後のGitHub検証は未実施 |
| 外部AI・リンク | 新repoでIssue→作業ブランチ→PR、監査対象SHAを正しく扱える | 管理画面設定・外部接続は人間が確認 |

ローカルの旧/新パス検査はGitHubのRenameや本番配信ではなく、Chromiumの画面/タッチ模擬。
実行環境・対象SHA・最終CI結果は準備PR本文に記録する。iPhone実機や改名後の実公開を実施済みとはしない。
失敗時は新しい機能を足さず、配信設定・修復PR・保存領域を確認し、人間が再公開/延期を判断する。安易な再改名やlocalStorage消去を復旧策にしない。

参考：[GitHubのリポジトリ改名とPagesの例外](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)、[manifest idの既定値](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/id)、[localStorageとorigin](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)。
