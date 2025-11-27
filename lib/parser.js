// parser.js
export function parse(tokens) {
  let pos = 0;
  const cur = () => tokens[pos];

  // Таблицы для проверки конфликтов имён
  const globalFuncs = new Set();
  const globalVars = new Set();

  const errors = [];

  // Функции для приёма и ожидания токенов
  const accept = (type, value) => {
    const t = cur();
    if (!t) return false;
    if (t.type === type && (!value || t.value === value)) {
      pos++;
      return true;
    }
    return false;
  };

  const expect = (type, value) => {
    const t = cur();
    if (!accept(type, value)) {
      const found = t ? t.value : "EOF";
      const line = t ? t.line : 1;
      const col = t ? t.col : 1;
      errors.push(
        `Ошибка: ожидалось '${
          value || type
        }', встретилось '${found}' (строка ${line}, позиция ${col})`
      );
      return false;
    }
    return true;
  };

  // Разбор списка идентификаторов
  const parseIdList = (namesSet) => {
    const t = cur();
    if (!expect("ident")) return false;
    if (namesSet.has(t.value)) {
      errors.push(
        `Конфликт имени '${t.value}' (строка ${t.line}, позиция ${t.col})`
      );
      return false;
    }
    namesSet.add(t.value);

    while (accept("punct", ",")) {
      const next = cur();
      if (!expect("ident")) return false;
      if (namesSet.has(next.value)) {
        errors.push(
          `Конфликт имени '${next.value}' (строка ${next.line}, позиция ${next.col})`
        );
        return false;
      }
      namesSet.add(next.value);
    }
    return true;
  };

  // Разбор типов
  const parseType = () => {
    const t = cur();
    if (!t) {
      errors.push("Ошибка: неожиданный конец при разборе типа");
      return false;
    }
    if (
      t.type === "keyword" &&
      ["integer", "real", "char", "boolean"].includes(t.value)
    ) {
      pos++;
      return true;
    }
    if (t.type === "keyword" && t.value === "string") {
      pos++;
      if (accept("punct", "[")) {
        const sizeTok = cur();
        if (!expect("number")) return false;
        const size = parseInt(sizeTok.value, 10);
        if (!expect("punct", "]")) return false;
        if (size <= 0 || size > 255) {
          errors.push(
            `Ошибка: недопустимый размер string[${size}] (строка ${sizeTok.line}, позиция ${sizeTok.col})`
          );
          return false;
        }
      }
      return true;
    }
    if (t.type === "keyword" && t.value === "array") {
      pos++;
      if (!expect("punct", "[")) return false;
      const fromTok = cur();
      if (!expect("number")) return false;
      if (!expect("dots", "..")) return false;
      const toTok = cur();
      if (!expect("number")) return false;
      if (!expect("punct", "]")) return false;
      if (!expect("keyword", "of")) return false;
      const from = parseInt(fromTok.value, 10);
      const to = parseInt(toTok.value, 10);
      if (from >= to) {
        errors.push(
          `Ошибка: некорректный диапазон массива [${from}..${to}] (строка ${fromTok.line}, позиция ${fromTok.col})`
        );
        return false;
      }
      return parseType();
    }
    errors.push(
      `Ошибка: неизвестный тип '${t.value}' (строка ${t.line}, позиция ${t.col})`
    );
    return false;
  };

  // Разбор списка параметров
  const parseParamList = () => {
    if (!accept("punct", "(")) return true; // пустой список параметров
    if (!parseParamOpt()) return false;
    return expect("punct", ")");
  };

  const parseParamOpt = () => {
    const t = cur();
    if (!t || (t.type === "punct" && t.value === ")")) return true; // пусто
    if (!parseParam()) return false;
    while (accept("punct", ",")) {
      if (!parseParam()) return false;
    }
    return true;
  };

  const parseParam = () => {
    const t = cur();
    if (!expect("ident")) return false;
    const paramName = t.value;
    if (!expect("punct", ":")) return false;
    if (!parseType()) return false;
    return true;
  };

  // Разбор тела
  const parseBody = () => {
    if (!expect("keyword", "begin")) return false;
    return expect("keyword", "end");
  };

  // Разбор процедуры
  const parseProcedure = () => {
    const t = cur();
    if (!expect("ident")) return false;
    const procName = t.value;
    if (globalFuncs.has(procName)) {
      errors.push(
        `Конфликт имени процедуры '${procName}' (строка ${t.line}, позиция ${t.col})`
      );
      return false;
    }
    globalFuncs.add(procName);
    if (!parseParamList()) return false;
    if (!expect("punct", ";")) return false;
    if (accept("keyword", "forward")) return true;
    return parseBody();
  };

  // Разбор функции
  const parseFunction = () => {
    const t = cur();
    if (!expect("ident")) return false;
    const funcName = t.value;
    if (globalFuncs.has(funcName)) {
      errors.push(
        `Конфликт имени функции '${funcName}' (строка ${t.line}, позиция ${t.col})`
      );
      return false;
    }
    globalFuncs.add(funcName);
    if (!parseParamList()) return false;
    if (!expect("punct", ":")) return false;
    if (!parseType()) return false;
    if (!expect("punct", ";")) return false;
    if (accept("keyword", "forward")) return true;
    return parseBody();
  };

  // Разбор объявления
  const parseDecl = () => {
    const t = cur();
    if (!t) return false;
    if (t.type === "keyword" && t.value === "var") {
      pos++;
      return (
        parseIdList(globalVars) &&
        expect("punct", ":") &&
        parseType() &&
        expect("punct", ";")
      );
    }
    if (t.type === "keyword" && t.value === "procedure") {
      pos++;
      return parseProcedure();
    }
    if (t.type === "keyword" && t.value === "function") {
      pos++;
      return parseFunction();
    }
    errors.push(
      `Ошибка: неожиданное ключевое слово '${t.value}' (строка ${t.line}, позиция ${t.col})`
    );
    return false;
  };

  // Главный цикл
  while (pos < tokens.length) {
    if (!parseDecl()) break;
    if (errors.length) break; // прекращаем разбор при первой ошибке
  }

  if (errors.length) return errors[0]; // возвращаем только первую ошибку
  return "✅ Описание корректное";
}
