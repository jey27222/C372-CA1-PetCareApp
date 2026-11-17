# PetCareAppMVC — C372 L01–L08 学习项目

以上传的老师 L08 Resources/PetCareAppMVC 为基础，保留 Express、EJS、MySQL、CommonJS 和 callback MVC 写法。新增代码用于学习和演示；保留老师基础代码的来源，不宣称整套模板从零原创。

## 1. 本地运行

需要 Node.js 22 或以上、npm 和运行中的 MySQL（课堂环境）。在解压后的 **PetCareAppMVC** 文件夹打开终端：

```bash
npm ci
```

先配置数据库。只在**全新的、可丢弃的本地课堂数据库**运行根目录的 `db.sql`，再运行 `db-lesson08-extension.sql`。可在 MySQL Workbench 打开两个 SQL 文件，按顺序执行。`db.sql` 保留老师的 users、pets、journal 结构和虚构样例，移除了原始 DROP TABLE；数据库已存在会报错，应停止检查，不能当作重置脚本反复执行。

- 全新数据库：`db.sql` → `db-lesson08-extension.sql`。
- 已有老师 L06 的 petcare 数据库：备份后检查结构，只运行 extension 一次。若新表已存在，先检查，不重复导入。
- 不要对其他项目或真实用户数据库执行 SQL。应用启动不会自动执行 SQL。

将 `.env.example` 复制成 `.env`，填入你自己的 DB_USER、DB_PASSWORD。默认数据库名是 petcare，端口 3306。`.env` 不在交付包内。

macOS / Linux：

```bash
cp .env.example .env
npm start
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
npm start
```

浏览器打开 http://localhost:3000 。`npm start` 使用 Node 自带的 env-file 功能读取 `.env`；如果直接运行 `node app.js`，需要先在终端设置环境变量。

老师 SQL 中的**虚构示例账号**：

| 用户 | 示例密码 | 用途 |
| --- | --- | --- |
| clara | user123 | Mira 的主人，演示预约 |
| ben | user123 | 演示不同用户之间的隔离 |
| admin1 | admin123 | 演示管理员页面 |

这些是教材测试数据，不是实际账户凭证。若已有数据库中账号不同，以你自己数据库的数据为准。

## 2. 功能与范围

| 课程 | 本项目对应内容 |
| --- | --- |
| L01–L02 | 原有用户、登录、宠物图片、Journal、管理员功能 |
| L03 | routes / controllers / models；config / middleware / helpers；保留 SHA-256 教学写法 |
| L04 | 独立 FA 项目规划，不向本 PetCareApp 混入其他商业项目 |
| L05 | GET Payment Preparation API、五字段 JSON、服务器 mock catalogue 价格 |
| L06 | POST Mock Payment API、三种状态映射、默认 PENDING |
| L07 | 验证与提交准备；不生成虚构 GitHub 历史、学生反思或 AI Journal |
| L08 | Service Booking、Booking History、事务、rollback、归属权和登录保护 |

核心页面：`/signup`、`/login`、`/journals`、`/pets/new`、`/services`、`/bookings`、`/admin/dashboard`。

L05/L06 的课堂 Mock API **按老师要求公开，无需登录**；预约、历史、宠物及 Journal 路由需要登录。Mock catalogue 的服务 ID 与 L08 数据库 catalogue 的 ID **含义不同**，两者按原课程契约保留：例如 mock ID 1 是 Vaccination 35，数据库 ID 1 是 Basic Bath 25。

- `GET /payments/prepare/1`：200，Vaccination，amount 35，currency sgd，status READY_FOR_PAYMENT。
- `GET /payments/prepare/999`：404，`{"error":"Service not found"}`。
- `POST /payments/mock/2`，JSON `{"testStatus":"APPROVED"}`：APPROVED → CONFIRMED。
- PENDING → AWAITING_PAYMENT，DECLINED → PAYMENT_FAILED，`{}` 默认 PENDING。
- Mock API 只返回模拟 JSON，不写数据库，也不更新实际预约。
- 预约创建一条 pending booking 和一条 pending payment，不收款、不确认付款。允许同一 pet/service/date 重复预约，未添加额外业务规则。
- 日期使用服务器本地日历；在新加坡演示时确认服务器时区为 Asia/Singapore。不要继续使用已过期的课堂 2026-11-03 示例日期。

