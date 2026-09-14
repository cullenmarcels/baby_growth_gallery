# baby_growth_gallery

小福宝成长记的前后端分离 Monorepo。已提供手机号认证、Redis 服务端会话、响应式认证页面、API 健康检查与本地数据设施；当前正在实施多家庭身份、角色权限、单次邀请和家庭动态基础，宝宝与照片等内容业务仍未开放。

## 环境要求

- Node.js `24.20.0`
- pnpm `11.21.0`（可用 Corepack 管理）
- Docker Desktop + WSL2（运行本地基础设施或完整容器栈时需要）

## 快速开始

```powershell
pnpm install --frozen-lockfile
pnpm infra:up
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
pnpm dev
```

- Web：<http://localhost:5173>
- 开发状态页：<http://localhost:5173/system/status>
- API live：<http://localhost:3000/api/v1/health/live>
- API ready：<http://localhost:3000/api/v1/health/ready>
- OpenAPI：<http://localhost:3000/api/openapi.json>
- Swagger UI：<http://localhost:3000/api/docs>
- MinIO Console：<http://localhost:9001>

默认开发凭据和固定验证码 `246810` 只用于本机开发，不会由 API 或页面回显，也不可用于生产。生产环境禁止启用固定验证码，并要求单独配置足够强度的 Session 与 HMAC 秘密。所有运行参数和占位值见根目录及各应用的 `.env.example`。

本阶段的用户协议与隐私政策是待正式法律审核的开发草案；当前实现不代表已经具备公开运营条件。

若本机网络无法直接访问 Docker Hub 或 Quay，可先把根目录 `.env.example` 复制为不入库的根 `.env`，再仅替换其中镜像变量的 registry 前缀；版本标签和 MinIO digest 必须保持不变。项目默认配置仍使用官方镜像地址。

容器冷构建访问 npm registry 受限时，也可只在根 `.env` 覆盖 `NPM_REGISTRY`。安装仍使用已提交的 frozen lockfile 和完整性校验；默认值为官方 npm registry。

若默认宿主端口已被占用或被 Windows/Hyper-V 保留，可在同一个根 `.env` 中覆盖 `POSTGRES_PORT`、`REDIS_PORT`、`MINIO_API_PORT`、`MINIO_CONSOLE_PORT`、`API_PORT` 或 `WEB_PORT`；容器间通信仍使用标准端口。宿主机直跑 API 时，要让 `DATABASE_URL` 等应用配置与被覆盖的宿主端口保持一致。

## 常用命令

| 命令                                                        | 用途                            |
| ----------------------------------------------------------- | ------------------------------- |
| `pnpm dev`                                                  | 并行启动 Web 与 API             |
| `pnpm dev:web` / `pnpm dev:api`                             | 单独启动一个应用                |
| `pnpm infra:up` / `pnpm infra:down`                         | 启停基础设施，保留具名卷        |
| `pnpm stack:up` / `pnpm stack:down`                         | 构建并启停完整容器栈            |
| `pnpm api:generate`                                         | 从 OpenAPI 确定性生成客户端类型 |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` | 工程质量检查                    |
| `pnpm e2e`                                                  | Playwright 端到端检查           |
| `pnpm validate`                                             | 聚合工程检查与项目知识库验证    |

## 目录

- `apps/web`：React/Vite 客户端，独立 Nginx 生产镜像。
- `apps/api`：NestJS API，独立 Node.js 生产镜像。
- `packages/api-client`：由 OpenAPI 生成并提交的类型安全客户端。
- `infra`：Nginx 和容器基础设施配置。
- `docs`、`rules`、`tests`、`hooks`：项目知识库、约束和验收入口。

更完整的技术边界见 `docs/specs/SPEC-20260908-5BD26QCA-project-foundation/spec.md`。
