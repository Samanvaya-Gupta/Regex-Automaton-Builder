const EPSILON = "ε";

const state = {
  regex: "",
  nfa: null,
  dfa: null,
  currentMachine: null,
  machineType: "-",
};

const els = {
  regexInput: document.getElementById("regexInput"),
  testInput: document.getElementById("testInput"),
  buildNfaBtn: document.getElementById("buildNfaBtn"),
  buildDfaBtn: document.getElementById("buildDfaBtn"),
  simulateBtn: document.getElementById("simulateBtn"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
  graphSvg: document.getElementById("graphSvg"),
  stateCount: document.getElementById("stateCount"),
  transitionCount: document.getElementById("transitionCount"),
  machineType: document.getElementById("machineType"),
  alphabetLabel: document.getElementById("alphabetLabel"),
};

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? "#ab2f43" : "#355267";
}

function isSymbolToken(t) {
  return !["|", ".", "*", "+", "?", "(", ")"].includes(t);
}

function tokenize(regex) {
  const tokens = [];
  let escaped = false;
  for (let i = 0; i < regex.length; i += 1) {
    const ch = regex[i];
    if (!escaped && ch === "\\") {
      escaped = true;
      continue;
    }
    tokens.push(ch);
    escaped = false;
  }
  if (escaped) {
    throw new Error("Dangling escape at end of regex.");
  }
  return tokens;
}

function addConcatOperators(tokens) {
  const result = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const curr = tokens[i];
    const next = tokens[i + 1];
    result.push(curr);
    if (!next) continue;

    const currCanConcat = isSymbolToken(curr) || [")", "*", "+", "?"].includes(curr);
    const nextCanConcat = isSymbolToken(next) || next === "(";
    if (currCanConcat && nextCanConcat) {
      result.push(".");
    }
  }
  return result;
}

function toPostfix(regex) {
  const rawTokens = tokenize(regex);
  if (!rawTokens.length) {
    throw new Error("Regex cannot be empty.");
  }
  const tokens = addConcatOperators(rawTokens);
  const output = [];
  const stack = [];
  const precedence = { "|": 1, ".": 2, "*": 3, "+": 3, "?": 3 };

  for (const t of tokens) {
    if (isSymbolToken(t)) {
      output.push(t);
      continue;
    }
    if (t === "(") {
      stack.push(t);
      continue;
    }
    if (t === ")") {
      let foundLeftParen = false;
      while (stack.length) {
        const top = stack.pop();
        if (top === "(") {
          foundLeftParen = true;
          break;
        }
        output.push(top);
      }
      if (!foundLeftParen) {
        throw new Error("Unbalanced parentheses.");
      }
      continue;
    }

    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top === "(") break;
      if (precedence[top] >= precedence[t]) {
        output.push(stack.pop());
      } else {
        break;
      }
    }
    stack.push(t);
  }

  while (stack.length) {
    const top = stack.pop();
    if (top === "(") throw new Error("Unbalanced parentheses.");
    output.push(top);
  }

  return output;
}

