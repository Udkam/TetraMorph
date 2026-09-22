# T38 — 可部署候选 / 2026-09-22

状态：工程候选，主观视听验收待用户确认；未发布正式版本标签，未部署到外部站点。
产品代码候选 `d5b46903`，后续提交仅补验收脚本、证据和文档。

## 本轮交付

- 四种异变材质：冷晶、陶块裂纹、哑光金、向下刻槽紫晶；统一 Next、活动、落地与 Ghost。
- 冰冻／重力增加局部因果提示；Bomb 使用分块压力面和较轻镜头位移；倍率碎晶不遮挡数字。
- Bomb 改为短促阻尼陶块敲裂声，正常和连锁同源，保留视觉冲击时刻；重力与倍率音色收敛。
- 生存模式的涨层和消行奖励原子结算，不再先挤掉顶层再下降，奖励不再掩盖最终溢出。
- 损坏／未来版本／读取失败的排行榜不被空数据覆盖；写失败明确显示会话保存限制。
- React 渲染失败和图形初始化失败都有非破坏性恢复入口。
- Pixi 8.21.0、Vitest 4.1.11 与定向间接依赖更新，完整 npm audit 为 0 告警。
- CI 覆盖锁文件安装、审计、类型、全量测试、构建和实际生产浏览器冒烟，产出静态包。

## 当前玩法与明确边界

四种模式：经典（五档节奏）、生存、异变（冰冻／重力／Bomb／倍率）、残局。
残局 46 关，分布为 5 / 25 / 16，保留现有三个真实 mastery 证明。
用户明确搁置的 Horizon / Terrace / Keystone 精确证明不属于发布门槛，没有重新搜索。
音效和材质的主观满意度不能由自动测试证明；最后统一验收。

本地进度保存在浏览器 localStorage，不提供账号、云同步或跨设备恢复；清理站点数据
会丢失本地进度。应固定 HTTPS 域名与端口，换域不会自动搬迁存档。
没有新引入分析追踪、网络音频或游戏服务端。

## 可重复检查

Node 24.12.0 / npm，仓库根目录：

```text
npm ci
npm audit --registry=https://registry.npmjs.org
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:release
```

本地执行结果：787 passed / 17 skipped，类型检查与构建通过；17 项为原有可选证明／
创作测试，不代表它们通过。独立 QA 的 211 项定向测试通过。生产 Chromium 冒烟覆盖
1440×900、390×844 reduced-motion、844×390 三种视口 × 四模式、真实输入、设置关闭、
SPA 退出、残局地址刷新、存档禁用。视口模拟不等于实体手机性能或 Safari 实机认证。
音频监听器和重启清理还由现有 runtime/audio 单元测试覆盖，浏览器脚本不单独证明
所有资源无泄漏。

首次远端 Ubuntu 检查：785 passed / 2 failed / 17 skipped；两项失败均来自历史
`src/authoring/endgameDiskFrontier.test.mjs` 的文件身份复用假设，并非游戏代码。
不将该失败称为通过，也不在本轮重启证明工具改造。CI 已明确为 Windows 全量测试，
Linux 仅排除这一个磁盘证明工具文件；两端都执行审计、类型、构建与浏览器冒烟。
最终远端运行结果见 GitHub Actions，不以本地通过代替。

构建仍有主 chunk 639 KB（gzip 192 KB）提示；中文字体约 4.6 MB。属于首载预算，
不是构建失败；应开启压缩和长缓存，不能宣称已经验证弱网首屏性能。

## 静态部署与回滚

1. 只上传 `dist/` 的内容，不上传仓库、node_modules、docs、测试或开发服务。
2. 部署于站点根目录。当前路由与资源是根路径，不支持未经配置的 `/subfolder/` 部署。
3. HTTPS + SPA fallback：真实静态文件优先；`/play/*`、`/endgames` 回退到 `index.html`。
   资源不存在应 404，不应将 HTML 作为 JS/字体返回。示例 Nginx：

```nginx
location /assets/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
location = /index.html {
    add_header Cache-Control "no-cache";
}
location / {
    try_files $uri $uri/ /index.html;
}
```

4. 保留前一份构建包与来源 SHA；上传新资源后再切换 index.html。不要立即删除旧
   hash 资源，避免已打开的页面加载失败。回滚替换整份已验证的旧构建，不改用户存档。
5. 上线后检查首页、四模式直达链接、刷新、字体/音频 200、触控、设置持久化与控制台。
   线上域名、主机权限和 HTTPS 配置尚未提供，因此此处是操作说明，不是部署完成证明。
6. 现有第三方许可材料在 `licenses/`；作者未指定整体源码开源许可证，不擅自添加。
   发布游戏网站不等于授予源码再分发权。

## 集中验收

运行 `npm run dev -- --host 127.0.0.1 --port 4194 --strictPort`，打开
`http://127.0.0.1:4194/docs/evidence/t38/`。按“硬降 → 正常 Bomb → 连锁 → 其他道具”
试听，再进入四模式。这个开发预览不是线上生产站点。
