import { useEffect, useMemo, useState } from 'react';
import '../../pages/admin/AdminPages.css';

const TYPE_OPTIONS = [
  'void', 'int', 'long', 'float', 'double', 'bool', 'char', 'str', 'string',
  'List[int]', 'List[long]', 'List[float]', 'List[double]', 'List[bool]',
  'List[char]', 'List[str]', 'List[List[int]]', 'List[List[str]]', 'List[List[char]]',
  'Set[int]', 'Set[str]', 'Map[str,int]', 'Map[int,int]', 'ListNode', 'TreeNode', 'GraphNode'
];

const QUESTION_TYPES = [
  'array', 'string', 'linked_list', 'binary_tree', 'graph', 'dynamic_programming',
  'heap', 'primitives', 'math', 'matrix', 'custom_class', 'bit_manipulation',
  'binary_search', 'intervals', 'geometry', 'backtracking', 'greedy', 'stack', 'trie'
];

const createDefaultForm = () => ({
  title: '',
  function_name: '',
  description: '',
  difficulty: 'Easy',
  question_type: '',
  tags: { tags: [] },
  parameter_schema: { params: [{ name: '', type: '' }], returnType: '' },
  examples: [{ input: '', output: '', explanation: '' }],
  testCases: [{ input: '', expected_output: '', hidden: false }],
  has_boilerplate: false
});

