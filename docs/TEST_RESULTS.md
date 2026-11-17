# 实际测试结果

日期：2026-11-16（Asia/Singapore）。本文件记录 AI 实际执行的验证，不是学生本人的学习反思或开发历史。

## 环境与结论

- Node.js v24.22.1；npm ci 安装原 package-lock.json 依赖成功。
- MariaDB 11.8.6 / InnoDB，使用 mysql2 和真实 SQL。只创建独立临时测试数据库，结束后删除。
- 全部项目 JavaScript 语法检查通过。
- 事务异常单元检查：**8/8 通过**。
- HTTP + 数据库集成检查：**18/18 组通过**。EJS 页面确实经 Express 渲染，正常流程未使用假数据库。
- 学生本机 MySQL 8.x、Windows、macOS：**未执行**。
- 浏览器点击验收：**未完成**。尝试启动 Chromium 时，环境禁止其需要的 Unix socket，浏览器未能启动。HTTP 测试不能算作浏览器点击测试。Bootstrap CDN 加载及视觉呈现也未验收。

## L08 AC1–AC8

| 验收项 | 实际检查与结果 | 状态 |
| --- | --- | --- |
| AC1 | Clara/Mira + Basic Bath；重定向、规定 success flash、记录数、关联 ID、25.00 金额、两项 pending、NULL reference；篡改 amount 和 ownerId 无效 | 数据库/HTTP 通过 |
| AC2 | 新加坡本地今天及未来 30 天接受；历史价不随目录更新；未禁止重复预约 | 数据库/HTTP 通过 |
| AC3 | 空/畸形/不存在/过去日期；空/非数字/0/负数/小数 ID；规定错误消息且无新增记录 | 数据库/HTTP 通过 |
| AC4 | 他人及不存在的 pet 被拒；预选不泄露其他宠物；无新增记录 | 数据库/HTTP 通过 |
| AC5 | inactive、unknown service 均拒绝；inactive 不列出；无新增记录 | 数据库/HTTP 通过 |
| AC6 | 临时库触发器分别阻断 booking insert、payment insert；回滚后记录数不变、无成功消息；commit/rollback/连接异常用模拟连接检查 cleanup 及 callback 次数 | 实际写失败通过；commit/rollback 异常仅模拟通过 |
| AC7 | Clara/Ben 各自历史隔离；新记录在前；日期字符串；缺 payment 时显示 No payment record | 数据库/HTTP 通过 |
| AC8 | 未登录访问三条 booking 路由均 302 → /login | HTTP 通过 |

AC6 未制造真实网络中断或服务器崩溃。模拟 commit failure 证明应用会请求 rollback 并返回失败，不代表所有基础设施故障已验证。浏览器人工验收仍待完成。

## 原功能与其他检查

- L05：三个服务、五字段与类型、999 的 404、篡改 amount 无效。
- L06：APPROVED/PENDING/DECLINED/默认 PENDING；404；provider 接收目录金额 50 和 sgd；无数据库写入。
- 首页、signup、正确/错误登录、session、logout、原有受保护路由。
- 注册时创建首只宠物、SHA-256 保存；管理员列表/详情/删除；普通用户无管理员访问权。
- multipart 宠物图片上传、owner、静态图片响应。
- Journal 创建、列表、pet 过滤、搜索、编辑、更新、删除；归属权篡改不改变他人记录。
- 无宠物、无服务、无历史、缺 payment row 的页面内容。
- 模拟 pets/services/history 查询失败：HTTP 500 与规定消息。

## 最终集成检查输出

```text
PASS AC8 signed-out booking routes and existing protected pages
PASS GET payment preparation catalogue, exact fields, unknown and price tampering
PASS POST mock payment approved/pending/declined/default and unknown; no writes
PASS Login valid/invalid, session and original pages
PASS AC1 booking pair, trusted price, pending statuses and exact success
PASS AC2 today and future; stored prices survive catalogue change; duplicates allowed
PASS AC3 bad/missing dates and IDs: no writes, exact validation message
PASS AC4 another owner/unknown pet rejected and preselection checked
PASS AC5 inactive and unknown service rejected without writes
PASS AC6 real payment INSERT failure rolls booking back; no success
PASS AC6 real booking INSERT failure produces no records
PASS AC7 history owner isolation, newest order and missing-payment fallback
PASS Service form/history empty states
PASS Read failures return 500 with explicit messages
PASS Pet upload and Journal create/read/filter/search/edit/delete
PASS Journal ownership tampering blocked
PASS Sign-up with first pet, admin dashboard/list/detail/delete and role checks
PASS Logout removes access
Integration checks passed: 18
Database engine: 11.8.6-MariaDB-0+deb13u1 from Debian
```

## 学生必须补充的本地验收

| 本地项目 | 当前状态 |
| --- | --- |
| 自己的 MySQL 导入和连接 | Not run |
| 浏览器完整操作及视觉检查 | Not run |
| 浏览器 AC1–AC8 与本地数据库证据 | Not run |
| 自己的讲解录像、真实 AI 使用记录 | Not run |

请按本人实际操作记录证据，不要把本文的 AI 检查写成个人已完成的验收。
