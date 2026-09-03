# Adopt a Brain — A_brain 系统说明文档

> 本文档覆盖运行规则、各层数据关联，以及扩展（新增事件/脑型/情绪）时必须遵循的规范。

---

## 目录

1. [文件结构](#1-文件结构)
2. [游戏运行流程](#2-游戏运行流程)
3. [数据层结构与关联](#3-数据层结构与关联)
4. [脑区系统](#4-脑区系统)
5. [情绪维度系统](#5-情绪维度系统)
6. [事件系统](#6-事件系统)
7. [脑型分类系统](#7-脑型分类系统)
8. [存档系统](#8-存档系统)
9. [渲染系统](#9-渲染系统)
10. [新增事件规范](#10-新增事件规范)
11. [扩展其他系统的规范](#11-扩展其他系统的规范)

---

## 1. 文件结构

```
A_brain/
├── index.html          # 完整 UI 结构与样式（单文件）
├── main.js             # 入口、游戏主循环、存档读写、UI 事件绑定
├── gameState.js        # 全局唯一状态对象（单一数据源）
├── brainModel.js       # 脑区激活/衰减、情绪计算、脑型分类
├── eventEngine.js      # 事件加载、调度、选项处理
├── renderer.js         # 所有画布可视化（侧视图、EEG、fMRI、俯视图、背景）
└── data/
    ├── brainRegions.json   # 7 个脑区元数据（名称、颜色、描述）
    ├── emotionMap.json     # 8 个情绪维度的计算公式
    └── events.json         # 所有事件及其选项
```

**数据流向（单向）：**

```
events.json
    ↓ 选项选择
gameState.js (activations)
    ↓ 每帧计算
emotions (8维)
    ↓ 累积统计
regionAccumulated
    ↓ 每10事件
brainType
    ↓
renderer.js (可视化)
```

---

## 2. 游戏运行流程

### 2.1 启动流程

```
读取 localStorage "adopt-a-brain-save"
    ├─ 有存档 → 静默恢复所有状态 → 直接进入游戏
    └─ 无存档 → 显示命名界面 → 玩家输入名字 → 确认 → 开始游戏
```

### 2.2 主循环（requestAnimationFrame）

每帧按顺序执行：

```
loop(timestamp):
  dt = timestamp - lastTime   // 帧间隔，最大限制 100ms（防止卡帧导致异常跳跃）

  if 游戏进行中:
    playTimeSeconds += dt / 1000
    追踪情绪峰值（peakPleasure, peakStress）

    tickBrainModel(dt)    // 1. 激活/衰减脑区 → 计算情绪
    tickEventEngine(dt)   // 2. 计时 → 触发下一个事件
    updateStatsDOM(dt)    // 3. 更新统计 UI（每秒一次）

  renderFrame(dt)         // 4. 渲染所有画布（始终执行）
```

### 2.3 事件触发时序

```
[上一个事件结束]
    ↓
等待 3000–6000ms（随机）
    ↓
从打乱的事件池中取下一个事件
    ↓
显示事件标题 + 描述 + 3 个选项按钮
    ↓
玩家点击选项
    ↓
施加 regionWeights → 启动 2500ms lerp 过渡
    ↓
显示反馈文字（4200ms 后淡出）
    ↓
记录 experiencedEvents，eventsResolved + 1
    ↓
若 eventsResolved % 10 === 0 → 重新计算脑型
    ↓
[等待下一个事件]
```

---

## 3. 数据层结构与关联

系统分为 **4 个数据层**，从底层到高层依次推导：

```
Layer 0: 事件选项 (regionWeights)
       ↓ lerp 施加
Layer 1: 瞬时激活值 (activations, 0–1)
       ↓ 加权公式
Layer 2: 情绪维度 (emotions, 0–1, 实时)
       ↓ 正值累积
Layer 3: 累积激活 (regionAccumulated, 终身)
       ↓ 每10事件计算
Layer 4: 脑型分类 (brainType)
```

### Layer 0 → Layer 1：激活施加

选项选中后，`regionWeights` 中每个区域的权重值通过 **lerp（线性插值）** 在 2500ms 内平滑施加到当前激活值上：

```
新激活值 = lerp(当前激活值, 当前激活值 + weight, easeOut(进度))
easeOut(t) = 1 - (1-t)³   // 三次缓出，结尾减速
```

lerp 完成后，恢复 **自然衰减**：

```
activations[region] -= 0.0006 × dt   // 每帧缓慢归零
激活值始终 clamp 到 [0, 1]
```

### Layer 1 → Layer 2：情绪计算

每帧从瞬时激活值实时推算 8 个情绪维度（详见第 5 节）。

### Layer 1 → Layer 3：累积统计

仅当某区域激活值**正向增加**时，才向 `regionAccumulated` 累加：

```javascript
if (newActivation > oldActivation) {
  regionAccumulated[region] += (newActivation - oldActivation)
}
```

**负值权重（抑制效果）不计入累积。** 累积值终身不归零，是脑型分类的唯一依据。

### Layer 3 → Layer 4：脑型分类

见第 7 节。

---

## 4. 脑区系统

共 7 个脑区，定义在 `data/brainRegions.json`：

| ID | 中文名 | 英文名 | 主要职能 |
|----|--------|--------|----------|
| `prefrontal` | 前额叶 | Prefrontal Cortex | 决策、计划、自我控制 |
| `amygdala` | 杏仁核 | Amygdala | 情绪反应、恐惧、愉悦 |
| `hippocampus` | 海马体 | Hippocampus | 记忆形成、空间导航 |
| `basal_ganglia` | 基底核 | Basal Ganglia | 奖励回路、运动控制 |
| `cerebellum` | 小脑 | Cerebellum | 运动协调、节奏感 |
| `thalamus` | 丘脑 | Thalamus | 感觉信号中继 |
| `cingulate` | 扣带回 | Cingulate Cortex | 注意力、情绪调节 |

每个脑区存储：

```json
{
  "id": "prefrontal",
  "name_zh": "前额叶",
  "name_en": "Prefrontal Cortex",
  "description_zh": "...",
  "description_en": "...",
  "color_base": [28, 60, 160],
  "color_active": [100, 170, 255]
}
```

---

## 5. 情绪维度系统

共 8 个情绪维度，公式定义在 `data/emotionMap.json`，每帧实时计算：

| 维度 | 公式 | 含义 |
|------|------|------|
| **Pleasure（愉悦）** | BG×0.6 + AMY×0.4 | 奖励感受 + 情绪愉悦 |
| **Stress（压力）** | AMY×0.6 + CG×0.4 | 威胁反应 + 情绪调节负荷 |
| **Motivation（动力）** | BG×0.7 + PFC×0.3 | 驱动力 + 目标导向 |
| **Focus（专注）** | PFC×0.65 + CG×0.35 | 注意力控制 + 执行控制 |
| **Memory（记忆）** | HPC×0.7 + PFC×0.3 | 编码能力 + 检索能力 |
| **Social（社交）** | AMY×0.5 + PFC×0.5 | 情绪感知 + 心智理论 |
| **Creative（创意）** | PFC×0.4 + CG×0.35 + HPC×0.25 | 计划 + 联想 + 经验调用 |
| **Fluency（流畅）** | CB×0.8 + THL×0.2 | 执行流畅度 + 唤醒水平 |

**情绪历史：** 每帧将当前 8 维情绪快照压入 `emotionHistory`，只保留最近 200 条，用于可视化趋势。

---

## 6. 事件系统

### 6.1 事件池调度

- 启动时将 `events.json` 中所有事件 **打乱顺序** 形成队列
- 队列耗尽后重新打乱（循环播放）
- 事件间隔随机：3000–6000ms

### 6.2 事件数据结构

```json
{
  "id": "morning_coffee",
  "level": 1,
  "title_zh": "早晨的咖啡",
  "title_en": "Morning Coffee",
  "description_zh": "你的大脑刚刚启动...",
  "description_en": "Your brain is just booting up...",
  "options": [
    {
      "text_zh": "立刻喝掉，快速启动",
      "text_en": "Chug it immediately",
      "regionWeights": {
        "prefrontal":    0.3,
        "amygdala":      0.1,
        "hippocampus":   0.1,
        "basal_ganglia": 0.5,
        "cerebellum":    0.2,
        "thalamus":      0.4,
        "cingulate":     0.0
      },
      "feedback_zh": "咖啡因涌入...",
      "feedback_en": "Caffeine rushes in..."
    }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 全局唯一标识符，用于 `experiencedEvents` 去重记录 |
| `level` | 1–4 | 事件强度等级（当前仅供参考，未影响调度逻辑） |
| `title_zh/en` | string | 双语标题 |
| `description_zh/en` | string | 双语情境描述 |
| `options` | array | 固定 3 个选项（少于或多于 3 个会导致 UI 布局异常） |
| `text_zh/en` | string | 双语选项文本 |
| `regionWeights` | object | 7 个脑区的权重增量，必须包含全部 7 个 key |
| `feedback_zh/en` | string | 选择后显示的双语反馈语 |

---

## 7. 脑型分类系统

**触发时机：** 每完成 10 个事件重新计算一次。

**计算依据：** 仅使用 `regionAccumulated`（累积激活，不受衰减影响）。

### 7.1 第一维：脑层归属

三层脑区的加权得分：

```
爬行脑层 = cerebellum × 0.7 + thalamus × 0.3
边缘层   = amygdala × 0.45 + hippocampus × 0.35 + basal_ganglia × 0.2
皮层     = prefrontal × 0.55 + cingulate × 0.45
```

取三者中最高分对应的层（总激活 < 0.5 时返回 `null`，等待更多数据）。

### 7.2 第二维：BIS/BAS 倾向

```
BAS（趋近）= basal_ganglia × 0.55 + prefrontal × 0.45
BIS（回避）= amygdala × 0.6 + cingulate × 0.4

ratio = BAS / (BAS + BIS)
  ratio > 0.6  → "approach"（趋近型）
  ratio < 0.4  → "avoidant"（回避型）
  其余         → "balanced"（平衡型）
```

### 7.3 九种脑型

| 脑层 | 趋近 | 平衡 | 回避 |
|------|------|------|------|
| **爬行脑** | ⚙️ Gear 齿轮脑 | 🪨 Bedrock 基岩脑 | 🐚 Shell 贝壳脑 |
| **边缘** | 🔥 Furnace 熔炉脑 | 🌿 Root 根系脑 | 🌊 Deep Sea 深海脑 |
| **皮层** | ⚡ Arc 弧光脑 | 🌐 Network 网络脑 | 🔬 Microscope 显微镜脑 |

---

## 8. 存档系统

**自动保存间隔：** 每 30 秒（仅游戏已开始且已初始化时触发）。

**存储位置：** `localStorage`，键名 `"adopt-a-brain-save"`。

**存档内容：**

```json
{
  "brainName": "小明的大脑",
  "activations": { "prefrontal": 0.3, "amygdala": 0.1, ... },
  "emotions": { "pleasure": 0.4, "stress": 0.2, ... },
  "experiencedEvents": ["morning_coffee", "bad_dream"],
  "playTimeSeconds": 1234.5,
  "stats": {
    "eventsResolved": 30,
    "peakPleasure": 0.87,
    "peakStress": 0.65,
    "totalActivation": 12.4,
    "regionAccumulated": { "prefrontal": 3.2, "amygdala": 2.1, ... }
  }
}
```

**读取逻辑：** 启动时若有存档，恢复全部字段后**直接进入游戏**（不显示命名界面）。

---

## 9. 渲染系统

共 5 个画布，均在 `renderer.js` 中实现：

| 画布 ID | 内容 | 视角 |
|---------|------|------|
| `canvas-bg` | 浮动气泡背景动画 | — |
| `canvas-brain` | 脑区激活侧视图（像素风） | 侧面 |
| `canvas-eeg` | EEG 波形滚动显示 | — |
| `canvas-fmri` | fMRI 热力图 | 冠状面（正面） |
| `canvas-axial` | 脑区激活俯视图（像素风） | 俯视 |

**颜色规则：** 每个脑区有 `color_base`（静息）和 `color_active`（激活）两种 RGB 值，根据瞬时激活值在 0.12–1.0 之间线性插值混合。

---

## 10. 新增事件规范

所有事件统一维护在 `data/events.json` 的顶层数组中。

### 10.1 必须遵守的规则

**规则 1：ID 全局唯一**
```json
"id": "my_new_event_snake_case"
```
ID 用于 `experiencedEvents` 去重。重复 ID 会导致事件被错误标记为"已体验"。命名规范：`小写字母 + 下划线`。

**规则 2：options 固定 3 个**
UI 按钮区固定渲染 3 个选项。少于 3 个会留空白按钮，多于 3 个超出部分会被忽略。

**规则 3：regionWeights 必须包含全部 7 个 key**
```json
"regionWeights": {
  "prefrontal":    0.0,
  "amygdala":      0.0,
  "hippocampus":   0.0,
  "basal_ganglia": 0.0,
  "cerebellum":    0.0,
  "thalamus":      0.0,
  "cingulate":     0.0
}
```
缺少任何 key 会在计算中产生 `undefined`，导致激活值变 `NaN`，后续情绪和脑型计算全部崩溃。

**规则 4：权重值范围 [-0.3, 0.7]**
- 正值：激活（增强）该区域，同时计入累积激活
- 负值：抑制该区域，**不计入**累积激活（不影响脑型方向）
- 超出范围不会报错，但会破坏激活值的 0–1 边界，导致可视化异常

**规则 5：双语字段不可缺失**
以下字段必须同时提供中英文版本：
- `title_zh` / `title_en`
- `description_zh` / `description_en`
- 每个 option 的 `text_zh` / `text_en`
- 每个 option 的 `feedback_zh` / `feedback_en`

缺失英文字段在 UI 中会显示 `undefined`。

### 10.2 事件设计建议

**权重的脑区语义一致性**

选项的效果应与其脑区的神经科学含义对应：

| 想表达的效果 | 应激活的区域 |
|---|---|
| 做了有条理的决策 | prefrontal ↑ |
| 产生了强烈情绪反应 | amygdala ↑ |
| 触发了回忆 | hippocampus ↑ |
| 获得了即时奖励感 | basal_ganglia ↑ |
| 身体自动完成了某动作 | cerebellum ↑ |
| 感官被强烈刺激 | thalamus ↑ |
| 控制住了冲动 | cingulate ↑ |
| 压力/冲突场景 | amygdala ↑, cingulate ↑ |
| 回避、选择不行动 | amygdala ↑（恐惧），prefrontal 低或负 |

**每个选项的权重应有明显差异**

好的事件设计：三个选项各自激活不同的脑区组合，代表不同的行为策略（例如：情绪化反应 vs 理性分析 vs 回避）。

避免三个选项权重几乎相同——这会让玩家的选择对脑型发展没有差异化影响。

**level 字段参考标准**

| level | 情景特征 | 权重强度参考 |
|---|---|---|
| 1 | 日常小事，低强度 | 最高权重 ≤ 0.4 |
| 2 | 有一定挑战性 | 最高权重 ≤ 0.55 |
| 3 | 压力/冲突场景 | 最高权重 ≤ 0.65 |
| 4 | 高风险决策 | 最高权重可达 0.7 |

### 10.3 新增事件的完整模板

```json
{
  "id": "unique_event_id",
  "level": 2,
  "title_zh": "事件标题（中文）",
  "title_en": "Event Title (English)",
  "description_zh": "简短的情境描述，1-2句，设置场景。（中文）",
  "description_en": "Short context description, 1-2 sentences. (English)",
  "options": [
    {
      "text_zh": "选项A的行动描述",
      "text_en": "Option A action description",
      "regionWeights": {
        "prefrontal":    0.5,
        "amygdala":      0.1,
        "hippocampus":   0.1,
        "basal_ganglia": 0.3,
        "cerebellum":    0.0,
        "thalamus":      0.1,
        "cingulate":     0.2
      },
      "feedback_zh": "选择A后，大脑的反应描述。",
      "feedback_en": "Description of brain's response after choosing A."
    },
    {
      "text_zh": "选项B的行动描述",
      "text_en": "Option B action description",
      "regionWeights": {
        "prefrontal":    0.1,
        "amygdala":      0.5,
        "hippocampus":   0.2,
        "basal_ganglia": 0.1,
        "cerebellum":    0.0,
        "thalamus":      0.1,
        "cingulate":     0.3
      },
      "feedback_zh": "选择B后，大脑的反应描述。",
      "feedback_en": "Description of brain's response after choosing B."
    },
    {
      "text_zh": "选项C的行动描述",
      "text_en": "Option C action description",
      "regionWeights": {
        "prefrontal":    0.2,
        "amygdala":      0.2,
        "hippocampus":   0.4,
        "basal_ganglia": 0.2,
        "cerebellum":    0.1,
        "thalamus":      0.0,
        "cingulate":     0.1
      },
      "feedback_zh": "选择C后，大脑的反应描述。",
      "feedback_en": "Description of brain's response after choosing C."
    }
  ]
}
```

---

## 11. 扩展其他系统的规范

### 11.1 新增脑区

**改动范围广，谨慎操作：**

1. `data/brainRegions.json` — 添加新区域的元数据
2. `gameState.js` — 在 `activations` 和 `regionAccumulated` 中添加新 key
3. `data/emotionMap.json` — 决定新脑区参与哪些情绪公式
4. `brainModel.js` — 更新 `computeEmotions()` 和脑型分类公式
5. `data/events.json` — **所有现有事件的所有选项** 都必须添加新 key（否则触发 NaN）
6. `renderer.js` — 在两个脑视图中添加新区域的像素映射

### 11.2 新增情绪维度

1. `data/emotionMap.json` — 添加新公式（使用现有脑区 key）
2. `gameState.js` — 在 `emotions` 对象中添加新 key
3. `brainModel.js` — 在 `computeEmotions()` 中实现计算
4. `renderer.js` — 在情绪 chip 渲染中添加新维度
5. `index.html` — 添加对应的 DOM 元素

### 11.3 新增脑型

1. `brainModel.js` — 修改 `classifyBrainType()` 中的阈值或维度逻辑
2. 在脑型定义对象中添加新条目（emoji, name_zh, name_en, description_zh, description_en）
3. 注意：新脑型若依赖新的维度分类，需同步更新分类逻辑

---

## 附录：常见问题

**Q：为什么某些事件不再出现？**
A：事件池以随机顺序循环，短期内可能感觉某事件不出现，但最终都会轮到。`experiencedEvents` 仅用于统计，不影响调度。

**Q：脑型为什么一直是 null？**
A：前 10 个事件完成之前，脑型不显示。此外若总激活量 < 0.5，也会返回 null（极少发生）。

**Q：负权重选项是否会让脑型"反向"变化？**
A：不会。累积激活只记录正向增量，负权重只影响瞬时激活和当帧情绪，不改变长期脑型方向。

**Q：修改事件后需要清档吗？**
A：仅修改现有事件的描述/反馈文字，无需清档。若修改 `id` 或 `regionWeights`，建议在游戏内点击"New Brain"重置，确保行为一致。
