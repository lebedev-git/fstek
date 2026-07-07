// Тесты правил сканера. Ключевая проверка: НЕТ ложного pass для vuln-мер.
import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { scanDirectory } from "../src/lib/scanner.mjs";

async function tmpProject(files) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "scan-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf-8");
  }
  return dir;
}

function byId(res) {
  const m = {};
  for (const f of res.findings) m[f.measureId] = f;
  return m;
}

test("SQL-конкатенация → fail (VIII-1)", async () => {
  const dir = await tmpProject({
    "db.js": 'const r = db.query("SELECT * FROM u WHERE id=" + userId);',
  });
  const f = byId(await scanDirectory(dir));
  assert.equal(f["VIII-1"].status, "fail");
});

test("ORM без сырых запросов НЕ даёт pass — только manual (VIII-1)", async () => {
  // Регресс на баг «первое совпадение = pass на весь проект».
  const dir = await tmpProject({
    "orm.js": 'import { PrismaClient } from "prisma";\nconst p = new PrismaClient();',
  });
  const f = byId(await scanDirectory(dir));
  assert.equal(f["VIII-1"].status, "manual");
});

test("Секрет в .env НЕ даёт fail (IX-4)", async () => {
  // .env — защищённое хранилище, не «секрет в коде».
  const dir = await tmpProject({
    ".env": "API_KEY=sk_live_abcdefghijklmnop123456",
    "app.js": "const k = process.env.API_KEY;",
  });
  const f = byId(await scanDirectory(dir));
  assert.notEqual(f["IX-4"].status, "fail");
  assert.equal(f["IX-4"].status, "pass"); // process.env → секреты из окружения
});

test("Хардкод-секрет в коде → fail (IX-4)", async () => {
  const dir = await tmpProject({
    "cfg.js": 'const apiKey = "sk_live_abcdefghijklmnop123456";',
  });
  const f = byId(await scanDirectory(dir));
  assert.equal(f["IX-4"].status, "fail");
});

test("bcrypt → pass (V-6)", async () => {
  const dir = await tmpProject({ "auth.js": 'import bcrypt from "bcrypt";' });
  const f = byId(await scanDirectory(dir));
  assert.equal(f["V-6"].status, "pass");
});

test("сравнение пароля в открытом виде → fail (V-6)", async () => {
  const dir = await tmpProject({ "login.js": "if (password === req.body.pass) ok();" });
  const f = byId(await scanDirectory(dir));
  assert.equal(f["V-6"].status, "fail");
});

test("dangerouslySetInnerHTML → fail (VIII-2)", async () => {
  const dir = await tmpProject({
    "C.jsx": "export default () => <div dangerouslySetInnerHTML={{__html: x}} />;",
  });
  const f = byId(await scanDirectory(dir));
  assert.equal(f["VIII-2"].status, "fail");
});

test("пустой проект: vuln-меры не pass, а manual", async () => {
  const dir = await tmpProject({ "readme.txt": "hello" }); // .txt не сканируется
  const res = await scanDirectory(dir);
  const f = byId(res);
  for (const id of ["VIII-1", "VIII-2", "IX-4"]) {
    assert.notEqual(f[id].status, "pass", `${id} не должен быть pass на пустом проекте`);
  }
});
