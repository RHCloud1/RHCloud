<h1 align="center">
  <img src="./src-tauri/icons/icon.png" alt="RHCloud" width="112" />
  <br>
  RHCloud
</h1>

<p align="center">RHCloud 的 Windows 客户端：登录账号即可使用，节点自动同步。</p>

## 下载安装

到 [Releases](https://github.com/RHCloud1/RHCloud/releases/latest) 下载最新的 `RHCloud-<版本>-x64-setup.exe`，双击安装。

- 支持 Windows 10 / 11（64 位）。
- 安装包没有数字签名，Windows 可能提示"已保护你的电脑"，点 **更多信息 → 仍要运行**。
- 新版本可以直接覆盖安装，设置和登录状态会保留。装过 1.0.0 测试版的请先卸载再装。
- 每个安装包旁边有同名 `.sha256` 文件，可以用来核对下载是否完整。

## 使用

1. **登录**：打开后输入 RHCloud 账号和密码。登录后订阅和节点会自动导入，不需要手动复制订阅链接。
2. **连接**：在首页打开"系统代理"即可上网。浏览器和大多数软件会自动走代理。
3. **选节点**：在"节点"页选择节点，可以搜索，也可以一键测延迟。
4. **代理模式**（首页右上角）：
   - **规则**（默认）：国内网站直连，其他走代理。
   - **全局**：所有流量都走代理。
5. **TUN 模式**：有些软件不认系统代理（游戏、部分命令行工具），可以在首页打开 TUN 模式接管全部流量。第一次开启要先安装 TUN 服务，会请求管理员权限。

首页还会显示当前套餐、到期时间、流量用量，以及实时上传和下载速度。订阅每天自动更新一次。

### 设置

| 项目 | 说明 |
|---|---|
| 开机自动启动 | 登录 Windows 后自动运行 |
| 启动时隐藏窗口 | 启动后只在托盘显示 |
| 外观 | 浅色 / 深色 / 跟随系统 |
| TUN 服务 | 安装或卸载 TUN 模式需要的系统服务 |
| 账户 | 查看当前账户、退出登录 |

关闭窗口不会退出程序，程序会继续在托盘里运行。右键托盘图标可以切换代理模式、开关系统代理和 TUN，或者退出。托盘图标的颜色表示当前状态：

- 灰色：未连接
- 蓝色：系统代理已开
- 紫色：TUN 模式已开

### 本地端口

| 端口 | 协议 |
|---|---|
| 7788 | HTTP + SOCKS5 混合 |
| 7789 | SOCKS5 |
| 7790 | HTTP |

如果其他软件要手动设置代理，填 `127.0.0.1:7788` 即可。

## 常见问题

**登录失败 / 提示网络错误**
客户端内置了多个备用服务器地址，会自动切换。如果全部失败，请检查本机网络，或者稍后再试。

**开了系统代理，某个软件还是连不上**
这个软件不读系统代理设置，改用 TUN 模式。

**TUN 服务安装失败**
请确认在弹出的权限窗口里点了"是"。另外，杀毒软件可能拦截服务安装，需要临时放行。

**卸载**
如果装过 TUN 服务，先在"设置 → TUN 服务"里卸载服务，再到 Windows"设置 → 应用"里卸载 RHCloud。

## 开发

本项目基于 [Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev) v2.5.10（Tauri + React），内核是 [mihomo](https://github.com/MetaCubeX/mihomo)。原有的界面已经全部替换成更简单的 RHCloud 界面，后端基本保留原样。

### 目录

| 路径 | 内容 |
|---|---|
| `src/rhcloud/` | RHCloud 界面：登录、首页、节点、设置，以及主题 |
| `src/rhcloud/api.ts` | 面板接口（登录、获取订阅、套餐信息）和备用地址切换 |
| `src/rhcloud/sync.ts` | 把订阅导入为唯一的配置 `RHCloud`，并定时更新 |
| `src/rhcloud/storage.ts` | 本地保存登录状态 |
| `src-tauri/` | Tauri 后端（Rust）：内核管理、系统代理、托盘、安装包 |
| `branding/` | Logo 和应用图标源文件 |
| `.github/workflows/rhcloud-windows.yml` | Windows 安装包构建与发布 |

TUN 服务来自 [RHCloud-service](https://github.com/RHCloud1/RHCloud-service)，服务名是 `rhcloud_service`，不会和官方 Clash Verge 的服务冲突。

### 本地运行

需要 Node.js、pnpm 和 Rust（版本见 `rust-toolchain.toml`）：

```sh
pnpm install
pnpm run prebuild x86_64-pc-windows-msvc   # 下载 mihomo 内核和服务程序
pnpm dev                                    # 开发模式运行
pnpm build                                  # 生成安装包
```

前端只做类型检查可以用 `pnpm exec tsrs -p . --noEmit`。完整构建需要较多内存，建议在 CI 上做。

### 构建与发布

安装包由 GitHub Actions 的 **RHCloud Windows** 工作流构建：

- 推送到 `main` 会自动构建，只修改文档时跳过。构建好的安装包在这次运行的 Artifacts 里。
- 发布新版本：
  1. 修改 `package.json` 和 `src-tauri/tauri.conf.json` 里的 `version`。
  2. 推送时在提交信息里加 `[skip ci]`。
  3. 在 Actions 里手动运行 **RHCloud Windows**，勾选 `release`。它会创建 `v<version>` 的 Release 并上传安装包。

上游的其他工作流都已停用。

## 许可证

[GPL-3.0](./LICENSE)，与上游 Clash Verge Rev 相同。感谢 Clash Verge Rev、mihomo 和 Tauri 项目。
