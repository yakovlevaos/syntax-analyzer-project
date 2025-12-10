export function parseWithSemantics(tokens, grammar) {
  let pos = 0;
  const errors = [];

  function currentToken() {
    return tokens[pos];
  }

  function match(type) {
    const tok = currentToken();
    if (tok && tok.type === type) {
      pos++;
      return tok;
    } else {
      errors.push({
        type: "syntax",
        line: 1,
        col: tok ? tok.pos : pos,
        message: `Ожидался ${type}, найден ${tok ? tok.value : "EOF"}`
      });
      return null;
    }
  }

  function parseIdent() {
    let t = match("letter");
    if (!t) return null;
    while (
      currentToken() &&
      (currentToken().type === "letter" || currentToken().type === "digit")
    ) {
      pos++;
    }
    return t.value;
  }

  function parseParam() {
    const name = parseIdent();
    if (!match(":")) return null;
    const type = currentToken() ? match(currentToken().type) : null;
    if (grammar.productions.Param[0].some((p) => p.action === "declareParam")) {
      // семантика параметра
    }
    return { name, type };
  }

  function parseParamList() {
    if (currentToken() && currentToken().type === "(") {
      match("(");
      parseParam();
      while (currentToken() && currentToken().type === ",") {
        match(",");
        parseParam();
      }
      match(")");
    }
  }

  function parseProcedureDecl() {
    match("procedure");
    const name = parseIdent();
    parseParamList();
    match(";");
    if (currentToken() && currentToken().type === "forward") {
      match("forward");
    } else {
      parseBody();
    }
    return name;
  }

  function parseFunctionDecl() {
    match("function");
    const name = parseIdent();
    parseParamList();
    match(":");
    match(currentToken().type); // Type
    match(";");
    if (currentToken() && currentToken().type === "forward") {
      match("forward");
    } else {
      parseBody();
    }
    return name;
  }

  function parseDecl() {
    if (currentToken() && currentToken().type === "procedure")
      parseProcedureDecl();
    else if (currentToken() && currentToken().type === "function")
      parseFunctionDecl();
    else
      errors.push({
        type: "syntax",
        line: 1,
        col: currentToken()?.pos,
        message: "Ожидалась процедура или функция"
      });
  }

  function parseDeclList() {
    while (currentToken()) parseDecl();
  }

  function parseBody() {
    match("begin");
    parseDeclList();
    match("end");
  }

  parseDeclList();

  return {
    ok: errors.length === 0,
    errors
  };
}