function buildNfaFromRegex(regex) {
  const postfix = toPostfix(regex);
  let nextId = 0;
  const transitions = new Map();
  const alphabet = new Set();

  function newState() {
    const id = nextId;
    nextId += 1;
    return id;
  }

  function addTransition(from, symbol, to) {
    if (!transitions.has(from)) transitions.set(from, []);
    transitions.get(from).push({ symbol, to });
    if (symbol !== EPSILON) alphabet.add(symbol);
  }

  const stack = [];
  for (const token of postfix) {
    if (isSymbolToken(token)) {
      const s = newState();
      const e = newState();
      addTransition(s, token, e);
      stack.push({ start: s, accept: e });
      continue;
    }

    if (token === ".") {
      const b = stack.pop();
      const a = stack.pop();
      if (!a || !b) throw new Error("Invalid regex structure.");
      addTransition(a.accept, EPSILON, b.start);
      stack.push({ start: a.start, accept: b.accept });
      continue;
    }

    if (token === "|") {
      const b = stack.pop();
      const a = stack.pop();
      if (!a || !b) throw new Error("Invalid regex structure.");
      const s = newState();
      const e = newState();
      addTransition(s, EPSILON, a.start);
      addTransition(s, EPSILON, b.start);
      addTransition(a.accept, EPSILON, e);
      addTransition(b.accept, EPSILON, e);
      stack.push({ start: s, accept: e });
      continue;
    }

    if (token === "*") {
      const a = stack.pop();
      if (!a) throw new Error("Invalid regex structure.");
      const s = newState();
      const e = newState();
      addTransition(s, EPSILON, a.start);
      addTransition(s, EPSILON, e);
      addTransition(a.accept, EPSILON, a.start);
      addTransition(a.accept, EPSILON, e);
      stack.push({ start: s, accept: e });
      continue;
    }

    if (token === "+") {
      const a = stack.pop();
      if (!a) throw new Error("Invalid regex structure.");
      const s = newState();
      const e = newState();
      addTransition(s, EPSILON, a.start);
      addTransition(a.accept, EPSILON, a.start);
      addTransition(a.accept, EPSILON, e);
      stack.push({ start: s, accept: e });
      continue;
    }

    if (token === "?") {
      const a = stack.pop();
      if (!a) throw new Error("Invalid regex structure.");
      const s = newState();
      const e = newState();
      addTransition(s, EPSILON, a.start);
      addTransition(s, EPSILON, e);
      addTransition(a.accept, EPSILON, e);
      stack.push({ start: s, accept: e });
      continue;
    }
  }

  if (stack.length !== 1) {
    throw new Error("Invalid regex: could not reduce expression.");
  }

  const fragment = stack[0];
  const states = Array.from({ length: nextId }, (_, i) => i);
  return {
    type: "NFA",
    start: fragment.start,
    accepts: new Set([fragment.accept]),
    states,
    transitions,
    alphabet,
  };
}

function epsilonClosure(nfa, seeds) {
  const closure = new Set(seeds);
  const stack = [...seeds];
  while (stack.length) {
    const s = stack.pop();
    const edges = nfa.transitions.get(s) || [];
    for (const edge of edges) {
      if (edge.symbol === EPSILON && !closure.has(edge.to)) {
        closure.add(edge.to);
        stack.push(edge.to);
      }
    }
  }
  return closure;
}

function move(nfa, statesSet, symbol) {
  const result = new Set();
  for (const s of statesSet) {
    const edges = nfa.transitions.get(s) || [];
    for (const edge of edges) {
      if (edge.symbol === symbol) result.add(edge.to);
    }
  }
  return result;
}

function setKey(setObj) {
  return [...setObj].sort((a, b) => a - b).join(",");
}

function convertNfaToDfa(nfa) {
  const symbols = [...nfa.alphabet];
  const dfaTransitions = new Map();
  const dfaStates = [];
  const dfaAccepts = new Set();
  const setById = new Map();

  const startSet = epsilonClosure(nfa, new Set([nfa.start]));
  const startKey = setKey(startSet);
  const idByKey = new Map([[startKey, 0]]);
  setById.set(0, startSet);
  dfaStates.push(0);

  const queue = [0];
  while (queue.length) {
    const fromId = queue.shift();
    const fromSet = setById.get(fromId);
    if ([...fromSet].some((s) => nfa.accepts.has(s))) {
      dfaAccepts.add(fromId);
    }

    for (const sym of symbols) {
      const moved = move(nfa, fromSet, sym);
      const closed = epsilonClosure(nfa, moved);
      if (!closed.size) continue;
      const key = setKey(closed);
      let toId = idByKey.get(key);
      if (toId === undefined) {
        toId = dfaStates.length;
        idByKey.set(key, toId);
        setById.set(toId, closed);
        dfaStates.push(toId);
        queue.push(toId);
      }
      if (!dfaTransitions.has(fromId)) dfaTransitions.set(fromId, []);
      dfaTransitions.get(fromId).push({ symbol: sym, to: toId });
    }
  }

  return {
    type: "DFA",
    start: 0,
    accepts: dfaAccepts,
    states: dfaStates,
    transitions: dfaTransitions,
    alphabet: nfa.alphabet,
    stateSubsets: setById,
  };
}

