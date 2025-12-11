class Scope {
  constructor(name, parent = null) {
    this.name = name;
    this.parent = parent;
    this.symbols = new Map(); // name -> info
  }

  hasLocal(name) {
    return this.symbols.has(name);
  }

  hasInChain(name) {
    let current = this;
    while (current) {
      if (current.symbols.has(name)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  declare(name, info) {
    this.symbols.set(name, info);
  }

  getSymbol(name) {
    let current = this;
    while (current) {
      if (current.symbols.has(name)) {
        return current.symbols.get(name);
      }
      current = current.parent;
    }
    return null;
  }
}

let globalScope = new Scope("global", null);
let currentScope = globalScope;

export function resetSemantics() {
  globalScope = new Scope("global", null);
  currentScope = globalScope;
}

export function enterScope(name) {
  const newScope = new Scope(name, currentScope);
  currentScope = newScope;
}

export function exitScope() {
  if (currentScope.parent) {
    currentScope = currentScope.parent;
  }
}

export function declareProcedure(nameObj, isForward = false) {
  const n = nameObj.name;

  // Проверяем конфликт в текущей области видимости
  if (currentScope.hasLocal(n)) {
    const existing = currentScope.getSymbol(n);
    return {
      error: true,
      message: `Конфликт имени процедуры '${n}' с ранее объявленным символом в строке ${existing.pos.line}`,
      name: n,
      line: nameObj.line,
      col: nameObj.col
    };
  }

  currentScope.declare(n, {
    kind: "procedure",
    pos: { line: nameObj.line, col: nameObj.col },
    forward: !!isForward
  });

  return { error: false };
}

export function declareFunction(nameObj, returnType, isForward = false) {
  const n = nameObj.name;

  // Проверяем конфликт в текущей области видимости
  if (currentScope.hasLocal(n)) {
    const existing = currentScope.getSymbol(n);
    return {
      error: true,
      message: `Конфликт имени функции '${n}' с ранее объявленным символом в строке ${existing.pos.line}`,
      name: n,
      line: nameObj.line,
      col: nameObj.col
    };
  }

  currentScope.declare(n, {
    kind: "function",
    returnType,
    pos: { line: nameObj.line, col: nameObj.col },
    forward: !!isForward
  });

  return { error: false };
}

export function declareParams(params) {
  const seen = new Set();

  for (const param of params) {
    if (seen.has(param.name)) {
      return {
        error: true,
        message: `Повторное объявление параметра '${param.name}'`,
        line: param.line,
        col: param.col
      };
    }
    seen.add(param.name);
  }

  return { error: false };
}

// Вспомогательная функция для отладки
export function getCurrentScope() {
  return currentScope;
}
