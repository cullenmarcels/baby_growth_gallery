---
id: ACH-20260918-RC0Y5QH3
type: achievement
title: "图集、时间轴、照片详情、宝宝头像与界面修订：完成归档"
status: archived
created_at: 2026-09-20T14:30:49+08:00
updated_at: 2026-09-20T14:30:49+08:00
related_ids: [PLAN-20260918-RC0Y5QH3, PLAN-20260918-RC0Y5QH3-EXEC, PLAN-20260918-RC0Y5QH3-REVIEW, PLAN-20260918-RC0Y5QH3-REGRESSION, PLAN-20260918-RC0Y5QH3-ACCEPTANCE, PLAN-20260917-K0AH0D6T, SPEC-20260917-KSVSF8BN, DES-20260917-YQWSZG09, DES-20260918-Y2GFD47V, RULESET-SOURCE-EVIDENCE, RULESET-REPOSITORY-SAFETY, RULESET-GIT-COLLABORATION, RULESET-BRANCH-GOVERNANCE, RULESET-IMPLEMENTATION-QUALITY, RULESET-TESTING-QUALITY, RULESET-RESPONSIVE-UI, RULESET-SECURITY-PRIVACY]
supersedes: []
superseded_by: []
plan_id: PLAN-20260918-RC0Y5QH3
confirmed_by: user
confirmed_at: 2026-09-20T13:32:50+08:00
archived_at: 2026-09-20T14:30:49+08:00
confirmation_record: '验收通过；随后授权推送 Plan E 功能分支、创建目标为 develop 的 PR，并授权推送剩余证据提交后在新检查通过时合并 PR #25'
repository_mode: git_remote
reviewed_commit: 8fc539813c28d5f56e973f59eb6ff6eb11c86470
reviewed_scope_digest: 9C500B481CC4770DB5EF3E3E8ABE808E391ECDE4C5CF447625F4DC01E688EAB7
accepted_commit: 8fc539813c28d5f56e973f59eb6ff6eb11c86470
accepted_scope_digest: 9C500B481CC4770DB5EF3E3E8ABE808E391ECDE4C5CF447625F4DC01E688EAB7
integrated_commit: 5e9244a19c56e4da76ab467678bb839d98689099
integrated_scope_digest: 9C500B481CC4770DB5EF3E3E8ABE808E391ECDE4C5CF447625F4DC01E688EAB7
scope_digest_version: 2
ci_status: passed
platform_scope: windows11-docker-github-actions
pr_url: https://github.com/cullenmarcels/baby_growth_gallery/pull/25
---

# `ACH-20260918-RC0Y5QH3` — Plan E 照片浏览与界面修订

## 归档摘要

- 原 Plan E [`PLAN-20260917-K0AH0D6T`](../plans/PLAN-20260917-K0AH0D6T/plan.md) 完成图集、时间轴、照片详情与宝宝头像候选后，由修订 Plan [`PLAN-20260918-RC0Y5QH3`](../plans/PLAN-20260918-RC0Y5QH3/plan.md) 承接界面修复与图集瀑布流；原 Plan 保留为 superseded 历史证据，Plan D 归档文件未改写。
- 用户于 `2026-09-20T13:32:50+08:00` 明确回复“验收通过”，确认绑定产品候选 `8fc539813c28d5f56e973f59eb6ff6eb11c86470` 与 v2 owned-scope 摘要 `9C500B481CC4770DB5EF3E3E8ABE808E391ECDE4C5CF447625F4DC01E688EAB7`。推送、PR 创建和合并均在后续获得单独授权。
- PR #25 的最终 Head 检查、普通 merge、develop push CI 和精确集成复验均通过。Integrated 摘要与 accepted 摘要相同，原人工验收继续有效，Plan E 完成 git_remote 归档。

## 已交付范围