function simulateNfa(nfa, input) {
  let current = epsilonClosure(nfa, new Set([nfa.start]));
  for (const ch of input) {
    current = epsilonClosure(nfa, move(nfa, current, ch));
  }
  return [...current].some((s) => nfa.accepts.has(s));
}

function simulateDfa(dfa, input) {
  let current = dfa.start;
  for (const ch of input) {
    const edges = dfa.transitions.get(current) || [];
    const edge = edges.find((e) => e.symbol === ch);
    if (!edge) return false;
    current = edge.to;
  }
  return dfa.accepts.has(current);
}

function computeTransitionCount(machine) {
  let count = 0;
  for (const edges of machine.transitions.values()) {
    count += edges.length;
  }
  return count;
}

function computeLevels(machine) {
  const levels = new Map([[machine.start, 0]]);
  const queue = [machine.start];
  while (queue.length) {
    const s = queue.shift();
    const level = levels.get(s);
    const edges = machine.transitions.get(s) || [];
    for (const edge of edges) {
      if (!levels.has(edge.to)) {
        levels.set(edge.to, level + 1);
        queue.push(edge.to);
      }
    }
  }
  for (const s of machine.states) {
    if (!levels.has(s)) {
      levels.set(s, 0);
    }
  }
  return levels;
}

function layoutStates(machine) {
  const width = 1200;
  const height = 700;
  const paddingX = 80;
  const paddingY = 80;
  const levels = computeLevels(machine);

  const columns = new Map();
  for (const s of machine.states) {
    const col = levels.get(s);
    if (!columns.has(col)) columns.set(col, []);
    columns.get(col).push(s);
  }
  const sortedCols = [...columns.keys()].sort((a, b) => a - b);
  const maxCol = sortedCols.length > 1 ? sortedCols.length - 1 : 1;
  const positions = new Map();

  for (const col of sortedCols) {
    const nodes = columns.get(col);
    nodes.sort((a, b) => a - b);
    const x = paddingX + (col / maxCol) * (width - 2 * paddingX);
    const count = nodes.length;
    for (let i = 0; i < count; i += 1) {
      const y =
        count === 1
          ? height / 2
          : paddingY + (i / (count - 1)) * (height - 2 * paddingY);
      positions.set(nodes[i], { x, y });
    }
  }

  return positions;
}