老师原注册页允许选择 User 或 Admin，此教学行为保留；它不是生产环境的账号权限设计。原 GET 删除路由与 SHA-256 教学实现同样保留。非法 mock testStatus 未加新校验，保留课程已说明的限制。

## 3. 文件职责

| 位置 | 职责 |
| --- | --- |
| app.js | Express、session、flash、路由注册和启动 |
| routes/ | URL、HTTP 方法和 middleware |
| controllers/ | 读取输入、校验、调用 model、渲染或重定向 |
| models/ | 所有 SQL；serviceBookingModel 完成同连接事务 |
| views/ | 老师的基础 EJS 页面及预约 shells |
| config/ | 数据库连接池、Multer |
| services/mockPaymentProvider.js | 本地模拟支付函数 |
| data/mockServices.js | L05/L06 课堂 mock catalogue |
| specs/ | Specification；L08 两份原始 Markdown 保留 |
| tests/ | 可复跑的事务失败检查和数据库/HTTP 集成检查 |

除新增预约文件外，修正了 signup.ejs 大小写、移除硬编码数据库/session secret、补导航、修正 DATE 显示的时区偏移，并对 Journal 创建/查看编辑页/修改/删除增加 owner 条件。上传宠物先验证登录，再保存文件。没有增加新 UI 框架或其他 npm 依赖。

## 4. 测试

查看 `docs/TEST_RESULTS.md`。自动测试结果不是学生自己的验收证据。

无数据库的事务异常检查：

```bash
npm test
```

完整集成检查需要 `.env` 中的 MySQL 用户具有 CREATE/DROP DATABASE 和 CREATE TRIGGER 权限；只会创建随机名称的 `petcare_test_...` 数据库，并在结束时删除这个新数据库。不会使用或重置 `.env` 中已有的 DB_NAME。必须显式设置 RUN_DB_TESTS=1：

macOS / Linux：

```bash
RUN_DB_TESTS=1 npm run test:integration
```

Windows PowerShell：

```powershell
$env:RUN_DB_TESTS="1"
npm run test:integration
Remove-Item Env:RUN_DB_TESTS
```

测试会有意制造错误，终端可能打印 INSERT failure / rollback failure 日志；以最后断言通过数量和退出状态判断结果。

## 5. 学生需要亲自完成

1. 在自己的 MySQL、Node 和浏览器中运行，演示注册、登录、宠物上传和 Journal 增删改查/搜索。
2. 用 Clara 预约 Mira，检查数据库确有一组关联的 pending 记录，金额等于数据库服务价格；换 Ben 检查隔离。
3. 按 specs/service-booking.md 的 AC1–AC8 复测，并在独立测试库中确认 rollback；不要破坏自己的日常数据库。
4. 理解并讲清：浏览器 → route → 登录 middleware → controller → model → 同一连接中的 BEGIN/两次 INSERT/COMMIT；任何一步失败走 ROLLBACK。
5. 能解释 req.session.user.id、参数化 SQL、服务器价格、mock 结果与数据库 pending 状态的区别。
6. 若正式提交 CA1，由本人填写真实 AI 使用记录、录制讲解，并从后续实际开发开始保留真实进度。此 ZIP 仅覆盖本次要求的 L01–L08，未读取或实现 L09–L10，不代表整套 CA1 提交材料已齐。

此项目由 AI 辅助完成，基础代码来自所上传的教师 Resources。没有连接 GitHub，也没有生成其他学生的开发记录、身份信息或提交证明。
