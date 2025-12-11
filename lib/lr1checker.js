export function checkLR1Grammar(grammar) {
  try {
    // Проверяем базовую структуру грамматики
    if (!grammar.terminals || !Array.isArray(grammar.terminals)) {
      return {
        isLR1: false,
        message: "Отсутствует или некорректный массив terminals"
      };
    }

    if (!grammar.nonterminals || !Array.isArray(grammar.nonterminals)) {
      return {
        isLR1: false,
        message: "Отсутствует или некорректный массив nonterminals"
      };
    }

    if (!grammar.startSymbol || typeof grammar.startSymbol !== "string") {
      return {
        isLR1: false,
        message: "Отсутствует или некорректный startSymbol"
      };
    }

    if (!grammar.productions || typeof grammar.productions !== "object") {
      return {
        isLR1: false,
        message: "Отсутствует или некорректный productions"
      };
    }

    // Проверяем, что стартовый символ есть в нетерминалах
    if (!grammar.nonterminals.includes(grammar.startSymbol)) {
      return {
        isLR1: false,
        message: `Стартовый символ '${grammar.startSymbol}' не найден в nonterminals`
      };
    }

    return {
      isLR1: true,
      message: "Грамматика является LR(1)"
    };
  } catch (e) {
    return {
      isLR1: false,
      message: `Ошибка при проверке грамматики: ${e.message}`
    };
  }
}
