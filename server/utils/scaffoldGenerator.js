/**
 * Generates language-specific scaffolding from a canonical parameter schema.
 * Produces LeetCode-style function/class signatures without solution logic.
 */

const headerByType = {
  array: 'Array / Two Pointer / Sliding Window',
  string: 'String',
  linked_list: 'Linked List',
  binary_tree: 'Binary Tree / BST',
  graph: 'Graph (Adjacency List)',
  dynamic_programming: 'Dynamic Programming / Recursion',
  heap: 'Heap / Priority Queue'
};

function defaultReturnByType(language, type) {
  const t = String(type || '').trim();

  if (language === 'java') {
    if (t === 'void') return '';
    if (['int', 'long', 'float', 'double'].includes(t)) return 'return 0;';
    if (t === 'boolean') return 'return false;';
    if (t === 'char') return "return '\\0';";
    return 'return null;';
  }

  if (language === 'cpp') {
    if (t === 'void') return '';
    if (['int', 'long long', 'float', 'double'].includes(t)) return 'return 0;';
    if (t === 'bool') return 'return false;';
    if (t === 'char') return "return '\\0';";
    return 'return {};';
  }

  return '';
}

export function mapCanonicalToLang(type) {
  const t = String(type || '').toLowerCase().trim();

  if (t === 'void' || t === 'none' || t === '') return { java: 'void', py: 'None', js: 'void', cpp: 'void', ts: 'void' };

  if (t === 'int' || t === 'integer') return { java: 'int', py: 'int', js: 'number', cpp: 'int', ts: 'number' };
  if (t === 'long') return { java: 'long', py: 'int', js: 'number', cpp: 'long long', ts: 'number' };
  if (t === 'float') return { java: 'float', py: 'float', js: 'number', cpp: 'float', ts: 'number' };
  if (t === 'double' || t === 'number') return { java: 'double', py: 'float', js: 'number', cpp: 'double', ts: 'number' };
  if (t === 'bool' || t === 'boolean') return { java: 'boolean', py: 'bool', js: 'boolean', cpp: 'bool', ts: 'boolean' };
  if (t === 'char' || t === 'character') return { java: 'char', py: 'str', js: 'string', cpp: 'char', ts: 'string' };
  if (t === 'str' || t === 'string') return { java: 'String', py: 'str', js: 'string', cpp: 'string', ts: 'string' };

  if (t === 'list[int]' || t === 'array[int]') return { java: 'int[]', py: 'List[int]', js: 'number[]', cpp: 'vector<int>', ts: 'number[]' };
  if (t === 'list[long]') return { java: 'long[]', py: 'List[int]', js: 'number[]', cpp: 'vector<long long>', ts: 'number[]' };
  if (t === 'list[float]') return { java: 'float[]', py: 'List[float]', js: 'number[]', cpp: 'vector<float>', ts: 'number[]' };
  if (t === 'list[double]') return { java: 'double[]', py: 'List[float]', js: 'number[]', cpp: 'vector<double>', ts: 'number[]' };
  if (t === 'list[bool]' || t === 'list[boolean]') return { java: 'boolean[]', py: 'List[bool]', js: 'boolean[]', cpp: 'vector<bool>', ts: 'boolean[]' };
  if (t === 'list[char]') return { java: 'char[]', py: 'List[str]', js: 'string[]', cpp: 'vector<char>', ts: 'string[]' };
  if (t === 'list[str]' || t === 'list[string]') return { java: 'String[]', py: 'List[str]', js: 'string[]', cpp: 'vector<string>', ts: 'string[]' };

  if (t === 'list[list[int]]' || t === 'array[array[int]]') return { java: 'int[][]', py: 'List[List[int]]', js: 'number[][]', cpp: 'vector<vector<int>>', ts: 'number[][]' };
  if (t === 'list[list[str]]' || t === 'list[list[string]]') return { java: 'String[][]', py: 'List[List[str]]', js: 'string[][]', cpp: 'vector<vector<string>>', ts: 'string[][]' };
  if (t === 'list[list[char]]') return { java: 'char[][]', py: 'List[List[str]]', js: 'string[][]', cpp: 'vector<vector<char>>', ts: 'string[][]' };

  if (t.includes('listnode')) return { java: 'ListNode', py: 'ListNode', js: 'ListNode', cpp: 'ListNode*', ts: 'ListNode | null' };
  if (t.includes('treenode')) return { java: 'TreeNode', py: 'TreeNode', js: 'TreeNode', cpp: 'TreeNode*', ts: 'TreeNode | null' };
  if (t.includes('graphnode')) return { java: 'GraphNode', py: 'GraphNode', js: 'GraphNode', cpp: 'GraphNode*', ts: 'GraphNode | null' };

  return { java: 'Object', py: 'object', js: 'any', cpp: 'auto', ts: 'any' };
}

