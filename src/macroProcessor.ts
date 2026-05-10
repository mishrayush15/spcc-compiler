// ============================================================
// MiniMacro Two-Pass Macro Processor
// ============================================================
// Predefined keywords: MACRO, MEND, LOAD, STORE, ADD
// Supports: macro definitions, macro calls, delimiters, parameters
// ============================================================

export interface MNTEntry {
  index: number;
  name: string;
  paramCount: number;
  mdtIndex: number; // starting index in MDT
}

export interface MDTEntry {
  index: number;
  line: string;
}

export interface ALAEntry {
  index: number;
  param: string;
}

export interface ErrorEntry {
  line: number;
  message: string;
  type: 'error' | 'warning';
}

export interface ExpansionStep {
  step: number;
  description: string;
  output: string;
}

export interface ProcessorResult {
  mnt: MNTEntry[];
  mdt: MDTEntry[];
  ala: ALAEntry[][];
  expandedCode: string[];
  errors: ErrorEntry[];
  pass1Output: string[];
  pass2Steps: ExpansionStep[];
}

const KEYWORDS = ['MACRO', 'MEND', 'LOAD', 'STORE', 'ADD'];

export function processMacro(input: string): ProcessorResult {
  const lines = input.split('\n').map(l => l.trimEnd());
  const mnt: MNTEntry[] = [];
  const mdt: MDTEntry[] = [];
  const ala: ALAEntry[][] = [];
  const errors: ErrorEntry[] = [];
  const expandedCode: string[] = [];
  const pass1Output: string[] = [];
  const pass2Steps: ExpansionStep[] = [];

  // ========================
  // PASS 1: Build MNT & MDT
  // ========================
  let mdtIndex = 0;
  let insideMacro = false;
  let currentMacroName = '';
  let currentParams: string[] = [];
  let currentALA: ALAEntry[] = [];
  let macroStartLine = 0;
  const nonMacroLines: { lineNum: number; text: string }[] = [];

  pass1Output.push('═══ PASS 1: Building MNT and MDT ═══');
  pass1Output.push('');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    if (line === '' && !insideMacro) continue;

    // Check for MACRO keyword
    if (line.toUpperCase().startsWith('MACRO')) {
      if (insideMacro) {
        errors.push({
          line: lineNum,
          message: `Nested macro definition not allowed. Already inside macro '${currentMacroName}'.`,
          type: 'error'
        });
        continue;
      }

      insideMacro = true;
      macroStartLine = lineNum;

      // Parse: MACRO name &param1, &param2
      const parts = line.substring(5).trim();
      const tokens = parts.split(/[\s,]+/).filter(t => t !== '');

      if (tokens.length === 0) {
        errors.push({
          line: lineNum,
          message: 'Macro definition missing name.',
          type: 'error'
        });
        insideMacro = false;
        continue;
      }

      currentMacroName = tokens[0].toUpperCase();

      // Check if macro name clashes with keywords
      if (KEYWORDS.includes(currentMacroName)) {
        errors.push({
          line: lineNum,
          message: `Macro name '${currentMacroName}' conflicts with a reserved keyword.`,
          type: 'error'
        });
      }

      // Check for duplicate macro
      if (mnt.find(m => m.name === currentMacroName)) {
        errors.push({
          line: lineNum,
          message: `Duplicate macro definition '${currentMacroName}'. Previous definition will be overwritten.`,
          type: 'warning'
        });
      }

      // Parse parameters
      currentParams = tokens.slice(1).map(p => p.replace(/^&/, ''));
      currentALA = currentParams.map((p, idx) => ({ index: idx, param: p }));

      // Add to MNT
      const mntEntry: MNTEntry = {
        index: mnt.length,
        name: currentMacroName,
        paramCount: currentParams.length,
        mdtIndex: mdtIndex
      };
      mnt.push(mntEntry);

      pass1Output.push(`[Line ${lineNum}] Found MACRO definition: ${currentMacroName}`);
      pass1Output.push(`  Parameters: ${currentParams.length > 0 ? currentParams.map(p => '&' + p).join(', ') : '(none)'}`);
      pass1Output.push(`  MNT Entry #${mntEntry.index}: name=${mntEntry.name}, params=${mntEntry.paramCount}, MDT start=${mntEntry.mdtIndex}`);
      pass1Output.push('');

      continue;
    }

    // Check for MEND keyword
    if (line.toUpperCase() === 'MEND') {
      if (!insideMacro) {
        errors.push({
          line: lineNum,
          message: 'MEND found without matching MACRO definition.',
          type: 'error'
        });
        continue;
      }

      // Add MEND to MDT
      mdt.push({ index: mdtIndex++, line: 'MEND' });
      ala.push(currentALA);

      pass1Output.push(`[Line ${lineNum}] MEND — closing macro '${currentMacroName}'`);
      pass1Output.push(`  MDT entries ${mnt[mnt.length - 1].mdtIndex} to ${mdtIndex - 1}`);
      pass1Output.push('');

      insideMacro = false;
      currentMacroName = '';
      currentParams = [];
      currentALA = [];
      continue;
    }

    if (insideMacro) {
      // Replace parameters with positional notation
      let processedLine = line;
      currentParams.forEach((param, idx) => {
        const regex = new RegExp(`&${param}`, 'gi');
        processedLine = processedLine.replace(regex, `#${idx}`);
      });
      mdt.push({ index: mdtIndex++, line: processedLine });

      pass1Output.push(`[Line ${lineNum}] MDT[${mdtIndex - 1}]: ${processedLine}`);
    } else {
      nonMacroLines.push({ lineNum, text: line });
    }
  }

  // Check for unclosed macro
  if (insideMacro) {
    errors.push({
      line: macroStartLine,
      message: `Macro '${currentMacroName}' is missing MEND. Definition started at line ${macroStartLine}.`,
      type: 'error'
    });
  }

  pass1Output.push('');
  pass1Output.push('─── MNT (Macro Name Table) ───');
  if (mnt.length === 0) {
    pass1Output.push('  (empty — no macros defined)');
  } else {
    pass1Output.push('  Index | Name          | Params | MDT Start');
    pass1Output.push('  ──────┼───────────────┼────────┼──────────');
    mnt.forEach(m => {
      pass1Output.push(`  ${String(m.index).padStart(5)} | ${m.name.padEnd(13)} | ${String(m.paramCount).padStart(6)} | ${m.mdtIndex}`);
    });
  }

  pass1Output.push('');
  pass1Output.push('─── MDT (Macro Definition Table) ───');
  if (mdt.length === 0) {
    pass1Output.push('  (empty)');
  } else {
    mdt.forEach(m => {
      pass1Output.push(`  [${m.index}] ${m.line}`);
    });
  }

  // ========================
  // PASS 2: Macro Expansion
  // ========================
  let stepCount = 0;

  pass2Steps.push({
    step: stepCount++,
    description: 'Starting Pass 2 — Processing non-macro lines',
    output: ''
  });

  for (const { lineNum, text } of nonMacroLines) {
    const tokens = text.split(/[\s,]+/).filter(t => t !== '');
    if (tokens.length === 0) continue;

    const possibleMacroName = tokens[0].toUpperCase();
    const macroEntry = mnt.find(m => m.name === possibleMacroName);

    if (macroEntry) {
      // This is a macro call
      const args = tokens.slice(1);

      // Validate argument count
      if (args.length !== macroEntry.paramCount) {
        errors.push({
          line: lineNum,
          message: `Macro '${macroEntry.name}' expects ${macroEntry.paramCount} argument(s) but got ${args.length}.`,
          type: 'error'
        });

        pass2Steps.push({
          step: stepCount++,
          description: `[Line ${lineNum}] ERROR: Parameter mismatch for '${macroEntry.name}'`,
          output: `Expected ${macroEntry.paramCount}, got ${args.length}`
        });
        continue;
      }

      pass2Steps.push({
        step: stepCount++,
        description: `[Line ${lineNum}] Expanding macro '${macroEntry.name}' with args: ${args.join(', ')}`,
        output: ''
      });

      // Expand from MDT
      for (let j = macroEntry.mdtIndex; j < mdt.length; j++) {
        const mdtLine = mdt[j].line;
        if (mdtLine === 'MEND') break;

        let expandedLine = mdtLine;
        args.forEach((arg, idx) => {
          const regex = new RegExp(`#${idx}`, 'g');
          expandedLine = expandedLine.replace(regex, arg);
        });

        expandedCode.push(expandedLine);

        pass2Steps.push({
          step: stepCount++,
          description: `  MDT[${j}]: ${mdtLine} → ${expandedLine}`,
          output: expandedLine
        });
      }
    } else {
      // Check if it's a valid instruction or unknown
      const keyword = tokens[0].toUpperCase();
      if (KEYWORDS.includes(keyword) && keyword !== 'MACRO' && keyword !== 'MEND') {
        expandedCode.push(text);
        pass2Steps.push({
          step: stepCount++,
          description: `[Line ${lineNum}] Instruction: ${text}`,
          output: text
        });
      } else if (keyword === 'MACRO' || keyword === 'MEND') {
        // skip — already handled in pass 1
      } else {
        // Could be a label or undefined macro
        // Check if it looks like a macro call (capitalized name)
        if (/^[A-Z_][A-Z0-9_]*$/i.test(tokens[0]) && tokens.length > 0) {
          // Check if there are arguments — likely an undefined macro call
          if (tokens.length > 1 || text.includes(',')) {
            errors.push({
              line: lineNum,
              message: `Undefined macro '${tokens[0]}'. No definition found.`,
              type: 'error'
            });
            pass2Steps.push({
              step: stepCount++,
              description: `[Line ${lineNum}] ERROR: Undefined macro '${tokens[0]}'`,
              output: ''
            });
          } else {
            // Treat as passthrough (label or data)
            expandedCode.push(text);
            pass2Steps.push({
              step: stepCount++,
              description: `[Line ${lineNum}] Passthrough: ${text}`,
              output: text
            });
          }
        } else {
          expandedCode.push(text);
          pass2Steps.push({
            step: stepCount++,
            description: `[Line ${lineNum}] Passthrough: ${text}`,
            output: text
          });
        }
      }
    }
  }

  return { mnt, mdt, ala, expandedCode, errors, pass1Output, pass2Steps };
}

