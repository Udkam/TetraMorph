# 文档入口

日常只需从这里进入；历史任务里的 ACTIVE/BLOCKED 状态不代表当前任务。

| 要找什么 | 固定入口 |
| --- | --- |
| 当前状态、待办与边界 | [CURRENT_TASK.md](CURRENT_TASK.md) |
| 当前玩法与设计原则 | [DESIGN.md](DESIGN.md) |
| 上线、验证、回滚 | [release/README.md](release/README.md) |
| 文件放置规则 | [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) |
| 提交规则 | [COMMIT_POLICY.md](COMMIT_POLICY.md) |
| 变更记录 | [logs/CHANGELOG.md](logs/CHANGELOG.md) |
| 历史与证据导航 | [archive/README.md](archive/README.md) |

## 新文件放置规则

- 当前规范只更新固定入口，不再将长执行日志追加到 DESIGN/CURRENT_TASK。
- 每次任务过程放 `agent-runs/<任务号>/`；状态、QA、证据链接写在同一任务内。
- 可复用、绑定源码版本的浏览器证据放 `evidence/<任务号>/`。
- 新的本地截图、日志、临时脚本放 `.local/`，不进入 Git。
- `workstreams/` 中夹具和创作记录有代码依赖，不能当普通旧文档删除。
- 旧 `phases/`、`qa/`、`screenshots/` 路径保留兼容；不继续分散新文档。