function buildEdgeGroups(machine) {
  const groups = new Map();
  for (const from of machine.states) {
    const edges = machine.transitions.get(from) || [];
    for (const edge of edges) {
      const key = `${from}->${edge.to}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(edge.symbol);
    }
  }
  return groups;
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function renderMachine(machine) {
  const svg = els.graphSvg;
  while (svg.lastChild && svg.lastChild.tagName !== "defs") {
    svg.removeChild(svg.lastChild);
  }

  const positions = layoutStates(machine);
  const edgeGroups = buildEdgeGroups(machine);
  const radius = 24;

  for (const [pair, labels] of edgeGroups.entries()) {
    const [fromRaw, toRaw] = pair.split("->");
    const from = Number(fromRaw);
    const to = Number(toRaw);
    const fromPos = positions.get(from);
    const toPos = positions.get(to);
    const label = labels.join(", ");

    if (from === to) {
      const loopPath = `M ${fromPos.x} ${fromPos.y - radius}
        C ${fromPos.x - 36} ${fromPos.y - 64}, ${fromPos.x + 36} ${
          fromPos.y - 64
        }, ${fromPos.x} ${fromPos.y - radius}`;
      svg.appendChild(svgEl("path", { d: loopPath }));
      svg.appendChild(
        svgEl("text", {
          x: fromPos.x,
          y: fromPos.y - 76,
          class: "edge-label",
        })
      ).textContent = label;
      continue;
    }

    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const sx = fromPos.x + ux * radius;
    const sy = fromPos.y + uy * radius;
    const ex = toPos.x - ux * radius;
    const ey = toPos.y - uy * radius;
    const curve = Math.min(55, Math.abs(dy) * 0.26 + 14);
    const nx = -uy;
    const ny = ux;
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    const cx = mx + nx * curve;
    const cy = my + ny * curve;
    const d = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;

    svg.appendChild(svgEl("path", { d }));
    svg.appendChild(
      svgEl("text", {
        x: cx,
        y: cy - 6,
        class: "edge-label",
      })
    ).textContent = label;
  }

  const sortedStates = [...machine.states].sort((a, b) => a - b);
  for (const s of sortedStates) {
    const pos = positions.get(s);
    const isStart = s === machine.start;
    const isAccept = machine.accepts.has(s);

    let klass = "state";
    if (isAccept) klass += " accept";
    if (isStart) klass += " start";

    if (isAccept) {
      svg.appendChild(
        svgEl("circle", {
          cx: pos.x,
          cy: pos.y,
          r: radius + 5,
          class: "state accept",
          fill: "none",
          stroke: "#1b9aaa",
          "stroke-width": "2",
        })
      );
    }

    svg.appendChild(
      svgEl("circle", {
        cx: pos.x,
        cy: pos.y,
        r: radius,
        class: klass,
      })
    );

    svg.appendChild(
      svgEl("text", {
        x: pos.x,
        y: pos.y + 1,
        class: "state-label",
      })
    ).textContent = `q${s}`;

    if (isStart) {
      svg.appendChild(
        svgEl("line", {
          x1: pos.x - 62,
          y1: pos.y,
          x2: pos.x - radius - 2,
          y2: pos.y,
        })
      );
    }
  }
}

function updateStats(machine, typeLabel) {
  els.machineType.textContent = typeLabel;
  els.stateCount.textContent = machine.states.length;
  els.transitionCount.textContent = computeTransitionCount(machine);
  const alphabet = [...machine.alphabet].sort().join(", ");
  els.alphabetLabel.textContent = `Alphabet: ${alphabet || "-"}`;
}

function buildMachine(type) {
  const regex = els.regexInput.value.trim();
  state.regex = regex;
  if (!regex) {
    setStatus("Please enter a regular expression.", true);
    return;
  }

  try {
    state.nfa = buildNfaFromRegex(regex);
    if (type === "nfa") {
      state.currentMachine = state.nfa;
      state.machineType = "ε-NFA";
      renderMachine(state.currentMachine);
      updateStats(state.currentMachine, state.machineType);
      setStatus("Built ε-NFA successfully.");
      return;
    }

    state.dfa = convertNfaToDfa(state.nfa);
    state.currentMachine = state.dfa;
    state.machineType = "DFA";
    renderMachine(state.currentMachine);
    updateStats(state.currentMachine, state.machineType);
    setStatus("Built DFA using subset construction.");
  } catch (err) {
    setStatus(err.message || "Failed to build automaton.", true);
  }
}

function parseTestStrings() {
  const raw = els.testInput.value.trim();
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim());
}

function runSimulation() {
  if (!state.currentMachine) {
    setStatus("Build an automaton first.", true);
    return;
  }

  const tests = parseTestStrings();
  if (!tests.length) {
    setStatus("Add one or more test strings.", true);
    return;
  }

  const isNfa = state.currentMachine.type === "NFA";
  const evaluate = isNfa ? simulateNfa : simulateDfa;
  const fragment = document.createDocumentFragment();

  for (const str of tests) {
    const accepted = evaluate(state.currentMachine, str);
    const row = document.createElement("div");
    row.className = "result-item";

    const token = document.createElement("span");
    token.className = "token";
    token.textContent = str === "" ? '"" (empty string)' : str;

    const badge = document.createElement("span");
    badge.className = `badge ${accepted ? "accept" : "reject"}`;
    badge.textContent = accepted ? "Accepted" : "Rejected";

    row.appendChild(token);
    row.appendChild(badge);
    fragment.appendChild(row);
  }

  els.results.classList.remove("empty");
  els.results.textContent = "";
  els.results.appendChild(fragment);
  setStatus(`Simulated ${tests.length} string(s) on ${state.machineType}.`);
}

els.buildNfaBtn.addEventListener("click", () => buildMachine("nfa"));
els.buildDfaBtn.addEventListener("click", () => buildMachine("dfa"));
els.simulateBtn.addEventListener("click", runSimulation);
els.regexInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") buildMachine("nfa");
});

buildMachine("nfa");
