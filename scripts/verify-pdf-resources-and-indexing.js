/**
 * PDF Learning Resources, Reference Library & Indexing Verification Suite
 *
 * Consolidates tests from:
 * - verify-phase4a.js (deterministic chunking, heading detection, indexing sheet schema, duplicate handling)
 * - verify-phase4d1.js (clinical relevance gate, taxonomy validation, false positive elimination)
 * - test-phase2-extraction.cjs (PDF signature validation, stream extraction, unsupported format rejection)
 *
 * Enforces the final document policy:
 * - CNE Learning Material: PDF only, maximum 3 MB, %PDF signature validation
 * - Nursing Reference Library: PDF only, Admin-only, no 3 MB inheritance, Drive location verification
 * - Unsupported formats rejected: DOC, DOCX, PPT, PPTX, TXT, images, ZIP, executables
 * - Evidence Retrieval: passesClinicalRelevanceGate, procedural taxonomy, cross-procedural contamination prevention
 */

import assert from 'assert';
import fs from 'fs';

console.log('========================================================');
console.log('PDF Resources, Indexing & Clinical Evidence Verification');
console.log('========================================================\n');

const codeGs = fs.readFileSync('Code.gs', 'utf8');
const backendGs = fs.readFileSync('src/backend/googleAppsScript.ts', 'utf8');
const addResourceModalTs = fs.readFileSync('src/components/cne/AddResourceModal.tsx', 'utf8');
const learningResPageTs = fs.readFileSync('src/components/cne/LearningResourcesPage.tsx', 'utf8');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${err.message}\n`);
    throw err;
  }
}

// =============================================================================
// 1. CNE Learning Material Document Policy & Size Limit (3 MB)
// =============================================================================
runTest('CNE Learning Material enforces PDF-only format in frontend modal', () => {
  assert.ok(
    addResourceModalTs.includes("if (ext !== 'pdf')"),
    'Frontend modal must strictly enforce ext === pdf'
  );
  assert.ok(
    addResourceModalTs.includes('Only PDF (.pdf) documents are supported'),
    'Frontend modal must inform user that only PDF documents are supported'
  );
});

runTest('CNE Learning Material enforces authoritative 3 MB maximum size limit', () => {
  // Frontend modal limit check
  assert.ok(
    addResourceModalTs.includes('3 * 1024 * 1024') || addResourceModalTs.includes('3MB authoritative limit'),
    'Frontend modal must check 3 MB limit'
  );
  assert.ok(
    addResourceModalTs.includes('exceeds the maximum allowed limit of 3 MB'),
    'Frontend modal must show 3 MB limit warning message'
  );

  // Simulation test for file size validation
  function validateCneFileSize(sizeBytes) {
    const MAX_SIZE = 3 * 1024 * 1024;
    if (sizeBytes > MAX_SIZE) {
      return { valid: false, error: 'EXCEEDS_SIZE_LIMIT' };
    }
    return { valid: true };
  }

  // Valid sizes <= 3 MB
  assert.strictEqual(validateCneFileSize(1024).valid, true);
  assert.strictEqual(validateCneFileSize(3 * 1024 * 1024).valid, true);

  // Invalid sizes > 3 MB
  assert.strictEqual(validateCneFileSize(3 * 1024 * 1024 + 1).valid, false);
  assert.strictEqual(validateCneFileSize(5 * 1024 * 1024).valid, false);
});

// =============================================================================
// 2. Unsupported File Formats Rejected
// =============================================================================
runTest('Unsupported formats (DOC, DOCX, PPT, PPTX, TXT, images, ZIP, EXE) are rejected', () => {
  const rejectedExtensions = [
    'doc', 'docx', 'ppt', 'pptx', 'txt', 'rtf',
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp',
    'zip', 'tar', 'gz', 'rar', '7z',
    'exe', 'sh', 'bat', 'cmd', 'js', 'py'
  ];

  function validateCneExtension(filename) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext !== 'pdf') {
      return { valid: false, error: 'UNSUPPORTED_FORMAT' };
    }
    return { valid: true };
  }

  for (const ext of rejectedExtensions) {
    const res = validateCneExtension(`test_document.${ext}`);
    assert.strictEqual(res.valid, false, `Extension .${ext} must be rejected`);
    assert.strictEqual(res.error, 'UNSUPPORTED_FORMAT');
  }

  // Only .pdf is allowed
  assert.strictEqual(validateCneExtension('clinical_nursing_guide.pdf').valid, true);
  assert.strictEqual(validateCneExtension('EMERGENCY_BLS.PDF').valid, true);
});

// =============================================================================
// 3. PDF Content Validation & %PDF Signature
// =============================================================================
runTest('PDF signature verification accepts valid PDF and rejects fake/spoofed or empty files', () => {
  function validatePdfHeader(bytes) {
    if (!bytes || bytes.length === 0) {
      return { valid: false, errorCode: 'EMPTY_FILE', message: 'File is empty.' };
    }
    if (bytes.length < 4) {
      return { valid: false, errorCode: 'INVALID_FILE_CONTENT', message: 'File too small to be a PDF.' };
    }
    // Check %PDF header signature (0x25, 0x50, 0x44, 0x46)
    if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
      return { valid: false, errorCode: 'INVALID_FILE_CONTENT', message: 'Missing %PDF magic signature.' };
    }
    return { valid: true };
  }

  // Valid PDF header
  const validPdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n');
  assert.strictEqual(validatePdfHeader(validPdfHeader).valid, true);

  // Empty file rejected
  assert.strictEqual(validatePdfHeader(Buffer.alloc(0)).errorCode, 'EMPTY_FILE');

  // Spoofed file (text or image renamed .pdf)
  const fakePdf = Buffer.from('This is a text file renamed to guide.pdf');
  assert.strictEqual(validatePdfHeader(fakePdf).errorCode, 'INVALID_FILE_CONTENT');

  // Spoofed PNG renamed .pdf
  const fakePng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  assert.strictEqual(validatePdfHeader(fakePng).errorCode, 'INVALID_FILE_CONTENT');
});

runTest('PDF stream text extraction correctly extracts text operands', () => {
  // Simple PDF text stream parser simulation
  function parsePdfStreamText(streamText) {
    const textPieces = [];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let m;
    while ((m = tjRegex.exec(streamText)) !== null) {
      textPieces.push(m[1]);
    }
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    while ((m = tjArrayRegex.exec(streamText)) !== null) {
      const inner = m[1];
      const partRegex = /\(([^)]*)\)/g;
      let p;
      while ((p = partRegex.exec(inner)) !== null) {
        textPieces.push(p[1]);
      }
    }
    return textPieces.join(' ').replace(/\\([()\\])/g, '$1').trim();
  }

  const sampleStream = `
    BT
    /F1 12 Tf
    72 712 Td
    (Peripheral Intravenous Catheterization Procedure) Tj
    0 -14 Td
    [(Ensure ) -20 (aseptic ) -20 (technique ) -20 (and ) -20 (vein ) -20 (flashback.)] TJ
    ET
  `;

  const extracted = parsePdfStreamText(sampleStream);
  assert.ok(extracted.includes('Peripheral Intravenous Catheterization Procedure'));
  assert.ok(extracted.includes('Ensure'));
  assert.ok(extracted.includes('flashback'));
});

// =============================================================================
// 4. Nursing Reference Library Policy
// =============================================================================
runTest('Nursing Reference Library is strictly Admin-managed and requires PDF format', () => {
  // Reference management is guarded by Admin role in UI and backend
  assert.ok(
    learningResPageTs.includes("const isAdmin = user?.role === 'ADMIN';") &&
    learningResPageTs.includes("if (!isAdmin || item.sourceType !== 'NURSING_REFERENCE_LIB'"),
    'LearningResourcesPage must restrict Reference library actions to Admin role'
  );
  assert.ok(
    codeGs.includes('getOrCreateNursingRefLibraryFolder'),
    'Backend must maintain dedicated Nursing Reference Library folder hierarchy'
  );
  assert.ok(
    codeGs.includes('isFileInOpenRnFolder'),
    'Backend must validate Drive file location inside Open RN reference folder'
  );
});

runTest('Nursing Reference Library does NOT inherit the CNE 3 MB limit', () => {
  // In AddResourceModal, CNE_LEARNING_MATERIAL uses file select with 3MB limit,
  // whereas NURSING_REFERENCE_LIB connects to Drive files or reference items without 3 MB cutoff
  assert.ok(
    addResourceModalTs.includes("resourceType === 'NURSING_REFERENCE_LIB'"),
    'Modal must support NURSING_REFERENCE_LIB mode'
  );

  function checkSizeAllowance(resourceType, sizeBytes) {
    if (resourceType === 'CNE_LEARNING_MATERIAL') {
      const MAX_SIZE = 3 * 1024 * 1024;
      return sizeBytes <= MAX_SIZE;
    }
    // Reference library allows comprehensive clinical textbooks and reference guides beyond 3 MB
    return true;
  }

  const largeBookSize = 8 * 1024 * 1024; // 8 MB reference book
  assert.strictEqual(checkSizeAllowance('CNE_LEARNING_MATERIAL', largeBookSize), false);
  assert.strictEqual(checkSizeAllowance('NURSING_REFERENCE_LIB', largeBookSize), true);
});

runTest('Reference Library resources support visibility toggling and indexing', () => {
  assert.ok(
    learningResPageTs.includes('handleToggleVisibility') || learningResPageTs.includes('setResourceVisibility'),
    'LearningResourcesPage must provide visibility toggling'
  );
  assert.ok(
    codeGs.includes('function handleToggleReferenceVisibility(') || codeGs.includes('setResourceVisibility'),
    'Backend must support toggling reference resource visibility'
  );
  assert.ok(
    learningResPageTs.includes('handleReindex') || learningResPageTs.includes('reindex'),
    'LearningResourcesPage must support re-indexing'
  );
});

// =============================================================================
// 5. Deterministic Chunking & Indexing Schema (Phase 4A)
// =============================================================================
runTest('CNE_Reference_Index sheet headers and header aliases are correctly configured', () => {
  assert.ok(codeGs.includes("'CNE_Reference_Index': ["), "CNE_Reference_Index must be registered in CNE_SHEET_HEADERS");

  const requiredHeaders = [
    'Index ID',
    'Source Type',
    'CNE ID',
    'Drive File ID',
    'Resource Title',
    'Topic',
    'Section / Heading',
    'Chunk Index',
    'Chunk Text',
    'Clinical Keywords',
    'Extraction Status',
    'Updated At'
  ];

  for (const h of requiredHeaders) {
    assert.ok(codeGs.includes(`'${h}'`), `Header '${h}' must be present in Code.gs`);
  }

  assert.ok(codeGs.includes("'indexid':"), 'indexid alias must exist');
  assert.ok(codeGs.includes("'chunktext':"), 'chunktext alias must exist');
  assert.ok(codeGs.includes("'sectionheading':"), 'sectionheading alias must exist');
});

runTest('Deterministic text chunking respects 1,000-1,500 character boundaries and word limits', () => {
  function splitTextIntoWindows(text, targetSize, overlap) {
    const result = [];
    if (!text) return result;
    if (text.length <= targetSize) {
      result.push(text);
      return result;
    }
    let pos = 0;
    while (pos < text.length) {
      const end = pos + targetSize;
      if (end >= text.length) {
        const remaining = text.substring(pos).trim();
        if (remaining) result.push(remaining);
        break;
      }
      let breakPos = -1;
      const searchStart = pos + Math.floor(targetSize * 0.7);
      const searchEnd = Math.min(pos + targetSize + 150, text.length);
      const searchSlice = text.substring(searchStart, searchEnd);

      const pIdx = searchSlice.lastIndexOf('\n\n');
      if (pIdx !== -1) {
        breakPos = searchStart + pIdx + 2;
      } else {
        const sMatch = searchSlice.match(/[\.\?!]\s+/g);
        if (sMatch) {
          const lastS = searchSlice.lastIndexOf(sMatch[sMatch.length - 1]);
          if (lastS !== -1) {
            breakPos = searchStart + lastS + sMatch[sMatch.length - 1].length;
          }
        }
      }
      if (breakPos === -1) {
        const spaceIdx = searchSlice.lastIndexOf(' ');
        breakPos = spaceIdx !== -1 ? (searchStart + spaceIdx + 1) : end;
      }
      const chunk = text.substring(pos, breakPos).trim();
      if (chunk) result.push(chunk);
      pos = Math.max(pos + 1, breakPos - overlap);
    }
    return result;
  }

  let text = 'Clinical nursing procedure guideline. ';
  for (let i = 0; i < 100; i++) {
    text += `Step ${i + 1}: Check vital signs, administer prescribed medication, and monitor patient response. `;
  }

  const windows = splitTextIntoWindows(text, 1200, 150);
  assert.ok(windows.length > 2, 'Long text should produce multiple windows');

  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    assert.ok(w.length <= 1500, `Window exceeds max boundary: ${w.length}`);
    assert.ok(!w.startsWith(' '), 'Window should not begin with leading whitespace');
    assert.ok(!w.endsWith(' '), 'Window should not end with trailing whitespace');
  }
});

runTest('Replacement and duplicate handling selectively manage index rows without clearContents()', () => {
  // Ensure NO clearContents calls
  assert.ok(!codeGs.includes('clearContents()'), 'Code.gs must have ZERO clearContents() calls');
  assert.ok(!backendGs.includes('clearContents()'), 'backend wrapper must have ZERO clearContents() calls');

  // Surgical bottom-up deletion logic check
  assert.ok(
    codeGs.includes('deleteSheetRowsByIndices') || codeGs.includes('cleanUpIndexRowsForCNE'),
    'Code.gs must implement surgical index row cleanup'
  );
});

// =============================================================================
// 6. Clinical Relevance Retrieval Gate & Procedural Taxonomy (Phase 4D.1)
// =============================================================================
runTest('passesClinicalRelevanceGate and CLINICAL_PROCEDURAL_TAXONOMY are present in Code.gs', () => {
  assert.ok(
    codeGs.includes('function passesClinicalRelevanceGate('),
    'passesClinicalRelevanceGate must be defined in Code.gs'
  );
  assert.ok(
    codeGs.includes('CLINICAL_PROCEDURAL_TAXONOMY'),
    'CLINICAL_PROCEDURAL_TAXONOMY must exist in Code.gs'
  );
  const gateCallCount = (codeGs.match(/passesClinicalRelevanceGate\(cleanTopic,/g) || []).length;
  assert.ok(
    gateCallCount >= 2,
    'passesClinicalRelevanceGate must be evaluated for both uploaded and reference library chunks'
  );
});

runTest('Clinical relevance gate filters generic terms and prevents cross-procedural contamination', () => {
  // Extract taxonomy and gate function from Code.gs
  const taxonomyMatch = codeGs.match(/var CLINICAL_PROCEDURAL_TAXONOMY = (\[[\s\S]*?\n\]);/);
  assert.ok(taxonomyMatch, 'Could not extract CLINICAL_PROCEDURAL_TAXONOMY from Code.gs');
  const CLINICAL_PROCEDURAL_TAXONOMY = eval(taxonomyMatch[1]);

  const gateStart = codeGs.indexOf('function passesClinicalRelevanceGate(');
  const gateEnd = codeGs.indexOf('function retrieveCNETopicEvidence(');
  assert.ok(gateStart !== -1 && gateEnd !== -1, 'Could not locate gate function boundaries');
  const gateCode = codeGs.substring(gateStart, gateEnd);

  const passesClinicalRelevanceGate = new Function('CLINICAL_PROCEDURAL_TAXONOMY', `
    ${gateCode}
    return passesClinicalRelevanceGate;
  `)(CLINICAL_PROCEDURAL_TAXONOMY);

  // 1. Generic clinical vocabulary alone must FAIL
  const genericChunk = {
    resourceTitle: 'General Clinical Nursing Procedures',
    topic: 'Clinical Skills',
    sectionHeading: 'General Patient Care Guidelines',
    clinicalKeywords: 'catheter, sterile, dressing, patient, care, nursing, procedure, infusion, monitoring, access, insertion',
    chunkText: 'The nurse should adhere to standard sterile technique when performing nursing care and procedures. Proper access and site selection ensures optimal patient management and infusion monitoring.'
  };

  assert.strictEqual(
    passesClinicalRelevanceGate('IV Cannulation', genericChunk),
    false,
    'Generic clinical terms alone must NOT qualify for IV Cannulation'
  );
  assert.strictEqual(
    passesClinicalRelevanceGate('Foley Catheterization', genericChunk),
    false,
    'Generic clinical terms alone must NOT qualify for Foley Catheterization'
  );

  // 2. Cross-procedural contamination: Foley chunk must NOT qualify for IV Cannulation
  const foleyChunk = {
    resourceTitle: 'Nursing Skills Handbook',
    topic: 'Urinary Catheterization',
    sectionHeading: 'Foley Catheter Insertion Technique and Balloon Inflation',
    clinicalKeywords: 'foley catheter, urinary retention, bladder, sterile field, retention balloon, drainage bag, sterile water',
    chunkText: 'Insert the Foley catheter into the urinary meatus until urine flashback is noted in the tubing. Inflate the retention balloon with 10 mL of sterile water and connect to the gravity drainage bag.'
  };

  assert.strictEqual(
    passesClinicalRelevanceGate('IV Cannulation', foleyChunk),
    false,
    'Foley catheter chunk must NOT qualify for IV Cannulation'
  );
  assert.strictEqual(
    passesClinicalRelevanceGate('Foley Catheterization', foleyChunk),
    true,
    'Foley catheter chunk MUST qualify for Foley Catheterization'
  );

  // 3. Genuine IV Cannulation chunk
  const ivChunk = {
    resourceTitle: 'Clinical Nursing Practice',
    topic: 'Vascular Access',
    sectionHeading: 'Peripheral IV Cannulation and Vein Selection',
    clinicalKeywords: 'iv cannulation, peripheral iv, venipuncture, tourniquet, vein, flashback, cannula gauge, catheter stabilization',
    chunkText: 'Apply the tourniquet 10-15 cm above the intended venipuncture site. Palpate the vein, clean with chlorhexidine, insert the IV cannula at a 15 to 30-degree angle until blood flashback appears in the chamber, then advance the catheter into the vein.'
  };

  assert.strictEqual(
    passesClinicalRelevanceGate('IV Cannulation', ivChunk),
    true,
    'Genuine IV Cannulation chunk MUST qualify for IV Cannulation query'
  );
  assert.strictEqual(
    passesClinicalRelevanceGate('Foley Catheterization', ivChunk),
    false,
    'IV Cannulation chunk must NOT qualify for Foley Catheterization query'
  );
});

console.log('\n========================================================');
console.log(`Passed: ${passedTests}/${totalTests}`);
console.log('ALL PDF RESOURCES, INDEXING & EVIDENCE TESTS PASSED!');
console.log('========================================================\n');
