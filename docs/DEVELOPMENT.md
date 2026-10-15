# Adopt a Brain 开发文档

本文描述当前代码实现，供维护和扩展使用。玩家说明见项目根目录的 [README](../README.md)。

## 运行与依赖

项目是无构建步骤的静态网站，没有 npm 依赖。入口是 `index.html`，它以 ES module 方式加载 `main.js`。运行时需要：

- 现代浏览器提供 ES modules、Canvas 2D、Fetch、`requestAnimationFrame` 和 `localStorage`。
- `data/events.json` 必须能通过 HTTP 获取。
- Google Fonts 的 Press Start 2P 是可选网络字体；加载失败时使用 `monospace` 回退字体，不影响游戏逻辑。

不能可靠地通过 `file://` 双击运行，因为浏览器通常会阻止模块或 JSON 请求。开发时可在仓库根目录启动任意静态 HTTP 服务器，例如：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。

## 文件结构与职责

```text
adopt-a-brain/
├── index.html           # 页面结构、样式、Canvas 与菜单
├── main.js              # 启动、主循环、DOM 交互、存档和统计
├── gameState.js         # 模块间共享的游戏状态
├── brainModel.js        # 激活过渡/衰减、情绪和脑型计算
├── eventEngine.js       # 加载、打乱、调度和处理事件
├── renderer.js          # 背景、脑图、EEG/fMRI 风格图与 UI 渲染
├── data/
│   └── events.json      # 唯一运行时 JSON 资源
└── docs/
    └── DEVELOPMENT.md
```

`brainRegions.json` 和 `emotionMap.json` 已移除：应用从未加载它们，脑区/颜色分别定义在 `brainModel.js` 和 `renderer.js`，情绪公式定义在 `brainModel.js`。本文件保留其有用信息。

## 启动和主循环

`main.js` 的 `boot()` 先加载事件，再初始化四个可视化 Canvas。事件请求失败或 JSON 无效时，会显示用户可见的错误和重试按钮。

有存档时，启动过程恢复状态、重新推导脑型并直接进入游戏；无存档时显示命名界面。每个动画帧在游戏未暂停时依次：

1. 累加游玩时间并记录愉悦/压力峰值。
2. `tickBrainModel(dt)` 更新脑区、情绪与情绪历史。
3. `tickEventEngine(dt)` 调度事件。
4. `updateStatsDOM(dt)` 每秒更新统计文字。
5. `renderFrame(dt)` 绘制所有画面；暂停时仍会渲染。

相邻事件间隔随机为 3–6 秒。事件池在启动时打乱，取完后重新打乱；当前实现不排除已体验事件，`experiencedEvents` 只记录唯一 ID。

## 状态结构

`gameState.js` 导出的 `state` 是模块间共享状态，主要分为：

- 生命周期：`brainName`、`started`、`gameInitialized`。
- 当前表现：八项 `emotions`、`emotionHistory`、`currentEvent` 和事件计时。
- 存档数据：`playTimeSeconds`、`experiencedEvents`。
- 累积统计：事件数、峰值、总正向权重和七个脑区的 `regionAccumulated`。
- 分类：`brainType`、`brainTypeScores`、`brainTypeChanged`。

瞬时脑区激活 `activations` 位于 `brainModel.js`，不在 `state` 中，但会保存和恢复。

## 事件数据与处理

`data/events.json` 的顶层结构为 `{ "events": [...] }`。当前包含 38 个事件，每个事件恰有三个选项。结构示例：

```json
{
  "id": "unique_event_id",
  "level": 1,
  "title_zh": "中文标题",
  "title_en": "English title",
  "description_zh": "中文描述",
  "description_en": "English description",
  "options": [
    {
      "text_zh": "中文选项",
      "text_en": "English option",
      "regionWeights": {
        "prefrontal": 0.2,
        "amygdala": -0.1
      },
      "feedback_zh": "中文反馈",
      "feedback_en": "English feedback"
    }
  ]
}
```

选择选项时，事件引擎将权重交给脑模型，记录首次体验的事件 ID，增加 `eventsResolved`，每逢 10 的倍数重新计算脑型，然后显示反馈并立即存档。

新增事件时应保证：

- `id` 唯一，双语标题、描述、选项和反馈完整。
- `options` 保持三个，以符合当前界面与玩法。
- `regionWeights` 只使用七个有效 ID，值必须是数字；无需为未变化的脑区填 `0`。
- 在浏览器中验证长文本和窄屏布局，并验证 JSON 语法。

## 脑区激活

有效 ID 与显示名称如下：

| ID | 名称 | 游戏中的抽象作用 |
| --- | --- | --- |
| `prefrontal` | 前额叶 PFC | 决策、计划、自我控制 |
| `amygdala` | 杏仁核 AMY | 情绪反应 |
| `hippocampus` | 海马体 HPC | 记忆与空间信息 |
| `basal_ganglia` | 基底核 BG | 奖励与运动控制 |
| `cerebellum` | 小脑 CB | 协调与平衡 |
| `thalamus` | 丘脑 THL | 感觉信号中继 |
| `cingulate` | 扣带回 CG | 注意与情绪调节 |

