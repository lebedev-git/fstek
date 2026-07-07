// Детерминированный авто-сканер кода под autoCheckable-меры №117.
// Эвристики (regex по строкам), НЕ формальный анализ.
//
// Принципы (после ревизии ядра):
//  1. Сканируем ВСЕ файлы и копим ВСЕ совпадения (findAll), а не первое.
//  2. Меры делятся на два типа:
//     - "presence" (есть ли механизм защиты X): наличие good-паттерна → pass.
//     - "vuln" (нет ли уязвимости): наличие risk-паттерна → fail;
//        ОТСУТСТВИЕ risk НЕ доказывает безопасность → manual, не pass.
//  3. Никогда не выдаём pass для vuln-мер по слабому косвенному признаку.
//  4. .env НЕ сканируется: это защищённое хранилище, а не «секрет в коде».
import { promises as fs } from "fs";
import path from "path";

const IGNORE_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "build", "out", "coverage",
  ".turbo", ".vercel", "vendor", "__pycache__", ".cache",
]);
const EXT = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte",
  ".json", ".sql", ".yml", ".yaml", ".html", ".py", ".php",
]);
const MAX_FILES = 5000;
const MAX_FILE_BYTES = 512 * 1024;

async function collectFiles(root) {
  const out = [];
  async function walk(dir) {
    if (out.length >= MAX_FILES) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= MAX_FILES) return;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (IGNORE_DIRS.has(e.name) || e.name.startsWith(".")) continue;
        await walk(full);
      } else if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        if (!EXT.has(ext)) continue; // .env и прочее — не сканируем
        out.push({ abs: full, rel: path.relative(root, full) });
      }
    }
  }
  await walk(root);
  return out;
}

async function loadContents(files) {
  const loaded = [];
  for (const f of files) {
    try {
      const stat = await fs.stat(f.abs);
      if (stat.size > MAX_FILE_BYTES) continue;
      const text = await fs.readFile(f.abs, "utf-8");
      loaded.push({ ...f, lines: text.split(/\r?\n/) });
    } catch {
      /* skip unreadable */
    }
  }
  return loaded;
}

// Все совпадения regex: максимум одно на файл (широта охвата без флуда).
function findAll(files, regex) {
  const hits = [];
  for (const f of files) {
    for (let i = 0; i < f.lines.length; i++) {
      if (regex.test(f.lines[i])) {
        hits.push({ rel: f.rel, line: i + 1, text: f.lines[i].trim().slice(0, 120) });
        break;
      }
    }
  }
  return hits;
}

// Evidence из набора хитов: первый + счётчик остальных.
function evid(hits) {
  if (!hits || !hits.length) return "";
  const h = hits[0];
  const more = hits.length > 1 ? ` (+${hits.length - 1} ещё в др. файлах)` : "";
  return `${h.rel}:${h.line} — ${h.text}${more}`;
}

// presence-мера: good → pass, иначе manual.
function presence(files, good, foundNote, missNote) {
  const g = findAll(files, good);
  if (g.length) return { status: "pass", evidence: evid(g), note: foundNote };
  return { status: "manual", evidence: "", note: missNote };
}

// vuln-мера: risk → fail. Иначе manual (отсутствие риска ≠ доказанная защита).
// Опциональный safe-паттерн лишь дополняет note, но НЕ даёт pass сам по себе.
function vuln(files, risk, riskNote, safe, safeNote, cleanNote) {
  const r = findAll(files, risk);
  if (r.length) return { status: "fail", evidence: evid(r), note: riskNote };
  if (safe) {
    const s = findAll(files, safe);
    if (s.length) return { status: "manual", evidence: evid(s), note: safeNote };
  }
  return { status: "manual", evidence: "", note: cleanNote };
}

