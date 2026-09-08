# Rules 历史版本索引

> 本目录只保存已被替代或退役的 Ruleset/Stage 快照。正常任务不得把历史版本当作当前约束。

- 最后更新：`2026-09-08T11:34:45+08:00`
- 防篡改清单：[`MANIFEST.sha256`](./MANIFEST.sha256)
- 关联 Plan：[`PLAN-20260908-001`](../../docs/plans/PLAN-20260908-001/plan.md)
- 初始体系 Achievement：[`ACH-20260907-001`](../../docs/achievements/ACH-20260907-001-rules-lifecycle-system.md)
- Git 协作体系 Achievement：[`ACH-20260908-001`](../../docs/achievements/ACH-20260908-001-git-collaboration-portable-evidence.md)

## 历史版本

| Ruleset ID | Version | Status | 归档日期 | 替代版本 | 关联 Plan | 文件 |
| --- | --- | --- | --- | --- | --- | --- |
| `RULESET-SOURCE-EVIDENCE` | `1` | `superseded` | 2026-09-08 | `2` | `PLAN-20260908-001` | [快照](./RULESET-SOURCE-EVIDENCE/v001-20260907.md) |
| `RULESET-REPOSITORY-SAFETY` | `1` | `superseded` | 2026-09-08 | `2` | `PLAN-20260908-001` | [快照](./RULESET-REPOSITORY-SAFETY/v001-20260907.md) |
| `RULESET-TESTING-QUALITY` | `1` | `superseded` | 2026-09-08 | `2` | `PLAN-20260908-001` | [快照](./RULESET-TESTING-QUALITY/v001-20260907.md) |
| `STAGE-EXPLORATION` | `1` | `superseded` | 2026-09-08 | `2` | `PLAN-20260908-001` | [快照](./STAGE-EXPLORATION/v001-20260907.md) |
| `STAGE-PLANNING` | `1` | `superseded` | 2026-09-08 | `2` | `PLAN-20260908-001` | [快照](./STAGE-PLANNING/v001-20260907.md) |
| `STAGE-DEVELOPMENT` | `1` | `superseded` | 2026-09-08 | `2` | `PLAN-20260908-001` | [快照](./STAGE-DEVELOPMENT/v001-20260907.md) |
| `STAGE-REVIEW` | `1` | `superseded` | 2026-09-08 | `2` | `PLAN-20260908-001` | [快照](./STAGE-REVIEW/v001-20260907.md) |
| `STAGE-REGRESSION` | `1` | `superseded` | 2026-09-08 | `2` | `PLAN-20260908-001` | [快照](./STAGE-REGRESSION/v001-20260907.md) |
| `STAGE-ACCEPTANCE` | `1` | `superseded` | 2026-09-08 | `2` | `PLAN-20260908-001` | [快照](./STAGE-ACCEPTANCE/v001-20260907.md) |

## 归档规则

- 修改当前 Ruleset 前，先把旧版完整复制到 `<RULESET-ID>/vNNN-YYYYMMDD.md`。
- 每个历史文件必须以规范化 UTF-8/LF 内容的 SHA-256 登记在 `MANIFEST.sha256`。
- 历史文件、历史事实和既有哈希永久只读。
- 当前版本、替代关系和关联 Plan 必须同步登记在根级 [`rules/INDEX.md`](../INDEX.md)。