`applyRegionWeights()` 以当前瞬时值为起点，将每个目标限制在 `[0, 1]`，再用三次缓出曲线在 2500 ms 内过渡。没有过渡时，各激活值按 `0.0006 × dt` 衰减到 0。

累积统计只加选项中大于 0 的原始权重值。它不是实际插值后的差值：即使目标因上限被截断，正权重仍会完整加入 `regionAccumulated` 和 `totalActivation`。负权重不进入累计值。

## 情绪计算

每帧从瞬时激活计算八项指标：

```text
pleasure   = basal_ganglia × 0.60 + amygdala × 0.40
stress     = amygdala × 0.60 + cingulate × 0.40
motivation = basal_ganglia × 0.70 + prefrontal × 0.30
focus      = prefrontal × 0.65 + cingulate × 0.35
memory     = hippocampus × 0.70 + prefrontal × 0.30
social     = amygdala × 0.50 + prefrontal × 0.50
creative   = prefrontal × 0.40 + cingulate × 0.35 + hippocampus × 0.25
fluency    = cerebellum × 0.80 + thalamus × 0.20
```

最多保留 200 帧情绪历史，供渲染器比较近期趋势。以上只是游戏规则，不应解释为神经科学测量模型。

## 脑型分类

分类只使用 `regionAccumulated`，在第 10、20、30……个已完成事件后计算。恢复存档时也会重新推导一次。

第一步计算三个游戏化“层”的分数：

```text
reptilian = cerebellum × 0.70 + thalamus × 0.30
limbic    = amygdala × 0.45 + hippocampus × 0.35 + basal_ganglia × 0.20
cortical  = prefrontal × 0.55 + cingulate × 0.45
```

总分小于 `0.5` 时不产生分类。否则取最高层（平分时按代码中的爬行层、边缘层、皮层优先顺序），再计算趋近/回避比例：

```text
BAS = basal_ganglia × 0.55 + prefrontal × 0.45
BIS = amygdala × 0.60 + cingulate × 0.40
ratio = BAS / (BAS + BIS)
```

`ratio > 0.6` 为趋近，`ratio < 0.4` 为回避，其余为平衡。三个主层乘以三种倾向，映射到 `BRAIN_TYPE_TABLE` 中的九种脑型。名称和描述的唯一来源是该表。

## 存档与清除

存档键为 `adopt-a-brain-save`。每次选择后和游戏进行中的每 30 秒调用 `saveGame()`，存入姓名、瞬时激活、已体验 ID、整数秒游玩时间和累计统计。情绪会写入存档对象，但恢复时会由脑模型根据激活重新计算；脑型也不直接保存。

存档只属于当前 origin 的浏览器本地存储，没有云同步或导出。新建大脑和清除存档都先调用浏览器确认框，再删除存档并重置内存状态。

修改存档结构时，应对旧存档缺失字段提供默认值。当前没有显式 schema 版本或迁移系统。

## 可视化架构

`renderer.js` 管理五类画面：全屏粒子背景、侧视脑激活、模拟 EEG 波形、模拟 fMRI 热力图和轴位脑区图。Canvas 会按元素显示尺寸和设备像素比调整内部分辨率。脑区颜色定义在 `renderer.js` 的 `REGION_COLORS`；如新增脑区，必须同步模型、累积状态、渲染颜色/位置、图例和所有依赖遍历固定脑区列表的代码。

情绪箭头和脑型面板也是由渲染器根据共享状态更新。EEG/fMRI 风格图均是程序化视觉效果，不是数据采集或真实成像。

## 部署到 GitHub Pages

所有 URL 都是相对路径；事件请求以 `import.meta.url` 解析，因此项目可以部署在 GitHub Pages 的仓库子路径，无需构建。

仓库管理员需要在 GitHub 中手动完成：

1. 打开 **Settings → Pages**。
2. 在 **Build and deployment** 中选择 **Deploy from a branch**。
3. 选择 `main` 分支和 `/(root)`，保存并等待部署完成。
4. 从 Pages 设置页打开 GitHub 给出的地址，实际验证加载、存档和移动端布局后，再把该地址添加到 README 的“在线游玩”部分。

当前仓库没有 Pages workflow；静态根目录部署不需要新增构建工具。

## 发布前回归检查

- 通过 HTTP 打开页面，确认无控制台错误。
- 新建并命名大脑，确认事件出现且三个选项可用。
- 选择后确认反馈、激活图、情绪箭头和统计变化。
- 完成 10 个事件，确认脑型出现；继续到 20 个事件确认重新计算。
- 刷新并确认恢复；等待超过 30 秒确认定时保存。
- 分别验证重新开始、取消确认和清除存档。
- 临时让 `events.json` 返回 404 或无效 JSON，确认错误界面与重试按钮。
- 在常见桌面宽度及 900 px、520 px 以下的窄屏检查滚动、触控按钮和文本。