function QuestionForm({
  open,
  mode,
  question,
  saving,
  onClose,
  onSubmit
}) {
  const [formData, setFormData] = useState(createDefaultForm());
  const [error, setError] = useState('');
  const [boilerplateDecisionMade, setBoilerplateDecisionMade] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (question) {
      setFormData({
        ...createDefaultForm(),
        ...question,
        tags: question.tags || { tags: [] },
        parameter_schema: question.parameter_schema || { params: [{ name: '', type: '' }], returnType: '' },
        examples: Array.isArray(question.examples) && question.examples.length > 0 ? question.examples : [{ input: '', output: '', explanation: '' }],
        testCases: Array.isArray(question.testCases) && question.testCases.length > 0 ? question.testCases : [{ input: '', expected_output: '', hidden: false }],
        has_boilerplate: Boolean(question.has_boilerplate)
      });
      setBoilerplateDecisionMade(true);
    } else {
      setFormData(createDefaultForm());
      setBoilerplateDecisionMade(false);
    }

    setError('');
  }, [open, question]);

  const tagInput = useMemo(() => (formData.tags?.tags || []).join(', '), [formData.tags]);

  if (!open) return null;

  const handleBasicInput = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagsChange = (event) => {
    const tags = event.target.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    setFormData((prev) => ({
      ...prev,
      tags: { tags }
    }));
  };

  const updateParam = (index, field, value) => {
    setFormData((prev) => {
      const params = [...(prev.parameter_schema?.params || [])];
      params[index] = { ...params[index], [field]: value };
      return {
        ...prev,
        parameter_schema: {
          returnType: prev.parameter_schema?.returnType || '',
          params
        }
      };
    });
  };

  const addParam = () => {
    setFormData((prev) => ({
      ...prev,
      parameter_schema: {
        returnType: prev.parameter_schema?.returnType || '',
        params: [...(prev.parameter_schema?.params || []), { name: '', type: '' }]
      }
    }));
  };

  const removeParam = (index) => {
    setFormData((prev) => {
      const params = (prev.parameter_schema?.params || []).filter((_, i) => i !== index);
      return {
        ...prev,
        parameter_schema: {
          returnType: prev.parameter_schema?.returnType || '',
          params: params.length > 0 ? params : [{ name: '', type: '' }]
        }
      };
    });
  };

  const updateExample = (index, field, value) => {
    setFormData((prev) => {
      const examples = [...(prev.examples || [])];
      examples[index] = { ...examples[index], [field]: value };
      return { ...prev, examples };
    });
  };

  const addExample = () => {
    setFormData((prev) => ({
      ...prev,
      examples: [...(prev.examples || []), { input: '', output: '', explanation: '' }]
    }));
  };

  const removeExample = (index) => {
    setFormData((prev) => ({
      ...prev,
      examples: (prev.examples || []).filter((_, i) => i !== index)
    }));
  };

  const updateTestCase = (index, field, value) => {
    setFormData((prev) => {
      const testCases = [...(prev.testCases || [])];
      testCases[index] = { ...testCases[index], [field]: field === 'hidden' ? Boolean(value) : value };
      return { ...prev, testCases };
    });
  };

  const addTestCase = () => {
    setFormData((prev) => ({
      ...prev,
      testCases: [...(prev.testCases || []), { input: '', expected_output: '', hidden: false }]
    }));
  };

  const removeTestCase = (index) => {
    setFormData((prev) => ({
      ...prev,
      testCases: (prev.testCases || []).filter((_, i) => i !== index)
    }));
  };

  const validate = () => {
    if (!boilerplateDecisionMade) return 'Please choose whether this question needs boilerplate.';
    if (!formData.title.trim()) return 'Question title is required.';
    if (!formData.description.trim()) return 'Question description is required.';
    if (!formData.difficulty) return 'Difficulty is required.';
    if (formData.has_boilerplate) {
      if (!formData.function_name.trim()) return 'Function name is required when boilerplate is enabled.';
      if (!formData.parameter_schema?.returnType) return 'Return type is required when boilerplate is enabled.';

      const invalidParams = (formData.parameter_schema?.params || []).some((p) => !p.name?.trim() || !p.type?.trim());
      if (invalidParams) return 'Each parameter must include name and type.';
    }

    const invalidTests = (formData.testCases || []).some((tc) => !tc.input?.trim() || !tc.expected_output?.trim());
    if (invalidTests) return 'Each test case needs input and expected output.';

    return '';
  };

  const submit = (event) => {
    event.preventDefault();
    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError('');
    onSubmit(formData);
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal">
        <div className="admin-modal-header">
          <div>
            <h3>{mode === 'edit' ? 'Edit Question' : 'Create Question'}</h3>
            <p>Question management with beginner mode support</p>
          </div>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Close</button>
        </div>

        <form className="admin-modal-content" onSubmit={submit}>
          {error ? <div className="admin-error">{error}</div> : null}

          <div className="admin-choice-card">
            <p className="admin-choice-title">Step 1: Does this question need boilerplate?</p>
            <div className="admin-choice-actions">
              <button
                type="button"
                className={`admin-btn ${boilerplateDecisionMade && formData.has_boilerplate ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                onClick={() => {
                  setBoilerplateDecisionMade(true);
                  setFormData((prev) => ({ ...prev, has_boilerplate: true }));
                }}
              >
                Yes, use boilerplate
              </button>
              <button
                type="button"
                className={`admin-btn ${boilerplateDecisionMade && !formData.has_boilerplate ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                onClick={() => {
                  setBoilerplateDecisionMade(true);
                  setFormData((prev) => ({ ...prev, has_boilerplate: false }));
                }}
              >
                No, full program I/O
              </button>
            </div>
            <p className="admin-helper">
              {boilerplateDecisionMade
                ? formData.has_boilerplate
                  ? 'Function name, parameters, and return type will be required.'
                  : 'Function signature fields are optional and hidden. Use clear description/examples/test cases.'
                : 'Select one option to continue to the remaining fields.'}
            </p>
          </div>

          {boilerplateDecisionMade ? (
            <div className="admin-form-grid">
            <div className="admin-form-group admin-form-group-full">
              <label className="admin-label">Question Title</label>
              <input className="admin-input" name="title" value={formData.title} onChange={handleBasicInput} />
            </div>

            {formData.has_boilerplate ? (
              <div className="admin-form-group">
                <label className="admin-label">Function Name</label>
                <input className="admin-input" name="function_name" value={formData.function_name} onChange={handleBasicInput} placeholder="twoSum" />
              </div>
            ) : null}

            <div className="admin-form-group">
              <label className="admin-label">Difficulty</label>
              <select className="admin-select" name="difficulty" value={formData.difficulty} onChange={handleBasicInput}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Question Type</label>
              <select className="admin-select" name="question_type" value={formData.question_type} onChange={handleBasicInput}>
                <option value="">Select Type</option>
                {QUESTION_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Tags</label>
              <input className="admin-input" value={tagInput} onChange={handleTagsChange} placeholder="beginner, array, two-pointer" />
            </div>

            <div className="admin-form-group admin-form-group-full">
              <label className="admin-label">Description</label>
              <textarea className="admin-textarea" rows={7} name="description" value={formData.description} onChange={handleBasicInput} />
            </div>

            {formData.has_boilerplate ? (
              <>
                <div className="admin-form-group">
                  <label className="admin-label">Return Type</label>
                  <select
                    className="admin-select"
                    value={formData.parameter_schema?.returnType || ''}
                    onChange={(event) => setFormData((prev) => ({
                      ...prev,
                      parameter_schema: {
                        returnType: event.target.value,
                        params: prev.parameter_schema?.params || [{ name: '', type: '' }]
                      }
                    }))}
                  >
                    <option value="">Select Return Type</option>
                    {TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>

                <div className="admin-form-group admin-form-group-full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="admin-label">Function Parameters</label>
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={addParam}>Add Parameter</button>
                  </div>
                  <div className="admin-mini-list">
                    {(formData.parameter_schema?.params || []).map((param, index) => (
                      <div className="admin-mini-item" key={`param-${index}`}>
                        <div className="admin-inline-grid">
                          <input className="admin-input" value={param.name || ''} onChange={(e) => updateParam(index, 'name', e.target.value)} placeholder="name" />
                          <select className="admin-select" value={param.type || ''} onChange={(e) => updateParam(index, 'type', e.target.value)}>
                            <option value="">Type</option>
                            {TYPE_OPTIONS.map((option) => <option key={`${option}-${index}`} value={option}>{option}</option>)}
                          </select>
                          <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeParam(index)}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            <div className="admin-form-group admin-form-group-full">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="admin-label">Examples</label>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={addExample}>Add Example</button>
              </div>
              <div className="admin-mini-list">
                {(formData.examples || []).map((example, index) => (
                  <div className="admin-mini-item" key={`example-${index}`}>
                    <div className="admin-inline-grid-2">
                      <textarea className="admin-textarea" rows={2} value={example.input || ''} onChange={(e) => updateExample(index, 'input', e.target.value)} placeholder="Input" />
                      <textarea className="admin-textarea" rows={2} value={example.output || ''} onChange={(e) => updateExample(index, 'output', e.target.value)} placeholder="Output" />
                    </div>
                    <textarea className="admin-textarea" rows={2} value={example.explanation || ''} onChange={(e) => updateExample(index, 'explanation', e.target.value)} placeholder="Explanation" />
                    <div>
                      <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeExample(index)}>Remove Example</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-form-group admin-form-group-full">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="admin-label">Test Cases</label>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={addTestCase}>Add Test Case</button>
              </div>
              <div className="admin-mini-list">
                {(formData.testCases || []).map((testCase, index) => (
                  <div className="admin-mini-item" key={`test-${index}`}>
                    <div className="admin-inline-grid-2">
                      <textarea className="admin-textarea" rows={3} value={testCase.input || ''} onChange={(e) => updateTestCase(index, 'input', e.target.value)} placeholder="Input" />
                      <textarea className="admin-textarea" rows={3} value={testCase.expected_output || ''} onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)} placeholder="Expected Output" />
                    </div>
                    <label className="admin-switch">
                      <input type="checkbox" checked={Boolean(testCase.hidden)} onChange={(e) => updateTestCase(index, 'hidden', e.target.checked)} />
                      Hidden test case
                    </label>
                    <div>
                      <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeTestCase(index)}>Remove Test Case</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          ) : null}

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : mode === 'edit' ? 'Update Question' : 'Create Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuestionForm;
