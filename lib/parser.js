export function parse(tokens) {
  let pos = 0;
  const errors = [];

  const cur = () => tokens[pos];
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
    if (!accept(type, value)) {
      const t = cur();
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

  // --- Парсинг идентификаторов ---
  const parseIdList = () => {
    if (!expect("ident")) return false;
    while (accept("punct", ",")) {
      if (!expect("ident")) return false;
    }
    return true;
  };

  // --- Парсинг типов ---
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
        if (!expect("number")) return false;
        if (!expect("punct", "]")) return false;
      }
      return true;
    }
    if (t.type === "keyword" && t.value === "array") {
      pos++;
      if (!expect("punct", "[")) return false;
      if (!expect("number")) return false;
      if (!expect("dots", "..")) return false;
      if (!expect("number")) return false;
      if (!expect("punct", "]")) return false;
      if (!expect("keyword", "of")) return false;
      return parseType();
    }
    errors.push(
      `Ошибка: неизвестный тип '${t.value}' (строка ${t.line}, позиция ${t.col})`
    );
    return false;
  };

  // --- Парсинг параметров ---
  const parseParamList = () => {
    if (accept("punct", "(")) {
      if (!parseParam()) return false;
      while (accept("punct", ";") || accept("punct", ",")) {
        if (!parseParam()) return false;
      }
      if (!expect("punct", ")")) return false;
    }
    return true;
  };

  const parseParam = () => {
    if (!expect("ident")) return false;
    if (!expect("punct", ":")) return false;
    if (!parseType()) return false;
    return true;
  };

  // --- Объявления переменных ---
  const parseVarDecl = () => {
    if (!expect("keyword", "var")) return false;
    if (!parseIdList()) return false;
    if (!expect("punct", ":")) return false;
    if (!parseType()) return false;
    if (!expect("punct", ";")) return false;
    return true;
  };

  // --- Объявления процедур ---
  const parseProcedure = () => {
    if (!expect("keyword", "procedure")) return false;
    if (!expect("ident")) return false;
    if (!parseParamList()) return false;
    if (!expect("punct", ";")) return false;

    if (accept("keyword", "forward")) {
      // forward может быть с точкой с запятой
      accept("punct", ";");
      return true;
    }

    if (!parseBody()) return false;
    return true;
  };

  // --- Объявления функций ---
  const parseFunction = () => {
    if (!expect("keyword", "function")) return false;
    if (!expect("ident")) return false;
    if (!parseParamList()) return false;
    if (!expect("punct", ":")) return false;
    if (!parseType()) return false;
    if (!expect("punct", ";")) return false;

    if (accept("keyword", "forward")) {
      accept("punct", ";");
      return true;
    }

    if (!parseBody()) return false;
    return true;
  };

  // --- Тело процедуры/функции ---
  const parseBody = () => {
    if (!expect("keyword", "begin")) return false;
    if (!expect("keyword", "end")) return false;
    if (!accept("punct", ";")) return true;
    return true;
  };

  // --- Основной разбор ---
  while (pos < tokens.length) {
    const t = cur();
    if (!t) break;
    if (t.type === "keyword") {
      if (t.value === "var") {
        if (!parseVarDecl()) break;
      } else if (t.value === "procedure") {
        if (!parseProcedure()) break;
      } else if (t.value === "function") {
        if (!parseFunction()) break;
      } else {
        errors.push(
          `Ошибка: неожиданное начало объявления '${t.value}' (строка ${t.line}, позиция ${t.col})`
        );
        break;
      }
    } else {
      errors.push(
        `Ошибка: неожиданное начало объявления '${t.value}' (строка ${t.line}, позиция ${t.col})`
      );
      break;
    }

    // остановка после первой ошибки
    if (errors.length > 0) break;
  }

  if (errors.length) return errors[0]; // только первая ошибка
  return "✅ Описание корректное";
}
