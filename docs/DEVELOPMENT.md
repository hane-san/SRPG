# 共通の開発手順

GPTのチャット（GitHub接続あり）、Codex、Claude Codeから同じ `hane-san/SRPG` を扱う。
共通契約はルートの `AGENTS.md`。Claude Codeは `CLAUDE.md` から同じ契約を読み込む。
この文書とGit履歴で作業を引き継ぐ。チャット履歴や個人の設定ファイルは不要。

## 作業の始め方

1. `git status --short` と `git log -5 --oneline` で現在地と未コミット変更を確認。
2. 新規環境は `git clone https://github.com/hane-san/SRPG.git`。既存環境がクリーンなら `git pull --ff-only`。
3. `AGENTS.md`、`docs/ROADMAP.md`、現行の `docs/flow-0.4.0.md` を読む。
4. `npm run check` で基準を確認してから編集。

別の作業者の未コミット変更は消さない。同時作業では小さいブランチを使う。
公開前に `git fetch origin` し、mainが進んでいれば差分を確認して統合・再検証する。
force push、履歴の置き換え、他のゲームの変更を行わない。
通常の実装・修正・リファクタリング・検証は作業範囲内で進める。
ルールの不変条件を変える場合は、まず今回の依頼に含まれるかを確認する。

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

## 実装の境界

| 場所 | 役割 |
|---|---|
| `engine.js` | 同期・決定論のルール。DOM、タイマー、保存を持たない |
| `data.js` / `config.js` | 地形、配置、編成、数値と説明 |
| `ui-model.js` | 攻撃候補・残HP予測・連続スライド・未行動の巡回。ルールはengineに委譲 |
| `app.js` / `ui-input.js` | 画面、明示確認、キー・タッチ、表示用の行動再生 |
| `playback.js` / `audio.js` | 移動・交互攻撃の描画補間、効果音とユーザー操作による音の解禁 |
| `render.js` / `style.css` | オリジナル描画、範囲、カメラに干渉しないウィンドウ |
| `save.js` | 安定状態だけの保存、互換性と入れ子データの検証 |
| `assets/` | 仮アイコンの原画と配信用PNG |

engineのobserverは `(state, actor, event)` で move / hit / heal / settled を通知する。
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
3. `npm run check`。ルール・数値変更はsimulationも比較。UI変更はブラウザ4スクリプトも実行。
4. 保存互換性を `save.js` で明示。現行0.4.0は0.2.0・0.3.0の安定保存を引き継ぐ。
5. `git diff --check` と差分確認。ソース・検証文書をコミットしてmainへpush。
6. GitHub ActionsとPagesの結果を確認。公開後も版番号と主要操作を確認して記録。

GitHub接続ツールだけの環境でも同じファイルを取得・編集できる。
テストを実行できない場合は、その制約と実行できた範囲を明記する。
別ツールへ渡すためにトークンをコードや文書へ保存しない。
