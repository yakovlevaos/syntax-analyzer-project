export function buildLexerFromGrammar(grammar) {
  const terminalPatterns = {
    procedure: /\bprocedure\b/,
    function: /\bfunction\b/,
    begin: /\bbegin\b/,
    end: /\bend\b/,
    var: /\bvar\b/,
    integer: /\binteger\b/,
    real: /\breal\b/,
    colon: /:/,
    semicolon: /;/,
    comma: /,/,
    lparen: /\(/,
    rparen: /\)/,
    letter: /[a-zA-Z]/,
    digit: /[0-9]/
  };

  const terminals = grammar.terminals;

  return function lexer(input) {
    const tokens = [];
    let pos = 0,
      line = 1,
      col = 1;

    while (pos < input.length) {
      if (/\s/.test(input[pos])) {
        if (input[pos] === "\n") {
          line++;
          col = 1;
        } else {
          col++;
        }
        pos++;
        continue;
      }

      let matched = false;
      for (const t of terminals) {
        const regex = terminalPatterns[t];
        if (!regex) continue;
        const m = input.slice(pos).match(regex);
        if (m && m.index === 0) {
          tokens.push({ type: t, value: m[0], line, col });
          const lines = m[0].split("\n");
          if (lines.length > 1) {
            line += lines.length - 1;
            col = lines[lines.length - 1].length + 1;
          } else {
            col += m[0].length;
          }
          pos += m[0].length;
          matched = true;
          break;
        }
      }

      if (!matched)
        throw { type: "lex", message: `Неизвестный токен`, line, col };
    }

    return tokens;
  };
}