// Sample programs for demonstration
export const EXAMPLES = [
  {
    name: 'Basic Macro',
    description: 'Simple macro with two parameters',
    code: `MACRO ADD_NUMS &A, &B
LOAD &A
ADD &B
STORE RESULT
MEND

ADD_NUMS 5, 10
ADD_NUMS 20, 30`
  },
  {
    name: 'Multiple Macros',
    description: 'Two macros with different parameter counts',
    code: `MACRO INIT &X
LOAD &X
STORE TEMP
MEND

MACRO CALC &A, &B
LOAD &A
ADD &B
STORE RESULT
MEND

INIT 100
CALC 5, 10
INIT 200
CALC 15, 25`
  },
  {
    name: 'Error Demo',
    description: 'Demonstrates various error conditions',
    code: `MACRO VALID &X
LOAD &X
STORE OUT
MEND

VALID 42
UNDEFINED_MACRO 1, 2
VALID 10, 20, 30
LOAD 99`
  },
  {
    name: 'No Parameters',
    description: 'Macro without any parameters',
    code: `MACRO RESET
LOAD 0
STORE ACC
STORE TEMP
MEND

RESET
LOAD 50
ADD 25
RESET`
  },
  {
    name: 'Missing MEND',
    description: 'Shows error for unclosed macro definition',
    code: `MACRO BROKEN &A
LOAD &A
ADD 10

BROKEN 5`
  }
];
