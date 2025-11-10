// LL(1) парсер для объявлений переменных Pascal (вариант с string[n] и array[a..b] of type)
export function parse(tokens) {
  let pos = 0;
  const errors = [];
  const cur = () => tokens[pos];
  const accept = (type, value) => {
    const t = cur();
    if (!t) {
      errors.push(
        `Ошибка: ожидался ${value || type}, но встретился конец ввода`
      );
      return false;
    }
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
  const parseIdList = () => {
    if (!expect("ident")) return false;
    while (accept("punct", ",")) {
      if (!expect("ident")) return false;
    }
    return true;
  };
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
        const numTok = tokens[pos - 1];
        const size = parseInt(numTok.value, 10);
        if (!expect("punct", "]")) return false;
        if (size <= 0 || size > 255) {
          errors.push(
            `Ошибка: недопустимый размер string[${size}] (строка ${numTok.line}, позиция ${numTok.col})`
          );
        }
      }
      return true;
    }
    if (t.type === "keyword" && t.value === "array") {
      pos++;
      if (!expect("punct", "[")) return false;
      if (!expect("number")) return false;
      const fromTok = tokens[pos - 1];
      if (!expect("dots", "..")) return false;
      if (!expect("number")) return false;
      const toTok = tokens[pos - 1];
      if (!expect("punct", "]")) return false;
      if (!expect("keyword", "of")) return false;
      const from = parseInt(fromTok.value, 10);
      const to = parseInt(toTok.value, 10);
      if (from >= to) {
        errors.push(
          `Ошибка: некорректный диапазон массива [${from}..${to}] (строка ${fromTok.line}, позиция ${fromTok.col})`
        );
      }
      return parseType();
    }
    errors.push(
      `Ошибка: неизвестный тип '${t.value}' (строка ${t.line}, позиция ${t.col})`
    );
    return false;
  };
  const parseDecl = () => {
    if (!expect("keyword", "var")) return false;
    if (!parseIdList()) return false;
    if (!expect("punct", ":")) return false;
    if (!parseType()) return false;
    if (!expect("punct", ";")) return false;
    return true;
  };
  while (pos < tokens.length) {
    if (!parseDecl()) break;
  }
  if (errors.length) return errors.join("\\n");
  return "✅ Описание корректное";
}
