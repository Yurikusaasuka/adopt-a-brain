# 领养一颗大脑 | Adopt a Brain

**v0.1.0-beta · 公开测试版 / Public Beta**

## 中文

《领养一颗大脑》是一款浏览器互动游戏。为虚拟大脑取名，在日常事件中作出选择，观察模拟脑区活动、状态指标和脑型的变化。

**[在线试玩](https://yurikusaasuka.github.io/adopt-a-brain/)**

当前为测试版本，内容和界面可能调整。

### 玩法说明

1. 为大脑取名，开始游戏。
2. 阅读事件，从三个选项中选择一种应对方式。
3. 查看脑区和状态变化。每完成 10 个事件，游戏会重新计算一次脑型。

### 界面说明

- **脑区图**：以颜色显示七个脑区的模拟激活程度。
- **状态指标**：愉悦、压力、动力、专注、记忆、社交、创意与动作流畅。
- **模拟信号**：EEG 风格波形和 fMRI 风格热力图，均非真实测量数据。
- **脑型与统计**：显示脑型、事件数、游玩时长等记录。

### 九种脑型

| 脑型 | 游戏中的特点 |
| --- | --- |
| 齿轮脑（Gear Brain） | 依赖习惯，执行稳定，但面对陌生情况较不灵活。 |
| 基岩脑（Bedrock Brain） | 稳定、耐压，但适应变化较慢。 |
| 贝壳脑（Shell Brain） | 谨慎，偏好熟悉的环境与固定程序。 |
| 熔炉脑（Furnace Brain） | 投入度高，对情绪与奖励较敏感。 |
| 根系脑（Root Brain） | 情绪相对稳定，重视关系和长期积累。 |
| 深海脑（Deep Sea Brain） | 对情绪与记忆细节较敏感。 |
| 电弧脑（Arc Brain） | 目标明确，分析后倾向迅速行动。 |
| 网络脑（Network Brain） | 在分析与感受之间保持相对均衡。 |
| 显微脑（Microscope Brain） | 倾向反复分析，行动谨慎。 |

脑型根据游戏中的累计选择计算，可能随游戏进程改变；它不是人格测试结果。

### 存档说明

进度自动保存在当前浏览器中。用同一浏览器再次打开该网址，会自动恢复存档；不同浏览器或设备之间不会同步。

要重新开始，在游戏中点击“回到菜单”，按提示再次确认，再选择“重新开始”。确认后，原有存档将被删除。清除浏览器网站数据也可能导致进度丢失。

### 脑区、行为与证据边界

现实行为来自分布式神经网络，而不是单个脑区的独立开关。项目已按参考文献复核全部 **38 个事件、114 个选项**：每个选项使用的脑区都处在文献所支持的宽泛功能范围内；经本次措辞修正后，没有保留与所列综述直接相反的脑区功能描述。

| 游戏脑区 | 文献支持的宽泛功能 | 主要对应事件 | 参考 |
| --- | --- | --- | --- |
| 前额叶（Prefrontal Cortex） | 目标维持、认知控制、计划、选择性注意与情绪调节 | 任务规划、自控、重新评价、优先级选择 | [1], [12] |
| 杏仁核（Amygdala） | 情绪学习、显著性与价值评估、威胁和奖赏相关信息、情绪对注意的影响 | 压力、夸奖、社会信号、情绪记忆 | [2], [10] |
| 海马体（Hippocampus） | 情景记忆形成与提取，以及利用记忆构建未来情境 | 回忆、学习、情境检索、明日计划 | [3], [13] |
| 基底核（Basal Ganglia） | 奖赏加工、强化学习、行动选择与习惯回路 | 即时反馈、食物/游戏/社交奖赏、重复行动 | [4], [5], [11], [16] |
| 小脑（Cerebellum） | 运动协调、运动学习及熟练动作的调节 | 行走、奔跑、哼唱、刷牙等动作 | [5] |
| 丘脑（Thalamus） | 感觉中继、注意控制、皮层网络协调及与唤醒相关的信息调节 | 感觉输入、通知、屏幕刺激、注意重定向 | [6], [17] |
| 扣带皮层（Cingulate Cortex） | 认知控制、负性情绪、疼痛与冲突相关加工 | 错误发现、任务冲突、努力维持与监控 | [7] |

八项状态指标同样只做方向性的游戏组合：愉悦参考奖赏与价值加工 [4], [10]；压力参考情绪显著性、负性情绪和控制负荷 [2], [7]；动力参考目标控制与奖赏驱动 [1], [4]；专注参考前额叶—丘脑—扣带相关的注意控制 [1], [6], [7]；记忆参考前额叶与海马相关过程 [1], [3]；社交参考情绪/社会信息和社会奖赏 [2], [16]；创意只借用记忆重组与控制过程 [1], [13]；动作流畅只借用运动协调和感觉调节 [5], [6]。这些对应关系不验证游戏中的线性公式。

跨脑区事件方面，夜间发光屏幕与入睡延迟的方向依据受控研究 [14]，咖啡因对睡眠和清醒的影响依据实验研究 [15]。这些研究支持事件的总体方向，不支持将效果精确分配为游戏中的固定脑区数值。

这是一致性审查，不是对游戏数值的实验验证。论文支持的是上述功能关联，不支持以下内容成为科学结论：

- 某个日常选择必然让某一脑区升高或降低。
- `regionWeights` 的正负方向和具体数值是测量结果。
- 八项状态指标是经过验证的心理或神经量表。
- EEG / fMRI 风格画面对应真实信号。
- 九种脑型或三个分类轴对应真实人格、脑结构或诊断。

因此，事件反馈描述的是**模型内部如何解释一次选择**。界面的“动作倾向 / 情绪记忆 / 认知控制”是中性游戏轴；内部遗留名称不代表已被现代神经科学否定的“三位一体脑”结构 [9]。趋近 / 回避轴只借用了行为动机概念，不等同于正式 BIS/BAS 量表 [8]。

### 重要说明

本项目是互动游戏，不是神经科学实验。模拟脑区活动、状态指标、EEG / fMRI 风格画面和脑型结果均不能用于心理诊断、医学判断、人格评估或真实认知能力测量。

---

## English

Adopt a Brain is a browser-based interactive game. Name your virtual brain, make choices in everyday situations, and observe changes in its simulated brain activity, state indicators, and brain type.

**[Play Online](https://yurikusaasuka.github.io/adopt-a-brain/)**

This is a beta version. Features and content may change.

### Gameplay

1. Name your brain and start the game.
2. Read each event and choose one of three responses.
3. Watch the simulated brain activity and state indicators change. Your brain type is recalculated after every 10 completed events.

### Interface

- **Brain Activity:** Displays simulated activity across seven brain regions.
- **State Indicators:** Tracks pleasure, stress, motivation, focus, memory, social engagement, creativity, and motor fluency.
- **EEG & fMRI-style Visualizations:** Program-generated signals and activity maps, not real brain measurements.
- **Brain Type & Statistics:** Shows your current brain type, completed events, playtime, and other records.

### Nine Brain Types

| Brain Type | In-game description |
| --- | --- |
| Gear Brain | Efficient with routines, but less flexible in unfamiliar situations. |
| Bedrock Brain | Steady and resilient, but slower to adapt. |
| Shell Brain | Cautious and comfortable with familiar routines. |
| Furnace Brain | Highly engaged and sensitive to emotion and reward. |
| Root Brain | Emotionally steady and relationship-oriented. |
| Deep Sea Brain | Sensitive to emotion and details in memory. |
| Arc Brain | Goal-oriented and quick to act after analysis. |
| Network Brain | Relatively balanced between analysis and emotional responses. |
| Microscope Brain | Highly analytical, cautious, and prone to overthinking. |

Brain types are fictional game categories, not psychological assessments. Your type may change as you play.

### Saving Your Progress

Progress is automatically saved in your browser. Opening the game again in the same browser restores your previous session. Saves are not synchronized between devices or browsers.

To restart, select **Back to Menu**, complete the confirmation step, and choose **New Brain**. Starting a new game deletes your previous save. Clearing your browser's site data may also remove your progress.

### Brain Regions, Behavior, and Evidence Boundaries

Real behavior arises from distributed neural networks rather than isolated brain-region switches. All **38 events and 114 choices** were reviewed against the references below. Every region assignment stays within a broad function supported by the literature; after the wording corrections in this review, no retained description assigns a region a function directly contrary to the cited reviews.

| In-game region | Broad literature-supported functions | Main event categories | References |
| --- | --- | --- | --- |
| Prefrontal Cortex | Goal maintenance, cognitive control, planning, selective attention, and emotion regulation | Planning, self-control, reappraisal, prioritization | [1], [12] |
| Amygdala | Emotional learning, salience and value evaluation, threat- and reward-related information, and emotional influences on attention | Stress, praise, social signals, emotional memory | [2], [10] |
| Hippocampus | Episodic memory formation and retrieval, and using memory to construct future events | Recall, learning, contextual retrieval, future planning | [3], [13] |
| Basal Ganglia | Reward processing, reinforcement learning, action selection, and habit-related circuits | Immediate feedback, food/game/social reward, repeated actions | [4], [5], [11], [16] |
| Cerebellum | Motor coordination, motor learning, and adjustment of practiced movements | Walking, running, humming, brushing teeth | [5] |
| Thalamus | Sensory relay, attentional control, cortical-network coordination, and regulation connecting arousal with information processing | Sensory input, notifications, screen stimulation, attentional reorientation | [6], [17] |
| Cingulate Cortex | Cognitive control, negative affect, pain, and conflict-related processing | Error detection, task conflict, sustained effort, monitoring | [7] |

The eight state indicators are also directional game composites: pleasure draws on reward and value processing [4], [10]; stress on emotional salience, negative affect, and control demand [2], [7]; motivation on goal control and reward drive [1], [4]; focus on prefrontal–thalamic–cingulate attention control [1], [6], [7]; memory on prefrontal and hippocampal processes [1], [3]; social engagement on emotional/social information and social reward [2], [16]; creativity only on memory recombination and control processes [1], [13]; and motor fluency only on motor coordination and sensory regulation [5], [6]. These associations do not validate the game's linear formulas.

For cross-region events, controlled research supports the overall direction linking evening light-emitting screens with delayed sleep [14], and experimental work supports caffeine's effects on sleep and alertness [15]. These studies do not support assigning those effects to the game's exact fixed region values.

This is a consistency review, not experimental validation of the game values. The papers support the broad associations above; they do not establish that:

- A particular everyday choice necessarily increases or decreases a particular region.
- The sign or magnitude of a `regionWeight` is a measured effect.
- The eight state indicators are validated psychological or neurological scales.
- The EEG/fMRI-style displays reproduce real signals.
- The nine brain types or three classification axes correspond to real personalities, anatomy, or diagnoses.

Event feedback therefore explains **how the game model interprets a choice**. The visible “Action / Emotion & Memory / Cognitive Control” axes are neutral game dimensions; legacy internal names do not endorse the scientifically rejected triune-brain model [9]. The approach–avoidance axis is only loosely inspired by behavioral motivation research and does not reproduce the validated BIS/BAS scales [8].

### Disclaimer

Adopt a Brain is an interactive game, not a neuroscience experiment or diagnostic tool. Its simulated brain activity, state indicators, EEG/fMRI-style visuals, and brain types must not be used to assess mental health, personality, medical status, or real cognitive abilities.

---

## 参考文献 | References

1. Miller, E. K., & Cohen, J. D. (2001). [An Integrative Theory of Prefrontal Cortex Function](https://doi.org/10.1146/annurev.neuro.24.1.167). *Annual Review of Neuroscience*.
2. Phelps, E. A., & LeDoux, J. E. (2005). [Contributions of the Amygdala to Emotion Processing: From Animal Models to Human Behavior](https://doi.org/10.1016/j.neuron.2005.09.025). *Neuron*.
3. Squire, L. R., & Wixted, J. T. (2011). [The Cognitive Neuroscience of Human Memory Since H.M.](https://doi.org/10.1146/annurev-neuro-061010-113720). *Annual Review of Neuroscience*.
4. Haber, S. N., & Knutson, B. (2010). [The Reward Circuit: Linking Primate Anatomy and Human Imaging](https://doi.org/10.1038/npp.2009.129). *Neuropsychopharmacology*.
5. Doya, K. (2000). [Complementary Roles of Basal Ganglia and Cerebellum in Learning and Motor Control](https://doi.org/10.1016/S0959-4388(00)00153-7). *Current Opinion in Neurobiology*.
6. Halassa, M. M., & Kastner, S. (2017). [Thalamic Functions in Distributed Cognitive Control](https://doi.org/10.1038/s41593-017-0020-1). *Nature Neuroscience*.
7. Shackman, A. J., et al. (2011). [The Integration of Negative Affect, Pain and Cognitive Control in the Cingulate Cortex](https://doi.org/10.1038/nrn2994). *Nature Reviews Neuroscience*.
8. Carver, C. S., & White, T. L. (1994). [Behavioral Inhibition, Behavioral Activation, and Affective Responses to Impending Reward and Punishment: The BIS/BAS Scales](https://doi.org/10.1037/0022-3514.67.2.319). *Journal of Personality and Social Psychology*.
9. Steffen, P. R., Hedges, D., & Matheson, R. (2022). [The Brain Is Adaptive Not Triune: How the Brain Responds to Threat, Challenge, and Change](https://doi.org/10.3389/fpsyt.2022.802606). *Frontiers in Psychiatry*.
10. Baxter, M. G., & Murray, E. A. (2002). [The Amygdala and Reward](https://doi.org/10.1038/nrn875). *Nature Reviews Neuroscience*.
11. Graybiel, A. M. (2008). [Habits, Rituals, and the Evaluative Brain](https://doi.org/10.1146/annurev.neuro.29.051605.112851). *Annual Review of Neuroscience*.
12. Ochsner, K. N., Silvers, J. A., & Buhle, J. T. (2012). [Functional Imaging Studies of Emotion Regulation: A Synthetic Review and Evolving Model of the Cognitive Control of Emotion](https://doi.org/10.1111/j.1749-6632.2012.06751.x). *Annals of the New York Academy of Sciences*.
13. Addis, D. R., & Schacter, D. L. (2008). [Constructive Episodic Simulation: Temporal Distance and Detail of Past and Future Events Modulate Hippocampal Engagement](https://doi.org/10.1002/hipo.20405). *Hippocampus*.
14. Chang, A.-M., Aeschbach, D., Duffy, J. F., & Czeisler, C. A. (2015). [Evening Use of Light-Emitting eReaders Negatively Affects Sleep, Circadian Timing, and Next-Morning Alertness](https://doi.org/10.1073/pnas.1418490112). *Proceedings of the National Academy of Sciences*.
15. Drake, C., Roehrs, T., Shambroom, J., & Roth, T. (2013). [Caffeine Effects on Sleep Taken 0, 3, or 6 Hours before Going to Bed](https://doi.org/10.5664/jcsm.3170). *Journal of Clinical Sleep Medicine*.
16. Fareri, D. S., & Delgado, M. R. (2014). [Social Rewards and Social Networks in the Human Brain](https://doi.org/10.1177/1073858414521869). *The Neuroscientist*.
17. Nakajima, M., & Halassa, M. M. (2017). [Thalamic Control of Functional Cortical Connectivity](https://doi.org/10.1016/j.conb.2017.04.001). *Current Opinion in Neurobiology*.
