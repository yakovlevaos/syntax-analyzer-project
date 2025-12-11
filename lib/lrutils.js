export function prodMapFrom(grammar) {
  const raw = grammar.productions || {};
  const prods = {};
  for (const lhs of Object.keys(raw)) {
    prods[lhs] = raw[lhs].map((rhs) =>
      rhs.filter((sym) => typeof sym === "string")
    );
  }
  return prods;
}