- 图集只读取当前家庭、当前有效宝宝的已发布照片，按拍摄日、发布时间和照片 ID 稳定倒序；时间轴按年月分组并保留 `PHOTO` 事件类型，不生成占位里程碑。
- 照片详情使用安全 `DISPLAY` 变体，展示标题、描述、拍摄日和地点，并由服务端给出同一排序中的上一张／下一张及管理权限。作者和 OWNER/ADMIN 可编辑或回收，其他成员只读；跨家庭、跨宝宝、草稿和回收照片不可经读取接口泄露。
- 宝宝头像通过独立接口设置或清除，只允许 OWNER/ADMIN 选择同一宝宝的已发布照片。照片回收与头像解除在同一事务完成，恢复照片不自动恢复头像；界面使用安全缩略图圆形居中显示和昵称占位。
- 新建宝宝档案提供“取消”并返回管理页及聚焦标题；同场景同级操作按钮保持 44px 等高，操作按钮文案单行。统一下拉选项视觉，并修复头像圆形边界和顶部位置。
- 照片处理卡片使用四边 16px 内边距，标题独占首行，日期与地点位于下一行；“我的上传”采用主要操作按钮规格。我的上传和图集按实测卡片高度使用三／二／一列瀑布流，保留服务端与键盘顺序；时间轴继续使用固定月份网格。

## 版本、Review 与集成证据

- Reviewed and accepted product candidate：`8fc539813c28d5f56e973f59eb6ff6eb11c86470`；v2 digest `9C500B481CC4770DB5EF3E3E8ABE808E391ECDE4C5CF447625F4DC01E688EAB7`。Review 的 66 条固定 Rule 均为 PASS 或有明确 NOT_APPLICABLE 理由，无阻断问题。
- PR #25 final Head：`aaabf126b9ec7ce05791971440176947912a97a4`。相对产品候选仅增加 Plan 和索引证据，owned-scope 摘要不变；`branch-flow-develop`（run `35493353971`）、`quality` 与 `e2e-auth`（run `35493354935`）全部成功。
- Merge commit：`5e9244a19c56e4da76ab467678bb839d98689099`。其父提交依次为 `c0e2108226886183e35f6a9d1ae6f4075d15acb5` 与最终 PR Head，刷新后的 `origin/develop` 精确指向该提交；integrated v2 digest 与 accepted digest 完全相同。
- Merge commit 的 develop `Quality` push run `35493573502` 成功，`quality` Job `106032523428` 与 `e2e-auth` Job `106032753992` 均通过；数据库迁移、确定性 OpenAPI 客户端、图像编解码、知识库、MinIO、Playwright 和隔离上传清理检查均成功。
- 精确集成提交上完整 `corepack pnpm validate` exit 0：branch-flow 5、API 54、Web 50、依赖、Lint、Prettier、TypeScript、构建和项目校验全部通过，终值 `PROJECT_VALIDATION=PASSED`。Docker 集成 E2E 为 8 passed、4 designed skips、0 failed，覆盖 Windows Chromium 375／834／1440 的宝宝与照片流程。

## 偏差、风险与后续边界

- Windows 系统 `core.autocrlf=true` 导致本地 `develop` 首次格式检查出现 CRLF 差异；核对索引、HEAD blob 与工作树内容哈希一致且 Git diff 为零后，以 LF 工作树和一次性临时索引完成验证，再恢复系统预期工作树。没有形成产品或行尾提交。
- 自动化覆盖 Windows Chromium 三视口与 GitHub Actions Ubuntu/Chromium，不证明 Safari、Firefox 或真实移动设备。签名图片在短时链接到期前仍可能被已取得链接的客户端访问；服务端状态和头像关联会立即撤销，但不声称撤销已签发对象存储链接。
- 本阶段没有接入真实里程碑、评论、反应、视频或公开分享；没有创建发布 Tag，也没有执行 `develop → release → master → main` 晋升。

## 关联证据与冻结

- 现行 [Spec](../specs/SPEC-20260917-KSVSF8BN-photo-gallery-timeline/spec.md)、原 Plan E [Design](../designs/DES-20260917-YQWSZG09-photo-gallery-timeline-ui/design.md) 与界面修订 [Design](../designs/DES-20260918-Y2GFD47V-baby-photo-ui-revision/design.md)。
- [Plan](../plans/PLAN-20260918-RC0Y5QH3/plan.md)、[Execution Log](../plans/PLAN-20260918-RC0Y5QH3/execution-log.md)、[Review Report](../plans/PLAN-20260918-RC0Y5QH3/review-report.md)、[Regression Report](../plans/PLAN-20260918-RC0Y5QH3/regression-report.md)、[Acceptance Record](../plans/PLAN-20260918-RC0Y5QH3/acceptance-record.md)。
- 归档时间：`2026-09-20T14:30:49+08:00`。Plan 包与本 Achievement 纳入 `docs/ARCHIVE.sha256` 后永久只读；后续修改必须新建 Plan。
