// lr1checker.js

function prodMapFrom(grammar) {
  const raw = grammar.productions || {};
  const prods = {};
  for (const lhs of Object.keys(raw)) {
    prods[lhs] = raw[lhs].map(
      (rhs) => rhs.filter((sym) => typeof sym === "string") // фильтруем action
    );
  }
  return prods;
}

function closure(items, prods, terminals) {
  const set = new Set(items.map((it) => JSON.stringify(it)));
  let added = true;
  while (added) {
    added = false;
    for (const s of Array.from(set)) {
      const it = JSON.parse(s);
      if (it.dot < it.rhs.length) {
        const B = it.rhs[it.dot];
        if (!terminals.includes(B)) {
          const list = prods[B] || [];
          for (const gamma of list) {
            const newItem = {
              lhs: B,
              rhs: gamma,
              dot: 0,
              lookahead: it.lookahead
            };
            const ns = JSON.stringify(newItem);
            if (!set.has(ns)) {
              set.add(ns);
              added = true;
            }
          }
        }
      }
    }
  }
  return Array.from(set).map((x) => JSON.parse(x));
}

function goto(items, X, prods, terminals) {
  const moved = [];
  for (const it of items) {
    if (it.dot < it.rhs.length && it.rhs[it.dot] === X) {
      moved.push({
        lhs: it.lhs,
        rhs: it.rhs,
        dot: it.dot + 1,
        lookahead: it.lookahead
      });
    }
  }
  return closure(moved, prods, terminals);
}

function equalState(a, b) {
  if (a.length !== b.length) return false;
  for (const it of a)
    if (!b.some((x) => JSON.stringify(x) === JSON.stringify(it))) return false;
  return true;
}

function findProdIndex(prods, lhs, rhs) {
  const list = prods[lhs] || [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (r.length === rhs.length && r.every((x, idx) => x === rhs[idx]))
      return i;
  }
  return -1;
}

export function checkLR1Grammar(grammar) {
  const terminals = grammar.terminals || [];
  const nonterminals = grammar.nonterminals || [];
  const start = grammar.startSymbol;
  const prods = prodMapFrom(grammar);
  const augmented = start + "'";

  prods[augmented] = [[start]];
  const startItem = { lhs: augmented, rhs: [start], dot: 0, lookahead: "$" };
  const C = [];
  C.push(closure([startItem], prods, terminals));

  let added = true;
  while (added) {
    added = false;
    for (const I of C) {
      const symbols = new Set(
        I.filter((it) => it.dot < it.rhs.length).map((it) => it.rhs[it.dot])
      );
      for (const X of symbols) {
        const g = goto(I, X, prods, terminals);
        if (g.length === 0) continue;
        if (!C.some((s) => equalState(s, g))) {
          C.push(g);
          added = true;
        }
      }
    }
  }

  const ACTION = {};
  const GOTO = {};
  for (let i = 0; i < C.length; i++) {
    ACTION[i] = {};
    GOTO[i] = {};
    const state = C[i];
    for (const it of state) {
      if (it.dot < it.rhs.length) {
        const a = it.rhs[it.dot];
        if (terminals.includes(a)) {
          const g = goto(state, a, prods, terminals);
          const j = C.findIndex((s) => equalState(s, g));
          if (j !== -1) {
            const shift = `s${j}`;
            if (ACTION[i][a] && ACTION[i][a] !== shift) {
              return {
                isLR1: false,
                message: `Сдвиг/свёртка или сдвиг/сдвиг конфликт в состоянии ${i} по символу ${a}`
              };
            }
            ACTION[i][a] = shift;
          }
        }
      } else {
        if (it.lhs === augmented) {
          ACTION[i]["$"] = "acc";
        } else {
          const idx = findProdIndex(prods, it.lhs, it.rhs);
          const a = it.lookahead || "$";
          const reduce = `r${idx}`;
          if (ACTION[i][a] && ACTION[i][a] !== reduce) {
            return {
              isLR1: false,
              message: `Конфликт свёртки в состоянии ${i} по символу ${a}`
            };
          }
          ACTION[i][a] = reduce;
        }
      }
    }

    for (const A of nonterminals) {
      const g = goto(state, A, prods, terminals);
      const j = C.findIndex((s) => equalState(s, g));
      if (j !== -1) GOTO[i][A] = j;
    }
  }

  return {
    isLR1: true,
    message: `Построено состояний: ${C.length}`,
    ACTION,
    GOTO
  };
}
