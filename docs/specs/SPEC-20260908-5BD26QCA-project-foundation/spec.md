---
id: SPEC-20260908-5BD26QCA
type: spec
title: "前后端分离 Monorepo 工程基础规格"
status: active
created_at: 2026-09-08T17:41:41+08:00
updated_at: 2026-09-08T17:41:41+08:00
related_ids: [DES-20260908-ZVZKM07B, PLAN-20260908-KP1B7472]
supersedes: []
superseded_by: []
---

# 前后端分离 Monorepo 工程基础规格

## 目标与边界

建立一个可启动、可测试、可分别构建和部署的 `pnpm` Monorepo。第一阶段只交付工程状态页、公共健康接口、OpenAPI 客户端和本地基础设施；不实现认证、照片、家庭、成长数据、曲线或 worker 业务模块。

## 固定技术栈

| 范围 | 固定选型 |
| --- | --- |
| Runtime / Workspace | Node.js 24.20.0、pnpm 11.21.0、TypeScript 7.0.2 strict |
| Web | React 19.2.8、Vite 8.2.2、React Router 7.18.3、TanStack Query 5.102.8、React Hook Form、Zod 4.5.4 |
| API | NestJS 12.0.1、Express Adapter、REST、OpenAPI |
| Data | Prisma 7.10.0、PostgreSQL 18.6、Redis 8.4、AWS SDK v3 S3 接口、开发环境 MinIO |
| Test | Vitest 5.0.0、Testing Library、MSW、Jest、Supertest、Playwright 1.63.0 |
| Quality | ESLint Flat Config、Prettier、TypeScript strict |
| Deploy | Web 为 Nginx 静态镜像；API 为独立 Node.js 镜像；Compose 仅负责编排 |

## 工作区结构

- `apps/web`：独立 React/Vite 客户端，开发端口 5173，生产容器监听 8080。
- `apps/api`：独立 NestJS API，端口 3000，全局业务前缀 `/api/v1`。
- `packages/api-client`：由 OpenAPI 确定性生成的类型与 fetch 客户端。
- `infra/nginx`：SPA fallback、缓存策略和安全响应头。
- `infra/docker`：本地基础设施初始化资料。

## 公共接口契约

| Method | Path | 行为 |
| --- | --- | --- |
| GET | `/api/v1/health/live` | 只证明 API 进程可响应，不依赖外部设施。 |
| GET | `/api/v1/health/ready` | 检查 PostgreSQL、Redis、对象存储；全部可用时返回 200，否则返回非 2xx Problem Details。 |
| GET | `/api/openapi.json` | OpenAPI 唯一契约来源。 |
| GET | `/api/docs` | Swagger UI；开发默认开启，生产由配置决定。 |

成功响应包含 `status: "ok"`、服务名、版本、UTC ISO 8601 时间；readiness 另外包含 `postgres`、`redis`、`objectStorage` 的 `up|down` 状态。错误使用 `application/problem+json`，包含 `type`、`title`、`status`、`detail`、`instance`、`traceId`。

## 配置和安全边界

- 配置在启动时严格校验；真实 `.env`、密钥、上传和数据卷不进入 Git。
- 每个请求产生或传递追踪 ID；统一异常过滤器不得泄漏堆栈或内部秘密。
- CORS 只接受 `WEB_ORIGIN` allowlist 并允许 credentials；生产禁止通配符。
- 使用 Helmet。Swagger 的生产可见性由 `SWAGGER_ENABLED` 控制。
- 浏览器认证的后续架构固定为 Redis 服务端会话 + HttpOnly/Secure/SameSite Cookie，并对状态修改增加 Origin/CSRF 防护；本阶段不实现登录。
- 照片文件后续进入私有 S3 bucket，元数据进入 PostgreSQL；Redis 不是持久业务事实源。

## 本地和生产部署

- `infra:up` 只启动 PostgreSQL、Redis、MinIO 和确定性建桶任务，宿主机运行 Web/API 以支持热更新。
- `stack:up` 使用 `app` profile 构建并启动完整栈；所有依赖通过健康检查而不是固定等待。
- Web/API Dockerfile 可分别构建、推送和部署；Web 最终镜像不包含 API 或 Node 开发依赖，API 不托管前端。
- 生产只要求 S3 兼容对象存储，不要求 MinIO。

## 状态页验收

- Web 只从 `VITE_API_BASE_URL` 读取 API 地址，并通过生成客户端访问 readiness。
- 显示加载、成功、错误三个状态，不冒充产品首页。
- 在 375、834、1440 三个视口无横向溢出，兼顾键盘焦点、可读对比度和减少动画偏好。

## 非目标

不创建空业务模块，不接真实短信、微信、云存储账号或真实儿童数据，不增加 Turborepo、Tailwind、视觉组件库、CI 工作流或未经确认的业务表。
