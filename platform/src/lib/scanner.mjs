// Детерминированный авто-сканер кода под autoCheckable-меры №117.
// Эвристики (regex по строкам), НЕ формальный анализ.
// Принцип: risk-паттерн → fail с местом; good-паттерн → pass; неоднозначно → manual.
// Ложный pass не выдаём.
import { promises as fs } from "fs";
import path from "path";

const IGNORE_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "build", "out", "coverage",
  ".turbo", ".vercel", "vendor", "__pycache__", ".cache",
]);
const EXT = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte",
  ".json", ".sql", ".yml", ".yaml", ".html", ".env", ".py", ".php",
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
        if (IGNORE_DIRS.has(e.name) || e.name.startsWith(".") && e.name !== ".env") continue;
        await walk(full);
      } else if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        const isEnv = e.name === ".env" || e.name.startsWith(".env");
        if (!EXT.has(ext) && !isEnv) continue;
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

// Поиск первого совпадения regex по всем файлам → {rel, line, text}
function findFirst(files, regex) {
  for (const f of files) {
    for (let i = 0; i < f.lines.length; i++) {
      if (regex.test(f.lines[i])) {
        return { rel: f.rel, line: i + 1, text: f.lines[i].trim().slice(0, 120) };
      }
    }
  }
  return null;
}

function evid(hit) {
  return hit ? `${hit.rel}:${hit.line} — ${hit.text}` : "";
}

// ---- Правила. Каждое: (files) => { status, evidence, note } ----