function injectStructsIfNeeded(params, returnType, language) {
  const needsListNode = [...params, returnType].some((t) => String(t).toLowerCase().includes('listnode'));
  const needsTreeNode = [...params, returnType].some((t) => String(t).toLowerCase().includes('treenode'));

  if (language === 'java') {
    const pieces = [];
    if (needsListNode) {
      pieces.push('class ListNode { int val; ListNode next; ListNode() {} ListNode(int val) { this.val = val; } ListNode(int val, ListNode next) { this.val = val; this.next = next; } }');
    }
    if (needsTreeNode) {
      pieces.push('class TreeNode { int val; TreeNode left; TreeNode right; TreeNode() {} TreeNode(int val) { this.val = val; } TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; } }');
    }
    return pieces.join('\n\n');
  }

  if (language === 'python') {
    const pieces = [];
    const allTypes = [...params, returnType].map((t) => String(t).toLowerCase());
    const hasListTypes = allTypes.some((t) => t.includes('list['));
    const imports = [];
    if (hasListTypes) imports.push('List');
    if (needsListNode || needsTreeNode) imports.push('Optional');
    if (imports.length > 0) pieces.push(`from typing import ${imports.join(', ')}`);
    if (needsListNode) pieces.push('class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next');
    if (needsTreeNode) pieces.push('class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right');
    return pieces.join('\n\n');
  }

  if (language === 'javascript') {
    const pieces = [];
    if (needsListNode) pieces.push('function ListNode(val, next) { this.val = (val === undefined ? 0 : val); this.next = (next === undefined ? null : next); }');
    if (needsTreeNode) pieces.push('function TreeNode(val, left, right) { this.val = (val === undefined ? 0 : val); this.left = (left === undefined ? null : left); this.right = (right === undefined ? null : right); }');
    return pieces.join('\n\n');
  }

  if (language === 'cpp') {
    const pieces = [];
    if (needsListNode) pieces.push('struct ListNode { int val; ListNode *next; ListNode(int x) : val(x), next(nullptr) {} };');
    if (needsTreeNode) pieces.push('struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode(int x) : val(x), left(nullptr), right(nullptr) {} };');
    return pieces.join('\n\n');
  }

  return '';
}

function buildSignature(problem, language) {
  const langKey = language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'c++' ? 'cpp' : language;
  const params = (problem?.parameter_schema?.params || []).map((p) => ({
    name: p.name,
    type: mapCanonicalToLang(p.type)[langKey]
  }));
  const returnType = mapCanonicalToLang(problem?.parameter_schema?.returnType || 'void')[langKey];
  const fn = (problem?.function_name || problem?.title || 'solve').trim().replace(/\s+/g, '_');
  const header = headerByType[problem?.question_type] || 'Problem';

  if (language === 'java') {
    const structs = injectStructsIfNeeded(problem?.parameter_schema?.params?.map((p) => p.type) || [], problem?.parameter_schema?.returnType || '', 'java');
    const paramStr = params.map((p) => `${p.type} ${p.name}`).join(', ');
    const returnStub = defaultReturnByType('java', returnType);
    return `// ${header}\n${structs ? `${structs}\n\n` : ''}class Solution {\n    public ${returnType} ${fn}(${paramStr}) {\n        // TODO: Implement\n        ${returnStub}\n    }\n}`;
  }

  if (language === 'python' || language === 'py') {
    const structs = injectStructsIfNeeded(problem?.parameter_schema?.params?.map((p) => p.type) || [], problem?.parameter_schema?.returnType || '', 'python');
    const paramStr = params.map((p) => `${p.name}: ${p.type}`).join(', ');
    const pythonArgs = paramStr ? `self, ${paramStr}` : 'self';
    return `# ${header}\n${structs ? `${structs}\n\n` : ''}class Solution:\n    def ${fn}(${pythonArgs}) -> ${returnType}:\n        # TODO: Implement\n        pass`;
  }

  if (language === 'javascript' || language === 'js') {
    const structs = injectStructsIfNeeded(problem?.parameter_schema?.params?.map((p) => p.type) || [], problem?.parameter_schema?.returnType || '', 'javascript');
    const paramStr = params.map((p) => p.name).join(', ');
    return `// ${header}\n${structs ? `${structs}\n\n` : ''}var ${fn} = function(${paramStr}) {\n    // TODO: Implement\n};`;
  }

  if (language === 'cpp' || language === 'c++') {
    const structs = injectStructsIfNeeded(problem?.parameter_schema?.params?.map((p) => p.type) || [], problem?.parameter_schema?.returnType || '', 'cpp');
    const paramStr = params.map((p) => `${p.type} ${p.name}`).join(', ');
    const returnStub = defaultReturnByType('cpp', returnType);
    return `// ${header}\n${structs ? `${structs}\n\n` : ''}class Solution {\npublic:\n    ${returnType} ${fn}(${paramStr}) {\n        // TODO: Implement\n        ${returnStub}\n    }\n};`;
  }

  return '';
}

export function generateScaffolds(problem, languages = ['java', 'python', 'javascript', 'cpp']) {
  const output = {};
  for (const language of languages) {
    const scaffold = buildSignature(problem, language);
    if (scaffold) output[language] = scaffold;
  }
  return output;
}
