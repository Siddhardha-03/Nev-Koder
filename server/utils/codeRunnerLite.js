import { mapCanonicalToLang } from './scaffoldGenerator.js';

const sanitizeTitleToFunction = (title = '') => {
  if (!title) return 'solve';
  const tokens = String(title)
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return 'solve';

  const [first, ...rest] = tokens;
  const camel = first.toLowerCase() + rest.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join('');
  return camel || 'solve';
};

const parseScalar = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    return JSON.parse(raw);
  } catch {
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw === 'null') return null;
    return raw;
  }
};

export const parseInputToParams = (input = '') => {
  const text = String(input || '').trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return lines.map(parseScalar);
  }
};

const normalizeCanonicalType = (type) => String(type || '').toLowerCase().trim();

const isListNodeType = (type) => normalizeCanonicalType(type).includes('listnode');
const isTreeNodeType = (type) => normalizeCanonicalType(type).includes('treenode');
const isGraphNodeType = (type) => normalizeCanonicalType(type).includes('graphnode');

const escapeCppString = (value = '') => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"');

const toJavaScriptLiteral = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.map(toJavaScriptLiteral).join(', ')}]`;
  if (typeof value === 'object') return JSON.stringify(value);
  return JSON.stringify(value);
};

const toPythonLiteral = (value) => {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (Array.isArray(value)) return `[${value.map(toPythonLiteral).join(', ')}]`;
  if (typeof value === 'object') {
    const parts = Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${toPythonLiteral(v)}`);
    return `{${parts.join(', ')}}`;
  }
  return 'None';
};