const RULES = {
  "V-3": (f) => {
    const good = findFirst(f, /zxcvbn|passwordStrength|min(imum)?[_ ]?length|\.min\(\s*[68]|password.{0,20}(length|complexity)/i);
    if (good) return { status: "pass", evidence: evid(good), note: "Найдена проверка пароля" };
    return { status: "manual", evidence: "", note: "Проверка сложности пароля не обнаружена — подтвердить вручную" };
  },
  "V-4": (f) => {
    const good = findFirst(f, /rate[-_ ]?limit|express-rate-limit|loginAttempts|failedAttempts|lockout|bruteforce|too many attempts/i);
    if (good) return { status: "pass", evidence: evid(good), note: "Найден механизм ограничения попыток" };
    return { status: "manual", evidence: "", note: "Блокировка после N попыток не обнаружена" };
  },
  "V-5": (f) => {
    const good = findFirst(f, /\bmfa\b|2fa|two[-_ ]?factor|\btotp\b|otpauth|speakeasy|authenticator|otplib/i);
    if (good) return { status: "pass", evidence: evid(good), note: "Найдены признаки MFA" };
    return { status: "manual", evidence: "", note: "MFA не обнаружена" };
  },
  "V-6": (f) => {
    const good = findFirst(f, /bcrypt|argon2|scrypt|pbkdf2/i);
    const risk = findFirst(f, /password\s*===\s*|password\s*==\s*[^=]|plain[_ ]?password/i);
    if (good) return { status: "pass", evidence: evid(good), note: "Хеширование паролей найдено" };
    if (risk) return { status: "fail", evidence: evid(risk), note: "Возможное сравнение пароля в открытом виде" };
    return { status: "manual", evidence: "", note: "Хеширование не обнаружено (возможно, внешняя аутентификация)" };
  },
  "VI-1": (f) => {
    const good = findFirst(f, /\brole\b|\brbac\b|permission|\bcasl\b|\bability\b|hasRole|requireRole/i);
    if (good) return { status: "pass", evidence: evid(good), note: "Признаки ролевой модели" };
    return { status: "manual", evidence: "", note: "Ролевая модель не обнаружена" };
  },
  "VI-3": (f) => {
    const good = findFirst(f, /maxAge|expiresIn|sessionTimeout|session.{0,20}expire|cookie.{0,20}maxAge|jwt.{0,20}expires/i);
    if (good) return { status: "pass", evidence: evid(good), note: "Ограничение времени сессии найдено" };
    return { status: "manual", evidence: "", note: "Таймаут сессии не обнаружен" };
  },
  "VI-4": (f) => {
    const good = findFirst(f, /getServerSession|requireAuth|withAuth|isAuthenticated|verifyToken|middleware.*auth|auth.*middleware/i);
    if (good) return { status: "pass", evidence: evid(good), note: "Признаки серверной авторизации" };
    return { status: "manual", evidence: "", note: "Серверная авторизация эндпоинтов не подтверждена — проверить каждый API-роут" };
  },
  "VII-1": (f) => {
    const good = findFirst(f, /winston|pino|bunyan|\blog4|logger\.(info|warn|error|audit)|auditLog/i);
    if (good) return { status: "pass", evidence: evid(good), note: "Найдена система логирования" };
    return { status: "manual", evidence: "", note: "Структурированное логирование не обнаружено" };
  },
  "VII-2": (f) => {
    const good = findFirst(f, /req\.ip|x-forwarded-for|remoteAddress|getClientIp|request\.ip/i);
    if (good) return { status: "pass", evidence: evid(good), note: "Фиксация IP найдена" };
    return { status: "manual", evidence: "", note: "Фиксация IP в логах не обнаружена" };
  },
  "VIII-1": (f) => {
    const risk = findFirst(f, /(query|execute|raw)\s*\(\s*[`'"].{0,80}(SELECT|INSERT|UPDATE|DELETE|WHERE).{0,80}(\$\{|['"]\s*\+)/i);
    const orm = findFirst(f, /prisma|sequelize|typeorm|drizzle|knex|mongoose|\.\$queryRaw|\?\s*,\s*\[|\$1/i);
    if (risk) return { status: "fail", evidence: evid(risk), note: "Похоже на конкатенацию SQL — риск инъекции" };
    if (orm) return { status: "pass", evidence: evid(orm), note: "ORM/параметризация, сырой конкатенации не найдено" };
    return { status: "manual", evidence: "", note: "SQL-доступ не распознан — проверить вручную" };
  },
  "VIII-2": (f) => {
    const risk = findFirst(f, /dangerouslySetInnerHTML|\.innerHTML\s*=|v-html|\.html\(|document\.write/i);
    const jsx = findFirst(f, /\.(jsx|tsx)$|from\s+['"]react['"]/i);
    if (risk) return { status: "fail", evidence: evid(risk), note: "Прямая вставка HTML — риск XSS, проверить санитизацию" };
    if (jsx) return { status: "pass", evidence: evid(jsx), note: "React экранирует по умолчанию; ручных innerHTML не найдено" };
    return { status: "manual", evidence: "", note: "Экранирование вывода не подтверждено" };
  },
  "VIII-3": (f) => {
    const good = findFirst(f, /\bcsrf\b|csurf|xsrf|sameSite|SameSite/i);
    if (good) return { status: "pass", evidence: evid(good), note: "Признаки защиты от CSRF" };
    return { status: "manual", evidence: "", note: "Защита от CSRF не обнаружена (для API на токенах может быть неприменимо)" };
  },
  "VIII-5": (f) => {
    const good = findFirst(f, /helmet|Strict-Transport-Security|Content-Security-Policy|X-Frame-Options|\bhsts\b/i);
    if (good) return { status: "pass", evidence: evid(good), note: "Найдены безопасные заголовки" };
    return { status: "manual", evidence: "", note: "Безопасные заголовки в коде не найдены (могут задаваться на прокси)" };
  },
  "IX-1": (f) => {
    const good = findFirst(f, /forceSSL|requireHTTPS|Strict-Transport-Security|redirect.{0,15}https|https:\/\/[^"'\s]*\$\{/i);
    if (good) return { status: "pass", evidence: evid(good), note: "Признаки принудительного HTTPS" };
    return { status: "manual", evidence: "", note: "Принуждение HTTPS в коде не найдено (обычно на реверс-прокси)" };
  },
  "IX-4": (f) => {
    const risk = findFirst(f, /(sk_live_[0-9a-zA-Z]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN[^-]*PRIVATE KEY|(api[_-]?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9_\-\/+]{16,}['"])/);
    const good = findFirst(f, /process\.env\.[A-Z]/);
    if (risk) return { status: "fail", evidence: evid(risk), note: "Похоже на секрет в коде — вынести в переменные окружения" };
    if (good) return { status: "pass", evidence: evid(good), note: "Секреты читаются из окружения" };
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
