# baby_growth_gallery

小福宝成长记的前后端分离 Monorepo。工程基础及 Plan A–D 已归档；Plan E 的图集、时间轴、照片详情与头像候选正在 `feature/photo-gallery-timeline` 进行界面修订，尚待新候选 Review、Regression 与人工验收。现已提供手机号认证、Redis 服务端会话、多家庭与多宝宝身份，以及私有照片直传、真实内容校验、去元数据 WebP 变体、创建者私有草稿、家庭发布和 30 天回收站。Plan E 候选增加已发布照片图集、按月时间轴、照片详情与宝宝头像选择；时间轴目前只展示照片，尚未接入里程碑。

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

照片原图只直传私有 MinIO/S3 隔离前缀，处理后删除；浏览器签名端点通过 `S3_PUBLIC_ENDPOINT` 单独配置。本地 MinIO API 不直接暴露，浏览器经存储网关访问；网关把 CORS Origin 固定为 `WEB_ORIGIN`，且只允许 `POST/GET/HEAD`。真实 S3 部署必须在私有 Bucket 配置等价 CORS。HEIC/HEIF 的 LGPL WASM 依赖当前只获准用于封闭测试，公开发布前必须按 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) 完成许可复核。

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
