# 設計資料への索引

ゲームの詳細をここへ複製せず、現行設計と過去の観測へ案内する。
採用状態は [DECISIONS.md](DECISIONS.md)、未完了は [ROADMAP.md](ROADMAP.md)、検証は [QA.md](QA.md)。

## 現行の正本

| 資料 | 内容・扱い |
|---|---|
| [HP6・出撃・ロスト仕様](hp6-campaign-design.md) | v0.8.0の基礎ルール・予備・帰還・ロスト・保存。物語の節は未実装と明記されている |
| [P3専門職化・試遊仕様](p3-specialists-playtest.md) | Issue #26の実験ブランチで旧・全兵種P3支援を置換。main採否は未確定 |
| [README](../README.md) | 現在の遊び方、公開URL、実装範囲 |
| [AGENTS](../AGENTS.md) | 全AIの開発契約、ゲーム固有の不変条件、技術境界 |
| [開発手順](DEVELOPMENT.md) | Issue・作業ブランチ・PR・CI・監査・人間承認 |
| [バランス検討](balance.md) | 旧版の仮説・検証方法。HP6以前の数値・支援ルールを現行仕様として再導入しない |

採用済みIssueは変更範囲・受入条件の根拠。未マージPRを実装済みmainとみなさない。
仕様とコード・テストが食い違う場合は、両方の根拠とSHAをIssueへ残し、人間の採否を確認する。
未共有のチャットや、別AIの個人的な記憶から仕様を補完しない。

## 保持する設計・検証履歴

- [0.7 入力・描画性能](input-performance-0.7.0.md)
- [0.6 テンポ・配置・音楽](tempo-balance-music-0.6.0.md)、[音楽候補](music-candidates.md)
- [0.5.2 命令欄](commands-0.5.2.md)、[0.5.1 移動先](destination-0.5.1.md)、[0.5 視認性](readability-0.5.0.md)
- [0.4 操作フロー](flow-0.4.0.md)、[0.3 操作性](usability-0.3.0.md)
- モバイルUI：[0.2](mobile-ui-0.2.0.md)、[0.1.2](mobile-ui-0.1.2.md)、[0.1.1](mobile-ui-0.1.1.md)

旧版の記録と結果JSONは当時の証拠として保持する。HP6設計と矛盾するルールは旧仕様であり、
文書にあるだけで現在の実装済み・検証済みとは判断しない。将来の物語・外伝・詳細な兵種分岐も実装状態を分けて扱う。
