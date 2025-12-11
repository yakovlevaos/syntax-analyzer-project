import { buildLexerFromGrammar } from "./lexer";
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
    if (!currentToken || currentToken.type !== "letter") {
      return null;
    }

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
      const type = currentToken.type;
      nextToken();
      return type;
    }
    return null;
  }

  function parseParam() {
    const ident = parseIdent();
    if (!ident) {
      expect("letter", "Ожидался идентификатор параметра");
      return null;
    }

    if (!expect("colon")) return null;

    const type = parseType();
    if (!type) {
      expect("integer", "Ожидался тип параметра (integer или real)");
      return null;
    }

    return { ...ident, type };
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

    const firstParam = parseParam();
    if (firstParam) {
      params.push(firstParam);
    }

    while (currentToken && currentToken.type === "comma") {
      expect("comma");
      const param = parseParam();
      if (param) {
        params.push(param);
      }
    }

    expect("rparen"); // ← ИСПРАВЛЕНО: не прерываем при ошибке
    return params;
  }

  // ИСПРАВЛЕННАЯ ФУНКЦИЯ: рекурсивно парсит все объявления
  function parseDeclList() {
    let parsedAny = false;

    while (
      currentToken &&
      (currentToken.type === "procedure" || currentToken.type === "function")
    ) {
      if (parseDecl()) {
        parsedAny = true;
      } else {
        // При ошибке пропускаем токен, но продолжаем
        if (
          currentToken.type === "procedure" ||
          currentToken.type === "function"
        ) {
          nextToken();
        }
        break;
      }
    }

    return parsedAny || true; // Пустой список тоже валиден
  }

  // ИСПРАВЛЕННАЯ ФУНКЦИЯ: правильно обрабатывает вложенность
  function parseBody() {
    if (!expect("begin")) return false;

    enterScope("body");
    parseDeclList();
    exitScope();

    if (!expect("end")) return false;

    // Поддержка стандарта Паскаля: ; после end опционально
    if (currentToken && currentToken.type === "semicolon") {
      expect("semicolon");
    }

    return true;
  }

  function parseProcedureDecl() {
    if (!expect("procedure")) return false;

    const ident = parseIdent();
    if (!ident) {
      expect("letter", "Ожидалось имя процедуры");
      return false;
    }

    const params = parseParamList();

    if (!expect("semicolon")) return false;

    // Семантические действия
    const declResult = declareProcedure(ident, false);
    if (declResult.error) {
      errors.push({
        type: "semantic",
        message: declResult.message,
        line: declResult.line,
        col: declResult.col
      });
    }

    enterScope(ident.name);

    if (params.length > 0) {
      const paramDeclResult = declareParams(params);
      if (paramDeclResult.error) {
        errors.push({
          type: "semantic",
          message: paramDeclResult.message,
          line: paramDeclResult.line,
          col: paramDeclResult.col
        });
      }
    }

    // Опциональное тело
    if (currentToken && currentToken.type === "begin") {
      if (!parseBody()) {
        exitScope();
        return false;
      }
    }

    exitScope();
    return true;
  }

  function parseFunctionDecl() {
    if (!expect("function")) return false;

    const ident = parseIdent();
    if (!ident) {
      expect("letter", "Ожидалось имя функции");
      return false;
    }

    const params = parseParamList();

    if (!expect("colon")) return false;

    const type = parseType();
    if (!type) {
      expect(
        "integer",
        "Ожидался тип возвращаемого значения (integer или real)"
      );
      return false;
    }

    if (!expect("semicolon")) return false;

    // Семантические действия
    const declResult = declareFunction(ident, type, false);
    if (declResult.error) {
      errors.push({
        type: "semantic",
        message: declResult.message,
        line: declResult.line,
        col: declResult.col
      });
    }

    enterScope(ident.name);

    if (params.length > 0) {
      const paramDeclResult = declareParams(params);
      if (paramDeclResult.error) {
        errors.push({
          type: "semantic",
          message: paramDeclResult.message,
          line: paramDeclResult.line,
          col: paramDeclResult.col
        });
      }
    }

    // Опциональное тело
    if (currentToken && currentToken.type === "begin") {
      if (!parseBody()) {
        exitScope();
        return false;
      }
    }

    exitScope();
    return true;
  }

  function parseDecl() {
    if (!currentToken) return false;

    if (currentToken.type === "procedure") {
      return parseProcedureDecl();
    } else if (currentToken.type === "function") {
      return parseFunctionDecl();
    }

    return false;
  }

  function parseProgram() {
    parseDeclList();

    if (currentToken) {
      errors.push({
        type: "syntax",
        message: "Лишние токены после конца программы",
        line: currentToken.line,
        col: currentToken.col
      });
    }
  }

  parseProgram();

  return {
    ok: errors.length === 0,
    errors: errors
  };
}