// ---- Правила ----
const RULES = {
  "V-3": (f) => presence(f,
    /zxcvbn|passwordStrength|min(imum)?[_ ]?length|\.min\(\s*[68]|password.{0,20}(length|complexity)/i,
    "Найдена проверка пароля",
    "Проверка сложности пароля не обнаружена — подтвердить вручную"),

  "V-4": (f) => presence(f,
    /rate[-_ ]?limit|express-rate-limit|loginAttempts|failedAttempts|lockout|bruteforce|too many attempts/i,
    "Найден механизм ограничения попыток",
    "Блокировка после N попыток не обнаружена"),

  "V-5": (f) => presence(f,
    /\bmfa\b|2fa|two[-_ ]?factor|\btotp\b|otpauth|speakeasy|authenticator|otplib/i,
    "Найдены признаки MFA",
    "MFA не обнаружена"),

  // Хеш паролей: risk (сравнение в открытом виде) приоритетнее presence.
  "V-6": (f) => {
    const r = findAll(f, /password\s*===?\s*(req\.|body\.|input|['"])|plain[_ ]?password/i);
    if (r.length) return { status: "fail", evidence: evid(r), note: "Похоже на сравнение пароля в открытом виде" };
    return presence(f, /bcrypt|argon2|scrypt|pbkdf2/i,
      "Хеширование паролей найдено",
      "Хеширование не обнаружено (возможно, внешняя аутентификация) — подтвердить");
  },

  "VI-1": (f) => presence(f,
    /\brole\b|\brbac\b|permission|\bcasl\b|\bability\b|hasRole|requireRole/i,
    "Признаки ролевой модели",
    "Ролевая модель не обнаружена"),

  "VI-3": (f) => presence(f,
    /maxAge|expiresIn|sessionTimeout|session.{0,20}expire|cookie.{0,20}maxAge|jwt.{0,20}expires/i,
    "Ограничение времени сессии найдено",
    "Таймаут сессии не обнаружен"),

  "VI-4": (f) => presence(f,
    /getServerSession|requireAuth|withAuth|isAuthenticated|verifyToken|middleware.*auth|auth.*middleware/i,
    "Признаки серверной авторизации",
    "Серверная авторизация эндпоинтов не подтверждена — проверить каждый API-роут"),

  "VII-1": (f) => presence(f,
    /winston|pino|bunyan|\blog4|logger\.(info|warn|error|audit)|auditLog/i,
    "Найдена система логирования",
    "Структурированное логирование не обнаружено"),

  "VII-2": (f) => presence(f,
    /req\.ip|x-forwarded-for|remoteAddress|getClientIp|request\.ip/i,
    "Фиксация IP найдена",
    "Фиксация IP в логах не обнаружена"),

  // SQL: конкатенация → fail. ORM-признак → лишь manual (не доказывает отсутствие
  // сырых запросов в других местах). Фаззи-токены ($1, ?,[ ) убраны — давали ложный pass.
  "VIII-1": (f) => vuln(f,
    /(query|execute|raw)\s*\(\s*[`'"].{0,80}(SELECT|INSERT|UPDATE|DELETE|WHERE).{0,80}(\$\{|['"]\s*\+)/i,
    "Похоже на конкатенацию SQL — риск инъекции",
    /\b(prisma|sequelize|typeorm|drizzle|knex|mongoose)\b|\$queryRaw/i,
    "Найден ORM/параметризация, сырой конкатенации не видно — подтвердить отсутствие raw-запросов",
    "SQL-доступ не распознан — проверить вручную"),

  // XSS: опасный sink → fail. React (авто-экранирование) → manual (CSP не проверяется здесь).
  "VIII-2": (f) => vuln(f,
    /dangerouslySetInnerHTML|\.innerHTML\s*=|v-html|\.html\(|document\.write/i,
    "Прямая вставка HTML — риск XSS, проверить санитизацию",
    /\.(jsx|tsx)$|from\s+['"]react['"]/i,
    "React экранирует по умолчанию, ручных вставок не найдено — подтвердить CSP",
    "Экранирование вывода не подтверждено"),

  "VIII-3": (f) => presence(f,
    /\bcsrf\b|csurf|xsrf|sameSite|SameSite/i,
    "Признаки защиты от CSRF",
    "Защита от CSRF не обнаружена (для API на токенах может быть неприменимо)"),

  "VIII-5": (f) => presence(f,
    /helmet|Strict-Transport-Security|Content-Security-Policy|X-Frame-Options|\bhsts\b/i,
    "Найдены безопасные заголовки",
    "Безопасные заголовки в коде не найдены (могут задаваться на прокси)"),

  "IX-1": (f) => presence(f,
    /forceSSL|requireHTTPS|Strict-Transport-Security|redirect.{0,15}https|https:\/\/[^"'\s]*\$\{/i,
    "Признаки принудительного HTTPS",
    "Принуждение HTTPS в коде не найдено (обычно на реверс-прокси)"),

  // Секреты: хардкод-секрет → fail. process.env → pass (секреты вне кода).
  // .env не сканируется, поэтому ключи в .env fail не дают.
  "IX-4": (f) => {
    const r = findAll(f, /(sk_live_[0-9a-zA-Z]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN[^-]*PRIVATE KEY|(api[_-]?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9_\-\/+]{16,}['"])/);
    if (r.length) return { status: "fail", evidence: evid(r), note: "Похоже на секрет в коде — вынести в переменные окружения" };
    const g = findAll(f, /process\.env\.[A-Z]/);
    if (g.length) return { status: "pass", evidence: evid(g), note: "Секреты читаются из окружения" };
    return { status: "manual", evidence: "", note: "Работа с секретами не распознана" };
  },
};

// Публичный вход: сканировать директорию, вернуть находки по мерам.
export async function scanDirectory(root) {
  const abs = path.resolve(root);
  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    return { error: `Путь не найден: ${abs}` };
  }
  if (!stat.isDirectory()) return { error: `Не директория: ${abs}` };

  const files = await loadContents(await collectFiles(abs));
  const findings = [];
  for (const [measureId, rule] of Object.entries(RULES)) {
    try {
      const r = rule(files);
      findings.push({ measureId, ...r });
    } catch (e) {
      findings.push({ measureId, status: "manual", evidence: "", note: "ошибка правила: " + e.message });
    }
  }
  const summary = { pass: 0, fail: 0, manual: 0 };
  for (const f of findings) summary[f.status] = (summary[f.status] || 0) + 1;
  return { root: abs, filesScanned: files.length, findings, summary, coveredMeasures: Object.keys(RULES) };
}