const detectJavaScriptFunctionName = (code, fallbackName) => {
  if (!code || typeof code !== 'string') return fallbackName;

  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');

  const regexes = [
    /module\.exports\s*=\s*([A-Za-z0-9_]+)/g,
    /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?function\s*\(/g,
    /function\s+([A-Za-z0-9_]+)\s*\(/g,
    /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g
  ];

  for (const regex of regexes) {
    const match = regex.exec(stripped);
    if (match && match[1]) return match[1];
  }

  return fallbackName;
};

const detectPythonFunctionName = (code, fallbackName) => {
  if (!code || typeof code !== 'string') return fallbackName;

  const classMethodMatch = code.match(/class\s+Solution\s*:\s*[\s\S]*?def\s+([A-Za-z0-9_]+)\s*\(/);
  if (classMethodMatch && classMethodMatch[1]) return classMethodMatch[1];

  const fnMatch = code.match(/def\s+([A-Za-z0-9_]+)\s*\(/);
  if (fnMatch && fnMatch[1]) return fnMatch[1];

  return fallbackName;
};

const detectJavaClassName = (code) => {
  if (!code || typeof code !== 'string') return null;
  const solutionMatch = code.match(/class\s+Solution\b/);
  if (solutionMatch) return 'Solution';
  const classMatch = code.match(/class\s+([A-Za-z0-9_]+)/);
  return classMatch ? classMatch[1] : null;
};

const detectJavaMethodName = (code, fallbackName) => {
  if (!code || typeof code !== 'string') return fallbackName;
  const normalized = code.replace(/\u00A0/g, ' ').replace(/\r/g, '');
  const classBodyMatch = normalized.match(/class\s+Solution[^\{]*\{([\s\S]*?)}/);
  const searchTarget = classBodyMatch ? classBodyMatch[1] : normalized;
  const methodRegex = /(public|protected|private)\s+(?:static\s+)?[A-Za-z0-9_<>,\[\]]+\s+([A-Za-z0-9_]+)\s*\(/g;
  const candidates = [];
  let match;
  while ((match = methodRegex.exec(searchTarget)) !== null) {
    const candidate = match[2];
    if (!candidate || candidate === 'main' || candidate === 'Solution') continue;
    candidates.push(candidate);
  }
  if (candidates.length === 0) return fallbackName;
  if (candidates.length === 1) return candidates[0];

  const fallbackLower = fallbackName ? fallbackName.toLowerCase() : null;
  if (fallbackLower) {
    const matched = candidates.find((name) => name.toLowerCase() === fallbackLower);
    if (matched) return matched;
  }
  return candidates[0];
};

const detectCppFunctionName = (code, fallbackName) => {
  if (!code || typeof code !== 'string') return fallbackName;
  const stripped = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

  const classMethod = stripped.match(/class\s+Solution[\s\S]*?\b([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{/);
  if (classMethod && classMethod[1] && classMethod[1] !== 'Solution') return classMethod[1];

  const freeFn = stripped.match(/(?:^|\n)\s*[A-Za-z_][A-Za-z0-9_<>:\s\*&]*\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^;]*\)\s*\{/);
  if (freeFn && freeFn[1] && freeFn[1] !== 'main') return freeFn[1];

  return fallbackName;
};

const toJavaLiteralByType = (value, canonicalType = '') => {
  const t = normalizeCanonicalType(canonicalType);

  if (value === null || value === undefined) return 'null';
  if (t === 'int' || t === 'integer') return `${Number(value) || 0}`;
  if (t === 'long') return `${Number(value) || 0}L`;
  if (t === 'float') return `${Number(value) || 0}f`;
  if (t === 'double' || t === 'number') return `${Number(value) || 0}`;
  if (t === 'bool' || t === 'boolean') return value ? 'true' : 'false';
  if (t === 'char' || t === 'character') {
    const ch = String(value).charAt(0) || '\\0';
    return `'${ch === "'" ? "\\'" : ch}'`;
  }
  if (t === 'str' || t === 'string') return JSON.stringify(String(value));
  if (isListNodeType(t)) {
    const arr = Array.isArray(value) ? value : [];
    return `buildLinkedList(new int[]{${arr.map((v) => Number(v) || 0).join(', ')}})`;
  }
  if (isTreeNodeType(t)) {
    const arr = Array.isArray(value) ? value : [];
    return `buildBinaryTree(new Integer[]{${arr.map((v) => (v === null || v === undefined ? 'null' : Number(v) || 0)).join(', ')}})`;
  }
  if (isGraphNodeType(t)) {
    const rows = (Array.isArray(value) ? value : []).map((row) => `new int[]{${(Array.isArray(row) ? row : []).map((v) => Number(v) || 0).join(', ')}}`);
    return `buildGraph(new int[][]{${rows.join(', ')}})`;
  }

  if (t === 'list[int]' || t === 'array[int]') return `new int[]{${(Array.isArray(value) ? value : []).map((v) => Number(v) || 0).join(', ')}}`;
  if (t === 'list[long]') return `new long[]{${(Array.isArray(value) ? value : []).map((v) => `${Number(v) || 0}L`).join(', ')}}`;
  if (t === 'list[float]') return `new float[]{${(Array.isArray(value) ? value : []).map((v) => `${Number(v) || 0}f`).join(', ')}}`;
  if (t === 'list[double]' || t === 'list[number]') return `new double[]{${(Array.isArray(value) ? value : []).map((v) => Number(v) || 0).join(', ')}}`;
  if (t === 'list[bool]' || t === 'list[boolean]') return `new boolean[]{${(Array.isArray(value) ? value : []).map((v) => (v ? 'true' : 'false')).join(', ')}}`;
  if (t === 'list[char]') return `new char[]{${(Array.isArray(value) ? value : []).map((v) => `'${String(v).charAt(0) || '\\0'}'`).join(', ')}}`;
  if (t === 'list[str]' || t === 'list[string]') return `new String[]{${(Array.isArray(value) ? value : []).map((v) => JSON.stringify(String(v))).join(', ')}}`;

  if (t === 'list[list[int]]' || t === 'array[array[int]]') {
    const rows = (Array.isArray(value) ? value : []).map((row) => `new int[]{${(Array.isArray(row) ? row : []).map((v) => Number(v) || 0).join(', ')}}`);
    return `new int[][]{${rows.join(', ')}}`;
  }
  if (t === 'list[list[str]]' || t === 'list[list[string]]') {
    const rows = (Array.isArray(value) ? value : []).map((row) => `new String[]{${(Array.isArray(row) ? row : []).map((v) => JSON.stringify(String(v))).join(', ')}}`);
    return `new String[][]{${rows.join(', ')}}`;
  }

  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return 'null';
};

const cppTypeFromCanonical = (canonicalType = '') => {
  const t = normalizeCanonicalType(canonicalType);
  if (isGraphNodeType(t)) return 'GraphNode*';
  const mapped = mapCanonicalToLang(canonicalType).cpp;
  return mapped === 'auto' ? 'int' : mapped;
};

const toCppLiteralByType = (value, canonicalType = '') => {
  const t = normalizeCanonicalType(canonicalType);

  if (value === null || value === undefined) return '0';
  if (t === 'int' || t === 'integer') return `${Number(value) || 0}`;
  if (t === 'long') return `${Number(value) || 0}LL`;
  if (t === 'float' || t === 'double' || t === 'number') return `${Number(value) || 0}`;
  if (t === 'bool' || t === 'boolean') return value ? 'true' : 'false';
  if (t === 'char' || t === 'character') return `'${String(value).charAt(0) || '\\0'}'`;
  if (t === 'str' || t === 'string') return `"${escapeCppString(String(value))}"`;
  if (isListNodeType(t)) {
    const arr = Array.isArray(value) ? value : [];
    return `buildLinkedList({${arr.map((v) => Number(v) || 0).join(', ')}})`;
  }
  if (isTreeNodeType(t)) {
    const arr = Array.isArray(value) ? value : [];
    return `buildBinaryTree({${arr.map((v) => (v === null || v === undefined ? 'null' : Number(v) || 0)).join(', ')}})`;
  }
  if (isGraphNodeType(t)) {
    const rows = (Array.isArray(value) ? value : []).map((row) => `{${(Array.isArray(row) ? row : []).map((v) => Number(v) || 0).join(', ')}}`);
    return `buildGraph({${rows.join(', ')}})`;
  }

  if (t === 'list[int]' || t === 'array[int]') return `{${(Array.isArray(value) ? value : []).map((v) => Number(v) || 0).join(', ')}}`;
  if (t === 'list[long]') return `{${(Array.isArray(value) ? value : []).map((v) => `${Number(v) || 0}LL`).join(', ')}}`;
  if (t === 'list[float]' || t === 'list[double]') return `{${(Array.isArray(value) ? value : []).map((v) => Number(v) || 0).join(', ')}}`;
  if (t === 'list[bool]' || t === 'list[boolean]') return `{${(Array.isArray(value) ? value : []).map((v) => (v ? 'true' : 'false')).join(', ')}}`;
  if (t === 'list[str]' || t === 'list[string]') return `{${(Array.isArray(value) ? value : []).map((v) => `"${escapeCppString(String(v))}"`).join(', ')}}`;
  if (t === 'list[list[int]]' || t === 'array[array[int]]') {
    const rows = (Array.isArray(value) ? value : []).map((row) => `{${(Array.isArray(row) ? row : []).map((v) => Number(v) || 0).join(', ')}}`);
    return `{${rows.join(', ')}}`;
  }

  if (typeof value === 'string') return `"${escapeCppString(value)}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '0';
};

const wrapJavaScriptCode = (code, functionName, args) => {
  const argsLiteral = (args || []).map(toJavaScriptLiteral).join(', ');

  return `${code}

(async () => {
  try {
    const __fnName = ${JSON.stringify(functionName)};
    const __args = [${argsLiteral}];

    let __callable = null;
    if (typeof globalThis[__fnName] === 'function') {
      __callable = globalThis[__fnName];
    }

    if (!__callable && typeof Solution === 'function') {
      const __instance = new Solution();
      if (typeof __instance[__fnName] === 'function') {
        __callable = __instance[__fnName].bind(__instance);
      }
    }

    if (!__callable) {
      throw new Error('Unable to find callable function: ' + __fnName);
    }

    const __result = await __callable(...__args);
    if (typeof __result === 'undefined') {
      console.log('null');
    } else if (typeof __result === 'string') {
      console.log(__result);
    } else {
      console.log(JSON.stringify(__result));
    }
  } catch (error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  }
})();`;
};

const wrapPythonCode = (code, functionName, args) => {
  const argsLiteral = (args || []).map(toPythonLiteral).join(', ');

  return `${code}

import json

def __emit(value):
    if value is None:
        print('null')
    elif isinstance(value, str):
        print(value)
    else:
        print(json.dumps(value))

try:
    __fn_name = ${JSON.stringify(functionName)}
    __args = [${argsLiteral}]

    if 'Solution' in globals() and hasattr(Solution(), __fn_name):
        __instance = Solution()
        __result = getattr(__instance, __fn_name)(*__args)
    elif __fn_name in globals() and callable(globals()[__fn_name]):
        __result = globals()[__fn_name](*__args)
    else:
        raise Exception('Unable to find callable function: ' + __fn_name)

    __emit(__result)
except Exception:
    raise`;
};

const wrapJavaCode = (code, functionName, args, schemaParams = []) => {
  const className = detectJavaClassName(code) || 'Solution';
  const methodName = detectJavaMethodName(code, functionName);
  const returnTypeCanonical = normalizeCanonicalType(schemaParams?.__returnType || '');
  const isVoidReturn = returnTypeCanonical === 'void' || returnTypeCanonical === 'none';
  const schemaTypes = [
  ...schemaParams.map((p) => p?.type || ''),
  schemaParams?.__returnType || ''
  ].map((t) => normalizeCanonicalType(t));
  const needsListNode = schemaTypes.some((t) => isListNodeType(t));
  const needsTreeNode = schemaTypes.some((t) => isTreeNodeType(t));
  const needsGraphNode = schemaTypes.some((t) => isGraphNodeType(t));
  const hasListNode = /\bclass\s+ListNode\b/.test(code);
  const hasTreeNode = /\bclass\s+TreeNode\b/.test(code);
  const hasGraphNode = /\bclass\s+GraphNode\b/.test(code);

  const helperBlocks = [];
  if (!hasListNode) {
  helperBlocks.push(`class ListNode { int val; ListNode next; ListNode(int val) { this.val = val; } }`);
  }
  if (!hasTreeNode) {
  helperBlocks.push(`class TreeNode { int val; TreeNode left; TreeNode right; TreeNode(int val) { this.val = val; } }`);
  }
  if (!hasGraphNode) {
  helperBlocks.push(`class GraphNode { int val; java.util.List<GraphNode> neighbors = new java.util.ArrayList<>(); GraphNode(int val) { this.val = val; } }`);
  }

  helperBlocks.push(`
class RunnerHelpers {
  static ListNode buildLinkedList(int[] values) {
    ListNode dummy = new ListNode(0);
    ListNode tail = dummy;
    for (int value : values) {
      tail.next = new ListNode(value);
      tail = tail.next;
    }
    return dummy.next;
  }

  static int[] listNodeToArray(ListNode head) {
    java.util.List<Integer> out = new java.util.ArrayList<>();
    while (head != null) {
      out.add(head.val);
      head = head.next;
    }
    int[] arr = new int[out.size()];
    for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
    return arr;
  }

  static TreeNode buildBinaryTree(Integer[] values) {
    if (values == null || values.length == 0) return null;
    TreeNode[] nodes = new TreeNode[values.length];
    for (int i = 0; i < values.length; i++) {
      if (values[i] != null) nodes[i] = new TreeNode(values[i]);
    }
    int idx = 1;
    for (int i = 0; i < nodes.length && idx < nodes.length; i++) {
      if (nodes[i] == null) continue;
      if (idx < nodes.length) nodes[i].left = nodes[idx++];
      if (idx < nodes.length) nodes[i].right = nodes[idx++];
    }
    return nodes[0];
  }

  static Integer[] treeNodeToArray(TreeNode root) {
    if (root == null) return new Integer[0];
    java.util.List<Integer> out = new java.util.ArrayList<>();
    java.util.Queue<TreeNode> q = new java.util.ArrayDeque<>();
    q.offer(root);
    while (!q.isEmpty()) {
      TreeNode node = q.poll();
      if (node != null) {
        out.add(node.val);
        q.offer(node.left);
        q.offer(node.right);
      } else {
        out.add(null);
      }
    }
    int end = out.size() - 1;
    while (end >= 0 && out.get(end) == null) end--;
    return out.subList(0, end + 1).toArray(new Integer[0]);
  }

  static GraphNode buildGraph(int[][] adj) {
    if (adj == null || adj.length == 0) return null;
    java.util.Map<Integer, GraphNode> map = new java.util.HashMap<>();
    for (int i = 0; i < adj.length; i++) map.put(i + 1, new GraphNode(i + 1));
    for (int i = 0; i < adj.length; i++) {
      GraphNode node = map.get(i + 1);
      for (int nei : adj[i]) {
        GraphNode target = map.get(nei);
        if (target != null) node.neighbors.add(target);
      }
    }
    return map.get(1);
  }

  static java.util.List<java.util.List<Integer>> graphToAdjList(GraphNode node) {
    java.util.List<java.util.List<Integer>> out = new java.util.ArrayList<>();
    if (node == null) return out;
    java.util.Map<Integer, java.util.List<Integer>> seen = new java.util.HashMap<>();
    java.util.Queue<GraphNode> q = new java.util.ArrayDeque<>();
    q.offer(node);
    while (!q.isEmpty()) {
      GraphNode cur = q.poll();
      if (seen.containsKey(cur.val)) continue;
      java.util.List<Integer> row = new java.util.ArrayList<>();
      for (GraphNode nei : cur.neighbors) {
        row.add(nei.val);
        if (!seen.containsKey(nei.val)) q.offer(nei);
      }
      seen.put(cur.val, row);
    }
    int max = seen.keySet().stream().mapToInt(v -> v).max().orElse(0);
    for (int i = 1; i <= max; i++) out.add(seen.getOrDefault(i, new java.util.ArrayList<>()));
    return out;
  }

  static String serialize(Object obj) {
    if (obj == null) return "null";
    if (obj instanceof ListNode) return java.util.Arrays.toString(listNodeToArray((ListNode) obj));
    if (obj instanceof TreeNode) return java.util.Arrays.toString(treeNodeToArray((TreeNode) obj));
    if (obj instanceof GraphNode) return graphToAdjList((GraphNode) obj).toString();
    if (obj instanceof Number || obj instanceof Boolean || obj instanceof String) return obj.toString();
    if (obj instanceof int[]) return java.util.Arrays.toString((int[]) obj);
    if (obj instanceof long[]) return java.util.Arrays.toString((long[]) obj);
    if (obj instanceof double[]) return java.util.Arrays.toString((double[]) obj);
    if (obj instanceof float[]) return java.util.Arrays.toString((float[]) obj);
    if (obj instanceof boolean[]) return java.util.Arrays.toString((boolean[]) obj);
    if (obj instanceof Object[]) return java.util.Arrays.deepToString((Object[]) obj);
    return String.valueOf(obj);
  }
}
`);

  const declarations = (args || []).map((arg, idx) => {
    const canonical = schemaParams[idx]?.type || '';
    const javaType = mapCanonicalToLang(canonical).java || 'Object';
  let expr = toJavaLiteralByType(arg, canonical);
  expr = expr
    .replace(/\bbuildLinkedList\(/g, 'RunnerHelpers.buildLinkedList(')
    .replace(/\bbuildBinaryTree\(/g, 'RunnerHelpers.buildBinaryTree(')
    .replace(/\bbuildGraph\(/g, 'RunnerHelpers.buildGraph(');
  return `${javaType} arg${idx} = ${expr};`;
  }).join('\n        ');
  const callArgs = (args || []).map((_, idx) => `arg${idx}`).join(', ');
  const invokeLine = isVoidReturn
  ? `solution.${methodName}(${callArgs});\n        System.out.println("null");`
  : `Object result = solution.${methodName}(${callArgs});\n        System.out.println(RunnerHelpers.serialize(result));`;

  return `${helperBlocks.join('\n\n')}

${code}

public class Main {
    public static void main(String[] args) {
        ${declarations}
        ${className} solution = new ${className}();
    ${invokeLine}
    }
}`;
};

const wrapCppCode = (code, functionName, args, schemaParams = [], returnTypeCanonical = '') => {
  const methodName = detectCppFunctionName(code, functionName);
  const isVoidReturn = ['void', 'none'].includes(normalizeCanonicalType(returnTypeCanonical));
  const hasSolutionClass = /class\s+Solution\b/.test(code);
  const schemaTypes = [...schemaParams.map((p) => p?.type || ''), returnTypeCanonical].map((t) => normalizeCanonicalType(t));
  const needsListNode = schemaTypes.some((t) => isListNodeType(t));
  const needsTreeNode = schemaTypes.some((t) => isTreeNodeType(t));
  const needsGraphNode = schemaTypes.some((t) => isGraphNodeType(t));
  const hasListNode = /\bstruct\s+ListNode\b/.test(code);
  const hasTreeNode = /\bstruct\s+TreeNode\b/.test(code);
  const hasGraphNode = /\bstruct\s+GraphNode\b/.test(code);

  const cppHelpers = `
template <typename T>
string toJson(const vector<T>& values);

ListNode* buildLinkedList(const vector<int>& values) {
  ListNode dummy(0);
  ListNode* tail = &dummy;
  for (int v : values) { tail->next = new ListNode(v); tail = tail->next; }
  return dummy.next;
}

vector<int> listNodeToVector(ListNode* head) {
  vector<int> out;
  while (head) { out.push_back(head->val); head = head->next; }
  return out;
}

TreeNode* buildBinaryTree(const vector<string>& values) {
  if (values.empty()) return nullptr;
  vector<TreeNode*> nodes(values.size(), nullptr);
  for (size_t i = 0; i < values.size(); i++) {
    if (values[i] != "null") nodes[i] = new TreeNode(stoi(values[i]));
  }
  size_t idx = 1;
  for (size_t i = 0; i < nodes.size() && idx < nodes.size(); i++) {
    if (!nodes[i]) continue;
    nodes[i]->left = nodes[idx++];
    if (idx < nodes.size()) nodes[i]->right = nodes[idx++];
  }
  return nodes[0];
}

vector<string> treeNodeToVector(TreeNode* root) {
  vector<string> out;
  if (!root) return out;
  queue<TreeNode*> q;
  q.push(root);
  while (!q.empty()) {
    TreeNode* node = q.front(); q.pop();
    if (node) {
      out.push_back(to_string(node->val));
      q.push(node->left);
      q.push(node->right);
    } else {
      out.push_back("null");
    }
  }
  while (!out.empty() && out.back() == "null") out.pop_back();
  return out;
}

GraphNode* buildGraph(const vector<vector<int>>& adj) {
  if (adj.empty()) return nullptr;
  vector<GraphNode*> nodes(adj.size(), nullptr);
  for (size_t i = 0; i < adj.size(); i++) nodes[i] = new GraphNode((int)i + 1);
  for (size_t i = 0; i < adj.size(); i++) {
    for (int nei : adj[i]) {
      if (nei > 0 && (size_t)nei <= adj.size()) nodes[i]->neighbors.push_back(nodes[nei - 1]);
    }
  }
  return nodes[0];
}

vector<vector<int>> graphToAdjList(GraphNode* node) {
  vector<vector<int>> out;
  if (!node) return out;
  unordered_map<int, vector<int>> seen;
  queue<GraphNode*> q;
  q.push(node);
  while (!q.empty()) {
    GraphNode* cur = q.front(); q.pop();
    if (seen.count(cur->val)) continue;
    vector<int> row;
    for (GraphNode* nei : cur->neighbors) {
      row.push_back(nei->val);
      if (!seen.count(nei->val)) q.push(nei);
    }
    seen[cur->val] = row;
  }
  int maxKey = 0;
  for (const auto& kv : seen) maxKey = max(maxKey, kv.first);
  out.resize(maxKey);
  for (int i = 1; i <= maxKey; i++) out[i - 1] = seen.count(i) ? seen[i] : vector<int>{};
  return out;
}

string toJson(const string& value) { return value; }
string toJson(const char* value) { return string(value); }
string toJson(char value) { return string(1, value); }
string toJson(bool value) { return value ? "true" : "false"; }
string toJson(int value) { return to_string(value); }
string toJson(long long value) { return to_string(value); }
string toJson(double value) { ostringstream oss; oss << value; return oss.str(); }
string toJson(ListNode* value) { return toJson(listNodeToVector(value)); }
string toJson(TreeNode* value) { return toJson(treeNodeToVector(value)); }
string toJson(GraphNode* value) { return toJson(graphToAdjList(value)); }

template <typename T>
string toJson(const vector<T>& values) {
  ostringstream oss;
  oss << "[";
  for (size_t i = 0; i < values.size(); i++) {
    if (i) oss << ", ";
    oss << toJson(values[i]);
  }
  oss << "]";
  return oss.str();
}
`;

  const helperPrefix = [
    !hasListNode ? 'struct ListNode { int val; ListNode* next; ListNode(int x) : val(x), next(nullptr) {} };' : '',
    !hasTreeNode ? 'struct TreeNode { int val; TreeNode* left; TreeNode* right; TreeNode(int x) : val(x), left(nullptr), right(nullptr) {} };' : '',
    !hasGraphNode ? 'struct GraphNode { int val; vector<GraphNode*> neighbors; GraphNode(int x) : val(x), neighbors() {} };' : ''
  ].filter(Boolean).join('\n');

  const declarations = (args || []).map((arg, idx) => {
    const canonical = schemaParams[idx]?.type || '';
    const cppType = cppTypeFromCanonical(canonical);
  let expr = toCppLiteralByType(arg, canonical);
  expr = expr
    .replace(/\bbuildLinkedList\(/g, 'buildLinkedList(')
    .replace(/\bbuildBinaryTree\(/g, 'buildBinaryTree(')
    .replace(/\bbuildGraph\(/g, 'buildGraph(');
  if (isTreeNodeType(canonical)) {
    const arr = Array.isArray(arg) ? arg : [];
    const asStrings = `{${arr.map((v) => (v === null || v === undefined ? '"null"' : `"${Number(v) || 0}"`)).join(', ')}}`;
    expr = `buildBinaryTree(${asStrings})`;
  }
  return `${cppType} arg${idx} = ${expr};`;
  }).join('\n    ');
  const callArgs = (args || []).map((_, idx) => `arg${idx}`).join(', ');
  const invocation = hasSolutionClass
  ? (isVoidReturn
    ? `Solution solution;\n    solution.${methodName}(${callArgs});\n    cout << "null";`
    : `Solution solution;\n    auto result = solution.${methodName}(${callArgs});\n    cout << toJson(result);`)
  : (isVoidReturn
    ? `${methodName}(${callArgs});\n    cout << "null";`
    : `auto result = ${methodName}(${callArgs});\n    cout << toJson(result);`);

  return `#include <bits/stdc++.h>
using namespace std;

${helperPrefix}
${code}

${cppHelpers}

int main() {
    ${declarations}
    ${invocation}
    return 0;
}`;
};

export const buildWrappedCode = ({ problem, code, language, testCaseInput }) => {
  if (!problem || !problem.has_boilerplate) return code;

  const args = parseInputToParams(testCaseInput || '');
  const fallbackFunctionName = problem.function_name || sanitizeTitleToFunction(problem.title);
  const lang = String(language || '').toLowerCase().trim();

  if (lang === 'javascript' || lang === 'js') {
    const functionName = detectJavaScriptFunctionName(code, fallbackFunctionName);
    return wrapJavaScriptCode(code, functionName, args);
  }

  if (lang === 'python' || lang === 'py') {
    const functionName = detectPythonFunctionName(code, fallbackFunctionName);
    return wrapPythonCode(code, functionName, args);
  }

  if (lang === 'java') {
    const schemaParams = [...(problem.parameter_schema?.params || [])];
    schemaParams.__returnType = problem.parameter_schema?.returnType || '';
    return wrapJavaCode(code, fallbackFunctionName, args, schemaParams);
  }

  if (lang === 'cpp' || lang === 'c++') {
    return wrapCppCode(code, fallbackFunctionName, args, problem.parameter_schema?.params || [], problem.parameter_schema?.returnType || '');
  }

  return code;
};
