# dsh-session-lock · 对话锁

给 DeepSeek Harness 侧边栏的每个对话加一把锁。锁上之后**只有对话区**被磨砂遮罩盖住并弹出密码框，左侧侧边栏照常使用；离开对话、切到后台、窗口失焦都会重新锁定。

> Lock any conversation in the DeepSeek Harness sidebar. Only the conversation area is covered — the sidebar keeps working, and locked work keeps running.

![icon](icon.svg)

## 特性

- **每行一把锁**：侧边栏对话行尾的锁按钮，点一下即锁；再点输入密码永久解锁。
- **只遮对话区**：遮罩从侧边栏右边缘开始，标题栏、侧边栏、底部面板都不受影响。
- **自动重锁**：窗口失焦、切到后台、页面隐藏、切换对话，都会立刻恢复锁定。
- **不打断任务**：锁定只是界面层，正在跑的回合继续跑，token 照常计费，输出照常写进会话日志。遮罩上会显示「后台任务仍在运行」。
- **密码存 Host**：密码摘要与锁状态落在 `<DSH_HOME>/session-lock/state.json`，页面上清 localStorage 解不开。
- **三种找回**：Windows 登录密码（实机验证通过才启用）、强制冷静后清空、改密码。
- **默认策略**：新对话默认上锁、锁定后隐藏侧边栏标题、从归档恢复的三档策略、一键上锁 / 一键解锁。

## 安装

**插件市场**：设置 → 插件 → 发现，搜索 `dsh-session-lock`。

**命令行**：

```powershell
dsh plugin --profile desktop add github:lmk2215/dsh-session-lock
```

装完重启一次 DSH（Host 半需要加载），然后打开 **设置 → 对话锁** 设置密码。

要求 DSH `>= 0.2.0-rc.1`、Node `>= 20`。无需构建步骤，装的是源码本身。

## 用法

| 位置 | 行为 |
| --- | --- |
| 侧边栏对话行尾 🔒 | 锁定该对话；第一次会先让你设置解锁密码 |
| 侧边栏对话行尾 🔓（琥珀色） | 输入密码后**永久**解锁该对话 |
| 锁定中的对话区 | 磨砂遮罩 + 密码框 + 「忘记密码？」入口 + 后台任务状态 |
| 设置 → 对话锁 | 状态、修改密码、找回通道、默认设置 |

临时查看会在这些时机失效并重新上锁：窗口失焦、`pagehide`、页面隐藏、切换到别的对话。

## 找回密码

三条路，各自独立，可在设置里启用：

| 通道 | 需要什么 | 说明 |
| --- | --- | --- |
| 旧密码 | 记得它 | 这是「修改密码」，不是找回 |
| Windows 登录密码 | 这台机器的 Windows 账户密码 | 启用时用 `.NET PrincipalContext('Machine').ValidateCredentials` 真实验证一次，通过才开。微软账户、无密码账户会验证失败——所以别人的机器有密码就能用，没有就用不了 |
| 强制冷静 | 时间 | 在**设置密码 / 修改密码时**选定 1 / 6 / 24 / 72 / 168 小时。到期自动清空密码并解除全部锁。冷静期间无法手动取消，但输入正确密码可以中止 |

三条都不启用时，设置页会红字警告：忘记密码只能删数据。

## 隐私与边界

这把锁挡的是**旁人看到屏幕**。

- 会话文件本身在 `~/.dsh/sessions/<workspace>/<sessionId>/session.v4.jsonl.zstd`，zstd 是压缩不是加密；能登进你的系统账户、能读这些文件的人，本来就能直接读会话。
- 冷静期依赖系统时钟，把时钟往前调可以提前到期；插件会记录并在设置页提示时钟被调整过。
- 密码摘要用 PBKDF2-SHA256（随机 16 字节盐、120000 轮），连错 5 次锁定输入 30 秒。
- 两条本地路由（`/session-lock/state`、`/session-lock/action`）要求自定义请求头，跨站表单发不出来；它们只绑定在回环地址上。

## 数据与卸载

| 内容 | 位置 |
| --- | --- |
| 密码摘要、锁清单、偏好、找回状态 | `<DSH_HOME>/session-lock/state.json` |
| 旧版遗留的 localStorage 记录 | 首次读取时导入 Host 并删除 |

卸载：`dsh plugin --profile desktop remove dsh-session-lock`，或插件市场里停用。卸载不会删除 `state.json`；不需要就手动删掉那个目录。

## 实现

| Slot | 用途 |
| --- | --- |
| `sidebar.workspaces.session.row.action` | 对话行尾的锁 / 开锁按钮（`order: 150`） |
| `shell.overlay` | 遮罩、密码框、全部对话框（`order: 1000`） |
| `settings.section` | 设置页「对话锁」（`order: 26`） |

- 遮罩用 `position: fixed`，左边界取自 frame 自身的 `grid-template-columns` 第一段，锚点用 layout 打的 `data-shell-overlay`。
- 对话框用原生 `<dialog>.showModal()`，落在浏览器 top layer，因此从设置页打开的弹窗不会被设置页压住。
- Host 半只做三件事：读写 `state.json`、校验密码、调用 Windows 凭据校验。没有工具、没有会话事件、不发网络请求。

开发自测：`python tests/api_probe.py <port>` 跑一遍全部路由动作。

## License

MIT
