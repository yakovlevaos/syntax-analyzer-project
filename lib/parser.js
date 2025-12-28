import {
  resetSemantics,
  enterScope,
  exitScope,
  declareProcedure,
  declareFunction,
  declareParams
} from "./semanticActions";

export function parseWithSemantics(tokens, grammar) {
  const errors = [];
  let pos = 0;
  let currentToken = tokens[pos];

  resetSemantics();

  function nextToken() {
    pos++;
    currentToken = tokens[pos];
    return currentToken;
  }

  function expect(type, errorMsg = null) {
    if (!currentToken) {
      errors.push({
        type: "syntax",
        message: errorMsg || `Ожидался '${type}', но достигнут конец файла`,
        line: tokens[tokens.length - 1]?.line || 1,
        col: tokens[tokens.length - 1]?.col || 1
      });
      return false;
    }

    if (currentToken.type === type) {
      const token = currentToken;
      nextToken();
      return token;
    } else {
      errors.push({
        type: "syntax",
        message:
          errorMsg || `Ожидался '${type}', но найден '${currentToken.value}'`,
        line: currentToken.line,
        col: currentToken.col
      });
      return false;
    }
  }

  function parseIdent() {
    if (!currentToken || currentToken.type !== "letter") return null;

    let name = currentToken.value;
    const startLine = currentToken.line;
    const startCol = currentToken.col;
    nextToken();

    while (
      currentToken &&
      (currentToken.type === "letter" || currentToken.type === "digit")
    ) {
      name += currentToken.value;
      nextToken();
    }

    return { name, line: startLine, col: startCol };
  }

  function parseType() {
    if (
      currentToken &&
      (currentToken.type === "integer" || currentToken.type === "real")
    ) {
      const t = currentToken.type;
      nextToken();
      return t;
    }
    return null;
  }

  function parseParamSection() {
    const params = [];
    const names = [];

    const firstIdent = parseIdent();
    if (!firstIdent) {
      expect("letter", "Ожидался идентификатор параметра");
      return params;
    }
    names.push(firstIdent);

    while (currentToken && currentToken.type === "comma") {
      nextToken();
      const ident = parseIdent();
      if (!ident) {
        expect("letter", "Ожидался идентификатор параметра");
        return params;
      }
      names.push(ident);
    }

    if (!expect("colon")) return params;

    const type = parseType();
    if (!type) {
      expect("integer", "Ожидался тип параметра");
      return params;
    }

    for (const n of names) {
      params.push({ ...n, type });
    }

    return params;
  }

  function parseParamList() {
    const params = [];

    if (!currentToken || currentToken.type !== "lparen") {
      return params;
    }

    expect("lparen");

    if (currentToken && currentToken.type === "rparen") {
      expect("rparen");
      return params;
    }

    params.push(...parseParamSection());

    while (currentToken && currentToken.type === "semicolon") {
      nextToken();
      params.push(...parseParamSection());
    }

    expect("rparen");
    return params;
  }

  function parseDeclList(allowEmpty = false) {
    if (
      !allowEmpty &&
      (!currentToken ||
        (currentToken.type !== "procedure" && currentToken.type !== "function"))
    ) {
      errors.push({
        type: "syntax",
        message: "Ожидалось объявление процедуры или функции",
        line: currentToken?.line || 1,
        col: currentToken?.col || 1
      });
      return false;
    }

    while (
      currentToken &&
      (currentToken.type === "procedure" || currentToken.type === "function")
    ) {
      parseDecl();
    }

    return true;
  }

  function parseBody() {
    if (!expect("begin")) return false;

    enterScope("body");
    parseDeclList(true); // пустой список разрешён
    exitScope();

    if (!expect("end")) return false;

    if (currentToken && currentToken.type === "semicolon") {
      expect("semicolon");
    }

    return true;
  }

  function parseProcedureDecl() {
    expect("procedure");

    const ident = parseIdent();
    if (!ident) {
      expect("letter", "Ожидалось имя процедуры");
      return false;
    }

    const params = parseParamList();
    expect("semicolon");

    const isForward = currentToken && currentToken.type === "forward";

    const declResult = declareProcedure(ident, isForward);
    if (declResult.error) {
      errors.push({
        type: "semantic",
        message: declResult.message,
        line: declResult.line,
        col: declResult.col
      });
    }

    if (isForward) {
      expect("forward");
      expect("semicolon");
      return true;
    }

    enterScope(ident.name);

    if (params.length > 0) {
      const res = declareParams(params);
      if (res.error) {
        errors.push({
          type: "semantic",
          message: res.message,
          line: res.line,
          col: res.col
        });
      }
    }

    if (currentToken && currentToken.type === "begin") {
      parseBody();
    }

    exitScope();
    return true;
  }

  function parseFunctionDecl() {
    expect("function");

    const ident = parseIdent();
    if (!ident) {
      expect("letter", "Ожидалось имя функции");
      return false;
    }

    const params = parseParamList();
    expect("colon");

    const type = parseType();
    if (!type) {
      expect("integer", "Ожидался тип функции");
      return false;
    }

    expect("semicolon");

    const isForward = currentToken && currentToken.type === "forward";

    const declResult = declareFunction(ident, type, isForward);
    if (declResult.error) {
      errors.push({
        type: "semantic",
        message: declResult.message,
        line: declResult.line,
        col: declResult.col
      });
    }

    if (isForward) {
      expect("forward");
      expect("semicolon");
      return true;
    }

    enterScope(ident.name);

    if (params.length > 0) {
      const res = declareParams(params);
      if (res.error) {
        errors.push({
          type: "semantic",
          message: res.message,
          line: res.line,
          col: res.col
        });
      }
    }

    if (currentToken && currentToken.type === "begin") {
      parseBody();
    }

    exitScope();
    return true;
  }

  function parseDecl() {
    if (!currentToken) return false;
    if (currentToken.type === "procedure") return parseProcedureDecl();
    if (currentToken.type === "function") return parseFunctionDecl();
    return false;
  }

  function parseProgram() {
    // верхний уровень: пустой список запрещён
    parseDeclList(true); // разрешаем пустой список
  }

  parseProgram();

  return {
    ok: errors.length === 0,
    errors
  };
}
