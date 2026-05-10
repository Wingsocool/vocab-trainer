# COCA 5000 Vocabulary Tester

一个纯静态网页小工具，用于按频率顺序测试 COCA 5000 高频词。

## 功能

- 每组 50 / 100 / 150 / 200 个词，可切换。
- 三档判断：能应用 / 认识但不熟 / 不认识。
- “能应用”的词会从背词列表排除。
- “认识但不熟”和“不认识”的词会进入背词列表。
- 进度自动保存在当前浏览器的 `localStorage`。
- 支持导出背词列表 TSV。
- 支持导出 / 导入全部学习进度 JSON。
- 支持浏览器英文朗读。
- 快捷键：`1` 能应用，`2` 认识但不熟，`3` 不认识，`S` 朗读，左右方向键切换。

## 文件结构

```text
coca5000-dad-vocab-tester/
├─ index.html
├─ style.css
├─ app.js
├─ coca5000.json
└─ README.md
```

## 本地预览

因为浏览器直接双击 `index.html` 时可能不允许读取 `coca5000.json`，建议在项目目录运行一个本地服务器：

```bash
python -m http.server 8000
```

然后打开：

```text
http://localhost:8000
```

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库，例如 `coca5000-vocab-tester`。
2. 把本文件夹里的所有文件上传到仓库根目录。
3. 打开仓库 `Settings` → `Pages`。
4. `Build and deployment` 选择：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. 保存后等待 GitHub Pages 生成网址。

## 注意

学习进度保存在浏览器本地，不会自动跨设备同步。换设备时，请先在旧设备点击“导出进度”，再在新设备点击“导入进度”。
