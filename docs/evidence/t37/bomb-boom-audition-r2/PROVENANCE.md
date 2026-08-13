# Bomb Boom R2 来源与试听边界

状态：**隔离试听候选 / 默认不通过 / 产品接入关闭**

此目录只用于回答“真实 Boom 录音能否比此前的合成候选更贴合炸弹功能”。候选不通过产品 `AudioEngine`，不证明实际游戏中的音量、时序或混音已经完成。玩家必须在任务中明确接受具体的单炸弹与清屏方案，协调者才可另开产品接入切片。

## 归档时间与绑定

- 下载 UTC：`2026-08-13T23:23:18Z`
- 下载 Asia/Shanghai：`2026-08-14T07:23:18+08:00`
- 合同来源提交：`3ead80b7e1668a51debefaf12868eed71947c94a`
- 页面制作期间仓库已前进到其他并行提交；本证据不把任一产品 SHA 声称为已接入候选。
- 许可证：两项条目页面均标示 `CC0`；归档 `sources/CC0-1.0.txt` 为 Creative Commons Zero 1.0 法律文本。

## 来源 1：Deep Explosion

- 标题：`Deep Explosion`
- 作者：`Kodack`
- 条目 URL：<https://freesound.org/people/Kodack/sounds/258195/>
- 许可：`Creative Commons 0`；归档页面含该许可名称及免署名用途说明。
- 条目描述：深沉、低频的爆炸；页面列出原文件为 WAV、时长 2.629 秒、44.1 kHz、24-bit、双声道、679.7 KB。
- 本地媒体 URL：<https://cdn.freesound.org/previews/258/258195_2276808-hq.ogg>
- 重要边界：本地文件是 Freesound 官方公开 **HQ OGG preview**，不是条目中需登录下载的原始 24-bit WAV；文件名和页面文案均不得把它说成原始 WAV。
- 本地文件：`sources/assets/kodack-deep-explosion-hq-preview.ogg`
- 字节数：`71,650`
- SHA-256：`ae9e9f32a85678fdaddfea9159288c822a294566fe880df84bbca7bd7266716f`
- Ogg/Vorbis 头：双声道，44.1 kHz，最后 granule 115,975，对应约 `2.629819 s`。
- 下载响应：HTTP 200，`audio/ogg`，`Content-Length: 71650`，`Last-Modified: Thu, 18 Dec 2014 02:50:59 GMT`，`ETag: "54924113-117e2"`。
- 条目页面归档：`sources/pages/freesound-kodack-deep-explosion.html`，43,507 字节，SHA-256 `0c29ca88bc532fbd141a957e050f948f094c517473e896d45652eeb3dc5a96b0`。

## 来源 2：Muffled Distant Explosion

- 标题：`Muffled Distant Explosion`
- 作者：`NenadSimic`
- 条目 URL：<https://opengameart.org/content/muffled-distant-explosion>
- 许可：`CC0`；归档页面同时包含作者、许可、描述和直接 WAV 链接。
- 条目描述：低音原木鼓冲击与延迟混响，用于模拟远处巨响后的自然反射。
- 原始媒体 URL：<https://opengameart.org/sites/default/files/NenadSimic%20-%20Muffled%20Distant%20Explosion.wav>
- 本地文件：`sources/assets/nenadsimic-muffled-distant-explosion.wav`
- 字节数：`907,518`
- SHA-256：`13a0bf75af94ec6d332bc71cba489b573466e05c4b17288158b3d683b41de39f`
- WAV 头：PCM，双声道，44.1 kHz，16-bit，data 907,200 字节，对应 `5.142857 s`。
- 下载响应：HTTP 200，`Content-Length: 907518`，`Last-Modified: Sat, 19 Apr 2014 16:57:07 GMT`，`ETag: "5352aae3-dd8fe"`。
- 条目页面归档：`sources/pages/opengameart-nenadsimic-muffled-distant-explosion.html`，36,461 字节，SHA-256 `d6082eac9305ec0e8ab0dd379217f9283570a824285425f24e293343b79ec468`。

## 候选配方

所有候选均以嵌入页面的两份源字节在 Web Audio 中直接解码。只允许 `AudioBufferSourceNode`、双二阶高/低通、增益和短包络；没有振荡器、音高合成、激光上升音或商业游戏采样。页面总线包含轻量动态压缩，仅用于防止多层叠加越界。完整逐轨数值是 `audition.js` 中的可执行事实，以下是试听标签：

| 方案 | 单炸弹 | 标称时长 | 清屏 | 标称时长 |
| --- | --- | ---: | --- | ---: |
| A 直接冲击 | Deep 0.00–0.92 s，90–6200 Hz，末端快速收束 | 0.92 s | 同一 Deep 起爆，加克制 Muffled 长尾和在 56 ms 网格上的三个低传播触点 | 2.74 s |
| B 圆润厚身 | Deep 主体叠 18% Muffled 低身，80–5400 Hz | 1.08 s | 圆润起爆加更长反射，在 56 ms 网格上的四个触点逐步衰减 | 2.96 s |
| C 低沉远压 | Deep 0.96×、低通 3900 Hz，叠低频 Muffled | 1.16 s | 同字色低沉起爆，宽软长尾和在 56 ms 网格上的三个更低、更疏触点 | 2.86 s |

标称时长是试听配方的总播放窗口，不代表源媒体被转码或裁切落盘。源文件保持下载字节不变；`embedded-audio.js` 由 `generate-embedded-audio.mjs` 从源文件确定性生成，其嵌入记录再次携带字节数和 SHA-256。

## 人工门槛

页面的两个结论组默认均为“均不通过”。即使在页面中选择某一方案并勾选两项感知检查，“记录本页比较结果”也只显示本地比较摘要，始终保留“生产接入关闭”。自动验证只能证明页面、媒体、控制、时长声明和浏览器解码可重现，不能替代玩家对“接近 Boom”“清屏更长”“不刺耳”的听感判断。
