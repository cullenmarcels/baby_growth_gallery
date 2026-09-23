# 项目文档中央索引

> AI 快速菜单与可重建投影。先读 [`README.md`](./README.md)，再沿链接打开原始证据；不得把此文件的生成表格当作唯一事实源。

- 最后协议更新：`2026-09-08T11:34:45+08:00`
- 索引状态：`consistent`
- 当前阶段：工程基础、分支治理与 Plan A–E 均已归档；原 Plan E 候选由 `PLAN-20260918-RC0Y5QH3` 取代，图集、时间轴、照片详情、宝宝头像与界面修订已通过 [PR #25](https://github.com/cullenmarcels/baby_growth_gallery/pull/25) 集成到 `develop`。最终 PR Head、develop push CI、accepted／integrated 摘要一致性与精确集成回归均已通过；本阶段未执行发布分支晋升。
- 仓库协作状态：不缓存；每次运行 [`repository-preflight.ps1`](../hooks/repository-preflight.ps1)。分支治理验收集成提交为 `origin/main@19590f9db9bc55c85e9beb3608bdaec684a6a8a3`；归档工作分支为 `feature/branch-governance-archive`。
- 归档基线：[`ARCHIVE.sha256`](./ARCHIVE.sha256)
- 生成命令：`hooks/update-indexes.ps1 -Write`；核对命令：`hooks/update-indexes.ps1 -Check`

## 当前有效 Design / Spec

| ID | 类型 | 标题 | 状态 | 替代 | 被替代 | 原始文件 |
| --- | --- | --- | --- | --- | --- | --- |
<!-- GENERATED:BEGIN DESIGNS_SPECS -->
| `DES-20260908-ZVZKM07B` | `design` | 小福宝成长记 UI 设计基线 | `active` | `[]` | `[]` | [source](./designs/DES-20260908-ZVZKM07B-baby-growth-ui/design.md) |
| `SPEC-20260908-5BD26QCA` | `spec` | 前后端分离 Monorepo 工程基础规格 | `active` | `[]` | `[]` | [source](./specs/SPEC-20260908-5BD26QCA-project-foundation/spec.md) |
| `SPEC-20260909-ASMC5N7Z` | `spec` | 五层分支治理与晋升保护规格 | `active` | `[]` | `[]` | [source](./specs/SPEC-20260909-ASMC5N7Z-branch-governance/spec.md) |
| `DES-20260910-V9P4SBX8` | `design` | 账号认证与会话界面补充设计 | `active` | `[]` | `[]` | [source](./designs/DES-20260910-V9P4SBX8-auth-session-ui/design.md) |
| `SPEC-20260910-TAMMQYAH` | `spec` | 手机号认证与 Redis 会话规格 | `superseded` | `[]` | `[SPEC-20260910-VP1CDG7N]` | [source](./specs/SPEC-20260910-TAMMQYAH-auth-session/spec.md) |
| `SPEC-20260910-VP1CDG7N` | `spec` | 手机号认证与 Redis 会话规格（密码长度修订） | `active` | `[SPEC-20260910-TAMMQYAH]` | `[]` | [source](./specs/SPEC-20260910-VP1CDG7N-auth-session-password-revision/spec.md) |
| `DES-20260911-9Z3KRKCQ` | `design` | 家庭身份、成员权限与动态界面补充设计 | `active` | `[]` | `[]` | [source](./designs/DES-20260911-9Z3KRKCQ-family-identity-ui/design.md) |
| `SPEC-20260911-3YV4GCRZ` | `spec` | 家庭身份、成员权限、单次邀请与家庭动态规格 | `active` | `[]` | `[]` | [source](./specs/SPEC-20260911-3YV4GCRZ-family-identity/spec.md) |
| `DES-20260915-S2PV4FM8` | `design` | 宝宝成长业务闭环界面补充设计 | `active` | `[]` | `[]` | [source](./designs/DES-20260915-S2PV4FM8-baby-growth-mvp-ui/design.md) |
| `SPEC-20260915-8RKJ7RGM` | `spec` | 首个宝宝成长记录业务里程碑规格 | `active` | `[]` | `[]` | [source](./specs/SPEC-20260915-8RKJ7RGM-baby-growth-mvp/spec.md) |
| `DES-20260916-4XCFYD80` | `design` | 照片上传流程与管理中心界面补充设计 | `superseded` | `[]` | `[DES-20260917-8EVTR3RJ]` | [source](./designs/DES-20260916-4XCFYD80-photo-upload-ui/design.md) |
| `SPEC-20260916-5Z69DCQE` | `spec` | 照片隔离上传、安全处理、私有草稿与回收站规格 | `superseded` | `[]` | `[SPEC-20260917-NHHC01TR]` | [source](./specs/SPEC-20260916-5Z69DCQE-photo-upload-foundation/spec.md) |
| `DES-20260917-8EVTR3RJ` | `design` | 照片回收管理员优先的管理中心交互修订 | `active` | `[DES-20260916-4XCFYD80]` | `[]` | [source](./designs/DES-20260917-8EVTR3RJ-photo-recycle-authority-ui/design.md) |
| `SPEC-20260917-NHHC01TR` | `spec` | 照片回收的管理员优先权限修订 | `active` | `[SPEC-20260916-5Z69DCQE]` | `[]` | [source](./specs/SPEC-20260917-NHHC01TR-photo-recycle-authority/spec.md) |
| `DES-20260917-YQWSZG09` | `design` | 图集、时间轴、照片详情与头像选择界面补充设计 | `active` | `[]` | `[]` | [source](./designs/DES-20260917-YQWSZG09-photo-gallery-timeline-ui/design.md) |
| `SPEC-20260917-KSVSF8BN` | `spec` | 已发布照片图集、时间轴、详情与宝宝头像规格 | `active` | `[]` | `[]` | [source](./specs/SPEC-20260917-KSVSF8BN-photo-gallery-timeline/spec.md) |
| `DES-20260918-Y2GFD47V` | `design` | 宝宝档案与照片管理界面修订 | `active` | `[]` | `[]` | [source](./designs/DES-20260918-Y2GFD47V-baby-photo-ui-revision/design.md) |
| `DES-20260920-SAX3DM0H` | `design` | 成长里程碑、提醒与混合时间轴界面设计 | `active` | `[]` | `[]` | [source](./designs/DES-20260920-SAX3DM0H-baby-milestones-ui/design.md) |
| `SPEC-20260920-QQ9SQ9VT` | `spec` | 成长里程碑、清单提醒与时间轴整合规格 | `active` | `[]` | `[]` | [source](./specs/SPEC-20260920-QQ9SQ9VT-baby-milestones/spec.md) |
<!-- GENERATED:END DESIGNS_SPECS -->

## Plan 台账

| Plan ID | 标题 | 状态 | 仓库模式 | 基线提交 | 候选提交 | 集成提交 | Review | Regression | 验收有效性 | Achievement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
<!-- GENERATED:BEGIN PLANS -->
| [PLAN-20260920-BR79695D](./plans/PLAN-20260920-BR79695D/plan.md) | 实现成长里程碑、清单提醒与时间轴整合 | `integration_pending` | `git_remote` | `77c602c58f7f266e4fbee979b21e82b5de7b8085` | `dfd2aebe667eea19b8ece3e0d00c53c5affc7086` | `-` | [passed](./plans/PLAN-20260920-BR79695D/review-report.md) | [passed](./plans/PLAN-20260920-BR79695D/regression-report.md) | recorded | - |
| [PLAN-20260918-RC0Y5QH3](./plans/PLAN-20260918-RC0Y5QH3/plan.md) | 修订 Plan E 宝宝档案与照片管理界面 | `archived` | `git_remote` | `d401a2d0d29fd9e3b0f71ffae815c3a307a72242` | `8fc539813c28d5f56e973f59eb6ff6eb11c86470` | `5e9244a19c56e4da76ab467678bb839d98689099` | [passed](./plans/PLAN-20260918-RC0Y5QH3/review-report.md) | [passed](./plans/PLAN-20260918-RC0Y5QH3/regression-report.md) | confirmed 2026-09-20T13:32:50+08:00 | [ACH-20260918-RC0Y5QH3](./achievements/ACH-20260918-RC0Y5QH3-photo-gallery-timeline-ui.md) |
| [PLAN-20260917-K0AH0D6T](./plans/PLAN-20260917-K0AH0D6T/plan.md) | 实现图集、时间轴、照片详情与宝宝头像 | `superseded` | `git_remote` | `c0e2108226886183e35f6a9d1ae6f4075d15acb5` | `8b780574efddd11ec05d87781c57a4e7d4c3d242` | `-` | [passed](./plans/PLAN-20260917-K0AH0D6T/review-report.md) | [passed](./plans/PLAN-20260917-K0AH0D6T/regression-report.md) | pending | - |
| [PLAN-20260917-ABAHN8QT](./plans/PLAN-20260917-ABAHN8QT/plan.md) | 修订照片回收权限并继续照片上传阶段 | `archived` | `git_remote` | `fb6fa7a94528255aca77ab04b0009f1cd3064b29` | `4d4360e0e1deca3ab9cdd1c88c21ee5cc3cee62d` | `fb059f073c6c64ffc4e787281a75227e52a1a84a` | [passed](./plans/PLAN-20260917-ABAHN8QT/review-report.md) | [passed](./plans/PLAN-20260917-ABAHN8QT/regression-report.md) | confirmed 2026-09-17T17:18:27+08:00 | [ACH-20260917-ABAHN8QT](./achievements/ACH-20260917-ABAHN8QT-photo-upload-foundation.md) |
| [PLAN-20260916-83SYH180](./plans/PLAN-20260916-83SYH180/plan.md) | 建立照片隔离上传、安全处理、私有草稿与回收站基础 | `superseded` | `git_remote` | `fb6fa7a94528255aca77ab04b0009f1cd3064b29` | `20bcfe9275022c6e71c8659bad74fc1ed5c2b55f` | `-` | [pending](./plans/PLAN-20260916-83SYH180/review-report.md) | [pending](./plans/PLAN-20260916-83SYH180/regression-report.md) | pending | - |
| [PLAN-20260915-PQ8NHNZ2](./plans/PLAN-20260915-PQ8NHNZ2/plan.md) | 建立多宝宝档案与当前宝宝会话基础 | `archived` | `git_remote` | `b3b12b0e588873853b71960c23ded0cc1a62dcc3` | `5fdb3cfd89c4569f509e15788bc398a991836901` | `29b98f872ae535f6fd3c68472358dc3cb63cf09c` | [passed](./plans/PLAN-20260915-PQ8NHNZ2/review-report.md) | [passed](./plans/PLAN-20260915-PQ8NHNZ2/regression-report.md) | confirmed 2026-09-16T09:50:05+08:00 | [ACH-20260915-PQ8NHNZ2](./achievements/ACH-20260915-PQ8NHNZ2-baby-profile-foundation.md) |
| [PLAN-20260911-JBANR2J8](./plans/PLAN-20260911-JBANR2J8/plan.md) | 修订家庭邀请中文错误与撤销确认 | `archived` | `git_remote` | `805a979d3927c828127c441b3fd5c07e48aa8768` | `66344d706a7b572d7c7af2b796af0bdd819d67c2` | `b3f2b4682f2b7a831069eab147334b5183c7892b` | [passed](./plans/PLAN-20260911-JBANR2J8/review-report.md) | [passed](./plans/PLAN-20260911-JBANR2J8/regression-report.md) | confirmed 2026-09-14T13:31:00+08:00 | [ACH-20260911-JBANR2J8](./achievements/ACH-20260911-JBANR2J8-family-identity-foundation.md) |
| [PLAN-20260911-X27F6QNT](./plans/PLAN-20260911-X27F6QNT/plan.md) | 建立家庭身份、成员权限、单次邀请与家庭动态基础 | `superseded` | `git_remote` | `701f26aef605ccac7c1bded89fcb0e3c5e53a54c` | `3b8b92fdcf3ed6eaa575c35c3ab2466152d0b673` | `-` | [passed](./plans/PLAN-20260911-X27F6QNT/review-report.md) | [passed](./plans/PLAN-20260911-X27F6QNT/regression-report.md) | pending | - |
| [PLAN-20260910-JBD9BWHZ](./plans/PLAN-20260910-JBD9BWHZ/plan.md) | 修订认证密码最小长度并重新形成候选 | `archived` | `git_remote` | `1b22fa7b97155dd616442e1a34f4453b2cacfc39` | `b8a36f4795c0378fe6652fc249ade83dc1c47104` | `7354720b400f098e539b65a6211756aaffa6b21e` | [passed](./plans/PLAN-20260910-JBD9BWHZ/review-report.md) | [passed](./plans/PLAN-20260910-JBD9BWHZ/regression-report.md) | confirmed 2026-09-11T09:31:53+08:00 | [ACH-20260910-JBD9BWHZ](./achievements/ACH-20260910-JBD9BWHZ-auth-session-foundation.md) |
| [PLAN-20260910-GK1XDGCG](./plans/PLAN-20260910-GK1XDGCG/plan.md) | 建立手机号认证与 Redis 服务端会话 | `superseded` | `git_remote` | `1b22fa7b97155dd616442e1a34f4453b2cacfc39` | `72e30f1f18245a6e0db18cac519ac3faf20885d2` | `-` | [passed](./plans/PLAN-20260910-GK1XDGCG/review-report.md) | [pending](./plans/PLAN-20260910-GK1XDGCG/regression-report.md) | pending | - |
| [PLAN-20260909-PCVDMF5G](./plans/PLAN-20260909-PCVDMF5G/plan.md) | 建立五层分支治理与自动晋升检查 | `archived` | `git_remote` | `3665777a29605b75358a62ac8d53d62f08adab53` | `113102a23f4ddafb7fbc056bf7585a22793c92c1` | `19590f9db9bc55c85e9beb3608bdaec684a6a8a3` | [passed](./plans/PLAN-20260909-PCVDMF5G/review-report.md) | [passed](./plans/PLAN-20260909-PCVDMF5G/regression-report.md) | confirmed 2026-09-10T09:56:49+08:00 | [ACH-20260909-PCVDMF5G](./achievements/ACH-20260909-PCVDMF5G-branch-governance.md) |
| [PLAN-20260908-KP1B7472](./plans/PLAN-20260908-KP1B7472/plan.md) | 基于 GitHub 远端建立可启动的前后端分离 Monorepo | `archived` | `git_remote` | `8814674ce2b2c7add4572430159e34aa2d92d399` | `493e318ad6ed2809e08809c98b359ed9a1a9a346` | `39d25fa93a585dac9c998175a96838d3ab8d26f0` | [passed](./plans/PLAN-20260908-KP1B7472/review-report.md) | [passed](./plans/PLAN-20260908-KP1B7472/regression-report.md) | confirmed 2026-09-09T15:39:42+08:00 | [ACH-20260908-KP1B7472](./achievements/ACH-20260908-KP1B7472-project-foundation.md) |
| [PLAN-20260908-001](./plans/PLAN-20260908-001/plan.md) | Git 多成员、多设备协作与可移植证据链 | `archived` | `legacy` | `-` | `-` | `-` | [passed](./plans/PLAN-20260908-001/review-report.md) | [passed](./plans/PLAN-20260908-001/regression-report.md) | confirmed 2026-09-08T14:57:26+08:00 | [ACH-20260908-001](./achievements/ACH-20260908-001-git-collaboration-portable-evidence.md) |
| [PLAN-20260907-001](./plans/PLAN-20260907-001/plan.md) | 建设阶段菜单与规则有效性体系 | `archived` | `legacy` | `-` | `-` | `-` | [passed](./plans/PLAN-20260907-001/review-report.md) | [passed](./plans/PLAN-20260907-001/regression-report.md) | confirmed 2026-09-07T17:18:08+08:00 | [ACH-20260907-001](./achievements/ACH-20260907-001-rules-lifecycle-system.md) |
| [PLAN-20260904-001](./plans/PLAN-20260904-001/plan.md) | 建设 docs 项目变更证据链 | `archived` | `legacy` | `-` | `-` | `-` | [passed](./plans/PLAN-20260904-001/review-report.md) | legacy_n/a | confirmed 2026-09-07T16:14:06+08:00 | [ACH-20260904-001](./achievements/ACH-20260904-001-docs-evidence-chain.md) |
<!-- GENERATED:END PLANS -->

## 替代关系

现有认证与照片阶段存在 Design、Spec 或 Plan 的替代关系；以各原始元数据和上方生成表格为准，新增替代时须双向登记。

## 已人工确认的归档

| Achievement ID | Plan ID | 标题 | 确认时间 | 归档文件 |
| --- | --- | --- | --- | --- |
<!-- GENERATED:BEGIN ACHIEVEMENTS -->
| `ACH-20260918-RC0Y5QH3` | [PLAN-20260918-RC0Y5QH3](./plans/PLAN-20260918-RC0Y5QH3/plan.md) | 图集、时间轴、照片详情、宝宝头像与界面修订：完成归档 | 2026-09-20T13:32:50+08:00 | [archive](./achievements/ACH-20260918-RC0Y5QH3-photo-gallery-timeline-ui.md) |
| `ACH-20260917-ABAHN8QT` | [PLAN-20260917-ABAHN8QT](./plans/PLAN-20260917-ABAHN8QT/plan.md) | 照片隔离上传、安全处理与管理员优先回收：完成归档 | 2026-09-17T17:18:27+08:00 | [archive](./achievements/ACH-20260917-ABAHN8QT-photo-upload-foundation.md) |
| `ACH-20260915-PQ8NHNZ2` | [PLAN-20260915-PQ8NHNZ2](./plans/PLAN-20260915-PQ8NHNZ2/plan.md) | 多宝宝档案与当前宝宝会话基础：完成归档 | 2026-09-16T09:50:05+08:00 | [archive](./achievements/ACH-20260915-PQ8NHNZ2-baby-profile-foundation.md) |
| `ACH-20260911-JBANR2J8` | [PLAN-20260911-JBANR2J8](./plans/PLAN-20260911-JBANR2J8/plan.md) | 家庭身份、成员权限、单次邀请与家庭动态基础：完成归档 | 2026-09-14T13:31:00+08:00 | [archive](./achievements/ACH-20260911-JBANR2J8-family-identity-foundation.md) |
| `ACH-20260910-JBD9BWHZ` | [PLAN-20260910-JBD9BWHZ](./plans/PLAN-20260910-JBD9BWHZ/plan.md) | 手机号认证与 Redis 服务端会话：完成归档 | 2026-09-11T09:31:53+08:00 | [archive](./achievements/ACH-20260910-JBD9BWHZ-auth-session-foundation.md) |
| `ACH-20260909-PCVDMF5G` | [PLAN-20260909-PCVDMF5G](./plans/PLAN-20260909-PCVDMF5G/plan.md) | 五层分支治理与目标隔离晋升保护：完成归档 | 2026-09-10T09:56:49+08:00 | [archive](./achievements/ACH-20260909-PCVDMF5G-branch-governance.md) |
| `ACH-20260908-KP1B7472` | [PLAN-20260908-KP1B7472](./plans/PLAN-20260908-KP1B7472/plan.md) | 可启动的前后端分离 Monorepo 工程基础：完成归档 | 2026-09-09T15:39:42+08:00 | [archive](./achievements/ACH-20260908-KP1B7472-project-foundation.md) |
| `ACH-20260908-001` | [PLAN-20260908-001](./plans/PLAN-20260908-001/plan.md) | Git 多成员、多设备协作与可移植证据链：完成归档 | 2026-09-08T14:57:26+08:00 | [archive](./achievements/ACH-20260908-001-git-collaboration-portable-evidence.md) |
| `ACH-20260907-001` | [PLAN-20260907-001](./plans/PLAN-20260907-001/plan.md) | 建设阶段菜单与规则有效性体系：完成归档 | 2026-09-07T17:18:08+08:00 | [archive](./achievements/ACH-20260907-001-rules-lifecycle-system.md) |
| `ACH-20260904-001` | [PLAN-20260904-001](./plans/PLAN-20260904-001/plan.md) | 建设 docs 项目变更证据链：完成归档 | 2026-09-07T16:14:06+08:00 | [archive](./achievements/ACH-20260904-001-docs-evidence-chain.md) |
<!-- GENERATED:END ACHIEVEMENTS -->

## 读取规则

- 新式 Plan 生命周期读取 `state.md`；legacy Plan 没有 State 时读取 `plan.md`。
- `repository_mode`、远端新鲜度和工作树状态属于运行时事实，只从本次 preflight 与 Plan 证据读取。
- Git Plan 的候选提交、作用范围摘要、验收有效性与集成提交必须相互核对；空值不得猜测。
- 生成区块发生合并冲突时重新运行 `-Write`，禁止手工拼接；提交前运行 `-Check`。
