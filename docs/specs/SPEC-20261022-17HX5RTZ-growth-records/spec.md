---
id: SPEC-20261022-17HX5RTZ
type: spec
title: "成长数据、WHO 228 月参考与记录回收站规格"
status: active
created_at: 2026-10-22T17:23:00+08:00
updated_at: 2026-10-22T17:23:00+08:00
related_ids: [SPEC-20261022-17HX5RTZ, DES-20261022-EM2SND6K, PLAN-20261022-707KSVG3, SPEC-20260915-8RKJ7RGM]
supersedes: []
superseded_by: []
---

# 成长数据规格

## 目标、确认与范围

用户明确要求 PLEASE IMPLEMENT THIS PLAN：Plan G 成长数据、WHO 参考与记录回收站，全文确认本事务的行为、task 和验收。
交付添加测量、原始趋势与 WHO 参考、编辑、30 天回收、恢复、管理员提前彻底删除和到期清理；同步 375/834/1440。
本专用规格明确将 SPEC-20260915-8RKJ7RGM 中 Plan G 的 203 月上限修订为 228 月；总规格其他内容继续适用。本次不改写既有归档。

## 数据与计算

记录 measuredOn、lengthCm、weightKg、headCm、measurementPosition(RECUMBENT/STANDING)、note、作者、审计时间、version。至少一个测量指标；长度存在时测量方式必填。单位 cm/kg；定点数，长度 0.1 cm、体重 0.01 kg，备注最多 1000 字。日期为真实日历日期，新增/编辑不得早于当前生日或晚于上海当天。同日多条独立保存，按 measuredOn、createdAt、id 稳定排序。
概览分别取最新非空指标并显示日期；BMI 仅使用同条长度和体重。保留原始测量值，WHO 校正只作用于参考计算。
WHO 儿童标准按日龄应用，2007 参考按准确月龄及官方插值应用；0–60 月使用儿童标准，61–228 月按 2007 适用指标，年龄别体重至 120 月、头围至 60 月。交界按官方计算范围连续处理，不用简单整数月截断。WHO 年龄换算使用天数/30.4375。
官方数据本地化，记录上游提交、来源、使用条款和 SHA256；生产环境不用 R/联网。计算结果包括 standard、zScore、percentile、reason；缺少性别、超龄、日期冲突、缺指标或不可计算提供原因。历史生日修订保留原值，不计算负日龄参考；编辑/恢复须修正到符合当前生日的日期。生日/性别变化使前端成长缓存失效。
原始记录不限年龄。WHO 参考不生成医学诊断、预警或治疗建议。

## 权限与生命周期

ACTIVE 家庭成员可读有效记录和创建；作者及当前 OWNER/ADMIN 可编辑、回收。MEMBER 回收站仅本人记录，管理员可查看家庭全部回收记录。
回收原子记录操作者、当时角色、时间和 now+30*24h 的 purgeAfter；不公开操作者权限快照。普通成员仅可恢复自己以 MEMBER 身份回收的本人记录。管理员回收后仅当前管理员可恢复；回收者退出/降级不解除限制。管理员可恢复任意期限内回收记录。版本条件防止旧页面覆盖。
当前 OWNER/ADMIN 可彻底删除回收记录，二次确认；有效记录不得直删，普通成员不可彻底删除。到期即拒绝恢复，清理分批幂等重试；恢复不改原始创建/测量日期，再次回收重新计时。
宝宝归档后停止访问/写入成长资源；单条回收期限继续计时；宝宝恢复只恢复尚未清理的数据；宝宝最终删除通过受约束级联删除全部成长记录。不新增家庭动态/时间轴事件。
每次请求校验当前 ACTIVE Membership 和宝宝所属家庭/状态；每次写在事务内锁定成员、宝宝、记录并重验角色/状态，防止权限、归档和清理竞争。

## 公共接口

前缀 /api/v1/families/:familyId/babies/:babyId。
GET /growth-records：state=ACTIVE|TRASHED，limit 默认20最大50，绑定上下文/状态的游标；GET /growth-records/overview：各指标最新记录；GET /growth-records/series：metric=LENGTH|WEIGHT|HEAD|BMI，fromOn/toOn 可选，分页点与参考；GET /growth-records/:recordId：详情和权限。
POST /growth-records 创建；PATCH /growth-records/:recordId 编辑；POST /growth-records/:recordId/trash、/restore 状态转换；DELETE /growth-records/:recordId 仅管理员彻底删除回收记录。编辑/状态转换使用 expectedVersion，DELETE 在 query 传 expectedVersion。响应包含 version、canManage/canRestore/canPurge、期限和参考，不包含回收者快照。跨家庭404，权限403，冲突/恢复到期409。复用 Session/CSRF、稳定错误码和中文映射；OpenAPI 为客户端生成来源。

## 页面与非目标

/app/growth 展示概览、指标、最近六个月/全部曲线、记录及回收站；/app/growth/new、/app/growth/:recordId/edit 为独立表单。SVG 图有单位/图例/等价文本，真实点不静默截断，分段分页，单条只画点。
现有导航和首页卡片接通；缓存绑定 familyId/babyId 及宝宝生日/性别，切换不串数据；错误/权限失效清除受限内容，表单一般失败保留输入。中文错误，固定“仅供家庭记录，不构成医疗诊断”。按钮文案单行且不超过五字；键盘、焦点恢复、错误摘要、aria-live、reduced-motion、底栏遮挡均验证。
不包含报告导出、设备同步、医学预警、早产矫正年龄、成长家庭动态/混合时间轴或 Plan H 首页聚合；不引入图表框架，不新增长期规则。

## 验收与风险

官方实现合成对照覆盖男女、各指标、交界和测量转换，z-score 绝对误差<=1e-6；页面 z 两位、百分位一位，极端百分位用界限，不显示精确0/100%。
两家庭/多宝宝/角色矩阵、同日多条、部分录入、BMI配对、最新值、版本冲突、回收恢复、管理员优先、提前删除、恢复与到期清理竞争、生日/性别变动、宝宝归档/恢复/最终清理均测试。
运行 lint/format/typecheck/test/build/OpenAPI一致性/知识库；相关 E2E 覆盖375/834/1440；pnpm stack:up 后 readiness 和成长闭环；回归认证/宝宝/照片/里程碑受影响能力。
WHO 参数来源、数值精度、容器参数打包和并发授权是重点风险；任何 FAIL/UNVERIFIED 不进入验收。
