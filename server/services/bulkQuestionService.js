import XLSX from 'xlsx';

/**
 * Parse boilerplate template Excel file
 * Expected columns: Title, Function Name, Difficulty, Question Type, Tags, Return Type, Description, Examples (as JSON), Test Cases (as JSON)
 */
function parseBoilerplateTemplate(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  const questions = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Excel row number (1-indexed header, 0-indexed data starts at 2)
    const error = validateBoilerplateRow(row);

    if (error) {
      errors.push({ row: rowNum, ...error });
      return;
    }

    const examples = parseExamplesJson(row['Examples'] || '[]', rowNum, errors);
    const testCases = parseTestCasesJson(row['Test Cases'] || '[]', rowNum, errors);

    const question = {
      title: (row['Title'] || '').trim(),
      function_name: (row['Function Name'] || '').trim(),
      description: (row['Description'] || '').trim(),
      difficulty: (row['Difficulty'] || '').trim(),
      question_type: (row['Question Type'] || '').trim(),
      tags: { tags: parseTags(row['Tags']) },
      parameter_schema: {
        returnType: (row['Return Type'] || '').trim(),
        params: parseParameters(row)
      },
      examples: examples || [],
      testCases: testCases || [],
      has_boilerplate: true
    };

    questions.push({ rowNum, question });
  });

  return { questions, errors };
}

/**
 * Parse no-boilerplate template Excel file
 * Expected columns: Title, Difficulty, Question Type, Tags, Description, Examples (as JSON), Test Cases (as JSON)
 */
function parseNoBoilerplateTemplate(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  const questions = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const error = validateNoBoilerplateRow(row);

    if (error) {
      errors.push({ row: rowNum, ...error });
      return;
    }

    const examples = parseExamplesJson(row['Examples'] || '[]', rowNum, errors);
    const testCases = parseTestCasesJson(row['Test Cases'] || '[]', rowNum, errors);

    const question = {
      title: (row['Title'] || '').trim(),
      function_name: '',
      description: (row['Description'] || '').trim(),
      difficulty: (row['Difficulty'] || '').trim(),
      question_type: (row['Question Type'] || '').trim(),
      tags: { tags: parseTags(row['Tags']) },
      parameter_schema: {
        returnType: '',
        params: []
      },
      examples: examples || [],
      testCases: testCases || [],
      has_boilerplate: false
    };

    questions.push({ rowNum, question });
  });

  return { questions, errors };
}

function validateBoilerplateRow(row) {
  if (!row['Title'] || !String(row['Title']).trim()) {
    return { field: 'Title', message: 'Title is required' };
  }
  if (!row['Function Name'] || !String(row['Function Name']).trim()) {
    return { field: 'Function Name', message: 'Function Name is required for boilerplate' };
  }
  if (!row['Difficulty'] || !String(row['Difficulty']).trim()) {
    return { field: 'Difficulty', message: 'Difficulty is required' };
  }
  if (!row['Return Type'] || !String(row['Return Type']).trim()) {
    return { field: 'Return Type', message: 'Return Type is required for boilerplate' };
  }
  if (!row['Description'] || !String(row['Description']).trim()) {
    return { field: 'Description', message: 'Description is required' };
  }

  const difficulty = String(row['Difficulty']).trim();
  if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    return { field: 'Difficulty', message: 'Difficulty must be Easy, Medium, or Hard' };
  }

  return null;
}

function validateNoBoilerplateRow(row) {
  if (!row['Title'] || !String(row['Title']).trim()) {
    return { field: 'Title', message: 'Title is required' };
  }
  if (!row['Difficulty'] || !String(row['Difficulty']).trim()) {
    return { field: 'Difficulty', message: 'Difficulty is required' };
  }
  if (!row['Description'] || !String(row['Description']).trim()) {
    return { field: 'Description', message: 'Description is required' };
  }

  const difficulty = String(row['Difficulty']).trim();
  if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    return { field: 'Difficulty', message: 'Difficulty must be Easy, Medium, or Hard' };
  }

  return null;
}

function parseTags(tagsStr) {
  if (!tagsStr) return [];
  return String(tagsStr)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseParameters(row) {
  const params = [];
  let paramIndex = 1;

  while (true) {
    const paramName = row[`Param ${paramIndex} Name`];
    const paramType = row[`Param ${paramIndex} Type`];

    if (!paramName && !paramType) break;

    if (paramName && paramType) {
      params.push({
        name: String(paramName).trim(),
        type: String(paramType).trim()
      });
    }

    paramIndex++;
  }

  return params.length > 0 ? params : [{ name: '', type: '' }];
}

function parseExamplesJson(examplesStr, rowNum, errors) {
  if (!examplesStr) return [];

  try {
    const parsed = JSON.parse(String(examplesStr));
    if (!Array.isArray(parsed)) return [];

    return parsed.map((ex) => ({
      input: ex.input || '',
      output: ex.output || '',
      explanation: ex.explanation || ''
    }));
  } catch (e) {
    errors.push({
      row: rowNum,
      field: 'Examples',
      message: `Invalid JSON: ${e.message}`
    });
    return [];
  }
}

function parseTestCasesJson(testCasesStr, rowNum, errors) {
  if (!testCasesStr) return [];

  try {
    const parsed = JSON.parse(String(testCasesStr));
    if (!Array.isArray(parsed)) return [];

    return parsed.map((tc) => ({
      input: tc.input || '',
      expected_output: tc.expected_output || '',
      hidden: Boolean(tc.hidden)
    }));
  } catch (e) {
    errors.push({
      row: rowNum,
      field: 'Test Cases',
      message: `Invalid JSON: ${e.message}`
    });
    return [];
  }
}

export {
  parseBoilerplateTemplate,
  parseNoBoilerplateTemplate
};
