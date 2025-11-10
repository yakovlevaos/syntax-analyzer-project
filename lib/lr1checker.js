// Функция замыкания множества LR(1)-пунктов
function closure(items, productions, terminals) {
  const closureSet = new Set(items.map((i) => JSON.stringify(i)));
  let added = true;

  while (added) {
    added = false;
    for (const serialized of Array.from(closureSet)) {
      const item = JSON.parse(serialized);
      const { lhs, rhs, dotPos, lookahead } = item;

      if (dotPos < rhs.length) {
        const symbol = rhs[dotPos];
        if (!terminals.includes(symbol)) {
          for (const prodRHS of productions[symbol] || []) {
            for (const la of [lookahead]) {
              // точный рассчет lookahead можно усложнить
              const newItem = {
                lhs: symbol,
                rhs: prodRHS,
                dotPos: 0,
                lookahead: la
              };
              const s = JSON.stringify(newItem);
              if (!closureSet.has(s)) {
                closureSet.add(s);
                added = true;
              }
            }
          }
        }
      }
    }
  }
  return Array.from(closureSet).map((s) => JSON.parse(s));
}

// Функция переходов goto
function goto(items, symbol, productions, terminals) {
  const moved = [];
  for (const it of items) {
    if (it.dotPos < it.rhs.length && it.rhs[it.dotPos] === symbol) {
      moved.push({
        lhs: it.lhs,
        rhs: it.rhs,
        dotPos: it.dotPos + 1,
        lookahead: it.lookahead
      });
    }
  }
  return closure(moved, productions, terminals);
}

function states(productions, terminals, startSymbol) {
  const startItem = {
    lhs: startSymbol + "'",
    rhs: [startSymbol],
    dotPos: 0,
    lookahead: "$"
  };
  productions[startSymbol + "'"] = [[startSymbol]];
  const C = [];
  C.push(closure([startItem], productions, terminals));

  let added = true;
  while (added) {
    added = false;
    for (const I of C) {
      const symbols = new Set(
        I.filter((it) => it.dotPos < it.rhs.length).map(
          (it) => it.rhs[it.dotPos]
        )
      );
      for (const X of symbols) {
        const g = goto(I, X, productions, terminals);
        if (g.length === 0) continue;
        if (!C.some((s) => equalStates(s, g))) {
          C.push(g);
          added = true;
        }
      }
    }
  }
  return C;
}

function equalStates(a, b) {
  if (a.length !== b.length) return false;
  for (const item of a)
    if (!b.some((it) => JSON.stringify(it) === JSON.stringify(item)))
      return false;
  return true;
}

function findProductionIndex(productions, lhs, rhs) {
  const prods = productions[lhs];
  for (let i = 0; i < prods.length; i++) {
    if (
      prods[i].length === rhs.length &&
      prods[i].every((x, idx) => x === rhs[idx])
    )
      return i;
  }
  return -1;
}

function buildTables(
  states,
  productions,
  terminals,
  nonterminals,
  startSymbol
) {
  const ACTION = {},
    GOTO = {};

  for (let i = 0; i < states.length; i++) {
    ACTION[i] = {};
    GOTO[i] = {};

    const state = states[i];

    for (const item of state) {
      if (item.dotPos < item.rhs.length) {
        const a = item.rhs[item.dotPos];
        if (terminals.includes(a)) {
          const g = goto(state, a, productions, terminals);
          const j = states.findIndex((s) => equalStates(s, g));
          if (j === -1) continue;
          if (ACTION[i][a] && ACTION[i][a] !== `s${j}`)
            return {
              isLR1: false,
              message: `Конфликт в состоянии ${i} по символу '${a}'`
            };
          ACTION[i][a] = `s${j}`;
        }
      } else {
        if (item.lhs === startSymbol + "'") {
          if (ACTION[i]["$"] && ACTION[i]["$"] !== "acc")
            return {
              isLR1: false,
              message: `Конфликт в состоянии ${i} по символу '$'`
            };
          ACTION[i]["$"] = "acc";
        } else {
          const prodIdx = findProductionIndex(productions, item.lhs, item.rhs);
          if (prodIdx === -1) continue;
          const a = item.lookahead;
          if (ACTION[i][a] && ACTION[i][a] !== `r${prodIdx}`)
            return {
              isLR1: false,
              message: `Конфликт свёртки в состоянии ${i} по символу '${a}'`
            };
          ACTION[i][a] = `r${prodIdx}`;
        }
      }
    }

    for (const A of nonterminals) {
      const g = goto(state, A, productions, terminals);
      const j = states.findIndex((s) => equalStates(s, g));
      if (j !== -1) GOTO[i][A] = j;
    }
  }

  return { isLR1: true, message: "Грамматика является LR(1)", ACTION, GOTO };
}

export function checkLR1Grammar(grammarJson) {
  const { terminals, nonterminals, startSymbol, productions } = grammarJson;
  const sts = states(productions, terminals, startSymbol);
  return buildTables(sts, productions, terminals, nonterminals, startSymbol);
}
