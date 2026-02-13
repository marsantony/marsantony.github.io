# marsantony.github.io

Mars Liu 的個人作品集與工具入口。

## 線上預覽

**https://marsantony.github.io/**

## 內容

- **Hero** ── 自我介紹與聯繫方式
- **Skills** ── 技術棧（C#、ASP.NET、jQuery、MS SQL、Git）
- **Experience** ── 工作經歷時間軸
- **Projects** ── 個人專案卡片，連結至各工具頁面
- **Education** ── 學歷

## 設計

- 銀灰主調 + Neumorphism（新擬物）風格
- 純 HTML + CSS，無前端框架
- 響應式設計（桌面 / 平板 / 手機）
- Google Fonts（Nunito Sans）+ FontAwesome 圖示

## 共用元件

`shared/` 資料夾提供跨 repo 的共用導覽列與 footer：

```
shared/
├── nav.html      # 導覽列 HTML
├── footer.html   # 頁尾 HTML
├── nav.css       # 導覽列 + 頁尾樣式
└── shared.js     # fetch 載入 nav + footer
```

其他工具頁只需引入：

```html
<link rel="stylesheet" href="https://marsantony.github.io/shared/nav.css">
<script src="https://marsantony.github.io/shared/shared.js"></script>
```

## 相關專案

| 專案 | 說明 |
|------|------|
| [TwitchSelfReply](https://github.com/marsantony/TwitchSelfReply) | Twitch 聊天室自動回覆 |
| [Twitch_AutoSendMessage](https://github.com/marsantony/Twitch_AutoSendMessage) | Twitch 自動發送 GP |
| [Twitch_AutoGameStatusUpdate](https://github.com/marsantony/Twitch_AutoGameStatusUpdate) | Twitch 遊戲狀態自動更新 |
| [Youtube_AutoVideosUpdate](https://github.com/marsantony/Youtube_AutoVideosUpdate) | YouTube 最新影片指令更新 |
| [STO2025Statistics](https://github.com/marsantony/STO2025Statistics) | Shadowverse 卡牌統計儀表板 |
| [clean-new-tab](https://github.com/marsantony/clean-new-tab) | Chrome 新分頁擴充功能 |
