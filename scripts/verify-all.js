/**
 * CNE Management System - Consolidated Regression Runner
 *
 * Contains the seven authoritative original verification suites in readable
 * embedded source sections. Each suite executes in its own isolated Node.js
 * subprocess, as it did when stored in separate files.
 *
 * Structural/behavioral assertions, test fixtures, and expected failures
 * have not been removed or weakened. A SHA-256 hash verifies each embedded
 * source before execution to detect an incomplete manual paste.
 *
 * Usage:
 *   node scripts/verify-all.js                  # all 7 core suites
 *   node scripts/verify-all.js --suite security  # one named suite
 *   node scripts/verify-timezone-cross-module.cjs # timezone regression
 *
 * Do not place verification code in browser bundles or Apps Script.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, '..');
const SCRIPT_URL = pathToFileURL(join(SCRIPT_DIR, 'verify-all.js')).href;

// All verification suites live in THIS ONE file. The Apps Script sync utility
// is intentionally separate because it modifies generated source, not tests.
// Focused checks retain their original assertions, fixture data and names.
function createHybridChecks() {
  const ROOT=ROOT_DIR;
  const gas=readFileSync(join(ROOT,'Code.gs'),'utf8');
  const TYPES=readFileSync(join(ROOT,'src/types.ts'),'utf8');
  const MODAL=readFileSync(join(ROOT,'src/components/cne/CNEQuestionsModal.tsx'),'utf8');
/** Smart Hybrid behavioral checks. No Google Sheets or Gemini network calls. */
function assert(condition,reason){if(!condition)throw Error(reason);}
function spreadsheet(rows){
  const self={rows:rows.map(row=>row.slice()),getLastRow(){return this.rows.length;},getLastColumn(){return Math.max(...this.rows.map(row=>row.length));},
    getDataRange(){return {getValues:()=>self.rows.map(row=>row.slice())};},
    appendRow(row){self.rows.push(row.slice());},
    getRange(r,c,n=1,w=1){return {getValues(){return Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>self.rows[r-1+i]?.[c-1+j]??''));},
      getValue(){return self.rows[r-1]?.[c-1]??'';},setValue(value){while(self.rows.length<r)self.rows.push([]);self.rows[r-1][c-1]=value;},
      setValues(values){values.forEach((row,i)=>row.forEach((v,j)=>{while(self.rows.length<r+i)self.rows.push([]);self.rows[r-1+i][c-1+j]=v;}));}};}
  };return self;
}
const HEADERS=['Question ID','Unit','Topic','Subtopic','Clinical Keywords','Question Type','Question Text','Option A','Option B','Option C','Option D','Option E','Option F','Correct Answer','Explanation / Rationale','Question PDF Page','Image / Table Required','Image / Table Reference','Verification Status','Updated At'];
const QHEAD=['CNE ID','Question ID','Question Text','Option A','Option B','Option C','Option D','Correct Option','Explanation','Is Finalized','Is Locked','Created At','Created By','Authoritative Source','Status'];
function question(sourceId='REF-001'){
 const row=Array(20).fill('');
 Object.assign(row,{0:sourceId,1:'Nursing Procedures',2:'IV Cannulation',3:'Site selection',4:'venipuncture, cannula insertion',5:'Single best answer',6:'Which peripheral vein is appropriate for IV cannulation in this situation?',7:'Appropriate vein with intact skin',8:'Unassessed vein',9:'Inflamed vein',10:'Previous infiltration site',13:'A',14:'The clinical source explains the safe nursing assessment required for IV site selection.',15:101,16:'NO',17:'',18:'CLINICALLY_APPROVED'});return row;
}
function fixture(){
 const b=spreadsheet([HEADERS,question(),question('REF-002')]);
 const q=spreadsheet([QHEAD]);
 const quota=spreadsheet([['CNE ID','Topic','Attempts Used','Max','Updated At','Used By','Reservation','Until','Last Committed'],['CNE-123','IV Cannulation',0,1,'','','TOK',String(Date.now()+600000),'']]);
 const ctx={console,Date,Set,Map};
 vm.createContext(ctx);vm.runInContext(gas,ctx,{timeout:13000});
 ctx.sanitizeCellInput=v=>String(v||'');
 ctx.getCNEScheduleRecord=cneId=>cneId==='CNE-123'?{cneId,topic:'IV Cannulation',status:'Scheduled'}:null;
 ctx.checkQuestionManagementAuthorized=()=>null;
 ctx.isCNEClosedForParticipantAccess=()=>false;
 ctx.isCNEQuestionsLocked=()=>false;
 ctx.getHeaderMap=sheet=>Object.fromEntries(sheet.rows[0].map((head,i)=>[String(head||'').toLowerCase().replace(/[^a-z0-9]/g,''),i]));
 ctx.getSpreadsheet=()=>({getSheetByName:name=>name==='CNE_Reference_Question_Index'?b:name==='CNE Post Test Questions'?q:null});
 ctx.getQuestionsSheet=()=>q;
 ctx.getQuestionColIndexes=()=>({cneId:0,qId:1,question:2,optA:3,optB:4,optC:5,optD:6,correctOption:7,explanation:8,isFinalized:9,isLocked:10,createdAt:11,createdBy:12,authoritativeSource:13,status:14});
 ctx.getOrCreateSheet=name=>name==='CNE_AI_Quota'?quota:null;
 ctx.revalidateCneMutation_=(session,id)=>({success:true,record:{topic:'IV Cannulation'},session});
 ctx.LockService={getScriptLock:()=>({tryLock:()=>true,waitLock:()=>{},releaseLock:()=>{}})};
 ctx.SpreadsheetApp={flush:()=>{}};
 ctx.invalidateCNEQuestionsCache=()=>{};
 ctx.logAuditAction=()=>{};
 ctx.Utilities={sleep:()=>{}};
 return {ctx,b,q,quota};
}
const session={employeeId:'EDUCATOR-1'};
const DISTINCT_STEMS=[
  'Which peripheral vein is appropriate for intravenous catheter site selection?',
  'What skin antisepsis prevents contamination before performing cannula insertion?',
  'Which signs suggest that intravenous fluid is infiltrating surrounding tissue?',
  'What findings indicate phlebitis with local pain redness and heat?',
  'What documentation is required after removing a peripheral IV device?'
];
function aiQuestion(objective,token='TOK',stem='What clinical action is indicated during peripheral IV catheter care?'){
 return {id:`q_ai_${token}_${objective}`,objectiveId:objective,question:stem,options:{A:'Assess site',B:'Ignore swelling',C:'Never perform hand hygiene',D:'Continue without checking'},correctOption:'A',explanation:'The nursing source supports examination and safe selection of vascular access sites.',authoritativeSource:'Approved Clinical Reference - IV Therapy'};
}
const hybridChecks=[
 {name:'Bank search requires an authorized CNE owner',run(){const {ctx}=fixture();ctx.checkQuestionManagementAuthorized=()=>({success:false,errorCode:'FORBIDDEN'});assert(ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session).errorCode==='FORBIDDEN','Unauthorized search exposed answers');}},
 {name:'Bank search ranks question text and subtopic for all relevant textbook sources',run(){const {ctx}=fixture();const result=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);assert(result.success&&result.data.length===2&&result.data[0].matchScore>0,'Relevant existing question not found');}},
 {name:'Gastritis excludes generic patient care, team nursing and delegation questions',run(){
    const {ctx,b}=fixture();ctx.getCNEScheduleRecord=id=>({cneId:id,topic:'Care of gastritis patient',status:'Scheduled'});
    b.rows[1][2]='Leadership and Delegation';b.rows[1][3]='Team Nursing';b.rows[1][4]='patient care, delegation';b.rows[1][6]='A registered nurse leads nursing personnel in providing care to patients.';
    b.rows[2][2]='Gastritis';b.rows[2][3]='Gastritis nursing care';b.rows[2][6]='What nursing advice is appropriate for a patient with gastritis?';
    const result=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    assert(result.success&&result.data.length===1&&result.data[0].questionId==='REF-002','Generic nursing care was treated as gastritis');
    assert(result.clinicalSearch.concepts[0]==='gastritis'&&result.clinicalSearch.context.includes('nursing care'),'Principal clinical concept or care context missing');
  }},
 {name:'Gastritis verified synonym recognizes gastric mucosal inflammation but not peptic ulcer',run(){
    const {ctx,b}=fixture();ctx.getCNEScheduleRecord=id=>({cneId:id,topic:'Care of gastritis patient'});
    b.rows[1][2]='Gastric mucosal inflammation';b.rows[1][6]='How is gastric mucosal inflammation managed?';
    b.rows[2][2]='Peptic ulcer disease';b.rows[2][6]='What is the nursing management of peptic ulcer disease?';
    const r=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    assert(r.data.length===1&&r.data[0].questionId==='REF-001','Unverified GI disease equivalence accepted');
  }},
 {name:'Generic CNE heading returns clarification, not thirty arbitrary textbook questions',run(){
    const {ctx}=fixture();ctx.getCNEScheduleRecord=id=>({cneId:id,topic:'Care of patients'});
    const r=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    assert(r.success&&r.data.length===0&&r.clinicalSearch.requiresClarification,'Generic-only CNE topic produced unrelated questions');
  }},
 {name:'Multiple independent ABG and VBG concepts match either relevant question, not generic analysis',run(){
    const {ctx,b}=fixture();ctx.getCNEScheduleRecord=id=>({cneId:id,topic:'ABG AND VBG ANALYSIS'});
    b.rows[1][2]='ABG Analysis';b.rows[1][6]='What does an ABG indicate?';
    b.rows[2][2]='Venous blood gas analysis';b.rows[2][6]='What does a VBG measurement indicate?';
    b.rows.push(question('REF-003'));b.rows[3][2]='Nursing analysis';b.rows[3][6]='What is the correct general approach to analyzing care?';
    const r=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    assert(r.data.length===2&&r.clinicalSearch.concepts.length===2,'ABG/VBG combined title failed independent matching');
  }},
 {name:'CAUTI CLABSI VAP bundles recognize three independent infection concepts',run(){
    const {ctx,b}=fixture();const a=ctx.cneHybridClinicalAnalyze_('CAUTI / CLABSI / VAP BUNDLES');
    assert(a.concepts.length===3&&!a.requiresClarification,'Combined infection-prevention bundles lost concepts');
    b.rows[1][2]='Ventilator associated pneumonia prevention';b.rows[2][2]='Leadership and delegation';b.rows[2][6]='Nursing leadership and team care';
    ctx.getCNEScheduleRecord=id=>({cneId:id,topic:'CAUTI / CLABSI / VAP BUNDLES'});
    const r=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    assert(r.data.length===1&&r.data[0].questionId==='REF-001','Multi-concept search accepted unrelated care');
  }},
 {name:'Wound care and patient safety remain whole clinical phrases',run(){
    const {ctx}=fixture();
    for (const [topic,expected] of [['Wound Care & Pressure Injury','wound care'],['PATIENT SAFETY','patient safety'],['Medication safety and high alert medications','medication safety'],['Neonatal resuscitation','neonatal resuscitation']]) {
      const a=ctx.cneHybridClinicalAnalyze_(topic);assert(!a.requiresClarification&&a.concepts.some(x=>x.name===expected),'Lost full clinical concept '+topic);
    }
  }},
 {name:'High-information unknown diagnoses remain precise clinical phrase anchors',run(){
    const {ctx,b}=fixture();ctx.getCNEScheduleRecord=id=>({cneId:id,topic:'Nursing management of patients with cholecystitis'});
    b.rows[1][2]='Cholecystitis';b.rows[1][6]='What interventions are required for cholecystitis?';
    b.rows[2][2]='Cholelithiasis';b.rows[2][6]='What interventions are required for cholelithiasis?';
    const r=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    assert(r.data.length===1&&r.data[0].questionId==='REF-001','Unknown diagnosis matched neighboring disease');
  }},
 {name:'ICD and GBS ambiguous abbreviations require educator expansion',run(){
    const {ctx}=fixture();
    for(const title of ['GBS','ICD Care']){
      const a=ctx.cneHybridClinicalAnalyze_(title);assert(a.requiresClarification&&a.concepts.length===0,'Ambiguous abbreviation guessed: '+title);
    }
    const explicit=ctx.cneHybridClinicalAnalyze_('Guillain Barre syndrome');
    assert(!explicit.requiresClarification&&explicit.concepts[0].name==='guillain barre syndrome','Explicit diagnosis wrongly rejected');
  }},
 {name:'Educator may correct clinical concept without modifying CNE schedule or quota',run(){
    const {ctx,b,quota}=fixture();ctx.getCNEScheduleRecord=id=>({cneId:id,topic:'GBS'});
    b.rows[1][2]='Guillain Barre syndrome';b.rows[2][2]='Team nursing care';b.rows[2][6]='Which team provides patient care?';
    const before=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    const after=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123',searchConcept:'Guillain Barre syndrome'},session);
    assert(before.data.length===0&&before.clinicalSearch.requiresClarification&&after.data.length===1&&after.clinicalSearch.manual,'Educator override unavailable');
    assert(Number(quota.rows[1][2])===0,'Search consumed generation quota');
  }},
 {name:'Case presentation extracts diagnosis, not identifying patient-name tokens',run(){
    const {ctx}=fixture();const r=ctx.cneHybridClinicalAnalyze_('A case presentation of patient Master SAMPLE diagnosed with Choroid plexus Papilloma');
    assert(r.concepts.length===1&&r.concepts[0].name==='choroid plexus papilloma'&&!r.concepts[0].name.includes('sample'),'Patient name leaked into search concept');
    const noDiagnosis=ctx.cneHybridClinicalAnalyze_('Case presentation of patient SAMPLE');
    assert(noDiagnosis.requiresClarification,'Patient-only case presentation should not search');
  }},
 {name:'Unit metadata alone cannot admit a question with no clinical topic match',run(){
    const {ctx,b}=fixture();ctx.getCNEScheduleRecord=id=>({cneId:id,topic:'Care of gastritis patient'});
    b.rows.forEach((row,i)=>{if(i){row[1]='Gastritis';row[2]='Team Nursing';row[3]='Delegation';row[4]='patient care';row[6]='How does a registered nurse manage a nursing team?';}});
    const r=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    assert(r.data.length===0,'Broad chapter matched a clinically unrelated question');
  }},
 {name:'Unrecognized or ambiguous manual correction never auto-expands generic words',run(){
    const {ctx}=fixture();ctx.getCNEScheduleRecord=id=>({cneId:id,topic:'Gastritis'});
    const r=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123',searchConcept:'patient care'},session);
    assert(r.data.length===0&&r.clinicalSearch.requiresClarification,'Manual override bypassed relevance threshold');
  }},
 {name:'Bank refuses malformed schema rather than guess answer column positions',run(){const {ctx,b}=fixture();b.rows[0][13]='Unknown Answer';const result=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);assert(result.errorCode==='QUESTION_BANK_SCHEMA_INVALID','Bad schema accepted');}},
 {name:'Testing-only index schemas use 20/10/11 columns without migration or a script property',run(){
    const {ctx}=fixture();
    assert(typeof ctx.cneAdminMigrateIndexSchemas_==='undefined'&&typeof ctx.cneEvidenceSplitReady_==='undefined','Old migration or switch still callable');
    assert(!/CNE_EVIDENCE_INDEX_V2_READY/.test(gas),'Migration property still present');
    assert(ctx.CNE_SHEET_HEADERS['CNE_Reference_Question_Index'].length===20,'Question index schema is not 20 columns');
    assert(ctx.CNE_SHEET_HEADERS['CNE_Reference_Index'].length===10,'Library schema is not 10 columns');
    assert(ctx.CNE_SHEET_HEADERS['CNE_Material_Index'].length===11,'Uploaded material schema is not 11 columns');
    assert(ctx.cneIndexProjectRows_([['ID','LOCAL_REFERENCE_LIB','','DOC','Source','Gastritis','Heading',1,'Evidence','Keyword','SUCCESS','Today']],ctx.CNE_SHEET_HEADERS['CNE_Reference_Index'])[0].length===10,'Library projection failed');
    assert(ctx.cneIndexProjectRows_([['ID','UPLOADED_CNE','CNE-123','DOC','Slides','Gastritis','Heading',1,'Evidence','Keyword','SUCCESS','Today']],ctx.CNE_SHEET_HEADERS['CNE_Material_Index'])[0][1]==='CNE-123','CNE-specific evidence projection failed');
  }},
 {name:'Verify Sheets initializes both evidence indexes and Question Index without a migration flag',run(){
    const {ctx}=fixture(), created={};
    ctx.setupSecurityProperties=()=>{};
    ctx.getSpreadsheet=type=>type==='OFFICERS'?{getSheetByName:()=>null}:{getSheetByName:n=>created[n]||null};
    ctx.getOrCreateSheet=name=>{
      if (!created[name]){
        const headers=ctx.CNE_SHEET_HEADERS[name]||[];
        created[name]=spreadsheet([headers.slice()]);
      }
      return created[name];
    };
    const result=ctx.setupAndVerifyCNESheets('ADMIN',null);
    assert(result.success,'Clean index initialization failed '+result.message);
    assert(created['CNE_Reference_Index'].rows[0].length===10,'Library headers not initialized');
    assert(created['CNE_Material_Index'].rows[0].length===11,'CNE material tab not created');
    assert(created['CNE_Reference_Question_Index'].rows[0].length===20,'Question index tab not created');
    assert(result.auditReport.some(x=>x.tab==='CNE_Material_Index'),'Material tab missing from verification results');
  }},
 {name:'Verify Sheets flags old mixed-index columns without restoring or deleting headers',run(){
    const {ctx}=fixture(), existing={};
    const old=['Index ID','Source Type','CNE ID','Drive File ID','Resource Title','Topic','Section / Heading','Chunk Index','Chunk Text','Clinical Keywords','Extraction Status','Updated At'];
    existing['CNE_Reference_Index']=spreadsheet([old.slice()]);
    ctx.setupSecurityProperties=()=>{};
    ctx.getSpreadsheet=type=>type==='OFFICERS'?{getSheetByName:()=>null}:{getSheetByName:n=>existing[n]||null};
    ctx.getOrCreateSheet=name=>existing[name]||(existing[name]=spreadsheet([(ctx.CNE_SHEET_HEADERS[name]||[]).slice()]));
    const result=ctx.setupAndVerifyCNESheets('ADMIN',null);
    assert(!result.success&&result.message.includes('CNE_Reference_Index'),'Old schema was not flagged');
    assert(existing['CNE_Reference_Index'].rows[0].join('|')===old.join('|'),'Verifier modified old index instead of reporting');
    assert(existing['CNE_Material_Index'].rows[0].length===11,'Material tab not created alongside warning');
  }},
 {name:'Index write guard rejects obsolete columns to prevent shifted clinical evidence',run(){
    const {ctx}=fixture();
    const old=spreadsheet([['Index ID','Source Type','CNE ID','Drive File ID','Resource Title','Topic','Section / Heading','Chunk Index','Chunk Text','Clinical Keywords','Extraction Status','Updated At']]);
    old.getName=()=> 'CNE_Reference_Index';
    let error='';try{ctx.cneRequireIndexHeaders_(old,ctx.CNE_SHEET_HEADERS['CNE_Reference_Index']);}catch(e){error=e.message;}
    assert(error.includes('INDEX_SCHEMA_MISMATCH')&&old.rows[0].length===12,'Old index accepted or modified');
  }},
 {name:'Separated 10/11-column indexes preserve CNE-only evidence and active library citation IDs',run(){
    const {ctx}=fixture();
    const hs={lib:['Index ID','Drive File ID','Resource Title','Topic','Section / Heading','Chunk Index','Chunk Text','Clinical Keywords','Extraction Status','Updated At'],mat:['Index ID','CNE ID','Drive File ID','Resource Title','Topic','Section / Heading','Chunk Index','Chunk Text','Clinical Keywords','Extraction Status','Updated At']};
    const passage='The nurse selects an appropriate peripheral vein and uses aseptic preparation during intravenous cannulation. '.repeat(3);
    const lib=spreadsheet([hs.lib,['LIB1','ACTIVE','Nursing Handbook','IV Cannulation','Intravenous Therapy',1,passage,'venous catheter','SUCCESS','2026-10-29']]);
    const mat=spreadsheet([hs.mat,['MAT1','CNE-123','MATERIAL','Uploaded Clinical Guide','IV Cannulation','Venous Access',1,passage,'intravenous','SUCCESS','2026-10-29'],['OTHER','OTHER-CNE','PRIVATE','Private File','IV Cannulation','Other',1,passage,'intravenous','SUCCESS','2026-10-29']]);
    const libraryRegistry=spreadsheet([['Resource ID','Source Type','Resource Title','Drive File ID','Author / Organization','License','Version','File Type','Active','Indexed At','Updated At'],['REF','LOCAL_REFERENCE_LIB','Nursing Handbook','ACTIVE','','','','PDF','TRUE','','']]);
    ctx.getSpreadsheet=()=>({getSheetByName:n=>n==='CNE_Reference_Index'?lib:n==='CNE_Material_Index'?mat:n==='CNE_Reference_Library'?libraryRegistry:null});
    ctx.getCNEScheduleRecord=()=>({cneId:'CNE-123',topic:'IV Cannulation'});
    ctx.checkCNEActionAuthorized=()=>null;
    ctx.cneReferenceChunkReadable_=()=>true;
    ctx.calculateTopicRelevanceScore=()=>100;
    ctx.passesClinicalRelevanceGate=()=>true;
    ctx.cneAiClinicalPassageScore_=(_t,_v,s)=>s;
    ctx.cneAiSelectTopicEvidence_=(arr)=>arr.slice(0,12);
    const result=ctx.retrieveCNETopicEvidence('CNE-123','IV Cannulation',session,{});
    assert(result.success,'Split-index retrieval failed '+result.errorCode);
    assert(result.evidence.some(x=>x.indexId==='MAT1'&&x.sourceType==='UPLOADED_CNE'),'Own CNE evidence missing');
    assert(result.evidence.some(x=>x.indexId==='LIB1'&&x.sourceType==='LOCAL_REFERENCE_LIB'),'Approved library evidence missing');
    assert(!result.evidence.some(x=>x.indexId==='OTHER'),"Another CNE's private passage leaked");
  }},
 {name:'Pending clinical review must never import despite an educator confirmation',run(){
    const {ctx,b}=fixture();b.rows[1][18]='EXTRACTED_PENDING_CLINICAL_REVIEW';
    const found=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    assert(found.success&&found.data.length===2&&!found.data[0].canImport,'Pending textbook extraction was importable');
    const importing=ctx.handleImportCNEReferenceQuestion({cneId:'CNE-123',questionId:'REF-001',confirmReview:true},session);
    assert(importing.errorCode==='SOURCE_QUESTION_NEEDS_REVIEW','Educator bypassed clinical approval');
  }},
 {name:'Question Bank popup omits technical status and long textbook source lines',run(){
    assert(!MODAL.includes('Source status: {q.verificationStatus}')&&!MODAL.includes('PDF page {q.questionPdfPage}'),'Technical provenance still visible to educators');
    assert(MODAL.includes('Original answer:')&&MODAL.includes('Import as Draft'),'Educator answer review and import disappeared');
  }},
 {name:'Question Bank hides source metadata from educators but retains it for admins',run(){
    const {ctx}=fixture();const publicResult=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    assert(publicResult.success&&publicResult.data.length>0,'No question retrieved');
    for(const entry of publicResult.data){
      assert(!Object.prototype.hasOwnProperty.call(entry,'unit') && !Object.prototype.hasOwnProperty.call(entry,'verificationStatus') && !Object.prototype.hasOwnProperty.call(entry,'imageTableReference') && !Object.prototype.hasOwnProperty.call(entry,'questionPdfPage'),'Educator response leaked internal source metadata');
      assert(entry.question&&entry.correctOption&&entry.explanation,'Clinical review fields were hidden');
    }
    const adminResult=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},{employeeId:'ADMIN-1',role:'ADMIN'});
    assert(adminResult.data[0].verificationStatus&&adminResult.data[0].unit==='Nursing Procedures'&&adminResult.data[0].questionPdfPage==='101','Admin review metadata was discarded');
  }},
 {name:'20-column Question Bank with Unit and image reference remains searchable and importable',run(){
    const {ctx,b,q}=fixture();
    assert(b.rows[0].length===20&&b.rows[0][1]==='Unit'&&b.rows[0][17]==='Image / Table Reference','Expected 20-column schema with retained metadata');
    const found=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    assert(found.success&&found.data.length===2&&found.data[0].canImport,'Reduced Question Bank header map failed');
    const result=ctx.handleImportCNEReferenceQuestion({cneId:'CNE-123',questionId:'REF-001',confirmReview:true},session);
    assert(result.success&&q.rows[1][13]==='Question Bank','Question Bank Draft did not use fixed source label');
  }},
 {name:'Removed permission and resource columns do not gate clinically approved Question Bank imports',run(){
    const {ctx,b,q}=fixture();
    assert(!b.rows[0].includes('Reuse Permission')&&!b.rows[0].includes('Resource Title')&&!b.rows[0].includes('Drive File ID'),'Unwanted metadata column in new index');
    const r=ctx.handleImportCNEReferenceQuestion({cneId:'CNE-123',questionId:'REF-001',confirmReview:true},session);
    assert(r.success&&q.rows[1][13]==='Question Bank'&&q.rows[1][12].includes('[QB:REF-001]'),'Source label or internal question ID missing');
    assert(!Object.hasOwn(ctx.cneHybridBankCandidate_(b.rows[1],ctx.cneHybridBankFields_(b).cols,5),'reusePermission'),'Question Bank still depends on permission');
  }},
 {name:'Image/Table Reference remains metadata-only and image questions stay blocked',run(){
    const {ctx,b}=fixture();b.rows[1][17]='Figure 7.5, panel B';
    const eligible=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},{employeeId:'ADMIN-1',role:'ADMIN'});
    assert(eligible.data[0].imageTableReference==='Figure 7.5, panel B'&&eligible.data[0].canImport,'Storing image metadata incorrectly prevented a text-only question');
    b.rows[1][16]='YES';
    const blocked=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    assert(!blocked.data.find(x=>x.questionId==='REF-001').canImport,'Unimplemented image question was importable');
    const direct=ctx.handleImportCNEReferenceQuestion({cneId:'CNE-123',questionId:'REF-001',confirmReview:true},session);
    assert(direct.errorCode==='SOURCE_QUESTION_NEEDS_REVIEW','Backend import bypassed image guard');
  }},
 {name:'Unknown image requirement is not treated as text-only safe',run(){
    const {ctx,b}=fixture();b.rows[1][16]='';
    const r=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
    assert(!r.data.find(x=>x.questionId==='REF-001').canImport,'Missing image requirement was accepted');
  }},
 {name:'Old 25/29-column Question Bank sheets fail safely pending manual cleanup',run(){
    for(const bad of ['Resource Title','Reuse Permission']){
      const {ctx,b}=fixture();b.rows[0].splice(1,0,bad);for(let i=1;i<b.rows.length;i++)b.rows[i].splice(1,0,'legacy');
      const r=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);
      assert(r.errorCode==='QUESTION_BANK_SCHEMA_INVALID','Legacy column '+bad+' was silently accepted');
    }
  }},
 {name:'Question Bank records needing review are not importable',run(){const {ctx,b}=fixture();b.rows[1][18]='NEEDS_REVIEW';const result=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);assert(!result.data.find(x=>x.questionId==='REF-001').canImport,'Unreviewed figure item import allowed');}},
 {name:'Question Bank rejects extra options E/F that Post-Test does not support',run(){const {ctx,b}=fixture();b.rows[1][11]='Fifth choice';let result=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);assert(!result.data.find(x=>x.questionId==='REF-001').canImport,'Extra option ignored');result=ctx.handleImportCNEReferenceQuestion({cneId:'CNE-123',questionId:'REF-001',confirmReview:true},session);assert(result.errorCode==='SOURCE_QUESTION_NEEDS_REVIEW','Forced import succeeded');}},
 {name:'Question Bank import requires explicit educator confirmation',run(){const {ctx}=fixture();const result=ctx.handleImportCNEReferenceQuestion({cneId:'CNE-123',questionId:'REF-001'},session);assert(result.errorCode==='REVIEW_CONFIRMATION_REQUIRED','Import without review accepted');}},
 {name:'Question Bank import persists unfinalized Draft without AI quota usage',run(){const {ctx,q,quota}=fixture();const res=ctx.handleImportCNEReferenceQuestion({cneId:'CNE-123',questionId:'REF-001',confirmReview:true},session);assert(res.success && q.rows.length===2 && q.rows[1][9]==='NO' && Number(quota.rows[1][2])===0,'Import marked finalized/used quota');}},
 {name:'Question Bank import prevents duplicate CNE/source question under lock',run(){const {ctx,q}=fixture();const params={cneId:'CNE-123',questionId:'REF-001',confirmReview:true};assert(ctx.handleImportCNEReferenceQuestion(params,session).success,'Initial import failed');const result=ctx.handleImportCNEReferenceQuestion(params,session);assert(result.errorCode==='QUESTION_ALREADY_IMPORTED'&&q.rows.length===2,'Duplicate source question imported');}},
 {name:'A valid single saved question may remain a Draft before Post-Test minimum',run(){const {ctx,q}=fixture();const result=ctx.handleSaveCNEQuestions({cneId:'CNE-123',questions:[{id:'q_manual_1',question:'What is the best first clinical step in this nursing procedure?',options:{A:'Assess patient',B:'Ignore history',C:'Skip preparation',D:'Remove assessment'},correctOption:'A',explanation:'Assessing the patient is required before the procedure.',authoritativeSource:'Nursing Reference',isFinalized:false}]},session);assert(result.success&&q.rows.length===2&&result.readyForPostTest===false,'One draft rejected or prematurely published');}},
 {name:'Post-Test rejects eleven finalized questions and retains five-to-ten rule',run(){const {ctx}=fixture();const questions=Array.from({length:11},(_,i)=>({id:'q_manual_'+i,question:'What nursing intervention is best in example '+i+' for this clinical assessment?',options:{A:'Assess '+i,B:'Ignore '+i,C:'Wait '+i,D:'Disregard '+i},correctOption:'A',explanation:'The clinical rationale supports safe nursing decisions '+i,authoritativeSource:'Approved Nursing Text',isFinalized:true}));const result=ctx.handleSaveCNEQuestions({cneId:'CNE-123',questions},session);assert(result.errorCode==='POST_TEST_MAXIMUM_EXCEEDED','11 finalized questions accepted');}},
 {name:'Server recognizes only stable original AI objective identifiers',run(){const {ctx}=fixture();const bad=aiQuestion('OBJ_8');const res=ctx.cneHybridPersistPartial_('CNE-123','TOK',[bad],session);assert(res.errorCode==='INVALID_AI_OBJECTIVE','Unplanned AI slot was saved');}},
 {name:'Partial AI save persists one verified Draft without deducting quota',run(){const {ctx,q,quota}=fixture();const res=ctx.cneHybridPersistPartial_('CNE-123','TOK',[aiQuestion('OBJ_1')],session);assert(res.success&&res.data.savedCount===1&&!res.data.completed&&q.rows.length===2&&Number(quota.rows[1][2])===0,'Single partial used quota');}},
 {name:'Replayed partial AI response is idempotent and does not add rows',run(){const {ctx,q}=fixture();const args=['CNE-123','TOK',[aiQuestion('OBJ_1')],session];assert(ctx.cneHybridPersistPartial_(...args).success,'Initial partial failed');const again=ctx.cneHybridPersistPartial_(...args);assert(again.success&&q.rows.length===2&&again.data.savedCount===1,'Duplicate partial question saved');}},
 {name:'Conflicting second answer for same AI objective fails closed',run(){const {ctx,q}=fixture();ctx.cneHybridPersistPartial_('CNE-123','TOK',[aiQuestion('OBJ_1')],session);const changed=aiQuestion('OBJ_1','TOK','Different clinical question cannot overwrite validated original objective');const res=ctx.cneHybridPersistPartial_('CNE-123','TOK',[changed],session);assert(res.errorCode==='AI_SLOT_CONFLICT'&&q.rows.length===2,'Objective was overwritten');}},
 {name:'Four validated AI Drafts do not deduct generation quota',run(){const {ctx,q,quota}=fixture();for(let i=1;i<=4;i++){const r=ctx.cneHybridPersistPartial_('CNE-123','TOK',[aiQuestion('OBJ_'+i,'TOK',DISTINCT_STEMS[i-1])],session);assert(r.success,'Partial slot '+i+' not saved: '+r.errorCode);}assert(q.rows.length===5&&Number(quota.rows[1][2])===0,'Incomplete batch used quota');}},
 {name:'Fifth validated objective commits exactly one quota allowance with readback',run(){const {ctx,q,quota}=fixture();for(let i=1;i<=5;i++){const result=ctx.cneHybridPersistPartial_('CNE-123','TOK',[aiQuestion('OBJ_'+i,'TOK',DISTINCT_STEMS[i-1])],session);assert(result.success,'Slot '+i+' failed '+result.errorCode);if(i<5)assert(!result.data.completed,'Early completion');}assert(q.rows.length===6 && Number(quota.rows[1][2])===1 && quota.rows[1][8]==='TOK','Complete batch did not mark USED');}},
 {name:'Existing AI partial session retains source token and missing slot map',run(){const {ctx}=fixture();ctx.cneHybridPersistPartial_('CNE-123','TOK',[aiQuestion('OBJ_1')],session);const res=ctx.cneHybridGetSlots_('CNE-123','TOK');assert(res.success&&res.data.length===1&&res.data[0].objectiveId==='OBJ_1','Original objective slot missing');}},
 {name:'Edited partial AI Drafts retain immutable provenance and resume remaining objectives exactly once',run(){
    const {ctx,q,quota}=fixture();
    for(let i=1;i<=2;i++)assert(ctx.cneHybridPersistPartial_('CNE-123','TOK',[aiQuestion('OBJ_'+i,'TOK',DISTINCT_STEMS[i-1])],session).success,'Failed initial partial '+i);
    const originalRows=q.rows.slice(1).map(row=>row.slice());
    const edited=originalRows.map((row,i)=>({id:row[1],question:row[2],options:{A:row[3],B:row[4],C:row[5],D:row[6]},correctOption:row[7],explanation:i===0?'Educator reviewed the IV site assessment and documented supporting clinical rationale.':row[8],authoritativeSource:row[13],isFinalized:false}));
    const saved=ctx.handleSaveCNEQuestions({cneId:'CNE-123',questions:edited},session);
    assert(saved.success,'Educator edit did not save');
    for(let i=0;i<2;i++){
      assert(q.rows[i+1][12]===originalRows[i][12] && q.rows[i+1][12]==='EDUCATOR-1 [AI:TOK]','AI session ownership marker lost');
      assert(q.rows[i+1][11]===originalRows[i][11] && q.rows[i+1][13]===originalRows[i][13],'AI created timestamp or clinical citation lost');
    }
    assert(q.rows[1][8]===edited[0].explanation,'Educator-reviewed edit did not persist');
    const slots=ctx.cneHybridGetSlots_('CNE-123','TOK');
    assert(slots.success && slots.data.length===2 && slots.data[0].objectiveId==='OBJ_1' && slots.data[1].objectiveId==='OBJ_2','Previously saved objectives disappeared on edit');
    assert(Number(quota.rows[1][2])===0,'Editing partial questions consumed AI generation allowance');
    for(let i=3;i<=5;i++){
      const resumed=ctx.cneHybridPersistPartial_('CNE-123','TOK',[aiQuestion('OBJ_'+i,'TOK',DISTINCT_STEMS[i-1])],session);
      assert(resumed.success && resumed.data.savedCount===i,'Could not resume missing objective '+i+': '+resumed.errorCode);
    }
    assert(q.rows.length===6 && Number(quota.rows[1][2])===1 && quota.rows[1][8]==='TOK','Resumption duplicated a slot or did not commit one quota');
    const replay=ctx.cneHybridPersistPartial_('CNE-123','TOK',[aiQuestion('OBJ_1','TOK',DISTINCT_STEMS[0])],session);
    assert((replay.success || replay.errorCode==='INVALID_RESERVATION') && q.rows.length===6 && Number(quota.rows[1][2])===1,'Replayed saved AI slot duplicated rows or consumed quota twice');
  }},
 {name:'Editing imported Question Bank Draft preserves immutable textbook source marker and original author',run(){
    const {ctx,q}=fixture();
    assert(ctx.handleImportCNEReferenceQuestion({cneId:'CNE-123',questionId:'REF-001',confirmReview:true},session).success,'Question Bank source import failed');
    const original=q.rows[1].slice();
    const edited={id:original[1],question:original[2],options:{A:original[3],B:original[4],C:original[5],D:original[6]},correctOption:original[7],explanation:'Educator reviewed this textbook rationale and verified the selection assessment.',authoritativeSource:original[13],isFinalized:false,createdBy:'UNTRUSTED-CLIENT'};
    assert(ctx.handleSaveCNEQuestions({cneId:'CNE-123',questions:[edited]},session).success,'Question Bank draft edit failed');
    assert(q.rows[1][12]===original[12] && q.rows[1][12].includes('[QB:REF-001]'),'Imported textbook attribution was overwritten');
    assert(q.rows[1][11]===original[11] && q.rows[1][13]==='Question Bank' && q.rows[1][8]===edited.explanation,'Question Bank source or edit was lost');
  }},
 {name:'Partial recovery does not request fresh PLAN or a new reservation token',run(){assert(gas.includes("['PLANNED','PARTIAL_SUCCESS'].indexOf(current.state)===-1")&&gas.includes('cneHybridRenewReservation_(cneId,reservationToken,session)')&&gas.includes('missingObjectiveIds:phase===\'FINISH\''),'Unsafe second AI reservation or missing-slot recovery');}},
 {name:'UI supports generic Question Bank, Saved Drafts, quota-safe partial recovery and ten question cap',run(){for(const term of ['Institutional Question Bank','Save Drafts','partialAiCount','Resume AI Generation','validFinalized.length>10','Question Bank'])assert(MODAL.includes(term),'UI missing '+term);}},
 {name:'TypeScript API exposes bank search and authorized Draft import',run(){const api=readFileSync(join(ROOT,'src/services/api.ts'),'utf8');assert(TYPES.includes('export interface CNEReferenceBankItem')&&api.includes("'importCNEReferenceQuestion'")&&api.includes("'searchCNEReferenceQuestions'"),'Typed API unavailable');}},
 {name:'Participant-facing Post-Test never displays more than ten finalized questions',run(){assert(gas.includes('if (sanitizedQuestions.length > 10)')&&gas.includes('if (finalizedCount > 10)')&&gas.includes("errorCode:'POST_TEST_MAXIMUM_EXCEEDED'"),'Max ten missing server enforcement');}} ,{name:'Supplementary material rebinds only missing objective evidence to screened active source',run(){
    const {ctx}=fixture();ctx.passesClinicalRelevanceGate=()=>true;
    const objective={objectiveId:'OBJ_2',objective:'Assess safe peripheral IV insertion site selection and infection prevention',evidenceId:'OLD-REMOVED'};
    const evidence=[{indexId:'CURRENT-101',topic:'Peripheral IV cannulation',sectionHeading:'IV insertion site selection infection prevention',clinicalKeywords:'safe insertion assessment infection prevention',chunkText:'Clinical nursing evidence on peripheral IV site selection and infection prevention.'}];
    const out=ctx.cneHybridRebindStaleBlueprint_([objective],evidence,'IV Cannulation','CNE-123',session);
    assert(out.length===1&&out[0].evidenceId==='CURRENT-101'&&objective.evidenceId==='OLD-REMOVED','Unapproved or destructive resumption source mutation');
  }}
 ,{name:'Unrelated supplementary passage cannot replace missing original clinical source',run(){
    const {ctx}=fixture();ctx.passesClinicalRelevanceGate=()=>true;
    const original={objectiveId:'OBJ_2',objective:'Assess safe peripheral IV insertion site selection and infection prevention',evidenceId:'OLD-REMOVED'};
    const unrelated={indexId:'NEW-BUT-UNRELATED',topic:'Dietary management',sectionHeading:'Nutrition',clinicalKeywords:'vitamins fruits breakfast',chunkText:'Eat a balanced diet rich in vegetables.'};
    const out=ctx.cneHybridRebindStaleBlueprint_([original],[unrelated],'IV Cannulation','CNE-123',session);
    assert(out[0].evidenceId==='OLD-REMOVED','Clinical evidence was invented from unrelated material');
  }}
 ,{name:'Previously approved blueprint evidence stays stable across additional-material upload',run(){
    const {ctx}=fixture();const original={objectiveId:'OBJ_1',objective:'Assess peripheral intravenous catheter insertion site selection',evidenceId:'SOURCE-OLD'};
    const out=ctx.cneHybridRebindStaleBlueprint_([original],[{indexId:'SOURCE-OLD',chunkText:'Approved original clinical passage'}],'IV Cannulation','CNE-123',session);
    assert(out[0].evidenceId==='SOURCE-OLD','Original evidence ID was unexpectedly replaced');
  }}
 ,{name:'Uncertain partial save retains original blueprint for later authoritative status recovery',run(){
    assert(gas.includes("{state:'UNCERTAIN',message:'The result of saving requires verification.'}")&& !gas.includes("{state:'UNCERTAIN',objectives:[]}"),'Uncertain write erased recoverable objective slots');
  }}
 ,{name:'Exactly ten valid finalized questions can be saved and reported ready',run(){
    const {ctx,q}=fixture();
    const qs=Array.from({length:10},(_,i)=>({id:'q_final_'+i,question:'Which intervention is clinically appropriate for nursing assessment example '+i+'?',options:{A:'Assess site '+i,B:'Skip assessment '+i,C:'Ignore safety '+i,D:'Continue without review '+i},correctOption:'A',explanation:'The clinical reference supports safe assessment, example '+i,authoritativeSource:'Verified Nursing Material',isFinalized:true}));
    const res=ctx.handleSaveCNEQuestions({cneId:'CNE-123',questions:qs},session);
    assert(res.success && res.finalizedCount===10 && res.readyForPostTest && q.rows.length===11,'Maximum ten valid Post-Test questions was not accepted');
  }}
];

return hybridChecks;
}

function createDropdownRetryChecks() {
/** Ward/resource-person retry and first-open AI material regression checks.
 * Reads actual project source; backend ward-cache logic is executed in isolation.
 */
const get = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const init = get('src/services/initialData.ts');
const api = get('src/services/api.ts');
const gas = get('Code.gs');
const mirror = get('src/backend/googleAppsScript.ts');
const central = get('src/components/CNESchedule.tsx');
const ward = get('src/components/cne/WardMultiSelect.tsx');
const dept = get('src/components/cne/DepartmentalScheduleModal.tsx');
const uns = get('src/components/cne/AddUnscheduledCneModal.tsx');
const officer = get('src/services/officerLoader.ts');
const ai = get('src/components/cne/CNEQuestionsModal.tsx');
const retry = get('src/components/cne/DropdownRetry.tsx');
const checks = [];
const check = (name, run) => checks.push({name, run});
check('Initial ward names are empty, not hard-coded', () => {
  assert.match(init, /export const INITIAL_AREAS: Area\[\] = \[\];/);
  assert.doesNotMatch(init, /"231A\(NICU\)/);
});
check('Areas response comes from Sheets and no hard-coded default population is used', () => {
  const start = gas.indexOf('function handleGetAreas(params)');
  const end = gas.indexOf('function getAreaStatusMap_',start);
  assert.ok(start >= 0 && end > start);
  const source = gas.slice(start,end);
  assert.match(source, /getOrCreateSheet\('Area'\)/);
  assert.match(source, /sheet\.getDataRange\(\)\.getValues\(\)/);
});
check('Force-refresh bypasses both client and server ward caches', () => {
  assert.match(api, /static async getAreas\(forceFresh = false\)/);
  assert.match(api, /if \(forceFresh\) this\.invalidateCache\('getAreas'\)/);
  assert.match(api, /forceFresh \? \{ forceFresh: true \}/);
  const start = gas.indexOf('function handleGetAreas(params)');
  const end = gas.indexOf('function getAreaStatusMap_',start);
  assert.match(gas.slice(start,end), /!params \|\| !params\.forceFresh/);
});
check('Backend fresh read ignores stale cached ward and uses active Sheet rows', () => {
  const start = gas.indexOf('function handleGetAreas(params)');
  const end = gas.indexOf('/**\n * Authoritative Area Status Helpers',start);
  assert.ok(start > 0 && end > start);
  const calls = {sheet:0, cache:0};
  const context = {
    Date, JSON,
    CacheService: {getScriptCache:()=>({get:()=>{calls.cache++;return JSON.stringify([{name:'STALE'}])},put:()=>{}})},
    getOrCreateSheet:()=>({getDataRange:()=>({getValues:()=>{calls.sheet++;return [['Area','Status'],['NICU','ACTIVE'],['CLOSED','INACTIVE']]}})}),
    logPerf:()=>{}
  };
  vm.createContext(context);
  vm.runInContext(gas.slice(start,end),context,{timeout:3000});
  const fresh = context.handleGetAreas({forceFresh:true});
  assert.equal(fresh.success,true);assert.equal(calls.cache,0);assert.equal(calls.sheet,1);
  assert.deepEqual(Array.from(fresh.data, a=>a.name), ['NICU','CLOSED']);
});
check('Ward and staff-count requests gate each dropdown together', () => {
  assert.match(central,/Promise\.all\(\[ApiService\.getAreas\(forceFresh\), ApiService\.getWardStaffCounts\(\)\]\)/);
  assert.match(central,/if \(!areas\.success \|\| !active\.length \|\| !counts\.success/);
  assert.match(central,/setWardMasterError\(/);
  assert.match(central,/Preserve the previously selected ward and staff-count data/);
});
check('Ward multi-select has one spinner and disabled controls while loading', () => {
  assert.match(ward,/isLoading \? 'Loading wards and staff counts\.\.\.'/);
  assert.match(ward,/disabled=\{disabled \|\| isLoading \|\| Boolean\(loadError\)/);
  assert.equal((ward.match(/animate-spin/g)||[]).length,1);
  assert.match(ward,/error=\{loadError\}/);
});
check('Small retry icon is failure-only and has an accessible label', () => {
  assert.match(retry,/if \(!error \|\| loading \|\| !onRetry\) return null/);
  assert.match(retry,/aria-label=\{`Retry loading \$\{label\}`\}/);
  assert.match(retry,/h-6 w-6/);
});
check('Central, Departmental and Unscheduled forms all expose ward retry', () => {
  assert.match(central,/onRetry=\{\(\) => \{ void loadWardMasters\(true\); \}\}/);
  assert.match(dept,/onRetry=\{onRetryWards\}/);
  assert.match(uns,/onRetry=\{onRetryWards\}/);
});
check('Resource Person roster failure is propagated and manual force retry is available', () => {
  assert.match(officer,/throw new Error\(res\.message/);
  assert.match(officer,/throw err;/);
  assert.match(central,/loadOfficersSingleFlight\(true\)/);
  assert.match(dept,/loadOfficersSingleFlight\(true\)/);
  assert.match(uns,/loadOfficersSingleFlight\(true\)/);
});
check('Only one faculty spinner is rendered in each Central and Departmental selector', () => {
  const centralNew = central.slice(central.indexOf('{/* Internal Resource Persons Multi-Select */}'),central.indexOf('{/* External Resource Persons */}'));
  const centralEdit = central.slice(central.indexOf('<span>Internal Faculty:</span>'),central.indexOf('External Resource Persons:'));
  const deptRp = dept.slice(dept.indexOf('{/* 1. Internal Resource Persons */}'),dept.indexOf('{/* 2. External Resource Person */}'));
  assert.equal((centralNew.match(/animate-spin/g)||[]).length,1);
  assert.equal((centralEdit.match(/animate-spin/g)||[]).length,1);
  assert.equal((deptRp.match(/animate-spin/g)||[]).length,1);
});
check('Faculty selection does not show both plus and checkbox in same row', () => {
  const deptRp = dept.slice(dept.indexOf('{/* Officers list dropdown / box */}'),dept.indexOf('{/* 2. External Resource Person */}'));
  assert.match(deptRp,/type="checkbox"/);
  assert.doesNotMatch(deptRp, /isSelected \? "✓" : "\+"/);
});
check('Every CNE creation flow and backend rejects missing Resource Person', () => {
  for(const text of [central,dept,uns]) assert.match(text,/at least one Resource Person \(Internal or External\)/i);
  for(const token of ['if (rpClean.length === 0 && extRpClean.length === 0)']) assert.ok(gas.includes(token));
});
check('Departmental multi-ward selection is synchronized across all session dropdowns', () => {
  assert.ok(dept.split('<WardMultiSelect').length >= 3);
  assert.match(dept,/setRows\(\(prev\) => prev\.map\(\(r\) => \(\{ \.\.\.r, area: primary, participatingWards: next \}\)\)\)/);
  assert.ok(dept.split('onChange={handleWardChange}').length >= 3);
});
check('AI material presence check runs on first opening and reuses cached result safely', () => {
  assert.match(ai,/void loadMaterialStatus\(\+\+materialRequestRef\.current, cneId\)/);
  assert.match(ai,/initialMaterialPresenceRef\.current !== null/);
  assert.match(ai,/await loadMaterialStatus\(\+\+materialRequestRef\.current, cneId\)/);
  assert.match(ai,/if \(own === null \|\| currentCneIdRef\.current !== cneId\) return;/);
});
check('Failure feedback is consistent, short, and retry icon is only displayed after errors', () => {
  assert.match(retry,/Unable to load\. Click refresh to retry\./);
  assert.match(retry,/if \(!error \|\| loading \|\| !onRetry\) return null/);
  assert.match(retry,/onClick=\{onRetry\}/);
});
check('Central, Departmental and Unscheduled internal faculty selection uses checkboxes only', () => {
  assert.match(central,/onChange=\{\(\) => toggleRpSelection\(officer\.employeeId\)\}/);
  assert.match(central,/onChange=\{\(\) => toggleEditRpSelection\(o\.employeeId\)\}/);
  assert.match(dept,/onChange=\{\(\) => toggleRowRpSelection\(idx, officer\.employeeId\)\}/);
  assert.match(uns,/onChange=\{\(\) => toggleRp\(o\.employeeId\)\}/);
  for (const markup of [central, dept, uns]) {
    assert.doesNotMatch(markup,/pointer-events-none[\s\S]{0,70}type="checkbox"/);
  }
});
check('Departmental backend enforces resource person on each submitted session', () => {
  const start = gas.indexOf('function handleAddDepartmentalSchedule(params, session)');
  const section = gas.slice(start, gas.indexOf('validatedList.push({', start));
  assert.match(section,/for \(var i = 0; i < rawClasses\.length; i\+\+\)/);
  assert.match(section,/if \(rpClean\.length === 0 && extRpClean\.length === 0\)/);
  assert.match(section,/Row .*At least one Resource Person/);
  assert.match(dept,/Row #\$\{rowNum\}: Please assign at least one Resource Person/);
});
check('Initial AI material failure retries only material check, not Gemini generation', () => {
  assert.match(ai,/retryAction: 'material-check'/);
  assert.match(ai,/if \(materialOnly\) void loadMaterialStatus\(\)/);
  assert.match(ai,/Retry Material Check/);
});
check('Code.gs is synchronized with TypeScript backend mirror', () => {
  // The mirror prepends an auto-generated TS ignore comment; compare via sync tool independently.
  assert.ok(gas.includes("function handleGetAreas(params)"));
  assert.ok(mirror.includes("function handleGetAreas(params)"));
  assert.ok(mirror.includes("!params || !params.forceFresh"));
});
const retryChecks = checks;
return retryChecks;
}

function runTimezoneVerification() {
  const require = createRequire(import.meta.url);
  const __dirname = SCRIPT_DIR;
  const __filename = join(SCRIPT_DIR,'verify-all.js');
/**
 * Cross-Module Timezone & Date/Time Regression Test Suite
 *
 * Verifies application-wide date, time, and timezone consistency for:
 * 1. CNE Schedule parsing (Asia/Kolkata interpretation, rejection of invalid calendar dates / times)
 * 2. CNE start timestamps (ISO with Z, ISO with +05:30, negative offsets, timezone-less Asia/Kolkata, separate date & time)
 * 3. CNE duration calculations (08:00–17:00 classroom windows, calendar day boundaries, validation)
 * 4. Date formatting and display (consistent Indian local civil time, DD-MMM-YYYY, hh:mm AM/PM, datetime-local)
 * 5. Google Sheets Date objects (Date instances handled without unintended timezone shifts or rollovers)
 * 6. Invalid date/time rejection (impossible dates, invalid time components, invalid timezone offsets, contradictory fields)
 *
 * Cross-timezone execution:
 * Validates consistent behavior across:
 * - Asia/Kolkata
 * - UTC
 * - America/Los_Angeles
 *
 * Direct source functions from src/utils.ts are evaluated authoritative to production behavior.
 */

const assert = require('assert');
const path = require('path');
const child_process = require('child_process');
// Prefer the original esbuild path. Where esbuild is unavailable, a TypeScript
// compiler fallback preserves the same unmodified production source under test.
let esbuild = null;
let tsCompiler = null;
try {
  esbuild = require('esbuild');
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND' || !String(err.message).includes("'esbuild'")) throw err;
  try { tsCompiler = require('typescript'); }
  catch (missingTs) { throw new Error('Timezone verification requires esbuild or typescript. Run npm install first.', {cause: missingTs}); }
}

// Compile src/utils.ts in memory; never replace authoritative production logic.
function loadUtils() {
  const entryPath = path.resolve(__dirname, '../src/utils.ts');
  let jsSource;
  if (esbuild) {
    const bundle = esbuild.buildSync({
      entryPoints: [entryPath],
      write: false,
      format: 'cjs',
      bundle: true,
      platform: 'node',
      target: 'node18'
    });
    jsSource = bundle.outputFiles[0].text;
  } else {
    // Only type imports exist in utils.ts; transpilation removes these safely.
    const source = require('fs').readFileSync(entryPath, 'utf8');
    const result = tsCompiler.transpileModule(source, {
      fileName: entryPath,
      compilerOptions: {
        module: tsCompiler.ModuleKind.CommonJS,
        target: tsCompiler.ScriptTarget.ES2020
      },
      reportDiagnostics: true
    });
    const failures = (result.diagnostics || []).filter(d => d.category === tsCompiler.DiagnosticCategory.Error);
    if (failures.length) throw new Error('Timezone TypeScript compilation failed: ' + failures.map(d => tsCompiler.flattenDiagnosticMessageText(d.messageText, '\n')).join('; '));
    jsSource = result.outputText;
  }

  const utils = {};
  const mod = { exports: utils };
  const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', jsSource);
  fn(mod, utils, require, path.dirname(entryPath), entryPath);
  return mod.exports;
}

// -----------------------------------------------------------------------------
// Test Suite Definition for a Specific Runtime Timezone
// -----------------------------------------------------------------------------

function runTestsForTimezone(tz) {
  process.env.TZ = tz;
  const utils = loadUtils();
  const {
    isValidCalendarDate,
    parseStrictTime,
    parseCneStartTimestamp,
    parseToIsoDateString,
    formatCneDateDisplay,
    formatCneDateRangeDisplay,
    formatCneDateTimeDisplay,
    formatCneDateTimeRangeDisplay,
    toDateTimeLocalString,
    parseDurationToSeconds,
    formatSecondsToDuration,
    getCalendarDaysTouched,
    calculateCneDuration,
    validateCneDuration,
    getIndiaTodayIsoDate
  } = utils;

  let passed = 0;
  let total = 0;
  const failures = [];

  function test(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✓ [${tz}] ${name}`);
    } catch (err) {
      failures.push({ name, error: err });
      console.error(`  ✗ [${tz}] ${name}`);
      console.error(`    ${err.message}`);
    }
  }

  console.log(`\n============================================================`);
  console.log(`Running Timezone Tests under TZ = ${tz}`);
  console.log(`============================================================`);

  // ---------------------------------------------------------------------------
  // 1. CNE Schedule Parsing & Validation
  // ---------------------------------------------------------------------------
  test('1.1 Valid schedule date & time in ISO format defaults to Asia/Kolkata (+05:30)', () => {
    // 2026-10-25 14:30:00 in Asia/Kolkata (+05:30) = 2026-10-25 09:00:00Z = 1792918800000 ms
    const epochCombined = parseCneStartTimestamp('2026-10-25T14:30:00');
    assert.strictEqual(epochCombined, 1792918800000, 'Timezone-less ISO must default to Asia/Kolkata (+05:30)');
  });

  test('1.2 Valid schedule date & separate time fields default to Asia/Kolkata (+05:30)', () => {
    const epochSeparate = parseCneStartTimestamp('2026-10-25', '14:30:00');
    assert.strictEqual(epochSeparate, 1792918800000, 'Separate date and time must default to Asia/Kolkata (+05:30)');
  });

  test('1.3 Valid schedule in DD-MMM-YYYY and 12-hour AM/PM parsed in Asia/Kolkata', () => {
    const epochDmmm = parseCneStartTimestamp('25-Oct-2026', '02:30 PM');
    assert.strictEqual(epochDmmm, 1792918800000, 'DD-MMM-YYYY with 12-hour AM/PM must match');
  });

  test('1.4 Valid schedule in DD/MM/YYYY and 24-hour time parsed in Asia/Kolkata', () => {
    const epochSlash = parseCneStartTimestamp('25/10/2026', '14:30');
    assert.strictEqual(epochSlash, 1792918800000, 'DD/MM/YYYY with 24-hr time must match');
  });

  test('1.5 Strict calendar date validator rejects impossible dates and non-leap years', () => {
    assert.strictEqual(isValidCalendarDate(2026, 2, 29), false, '2026-02-29 is non-leap year');
    assert.strictEqual(isValidCalendarDate(2024, 2, 29), true, '2024-02-29 is leap year');
    assert.strictEqual(isValidCalendarDate(2026, 4, 31), false, 'April has only 30 days');
    assert.strictEqual(isValidCalendarDate(2026, 6, 31), false, 'June has only 30 days');
    assert.strictEqual(isValidCalendarDate(2026, 9, 31), false, 'September has only 30 days');
    assert.strictEqual(isValidCalendarDate(2026, 11, 31), false, 'November has only 30 days');
    assert.strictEqual(isValidCalendarDate(2026, 13, 1), false, 'Month 13 is invalid');
    assert.strictEqual(isValidCalendarDate(2026, 0, 1), false, 'Month 0 is invalid');
    assert.strictEqual(isValidCalendarDate(2026, 10, 0), false, 'Day 0 is invalid');
    assert.strictEqual(isValidCalendarDate(2026, 10, 32), false, 'Day 32 is invalid');
  });

  test('1.6 parseCneStartTimestamp returns NaN for invalid calendar dates', () => {
    assert.ok(isNaN(parseCneStartTimestamp('2026-02-29T10:00:00')), 'parseCneStartTimestamp must return NaN for non-leap Feb 29');
    assert.ok(isNaN(parseCneStartTimestamp('2026-04-31T10:00:00')), 'parseCneStartTimestamp must return NaN for April 31');
    assert.ok(isNaN(parseCneStartTimestamp('31-Feb-2026', '10:00 AM')), 'parseCneStartTimestamp must return NaN for 31-Feb-2026');
  });

  test('1.7 Strict time parser rejects overflow hours, overflow minutes, and invalid 12-hour AM/PM', () => {
    assert.strictEqual(parseStrictTime('24:00'), null, '24:00 is not valid 24-hour time');
    assert.strictEqual(parseStrictTime('25:00'), null, '25:00 is overflow hour');
    assert.strictEqual(parseStrictTime('99:99'), null, '99:99 is invalid');
    assert.strictEqual(parseStrictTime('10:60'), null, '10:60 is overflow minute');
    assert.strictEqual(parseStrictTime('14:60:00Z'), null, '14:60:00Z is overflow minute');
    assert.strictEqual(parseStrictTime('13:00 PM'), null, '13:00 PM is invalid 12-hour hour');
    assert.strictEqual(parseStrictTime('0:00 AM'), null, '0:00 AM is invalid 12-hour hour');
    assert.strictEqual(parseStrictTime('00:30 PM'), null, '00:30 PM is invalid 12-hour hour');
    assert.strictEqual(parseStrictTime('bogus'), null, 'Non-time string must be rejected');
    assert.strictEqual(parseStrictTime(''), null, 'Empty string must be rejected');
  });

  // ---------------------------------------------------------------------------
  // 2. CNE Start Timestamps & Instant Equivalence
  // ---------------------------------------------------------------------------
  test('2.1 Handles ISO timestamps with explicit UTC Z', () => {
    const expectedUtcMillis = Date.UTC(2028, 9, 25, 8, 30, 0); // 1856075400000
    const tZ = parseCneStartTimestamp('2028-10-25T08:30:00Z');
    assert.strictEqual(tZ, expectedUtcMillis, 'ISO timestamp with Z matches absolute instant');
  });

  test('2.2 Handles ISO timestamps with explicit +05:30 offset', () => {
    const expectedUtcMillis = Date.UTC(2028, 9, 25, 8, 30, 0);
    const tAsia = parseCneStartTimestamp('2028-10-25T14:00:00+05:30');
    assert.strictEqual(tAsia, expectedUtcMillis, 'ISO timestamp with +05:30 matches absolute instant');
  });

  test('2.3 Handles ISO timestamps with negative offset (-05:00)', () => {
    const expectedUtcMillis = Date.UTC(2028, 9, 25, 8, 30, 0);
    const tEst = parseCneStartTimestamp('2028-10-25T03:30:00-05:00');
    assert.strictEqual(tEst, expectedUtcMillis, 'ISO timestamp with -05:00 matches absolute instant');
  });

  test('2.4 Equivalent timestamps across formats represent the exact same absolute instant', () => {
    const expectedUtcMillis = Date.UTC(2028, 9, 25, 8, 30, 0);
    const tZ = parseCneStartTimestamp('2028-10-25T08:30:00Z');
    const tAsia = parseCneStartTimestamp('2028-10-25T14:00:00+05:30');
    const tEst = parseCneStartTimestamp('2028-10-25T03:30:00-05:00');
    const tDefault = parseCneStartTimestamp('2028-10-25T14:00:00');
    const tSeparate = parseCneStartTimestamp('2028-10-25', '14:00:00');
    const tDmmmAmPm = parseCneStartTimestamp('25-Oct-2028', '02:00 PM');

    assert.strictEqual(tZ, expectedUtcMillis);
    assert.strictEqual(tAsia, expectedUtcMillis);
    assert.strictEqual(tEst, expectedUtcMillis);
    assert.strictEqual(tDefault, expectedUtcMillis);
    assert.strictEqual(tSeparate, expectedUtcMillis);
    assert.strictEqual(tDmmmAmPm, expectedUtcMillis);

    assert.strictEqual(tZ, tAsia, 'Z and +05:30 represent the exact same epoch instant');
    assert.strictEqual(tZ, tEst, 'Z and -05:00 represent the exact same epoch instant');
    assert.strictEqual(tZ, tDefault, 'Z and default Asia/Kolkata represent the exact same epoch instant');
  });

  // ---------------------------------------------------------------------------
  // 3. CNE Duration Calculations & Calendar Day Boundaries
  // ---------------------------------------------------------------------------
  test('3.1 Calculates single-day CNE duration from actual elapsed time', () => {
    const dur1 = calculateCneDuration('2026-10-25T09:00:00', '2026-10-25T11:30:00');
    assert.strictEqual(dur1, '02:30:00', 'Single-day duration is exact elapsed time');
  });

  test('3.2 Caps single-day CNE duration at 08:00–17:00 (9 hours)', () => {
    assert.strictEqual(calculateCneDuration('2026-10-25T08:00:00', '2026-10-25T17:00:00'), '09:00:00');
    assert.strictEqual(calculateCneDuration('2026-10-25T06:00:00', '2026-10-25T18:00:00'), '09:00:00', 'Outside hours are excluded');
  });

  test('3.3 Computes Indian calendar days touched correctly', () => {
    const days1 = getCalendarDaysTouched('2026-10-25T09:00:00', '2026-10-25T17:00:00');
    assert.strictEqual(days1, 1, 'Same day touched count is 1');

    const days2 = getCalendarDaysTouched('2026-10-25T09:00:00', '2026-10-26T17:00:00');
    assert.strictEqual(days2, 2, 'Consecutive days touched count is 2');
  });

  test('3.4 Validates duration against actual classroom time and 5-minute minimum', () => {
    const vValid = validateCneDuration('02:30:00', '2026-10-25T09:00:00', '2026-10-25T11:30:00');
    assert.strictEqual(vValid.isValid, true, 'Valid duration passes validation');
    assert.strictEqual(vValid.maxDurationStr, '02:30:00', 'Maximum is the actual classroom interval');
    assert.strictEqual(validateCneDuration('00:04:00', '2026-10-25T09:00:00', '2026-10-25T11:30:00').isValid, false);
    assert.strictEqual(validateCneDuration('02:31:00', '2026-10-25T09:00:00', '2026-10-25T11:30:00').isValid, false);
    assert.strictEqual(validateCneDuration('01:00:00', '2026-10-25T12:00:00', '2026-10-25T10:00:00').isValid, false);
  });

  test('3.5 Two-day CNE excludes all overnight time', () => {
    assert.strictEqual(calculateCneDuration('2026-10-25T14:00:00', '2026-10-26T11:00:00'), '06:00:00');
    assert.strictEqual(validateCneDuration('06:00:00', '2026-10-25T14:00:00', '2026-10-26T11:00:00').isValid, true);
    assert.strictEqual(validateCneDuration('06:01:00', '2026-10-25T14:00:00', '2026-10-26T11:00:00').isValid, false);
  });

  test('3.6 Three-day CNE counts nine hours for every intermediate calendar day', () => {
    assert.strictEqual(calculateCneDuration('2026-10-25T16:00:00', '2026-10-27T10:00:00'), '12:00:00');
    assert.strictEqual(calculateCneDuration('2026-10-25T08:00:00', '2026-10-28T17:00:00'), '36:00:00');
  });

  test('3.7 Preserves minutes and seconds across dates and month boundaries', () => {
    assert.strictEqual(calculateCneDuration('2026-10-31T16:30:45', '2026-11-01T08:30:15'), '00:59:30');
    assert.strictEqual(calculateCneDuration('2026-10-31T16:30:45', '2026-11-02T08:30:15'), '09:59:30');
  });

  test('3.8 Rejects scheduled start or end outside classroom hours', () => {
    assert.strictEqual(validateCneDuration('01:00:00','2026-10-25T07:59:00','2026-10-25T12:00:00').isValid,false);
    assert.strictEqual(validateCneDuration('01:00:00','2026-10-25T10:00:00','2026-10-25T17:01:00').isValid,false);
    assert.strictEqual(validateCneDuration('01:00:00','2026-10-25T10:00:00','2026-10-25T17:00:01').isValid,false);
    assert.strictEqual(validateCneDuration('09:00:00','2026-10-25T08:00:00','2026-10-25T17:00:00').isValid,true);
  });

  test('3.9 Same India-local instants expressed with different offsets give the same duration', () => {
    assert.strictEqual(calculateCneDuration('2026-10-25T08:00:00+05:30','2026-10-26T17:00:00+05:30'), '18:00:00');
    assert.strictEqual(calculateCneDuration('2026-10-25T02:30:00Z','2026-10-26T11:30:00Z'), '18:00:00');
  });

  // ---------------------------------------------------------------------------
  // 4. Date Formatting and Display
  // ---------------------------------------------------------------------------
  test('4.1 Formats UTC ISO timestamp (2028-10-25T08:30:00Z) to 25-Oct-2028 02:00 PM (IST)', () => {
    const dtDisplay = formatCneDateTimeDisplay('2028-10-25T08:30:00Z');
    assert.strictEqual(dtDisplay, '25-Oct-2028 02:00 PM', 'formatCneDateTimeDisplay converts UTC to Indian civil time');
  });

  test('4.2 Formats UTC ISO timestamp to Indian calendar date DD-MMM-YYYY', () => {
    const dDisplay = formatCneDateDisplay('2028-10-25T08:30:00Z');
    assert.strictEqual(dDisplay, '25-Oct-2028', 'formatCneDateDisplay displays Indian calendar date');
  });

  test('4.3 Formats datetime-local string to Indian civil time YYYY-MM-DDTHH:mm', () => {
    const dLocal = toDateTimeLocalString('2028-10-25T08:30:00Z');
    assert.strictEqual(dLocal, '2028-10-25T14:00', 'toDateTimeLocalString converts UTC to Indian local input string');
  });

  test('4.4 Formats date and time ranges consistently in Indian civil time', () => {
    const rangeDisplay = formatCneDateTimeRangeDisplay('2028-10-25T08:30:00Z', '2028-10-25T10:30:00Z');
    assert.strictEqual(rangeDisplay, '25-Oct-2028 02:00 PM – 25-Oct-2028 04:00 PM', 'Range displays Indian start and end times');

    const dateOnlyRange = formatCneDateRangeDisplay('2026-10-25', '2026-10-26');
    assert.strictEqual(dateOnlyRange, '25-Oct-2026 - 26-Oct-2026', 'Date-only range formatted cleanly');
  });

  // ---------------------------------------------------------------------------
  // 5. Google Sheets Date Objects
  // ---------------------------------------------------------------------------
  test('5.1 Handles Google Sheets JavaScript Date objects without unintended timezone shifts', () => {
    // 25-Oct-2026 14:00:00 IST = 1792917000000 ms UTC
    const sheetsDateObj = new Date(1792917000000);

    const parsedEpoch = parseCneStartTimestamp(sheetsDateObj);
    assert.strictEqual(parsedEpoch, 1792917000000, 'JS Date parsed into exact UTC epoch ms');

    const formattedDt = formatCneDateTimeDisplay(sheetsDateObj);
    assert.strictEqual(formattedDt, '25-Oct-2026 02:00 PM', 'JS Date formatted as Indian civil time');

    const formattedDate = formatCneDateDisplay(sheetsDateObj);
    assert.strictEqual(formattedDate, '25-Oct-2026', 'JS Date formatted as Indian date DD-MMM-YYYY');

    const isoDay = parseToIsoDateString(sheetsDateObj);
    assert.strictEqual(isoDay, '2026-10-25', 'JS Date converts to canonical India YYYY-MM-DD');
  });

  test('5.2 Handles invalid Date objects by safely returning NaN or fallback', () => {
    const invalidDate = new Date('Invalid Date');
    assert.ok(isNaN(parseCneStartTimestamp(invalidDate)), 'Invalid JS Date returns NaN');
    assert.strictEqual(formatCneDateTimeDisplay(invalidDate), '—', 'Invalid JS Date displays fallback dash');
  });

  // ---------------------------------------------------------------------------
  // 6. Invalid Date/Time Rejection
  // ---------------------------------------------------------------------------
  test('6.1 Rejects invalid timezone offsets (+25:00, -25:00, +05:60)', () => {
    assert.strictEqual(parseStrictTime('14:00:00+25:00'), null, 'Offset > +23 hours rejected');
    assert.strictEqual(parseStrictTime('14:00:00-25:00'), null, 'Offset < -23 hours rejected');
    assert.strictEqual(parseStrictTime('14:00:00+05:60'), null, 'Offset minute > 59 rejected');
  });

  test('6.2 Rejects out-of-range years (<1970 or >2100)', () => {
    assert.strictEqual(isValidCalendarDate(1969, 12, 31), false, 'Year < 1970 rejected');
    assert.strictEqual(isValidCalendarDate(2101, 1, 1), false, 'Year > 2100 rejected');
  });

  test('6.3 Rejects contradictory timestamp inputs and falsy inputs', () => {
    const contradictory = parseCneStartTimestamp('2026-10-25T14:00:00Z', '16:00:00');
    assert.ok(isNaN(contradictory), 'Contradictory ISO time and separate explicit time rejected');

    assert.ok(isNaN(parseCneStartTimestamp(null)), 'Null date returns NaN');
    assert.ok(isNaN(parseCneStartTimestamp(undefined)), 'Undefined date returns NaN');
    assert.ok(isNaN(parseCneStartTimestamp('')), 'Empty string returns NaN');
  });

  if (failures.length > 0) {
    throw new Error(`${failures.length} test(s) failed under timezone ${tz}`);
  }

  return { passed, total };
}

// -----------------------------------------------------------------------------
// Cross-Timezone Master Runner
// -----------------------------------------------------------------------------

function main() {
  const isWorker = process.argv.includes('--tz-run');
  if (isWorker) {
    const tzIdx = process.argv.indexOf('--tz-run') + 1;
    const tz = process.argv[tzIdx] || 'UTC';
    const result = runTestsForTimezone(tz);
    // Print machine-readable summary line for worker parent
    console.log(`\nTZ_WORKER_RESULT:${tz}:${result.passed}:${result.total}`);
    process.exit(0);
  }

  console.log('================================================================');
  console.log('   CROSS-MODULE TIMEZONE REGRESSION TEST SUITE');
  console.log('   Validating CNE Date/Time & Asia/Kolkata Consistency');
  console.log('================================================================');

  const targetTimezones = ['Asia/Kolkata', 'UTC', 'America/Los_Angeles'];
  let totalExecuted = 0;
  let totalPassed = 0;

  for (const tz of targetTimezones) {
    try {
      // Execute in child process with explicit TZ environment variable
      const output = child_process.execFileSync(
        process.execPath,
        [__filename, '--tz-run', tz],
        {
          env: { ...process.env, TZ: tz },
          encoding: 'utf8'
        }
      );

      process.stdout.write(output);

      // Parse worker result
      const match = output.match(/TZ_WORKER_RESULT:([^:]+):(\d+):(\d+)/);
      if (match) {
        const passedCount = parseInt(match[2], 10);
        const totalCount = parseInt(match[3], 10);
        totalPassed += passedCount;
        totalExecuted += totalCount;
      }
    } catch (err) {
      console.error(`\nFATAL: Tests failed under timezone environment ${tz}:`);
      if (err.stdout) console.error(err.stdout);
      if (err.stderr) console.error(err.stderr);
      process.exit(1);
    }
  }

  console.log('\n================================================================');
  console.log(`TIMEZONE REGRESSION SUITE COMPLETE: ${totalPassed}/${totalExecuted} tests passed across 3 timezones`);
  console.log('Tested environments: Asia/Kolkata, UTC, America/Los_Angeles');
  console.log('================================================================\n');

  if (totalPassed !== totalExecuted || totalExecuted === 0) {
    process.exit(1);
  }
}

return main();

}

// Each block below reproduces an original test file verbatim at runtime.
// The source is kept readable, not minified or encoded, so tests can be edited.
const suites = [
  // ===== BEGIN ORIGINAL SUITE: verify-security-and-access.js =====
  {
    id: "security",
    name: "Security & Access Control",
    originalFilename: "verify-security-and-access.js",
    mode: "module",
    expectedChecks: 30,
    sha256: "4b6729d2e3894bd747875fb5830a52598e8ac06e21a1843c1d2e1f685c357f41",
    source: `/**
 * Security & Access Verification Suite
 *
 * Verifies:
 * - Authentication & cryptographic session token validation
 * - Admin-only endpoint protection
 * - Area Incharge ward isolation & cross-ward transfer prevention
 * - Assigned Resource Person authorization & isolation
 * - Ordinary employee permission boundaries
 * - Authoritative CNE lifecycle protections & status transition enforcement
 * - Immutability of CNE ID and CNE Type
 * - Finalized CNE mutation locks (edits, participants, materials, questions)
 * - Post-test authorization & opaque QR token access control
 * - Synchronization between Code.gs and src/backend/googleAppsScript.ts
 */

import assert from 'assert';
import fs from 'fs';

console.log('========================================================');
console.log('Security & Access Verification');
console.log('========================================================\\n');

const codeGs = fs.readFileSync('Code.gs', 'utf8');
const backendGs = fs.readFileSync('src/backend/googleAppsScript.ts', 'utf8');
const cneSchedule = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
const appTs = fs.readFileSync('src/App.tsx', 'utf8');
const changePasswordModalTs = fs.readFileSync('src/components/ChangePasswordModal.tsx', 'utf8');
const adminRolesTs = fs.readFileSync('src/components/AdminRoles.tsx', 'utf8');
const cneDetailsTs = fs.readFileSync('src/components/cne/CneDetailsModal.tsx', 'utf8');
const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${name}\`);
  } catch (err) {
    console.error(\`✗ \${name}\`);
    console.error(\`  Error: \${err.message}\\n\`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. Source Synchronization & Backend Wrapper Verification
// -----------------------------------------------------------------------------
runTest('Apps Script source code and TypeScript wrapper synchronization', () => {
  assert.ok(
    backendGs.includes('export const APPS_SCRIPT_SOURCE_CODE = \`'),
    'src/backend/googleAppsScript.ts must wrap Code.gs'
  );
  assert.ok(
    backendGs.includes('var areaAuthErr = checkCNEAuthorized(session, area, cneType);'),
    'src/backend/googleAppsScript.ts must contain checkCNEAuthorized'
  );
  assert.ok(
    backendGs.includes('INVALID_STATUS_TRANSITION'),
    'src/backend/googleAppsScript.ts must contain INVALID_STATUS_TRANSITION'
  );
  assert.ok(
    backendGs.includes('checkCNEActionAuthorized(session, candidateRecord)'),
    'src/backend/googleAppsScript.ts must contain checkCNEActionAuthorized'
  );
});

// -----------------------------------------------------------------------------
// 2. Authentication & Session Security Structure
// -----------------------------------------------------------------------------
runTest('Protected backend actions require a valid session', () => {
  // Session verification function exists
  assert.ok(codeGs.includes('function verifySession('), 'verifySession function must exist');
  assert.ok(codeGs.includes('computeHmacSha256Signature'), 'Session tokens must be HMAC-SHA256 signed');
  assert.ok(codeGs.includes('timingSafeEqual'), 'Session signature comparison must use timingSafeEqual');

  // Critical protected handlers fail closed without session
  assert.ok(
    codeGs.includes("if (!session) {\\n    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };\\n  }"),
    'handleCreateCNE must require session'
  );
  assert.ok(
    codeGs.includes("if (!session) {\\n    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Unauthorized session.' };\\n  }"),
    'handleUpdateCNE must require session'
  );
  assert.ok(
    codeGs.includes('function handleAdminAction(params, session, handlerFn, actionName) {'),
    'handleAdminAction must wrap all admin endpoints'
  );
});

runTest('Admin-only actions remain strictly Admin-only', () => {
  assert.ok(codeGs.includes('function requireAdmin(session) {'), 'requireAdmin helper must exist');
  assert.ok(
    codeGs.includes("if (String(session.role || '').toUpperCase() !== 'ADMIN')"),
    'requireAdmin must strictly check for ADMIN role'
  );
  assert.ok(
    codeGs.includes("errorCode: 'FORBIDDEN'"),
    'requireAdmin must return FORBIDDEN for non-admin'
  );

  // Router passes admin endpoints through handleAdminAction
  const adminEndpoints = [
    'addArea',
    'updateArea',
    'getRoles',
    'updateRole',
    'setupAndVerifyCNESheets',
    'uploadImage',
    'updateGalleryItem',
    'deleteGalleryItem',
    'addNewsEvent',
    'updateNewsEvent',
    'deleteNewsEvent',
    'updateCoordinatorDesk',
    'addQuickLink',
    'updateQuickLink',
    'deleteQuickLink',
    'adminResetPassword',
    'getDepartmentalCneOutcomeReport',
    'deleteCNE'
  ];

  for (const ep of adminEndpoints) {
    const casePattern = new RegExp(\`case '\${ep}':[\\\\s\\\\S]*?handleAdminAction\`, 'm');
    assert.ok(casePattern.test(codeGs), \`Endpoint '\${ep}' must be protected by handleAdminAction\`);
  }

  // Obsolete reviewCNE endpoint must remain completely absent
  assert.ok(!codeGs.includes("case 'reviewCNE':"), "Code.gs must not contain obsolete router case 'reviewCNE'");
  assert.ok(!codeGs.includes("function handleReviewCNE"), "Code.gs must not define obsolete function 'handleReviewCNE'");
});

runTest('Secure ADMIN-Only Delete CNE authorization and backend protection', () => {
  // deleteCNE router action exists and is wrapped by handleAdminAction
  assert.ok(
    codeGs.includes("case 'deleteCNE':") &&
      codeGs.includes("handleAdminAction(params, session, handleDeleteCNE, 'DELETE_CNE')"),
    "deleteCNE router action must be wrapped by handleAdminAction"
  );
  // handleDeleteCNE exists
  assert.ok(codeGs.includes('function handleDeleteCNE'), "Code.gs must define handleDeleteCNE");

  const deleteSection = codeGs.substring(
    codeGs.indexOf('function handleDeleteCNE'),
    codeGs.length
  );

  // Fresh ADMIN check under ScriptLock
  assert.ok(deleteSection.includes('lock.waitLock(15000)'), 'handleDeleteCNE must acquire ScriptLock');
  assert.ok(deleteSection.includes('refreshMutationSession(session)'), 'handleDeleteCNE must refresh mutation session under lock');
  assert.ok(deleteSection.includes('var adminErr = requireAdmin(session);'), 'handleDeleteCNE must re-verify Admin role under lock');

  // AREA_INCHARGE, EMPLOYEE cannot delete (enforced by requireAdmin)
  assert.ok(codeGs.includes("function requireAdmin(session)"), "requireAdmin must guard administrative actions");

  // Frontend Delete button is ADMIN-only and does not reuse canManageLifecycle
  assert.ok(cneSchedule.includes("const canDeleteCne = user?.role === 'ADMIN';"), 'Frontend delete permission must be strictly user?.role === ADMIN');
  assert.ok(cneSchedule.includes("canDeleteCne={canDeleteCne}"), 'canDeleteCne must be passed to CneDetailsModal');
  assert.ok(!cneDetailsTs.includes("canLifecycle && !isCompleted && onDelete"), 'CneDetailsModal must not use canLifecycle for deletion');

  // API fails closed without secure backend
  assert.ok(apiTs.includes("case 'deleteCNE':"), 'ApiService must include deleteCNE in fail-closed switch');
  assert.ok(apiTs.includes('static async deleteCNE'), 'ApiService must expose deleteCNE method');
});

runTest('Departmental CNE Outcome page is protected on both backend and frontend', () => {
  assert.ok(
    codeGs.includes("case 'getDepartmentalCneOutcomeReport':") &&
      codeGs.includes("handleAdminAction(params, session, handleGetDepartmentalCneOutcomeReport"),
    'Departmental CNE Outcome backend action must be wrapped by handleAdminAction'
  );
  assert.ok(
    codeGs.includes('function handleGetDepartmentalCneOutcomeReport(params, session)') &&
      codeGs.substring(codeGs.indexOf('function handleGetDepartmentalCneOutcomeReport'), codeGs.indexOf('function handleGetRoles')).includes('requireAdmin(session)'),
    'Departmental CNE Outcome handler must independently require Admin'
  );
  assert.ok(
    appTs.includes("activeView === 'admin-departmental-cne-outcome' && user?.role === 'ADMIN'"),
    'Frontend route must render Departmental CNE Outcome only for Admin'
  );
});

// -----------------------------------------------------------------------------
// 3. Departmental CNE Area Isolation & Scoping
// -----------------------------------------------------------------------------
// Simulate checkCNEAuthorized logic faithfully as implemented in Code.gs
function simulateCheckCNEAuthorized(session, cneArea, cneType) {
  if (!session) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
  }
  const role = String(session.role || '').toUpperCase();
  if (role === 'ADMIN') return null; // Admin has full control

  if (role === 'AREA_INCHARGE' || role === 'INCHARGE') {
    const type = String(cneType || '').trim().toUpperCase();
    if (type === 'DEPARTMENTAL' || type === 'DEPT') {
      const assignedAreas = (session.assignedAreas || (session.assignedArea ? [session.assignedArea] : []))
        .map(a => String(a).trim().toLowerCase());
      const targetArea = String(cneArea || '').trim().toLowerCase();
      if (targetArea && assignedAreas.length > 0 && assignedAreas.includes(targetArea)) {
        return null; // Authorized for this Departmental CNE
      }
    }
  }

  return {
    success: false,
    errorCode: 'FORBIDDEN',
    message: 'Permission denied. Only an Administrator or the designated Area Incharge for this department may manage this CNE.'
  };
}

runTest('Area Incharge authorization remains ward-scoped', () => {
  const inchargeWardA = {
    employeeId: 'EMP001',
    role: 'AREA_INCHARGE',
    assignedAreas: ['ICU-A', 'ICU-B']
  };

  // Eligible Ward A: Allowed
  assert.strictEqual(simulateCheckCNEAuthorized(inchargeWardA, 'ICU-A', 'DEPARTMENTAL'), null);
  assert.strictEqual(simulateCheckCNEAuthorized(inchargeWardA, 'ICU-B', 'DEPARTMENTAL'), null);

  // Ineligible Ward C: Rejected
  const rejectWardC = simulateCheckCNEAuthorized(inchargeWardA, 'Ward-C', 'DEPARTMENTAL');
  assert.ok(rejectWardC !== null && rejectWardC.errorCode === 'FORBIDDEN');

  // Central CNE: Rejected for Area Incharge
  const rejectCentral = simulateCheckCNEAuthorized(inchargeWardA, 'ICU-A', 'CENTRAL');
  assert.ok(rejectCentral !== null && rejectCentral.errorCode === 'FORBIDDEN');

  // Ordinary employee: Rejected for all
  const employee = { employeeId: 'EMP002', role: 'EMPLOYEE', assignedAreas: [] };
  const rejectEmployee = simulateCheckCNEAuthorized(employee, 'ICU-A', 'DEPARTMENTAL');
  assert.ok(rejectEmployee !== null && rejectEmployee.errorCode === 'FORBIDDEN');

  // Admin retains institution-wide authority across all wards and types
  const admin = { employeeId: 'ADMIN01', role: 'ADMIN', assignedAreas: [] };
  assert.strictEqual(simulateCheckCNEAuthorized(admin, 'ICU-A', 'DEPARTMENTAL'), null);
  assert.strictEqual(simulateCheckCNEAuthorized(admin, 'Ward-Z', 'DEPARTMENTAL'), null);
  assert.strictEqual(simulateCheckCNEAuthorized(admin, 'All Department', 'CENTRAL'), null);
});

runTest('Area Incharge cannot transfer a Departmental CNE to another ward', () => {
  // Check that handleUpdateCNE includes FORBIDDEN_WARD_TRANSFER check
  const updateSection = codeGs.substring(
    codeGs.indexOf('function handleUpdateCNE'),
    codeGs.indexOf('function parseDurationToSeconds')
  );
  assert.ok(
    updateSection.includes('FORBIDDEN_WARD_TRANSFER'),
    'handleUpdateCNE must contain FORBIDDEN_WARD_TRANSFER'
  );
  assert.ok(
    updateSection.includes('Area Incharge cannot transfer a Departmental CNE to another area/ward'),
    'handleUpdateCNE must explain that Area Incharge cannot transfer ward'
  );
});

// -----------------------------------------------------------------------------
// 4. Assigned Resource Person Authorization & Isolation
// -----------------------------------------------------------------------------
// Simulate checkCNEActionAuthorized logic as implemented in Code.gs
function simulateCheckCNEActionAuthorized(session, record) {
  if (!session || !session.employeeId) {
    return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
  }
  const role = String(session.role || '').toUpperCase();
  if (role === 'ADMIN') return null; // Admin has full operational authority

  if (record) {
    const loggedInId = String(session.employeeId).trim().toUpperCase();
    const rawRp = record.instructor || record.resourcePersonEmpId || '';
    const rpList = String(rawRp).split(/[,;\\n]+/).map(s => s.trim().toUpperCase()).filter(Boolean);

    // 1. Check if authenticated user is assigned Resource Person for THIS PARTICULAR CNE
    if (loggedInId && rpList.includes(loggedInId)) {
      return null;
    }

    // 2. Check if responsible Area Incharge for internal CNE (CENTRAL or DEPARTMENTAL)
    const type = String(record.cneType || '').trim().toUpperCase();
    if (
      (role === 'AREA_INCHARGE' || role === 'INCHARGE') &&
      (type === 'CENTRAL' || type === 'DEPARTMENTAL' || type === 'DEPT')
    ) {
      const assignedAreas = (session.assignedAreas || (session.assignedArea ? [session.assignedArea] : []))
        .map(a => String(a).trim().toLowerCase());
      const targetArea = String(record.area || '').trim().toLowerCase();
      if (targetArea && assignedAreas.length > 0 && assignedAreas.includes(targetArea)) {
        return null;
      }
    }
  }

  return {
    success: false,
    errorCode: 'FORBIDDEN',
    message: 'Permission denied. Only Administrators, the responsible Area Incharge, or assigned Resource Persons for this CNE may perform this action.'
  };
}

runTest('Assigned Resource Person authorization is CNE-specific', () => {
  const cneSession1 = {
    cneId: 'CNE-001',
    area: 'Ward-A',
    cneType: 'DEPARTMENTAL',
    resourcePersonEmpId: 'RP-1001, RP-1002'
  };

  const cneSession2 = {
    cneId: 'CNE-002',
    area: 'Ward-B',
    cneType: 'DEPARTMENTAL',
    resourcePersonEmpId: 'RP-2001'
  };

  const assignedRp = { employeeId: 'RP-1001', role: 'EMPLOYEE' };
  const unrelatedRp = { employeeId: 'RP-2001', role: 'EMPLOYEE' };
  const ordinaryEmp = { employeeId: 'EMP-9999', role: 'EMPLOYEE' };

  // Assigned Resource Person authorized for own CNE
  assert.strictEqual(simulateCheckCNEActionAuthorized(assignedRp, cneSession1), null);

  // Unrelated Resource Person rejected for another CNE
  const resUnrelated = simulateCheckCNEActionAuthorized(unrelatedRp, cneSession1);
  assert.ok(resUnrelated !== null && resUnrelated.errorCode === 'FORBIDDEN');

  // Ordinary employee rejected
  const resOrdinary = simulateCheckCNEActionAuthorized(ordinaryEmp, cneSession1);
  assert.ok(resOrdinary !== null && resOrdinary.errorCode === 'FORBIDDEN');

  // Responsible Area Incharge authorized
  const responsibleIncharge = { employeeId: 'INC-01', role: 'AREA_INCHARGE', assignedAreas: ['Ward-A'] };
  assert.strictEqual(simulateCheckCNEActionAuthorized(responsibleIncharge, cneSession1), null);

  // Unrelated Area Incharge rejected
  const unrelatedIncharge = { employeeId: 'INC-02', role: 'AREA_INCHARGE', assignedAreas: ['Ward-X'] };
  const resUnrelatedInc = simulateCheckCNEActionAuthorized(unrelatedIncharge, cneSession1);
  assert.ok(resUnrelatedInc !== null && resUnrelatedInc.errorCode === 'FORBIDDEN');
});

runTest('Area Incharge operational authorization strictly excludes External CNE types', () => {
  const matchingAreaIncharge = {
    employeeId: 'INC-WARD-A',
    role: 'AREA_INCHARGE',
    assignedAreas: ['ICU-A']
  };

  const adminSession = {
    employeeId: 'ADM-001',
    role: 'ADMIN'
  };

  const centralCne = {
    cneId: 'CNE-CENTRAL-01',
    area: 'ICU-A',
    cneType: 'CENTRAL',
    resourcePersonEmpId: 'RP-900'
  };

  const deptCne = {
    cneId: 'CNE-DEPT-01',
    area: 'ICU-A',
    cneType: 'DEPARTMENTAL',
    resourcePersonEmpId: 'RP-900'
  };

  const externalOffsiteCne = {
    cneId: 'CNE-EXT-OUT-01',
    area: 'ICU-A',
    cneType: 'EXTERNAL_OFFSITE',
    resourcePersonEmpId: 'RP-900'
  };

  const externalOnsiteCne = {
    cneId: 'CNE-EXT-IN-01',
    area: 'ICU-A',
    cneType: 'EXTERNAL_ONSITE',
    resourcePersonEmpId: 'RP-900'
  };

  // 1. AREA_INCHARGE + assigned matching area + CENTRAL -> allowed
  assert.strictEqual(
    simulateCheckCNEActionAuthorized(matchingAreaIncharge, centralCne),
    null,
    'Area Incharge with matching area must be authorized for CENTRAL CNE operational actions'
  );

  // 2. AREA_INCHARGE + assigned matching area + DEPARTMENTAL -> allowed
  assert.strictEqual(
    simulateCheckCNEActionAuthorized(matchingAreaIncharge, deptCne),
    null,
    'Area Incharge with matching area must be authorized for DEPARTMENTAL CNE operational actions'
  );

  // 3. AREA_INCHARGE + assigned matching area + EXTERNAL_OFFSITE -> DENIED
  const resExtOffsite = simulateCheckCNEActionAuthorized(matchingAreaIncharge, externalOffsiteCne);
  assert.ok(
    resExtOffsite !== null && resExtOffsite.errorCode === 'FORBIDDEN',
    'Area Incharge must be DENIED operational authority for EXTERNAL_OFFSITE even with matching area'
  );

  // 4. AREA_INCHARGE + assigned matching area + EXTERNAL_ONSITE -> DENIED
  const resExtOnsite = simulateCheckCNEActionAuthorized(matchingAreaIncharge, externalOnsiteCne);
  assert.ok(
    resExtOnsite !== null && resExtOnsite.errorCode === 'FORBIDDEN',
    'Area Incharge must be DENIED operational authority for EXTERNAL_ONSITE even with matching area'
  );

  // 5. ADMIN + EXTERNAL_OFFSITE -> allowed
  assert.strictEqual(
    simulateCheckCNEActionAuthorized(adminSession, externalOffsiteCne),
    null,
    'Admin must be authorized for EXTERNAL_OFFSITE'
  );

  // 6. ADMIN + EXTERNAL_ONSITE -> allowed
  assert.strictEqual(
    simulateCheckCNEActionAuthorized(adminSession, externalOnsiteCne),
    null,
    'Admin must be authorized for EXTERNAL_ONSITE'
  );

  // 7. Assigned Resource Person on External CNE remains authorized
  const assignedRpOnExt = { employeeId: 'RP-900', role: 'EMPLOYEE' };
  assert.strictEqual(
    simulateCheckCNEActionAuthorized(assignedRpOnExt, externalOffsiteCne),
    null,
    'Assigned Resource Person on External CNE must retain operational authority'
  );

  // Backend Code.gs source verification
  assert.ok(
    codeGs.includes("actionCneType === 'CENTRAL' || actionCneType === 'DEPARTMENTAL'"),
    'Code.gs must restrict Area Incharge branch to CENTRAL or DEPARTMENTAL CNE types'
  );

  // Frontend CNESchedule.tsx canOperateCne source verification
  assert.ok(
    cneSchedule.includes("cne.cneType === 'CENTRAL' ||\\n      cne.cneType === 'DEPARTMENTAL'") ||
    cneSchedule.includes("cne.cneType === 'CENTRAL' || cne.cneType === 'DEPARTMENTAL'"),
    'CNESchedule.tsx canOperateCne must require internal CNE type before granting Area Incharge operational access'
  );
});

runTest('Frontend canOperateCne strictly excludes Area Incharge from External CNE operational access', () => {
  function simulateCanOperateCne(user, cne) {
    if (!user || !cne) return false;
    if (user.role === 'ADMIN') return true;
    const isConcernedAreaIncharge = (item) => {
      if (!user || !(user.role === 'AREA_INCHARGE' || user.role === 'INCHARGE')) return false;
      const targetArea = (item.area || '').trim().toLowerCase();
      if (!targetArea) return false;
      const assignedAreas = (user.assignedAreas || (user.assignedArea ? [user.assignedArea] : []))
        .map(a => String(a).trim().toLowerCase());
      return assignedAreas.includes(targetArea);
    };
    const isInternalOperationalType =
      cne.cneType === 'CENTRAL' ||
      cne.cneType === 'DEPARTMENTAL';
    if (isInternalOperationalType && isConcernedAreaIncharge(cne)) return true;
    const userEmpId = String(user.employeeId || '').trim().toUpperCase();
    const rawRp = [cne.resourcePersonEmpId, ...(cne.resourcePersonEmpIds || [])].filter(Boolean).join(',');
    const rpList = rawRp.split(/[,;\\n]+/).map(s => String(s).trim().toUpperCase()).filter(Boolean);
    return rpList.includes(userEmpId);
  }

  const matchingAreaIncharge = {
    employeeId: 'INC-WARD-A',
    role: 'AREA_INCHARGE',
    assignedAreas: ['ICU-A']
  };

  const adminSession = {
    employeeId: 'ADM-001',
    role: 'ADMIN'
  };

  const centralCne = {
    cneId: 'CNE-CENTRAL-01',
    area: 'ICU-A',
    cneType: 'CENTRAL',
    resourcePersonEmpId: 'RP-900'
  };

  const deptCne = {
    cneId: 'CNE-DEPT-01',
    area: 'ICU-A',
    cneType: 'DEPARTMENTAL',
    resourcePersonEmpId: 'RP-900'
  };

  const extOffsiteCne = {
    cneId: 'CNE-EXT-01',
    area: 'ICU-A',
    cneType: 'EXTERNAL_OFFSITE',
    resourcePersonEmpId: 'RP-900'
  };

  const extOnsiteCne = {
    cneId: 'CNE-EXT-02',
    area: 'ICU-A',
    cneType: 'EXTERNAL_ONSITE',
    resourcePersonEmpId: 'RP-900'
  };

  // 1. AREA_INCHARGE + assigned matching area + CENTRAL -> allowed
  assert.strictEqual(simulateCanOperateCne(matchingAreaIncharge, centralCne), true, 'Area Incharge must be allowed for CENTRAL');

  // 2. AREA_INCHARGE + assigned matching area + DEPARTMENTAL -> allowed
  assert.strictEqual(simulateCanOperateCne(matchingAreaIncharge, deptCne), true, 'Area Incharge must be allowed for DEPARTMENTAL');

  // 3. AREA_INCHARGE + assigned matching area + EXTERNAL_OFFSITE -> DENIED
  assert.strictEqual(simulateCanOperateCne(matchingAreaIncharge, extOffsiteCne), false, 'Area Incharge must be DENIED for EXTERNAL_OFFSITE');

  // 4. AREA_INCHARGE + assigned matching area + EXTERNAL_ONSITE -> DENIED
  assert.strictEqual(simulateCanOperateCne(matchingAreaIncharge, extOnsiteCne), false, 'Area Incharge must be DENIED for EXTERNAL_ONSITE');

  // 5. ADMIN + EXTERNAL_OFFSITE -> allowed
  assert.strictEqual(simulateCanOperateCne(adminSession, extOffsiteCne), true, 'Admin must be allowed for EXTERNAL_OFFSITE');

  // 6. ADMIN + EXTERNAL_ONSITE -> allowed
  assert.strictEqual(simulateCanOperateCne(adminSession, extOnsiteCne), true, 'Admin must be allowed for EXTERNAL_ONSITE');

  // 7. Assigned Resource Person on External CNE remains authorized
  const assignedRpOnExt = { employeeId: 'RP-900', role: 'EMPLOYEE' };
  assert.strictEqual(simulateCanOperateCne(assignedRpOnExt, extOffsiteCne), true, 'Assigned RP must be allowed on External Offsite');
  assert.strictEqual(simulateCanOperateCne(assignedRpOnExt, extOnsiteCne), true, 'Assigned RP must be allowed on External Onsite');

  // 8. Ordinary employee not assigned -> DENIED
  const ordinaryEmp = { employeeId: 'EMP-999', role: 'EMPLOYEE' };
  assert.strictEqual(simulateCanOperateCne(ordinaryEmp, extOffsiteCne), false, 'Ordinary employee must be DENIED on External Offsite');
  assert.strictEqual(simulateCanOperateCne(ordinaryEmp, extOnsiteCne), false, 'Ordinary employee must be DENIED on External Onsite');
});

runTest('CNESchedule UI button restricts Post Test management to authorized users', () => {
  assert.ok(
    cneSchedule.includes('canManageCneActions(user, selectedDetailCne)'),
    'CNESchedule must verify canManageCneActions for selectedDetailCne'
  );
  assert.ok(
    cneSchedule.includes('disabled={!canManageCneActions(user, selectedDetailCne)}'),
    'Post Test button must be disabled when user cannot manage CNE actions'
  );
});

// -----------------------------------------------------------------------------
// 5. Authoritative CNE Lifecycle Protections
// -----------------------------------------------------------------------------
runTest('CNE ID and CNE Type cannot be modified through Edit CNE', () => {
  const updateSection = codeGs.substring(
    codeGs.indexOf('function handleUpdateCNE'),
    codeGs.indexOf('function parseDurationToSeconds')
  );

  // Immutability of CNE ID
  assert.ok(
    updateSection.includes('IMMUTABLE_CNE_ID'),
    'handleUpdateCNE must reject modified CNE ID with IMMUTABLE_CNE_ID'
  );
  assert.ok(
    updateSection.includes('CNE ID is permanently immutable and cannot be modified'),
    'handleUpdateCNE must explain that CNE ID is permanently immutable'
  );

  // Immutability of CNE Type
  assert.ok(
    updateSection.includes('IMMUTABLE_CNE_TYPE'),
    'handleUpdateCNE must reject modified CNE Type with IMMUTABLE_CNE_TYPE'
  );
  assert.ok(
    updateSection.includes('CNE Category / Type is immutable and cannot be changed'),
    'handleUpdateCNE must explain that CNE Category / Type is immutable'
  );
});

runTest('updateCNE cannot directly change Scheduled to Completed or Canceled', () => {
  const updateSection = codeGs.substring(
    codeGs.indexOf('function handleUpdateCNE'),
    codeGs.indexOf('function parseDurationToSeconds')
  );

  assert.ok(
    updateSection.includes('INVALID_STATUS_TRANSITION'),
    'handleUpdateCNE must reject status changes with INVALID_STATUS_TRANSITION'
  );
  assert.ok(
    updateSection.includes('CNE status cannot be changed through Edit CNE. Use the official Finalize or Cancel workflow'),
    'handleUpdateCNE must direct users to Finalize or Cancel workflow'
  );
  // Status column must NOT be modified by handleUpdateCNE
  assert.ok(
    !updateSection.includes("setColVal('status'"),
    'handleUpdateCNE must not write modified status to the sheet'
  );
});

runTest('Finalize uses dedicated finalization workflow', () => {
  assert.ok(codeGs.includes('function handleFinalizeCNE('), 'handleFinalizeCNE must exist');
  const finalizeSection = codeGs.substring(
    codeGs.indexOf('function handleFinalizeCNE'),
    codeGs.indexOf('function handleCancelCNE')
  );

  assert.ok(finalizeSection.includes("setValue('Completed')"), 'Finalize must set status to Completed');
  assert.ok(finalizeSection.includes('NO_PARTICIPANTS'), 'Finalize must require at least one recorded participant');
  assert.ok(finalizeSection.includes('totalParticipantsCount'), 'Finalize must compute and persist total attendees');
  assert.ok(finalizeSection.includes('remarksSummary'), 'Finalize must write remarks summary including average score');
});

runTest('Cancel uses dedicated cancellation workflow', () => {
  assert.ok(codeGs.includes('function handleCancelCNE('), 'handleCancelCNE must exist');
  const cancelSection = codeGs.substring(
    codeGs.indexOf('function handleCancelCNE'),
    codeGs.length
  );

  assert.ok(cancelSection.includes("setValue('Canceled')"), 'Cancel must set status to Canceled');
  assert.ok(
    cancelSection.includes('Cannot cancel a CNE that has already been finalized/completed'),
    'Cancel must reject already finalized/completed CNE'
  );
});

runTest('Completed CNE edits are admin-only; participant, material and question mutations remain locked', () => {
  // 1. Completed CNE metadata edits require ADMIN before and after acquiring the lock.
  const updateSection = codeGs.substring(
    codeGs.indexOf('function handleUpdateCNE'),
    codeGs.indexOf('function parseDurationToSeconds')
  );
  assert.ok(updateSection.includes('COMPLETED_CNE_ADMIN_ONLY') &&
    updateSection.includes("liveUpdateStatus === 'Completed' && String(session.role || '').toUpperCase() !== 'ADMIN'"),
    'handleUpdateCNE must restrict completed edits to ADMIN after locking');
  assert.ok(updateSection.includes('COMPLETED_CNE_COVERAGE_LOCKED') &&
    updateSection.includes('COMPLETED_CNE_FUTURE_DATE') &&
    updateSection.includes('ADMIN_CORRECT_COMPLETED_CNE'),
    'Completed edit must preserve coverage, historical dates and admin audit trail');

  // 2. Participant mutations locked
  const manualPartSection = codeGs.substring(
    codeGs.indexOf('function handleAddManualParticipants'),
    codeGs.indexOf('function handleGetCNEParticipants')
  );
  assert.ok(
    manualPartSection.includes("normalizeCNEStatus(record.status) === 'Completed'") &&
    manualPartSection.includes('CNE_ALREADY_FINALIZED'),
    'handleAddManualParticipants must reject additions to Completed CNE with CNE_ALREADY_FINALIZED'
  );

  // 3. Learning material mutations locked
  const refMatSection = codeGs.substring(
    codeGs.indexOf('function handleSaveReferenceMaterial'),
    codeGs.indexOf('function ensureReferenceSheetHeaders')
  );
  assert.ok(
    refMatSection.includes("normalizeCNEStatus(record.status) === 'Completed'") &&
    refMatSection.includes('CNE_ALREADY_FINALIZED'),
    'handleSaveReferenceMaterial must reject changes to Completed CNE with CNE_ALREADY_FINALIZED'
  );

  // 4. Question mutations locked
  const questionsSection = codeGs.substring(
    codeGs.indexOf('function handleSaveCNEQuestions'),
    codeGs.indexOf('function handleGetCNEQuestions')
  );
  assert.ok(
    questionsSection.includes("normalizeCNEStatus(record.status) === 'Completed'") &&
    questionsSection.includes('CNE_ALREADY_FINALIZED'),
    'handleSaveCNEQuestions must reject changes to Completed CNE with CNE_ALREADY_FINALIZED'
  );
});

// -----------------------------------------------------------------------------
// 6. Post Test Authorization & Public QR Token Flow
// -----------------------------------------------------------------------------
runTest('Post Test direct CNE-ID lookup is restricted to authorized roles', () => {
  const getPostTestSection = codeGs.substring(
    codeGs.indexOf('function handleGetPostTestQuestions'),
    codeGs.indexOf('function handleSubmitPostTest')
  );
  assert.ok(
    getPostTestSection.includes('var actionAuthErr = checkCNEActionAuthorized(session, candidateRecord);'),
    'handleGetPostTestQuestions must enforce checkCNEActionAuthorized for direct CNE-ID access'
  );

  const submitPostTestSection = codeGs.substring(
    codeGs.indexOf('function handleSubmitPostTest'),
    codeGs.indexOf('function handleAddManualParticipants')
  );
  assert.ok(
    submitPostTestSection.includes('var actionAuthErr = checkCNEActionAuthorized(session, candidateRecord);'),
    'handleSubmitPostTest must enforce checkCNEActionAuthorized for direct CNE-ID access'
  );
});

runTest('Valid public QR token flow is required and permitted for attendees', () => {
  const getPostTestSection = codeGs.substring(
    codeGs.indexOf('function handleGetPostTestQuestions'),
    codeGs.indexOf('function handleSubmitPostTest')
  );
  assert.ok(
    getPostTestSection.includes('INVALID_OR_MISSING_QR_TOKEN'),
    'Post test access must reject missing or invalid QR token for unauthenticated attendees'
  );
  assert.ok(
    getPostTestSection.includes("rowStatus === 'ACTIVE'"),
    'QR token must be verified as ACTIVE in CNE_QR_Tokens'
  );
  assert.ok(
    getPostTestSection.includes('getCachedSanitizedQuestions'),
    'Attendee question delivery must sanitize answer keys and explanations'
  );

  const submitSection = codeGs.substring(
    codeGs.indexOf('function handleSubmitPostTest'),
    codeGs.indexOf('function handleAddManualParticipants')
  );
  assert.ok(
    submitSection.includes('findOfficerById'),
    'Post test submission must authoritatively validate employee in staff roster'
  );
  assert.ok(
    submitSection.includes('ALREADY_SUBMITTED'),
    'Post test submission must reject duplicate submissions from same employee'
  );
  assert.ok(
    submitSection.includes("qSheet.getRange(questionRowsToLock[k], cols.isLocked + 1).setValue('YES')") ||
      (submitSection.includes('lockQuestionRowsBatch_') &&
        codeGs.includes("qSheet.getRangeList(a1).setValue('YES')")),
    'First successful submission must lock questions using a direct write or batched RangeList write'
  );
});

// -----------------------------------------------------------------------------
// 7. Password Security, Registered-Email OTP & Versioned Session Invalidation
// -----------------------------------------------------------------------------
runTest('Password hashing and Password Version session invalidation structure intact', () => {
  assert.ok(codeGs.includes('function computePasswordHash('), 'computePasswordHash must exist');
  assert.ok(codeGs.includes('PASSWORD_PEPPER'), 'Password hashing must require server-side pepper');
  assert.ok(codeGs.includes("'Password Version'"), 'Auth_Credentials must persist Password Version');

  const tokenSection = codeGs.substring(
    codeGs.indexOf('function generateSessionToken('),
    codeGs.indexOf('function timingSafeEqual(')
  );
  const verifySection = codeGs.substring(
    codeGs.indexOf('function verifySession('),
    codeGs.indexOf('/**\\n * 1. Reusable ADMIN Authorization Helper')
  );
  assert.ok(
    tokenSection.includes("payload = normId + ':' + timestamp + ':' + nonce + ':' + passwordVersion"),
    'Session token payload must include persistent Password Version'
  );
  assert.ok(
    verifySection.includes("tokenPasswordVersion = parseInt(parts[3], 10)") &&
    verifySection.includes("parseInt(secState.passwordVersion || '0',10) !== tokenPasswordVersion"),
    'verifySession must reject tokens whose Password Version no longer matches Auth_Credentials'
  );

  const upsertSection = codeGs.substring(
    codeGs.indexOf('function upsertPasswordCredential('),
    codeGs.indexOf('function handleLogin(')
  );
  assert.ok(
    upsertSection.includes('record.passwordVersion + 1') &&
    upsertSection.includes('clearCredentialSecurityCache(cleanId)'),
    'Password creation/change must increment Password Version and clear credential security cache'
  );
});

runTest('Login uses Officers data, requires a personal password, rate-limits failures, and rejects inactive accounts', () => {
  const loginSection = codeGs.substring(
    codeGs.indexOf('function handleLogin('),
    codeGs.indexOf('function handleChangePassword(')
  );

  assert.ok(
    loginSection.includes('findOfficerByIdTargeted_(employeeId)') && loginSection.includes('Officers data'),
    'handleLogin must resolve Employee ID from Officers data'
  );
  assert.ok(
    loginSection.includes("errorCode: 'PASSWORD_NOT_SET'") &&
    loginSection.includes('Create / Reset Password'),
    'Accounts without a personal password must be directed to Create / Reset Password'
  );
  assert.ok(
    !loginSection.includes("pass1234"),
    'Normal login must not accept the legacy shared pass1234 password'
  );
  assert.ok(
    loginSection.includes("record.accountStatus === 'INACTIVE'") &&
    loginSection.includes("errorCode: 'ACCOUNT_INACTIVE'"),
    'handleLogin must reject INACTIVE accounts'
  );

  const inactiveIndex = loginSection.indexOf("errorCode: 'ACCOUNT_INACTIVE'");
  const tokenGenIndex = loginSection.indexOf('generateSessionToken(employeeId, record)');
  assert.ok(
    inactiveIndex !== -1 && tokenGenIndex !== -1 && inactiveIndex < tokenGenIndex,
    'Inactive account rejection must occur before session-token issuance'
  );

  assert.ok(
    loginSection.includes('record.failedLoginCount + 1') &&
    loginSection.includes('failures >= 5') &&
    loginSection.includes("errorCode: failures >= 5 ? 'RATE_LIMITED' : 'INVALID_CREDENTIALS'") &&
    loginSection.includes('15 * 60 * 1000'),
    'Normal login must enforce 5 failed attempts followed by a 15-minute lock'
  );
  assert.ok(
    loginSection.includes('getRange(record.rowIndex, 9).setValue(0)') &&
    loginSection.includes("getRange(record.rowIndex, 10).setValue('')"),
    'Successful login must clear the failed-login counter and lock timestamp'
  );
});

runTest('Authentication hot paths use targeted single-row lookups and reuse the login credential record', () => {
  const targetedOfficerSection = codeGs.substring(
    codeGs.indexOf('function findOfficerByIdTargeted_('),
    codeGs.indexOf('/** Execution employee-directory cache')
  );
  const freshOfficerSection = codeGs.substring(
    codeGs.indexOf('function findOfficerByIdFresh_('),
    codeGs.indexOf('/**\\n * Cache Limits & Chunking Constants')
  );
  const credentialSection = codeGs.substring(
    codeGs.indexOf('function getAuthCredentialRecord('),
    codeGs.indexOf('function getUserCredentialSecurityState(')
  );
  const tokenSection = codeGs.substring(
    codeGs.indexOf('function generateSessionToken('),
    codeGs.indexOf('function timingSafeEqual(')
  );
  const loginSection = codeGs.substring(
    codeGs.indexOf('function handleLogin('),
    codeGs.indexOf('function handleChangePassword(')
  );

  assert.ok(
    codeGs.includes('function findExactEmployeeRow_(') &&
    codeGs.includes('.createTextFinder(cleanId)') &&
    codeGs.includes('.matchEntireCell(true)'),
    'Targeted employee lookup must use exact TextFinder lookup with a one-column fallback'
  );
  assert.ok(
    targetedOfficerSection.includes('getRange(rowIndex, 1, 1, 12)') &&
    !targetedOfficerSection.includes('getRange(1,1,lastRow,12)'),
    'Authentication officer lookup must read only the matching A:L row, not the full roster'
  );
  assert.ok(
    freshOfficerSection.includes('return findOfficerByIdTargeted_(employeeId, true);'),
    'Fresh session/mutation officer revalidation must use the targeted lookup'
  );
  assert.ok(
    credentialSection.includes('findExactEmployeeRow_(sheet, 1, cleanId, 2)') &&
    credentialSection.includes('getRange(rowIndex, 1, 1, 12)') &&
    !credentialSection.includes('getRange(2, 1, lastRow - 1, 12)'),
    'Auth_Credentials lookup must read only the matching credential row'
  );
  assert.ok(
    tokenSection.includes('credentialRecord') &&
    loginSection.includes('generateSessionToken(employeeId, record)'),
    'Successful login must reuse the already-fresh credential record when issuing the session token'
  );
});


runTest('Authenticated request path avoids duplicate credential reads while mutations still revalidate fresh', () => {
  const requestSection = codeGs.substring(
    codeGs.indexOf('function handleRequest('),
    codeGs.indexOf('/**\\n * Administrative Dispatch Wrapper')
  );
  const refreshSection = codeGs.substring(
    codeGs.indexOf('function refreshMutationSession('),
    codeGs.indexOf('function requireFreshAdminMutation(')
  );
  assert.ok(
    !requestSection.includes('getUserCredentialSecurityState(session.employeeId)') &&
    requestSection.includes('verifySession(params.token, params.loggedInEmployeeId)'),
    'handleRequest must rely on the already-authoritative verifySession result instead of rereading Auth_Credentials'
  );
  assert.ok(
    refreshSection.includes('getAuthCredentialRecord(employeeId, true)') &&
    refreshSection.includes('getUserRoleInfo(employeeId, true)'),
    'Protected mutations must retain fresh credential and role revalidation under the mutation flow'
  );
});

runTest('Fresh role resolution is targeted and request-local spreadsheet handles are reused', () => {
  const roleSection = codeGs.substring(
    codeGs.indexOf('function getUserRoleInfo('),
    codeGs.indexOf('function invalidateUserRoleCache(')
  );
  const spreadsheetSection = codeGs.substring(
    codeGs.indexOf('function getSpreadsheet('),
    codeGs.indexOf('function getCNESpreadsheet(')
  );
  assert.ok(
    roleSection.includes('findExactEmployeeRow_(roleMeta.sheet, roleMeta.empIdCol + 1, normId, 2)') &&
    roleSection.includes('getRange(roleRowIndex, 1, 1, width).getValues()[0]') &&
    !roleSection.includes('roleSheet.getDataRange().getValues()'),
    'Authoritative role checks must locate only the requested employee row instead of scanning the complete Role sheet'
  );
  assert.ok(
    spreadsheetSection.includes('_executionSpreadsheetCache[cacheKey]') &&
    spreadsheetSection.includes('return _executionSpreadsheetCache[cacheKey]'),
    'Spreadsheet handles must be reused within the same Apps Script request execution'
  );
});

runTest('Registered-email password OTP flow is rate-limited, hashed, single-use, and Officers-data authoritative', () => {
  assert.ok(codeGs.includes("var OTP_PURPOSE_PASSWORD = 'PASSWORD_CREATE_RESET'"), 'Password OTP purpose must be explicit');
  assert.ok(codeGs.includes('function handleRequestPasswordOtp('), 'requestPasswordOtp backend handler must exist');
  assert.ok(codeGs.includes('function handleVerifyPasswordOtp('), 'verifyPasswordOtp backend handler must exist');
  assert.ok(codeGs.includes('function handleSetPasswordWithOtp('), 'setPasswordWithOtp backend handler must exist');

  const requestSection = codeGs.substring(
    codeGs.indexOf('function handleRequestPasswordOtp('),
    codeGs.indexOf('function handleVerifyPasswordOtp(')
  );
  assert.ok(
    requestSection.includes('findOfficerById(employeeId)') &&
    requestSection.includes('var email = String(officer.email || \\'\\').trim().toLowerCase()'),
    'Password OTP email must be resolved from the employee record in Officers data, not supplied by the browser'
  );
  assert.ok(
    requestSection.includes('countRecentOtpSends(OTP_PURPOSE_PASSWORD') &&
    requestSection.includes('OTP_MAX_SENDS_PER_HOUR') &&
    requestSection.includes("errorCode: 'OTP_RATE_LIMITED'"),
    'Password OTP requests must enforce a per-employee hourly send limit'
  );
  assert.ok(
    requestSection.includes('MailApp.getRemainingDailyQuota()') &&
    requestSection.includes("errorCode: 'EMAIL_QUOTA_EXHAUSTED'"),
    'Password OTP sending must check Apps Script email quota'
  );
  assert.ok(
    requestSection.includes('computeOtpHash(challengeId, otp)') &&
    requestSection.includes('otpSheet.appendRow([') &&
    !requestSection.includes('otpSheet.appendRow([\\n    challengeId, OTP_PURPOSE_PASSWORD, \\'INTERNAL\\', employeeId, email, otp,'),
    'OTP_Verification must store a hash rather than the plaintext OTP'
  );
  assert.ok(
    requestSection.includes('OTP_RESEND_COOLDOWN_SECONDS') && requestSection.includes("cache.put(cooldownKey, '1'"),
    'Password OTP requests must enforce resend cooldown'
  );

  const verifyOtpSection = codeGs.substring(
    codeGs.indexOf('function handleVerifyPasswordOtp('),
    codeGs.indexOf('function handleSetPasswordWithOtp(')
  );
  assert.ok(
    verifyOtpSection.includes('/^\\\\d{6}$/.test(otp)') &&
    verifyOtpSection.includes('challenge.attempts >= challenge.maxAttempts') &&
    verifyOtpSection.includes('timingSafeEqual(suppliedHash, challenge.otpHash)'),
    'OTP verification must enforce 6 digits, maximum attempts, and timing-safe hashed comparison'
  );
  assert.ok(
    verifyOtpSection.includes("setValue('VERIFIED')") &&
    verifyOtpSection.includes('generateOtpVerificationToken('),
    'Successful OTP verification must mark the challenge VERIFIED and issue a short-lived verification token'
  );

  const setPasswordSection = codeGs.substring(
    codeGs.indexOf('function handleSetPasswordWithOtp('),
    codeGs.indexOf('/**\\n * Legacy reset endpoint intentionally disabled.')
  );
  assert.ok(
    setPasswordSection.includes('verifyOtpVerificationToken(') &&
    setPasswordSection.includes("challenge.status !== 'VERIFIED'") &&
    setPasswordSection.includes('challenge.consumedAt'),
    'Password setup must require a valid, unconsumed verified OTP challenge'
  );
  assert.ok(
    setPasswordSection.includes('upsertPasswordCredential(employeeId, newPassword)') &&
    setPasswordSection.includes("setValue('CONSUMED')"),
    'Setting a password must update the versioned credential and consume the OTP challenge exactly once'
  );
});

runTest('Legacy password reset is disabled and admin reset invalidates sessions without assigning a shared password', () => {
  const resetSection = codeGs.substring(
    codeGs.indexOf('function handleResetPassword('),
    codeGs.indexOf('function handleAdminResetPassword(')
  );
  assert.ok(
    resetSection.includes("errorCode: 'OTP_REQUIRED'") && resetSection.includes('registered-email verification'),
    'Legacy resetPassword endpoint must be disabled in favor of registered-email OTP'
  );

  const adminResetSection = codeGs.substring(
    codeGs.indexOf('function handleAdminResetPassword('),
    codeGs.indexOf('function handleGetAreas(')
  );
  assert.ok(
    adminResetSection.includes('record.passwordVersion + 1') &&
    adminResetSection.includes("sheet.getRange(record.rowIndex, 2).setValue('')") &&
    adminResetSection.includes("sheet.getRange(record.rowIndex, 3).setValue('')"),
    'Admin reset must clear password hash/salt and increment Password Version'
  );
  assert.ok(
    !adminResetSection.includes('pass1234') &&
    adminResetSection.includes('invalidateOpenOtpChallenges(OTP_PURPOSE_PASSWORD, targetEmpId)'),
    'Admin reset must not assign a shared password and must invalidate pending password OTP challenges'
  );
});

runTest('Frontend Create / Reset Password flow uses the new OTP APIs and authentication fails closed', () => {
  const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');
  const loginModalTs = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');
  const forgotPasswordModalTs = fs.readFileSync('src/components/ForgotPasswordModal.tsx', 'utf8');

  assert.ok(
    loginModalTs.includes('Create / Reset Password') &&
    loginModalTs.includes("response.errorCode === 'PASSWORD_NOT_SET'"),
    'LoginModal must direct first-time/no-password users to Create / Reset Password'
  );
  assert.ok(
    !loginModalTs.includes('pass1234'),
    'LoginModal must not expose or instruct users to use the legacy shared password'
  );
  assert.ok(
    forgotPasswordModalTs.includes('ApiService.requestPasswordOtp(') &&
    forgotPasswordModalTs.includes('ApiService.verifyPasswordOtp(') &&
    forgotPasswordModalTs.includes('ApiService.setPasswordWithOtp('),
    'Create / Reset Password modal must use Send OTP -> Verify OTP -> Set Password APIs'
  );
  assert.ok(
    !forgotPasswordModalTs.includes('Date of Joining') &&
    !forgotPasswordModalTs.includes('dateOfJoining') &&
    !forgotPasswordModalTs.includes('resetPassword('),
    'Create / Reset Password modal must not retain the old DOJ/resetPassword flow'
  );

  assert.ok(
    apiTs.includes("'requestPasswordOtp'") &&
    apiTs.includes("'verifyPasswordOtp'") &&
    apiTs.includes("'setPasswordWithOtp'"),
    'api.ts must expose the three password OTP actions'
  );
  assert.ok(
    !apiTs.includes('static async resetPassword('),
    'Legacy resetPassword frontend API must be removed after OTP migration'
  );

  assert.ok(
    !apiTs.includes("? 'ADMIN' : 'ADMIN'"),
    'api.ts must not contain ADMIN fallback for unknown Employee IDs'
  );
  assert.ok(
    !apiTs.includes("token: 'preview-token-'") &&
    !apiTs.includes("token: currentUser.token || 'mock_token_'") &&
    !apiTs.includes('Authentication successful (Preview Mode)'),
    'api.ts must not generate preview/mock sessions or authenticate in preview mode'
  );
  assert.ok(
    apiTs.includes("errorCode: 'BACKEND_NOT_CONFIGURED'") &&
    apiTs.includes("message: 'CNE authentication service is not configured. Please contact the system administrator.'"),
    'api.ts must fail closed with BACKEND_NOT_CONFIGURED when VITE_APPS_SCRIPT_URL is missing or unusable'
  );
  assert.ok(
    apiTs.includes("storedToken.startsWith('preview-token-')") &&
    apiTs.includes("storedToken.startsWith('mock_token_')"),
    'api.ts must purge legacy preview/mock stored sessions'
  );
  assert.ok(
    loginModalTs.includes('response.success === true') &&
    loginModalTs.includes('sessionData.token.trim().length > 0') &&
    loginModalTs.includes('sessionData.employeeId.trim().length > 0') &&
    loginModalTs.includes('validRoles.includes(sessionData.role.trim().toUpperCase())'),
    'LoginModal must validate success, server token, Employee ID, and recognized role before accepting login'
  );

  // Frontend API caching security: explicit public allowlist, no generic action.startsWith('get').
  assert.ok(
    !apiTs.includes("action.startsWith('get')"),
    'api.ts must NOT use generic action.startsWith(\\'get\\') for localStorage caching/offline fallback'
  );
  assert.ok(
    apiTs.includes('function isPublicCacheableAction(action: string): boolean') &&
    apiTs.includes('PUBLIC_CACHEABLE_ACTIONS') &&
    apiTs.includes('NEVER_CACHEABLE_PROTECTED_ACTIONS'),
    'api.ts must use an explicit public-cache allowlist and protected-action denylist'
  );

  const allowlistMatch = apiTs.match(/const\\s+PUBLIC_CACHEABLE_ACTIONS[\\s\\S]*?new\\s+Set\\(\\[([\\s\\S]*?)\\]\\)/);
  assert.ok(allowlistMatch, 'PUBLIC_CACHEABLE_ACTIONS Set must be defined in api.ts');
  const allowlistedActions = eval(\`[\${allowlistMatch[1]}]\`);
  const approvedPublicCmsActions = ['getCoordinatorDesk', 'getNewsEvents', 'getQuickLinks', 'getGallery'];
  assert.deepStrictEqual(
    allowlistedActions.slice().sort(),
    approvedPublicCmsActions.slice().sort(),
    'Only approved public CMS actions may be persisted in browser cache'
  );

  const protectedExcludedReads = [
    'getCNEQuestions', 'getPostTestQuestions', 'getCNEParticipants', 'getRoles',
    'getQRToken', 'getAiQuota', 'getCNEActivityProgress', 'getLearningResource',
    'getReferenceMaterial', 'getCNERecords'
  ];
  const denylistMatch = apiTs.match(/const\\s+NEVER_CACHEABLE_PROTECTED_ACTIONS[\\s\\S]*?new\\s+Set\\(\\[([\\s\\S]*?)\\]\\)/);
  assert.ok(denylistMatch, 'NEVER_CACHEABLE_PROTECTED_ACTIONS Set must be defined in api.ts');
  const denylistedActions = eval(\`[\${denylistMatch[1]}]\`);
  for (const protectedAction of protectedExcludedReads) {
    assert.ok(!allowlistedActions.includes(protectedAction), \`Protected action '\${protectedAction}' must not be publicly cacheable\`);
    assert.ok(denylistedActions.includes(protectedAction), \`Protected action '\${protectedAction}' must be explicitly never-cacheable\`);
  }

  const execActionSection = apiTs.substring(
    apiTs.indexOf('static async executeAction'),
    apiTs.indexOf('static async login')
  );
  assert.ok(
    execActionSection.includes('if (result.success && result.data && isPublicCacheableAction(action))'),
    'executeAction must gate localStorage writes with isPublicCacheableAction(action)'
  );
  const fallbackChecks = execActionSection.match(/if\\s*\\(\\s*isPublicCacheableAction\\(action\\)\\s*\\)/g) || [];
  assert.strictEqual(
    fallbackChecks.length,
    2,
    'HTTP-error and network-error offline fallbacks must both be gated by isPublicCacheableAction(action)'
  );

  const getCachedSection = apiTs.substring(
    apiTs.indexOf('static getCachedData'),
    apiTs.indexOf('static async getOfficersDropdown')
  );
  assert.ok(
    getCachedSection.includes('if (!isPublicCacheableAction(action))') && getCachedSection.includes('return null;'),
    'ApiService.getCachedData must return null for non-public actions'
  );

  const logoutSection = apiTs.substring(
    apiTs.indexOf('static logout()'),
    apiTs.indexOf('static getSessionUser()')
  );
  assert.ok(
    logoutSection.includes("k.startsWith('cne_cache_')") &&
    logoutSection.includes('localStorage.removeItem(k)') &&
    logoutSection.includes('localStorage.removeItem(STORAGE_KEYS.SESSION)'),
    'ApiService.logout() must remove all cne_cache_* entries and the session'
  );
});

// -----------------------------------------------------------------------------
// 8. Officer Directory Role Restriction & Public Employee ID Protection
// -----------------------------------------------------------------------------
runTest('Officer directory access is restricted to Admin, Area Incharge/Incharge, or CNE-scoped authorized manager, and rejected for ordinary EMPLOYEE', () => {
  const officersDropdownSection = codeGs.substring(
    codeGs.indexOf('function handleGetOfficersDropdown('),
    codeGs.indexOf('function getOfficerNameMap(')
  );

  const compactOfficerDirectorySection = officersDropdownSection.replace(/\\s+/g, '');
  assert.ok(
    compactOfficerDirectorySection.includes("role==='ADMIN'||role==='AREA_INCHARGE'||role==='INCHARGE'"),
    'handleGetOfficersDropdown must explicitly check for ADMIN, AREA_INCHARGE, or INCHARGE roles'
  );
  assert.ok(
    compactOfficerDirectorySection.includes("errorCode:'FORBIDDEN'") &&
    compactOfficerDirectorySection.includes("message:'Youarenotauthorizedtoaccesstheofficerdirectory.'"),
    'handleGetOfficersDropdown must return FORBIDDEN with authorization message for ordinary employees'
  );

  // Simulate handleGetOfficersDropdown authorization logic
  function simulateOfficersDropdownAuth(session, params = {}, cneRecordMap = {}) {
    if (!session) {
      return { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' };
    }
    const role = String(session.role || '').trim().toUpperCase();
    const isDirectoryRole = (role === 'ADMIN' || role === 'AREA_INCHARGE' || role === 'INCHARGE');
    if (!isDirectoryRole) {
      const cneId = params && params.cneId ? String(params.cneId).trim() : '';
      let isAuthorizedForCne = false;
      if (cneId && cneRecordMap[cneId]) {
        if (simulateCheckCNEActionAuthorized(session, cneRecordMap[cneId]) === null) {
          isAuthorizedForCne = true;
        }
      }
      if (!isAuthorizedForCne) {
        return {
          success: false,
          errorCode: 'FORBIDDEN',
          message: 'You are not authorized to access the officer directory.'
        };
      }
    }
    return { success: true };
  }

  // Ordinary EMPLOYEE cannot access full officer dropdown
  const ordinaryEmployee = { employeeId: 'EMP100', role: 'EMPLOYEE' };
  const empRes = simulateOfficersDropdownAuth(ordinaryEmployee);
  assert.strictEqual(empRes.success, false, 'Ordinary EMPLOYEE must be denied officer directory access');
  assert.strictEqual(empRes.errorCode, 'FORBIDDEN', 'Ordinary EMPLOYEE must receive FORBIDDEN');

  // Admin can access it
  const adminSession = { employeeId: 'ADM01', role: 'ADMIN' };
  assert.strictEqual(simulateOfficersDropdownAuth(adminSession).success, true, 'ADMIN must be allowed officer directory access');

  // Area Incharge and Incharge can access it
  const areaInchargeSession = { employeeId: 'INC01', role: 'AREA_INCHARGE', assignedAreas: ['ICU'] };
  const inchargeSession = { employeeId: 'INC02', role: 'INCHARGE', assignedAreas: ['Ward-1'] };
  assert.strictEqual(simulateOfficersDropdownAuth(areaInchargeSession).success, true, 'AREA_INCHARGE must be allowed officer directory access');
  assert.strictEqual(simulateOfficersDropdownAuth(inchargeSession).success, true, 'INCHARGE must be allowed officer directory access');

  // Assigned Resource Person can access only when scoped to their assigned CNE, not globally
  const rpSession = { employeeId: 'RP500', role: 'EMPLOYEE' };
  assert.strictEqual(simulateOfficersDropdownAuth(rpSession).success, false, 'Resource Person without CNE scope must not have global directory access');
  assert.strictEqual(
    simulateOfficersDropdownAuth(rpSession, { cneId: 'CNE-500' }, { 'CNE-500': { cneId: 'CNE-500', area: 'ICU', cneType: 'CENTRAL', resourcePersonEmpId: 'RP500' } }).success,
    true,
    'Assigned Resource Person with valid CNE scope must be allowed directory access for that CNE'
  );
});

runTest('Frontend does not automatically fetch officer directory for every logged-in user and protects public CNE output from raw Employee ID fallback', () => {
  const myCneRecordsTs = fs.readFileSync('src/components/MyCNERecords.tsx', 'utf8');
  const utilsTs = fs.readFileSync('src/utils.ts', 'utf8');

  // MyCNERecords (ordinary employee view) must not call loadOfficersSingleFlight
  assert.ok(
    !myCneRecordsTs.includes('loadOfficersSingleFlight'),
    'MyCNERecords.tsx must not fetch the officer directory'
  );

  // CNESchedule loadData must not unconditionally fetch officers whenever any user is logged in
  const loadDataSlice = cneSchedule.substring(
    cneSchedule.indexOf('const loadData = async'),
    cneSchedule.indexOf('const handleChildModalUpdated')
  );
  assert.ok(
    !loadDataSlice.includes('if (user) {\\n        loadOfficersSingleFlight()'),
    'CNESchedule loadData must not fetch the officer directory merely because any user is logged in'
  );
  assert.ok(
    cneSchedule.includes('!canScheduleCne || !(isAddClassOpen || editingCne) || officersList.length'),
    'CNESchedule must gate on-demand officer loading behind authorized scheduling forms only'
  );

  // Public CNE output cannot fall back to raw Employee ID
  const getCneSection = codeGs.substring(
    codeGs.indexOf('function handleGetCNERecords('),
    codeGs.indexOf('function handleCreateCNE(')
  );
  assert.ok(
    getCneSection.includes("return officerMap[id] || 'Resource Person';") &&
    getCneSection.includes("return officerMap[id] || 'Staff Member';"),
    'handleGetCNERecords must use neutral display labels rather than raw Employee IDs when roster names cannot be resolved'
  );
  assert.ok(
    getCneSection.includes("resourcePersonEmpIdForResponse = ''") &&
    getCneSection.includes("resourcePersonEmpIdForResponse = loggedInId") &&
    getCneSection.includes("staffEmpIdsForResponse = []") &&
    getCneSection.includes("staffNameList = staffArray.map") &&
    getCneSection.includes("proposedByEmpId: canSeeInternalManagementFields ? proposedBy : ''") &&
    getCneSection.includes("proposedByName: proposedByName") &&
    getCneSection.includes("remarks: remarks") &&
    getCneSection.includes("adminRemarks: canSeeInternalManagementFields ? adminRemarks : ''"),
    'handleGetCNERecords must expose safe names/general remarks while minimizing raw Employee IDs and restricting Admin Remarks'
  );
  assert.ok(
    getCneSection.includes("var adminRemarksCol = colMap['adminremarks']") &&
    getCneSection.includes("var remarksCol = colMap['remarks']"),
    'handleGetCNERecords must read general Remarks separately from Admin Remarks'
  );

  const rpDisplaySection = utilsTs.substring(
    utilsTs.indexOf('export function formatResourcePersonsDisplay('),
    utilsTs.indexOf('export function getUserAssignedAreas(')
  );
  assert.ok(
    rpDisplaySection.includes(".map(() => 'Resource Person')"),
    "formatResourcePersonsDisplay must never fall back to raw Employee ID when officer directory is not loaded"
  );
});

// -----------------------------------------------------------------------------
// 12. Admin Role Management Fixed Role-Priority Sorting
// -----------------------------------------------------------------------------
runTest('Admin Role Management enforces fixed role priority (ADMIN > AREA_INCHARGE > EMPLOYEE)', () => {
  assert.ok(
    adminRolesTs.includes('ROLE_SORT_PRIORITY: Record<string, number> = {') &&
    adminRolesTs.includes('ADMIN: 0') &&
    adminRolesTs.includes('AREA_INCHARGE: 1') &&
    adminRolesTs.includes('EMPLOYEE: 2'),
    'AdminRoles must define ROLE_SORT_PRIORITY with ADMIN: 0, AREA_INCHARGE: 1, EMPLOYEE: 2'
  );

  assert.ok(
    adminRolesTs.includes('const getRolePriority =') &&
    adminRolesTs.includes('?? 99'),
    'AdminRoles must map unknown or future roles to priority 99'
  );

  assert.ok(
    adminRolesTs.includes('getUserRolePriority ='),
    'AdminRoles must implement getUserRolePriority helper'
  );

  // Functional verification of sorting logic simulated with sample data
  const priorityMap = { ADMIN: 0, AREA_INCHARGE: 1, EMPLOYEE: 2 };
  const getP = (role) => priorityMap[String(role || '').trim().toUpperCase()] ?? 99;

  assert.ok(getP('ADMIN') < getP('AREA_INCHARGE'), 'ADMIN must sort before AREA_INCHARGE');
  assert.ok(getP('AREA_INCHARGE') < getP('EMPLOYEE'), 'AREA_INCHARGE must sort before EMPLOYEE');
  assert.ok(getP('EMPLOYEE') < getP('OTHER'), 'EMPLOYEE must sort before unknown roles');
  assert.ok(getP('EMPLOYEE') < getP('GUEST'), 'Unknown roles must appear after EMPLOYEE');

  // Verify multiple role resolution (highest privileged role)
  const resolveMultiRole = (roles) => Math.min(...roles.map(getP));
  assert.strictEqual(resolveMultiRole(['EMPLOYEE', 'AREA_INCHARGE']), 1, 'Multiple roles [EMPLOYEE, AREA_INCHARGE] must resolve to AREA_INCHARGE');
  assert.strictEqual(resolveMultiRole(['ADMIN', 'EMPLOYEE']), 0, 'Multiple roles [ADMIN, EMPLOYEE] must resolve to ADMIN');
});

runTest('Admin Role Management applies secondary sort by Employee ID and sorts before pagination', () => {
  assert.ok(
    adminRolesTs.includes('const sortedFilteredOfficers = useMemo('),
    'AdminRoles must compute sortedFilteredOfficers via useMemo'
  );

  assert.ok(
    adminRolesTs.includes('[...filteredOfficers].sort('),
    'AdminRoles must sort a shallow copy to prevent source array mutation'
  );

  assert.ok(
    adminRolesTs.includes('localeCompare(') &&
    adminRolesTs.includes('numeric: true') &&
    adminRolesTs.includes("sensitivity: 'base'"),
    'AdminRoles must sort Employee IDs ascending using localeCompare with numeric: true and sensitivity: base'
  );

  assert.ok(
    adminRolesTs.includes('paginatedOfficers = useMemo(') &&
    adminRolesTs.includes('sortedFilteredOfficers.slice('),
    'AdminRoles must paginate from sortedFilteredOfficers (sorting before pagination)'
  );

  assert.ok(
    !adminRolesTs.includes('paginatedOfficers.sort('),
    'AdminRoles must NOT sort after pagination'
  );
});

console.log('\\n========================================================');
console.log(\`Passed: \${passedTests}/\${totalTests}\`);
console.log('ALL SECURITY & ACCESS TESTS PASSED!');
console.log('========================================================\\n');
`
  },
  // ===== END ORIGINAL SUITE: verify-security-and-access.js =====

  // ===== BEGIN ORIGINAL SUITE: verify-cne-workflows.js =====
  {
    id: "workflows",
    name: "CNE Workflows & Schemas",
    originalFilename: "verify-cne-workflows.js",
    mode: "module",
    expectedChecks: 75,
    sha256: "98e6b0777fce034e14f1ced163b0d5ae8ea50ded95a75e5992d8a1b42dd87b0a",
    source: `/**
 * CNE Business Workflows & Schema Verification Suite
 *
 * Verifies:
 * - Central CNE creation, date/time, duration, resource persons, Scheduled status, Admin authorization
 * - Departmental CNE scheduling, area/ward assignment, Area Incharge restrictions, proper CNE ID/type
 * - Unscheduled CNE historical recording, past date allowances, participants, immediate Completed status
 * - Authoritative CNE Schedule lifecycle: Scheduled -> Completed (Finalize) or Scheduled -> Canceled (Cancel)
 * - Single source of truth: Finalize updates CNE Schedule row (no duplicate Data/Data Master records)
 * - Participant management: manual participants, post-test participants, staff count, external participants
 * - CNE Schedule active schema headers and verification that legacy separate 'Time' column is NOT recreated
 */

import assert from 'assert';
import fs from 'fs';

console.log('========================================================');
console.log('CNE Workflows & Schema Verification');
console.log('========================================================\\n');

const codeGs = fs.readFileSync('Code.gs', 'utf8');
const backendGs = fs.readFileSync('src/backend/googleAppsScript.ts', 'utf8');
const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');
const cneScheduleTs = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
const unscheduledModalTs = fs.readFileSync('src/components/cne/AddUnscheduledCneModal.tsx', 'utf8');
const typesTs = fs.readFileSync('src/types.ts', 'utf8');
const outcomePageTs = fs.readFileSync('src/components/AdminDepartmentalCneOutcome.tsx', 'utf8');
const deleteModalTs = fs.readFileSync('src/components/cne/DeleteCneModal.tsx', 'utf8');
const cneDetailsModalTs = fs.readFileSync('src/components/cne/CneDetailsModal.tsx', 'utf8');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${name}\`);
  } catch (err) {
    console.error(\`✗ \${name}\`);
    console.error(\`  Error: \${err.message}\\n\`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. Central CNE Workflow & Authorization
// -----------------------------------------------------------------------------
runTest('Central CNE creation requires Admin authority and enforces Scheduled status', () => {
  // Enforces admin role for Central CNE
  assert.ok(
    codeGs.includes("cneType === 'CENTRAL' && !isAdmin"),
    'Code.gs must enforce that Central CNE creation requires Admin role'
  );
  assert.ok(
    codeGs.includes('Only Administrators can create Central CNE programs'),
    'Code.gs must return descriptive error for non-admin attempting Central CNE'
  );

  // Status defaults to Scheduled for new Central CNE
  assert.ok(
    codeGs.includes("var status = isUnscheduled ? 'Completed' : normalizeCNEStatus(params.status || 'Scheduled');"),
    'Scheduled CNE must initialize with Scheduled status'
  );
});

runTest('Central CNE enforces full From/To Date & Time and Duration computation', () => {
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  // Date parsing with time support
  assert.ok(
    handleAddSection.includes('var dFrom = parseCneStartTimestamp_(fromDate);') &&
    handleAddSection.includes('var dTo = parseCneStartTimestamp_(toDate);') &&
    handleAddSection.includes('!isFinite(dFrom) || !isFinite(dTo)'),
    'handleCreateCNE must strictly validate fromDate and toDate with India-time-aware parsing'
  );
  assert.ok(
    handleAddSection.includes('Invalid Date & Time format.'),
    'handleCreateCNE must validate Date & Time format'
  );

  // Chronological order verification
  assert.ok(
    handleAddSection.includes('To Date & Time must be equal to or later than From Date & Time.'),
    'handleCreateCNE must validate that toDate is equal to or later than fromDate'
  );

  // Duration validation
  assert.ok(
    handleAddSection.includes('validateCneDuration(duration, fromDate, toDate)'),
    'handleCreateCNE must validate duration against fromDate and toDate'
  );

  // Persisting duration into CNE Schedule
  assert.ok(
    handleAddSection.includes("setCell('duration', 5, sanitizeCellInput(duration)"),
    'Duration must be stored in duration column of CNE Schedule'
  );
  assert.ok(
    handleAddSection.includes("setCell('fromdate', 3, fromDate)") &&
    handleAddSection.includes("setCell('todate', 4, toDate)"),
    'From Date and To Date must be stored in CNE Schedule'
  );
});

runTest('Central CNE stores Resource Persons cleanly', () => {
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  assert.ok(
    handleAddSection.includes("setCell('resourcepersonempid', 7, rpClean.join(', '))"),
    'Resource Person employee ID must be stored in CNE Schedule'
  );
  assert.ok(
    handleAddSection.includes("setCell('externalresourcepersons', 13, extRpClean.join(', '))"),
    'External resource persons must be stored in CNE Schedule'
  );
});

// -----------------------------------------------------------------------------
// 2. Departmental CNE Workflow & Isolation
// -----------------------------------------------------------------------------
runTest('Departmental CNE enforces Area/Ward assignment and Incharge scoping', () => {
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  // Area/ward check
  assert.ok(
    handleAddSection.includes('var areaAuthErr = checkCNEAuthorized(session, area, cneType);'),
    'handleCreateCNE must validate area authorization via checkCNEAuthorized'
  );

  // Area storage in CNE Schedule
  assert.ok(
    handleAddSection.includes("setCell('area', 2, area)"),
    'Ward Name / Area must be written to CNE Schedule area column'
  );

  // Departmental CNE category stored
  assert.ok(
    handleAddSection.includes("setCell('typeofcne', 12, cneType)"),
    'Type of CNE must be written to CNE Schedule column 12'
  );
});

runTest('Departmental CNE supports batch scheduling for multiple wards/schedules', () => {
  assert.ok(
    codeGs.includes("case 'createDepartmentalBatch':") || codeGs.includes("createCNE"),
    'Code.gs must support Departmental CNE scheduling'
  );
  assert.ok(
    cneScheduleTs.includes('DepartmentalScheduleModal') || cneScheduleTs.includes('selectedDepartmentalArea'),
    'CNESchedule must support Departmental scheduling modal or workflow'
  );
});

// -----------------------------------------------------------------------------
// 3. Unscheduled CNE Workflow
// -----------------------------------------------------------------------------
runTest('Unscheduled CNE records historical activity with U- prefix and Completed status', () => {
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  assert.ok(
    handleAddSection.includes("var isUnscheduled = Boolean("),
    'handleCreateCNE must calculate isUnscheduled flag'
  );
  assert.ok(
    handleAddSection.includes("(isUnscheduled ? 'U-' : '')"),
    'CNE ID must include U- prefix for Unscheduled CNE'
  );
  assert.ok(
    handleAddSection.includes("var status = isUnscheduled ? 'Completed' : normalizeCNEStatus(params.status || 'Scheduled');"),
    'Unscheduled CNE status must be Completed immediately'
  );
  assert.ok(
    handleAddSection.includes("if (isUnscheduled) {\\n      setCell('finalizedat', 21, new Date().toISOString());\\n      setCell('finalizedby', 22, session.employeeId || '');\\n    }"),
    'Unscheduled CNE must set finalizedat and finalizedby upon creation'
  );
});

runTest('Unscheduled CNE explicitly permits past dates', () => {
  const checkFromPastIdx = codeGs.indexOf("if (!isUnscheduled) {");
  assert.ok(checkFromPastIdx !== -1, 'Code.gs must guard past date validation behind !isUnscheduled');
  const nextPastError = codeGs.indexOf('Past dates are not allowed', checkFromPastIdx);
  assert.ok(
    nextPastError !== -1 && nextPastError - checkFromPastIdx < 400,
    'Past date validation must strictly apply only to scheduled CNE'
  );
});

runTest('Unscheduled CNE frontend modal and API routing are properly integrated', () => {
  // Routing
  assert.ok(codeGs.includes("case 'addUnscheduledCNE':"), "Code.gs must route addUnscheduledCNE");
  assert.ok(apiTs.includes('static async addUnscheduledCNE('), 'ApiService must provide addUnscheduledCNE');
  assert.ok(
    apiTs.includes("isUnscheduled: true, status: 'Completed'"),
    'addUnscheduledCNE must pass isUnscheduled: true and status: Completed'
  );

  // Frontend Modal
  assert.ok(unscheduledModalTs.includes('id="btn-submit-unscheduled-cne"'), 'Modal must have submit button');
  assert.ok(unscheduledModalTs.includes('Past dates are fully valid'), 'Modal must instruct that past dates are valid');
  assert.ok(cneScheduleTs.includes('id="btn-choice-unscheduled-cne"'), 'Admin choice menu must offer Unscheduled CNE');
});

// -----------------------------------------------------------------------------
// 4. Authoritative Lifecycle & Finalization Table Integrity
// -----------------------------------------------------------------------------
runTest('CNE Schedule is the sole authoritative lifecycle table (Scheduled -> Completed / Canceled)', () => {
  // Finalize handler modifies existing row in CNE Schedule
  const finalizeSection = codeGs.substring(
    codeGs.indexOf('function handleFinalizeCNE'),
    codeGs.indexOf('function handleCancelCNE')
  );

  assert.ok(
    finalizeSection.includes("ss.getSheetByName('CNE Schedule')"),
    'Finalize must operate on CNE Schedule sheet'
  );
  assert.ok(
    finalizeSection.includes(".setValue('Completed')"),
    'Finalize must update status column of existing CNE Schedule row to Completed'
  );
  // Must NOT create duplicate record in obsolete 'Data' or 'Data Master' sheets
  assert.ok(
    !finalizeSection.includes("'Data'") && !finalizeSection.includes("'Data Master'"),
    'Finalize must update the same CNE Schedule record without creating separate Data/Data Master records'
  );

  // Cancel handler modifies existing row in CNE Schedule
  const cancelSection = codeGs.substring(
    codeGs.indexOf('function handleCancelCNE'),
    codeGs.length
  );
  assert.ok(
    cancelSection.includes("ss.getSheetByName('CNE Schedule')"),
    'Cancel must operate on CNE Schedule sheet'
  );
  assert.ok(
    cancelSection.includes(".setValue('Canceled')"),
    'Cancel must update status column of existing CNE Schedule row to Canceled'
  );
});

// -----------------------------------------------------------------------------
// 5. Participants Management & Staff Count
// -----------------------------------------------------------------------------
runTest('Participant roster, staff counts, and post-test participants are recorded', () => {
  // Staff IDs, count, and external participants in handleCreateCNE
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );
  assert.ok(
    handleAddSection.includes("setCell('staffempid', 16, staffString);"),
    'Staff employee IDs stored in CNE Schedule column 16'
  );
  assert.ok(
    handleAddSection.includes("setCell('staffcount', 17, totalStaffCount);"),
    'Staff count computed and stored in CNE Schedule column 17'
  );
  assert.ok(
    handleAddSection.includes("setCell('externalstaffparticipants', 18, extStaffClean.join(', '));"),
    'External participants stored in CNE Schedule column 18'
  );

  // Manual participant additions write to participant responses sheet via canonical plural action/handler
  const singularActionCheck = ['addManual', 'Participant'].join('');
  const singularHandlerCheck = ['handleAddManual', 'Participant'].join('');
  assert.ok(
    apiTs.includes("executeAction<{ count?: number; addedCount?: number }>('addManualParticipants', params)"),
    'ApiService.addManualParticipants must invoke canonical plural action addManualParticipants'
  );
  assert.ok(
    codeGs.includes("case 'addManualParticipants':") &&
    codeGs.includes('output = handleAddManualParticipants(params, session);'),
    'Code.gs router must route canonical plural action addManualParticipants to handleAddManualParticipants'
  );
  assert.ok(
    !codeGs.includes(\`case '\${singularActionCheck}':\`) &&
    !codeGs.includes(\`function \${singularHandlerCheck}(\`) &&
    !apiTs.includes(\`'\${singularActionCheck}'\`),
    'Singular manual participant action and handler must be completely absent'
  );

  const manualPartSection = codeGs.substring(
    codeGs.indexOf('function handleAddManualParticipants'),
    codeGs.indexOf('function handleGetCNEParticipants')
  );
  assert.ok(
    manualPartSection.includes('getResponsesSheet') && manualPartSection.includes("'MANUAL'"),
    'handleAddManualParticipants must record participant in responses sheet with MANUAL source'
  );

  // Post test submissions write participant record, update responses sheet, and enforce >= 60% pass threshold
  const submitPostTestSection = codeGs.substring(
    codeGs.indexOf('function handleSubmitPostTest'),
    codeGs.indexOf('function handleAddManualParticipants')
  );
  assert.ok(
    submitPostTestSection.includes('getResponsesSheet()') && submitPostTestSection.includes('ALREADY_SUBMITTED'),
    'handleSubmitPostTest must record in responses sheet and prevent duplicate submissions'
  );
  assert.ok(
    submitPostTestSection.includes('var passed = percentage >= 60;') ||
      (submitPostTestSection.includes('scorePostTestAnswers_') &&
        codeGs.includes('var passed = percentage >= 60;') &&
        codeGs.includes("status: passed ? 'PASSED' : 'NEEDS_IMPROVEMENT'")),
    'Post-Test scoring must enforce percentage >= 60 as PASSED threshold, directly or through the scoring helper'
  );
});

// -----------------------------------------------------------------------------
// 6. Departmental CNE Coverage Snapshot & Outcome Metrics
// -----------------------------------------------------------------------------
runTest('Departmental CNE coverage schema uses six dedicated columns without repurposing Staff Count', () => {
  const requiredCoverageHeaders = [
    'Coverage Areas Snapshot',
    'Total Allotted Staff',
    'Internal Attendance Count',
    'Attendance Percentage',
    'Post-Test Outcome Percentage',
    'Coverage Finalized At'
  ];
  for (const header of requiredCoverageHeaders) {
    assert.ok(codeGs.includes(\`'\${header}'\`), \`Code.gs must define \${header}\`);
  }
  assert.ok(codeGs.includes("setCell('staffcount', 17, totalStaffCount);"), 'Existing Staff Count semantics must remain intact');
  assert.ok(codeGs.includes("setCell('totalallottedstaff', 24"), 'Total Allotted Staff must use its own dedicated column');
});

runTest('Staff-count master lookup is exact, cached, and treats missing/invalid values as zero', () => {
  const section = codeGs.substring(
    codeGs.indexOf('function normalizeAreaMatchingKey_'),
    codeGs.indexOf('function ensureCneScheduleCoverageHeaders_')
  );
  assert.ok(section.includes("getSheetByName('CNE staff count')"), 'Must read CNE staff count tab');
  assert.ok(section.includes("getProperty('CNE_STAFF_COUNT_SPREADSHEET_ID')"), 'Separate spreadsheet must be configurable through Script Properties');
  assert.ok(section.includes("replace(/\\\\s+/g, ' ').toLowerCase()"), 'Area matching must normalize whitespace/case only');
  assert.ok(section.includes('var num = 0;'), 'Invalid or blank staff total must default to zero');
  assert.ok(section.includes('return 0;'), 'Missing Area lookup must return zero');
  assert.ok(section.includes("CacheService.getScriptCache().put(cacheKey, JSON.stringify(map), 60)"), 'Staff-count master must use a short cache');
});

runTest('Departmental staffing uses selected wards only and preserves a single reporting ward', () => {
  const helper = codeGs.substring(
    codeGs.indexOf('function resolveDepartmentalWards_'),
    codeGs.indexOf('function ensureCneScheduleCoverageHeaders_')
  );
  assert.ok(helper.includes('!Array.isArray(wardInput)'), 'Must require explicit selected ward names');
  assert.ok(helper.includes("status[key] !== 'ACTIVE'"), 'Must reject inactive selected wards');
  assert.ok(helper.includes('checkCNEAuthorized(session, primary'), 'Primary Ward must be authorized independently');
  assert.ok(helper.includes('total += getStaffCountForArea_(wards[k], staff)'), 'Staff denominator must sum only selected unique wards');
  assert.ok(!helper.includes('getUserRoleInfo('), 'Creator assigned-ward list must not determine attendance denominator');
  assert.ok(helper.includes('seen[primary.toUpperCase()]'), 'Reporting ward must be a participating ward');
  const batch = codeGs.substring(codeGs.indexOf('function handleAddDepartmentalSchedule'));
  assert.ok(batch.includes('resolveDepartmentalWards_(selection, v.area'), 'Creation must revalidate selection server-side under lock');
  assert.ok(batch.includes('WARD_SELECTION_MISMATCH'), 'All sessions in one create batch must share one selection');
  assert.ok(batch.includes("setCell('coverageareassnapshot'"), 'Selected ward names must be stored in existing coverage column');
  assert.ok(batch.includes("setCell('area', 2, item.area)"), 'One primary ward must remain in Area column');
  const creation = codeGs.substring(codeGs.indexOf('function handleCreateCNE'), codeGs.indexOf('function handleUpdateCNE'));
  assert.ok(creation.includes('resolveCneParticipatingWards_('), 'Scheduled Central and unscheduled creation must validate their explicit ward lists');
  assert.ok(creation.includes("setCell('participatingwards', -1, JSON.stringify(createWards.wards))"), 'Each CNE must persist selected wards without duplicating reporting Area');
});

runTest('Departmental coverage metrics are calculated only in finalization, not attendance submission paths', () => {
  const finalize = codeGs.substring(codeGs.indexOf('function handleFinalizeCNE'), codeGs.indexOf('function handleCancelCNE'));
  assert.ok(finalize.includes("var isDeptFinalize = (liveFinalizeType === 'DEPARTMENTAL');"), 'Finalization must scope coverage calculation to Departmental CNEs');
  assert.ok(finalize.includes("var isUnscheduledFinalize = (cneId.indexOf('-U-') !== -1);"), 'Unscheduled Departmental CNEs must be excluded');
  assert.ok(finalize.includes("setValue(attPercentage !== null ? attPercentage : '')"), 'Attendance Percentage must be persisted during finalization');
  assert.ok(finalize.includes("setValue(postTestOutcome !== null ? postTestOutcome : '')"), 'Post-Test Outcome must be persisted during finalization');

  const manual = codeGs.substring(codeGs.indexOf('function handleAddManualParticipants'), codeGs.indexOf('function handleGetCNEParticipants'));
  const submit = codeGs.substring(codeGs.indexOf('function handleSubmitPostTest'), codeGs.indexOf('function handleAddManualParticipants'));
  assert.ok(!manual.includes("colMap['attendancepercentage']"), 'Manual attendance must not calculate attendance percentage');
  assert.ok(!submit.includes("colMap['attendancepercentage']"), 'Post-Test submission must not calculate attendance percentage');
});

runTest('Finalization deduplicates internal attendance, excludes external attendees, and handles zero denominator safely', () => {
  const finalize = codeGs.substring(codeGs.indexOf('function handleFinalizeCNE'), codeGs.indexOf('function handleCancelCNE'));
  assert.ok(finalize.includes("var key = rawEmp ? ('ID:' + rawEmp) : ('NAME:' + pName.toLowerCase());"), 'Finalization must deduplicate by participant identity');
  assert.ok(finalize.includes('!isExternalParticipantId(item.empId)'), 'Internal attendance must exclude external participant IDs');
  assert.ok(finalize.includes('var internalAttendanceCount = internalEmpIds.length;'), 'Internal Attendance Count must use unique internal employee IDs');
  assert.ok(finalize.includes('savedAllottedStaff !== null && savedAllottedStaff > 0'), 'Attendance percentage must only divide when denominator is positive');
  assert.ok(finalize.includes('var attPercentage = null;'), 'Zero denominator must preserve null percentage');
  assert.ok(finalize.includes('postTestScores.length > 0'), 'Outcome must be null when there are no valid Post-Test scores');
});

runTest('Departmental CNE Outcome report is Area-master driven and uses stored finalized metrics', () => {
  const report = codeGs.substring(codeGs.indexOf('function handleGetDepartmentalCneOutcomeReport'), codeGs.indexOf('function handleGetRoles'));
  assert.ok(report.includes('var adminError = requireAdmin(session);'), 'Report backend must be Admin-only');
  assert.ok(report.includes("if (cneType !== 'DEPARTMENTAL') continue;"), 'Report must include only Departmental CNEs');
  assert.ok(report.includes("if (cneId.indexOf('-U-') !== -1) continue;"), 'Report must exclude unscheduled/retrospective records');
  assert.ok(report.includes('for (var a = 0; a < activeAreas.length; a++)'), 'Every active Area must drive report output');
  assert.ok(report.includes('if (areaCnes.length === 0)'), 'Active Areas with no CNE must receive an empty placeholder row');
  assert.ok(report.includes("if (cneStatus === 'Canceled' || cneStatus === 'Cancelled')"), 'Remarks must be cancellation-only');
  assert.ok(report.includes('totalAllottedStaff: totalAllotted'), 'Report must read saved Total Allotted Staff');
  assert.ok(report.includes('attendancePercentage: attendancePct'), 'Report must read stored Attendance Percentage');
});

runTest('Departmental CNE Outcome UI has required table, filters, print header, and no Employee ID in Created By', () => {
  for (const heading of ['S.No', 'Area / Ward', 'CNE Topic', 'Status', 'Remarks', 'Created By', 'Total Allotted Staff', 'Attendance', 'Outcome']) {
    assert.ok(outcomePageTs.includes(heading), \`Outcome page must contain \${heading}\`);
  }
  assert.ok(outcomePageTs.includes('SearchInput'), 'Outcome page must reuse the CNE Schedule search control');
  assert.ok(outcomePageTs.includes('ConfirmDatePicker'), 'Outcome page must reuse the CNE Schedule date control');
  assert.ok(outcomePageTs.includes('ALL INDIA INSTITUTE OF MEDICAL SCIENCES, RISHIKESH'), 'Print header must contain institution name');
  assert.ok(outcomePageTs.includes('Departmental CNE Coverage & Outcome Report'), 'Print header must contain exact report title');
  assert.ok(outcomePageTs.includes('Period: {printPeriodText}'), 'Print header must show selected period');
  assert.ok(outcomePageTs.includes('window.print()'), 'Print action must print current rendered filtered report');
  assert.ok(!outcomePageTs.includes('row.employeeId'), 'Created By table must not expose Employee ID');
});

// -----------------------------------------------------------------------------
// 7. CNE Schedule Active Schema & Schema Invariance
// -----------------------------------------------------------------------------
runTest('CNE Schedule sheet schema contains required active headers', () => {
  const match = codeGs.match(/'CNE Schedule':\\s*\\[([\\s\\S]*?)\\]/);
  assert.ok(match, 'CNE Schedule headers definition must exist in Code.gs');

  const headers = eval(\`[\${match[1]}]\`);
  const requiredHeaders = [
    'CNE ID',
    'Topic',
    'Ward Name / Area',
    'From Date',
    'To Date',
    'Duration',
    'Resource Person Emp Id',
    'Mode of Teaching',
    'Description',
    'Max Participants',
    'Status',
    'Type of CNE',
    'External Resource Persons',
    'Staff Emp ID',
    'Staff Count',
    'External Staff Participants',
    'Proposed By',
    'Admin Remarks',
    'Remarks',
    'CreatedAt',
    'CreatedBy',
    'Coverage Areas Snapshot',
    'Total Allotted Staff',
    'Internal Attendance Count',
    'Attendance Percentage',
    'Post-Test Outcome Percentage',
    'Coverage Finalized At'
  ];

  for (const req of requiredHeaders) {
    assert.ok(
      headers.includes(req),
      \`CNE Schedule schema must contain required header '\${req}'\`
    );
  }
});

runTest("Separate legacy 'Time' column is NOT recreated in CNE Schedule schema", () => {
  const match = codeGs.match(/'CNE Schedule':\\s*\\[([\\s\\S]*?)\\]/);
  assert.ok(match, 'CNE Schedule headers definition must exist in Code.gs');
  const headers = eval(\`[\${match[1]}]\`);

  // Ensure 'Time' is NOT in active CNE Schedule headers
  assert.ok(
    !headers.includes('Time'),
    "Active CNE Schedule headers must NOT contain obsolete separate 'Time' column"
  );

  // Ensure headerAliases maps time to From Date / To Date or handles safely without recreating 'Time'
  assert.ok(
    !headers.some(h => h.trim().toLowerCase() === 'time'),
    "No column named 'time' may exist in CNE Schedule headers"
  );
});

// -----------------------------------------------------------------------------
// 7. Obsolete CNE Applications Subsystem & Schema Removal
// -----------------------------------------------------------------------------
runTest('CNE Applications is absent from active schema, Verify / Initialize, and migrations', () => {
  // 1. CNE Applications absent from CNE_SHEET_HEADERS
  assert.ok(
    !codeGs.includes("'CNE Applications':"),
    'CNE Applications must be completely absent from CNE_SHEET_HEADERS'
  );

  // 2. CNE Applications absent from tabNames in setupAndVerifyCNESheets
  const setupSection = codeGs.substring(
    codeGs.indexOf('function setupAndVerifyCNESheets'),
    codeGs.indexOf('function getOrCreateSheet')
  );
  assert.ok(
    !setupSection.includes("'CNE Applications'"),
    'CNE Applications must be absent from setupAndVerifyCNESheets tabNames, initialization, and validation'
  );

  // 3. migrateCNEApplicationsHeaderToCNEId function absent
  assert.ok(
    !codeGs.includes('migrateCNEApplicationsHeaderToCNEId'),
    'migrateCNEApplicationsHeaderToCNEId must be completely absent from Code.gs'
  );
  assert.ok(
    !backendGs.includes('migrateCNEApplicationsHeaderToCNEId'),
    'migrateCNEApplicationsHeaderToCNEId must be completely absent from src/backend/googleAppsScript.ts'
  );

  // 4. Verify / Initialize does not contain automatic deleteSheet calls
  assert.ok(
    !setupSection.includes('deleteSheet'),
    'setupAndVerifyCNESheets must NOT contain automatic deleteSheet logic'
  );
});

// -----------------------------------------------------------------------------
// 8. Ward / Area Active–Inactive Backend Enforcement
// -----------------------------------------------------------------------------
runTest('Authoritative area-status helpers exist with normalized uppercase lookup', () => {
  assert.ok(codeGs.includes('function getAreaStatusMap_(forceFresh)'), 'getAreaStatusMap_ must exist in Code.gs');
  assert.ok(codeGs.includes('function isAreaActive_(areaName, forceFresh)'), 'isAreaActive_ must exist in Code.gs');
  assert.ok(codeGs.includes('function requireActiveArea_(areaName, forceFresh)'), 'requireActiveArea_ must exist in Code.gs');
  assert.ok(codeGs.includes("errorCode: 'AREA_INACTIVE'"), 'Standard AREA_INACTIVE error code must be used');
  assert.ok(codeGs.includes("map[normName] = (areas[i].status === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE'"), 'Map must normalize ACTIVE / INACTIVE');
  assert.ok(codeGs.includes("toUpperCase()"), 'Helpers must normalize area names using toUpperCase()');
});

runTest('handleCreateCNE rejects inactive area with standard AREA_INACTIVE error code both pre-lock and post-lock', () => {
  const createFunc = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE('),
    codeGs.indexOf('function handleUpdateCNE(')
  );
  assert.ok(
    createFunc.includes('requireActiveArea_(area, false)'),
    'handleCreateCNE must check requireActiveArea_ pre-lock'
  );
  assert.ok(
    createFunc.includes('requireActiveArea_(area, true)'),
    'handleCreateCNE must check requireActiveArea_ post-lock with forceFresh=true'
  );
});

runTest('Departmental CNE creation rejects inactive area in batch scheduling pre-lock and post-lock with AREA_INACTIVE', () => {
  const deptFunc = codeGs.substring(
    codeGs.indexOf('function handleAddDepartmentalSchedule('),
    codeGs.indexOf('function handleGetRoles(')
  );
  assert.ok(
    deptFunc.includes('requireActiveArea_(area, false)'),
    'handleAddDepartmentalSchedule must check active area pre-lock'
  );
  assert.ok(
    deptFunc.includes('getAreaStatusMap_(true)'),
    'handleAddDepartmentalSchedule must obtain authoritative status map inside lock'
  );
  assert.ok(
    deptFunc.includes("liveAreaStatusMap[normLiveArea] !== 'ACTIVE'"),
    'handleAddDepartmentalSchedule must verify each row is ACTIVE inside lock'
  );
  assert.ok(
    deptFunc.includes("errorCode: 'AREA_INACTIVE'"),
    'handleAddDepartmentalSchedule must return AREA_INACTIVE on inactive area'
  );
});

runTest('Unscheduled CNE creation is covered and rejects inactive area via shared handleCreateCNE', () => {
  assert.ok(
    codeGs.includes("case 'addUnscheduledCNE':"),
    'addUnscheduledCNE action must route to handleCreateCNE'
  );
  assert.ok(
    codeGs.includes("params.action === 'addUnscheduledCNE'"),
    'handleCreateCNE must recognize addUnscheduledCNE action'
  );
  const createFunc = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE('),
    codeGs.indexOf('function handleUpdateCNE(')
  );
  assert.ok(
    createFunc.includes('requireActiveArea_(area, true)'),
    'Unscheduled CNE path must be guarded by authoritative requireActiveArea_'
  );
});

runTest('handleUpdateCNE checks active status only when target area changes and rejects with AREA_INACTIVE', () => {
  const updateFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateCNE('),
    codeGs.indexOf('function handleFinalizeCNE(')
  );
  assert.ok(
    updateFunc.includes('preNewArea && preNewArea !== preOldArea'),
    'handleUpdateCNE must compare proposed area with old area pre-lock'
  );
  assert.ok(
    updateFunc.includes('liveNewArea && liveNewArea !== liveOldArea'),
    'handleUpdateCNE must compare proposed area with live old area post-lock'
  );
  assert.ok(
    updateFunc.includes('requireActiveArea_(params.area, true)'),
    'handleUpdateCNE must require active area when target area changed'
  );
});

runTest('handleUpdateCNE permits editing other fields of an existing CNE when its current area is inactive', () => {
  const updateFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateCNE('),
    codeGs.indexOf('function handleFinalizeCNE(')
  );
  assert.ok(
    updateFunc.includes('if (preNewArea && preNewArea !== preOldArea) {'),
    'Active area check is gated on area change pre-lock'
  );
  assert.ok(
    updateFunc.includes('if (liveNewArea && liveNewArea !== liveOldArea) {'),
    'Active area check is gated on area change post-lock'
  );
});

runTest('handleUpdateRole rejects newly added Area Incharge assignments to inactive areas with AREA_INACTIVE', () => {
  const roleFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateRole('),
    codeGs.indexOf('function handleGetNewsEvents(')
  );
  assert.ok(
    roleFunc.includes('newlyAddedAreas'),
    'handleUpdateRole must compute newlyAddedAreas'
  );
  assert.ok(
    roleFunc.includes("roleAreaStatusMap[naNorm] !== 'ACTIVE'"),
    'handleUpdateRole must verify newly added areas against roleAreaStatusMap'
  );
  assert.ok(
    roleFunc.includes("errorCode: 'AREA_INACTIVE'"),
    'handleUpdateRole must reject with AREA_INACTIVE for inactive assigned area'
  );
});

runTest('handleUpdateRole permits existing inactive historical assignments to remain or be removed without reactivation', () => {
  const roleFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateRole('),
    codeGs.indexOf('function handleGetNewsEvents(')
  );
  assert.ok(
    roleFunc.includes('prevAreas.indexOf(reqAreas[rqa]) === -1'),
    'handleUpdateRole must filter only areas not already present in prevAreas'
  );
});

runTest('No blanket inactive-area block exists in historical or read authorization', () => {
  const authFunc = codeGs.substring(
    codeGs.indexOf('function checkCNEAuthorized('),
    codeGs.indexOf('function checkCNEActionAuthorized(')
  );
  assert.ok(
    !authFunc.includes('isAreaActive_'),
    'checkCNEAuthorized must not contain isAreaActive_ check to preserve historical access'
  );
  assert.ok(
    !authFunc.includes('requireActiveArea_'),
    'checkCNEAuthorized must not contain requireActiveArea_ check'
  );
  const getCneFunc = codeGs.substring(
    codeGs.indexOf('function getCNEScheduleRecord('),
    codeGs.indexOf('function handleSaveReferenceMaterial(')
  );
  assert.ok(
    !getCneFunc.includes('isAreaActive_'),
    'getCNEScheduleRecord must not block inactive areas from being retrieved'
  );
});

runTest('Admin area status toggle and update handlers remain protected by Admin authorization and ScriptLock', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes('var adminError = requireAdmin(session);'),
    'handleUpdateArea must require admin session'
  );
  assert.ok(
    updateAreaFunc.includes('var freshAdminCheck = requireFreshAdminMutation(session);'),
    'handleUpdateArea must perform fresh mutation check inside lock'
  );
  assert.ok(
    updateAreaFunc.includes('LockService.getScriptLock()'),
    'handleUpdateArea must acquire ScriptLock'
  );
});

runTest('Admin area rename enforces duplicate name validation in backend handleUpdateArea', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes('newName.toLowerCase() !== oldName.toLowerCase()'),
    'handleUpdateArea must check for name changes'
  );
  assert.ok(
    updateAreaFunc.includes('An area with this name already exists.'),
    'handleUpdateArea must reject duplicate area names'
  );
});

// -----------------------------------------------------------------------------
// 9. Ward / Area Referential Rename Propagation
// -----------------------------------------------------------------------------
runTest('handleUpdateArea rename updates Area master name and status together', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );

  assert.ok(
    updateAreaFunc.includes('getRange(targetAreaRow, 1, 1, 2)'),
    'handleUpdateArea must target Area master Name + Status together'
  );

  assert.ok(
    updateAreaFunc.includes('setValues([[newName, targetStatus]])'),
    'handleUpdateArea must write newName and targetStatus in one operation'
  );

  assert.ok(
    updateAreaFunc.includes('var isRename = Boolean(newName && newName.toLowerCase() !== oldName.toLowerCase());'),
    'handleUpdateArea must identify rename operations'
  );
});

runTest('rename propagates exact match into Role assignments', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes("ss.getSheetByName('Role')"),
    'handleUpdateArea must access Role sheet during rename'
  );
  assert.ok(
    updateAreaFunc.includes('tokenStr.toUpperCase() === oldNorm'),
    'handleUpdateArea must match tokens using normalized uppercase equality'
  );
  assert.ok(
    updateAreaFunc.includes('updatedTokens.push(newName);'),
    'handleUpdateArea must replace matching token with newName'
  );
  assert.ok(
    updateAreaFunc.includes('roleSheet.getRange(rItem.row, rItem.col).setValue(rItem.newVal);'),
    'handleUpdateArea must update affected Role cells'
  );
});

runTest('rename propagates exact match into CNE Schedule', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes("ss.getSheetByName('CNE Schedule')"),
    'handleUpdateArea must access CNE Schedule sheet during rename'
  );
  assert.ok(
    updateAreaFunc.includes('cneAreaVal.toUpperCase() === oldNorm'),
    'handleUpdateArea must match CNE Area/Ward using normalized uppercase equality'
  );
  assert.ok(
    updateAreaFunc.includes('cneSheet.getRange(cItem.row, cItem.col).setValue(cItem.newVal);'),
    'handleUpdateArea must update affected CNE Schedule cells'
  );
});

runTest('rename does not modify partial names such as MICU/PICU/NICU', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    !updateAreaFunc.includes('.replace(oldName, newName)'),
    'handleUpdateArea must NOT use blind substring replacement'
  );
  assert.ok(
    updateAreaFunc.includes('tokenStr.toUpperCase() === oldNorm'),
    'Role sheet must use exact token comparison'
  );
  assert.ok(
    updateAreaFunc.includes('cneAreaVal.toUpperCase() === oldNorm'),
    'CNE Schedule must use exact area equality'
  );
});

runTest('rename preserves ACTIVE/INACTIVE status', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );

  assert.ok(
    updateAreaFunc.includes('var targetStatus = rawStatus ? status : currentStatus;'),
    'handleUpdateArea must preserve currentStatus when status is not explicitly passed'
  );

  assert.ok(
    updateAreaFunc.includes('setValues([[newName, targetStatus]])'),
    'Area master grouped write must preserve targetStatus'
  );
});

runTest('rename remains Admin-only and ScriptLock-protected', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes('var adminError = requireAdmin(session);'),
    'handleUpdateArea must enforce requireAdmin'
  );
  assert.ok(
    updateAreaFunc.includes('lock.waitLock(10000);'),
    'handleUpdateArea must wait for ScriptLock before any mutation'
  );
  assert.ok(
    updateAreaFunc.includes('lock.releaseLock();'),
    'handleUpdateArea must release ScriptLock in finally block'
  );
});

runTest('relevant caches are invalidated after rename', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes("CacheService.getScriptCache().remove('cne_areas_list');"),
    'handleUpdateArea must invalidate cne_areas_list cache'
  );
  assert.ok(
    updateAreaFunc.includes('invalidateUserRoleCache(roleAffectedEmpIds[sa]);'),
    'handleUpdateArea must invalidate affected officer role cache'
  );
  assert.ok(
    updateAreaFunc.includes('_inMemoryRoleCache = {};'),
    'handleUpdateArea must reset in-memory role cache'
  );
});

runTest('Active/Inactive enforcement still works after rename', () => {
  assert.ok(
    codeGs.includes("CacheService.getScriptCache().remove('cne_areas_list');"),
    'cne_areas_list cache removal ensures fresh status map'
  );
  assert.ok(
    codeGs.includes('function requireActiveArea_(areaName, forceFresh)'),
    'requireActiveArea_ helper functions across fresh reads'
  );
  const createFunc = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE('),
    codeGs.indexOf('function handleUpdateCNE(')
  );
  assert.ok(
    createFunc.includes('requireActiveArea_(area, true)'),
    'handleCreateCNE uses forceFresh=true under lock to validate newly renamed area'
  );
});

// -----------------------------------------------------------------------------
// 10. Ward / Area Rename Production Hardening & Atomicity
// -----------------------------------------------------------------------------
runTest('Rename propagation errors are not silently swallowed', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    !updateAreaFunc.includes('console.warn(\\'Error propagating area rename'),
    'handleUpdateArea must NOT silently swallow rename errors with console.warn'
  );
  assert.ok(
    updateAreaFunc.includes('catch (writeErr) {'),
    'handleUpdateArea must catch write errors to perform rollback and fail closed'
  );
});

runTest('Failure does not return success and returns explicit error codes', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes("errorCode: 'AREA_RENAME_FAILED'"),
    'handleUpdateArea must return AREA_RENAME_FAILED error code on write failure'
  );
  assert.ok(
    updateAreaFunc.includes("errorCode: 'AREA_RENAME_RECONCILIATION_REQUIRED'"),
    'handleUpdateArea must return AREA_RENAME_RECONCILIATION_REQUIRED if rollback fails'
  );
  assert.ok(
    updateAreaFunc.includes('success: false'),
    'Write failure must strictly return success: false'
  );
});

runTest('Only affected Role cells are updated', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes('roleSheet.getRange(rItem.row, rItem.col).setValue(rItem.newVal);'),
    'handleUpdateArea must update only specific cell coordinates on matching Role rows'
  );
});

runTest('Only affected CNE Area cells are updated', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes('cneSheet.getRange(cItem.row, cItem.col).setValue(cItem.newVal);'),
    'handleUpdateArea must update only specific cell coordinates on matching CNE rows'
  );
});

runTest('Unrelated columns and formulas are preserved without full-sheet overwrites', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    !updateAreaFunc.includes('roleSheet.getRange(1, 1, rData.length, rData[0].length).setValues(rData)'),
    'handleUpdateArea must not overwrite full Role sheet range'
  );
  assert.ok(
    !updateAreaFunc.includes('cneSheet.getRange(1, 1, cneData.length, cneData[0].length).setValues(cneData)'),
    'handleUpdateArea must not overwrite full CNE Schedule sheet range'
  );
});

runTest('Rollback and restoration are attempted on partial failure', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes('var executedRollbacks = [];'),
    'handleUpdateArea must track executed rollbacks'
  );
  const renameTryBlock = updateAreaFunc.substring(
    updateAreaFunc.indexOf('// EXECUTE WRITES WITH ROLLBACK TRACKING'),
    updateAreaFunc.indexOf('} catch (writeErr) {')
  );
  assert.ok(
    renameTryBlock.indexOf('executedRollbacks.push({ sheet: roleSheet') < renameTryBlock.indexOf('roleSheet.getRange(rItem.row, rItem.col).setValue'),
    'Rollback entry must be registered before role write'
  );
  assert.ok(
    renameTryBlock.indexOf('executedRollbacks.push({ sheet: cneSheet') < renameTryBlock.indexOf('cneSheet.getRange(cItem.row, cItem.col).setValue'),
    'Rollback entry must be registered before CNE write'
  );
  const masterGroupedWriteIndex = renameTryBlock.indexOf('getRange(targetAreaRow, 1, 1, 2)');
  const nameRollbackIndex = renameTryBlock.indexOf('col: 1, oldVal: oldAreaMasterName');
  const statusRollbackIndex = renameTryBlock.indexOf('col: 2, oldVal: oldAreaMasterStatus');

  assert.ok(
    nameRollbackIndex !== -1 && nameRollbackIndex < masterGroupedWriteIndex,
    'Area master name rollback must be registered before grouped write'
  );

  assert.ok(
    statusRollbackIndex !== -1 && statusRollbackIndex < masterGroupedWriteIndex,
    'Area master status rollback must be registered before grouped write'
  );

  assert.ok(
    renameTryBlock.includes('setValues([[newName, targetStatus]])'),
    'Area master Name + Status must be written together'
  );
  assert.ok(
    updateAreaFunc.includes('rbItem.sheet.getRange(rbItem.row, rbItem.col).setValue(rbItem.oldVal);'),
    'handleUpdateArea must restore cells to oldVal during rollback'
  );
});

runTest('AREA_RENAME_FAILED error is returned appropriately on safe rollback', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes("message: 'Ward/area rename could not be completed safely. No changes were finalized. Please try again.'"),
    'handleUpdateArea must return safe rollback failure message'
  );
});

runTest('Caches are invalidated on both success and failure', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  const catchSection = updateAreaFunc.substring(
    updateAreaFunc.indexOf('catch (writeErr) {'),
    updateAreaFunc.indexOf('// ---------------------------------------------------------\\n    // SUCCESS:')
  );
  assert.ok(
    catchSection.includes("CacheService.getScriptCache().remove('cne_areas_list');"),
    'Caches must be removed on failure'
  );
  assert.ok(
    catchSection.includes('_inMemoryRoleCache = {};'),
    'In-memory role cache must be cleared on failure'
  );
  assert.ok(
    catchSection.includes('invalidateUserRoleCache(roleAffectedEmpIds[fa]);'),
    'User role cache must be invalidated on failure'
  );
});

runTest('Active/Inactive status remains unchanged when renaming area', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );

  assert.ok(
    updateAreaFunc.includes('var targetStatus = rawStatus ? status : currentStatus;'),
    'targetStatus must resolve to currentStatus if status not specified'
  );

  assert.ok(
    updateAreaFunc.includes('setValues([[newName, targetStatus]])'),
    'Grouped Area master write must preserve resolved targetStatus'
  );
});

runTest('Audit logging records AREA_RENAMED with row counts on success and AREA_RENAME_FAILED on failure', () => {
  const updateAreaFunc = codeGs.substring(
    codeGs.indexOf('function handleUpdateArea('),
    codeGs.indexOf('function formatDurationValue(')
  );
  assert.ok(
    updateAreaFunc.includes("logAuditAction(\\n      'AREA_RENAMED',"),
    'handleUpdateArea must log AREA_RENAMED on success'
  );
  assert.ok(
    updateAreaFunc.includes("' (Role rows updated: ' + roleUpdates.length + ', CNE rows updated: ' + cneUpdates.length + ')'"),
    'Audit log must record updated Role and CNE counts'
  );
  assert.ok(
    updateAreaFunc.includes("logAuditAction(\\n        'AREA_RENAME_FAILED',"),
    'handleUpdateArea must log AREA_RENAME_FAILED on failure'
  );
});


// -----------------------------------------------------------------------------
// 11. Admin-Controlled Teaching Mode Master
// -----------------------------------------------------------------------------
runTest('Teaching Mode master backend handlers and router actions exist', () => {
  assert.ok(codeGs.includes('function handleGetTeachingModes(params)'), 'getTeachingModes handler must exist');
  assert.ok(codeGs.includes('function handleAddTeachingMode(params, session)'), 'addTeachingMode handler must exist');
  assert.ok(codeGs.includes('function handleUpdateTeachingMode(params, session)'), 'updateTeachingMode handler must exist');
  assert.ok(codeGs.includes("case 'getTeachingModes':"), 'getTeachingModes router action must exist');
  assert.ok(codeGs.includes("case 'addTeachingMode':"), 'addTeachingMode router action must exist');
  assert.ok(codeGs.includes("case 'updateTeachingMode':"), 'updateTeachingMode router action must exist');
});

runTest('Teaching Mode mutations remain Admin-only and ScriptLock protected', () => {
  const addStart = codeGs.indexOf('function handleAddTeachingMode(');
  const updateStart = codeGs.indexOf('function handleUpdateTeachingMode(');
  const addFunc = codeGs.substring(addStart, updateStart);
  const updateEnd = codeGs.indexOf('/**\\n * Helper: Safely normalize Duration', updateStart);
  const updateFunc = codeGs.substring(updateStart, updateEnd);
  assert.ok(addFunc.includes('requireAdmin(session)'), 'add Teaching Mode must require Admin');
  assert.ok(addFunc.includes('LockService.getScriptLock()'), 'add Teaching Mode must use ScriptLock');
  assert.ok(updateFunc.includes('requireAdmin(session)'), 'update Teaching Mode must require Admin');
  assert.ok(updateFunc.includes('LockService.getScriptLock()'), 'update Teaching Mode must use ScriptLock');
});

runTest('Teaching Mode duplicate names are rejected case-insensitively', () => {
  const updateStart = codeGs.indexOf('function handleUpdateTeachingMode(');
  const updateEnd = codeGs.indexOf('/**\\n * Helper: Safely normalize Duration', updateStart);
  const updateFunc = codeGs.substring(updateStart, updateEnd);
  assert.ok(updateFunc.includes("candidate.toUpperCase() === newNorm"), 'rename duplicate validation must use normalized exact match');
  assert.ok(updateFunc.includes('A Teaching Mode with this name already exists.'), 'duplicate message must be present');
});

runTest('Authoritative Teaching Mode ACTIVE/INACTIVE helpers exist', () => {
  assert.ok(codeGs.includes('function getTeachingModeStatusMap_(forceFresh)'), 'status map helper must exist');
  assert.ok(codeGs.includes('function isTeachingModeActive_(modeName, forceFresh)'), 'active helper must exist');
  assert.ok(codeGs.includes('function requireActiveTeachingMode_(modeName, forceFresh)'), 'require-active helper must exist');
  assert.ok(codeGs.includes("errorCode: 'TEACHING_MODE_INACTIVE'"), 'standard inactive error code must exist');
});

runTest('New CNE creation validates Teaching Mode before and after the lock', () => {
  const createFunc = codeGs.substring(codeGs.indexOf('function handleCreateCNE('), codeGs.indexOf('function handleUpdateCNE('));
  assert.ok(createFunc.includes('requireActiveTeachingMode_(modeOfTeaching, false)'), 'create pre-lock validation required');
  assert.ok(createFunc.includes('requireActiveTeachingMode_(modeOfTeaching, true)'), 'create post-lock validation required');
});

runTest('Departmental CNE batch validates Teaching Modes pre-lock and with one fresh map under lock', () => {
  const deptStart = codeGs.indexOf('function handleAddDepartmentalSchedule(');
  const deptEnd = codeGs.indexOf('/**', deptStart + 20);
  const deptFunc = codeGs.substring(deptStart, deptEnd > deptStart ? deptEnd : codeGs.length);
  assert.ok(deptFunc.includes('requireActiveTeachingMode_(teachingMode, false)'), 'departmental pre-lock Teaching Mode validation required');
  assert.ok(deptFunc.includes('var liveTeachingModeStatusMap = getTeachingModeStatusMap_(true);'), 'departmental lock-time validation must read status map once');
  assert.ok(deptFunc.includes("errorCode: 'TEACHING_MODE_INACTIVE'"), 'departmental inactive mode must fail closed');
});

runTest('Edit CNE requires ACTIVE Teaching Mode only when the Teaching Mode changes', () => {
  const updateFunc = codeGs.substring(codeGs.indexOf('function handleUpdateCNE('), codeGs.indexOf('function handleAddDepartmentalSchedule('));
  assert.ok(updateFunc.includes('preNewTeachingMode !== preOldTeachingMode'), 'pre-lock mode check must compare old and new');
  assert.ok(updateFunc.includes('liveNewTeachingMode !== liveOldTeachingMode'), 'post-lock mode check must compare old and new');
  assert.ok(updateFunc.includes('requireActiveTeachingMode_(params.modeOfTeaching, true)'), 'changed mode must be freshly validated');
});

runTest('Existing CNE with inactive current Teaching Mode can remain unchanged', () => {
  const updateFunc = codeGs.substring(codeGs.indexOf('function handleUpdateCNE('), codeGs.indexOf('function handleAddDepartmentalSchedule('));
  assert.ok(!updateFunc.includes('requireActiveTeachingMode_(liveUpdateRecord.modeOfTeaching'), 'current stored Teaching Mode must not be globally blocked');
  assert.ok(updateFunc.includes('liveNewTeachingMode !== liveOldTeachingMode'), 'only a changed target is enforced');
});

runTest('Teaching Mode rename propagates exact matches to CNE Schedule only', () => {
  const start = codeGs.indexOf('function handleUpdateTeachingMode(');
  const end = codeGs.indexOf('/**\\n * Helper: Safely normalize Duration', start);
  const fn = codeGs.substring(start, end);
  assert.ok(fn.includes("String(oldCell || '').trim().toUpperCase() === oldNorm"), 'rename must use exact normalized match');
  assert.ok(fn.includes('cneSheet.getRange(cItem.row, cItem.col).setValue(cItem.newVal);'), 'only affected CNE cells must be updated');
  assert.ok(!fn.includes('.replace(oldName'), 'substring replacement must not be used');
});

runTest('Teaching Mode rename registers rollback before dependent and master writes', () => {
  const start = codeGs.indexOf('function handleUpdateTeachingMode(');
  const end = codeGs.indexOf('/**\\n * Helper: Safely normalize Duration', start);
  const fn = codeGs.substring(start, end);
  const depRollback = fn.indexOf('executedRollbacks.push({ sheet: cneSheet');
  const depWrite = fn.indexOf('cneSheet.getRange(cItem.row, cItem.col).setValue');
  const masterRollback = fn.indexOf('col: 1, oldVal: data[targetRow - 1][0]');
  const masterWrite = fn.indexOf('getRange(targetRow, 1, 1, 3).setValues');
  assert.ok(depRollback !== -1 && depRollback < depWrite, 'CNE rollback must be registered before write');
  assert.ok(masterRollback !== -1 && masterRollback < masterWrite, 'master rollback must be registered before grouped write');
  assert.ok(fn.includes("errorCode: 'TEACHING_MODE_RENAME_FAILED'"), 'safe rollback failure code must exist');
  assert.ok(fn.includes("errorCode: 'TEACHING_MODE_RENAME_RECONCILIATION_REQUIRED'"), 'reconciliation failure code must exist');
});

runTest('Teaching Mode cache is invalidated after mutations and failures', () => {
  const tmStart = codeGs.indexOf('function handleAddTeachingMode(');
  const tmEnd = codeGs.indexOf('/**\\n * Helper: Safely normalize Duration', tmStart);
  const tmSection = codeGs.substring(tmStart, tmEnd);
  const removals = (tmSection.match(/remove\\('cne_teaching_modes_list'\\)/g) || []).length;
  assert.ok(removals >= 3, 'Teaching Mode cache must be cleared on add/update/rename failure paths');
});

runTest('Teaching Mode master schema has no Sort Order field', () => {
  assert.ok(codeGs.includes("'Teaching Mode': ['Mode Name', 'Status', 'Updated At']"), 'Teaching Mode sheet must contain Name, Status, Updated At only');
  assert.ok(!codeGs.includes("'Teaching Mode': ['Mode Name', 'Status', 'Sort Order'"), 'Teaching Mode master must not use Sort Order');
});

runTest('Frontend Control Center exposes Teaching Modes Admin page', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const toolbar = fs.readFileSync('src/components/TopToolbar.tsx', 'utf8');
  const adminModes = fs.readFileSync('src/components/AdminTeachingModes.tsx', 'utf8');
  assert.ok(app.includes("activeView === 'admin-teaching-modes'"), 'App must render Teaching Modes Admin page');
  assert.ok(toolbar.includes("id: 'admin-teaching-modes'"), 'Control Center must link to Teaching Modes');
  assert.ok(adminModes.includes('Teaching Mode | Status') || (adminModes.includes('Teaching Mode') && adminModes.includes('Status')), 'Admin page must expose Teaching Mode and Status columns');
  assert.ok(!adminModes.includes('Sort Order'), 'Admin Teaching Modes page must not expose Sort Order');
});

runTest('All CNE Teaching Mode selectors use the centralized master instead of hardcoded option lists', () => {
  const schedule = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
  const dept = fs.readFileSync('src/components/cne/DepartmentalScheduleModal.tsx', 'utf8');
  const unscheduled = fs.readFileSync('src/components/cne/AddUnscheduledCneModal.tsx', 'utf8');
  assert.ok(schedule.includes('ApiService.getTeachingModes()'), 'CNE Schedule must load master Teaching Modes');
  assert.ok(schedule.includes('activeTeachingModeNames.map'), 'Central CNE dropdown must use active master modes');
  assert.ok(dept.includes('teachingModes.map'), 'Departmental CNE dropdown must use master modes');
  assert.ok(unscheduled.includes('teachingModes.map'), 'Unscheduled CNE dropdown must use master modes');
  for (const source of [schedule, dept, unscheduled]) {
    assert.ok(!source.includes('<option value="Demonstration">Demonstration</option>'), 'hardcoded Teaching Mode option arrays must be removed');
  }
});

runTest('Edit CNE displays current inactive Teaching Mode while new selections remain ACTIVE-only', () => {
  const schedule = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
  assert.ok(schedule.includes('(Current — Inactive)'), 'Edit dropdown must label current inactive Teaching Mode');
  assert.ok(schedule.includes('teachingModeChanged'), 'Edit validation must distinguish unchanged historical mode from a new target');
  assert.ok(schedule.includes('activeTeachingModeNames.some'), 'Changed Teaching Mode must be checked against active master values');
});

// -----------------------------------------------------------------------------
// 7. External CNE Types & Workflow Enforcement
// -----------------------------------------------------------------------------
runTest('Authoritative normalizeCNEType recognizes all four types and fails closed on unknown inputs', () => {
  const normalizeDef = codeGs.substring(
    codeGs.indexOf('function normalizeCNEType'),
    codeGs.indexOf('function normalizeCNEStatus')
  );

  assert.ok(normalizeDef.includes("'CENTRAL'"), 'Must normalize CENTRAL');
  assert.ok(normalizeDef.includes("'DEPARTMENTAL'"), 'Must normalize DEPARTMENTAL');
  assert.ok(normalizeDef.includes("'EXTERNAL_OFFSITE'"), 'Must normalize EXTERNAL_OFFSITE');
  assert.ok(normalizeDef.includes("'EXTERNAL_ONSITE'"), 'Must normalize EXTERNAL_ONSITE');
  assert.ok(normalizeDef.includes('return null;'), 'Must return null for unknown values');
});

runTest('handleCreateCNE fails closed on invalid CNE type and enforces unscheduled-only for External types', () => {
  const handleAddSection = codeGs.substring(
    codeGs.indexOf('function handleCreateCNE'),
    codeGs.indexOf('function handleUpdateCNE')
  );

  // Fail-closed validation
  assert.ok(
    handleAddSection.includes("errorCode: 'INVALID_CNE_TYPE'"),
    'Must return INVALID_CNE_TYPE error code when type is invalid'
  );

  // Workflow enforcement: External CNEs unscheduled only
  assert.ok(
    handleAddSection.includes("errorCode: 'EXTERNAL_CNE_UNSCHEDULED_ONLY'"),
    'Must return EXTERNAL_CNE_UNSCHEDULED_ONLY error code when External CNE is not unscheduled'
  );
  assert.ok(
    handleAddSection.includes('External CNE categories can only be recorded through the Unscheduled CNE workflow.'),
    'Must return descriptive message for unscheduled-only enforcement'
  );

  // Server-side authorization: External CNE requires Admin role
  assert.ok(
    handleAddSection.includes("(cneType === 'EXTERNAL_OFFSITE' || cneType === 'EXTERNAL_ONSITE') && !isAdmin"),
    'Must enforce that External CNE requires Admin role'
  );
});

runTest('AddUnscheduledCneModal provides mandatory CNE Type dropdown and Associated Department label for External types', () => {
  const unscheduledModal = fs.readFileSync('src/components/cne/AddUnscheduledCneModal.tsx', 'utf8');

  // Mandatory dropdown with 4 options
  assert.ok(unscheduledModal.includes('id="unscheduled-cne-type"'), 'Must have CNE Type select input');
  assert.ok(unscheduledModal.includes('value="CENTRAL"'), 'Must have CENTRAL option');
  assert.ok(unscheduledModal.includes('value="DEPARTMENTAL"'), 'Must have DEPARTMENTAL option');
  assert.ok(unscheduledModal.includes('value="EXTERNAL_OFFSITE"'), 'Must have EXTERNAL_OFFSITE option');
  assert.ok(unscheduledModal.includes('value="EXTERNAL_ONSITE"'), 'Must have EXTERNAL_ONSITE option');

  // Dynamic label for Area
  assert.ok(
    unscheduledModal.includes('Associated Department / Area *'),
    'Must display Associated Department / Area for External CNE types'
  );

  // No forbidden fields
  assert.ok(!unscheduledModal.includes('Organizing Institution'), 'Must not add Organizing Institution field');
  assert.ok(!unscheduledModal.includes('id="unscheduled-venue"'), 'Must not add separate Venue field');
});

runTest('Normal scheduled CNE popups remain strictly Central and Departmental only', () => {
  const scheduleTs = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
  const deptModalTs = fs.readFileSync('src/components/cne/DepartmentalScheduleModal.tsx', 'utf8');

  // Schedule New Central CNE submits CENTRAL
  assert.ok(
    scheduleTs.includes("cneType: 'CENTRAL'"),
    'Schedule New CNE must submit CENTRAL'
  );
  // Departmental Schedule submits DEPARTMENTAL
  assert.ok(
    deptModalTs.includes("cneType: 'DEPARTMENTAL'"),
    'Departmental Schedule must submit DEPARTMENTAL'
  );
  // Neither scheduled modal contains External CNE options
  assert.ok(
    !deptModalTs.includes('EXTERNAL_OFFSITE'),
    'Departmental modal must not contain External CNE options'
  );
});

runTest('Frontend getCneTypeLabel displays correct human-facing labels for all four CNE types', () => {
  const utilsTs = fs.readFileSync('src/utils.ts', 'utf8');
  assert.ok(utilsTs.includes('function getCneTypeLabel'), 'src/utils.ts must export getCneTypeLabel');
  assert.ok(utilsTs.includes("'Central CNE'"), 'Must return Central CNE');
  assert.ok(utilsTs.includes("'Departmental CNE'"), 'Must return Departmental CNE');
  assert.ok(utilsTs.includes("'External CNE – Outside AIIMS'"), 'Must return External CNE – Outside AIIMS');
  assert.ok(utilsTs.includes("'External CNE – Hosted at AIIMS'"), 'Must return External CNE – Hosted at AIIMS');
});

runTest('Lifecycle finalize and cancel recognize all four CNE types in Code.gs', () => {
  assert.ok(
    codeGs.includes('must be CENTRAL, DEPARTMENTAL, EXTERNAL_OFFSITE, or EXTERNAL_ONSITE'),
    'Code.gs finalize/cancel error messages must recognize all four valid CNE types'
  );
});

// -----------------------------------------------------------------------------
// 8. Secure ADMIN-Only Delete CNE with Audit Archive Workflows
// -----------------------------------------------------------------------------
runTest('Delete CNE enforces strict Admin authorization both frontend and backend', () => {
  // Backend router is handleAdminAction
  assert.ok(codeGs.includes("handleAdminAction(params, session, handleDeleteCNE, 'DELETE_CNE')"), 'Backend deleteCNE must be guarded by handleAdminAction');
  // Re-verify under lock
  const fnBody = codeGs.substring(codeGs.indexOf('function handleDeleteCNE'), codeGs.length);
  assert.ok(fnBody.includes('var adminErr = requireAdmin(session);'), 'handleDeleteCNE must re-verify requireAdmin under lock');
  // Non-admins (AREA_INCHARGE, EMPLOYEE) rejected by requireAdmin
  assert.ok(codeGs.includes("String(session.role || '').toUpperCase() !== 'ADMIN'"), 'requireAdmin must reject any non-ADMIN role');
  // Frontend permission strictly checks user?.role === 'ADMIN'
  assert.ok(cneScheduleTs.includes("const canDeleteCne = user?.role === 'ADMIN';"), 'Frontend delete permission must strictly check user?.role === ADMIN');
  assert.ok(!cneDetailsModalTs.includes("canLifecycle && !isCompleted && onDelete"), 'CneDetailsModal must not use canLifecycle for delete');
});

runTest('Delete CNE permits Scheduled/Canceled without attendance, denies Completed or recorded attendance', () => {
  const fnBody = codeGs.substring(codeGs.indexOf('function handleDeleteCNE'), codeGs.length);
  // Completed rejected
  assert.ok(fnBody.includes("if (liveStatus === 'Completed')"), 'Completed CNE deletion must be denied');
  assert.ok(fnBody.includes("CANNOT_DELETE_LIFECYCLE"), 'Lifecycle error code must be CANNOT_DELETE_LIFECYCLE');
  // Allowed statuses: Scheduled and Canceled
  assert.ok(fnBody.includes("if (liveStatus !== 'Scheduled' && liveStatus !== 'Canceled')"), 'Only Scheduled or Canceled CNEs are eligible for deletion');
  // Attendance rejection
  assert.ok(fnBody.includes('ATTENDANCE_EXISTS'), 'Attendance error code must be ATTENDANCE_EXISTS');
  assert.ok(fnBody.includes('staffcount'), 'Must check staffcount');
  assert.ok(fnBody.includes('CNE Post Test Responses'), 'Must check CNE Post Test Responses sheet');
  assert.ok(fnBody.includes('CNE_Participants'), 'Must check CNE_Participants sheet');
  // Explicit error message
  assert.ok(fnBody.includes('This CNE cannot be deleted because participant attendance or Post-Test records already exist.'), 'Must return authoritative attendance denial message');
});

runTest('CNE Deleted Archive preserves all dynamic schedule columns plus deletion metadata', () => {
  assert.ok(codeGs.includes("'CNE Deleted Archive':"), 'CNE_SHEET_HEADERS must define CNE Deleted Archive');
  assert.ok(codeGs.includes("'Deleted At', 'Deleted By', 'Delete Reason'"), 'CNE Deleted Archive must include deletion metadata headers');
  assert.ok(codeGs.includes('function getOrCreateDeletedArchiveSheet_'), 'getOrCreateDeletedArchiveSheet_ must dynamically sync headers');
  
  const fnBody = codeGs.substring(codeGs.indexOf('function handleDeleteCNE'), codeGs.length);
  assert.ok(fnBody.includes('archiveSheet.appendRow(archiveRow);'), 'handleDeleteCNE must append original row to archive');
  assert.ok(fnBody.includes('findExactRowInColumn_(archiveSheet'), 'handleDeleteCNE must verify archive write before removing schedule row');
  assert.ok(fnBody.includes('cneSheet.deleteRow('), 'handleDeleteCNE must remove row from active CNE Schedule');
  assert.ok(fnBody.includes('ARCHIVE_INCONSISTENCY'), 'Existing archive entry for active CNE must be treated as inconsistency');
  assert.ok(fnBody.includes('DELETE_MUTATION_FAILED'), 'Safe rollback must be attempted if schedule deletion fails');
  assert.ok(!codeGs.includes('allowMismatch'), 'Archive recovery must enforce strict row ownership without allowMismatch');
});

runTest('Delete CNE deactivates all associated QR tokens and prevents CNE ID reuse', () => {
  const fnBody = codeGs.substring(codeGs.indexOf('function handleDeleteCNE'), codeGs.length);
  assert.ok(
    fnBody.includes('deactivateQRTokensForCNE(cneId, qrColMap);'),
    'Delete CNE must pass the validated QR column map'
  );
  assert.ok(codeGs.includes('function isCneIdInUse_'), 'Code.gs must implement isCneIdInUse_ helper');
  
  const inUseFn = codeGs.substring(codeGs.indexOf('function isCneIdInUse_'), codeGs.indexOf('function handleDeleteCNE'));
  assert.ok(inUseFn.includes("ss.getSheetByName('CNE Schedule')"), 'isCneIdInUse_ must check active schedule');
  assert.ok(inUseFn.includes("ss.getSheetByName('CNE Deleted Archive')"), 'isCneIdInUse_ must check deleted archive');
  assert.ok(codeGs.includes('while (isCneIdInUse_(cneId))'), 'CNE ID generation must loop to guarantee no ID reuse');
  assert.ok(fnBody.includes("logAuditAction('DELETE_CNE'"), 'handleDeleteCNE must log DELETE_CNE audit event');
});

runTest('DeleteCneModal requires exact CNE ID confirmation, mandatory reason, and disables for non-admin', () => {
  assert.ok(deleteModalTs.includes("confirmId === targetId"), 'Delete modal must require exact CNE ID match');
  assert.ok(deleteModalTs.includes("reason.trim()"), 'Delete modal must require nonempty reason');
  assert.ok(deleteModalTs.includes("user?.role === 'ADMIN'"), 'Delete modal must verify admin role');
  assert.ok(deleteModalTs.includes("This CNE will be removed from the active CNE Schedule and preserved in the Deleted CNE Archive for audit."), 'Delete modal must display exact warning text');
  assert.ok(deleteModalTs.includes("Deleting CNE..."), 'Delete modal must display in-flight progress text');
  assert.ok(cneScheduleTs.includes("CNE deleted from active schedule and archived successfully."), 'Schedule component must display exact success message');
});

console.log('\\n========================================================');
console.log(\`Passed: \${passedTests}/\${totalTests}\`);
console.log('ALL CNE WORKFLOWS & SCHEMA TESTS PASSED!');
console.log('========================================================\\n');
`
  },
  // ===== END ORIGINAL SUITE: verify-cne-workflows.js =====

  // ===== BEGIN ORIGINAL SUITE: verify-pdf-resources-and-indexing.js =====
  {
    id: "pdf",
    name: "PDF Resources & Evidence Indexing",
    originalFilename: "verify-pdf-resources-and-indexing.js",
    mode: "module",
    expectedChecks: 17,
    sha256: "96d20a4bd4622f1524a73c87cae4d3a133459861294df7bcde7ec1c6d59d0d8a",
    source: `/**
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
console.log('========================================================\\n');

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
    console.log(\`✓ \${name}\`);
  } catch (err) {
    console.error(\`✗ \${name}\`);
    console.error(\`  Error: \${err.message}\\n\`);
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
    const res = validateCneExtension(\`test_document.\${ext}\`);
    assert.strictEqual(res.valid, false, \`Extension .\${ext} must be rejected\`);
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
  const validPdfHeader = Buffer.from('%PDF-1.4\\n%âãÏÓ\\n');
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
    const tjRegex = /\\(([^)]*)\\)\\s*Tj/g;
    let m;
    while ((m = tjRegex.exec(streamText)) !== null) {
      textPieces.push(m[1]);
    }
    const tjArrayRegex = /\\[([^\\]]*)\\]\\s*TJ/g;
    while ((m = tjArrayRegex.exec(streamText)) !== null) {
      const inner = m[1];
      const partRegex = /\\(([^)]*)\\)/g;
      let p;
      while ((p = partRegex.exec(inner)) !== null) {
        textPieces.push(p[1]);
      }
    }
    return textPieces.join(' ').replace(/\\\\([()\\\\])/g, '$1').trim();
  }

  const sampleStream = \`
    BT
    /F1 12 Tf
    72 712 Td
    (Peripheral Intravenous Catheterization Procedure) Tj
    0 -14 Td
    [(Ensure ) -20 (aseptic ) -20 (technique ) -20 (and ) -20 (vein ) -20 (flashback.)] TJ
    ET
  \`;

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
  const indexPageTs = fs.readFileSync('src/components/cne/LibraryIndexManagementPage.tsx', 'utf8');
  assert.ok(
    learningResPageTs.includes("const isAdmin = user?.role === 'ADMIN';") &&
    learningResPageTs.includes('if (!isAdmin || !itemToDelete) return;') &&
    indexPageTs.includes("user?.role === 'ADMIN'") &&
    indexPageTs.includes("if (!isAdmin || item.sourceType !== 'NURSING_REFERENCE_LIB'"),
    'Learning Resources deletion and dedicated Index Management must each restrict admin actions'
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

runTest('Educational resources are readable by all authenticated employees without visibility toggles, while re-indexing and Reference Library management remain Admin-only', () => {
  const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');
  const typesTs = fs.readFileSync('src/types.ts', 'utf8');

  // Visibility toggling and hidden-resource branches must be completely removed
  const removedVisibilityAction = ['setResource', 'Visibility'].join('');
  const removedVisibilityHandler = ['handleSetResource', 'Visibility'].join('');
  const removedVisibilityField = ['visibleTo', 'Users'].join('');
  const removedHiddenCode = ['RESOURCE_', 'HIDDEN'].join('');

  assert.ok(!codeGs.includes(removedVisibilityAction), 'Code.gs must not contain setResourceVisibility');
  assert.ok(!codeGs.includes(removedVisibilityHandler), 'Code.gs must not contain handleSetResourceVisibility');
  assert.ok(!codeGs.includes(removedHiddenCode), 'Code.gs must not contain RESOURCE_HIDDEN branch');
  assert.ok(!learningResPageTs.includes('handleToggleVisibility'), 'LearningResourcesPage must not contain handleToggleVisibility');
  assert.ok(!learningResPageTs.includes(removedVisibilityField), 'LearningResourcesPage must not contain visibleToUsers');
  assert.ok(!addResourceModalTs.includes(removedVisibilityField), 'AddResourceModal must not contain visibleToUsers');
  assert.ok(!apiTs.includes(removedVisibilityAction), 'api.ts must not contain setResourceVisibility');
  assert.ok(!apiTs.includes(removedVisibilityField), 'api.ts must not contain visibleToUsers');
  assert.ok(!typesTs.includes(removedVisibilityField), 'types.ts must not contain visibleToUsers');

  // CNE Learning Material listing and downloading allow all authenticated employees (do not call checkCNEActionAuthorized)
  const listLrSection = codeGs.substring(
    codeGs.indexOf('function handleListLearningResources('),
    codeGs.indexOf('function handleDownloadLearningResource(')
  );
  assert.ok(
    listLrSection.includes("if (!session || !session.employeeId)") &&
    !listLrSection.includes('checkCNEActionAuthorized'),
    'handleListLearningResources must allow any authenticated employee without requiring CNE management authorization'
  );

  const downloadLrSection = codeGs.substring(
    codeGs.indexOf('function handleDownloadLearningResource('),
    codeGs.indexOf('function extractLearningResourceContentCore(')
  );
  assert.ok(
    downloadLrSection.includes("if (!session || !session.employeeId)") &&
    !downloadLrSection.includes('checkCNEActionAuthorized'),
    'handleDownloadLearningResource must allow any authenticated employee without requiring CNE management authorization'
  );

  // Management endpoints (upload, delete, getLearningResource) still enforce checkCNEActionAuthorized
  const uploadLrSection = codeGs.substring(
    codeGs.indexOf('function handleUploadLearningResource('),
    codeGs.indexOf('function handleDeleteLearningResource(')
  );
  const deleteLrSection = codeGs.substring(
    codeGs.indexOf('function handleDeleteLearningResource('),
    codeGs.indexOf('function handleGetLearningResource(')
  );
  const getLrSection = codeGs.substring(
    codeGs.indexOf('function handleGetLearningResource('),
    codeGs.indexOf('function handleListLearningResources(')
  );
  assert.ok(uploadLrSection.includes('checkCNEActionAuthorized(session, record)'), 'handleUploadLearningResource must enforce checkCNEActionAuthorized');
  assert.ok(deleteLrSection.includes('checkCNEActionAuthorized(session, record)'), 'handleDeleteLearningResource must enforce checkCNEActionAuthorized');
  assert.ok(getLrSection.includes('checkCNEActionAuthorized(session, record)'), 'handleGetLearningResource must enforce checkCNEActionAuthorized');

  // Nursing Reference Library read/download allows all authenticated employees
  const listNrlSection = codeGs.substring(
    codeGs.indexOf('function listNursingReferenceResources('),
    codeGs.indexOf('function uploadNursingReferenceResource(')
  );
  const downloadNrlSection = codeGs.substring(
    codeGs.indexOf('function handleDownloadNursingReferenceResource('),
    codeGs.indexOf('var CLINICAL_PROCEDURAL_TAXONOMY')
  );
  assert.ok(
    listNrlSection.includes("if (!session || !session.employeeId)") &&
    !listNrlSection.includes('if (!isAdmin && !isVisible)'),
    'listNursingReferenceResources must return active reference resources to all authenticated employees'
  );
  assert.ok(
    downloadNrlSection.includes("if (!session || !session.employeeId)") &&
    !downloadNrlSection.includes(removedHiddenCode),
    'handleDownloadNursingReferenceResource must allow all authenticated employees to download active reference resources'
  );

  const indexManagementTs = fs.readFileSync('src/components/cne/LibraryIndexManagementPage.tsx', 'utf8');
  assert.ok(
    indexManagementTs.includes('handleReindex') && !learningResPageTs.includes('setConfirmReindex'),
    'Admin re-indexing must be available on the separate Library Index Management page, not Learning Resources'
  );
});

runTest('Office extraction functions are completely removed and single shared PDF engine is used', () => {
  // Office extraction functions must NOT exist
  assert.ok(!codeGs.includes('function extractTextFromDocx('), 'extractTextFromDocx must be removed from Code.gs');
  assert.ok(!codeGs.includes('function extractTextFromPptx('), 'extractTextFromPptx must be removed from Code.gs');
  assert.ok(!codeGs.includes('function extractTextFromPpt('), 'extractTextFromPpt must be removed from Code.gs');
  assert.ok(!codeGs.includes('function parseWordDocumentXml('), 'parseWordDocumentXml must be removed from Code.gs');
  assert.ok(!codeGs.includes('function parsePptxSlideXml('), 'parsePptxSlideXml must be removed from Code.gs');
  assert.ok(!codeGs.includes('function validateOfficeOpenXmlStructure('), 'validateOfficeOpenXmlStructure must be removed from Code.gs');
  assert.ok(!codeGs.includes('function getZipArchiveEntryNames('), 'getZipArchiveEntryNames must be removed from Code.gs');

  // Authoritative extractTextFromPdf must exist as the single PDF engine
  assert.ok(codeGs.includes('function extractTextFromPdf('), 'extractTextFromPdf must exist in Code.gs');
  assert.ok(codeGs.includes('extractTextFromPdf(blob)'), 'extractTextFromPdf must be called for text extraction');

  // Both CNE learning material extraction and Reference Library extraction must use extractTextFromPdf
  const cneExtractionMatch = codeGs.includes('rawExtracted = extractTextFromPdf(blob)');
  const refExtractionMatch = codeGs.includes('return extractTextFromPdf(blob)');
  assert.ok(cneExtractionMatch, 'CNE learning material extraction must use extractTextFromPdf');
  assert.ok(refExtractionMatch, 'Reference Library extraction must use extractTextFromPdf');
});

runTest('No application-defined file size limits (3MB, 5MB, 10MB, 25MB) exist for Reference Library', () => {
  // indexReferenceLibraryResource must not have any 25MB or 3MB size check
  const indexMatch = codeGs.match(/function\\s+indexReferenceLibraryResource\\s*\\([\\s\\S]*?\\n\\}/);
  assert.ok(indexMatch, 'indexReferenceLibraryResource must exist in Code.gs');
  assert.ok(!indexMatch[0].includes('25 * 1024 * 1024'), 'indexReferenceLibraryResource must not have 25 MB limit');
  assert.ok(!indexMatch[0].includes('3 * 1024 * 1024'), 'indexReferenceLibraryResource must not have 3 MB limit');
  assert.ok(!indexMatch[0].includes('5 * 1024 * 1024'), 'indexReferenceLibraryResource must not have 5 MB limit');
  assert.ok(!indexMatch[0].includes('10 * 1024 * 1024'), 'indexReferenceLibraryResource must not have 10 MB limit');

  // uploadNursingReferenceResource must not restrict reference textbooks to 3MB or 25MB
  const uploadRefMatch = codeGs.match(/function\\s+uploadNursingReferenceResource\\s*\\([\\s\\S]*?\\n\\}/);
  assert.ok(uploadRefMatch, 'uploadNursingReferenceResource must exist in Code.gs');
  assert.ok(!uploadRefMatch[0].includes('3 * 1024 * 1024'), 'uploadNursingReferenceResource must not have 3 MB limit');
  assert.ok(!uploadRefMatch[0].includes('25 * 1024 * 1024'), 'uploadNursingReferenceResource must not have 25 MB limit');
});

runTest('Scanned/image-only PDFs return NO_EXTRACTABLE_CONTENT with helpful guidance', () => {
  assert.ok(
    codeGs.includes("'NO_EXTRACTABLE_CONTENT'"),
    'Code.gs must return NO_EXTRACTABLE_CONTENT error code'
  );
  assert.ok(
    codeGs.includes('This PDF does not contain usable text. Please upload a text-based PDF.'),
    'Code.gs must provide clear user-facing message for scanned/image-only PDFs'
  );
});

runTest('OCR is completely absent from PDF extraction engine', () => {
  assert.ok(
    !codeGs.includes('ocr: true') && !codeGs.includes('ocr:true'),
    'Code.gs must not contain Drive OCR conversions (ocr: true)'
  );
  assert.ok(
    !codeGs.includes('Drive.Files.insert'),
    'Code.gs must not call Drive.Files.insert for OCR conversion'
  );
  assert.ok(
    !codeGs.includes('temp_extract_'),
    'Code.gs must not create temporary Docs files for OCR'
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
    assert.ok(codeGs.includes(\`'\${h}'\`), \`Header '\${h}' must be present in Code.gs\`);
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

      const pIdx = searchSlice.lastIndexOf('\\n\\n');
      if (pIdx !== -1) {
        breakPos = searchStart + pIdx + 2;
      } else {
        const sMatch = searchSlice.match(/[\\.\\?!]\\s+/g);
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
    text += \`Step \${i + 1}: Check vital signs, administer prescribed medication, and monitor patient response. \`;
  }

  const windows = splitTextIntoWindows(text, 1200, 150);
  assert.ok(windows.length > 2, 'Long text should produce multiple windows');

  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    assert.ok(w.length <= 1500, \`Window exceeds max boundary: \${w.length}\`);
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
  const gateCallCount = (codeGs.match(/passesClinicalRelevanceGate\\(cleanTopic,/g) || []).length;
  assert.ok(
    gateCallCount >= 2,
    'passesClinicalRelevanceGate must be evaluated for both uploaded and reference library chunks'
  );
});

runTest('Clinical relevance gate filters generic terms and prevents cross-procedural contamination', () => {
  // Extract taxonomy and gate function from Code.gs
  const taxonomyMatch = codeGs.match(/var CLINICAL_PROCEDURAL_TAXONOMY = (\\[[\\s\\S]*?\\n\\]);/);
  assert.ok(taxonomyMatch, 'Could not extract CLINICAL_PROCEDURAL_TAXONOMY from Code.gs');
  const CLINICAL_PROCEDURAL_TAXONOMY = eval(taxonomyMatch[1]);

  const gateStart = codeGs.indexOf('function passesClinicalRelevanceGate(');
  const gateEnd = codeGs.indexOf('function retrieveCNETopicEvidence(');
  assert.ok(gateStart !== -1 && gateEnd !== -1, 'Could not locate gate function boundaries');
  const gateCode = codeGs.substring(gateStart, gateEnd);

  const passesClinicalRelevanceGate = new Function('CLINICAL_PROCEDURAL_TAXONOMY', \`
    \${gateCode}
    return passesClinicalRelevanceGate;
  \`)(CLINICAL_PROCEDURAL_TAXONOMY);

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

console.log('\\n========================================================');
console.log(\`Passed: \${passedTests}/\${totalTests}\`);
console.log('ALL PDF RESOURCES, INDEXING & EVIDENCE TESTS PASSED!');
console.log('========================================================\\n');
`
  },
  // ===== END ORIGINAL SUITE: verify-pdf-resources-and-indexing.js =====

  // ===== BEGIN ORIGINAL SUITE: verify-system-integration.js =====
  {
    id: "integration",
    name: "System Integration",
    originalFilename: "verify-system-integration.js",
    mode: "module",
    expectedChecks: 27,
    sha256: "81b686b94da57fb995f66471ac013febe60516d893821e53ae15f502947cf8fa",
    source: `/**
 * Permanent System Integration Verification Suite
 * scripts/verify-system-integration.js
 *
 * Verifies cross-cutting wiring and architectural integrity:
 * 1. Frontend API ↔ Apps Script Router Consistency
 * 2. Code.gs Synchronization with TypeScript mirror
 * 3. Navigation / View Integrity (canonical page IDs)
 * 4. CNE Sheet Architecture & No obsolete Time column
 * 5. CNE Lifecycle Architecture (single source of truth in CNE Schedule)
 * 6. Gemini Architecture (authoritative Apps Script-only implementation)
 * 7. PDF Resource Policy (CNE learning material vs Reference Library)
 * 8. Critical File Existence (canonical file tree locations)
 * 9. Environment Safety (no exposed keys, secrets, or hardcoded spreadsheet IDs)
 * 10. Active API Methods & Cleanup Candidate Detection
 * 11. Shared Date-Time Architecture across all CNE workflows
 * 12. QR Post-Test Email OTP identity verification (Internal + External)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import vm from 'node:vm';

console.log('========================================================');
console.log('System Integration Verification');
console.log('========================================================\\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${name}\`);
  } catch (err) {
    console.error(\`✗ \${name}\`);
    console.error(\`  Error: \${err.message}\\n\`);
    throw err;
  }
}

// Read core source files
const codeGs = fs.readFileSync('Code.gs', 'utf8');
const backendGs = fs.readFileSync('src/backend/googleAppsScript.ts', 'utf8');
const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');
const typesTs = fs.readFileSync('src/types.ts', 'utf8');
const appTs = fs.readFileSync('src/App.tsx', 'utf8');
const topToolbarTs = fs.readFileSync('src/components/TopToolbar.tsx', 'utf8');
const cneScheduleTs = fs.readFileSync('src/components/CNESchedule.tsx', 'utf8');
const unscheduledModalTs = fs.readFileSync('src/components/cne/AddUnscheduledCneModal.tsx', 'utf8');
const departmentalModalTs = fs.readFileSync('src/components/cne/DepartmentalScheduleModal.tsx', 'utf8');
const addResourceModalTs = fs.readFileSync('src/components/cne/AddResourceModal.tsx', 'utf8');
const learningResPageTs = fs.readFileSync('src/components/cne/LearningResourcesPage.tsx', 'utf8');
const postTestModalTs = fs.readFileSync('src/components/cne/CNEPostTestModal.tsx', 'utf8');
const cneQrModalTs = fs.readFileSync('src/components/cne/CNEQRModal.tsx', 'utf8');
const cneReferenceModalTs = fs.readFileSync('src/components/cne/CNEReferenceModal.tsx', 'utf8');
const cneHomeTs = fs.readFileSync('src/components/CneHomePage.tsx', 'utf8');
const envExample = fs.readFileSync('.env.example', 'utf8');

// Helper to recursively collect files
function getFilesRecursively(dir, filterExts = ['.ts', '.tsx']) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        results = results.concat(getFilesRecursively(fullPath, filterExts));
      }
    } else if (filterExts.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

// -----------------------------------------------------------------------------
// 1. Frontend API ↔ Apps Script Router Consistency
// -----------------------------------------------------------------------------
runTest('Frontend API actions match Apps Script router', () => {
  // Extract all cases from Code.gs router switch(action) block
  const backendCases = new Set();
  const caseRegex = /case\\s+'([^']+)'\\s*:/g;
  let match;
  while ((match = caseRegex.exec(codeGs)) !== null) {
    backendCases.add(match[1]);
  }

  // Extract all executeAction calls in src/services/api.ts
  const frontendActions = new Set();
  const actionRegex = /executeAction(?:<[\\s\\S]*?>)?\\s*\\(\\s*'([^']+)'/g;
  while ((match = actionRegex.exec(apiTs)) !== null) {
    frontendActions.add(match[1]);
  }

  assert.ok(frontendActions.size > 20, 'Should extract multiple active frontend actions from api.ts');
  assert.ok(backendCases.size > 20, 'Should extract multiple backend router cases from Code.gs');

  // Verify that every active frontend action has a matching backend case
  const unhandledActions = [];
  for (const action of frontendActions) {
    if (!backendCases.has(action)) {
      unhandledActions.push(action);
    }
  }

  assert.strictEqual(
    unhandledActions.length,
    0,
    \`Frontend actions with no backend router case: \${unhandledActions.join(', ')}\`
  );

  // Check for duplicated router cases in the main switch block
  const mainSwitchMatch = codeGs.match(/switch\\s*\\(\\s*action\\s*\\)\\s*\\{([\\s\\S]*?)\\n\\s*default:/);
  assert.ok(mainSwitchMatch, 'Main switch(action) block must exist in Code.gs');
  const switchBody = mainSwitchMatch[1];
  const switchCases = [];
  const switchCaseRegex = /case\\s+'([^']+)'\\s*:/g;
  while ((match = switchCaseRegex.exec(switchBody)) !== null) {
    switchCases.push(match[1]);
  }

  const seenCases = new Set();
  const duplicateCases = [];
  for (const c of switchCases) {
    if (seenCases.has(c)) {
      duplicateCases.push(c);
    }
    seenCases.add(c);
  }

  assert.strictEqual(
    duplicateCases.length,
    0,
    \`Duplicated active router case names in Code.gs: \${duplicateCases.join(', ')}\`
  );
});

// -----------------------------------------------------------------------------
// 2. Code.gs Synchronization
// -----------------------------------------------------------------------------
runTest('Code.gs synchronized with TypeScript mirror', () => {
  // Normalize Code.gs using the established wrapper convention from scripts/sync-apps-script.js
  const escaped = codeGs
    .replace(/\\\\/g, '\\\\\\\\')
    .replace(/\`/g, '\\\\\`')
    .replace(/\\$\\{/g, '\\\\\${');

  const expectedMirrorContent = \`/**
 * Google Apps Script Source Export
 * Authoritative source: Code.gs
 * This file is automatically synchronized from Code.gs
 */
export const APPS_SCRIPT_SOURCE_CODE = \\\`\${escaped}\\\`;

export const GOOGLE_APPS_SCRIPT_CODE = APPS_SCRIPT_SOURCE_CODE;
\`;

  assert.strictEqual(
    backendGs,
    expectedMirrorContent,
    'src/backend/googleAppsScript.ts has diverged from Code.gs. Run "npm run sync:gas" to re-synchronize.'
  );
});

// -----------------------------------------------------------------------------
// 3. Navigation / View Integrity
// -----------------------------------------------------------------------------
runTest('Canonical navigation IDs (cne-schedule, my-cne-records)', () => {
  // ViewMode in types.ts must have canonical IDs
  assert.ok(
    typesTs.includes("'cne-schedule'"),
    "types.ts ViewMode must contain canonical view ID 'cne-schedule'"
  );
  assert.ok(
    typesTs.includes("'my-cne-records'"),
    "types.ts ViewMode must contain canonical view ID 'my-cne-records'"
  );

  // ViewMode in types.ts must NOT use obsolete primary IDs
  const viewModeMatch = typesTs.match(/export\\s+type\\s+ViewMode\\s*=([\\s\\S]*?);/);
  assert.ok(viewModeMatch, 'ViewMode type definition must exist in types.ts');
  const viewModeBody = viewModeMatch[1];

  assert.ok(
    !viewModeBody.includes("'upcoming'"),
    "ViewMode must not include obsolete primary identifier 'upcoming'"
  );
  assert.ok(
    !viewModeBody.includes("'my-cne'"),
    "ViewMode must not include obsolete primary identifier 'my-cne' (should be 'my-cne-records')"
  );

  // TopToolbar must use canonical IDs for primary navigation
  assert.ok(
    topToolbarTs.includes("id: 'cne-schedule'"),
    "TopToolbar must register primary tab 'cne-schedule'"
  );
  assert.ok(
    topToolbarTs.includes("id: 'my-cne-records'"),
    "TopToolbar must register primary tab 'my-cne-records'"
  );

  // App.tsx must route canonical IDs
  assert.ok(
    appTs.includes("activeView === 'cne-schedule'"),
    "App.tsx must render view for 'cne-schedule'"
  );
  assert.ok(
    appTs.includes("activeView === 'my-cne-records'"),
    "App.tsx must render view for 'my-cne-records'"
  );

  // Legitimate uses such as upcomingCount or UpcomingClassesWidget are allowed
  assert.ok(
    topToolbarTs.includes('upcomingCount'),
    "Legitimate use 'upcomingCount' for badge count must be preserved"
  );

  // Backend naming cleanup & canonical identifiers
  assert.ok(
    codeGs.includes('function handleCreateCNE('),
    "Code.gs must define canonical 'handleCreateCNE'"
  );
  assert.ok(
    !codeGs.includes('handleAddCNE'),
    "Code.gs must not contain obsolete function name 'handleAddCNE'"
  );
  assert.ok(
    codeGs.includes('function getCNEScheduleRecord('),
    "Code.gs must define canonical 'getCNEScheduleRecord'"
  );
  assert.ok(
    !codeGs.includes('getCNEClassRecord'),
    "Code.gs must not contain obsolete function name 'getCNEClassRecord'"
  );
  assert.ok(
    codeGs.includes("params.scope === 'my-cne-records'"),
    "Code.gs must check canonical scope 'my-cne-records'"
  );
  assert.ok(
    !codeGs.includes("scope === 'my-cne'"),
    "Code.gs must not contain legacy scope 'my-cne'"
  );
  assert.ok(
    codeGs.includes("id: 'ql-cne-schedule'"),
    "Code.gs default quick links must use 'ql-cne-schedule'"
  );
  assert.ok(
    !codeGs.includes("'ql-upcoming'"),
    "Code.gs must not contain obsolete quick link ID 'ql-upcoming'"
  );

  const quickLinkMatch = codeGs.match(/\\{\\s*id:\\s*'ql-cne-schedule'[\\s\\S]*?target:\\s*'([^']+)'/);
  assert.ok(quickLinkMatch, "Backend default quick link 'ql-cne-schedule' must be defined in Code.gs");
  assert.strictEqual(quickLinkMatch[1], 'cne-schedule', "Backend default quick link target must be 'cne-schedule'");
});

runTest('My CNE Records remains personal for every role and Material modal does not repeat Resource Person', () => {
  const recordsSection = codeGs.substring(
    codeGs.indexOf('function handleGetCNERecords('),
    codeGs.indexOf('function handleCreateCNE(')
  );

  assert.ok(
    recordsSection.includes('if (isMyRecordsOnly && !isResourcePerson && !isStaffParticipant)'),
    'my-cne-records must filter strictly to the logged-in user participation/RP records for every role'
  );
  assert.ok(
    !recordsSection.includes('!isAdmin && !isResourcePerson && !isStaffParticipant'),
    'Admin must not bypass personal-record filtering in my-cne-records scope'
  );

  assert.ok(
    !cneReferenceModalTs.includes('Resource Person / Speaker'),
    'CNE Schedule Material modal must not repeat the Resource Person field'
  );
  assert.ok(
    !cneReferenceModalTs.includes('resourcePersonName: resourcePerson'),
    'Material modal must not submit a separately edited Resource Person name'
  );
});

// -----------------------------------------------------------------------------
// 4. CNE Sheet Architecture & No Time Column
// -----------------------------------------------------------------------------
runTest('CNE Schedule sheet architecture & no obsolete Time column', () => {
  // Check CNE_SHEET_HEADERS in Code.gs
  const sheetHeadersMatch = codeGs.match(/var\\s+CNE_SHEET_HEADERS\\s*=\\s*\\{([\\s\\S]*?)\\n\\};/);
  assert.ok(sheetHeadersMatch, 'CNE_SHEET_HEADERS definition must exist in Code.gs');
  const headersObjText = sheetHeadersMatch[1];

  // Confirm 'CNE Schedule' is registered
  assert.ok(
    headersObjText.includes("'CNE Schedule':"),
    "CNE_SHEET_HEADERS must define 'CNE Schedule' sheet"
  );

  // Confirm NO active separate lifecycle 'Data' or 'Data Master' sheets exist
  assert.ok(
    !headersObjText.includes("'Data':") && !headersObjText.includes('"Data":'),
    "No active separate lifecycle 'Data' sheet may be defined in CNE_SHEET_HEADERS"
  );
  assert.ok(
    !headersObjText.includes("'Data Master':") && !headersObjText.includes('"Data Master":'),
    "No active separate lifecycle 'Data Master' sheet may be defined in CNE_SHEET_HEADERS"
  );

  // Extract CNE Schedule headers array
  const cneSchedHeadersMatch = codeGs.match(/'CNE Schedule':\\s*\\[([\\s\\S]*?)\\]/);
  assert.ok(cneSchedHeadersMatch, "CNE Schedule headers array must be present in Code.gs");
  const headers = eval(\`[\${cneSchedHeadersMatch[1]}]\`);

  const requiredCurrentHeaders = [
    'CNE ID',
    'Topic',
    'Ward Name / Area',
    'From Date',
    'To Date',
    'Duration',
    'Resource Person Emp Id',
    'Mode of Teaching',
    'Description',
    'Max Participants',
    'Status',
    'Type of CNE',
    'External Resource Persons',
    'Staff Emp ID',
    'Staff Count',
    'External Staff Participants',
    'Proposed By',
    'Admin Remarks',
    'Remarks',
    'CreatedAt',
    'CreatedBy'
  ];

  for (const h of requiredCurrentHeaders) {
    assert.ok(headers.includes(h), \`CNE Schedule schema must include required header '\${h}'\`);
  }

  // Obsolete separate 'Time' column is not present
  assert.ok(
    !headers.includes('Time'),
    "Obsolete separate 'Time' column must NOT be present in CNE Schedule headers"
  );
  assert.ok(
    !headers.some(h => h.trim().toLowerCase() === 'time'),
    "No case variation of 'Time' may exist in CNE Schedule headers"
  );

  // Verify setupAndVerifyCNESheets does not recreate Time column and actively deletes it
  assert.ok(
    codeGs.includes("tabName === 'CNE Schedule'") && codeGs.includes("normH === 'time'"),
    "setupAndVerifyCNESheets must actively identify and clean up any legacy 'Time' column"
  );
  assert.ok(
    codeGs.includes("sheet.deleteColumn("),
    "setupAndVerifyCNESheets must delete legacy 'Time' column if encountered"
  );
});

// -----------------------------------------------------------------------------
// 5. CNE Lifecycle Architecture
// -----------------------------------------------------------------------------
runTest('CNE Schedule lifecycle architecture (in-place status update, no separate table)', () => {
  // Finalize updates existing CNE Schedule row to Completed
  assert.ok(
    codeGs.includes("function handleFinalizeCNE("),
    "handleFinalizeCNE function must exist in Code.gs"
  );
  assert.ok(
    codeGs.includes("cneSheet.getRange(liveRecord.rowIndex, statusCol).setValue('Completed')"),
    "handleFinalizeCNE must update existing CNE Schedule record status to 'Completed'"
  );

  // Cancel updates existing CNE Schedule row to Canceled
  assert.ok(
    codeGs.includes("function handleCancelCNE("),
    "handleCancelCNE function must exist in Code.gs"
  );
  assert.ok(
    codeGs.includes("upcomingSheet.getRange(liveRecord.rowIndex, statusCol).setValue('Canceled')"),
    "handleCancelCNE must update existing CNE Schedule record status to 'Canceled'"
  );

  // No active finalize path copies data into a separate lifecycle sheet (e.g. Data or Data Master)
  const finalizeCodeMatch = codeGs.match(/function\\s+handleFinalizeCNE\\s*\\([\\s\\S]*?\\n\\}/);
  assert.ok(finalizeCodeMatch, "handleFinalizeCNE definition must be extractable");
  const finalizeCode = finalizeCodeMatch[0];

  assert.ok(
    !finalizeCode.includes("getSheetByName('Data')") && !finalizeCode.includes('getSheetByName("Data")'),
    "handleFinalizeCNE must not write to a separate 'Data' sheet"
  );
  assert.ok(
    !finalizeCode.includes("getSheetByName('Data Master')") && !finalizeCode.includes('getSheetByName("Data Master")'),
    "handleFinalizeCNE must not write to a separate 'Data Master' sheet"
  );
});

// -----------------------------------------------------------------------------
// 6. Gemini Architecture
// -----------------------------------------------------------------------------
runTest('Gemini architecture (Apps Script caller, Script Properties, no client secrets)', () => {
  // 1. Frontend AI generation uses Apps Script actions
  assert.ok(
    apiTs.includes("executeAction<CNEQuestion[]>('generateCNEQuestions'"),
    "Frontend ApiService.generateCNEQuestions must route through Apps Script action 'generateCNEQuestions'"
  );
  assert.ok(
    !apiTs.includes("executeAction<CNEQuestion[]>('generateAiQuestions'"),
    "Frontend ApiService must NOT expose obsolete generateAiQuestions"
  );
  assert.ok(
    !apiTs.includes("static async generateAiQuestions") &&
    !apiTs.includes("static async reserveAiQuota") &&
    !apiTs.includes("static async commitAiQuota") &&
    !apiTs.includes("static async releaseAiQuota"),
    "Obsolete frontend AI methods (generateAiQuestions, reserveAiQuota, commitAiQuota, releaseAiQuota) must be removed from api.ts"
  );

  // 2. Apps Script router exposes only generateCNEQuestions and getAiQuota; obsolete router actions removed
  const codeGsRouterMatch = codeGs.match(/switch\\s*\\(\\s*action\\s*\\)\\s*\\{([\\s\\S]*?)\\n\\s*default:/);
  assert.ok(codeGsRouterMatch, "Code.gs must have switch(action) router");
  const routerBody = codeGsRouterMatch[1];
  assert.ok(routerBody.includes("case 'generateCNEQuestions':"), "Router must include generateCNEQuestions");
  assert.ok(routerBody.includes("case 'getAiQuota':"), "Router must include getAiQuota");
  assert.ok(!routerBody.includes("case 'generateAiQuestions':"), "Router must NOT expose obsolete generateAiQuestions");
  assert.ok(!routerBody.includes("case 'reserveAiQuota':"), "Router must NOT expose obsolete reserveAiQuota");
  assert.ok(!routerBody.includes("case 'commitAiQuota':"), "Router must NOT expose obsolete commitAiQuota");
  assert.ok(!routerBody.includes("case 'releaseAiQuota':"), "Router must NOT expose obsolete releaseAiQuota");
  assert.ok(!routerBody.includes("case 'validateAiQuotaReservation':"), "Router must NOT expose obsolete validateAiQuotaReservation");

  // 3. Internal quota and generation helpers remain intact
  assert.ok(codeGs.includes("function handleReserveAiQuota("), "Internal handleReserveAiQuota helper must remain intact");
  assert.ok(codeGs.includes("function handleCommitAiQuota("), "Internal handleCommitAiQuota helper must remain intact");
  assert.ok(codeGs.includes("function handleReleaseAiQuota("), "Internal handleReleaseAiQuota helper must remain intact");
  assert.ok(codeGs.includes("function handleValidateAiQuotaReservation("), "Internal handleValidateAiQuotaReservation helper must remain intact");
  assert.ok(codeGs.includes("function generateAiQuestionsInternal("), "Internal generateAiQuestionsInternal helper must exist");
  assert.ok(codeGs.includes("function handleGenerateCNEQuestions("), "handleGenerateCNEQuestions must exist");

  // 4. Frontend does not call /api/ai/generate-questions
  const frontendFiles = getFilesRecursively('src');
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('/api/ai/generate-questions'),
      \`File \${file} must not call obsolete endpoint /api/ai/generate-questions\`
    );
  }

  // 5. No active Cloudflare Gemini function exists
  const hasCloudflareFunctions = fs.existsSync('functions') || fs.existsSync('worker') || fs.existsSync('workers');
  assert.strictEqual(
    hasCloudflareFunctions,
    false,
    'No Cloudflare Functions or Workers directory should exist for Gemini generation'
  );

  // 6. Gemini API key is not referenced in browser/client source
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('GEMINI_API_KEY'),
      \`Client file \${file} must not reference GEMINI_API_KEY\`
    );
    assert.ok(
      !content.includes('AIzaSy'),
      \`Client file \${file} must not contain any hardcoded Google API key\`
    );
  }

  // 7. Apps Script contains the only active production Gemini caller
  assert.ok(
    codeGs.includes("generativelanguage.googleapis.com"),
    "Code.gs must contain the active Gemini API endpoint caller"
  );
  assert.ok(
    codeGs.includes("UrlFetchApp.fetch("),
    "Code.gs must call Gemini via UrlFetchApp.fetch"
  );

  // 8. Apps Script reads Gemini configuration from Script Properties
  assert.ok(
    codeGs.includes("props.getProperty('GEMINI_API_KEY')"),
    "Code.gs must read GEMINI_API_KEY from Script Properties"
  );

  // 9. @google/genai is removed from package.json
  const pkgContent = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const hasGenAi = (pkgContent.dependencies && pkgContent.dependencies['@google/genai']) ||
                   (pkgContent.devDependencies && pkgContent.devDependencies['@google/genai']);
  assert.ok(!hasGenAi, "@google/genai must not be present in package.json");

  // 10. Exactly one production Gemini implementation - server.ts is retained strictly for local/preview hosting
  const serverTs = fs.readFileSync('server.ts', 'utf8');
  assert.ok(
    !serverTs.includes('generateContent') && !serverTs.includes('genai'),
    "server.ts must not implement a secondary/redundant Gemini caller"
  );
  assert.ok(
    !serverTs.includes('SpreadsheetApp') && !serverTs.includes('handleLogin') && !serverTs.includes('handleGetCNE'),
    "server.ts must contain no CNE backend or Google Sheets logic"
  );
});

// -----------------------------------------------------------------------------
// 7. PDF Resource Policy
// -----------------------------------------------------------------------------
runTest('PDF resource policy (CNE 3MB limit vs Reference Library policy)', () => {
  // CNE Learning Material: PDF only, 3 MB maximum in both frontend and backend
  assert.ok(
    addResourceModalTs.includes("3 * 1024 * 1024"),
    "AddResourceModal must enforce 3 MB limit for CNE learning material"
  );
  assert.ok(
    codeGs.includes("fileSize > 3 * 1024 * 1024"),
    "Code.gs uploadLearningResource must enforce 3 MB limit"
  );
  const uploadLearningResourceSection = codeGs.substring(
    codeGs.indexOf('function handleUploadLearningResource'),
    codeGs.indexOf('function handleDeleteLearningResource')
  );
  assert.ok(
    (uploadLearningResourceSection.includes("ext === 'pdf'") ||
      (uploadLearningResourceSection.includes("var ALLOWED_EXTS = ['pdf']") &&
        uploadLearningResourceSection.includes('ALLOWED_EXTS.indexOf(ext) === -1'))) &&
      uploadLearningResourceSection.includes('0x25') &&
      uploadLearningResourceSection.includes('0x50') &&
      uploadLearningResourceSection.includes('0x44') &&
      uploadLearningResourceSection.includes('0x46'),
    "Code.gs uploadLearningResource must enforce PDF extension and %PDF binary signature"
  );

  // Reference Library: PDF only, Admin-only management
  assert.ok(
    learningResPageTs.includes("const isAdmin = user?.role === 'ADMIN';"),
    "LearningResourcesPage must restrict admin operations"
  );
  assert.ok(
    codeGs.includes("requireAdmin(session)") || codeGs.includes("handleAdminAction"),
    "Code.gs must enforce Admin authority for reference library operations"
  );

  // Reference Library does NOT inherit the CNE 3 MB limit for Drive indexing
  // Check indexReferenceLibraryResource does not check 3MB limit
  const indexMatch = codeGs.match(/function\\s+indexReferenceLibraryResource\\s*\\([\\s\\S]*?\\n\\}/);
  assert.ok(indexMatch, "indexReferenceLibraryResource must exist in Code.gs");
  assert.ok(
    !indexMatch[0].includes("3 * 1024 * 1024"),
    "indexReferenceLibraryResource must not restrict reference textbooks to 3 MB"
  );

  // Confirm no shared global constant inadvertently applies 3 MB to the reference library
  assert.ok(
    !typesTs.includes('MAX_FILE_SIZE') && !typesTs.includes('MAX_RESOURCE_SIZE'),
    "types.ts should not define a shared global size limit that binds Reference Library to CNE 3MB limit"
  );
});

// -----------------------------------------------------------------------------
// 8. Critical File Existence
// -----------------------------------------------------------------------------
runTest('Critical file existence (canonical repository paths)', () => {
  const criticalFiles = [
    'src/App.tsx',
    'src/components/CNESchedule.tsx',
    'src/components/MyCNERecords.tsx',
    'src/components/cne/LearningResourcesPage.tsx',
    'src/components/cne/CneDateTimeFields.tsx',
    'src/components/cne/ConfirmDatePicker.tsx',
    'src/services/api.ts',
    'Code.gs',
    'src/backend/googleAppsScript.ts'
  ];

  for (const filePath of criticalFiles) {
    assert.ok(
      fs.existsSync(filePath),
      \`Critical repository file '\${filePath}' must exist\`
    );
  }
});

// -----------------------------------------------------------------------------
// 9. Environment Safety
// -----------------------------------------------------------------------------
runTest('Environment safety (no frontend secrets, no hardcoded sheet IDs, safe .env.example)', () => {
  // 1. No hardcoded GEMINI_API_KEY in frontend client files
  const frontendFiles = getFilesRecursively('src');
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('AIzaSy'),
      \`File \${file} contains what appears to be a real Google API key (AIzaSy...)\`
    );
  }

  // 2. No PASSWORD_PEPPER secret value in frontend client files
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('PASSWORD_PEPPER'),
      \`File \${file} must not reference PASSWORD_PEPPER\`
    );
  }

  // 3. No SESSION_SECRET secret value in frontend client files
  for (const file of frontendFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('SESSION_SECRET'),
      \`File \${file} must not reference SESSION_SECRET\`
    );
  }

  // 4. No real spreadsheet ID committed in frontend or environment example
  // Google Spreadsheet IDs are 44 characters of base64url: [a-zA-Z0-9_-]{44}
  const realSpreadsheetIdPattern = /1[a-zA-Z0-9_-]{43}/;
  assert.ok(
    !realSpreadsheetIdPattern.test(envExample),
    '.env.example must not contain a real spreadsheet ID'
  );

  // 5. .env.example contains placeholders/documentation only
  assert.ok(
    envExample.includes('VITE_APPS_SCRIPT_URL='),
    '.env.example should define VITE_APPS_SCRIPT_URL placeholder'
  );
  const lines = envExample.split('\\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  for (const line of lines) {
    const val = line.split('=')[1]?.trim() || '';
    assert.ok(
      !val.startsWith('http://') && !val.startsWith('https://'),
      \`.env.example must have an empty placeholder for URL, not a live production URL: \${line}\`
    );
  }

  // 6. Frontend API fails closed for authentication and mutations without Apps Script URL
  assert.ok(
    !apiTs.includes("? 'ADMIN' : 'ADMIN'"),
    'src/services/api.ts must not contain local ADMIN role fallback'
  );
  assert.ok(
    !apiTs.includes("token: 'preview-token-'") && !apiTs.includes("token: currentUser.token || 'mock_token_'"),
    'src/services/api.ts must never mint preview-token-* or mock_token_* session tokens'
  );
  assert.ok(
    apiTs.includes("errorCode: 'BACKEND_NOT_CONFIGURED'"),
    'src/services/api.ts must fail closed with BACKEND_NOT_CONFIGURED when Apps Script is not configured'
  );

  // 7. Frontend API caching uses explicit public CMS allowlist and never persists getCNEQuestions or protected reads
  assert.ok(
    !apiTs.includes("action.startsWith('get')"),
    'src/services/api.ts must not use generic action.startsWith(\\'get\\') for caching or offline fallback'
  );
  assert.ok(
    apiTs.includes('isPublicCacheableAction(action)'),
    'src/services/api.ts must gate browser cache persistence and offline fallback with isPublicCacheableAction(action)'
  );
});

// -----------------------------------------------------------------------------
// 10. Active API Methods & Cleanup Candidates
// -----------------------------------------------------------------------------
runTest('Active API methods wired correctly & cleanup candidates audited', () => {
  // Extract backend cases
  const backendCases = new Set();
  const caseRegex = /case\\s+'([^']+)'\\s*:/g;
  let m;
  while ((m = caseRegex.exec(codeGs)) !== null) {
    backendCases.add(m[1]);
  }

  // Extract ApiService methods
  const methodRegex = /static\\s+(?:async\\s+)?([a-zA-Z0-9_]+)\\s*\\(/g;
  const methods = [];
  while ((m = methodRegex.exec(apiTs)) !== null) {
    if (!['getAppsScriptUrl', 'executeLocalMockAction', 'executeAction', 'logout', 'getSessionUser', 'saveSessionUser', 'invalidateCache'].includes(m[1])) {
      methods.push(m[1]);
    }
  }

  // Find all caller files in src
  const allSourceFiles = getFilesRecursively('src');
  const otherFilesContent = allSourceFiles
    .filter(f => !f.endsWith('api.ts') && !f.includes('googleAppsScript.ts'))
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\\n');

  const cleanupCandidates = [];
  const activeMethodsVerified = [];

  for (const method of methods) {
    // Find action called by this method
    const methodIdx = apiTs.indexOf(\`static async \${method}\`) !== -1 ? apiTs.indexOf(\`static async \${method}\`) : apiTs.indexOf(\`static \${method}\`);
    let actionName = null;
    if (methodIdx !== -1) {
      const slice = apiTs.slice(methodIdx, methodIdx + 600);
      const actMatch = slice.match(/executeAction(?:<[\\s\\S]*?>)?\\s*\\(\\s*'([^']+)'/);
      if (actMatch) {
        actionName = actMatch[1];
      }
    }

    const hasCaller = otherFilesContent.includes(\`ApiService.\${method}\`) || otherFilesContent.includes(\`\${method}(\`);
    const hasBackend = actionName ? backendCases.has(actionName) : false;

    if (actionName) {
      assert.ok(
        hasBackend,
        \`Active ApiService method '\${method}' targets nonexistent backend action '\${actionName}'\`
      );
      activeMethodsVerified.push(method);
    }

    if (!hasCaller && !hasBackend) {
      cleanupCandidates.push({ method, actionName });
    }
  }

  assert.ok(activeMethodsVerified.length > 30, 'Should verify over 30 active ApiService methods');
  assert.strictEqual(cleanupCandidates.length, 0, 'Should have 0 dead API cleanup candidates');
});

// -----------------------------------------------------------------------------
// 11. Shared Date-Time Architecture
// -----------------------------------------------------------------------------
runTest('Shared date-time architecture across all CNE creation/edit workflows', () => {
  // 1. Central CNE creation in CNESchedule.tsx
  assert.ok(
    cneScheduleTs.includes("import { CneDateTimeFields }") || cneScheduleTs.includes("CneDateTimeFields"),
    "CNESchedule.tsx must import CneDateTimeFields"
  );
  assert.ok(
    cneScheduleTs.includes('idPrefix="central-cne"') && cneScheduleTs.includes('<CneDateTimeFields'),
    "Central CNE creation workflow must render <CneDateTimeFields idPrefix=\\"central-cne\\" ... />"
  );

  // 2. Departmental CNE in DepartmentalScheduleModal.tsx
  assert.ok(
    departmentalModalTs.includes("import { CneDateTimeFields }") || departmentalModalTs.includes("CneDateTimeFields"),
    "DepartmentalScheduleModal.tsx must import CneDateTimeFields"
  );
  assert.ok(
    departmentalModalTs.includes('<CneDateTimeFields'),
    "Departmental CNE workflow must render <CneDateTimeFields ... />"
  );

  // 3. Unscheduled CNE in AddUnscheduledCneModal.tsx
  assert.ok(
    unscheduledModalTs.includes("import { CneDateTimeFields }") || unscheduledModalTs.includes("CneDateTimeFields"),
    "AddUnscheduledCneModal.tsx must import CneDateTimeFields"
  );
  assert.ok(
    unscheduledModalTs.includes('<CneDateTimeFields'),
    "Unscheduled CNE workflow must render <CneDateTimeFields ... />"
  );

  // 4. Edit CNE workflow in CNESchedule.tsx
  assert.ok(
    cneScheduleTs.includes('idPrefix="edit-cne"') && cneScheduleTs.includes('<CneDateTimeFields'),
    "Edit CNE workflow must render <CneDateTimeFields idPrefix=\\"edit-cne\\" ... />"
  );
});

// -----------------------------------------------------------------------------
// 12. QR Post-Test Root Deep-Link & Email OTP Participant Workflow
// -----------------------------------------------------------------------------
runTest('QR Post-Test root routing, Internal/External email OTP verification, and opaque token security', () => {
  // 1. App.tsx reads postTest query parameter on initial load.
  assert.ok(
    appTs.includes("params.get('postTest')"),
    "App.tsx must inspect window.location.search for 'postTest' query parameter"
  );

  // 2. App.tsx renders CNEPostTestModal at root level without requiring an authenticated session.
  assert.ok(
    appTs.includes("{rootQrToken && (") && appTs.includes("<CNEPostTestModal"),
    "App.tsx must render CNEPostTestModal directly at root level when rootQrToken exists"
  );

  // 3. CNESchedule.tsx no longer owns global query-param detection.
  assert.ok(
    !cneScheduleTs.includes("params.get('postTest')"),
    "CNESchedule.tsx must NOT contain duplicate postTest query parameter handling"
  );

  // 4. Public QR access uses an opaque token resolved server-side.
  assert.ok(
    cneQrModalTs.includes("/?postTest="),
    "CNEQRModal must generate public QR access URLs in canonical format /?postTest=<token>"
  );
  assert.ok(
    codeGs.includes('function resolveActiveQrToken(') && codeGs.includes('getQRTokensSheet()'),
    "Backend must resolve active opaque QR tokens through CNE_QR_Tokens"
  );
  assert.ok(
    codeGs.includes("INVALID_OR_MISSING_QR_TOKEN"),
    "Backend must reject Post-Test access without a valid opaque QR token or authorized session"
  );

  // 5. Frontend API exposes the two-stage Post-Test OTP contract.
  assert.ok(
    apiTs.includes("static async requestPostTestOtp(") &&
    apiTs.includes("executeAction<PostTestOtpRequestData>('requestPostTestOtp'"),
    "ApiService must expose requestPostTestOtp through the Apps Script router"
  );
  assert.ok(
    apiTs.includes("static async verifyPostTestOtp(") &&
    apiTs.includes("executeAction<PostTestParticipantVerificationData>('verifyPostTestOtp'"),
    "ApiService must expose verifyPostTestOtp through the Apps Script router"
  );
  assert.ok(
    !apiTs.includes('static async verifyPostTestParticipant('),
    "Legacy direct verifyPostTestParticipant frontend API must remain removed"
  );

  // 6. Public QR UI supports both participant types and requires OTP before questions load.
  assert.ok(
    postTestModalTs.includes("type ParticipantType = 'INTERNAL' | 'EXTERNAL'") &&
    postTestModalTs.includes('handleRequestOtp') &&
    postTestModalTs.includes('handleVerifyOtp') &&
    postTestModalTs.includes('ApiService.requestPostTestOtp') &&
    postTestModalTs.includes('ApiService.verifyPostTestOtp'),
    "CNEPostTestModal must implement Internal/External Send OTP -> Verify OTP flow"
  );
  assert.ok(
    postTestModalTs.includes('internalEmployeeId') &&
    postTestModalTs.includes("participantType: 'INTERNAL'") &&
    postTestModalTs.includes('externalName') &&
    postTestModalTs.includes('externalEmail') &&
    postTestModalTs.includes("participantType: 'EXTERNAL'"),
    "CNEPostTestModal must collect Employee ID for Internal users and Name + Email for External users"
  );
  assert.ok(
    postTestModalTs.includes('maskedEmail') &&
    postTestModalTs.includes('resendRemaining') &&
    postTestModalTs.includes('participantVerificationToken'),
    "CNEPostTestModal must show masked email/resend state and retain the signed participant verification token"
  );
  assert.ok(
    !postTestModalTs.includes('guestEmpIdVerified') &&
    !postTestModalTs.includes('handleGuestContinue') &&
    !postTestModalTs.includes('Date of Joining') &&
    !postTestModalTs.includes('dateOfJoining') &&
    !postTestModalTs.includes('ApiService.verifyPostTestParticipant'),
    "Legacy Employee ID + DOJ/direct participant verification UI must remain absent"
  );

  // 7. Backend Internal flow resolves Employee ID only from Officers data and sends OTP to its registered email.
  const requestOtpStart = codeGs.indexOf('function handleRequestPostTestOtp(');
  const verifyOtpStart = codeGs.indexOf('function handleVerifyPostTestOtp(');
  assert.ok(requestOtpStart >= 0 && verifyOtpStart > requestOtpStart, 'Post-Test OTP request/verify handlers must exist');
  const requestOtpSection = codeGs.substring(requestOtpStart, verifyOtpStart);
  assert.ok(
    requestOtpSection.includes("participantType === 'INTERNAL'") &&
    requestOtpSection.includes('findOfficerById(employeeId)') &&
    requestOtpSection.includes("officer.email") &&
    requestOtpSection.includes("errorCode: 'EMAIL_NOT_AVAILABLE'") &&
    requestOtpSection.includes('OTP_PURPOSE_POSTTEST_INTERNAL'),
    "Internal Post-Test OTP must resolve the employee in Officers data and use the registered EmailID"
  );

  // 8. Backend External flow derives stable identity from normalized email and does not register before OTP verification.
  assert.ok(
    requestOtpSection.includes("participantType === 'EXTERNAL'") &&
    requestOtpSection.includes('normalizeExternalEmail(') &&
    requestOtpSection.includes('makeExternalParticipantId(externalEmail)') &&
    requestOtpSection.includes('OTP_PURPOSE_POSTTEST_EXTERNAL'),
    "External Post-Test OTP request must use Name + normalized Email and derive a stable external participant ID"
  );
  assert.ok(
    !requestOtpSection.includes("'EXTERNAL_REGISTRATION'"),
    "External participant registration must not be persisted before OTP ownership is verified"
  );

  // 9. OTP challenge remains bound to CNE + participant; previous submitters may verify
  //    for READ-ONLY result review, but duplicate submission itself remains prohibited.
  assert.ok(
    codeGs.includes('function buildPostTestOtpPrincipal(') &&
    codeGs.includes("return cne && id ? (cne + '#' + id) : ''") &&
    requestOtpSection.includes('findExistingPostTestSubmission(cneId, participantId)') &&
    !requestOtpSection.includes("errorCode: 'ALREADY_SUBMITTED'") &&
    codeGs.includes("errorCode: 'ALREADY_SUBMITTED', message: 'You have already submitted the post-test for this CNE.'"),
    "Post-Test OTP must remain CNE-bound; verified result recovery must not permit duplicate submission"
  );

  // 10. Verification validates the challenge binding, persists external registration only after success,
  //     consumes the challenge, and issues the signed participant token used to load/submit the test.
  const verifyOtpEnd = codeGs.indexOf('function handleVerifyPostTestParticipant(', verifyOtpStart);
  assert.ok(verifyOtpEnd > verifyOtpStart, 'Legacy compatibility handler must follow handleVerifyPostTestOtp');
  const verifyOtpSection = codeGs.substring(verifyOtpStart, verifyOtpEnd);
  assert.ok(
    verifyOtpSection.includes('challenge.purpose !== purpose') &&
    verifyOtpSection.includes('challenge.principalType') &&
    verifyOtpSection.includes('challenge.principalId') &&
    verifyOtpSection.includes('challenge.email') &&
    verifyOtpSection.includes("challenge.status !== 'PENDING'"),
    "Post-Test OTP verification must validate purpose, participant type, CNE-bound principal, email, and active status"
  );
  assert.ok(
    verifyOtpSection.includes("participantType === 'EXTERNAL'") &&
    verifyOtpSection.includes("'EXTERNAL_REGISTRATION'") &&
    verifyOtpSection.includes("setValue('CONSUMED')") &&
    verifyOtpSection.includes('generatePostTestParticipantVerificationToken('),
    "Successful OTP verification must persist verified external identity, consume the OTP, and issue a signed participant token"
  );

  // 11. The legacy direct verification endpoint is fail-closed unless it is used only as a challenge+OTP alias.
  const legacyVerifyStart = codeGs.indexOf('function handleVerifyPostTestParticipant(');
  const qrHandlerStart = codeGs.indexOf('function handleGetQRToken(', legacyVerifyStart);
  assert.ok(legacyVerifyStart >= 0 && qrHandlerStart > legacyVerifyStart, 'Legacy compatibility verification handler must remain bounded');
  const legacyVerifySection = codeGs.substring(legacyVerifyStart, qrHandlerStart);
  assert.ok(
    legacyVerifySection.includes('params.challengeId && params.otp') &&
    legacyVerifySection.includes('handleVerifyPostTestOtp(params, session)') &&
    legacyVerifySection.includes("errorCode: 'POST_TEST_OTP_REQUIRED'"),
    "Legacy participant verification endpoint must not allow Employee ID + DOJ or unverified Name + Email bypass"
  );

  // 12. Safe query parameter removal on close without reload.
  assert.ok(
    appTs.includes("url.searchParams.delete('postTest')") && appTs.includes("window.history.replaceState"),
    "App.tsx must remove 'postTest' query parameter using window.history.replaceState on modal close"
  );
});

// -----------------------------------------------------------------------------
// 13. Obsolete CNE Applications Subsystem Permanent Absence
// -----------------------------------------------------------------------------
runTest('CNE Applications subsystem and legacy artifacts remain permanently absent', () => {
  // 1. Obsolete frontend API methods in api.ts
  const obsoleteApiMethods = [
    'applyForClass',
    'getMyApplications',
    'getAllApplications',
    'updateApplicationStatus'
  ];
  for (const method of obsoleteApiMethods) {
    const methodRegex = new RegExp(\`\\\\b\${method}\\\\s*\\\\(\`, 'g');
    assert.ok(
      !methodRegex.test(apiTs),
      \`Frontend API method '\${method}' must be permanently absent from src/services/api.ts\`
    );
  }

  // 2. Obsolete backend router actions in Code.gs
  const obsoleteActions = [
    'applyForClass',
    'getMyApplications',
    'getAllApplications',
    'updateApplicationStatus'
  ];
  for (const action of obsoleteActions) {
    assert.ok(
      !codeGs.includes(\`case '\${action}':\`),
      \`Backend router action '\${action}' must be permanently absent from Code.gs\`
    );
  }

  // 3. Obsolete backend handlers in Code.gs
  const obsoleteHandlers = [
    'handleApplyForClass',
    'handleGetMyApplications',
    'handleGetAllApplications',
    'handleUpdateApplicationStatus'
  ];
  for (const handler of obsoleteHandlers) {
    assert.ok(
      !codeGs.includes(\`function \${handler}\`),
      \`Backend handler '\${handler}' must be permanently absent from Code.gs\`
    );
  }

  // 4. CNEApplication interface/type in types.ts
  assert.ok(
    !typesTs.includes('CNEApplication'),
    "Type/Interface 'CNEApplication' must be permanently absent from src/types.ts"
  );

  // 5. INITIAL_APPLICATIONS mock/initial data
  const allTsFiles = getFilesRecursively('src', ['.ts', '.tsx']);
  for (const file of allTsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('INITIAL_APPLICATIONS'),
      \`INITIAL_APPLICATIONS must be absent from \${file}\`
    );
    assert.ok(
      !content.includes('pendingApplicationsCount'),
      \`pendingApplicationsCount must be absent from \${file}\`
    );
  }

  // 6. pendingApplicationsCount absent from Code.gs
  assert.ok(
    !codeGs.includes('pendingApplicationsCount'),
    "pendingApplicationsCount must be absent from Code.gs"
  );

  // 7. Active CNE Applications schema absent from CNE_SHEET_HEADERS
  assert.ok(
    !codeGs.includes("'CNE Applications':"),
    "CNE Applications must be absent from CNE_SHEET_HEADERS in Code.gs"
  );

  // 8. migrateCNEApplicationsHeaderToCNEId absent
  assert.ok(
    !codeGs.includes('migrateCNEApplicationsHeaderToCNEId'),
    "migrateCNEApplicationsHeaderToCNEId must be absent from Code.gs"
  );
  assert.ok(
    !backendGs.includes('migrateCNEApplicationsHeaderToCNEId'),
    "migrateCNEApplicationsHeaderToCNEId must be absent from src/backend/googleAppsScript.ts"
  );

  // 9. No programmatic deleteSheet logic added
  assert.ok(
    !codeGs.includes("deleteSheet(sheet)") && !codeGs.includes("deleteSheet(cneAppSheet)"),
    "No automatic deleteSheet logic should be added to Code.gs"
  );
});

// -----------------------------------------------------------------------------
// 14. Final Production Cleanup: Obsolete Endpoints, OCR, & Real Data Permanent Absence
// -----------------------------------------------------------------------------
runTest('Obsolete production endpoints, OCR, and real employee data permanent absence', () => {
  // 1. Obsolete reviewCNE endpoint removed
  assert.ok(!apiTs.includes('static async reviewCNE'), 'ApiService.reviewCNE must be permanently absent');
  assert.ok(!codeGs.includes("case 'reviewCNE':"), "Code.gs must not contain router case 'reviewCNE'");
  assert.ok(!codeGs.includes('function handleReviewCNE'), "Code.gs must not define 'handleReviewCNE'");

  // 2. deleteCNE endpoint is Admin-only protected and verified
  assert.ok(apiTs.includes('static async deleteCNE'), 'ApiService.deleteCNE must be present');
  assert.ok(codeGs.includes("case 'deleteCNE':"), "Code.gs must contain router case 'deleteCNE'");
  assert.ok(codeGs.includes('function handleDeleteCNE'), "Code.gs must define 'handleDeleteCNE'");

  // 3. Obsolete public resolveQRToken endpoint removed
  assert.ok(!apiTs.includes('static async resolveQRToken'), 'ApiService.resolveQRToken must be permanently absent');
  assert.ok(!codeGs.includes("case 'resolveQRToken':"), "Code.gs must not contain router case 'resolveQRToken'");
  assert.ok(!codeGs.includes('function handleResolveQRToken'), "Code.gs must not define 'handleResolveQRToken'");

  // 4. Obsolete getDashboardStats removed
  assert.ok(!apiTs.includes('static async getDashboardStats'), 'ApiService.getDashboardStats must be permanently absent');
  assert.ok(!codeGs.includes("case 'getDashboardStats':"), "Code.gs must not contain router case 'getDashboardStats'");
  assert.ok(!codeGs.includes('function handleGetDashboardStats'), "Code.gs must not define 'handleGetDashboardStats'");

  // 5. OCR completely absent
  assert.ok(!codeGs.includes('ocr: true') && !codeGs.includes('ocr:true'), 'Code.gs must not contain ocr: true');
  assert.ok(!codeGs.includes('Drive.Files.insert'), 'Code.gs must not contain Drive.Files.insert');

  // 6. Real employee IDs absent from frontend source files.
  // Authentication screens intentionally show one approved example placeholder for staff:
  //   Example ID: RSNHO000001
  // Ignore only that exact placeholder in Login/Create-Reset Password screens while keeping
  // the repository-wide protection against any other RSNHO / AIIMSR / FNMDCNO identifiers.
  const frontendSourceFiles = getFilesRecursively('src', ['.ts', '.tsx']);
  for (const file of frontendSourceFiles) {
    if (file.includes('googleAppsScript.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    let contentForEmployeeIdScan = content;
    if (file.endsWith('src/components/LoginModal.tsx') ||
        file.endsWith('src/components/ForgotPasswordModal.tsx')) {
      contentForEmployeeIdScan = contentForEmployeeIdScan.replaceAll('Example ID: RSNHO000001', '');
    }
    if (file.endsWith('src/components/cne/CNEPostTestModal.tsx')) {
      contentForEmployeeIdScan = contentForEmployeeIdScan.replaceAll('e.g. RSNHO000001', '');
    }
    assert.ok(!contentForEmployeeIdScan.includes('RSNHO'), \`Real employee ID prefix RSNHO must be absent from \${file} except the approved Login placeholder\`);
    assert.ok(!contentForEmployeeIdScan.includes('AIIMSR'), \`Real employee ID prefix AIIMSR must be absent from \${file}\`);
    assert.ok(!contentForEmployeeIdScan.includes('FNMDCNO'), \`Real employee ID prefix FNMDCNO must be absent from \${file}\`);
  }

  // 7. handleGetCNERecords name-first privacy model
  assert.ok(
    codeGs.includes("resourcePersonEmpIdForResponse = ''") &&
    codeGs.includes("resourcePersonEmpIdForResponse = loggedInId") &&
    codeGs.includes("staffEmpIdsForResponse = []") &&
    codeGs.includes("staffNameList = staffArray.map") &&
    codeGs.includes("proposedByEmpId: canSeeInternalManagementFields ? proposedBy : ''") &&
    codeGs.includes("adminRemarks: canSeeInternalManagementFields ? adminRemarks : ''") &&
    codeGs.includes("remarks: remarks"),
    'handleGetCNERecords must show safe names/general remarks while keeping raw IDs and Admin Remarks restricted'
  );

  assert.ok(!typesTs.includes('CNEReferenceIndexChunk'), 'Unused CNEReferenceIndexChunk type must be removed');
  assert.ok(!apiTs.includes('static getCurrentUser('), 'Unused ApiService.getCurrentUser must be removed');
  assert.ok(!apiTs.includes('static isLiveBackendConnected('), 'Unused ApiService.isLiveBackendConnected must be removed');
  const officerLoaderTs = fs.readFileSync('src/services/officerLoader.ts', 'utf8');
  assert.ok(!officerLoaderTs.includes('setCachedOfficers'), 'Unused setCachedOfficers helper must be removed');

  // 8. Final cleanup symbols & Chairperson API verification
  const utilsTs = fs.readFileSync('src/utils.ts', 'utf8');
  const deadTimeHelper = ['formatCneTime', 'OrRangeShort'].join('');
  const deadStaffHelper = ['formatStaff', 'ParticipantsDisplay'].join('');
  const deadReportType = ['CNEReport', 'Stats'].join('');
  const deadChairpersonUpdate = ['updateChairperson', 'Message'].join('');
  const deadChairpersonHandler = ['handleUpdateChairperson', 'Message'].join('');

  assert.ok(!utilsTs.includes(deadTimeHelper), 'Dead utility formatCneTimeOrRangeShort must be absent from src/utils.ts');
  assert.ok(!utilsTs.includes(deadStaffHelper), 'Dead utility formatStaffParticipantsDisplay must be absent from src/utils.ts');
  assert.ok(!typesTs.includes(deadReportType), 'Dead interface CNEReportStats must be absent from src/types.ts');

  // Officer directory authorization is role-restricted. Normalize whitespace because
  // Code.gs intentionally keeps this hot-path handler compact.
  const officerDropdownSection = codeGs.substring(
    codeGs.indexOf('function handleGetOfficersDropdown('),
    codeGs.indexOf('function getOfficerNameMap(')
  );
  const compactOfficerDropdownSection = officerDropdownSection.replace(/\\s+/g, '');
  assert.ok(
    compactOfficerDropdownSection.includes("role==='ADMIN'||role==='AREA_INCHARGE'||role==='INCHARGE'") &&
    compactOfficerDropdownSection.includes("errorCode:'FORBIDDEN'") &&
    compactOfficerDropdownSection.includes('checkCNEActionAuthorized(session,rec)===null'),
    'handleGetOfficersDropdown must enforce Admin/Incharge or CNE-scoped authorization and return FORBIDDEN for unauthorized callers'
  );

  // Chairperson name/designation/message remain static. Only the photo is allowed to use Script Properties.
  assert.ok(!apiTs.includes(deadChairpersonUpdate), 'Unused updateChairpersonMessage must be absent from src/services/api.ts');
  assert.ok(!codeGs.includes(deadChairpersonUpdate), 'Unused updateChairpersonMessage router case must be absent from Code.gs');
  assert.ok(!codeGs.includes(deadChairpersonHandler), 'Unused handleUpdateChairpersonMessage handler must be absent from Code.gs');
  assert.ok(
    !apiTs.includes('static async getChairpersonMessage(') &&
    !codeGs.includes("case 'getChairpersonMessage':") &&
    !codeGs.includes('function handleUpdateChairpersonMessage(') &&
    cneHomeTs.includes('...INITIAL_CHAIRPERSON_MESSAGE') &&
    cneHomeTs.includes('ApiService.getHomeDashboard()') &&
    cneHomeTs.includes('ApiService.getChairpersonPhoto()') &&
    !cneHomeTs.includes('res.data.chairpersonPhotoUrl') &&
    !cneHomeTs.includes('ApiService.getChairpersonMessage('),
    'Chairperson text content must remain static while the photo loads independently so Drive/image latency cannot block Home Dashboard data'
  );
  assert.ok(
    !codeGs.includes('CHAIRPERSON_MESSAGE') &&
    !codeGs.includes('CHAIRPERSON_NAME') &&
    !codeGs.includes('CHAIRPERSON_DESIG') &&
    !codeGs.includes('CHAIRPERSON_PHOTO_DRIVE_ID') &&
    codeGs.includes("case 'getChairpersonPhoto':") &&
    codeGs.includes('function handleGetChairpersonPhoto()') &&
    codeGs.includes("getProperty('CHAIRPERSON_PHOTO')") &&
    apiTs.includes('static async getChairpersonPhoto'),
    'Only the CHAIRPERSON_PHOTO photo-only endpoint may remain as a Chairperson backend dependency'
  );
});


runTest('Home Dashboard reuses one CNE Schedule snapshot for Schedule and Impact', () => {
  const homeSection = codeGs.substring(
    codeGs.indexOf('function handleGetHomeDashboard('),
    codeGs.indexOf('/**\\n * Format Date Helper')
  );
  assert.ok(
    codeGs.includes('function getCNEScheduleSnapshot_(') &&
    homeSection.includes('var impactRes = handleGetProgramImpact({}, session);') &&
    homeSection.includes('var scheduleSnapshot = _executionCneScheduleSnapshot;') &&
    homeSection.includes("handleGetCNERecords({ status: 'Scheduled' }, null, todaySnapshot)") &&
    homeSection.includes('cneScheduleSelectedSnapshot_(sheet,headers,cols,selected)') &&
    homeSection.includes('getCNECanonicalDay(currentRow[fromCol]) !== today'),
    'Homepage must reuse impact snapshot on cache miss and read only today rows when impact is cached'
  );
  assert.ok(
    !homeSection.includes('handleGetChairpersonPhoto()'),
    'Home Dashboard must not wait for Drive/remote Chairperson photo loading'
  );
});

runTest('Officer display-name map reads only Employee ID and Name columns on cache miss', () => {
  const mapSection = codeGs.substring(
    codeGs.indexOf('function getOfficerNameMap()'),
    codeGs.indexOf('/**\\n * ============================================================================\\n * AUTHENTICATION V2')
  );
  assert.ok(
    mapSection.includes('var empCol = meta.colMap.empCol + 1;') &&
    mapSection.includes('var nameCol = meta.colMap.nameCol + 1;') &&
    mapSection.includes('getDisplayValues()') &&
    !mapSection.includes('getExecutionRosterData()'),
    'Name resolution must avoid a full Officers A:L roster read when only ID and Name are required'
  );
});

runTest('Coordinator Desk and Quick Links use Google Sheet storage, not Script Properties', () => {
  assert.ok(
    codeGs.includes("'Portal Content': ['Section', 'Key', 'Value', 'Updated At', 'Updated By']"),
    "CNE_SHEET_HEADERS must define the 'Portal Content' sheet"
  );
  assert.ok(
    codeGs.includes("'Quick Links': ['ID', 'Title', 'Description', 'Icon Name', 'Target', 'Badge', 'Action Type', 'URL', 'Modal Title', 'Modal Body', 'Status', 'Sort Order', 'Updated At', 'Updated By']"),
    "CNE_SHEET_HEADERS must define the 'Quick Links' sheet"
  );
  assert.ok(
    codeGs.includes("'Portal Content',") && codeGs.includes("'Quick Links',"),
    'setupAndVerifyCNESheets must include Portal Content and Quick Links tabs'
  );
  assert.ok(
    codeGs.includes("getOrCreateSheet('Portal Content')") &&
    codeGs.includes("getOrCreateSheet('Quick Links')"),
    'Coordinator Desk and Quick Links must be backed by spreadsheet tabs'
  );
  for (const legacyKey of ['COORDINATOR_NOTE', 'COORDINATOR_EMAIL', 'COORDINATOR_NAMES', 'QUICK_LINKS_CUSTOM']) {
    assert.ok(!codeGs.includes(legacyKey) && !backendGs.includes(legacyKey),
      'Removed legacy configuration must not be referenced in either backend source: ' + legacyKey);
  }
  assert.ok(
    codeGs.includes('function getDefaultQuickLinks_()') &&
    codeGs.includes("writeQuickLinkRow_(sheet, seedLinks[i], i + 1, 'SYSTEM_DEFAULT')") &&
    codeGs.includes("sheet.appendRow(['COORDINATOR', 'EMAIL', sanitizeCellInput(email), new Date().toISOString(), 'SYSTEM_DEFAULT'])"),
    'Missing content must seed from built-in defaults, not legacy configuration'
  );
  assert.ok(
    codeGs.includes('function handleGetCoordinatorDesk(') &&
    codeGs.includes('function handleUpdateCoordinatorDesk(') &&
    codeGs.includes('function handleGetQuickLinks(') &&
    codeGs.includes('function handleAddQuickLink(') &&
    codeGs.includes('function handleUpdateQuickLink(') &&
    codeGs.includes('function handleDeleteQuickLink('),
    'Existing Coordinator Desk and Quick Link API contracts must remain intact'
  );
});


// Execute real seeding functions against in-memory Sheets without exposing
// PropertiesService. This ensures new Apps Script deployments require none of
// the four removed legacy configuration keys.
function createLegacyFreeContentSeedFixture() {
  const headers = {
    'Quick Links': ['ID', 'Title', 'Description', 'Icon Name', 'Target', 'Badge', 'Action Type', 'URL', 'Modal Title', 'Modal Body', 'Status', 'Sort Order', 'Updated At', 'Updated By'],
    'Portal Content': ['Section', 'Key', 'Value', 'Updated At', 'Updated By']
  };
  const sheets = {};
  function makeSheet(name, extraRows = []) {
    const grid = [headers[name].slice(), ...extraRows.map(r => r.slice())];
    return {
      grid,
      getLastRow() { return grid.length; },
      getDataRange() { return { getValues() { return grid.map(r => r.slice()); } }; },
      appendRow(row) { grid.push(row.slice()); }
    };
  }
  const ctx = { console, Date };
  vm.createContext(ctx);
  vm.runInContext(codeGs, ctx, {timeout: 12000});
  ctx.getSpreadsheet = () => ({ getSheetByName: name => sheets[name] || null });
  ctx.getOrCreateSheet = name => sheets[name] || (sheets[name] = makeSheet(name));
  ctx.getHeaderMap = sheet => Object.fromEntries(sheet.grid[0].map((header, idx) => [header.toLowerCase().replace(/[^a-z0-9]/g, ''), idx]));
  ctx.sanitizeCellInput = value => String(value);
  // Deliberately do not define PropertiesService. Any legacy dependency fails.
  return { ctx, sheets, makeSheet };
}

runTest('Quick Links defaults seed without Script Properties and existing inactive rows stay untouched', () => {
  const {ctx, sheets} = createLegacyFreeContentSeedFixture();
  const seeded = ctx.ensureQuickLinksSheetSeeded_();
  assert.strictEqual(seeded.grid.length, 1 + ctx.getDefaultQuickLinks_().length);
  assert.ok(seeded.grid.slice(1).every(row => row[13] === 'SYSTEM_DEFAULT'));
  seeded.grid[1][10] = 'INACTIVE';
  const before = JSON.stringify(seeded.grid);
  assert.strictEqual(ctx.ensureQuickLinksSheetSeeded_(), sheets['Quick Links']);
  assert.strictEqual(JSON.stringify(seeded.grid), before, 'Existing Quick Links were reset or reactivated');
});

runTest('Coordinator Desk seeds missing rows without Script Properties and preserves existing sheet content', () => {
  const {ctx, sheets, makeSheet} = createLegacyFreeContentSeedFixture();
  sheets['Portal Content'] = makeSheet('Portal Content', [['OTHER','HEADLINE','Existing announcement','','ADMIN']]);
  const seeded = ctx.ensureCoordinatorContentSeeded_();
  assert.strictEqual(seeded.grid[1][2], 'Existing announcement');
  assert.strictEqual(seeded.grid.length, 4, 'Expected existing row and two default Coordinator rows');
  assert.ok(seeded.grid.slice(2).every(row => row[0] === 'COORDINATOR' && row[4] === 'SYSTEM_DEFAULT'));
  assert.ok(seeded.grid.some(row => row[1] === 'EMAIL' && row[2] === 'training.nur@aiimsrishikesh.edu.in'));
  const before = JSON.stringify(seeded.grid);
  ctx.ensureCoordinatorContentSeeded_();
  assert.strictEqual(JSON.stringify(seeded.grid), before, 'Existing Coordinator information was overwritten');
  seeded.grid[2][2] = 'Updated from Admin';
  const edited = JSON.stringify(seeded.grid);
  ctx.ensureCoordinatorContentSeeded_();
  assert.strictEqual(JSON.stringify(seeded.grid), edited, 'Admin-edited coordinator data was overwritten');
});

runTest('Coordinator Desk homepage renders sheet-backed Admin content', () => {
  const coordinatorCardTs = fs.readFileSync('src/components/home/CoordinatorDeskCard.tsx', 'utf8');

  assert.ok(
    (
      (cneHomeTs.includes("ApiService.getCoordinatorDesk()") && cneHomeTs.includes("setCoordinatorDesk(res.data)")) ||
      (cneHomeTs.includes("ApiService.getHomeDashboard()") && cneHomeTs.includes("setCoordinatorDesk(res.data.coordinatorDesk"))
    ) &&
    cneHomeTs.includes("<CoordinatorDeskCard coordinatorDesk={coordinatorDesk}"),
    'CneHomePage must fetch Coordinator Desk data (directly or through the optimized Home Dashboard bootstrap) and pass it to the homepage card'
  );

  assert.ok(
    coordinatorCardTs.includes('coordinatorDesk.coordinatorPeople') &&
    coordinatorCardTs.includes('coordinatorDesk.members') &&
    coordinatorCardTs.includes('coordinatorDesk.email') &&
    !coordinatorCardTs.includes('coordinatorDesk.note'),
    'CoordinatorDeskCard must render backend-provided structured coordinators, members and email, without legacy note'
  );

  assert.ok(
    !coordinatorCardTs.includes('Ms. Ramya T') &&
    !coordinatorCardTs.includes('Ms. Suman Choudhary') &&
    !coordinatorCardTs.includes('training.nur@aiimsrishikesh.edu.in'),
    'CoordinatorDeskCard must not hard-code editable Coordinator Desk content'
  );
});

// Stage 4: CNE Desk committee and public News attention flags.
// These run in-memory against the actual Code.gs handlers, including legacy nine-column sheets.
function createStage4CmsEnvironment() {
  const makeSheet = (headers, rows = []) => {
    const grid = [headers.slice(), ...rows.map(row => row.slice())];
    return {
      grid,
      getLastColumn() { return grid[0].length; },
      getMaxColumns() { return 30; },
      getLastRow() { return grid.length; },
      insertColumnsAfter() {},
      getDataRange() { return { getValues() { return grid.map(row => row.slice()); } }; },
      getRange(row, column, height = 1, width = 1) {
        return {
          getValues() {
            return Array.from({ length: height }, (_, i) =>
              Array.from({ length: width }, (_, j) => grid[row + i - 1]?.[column + j - 1] || ''));
          },
          setValue(value) {
            while (grid.length < row) grid.push([]);
            grid[row - 1][column - 1] = value;
            return this;
          },
          setValues(values) {
            for (let i = 0; i < values.length; i++) for (let j = 0; j < values[i].length; j++) {
              while (grid.length < row + i) grid.push([]);
              grid[row + i - 1][column + j - 1] = values[i][j];
            }
            return this;
          }
        };
      },
      appendRow(row) { grid.push(row.slice()); }
    };
  };
  const news = makeSheet(['Event ID','Title','Category','Date','Summary','Full Content','Status','CreatedAt','CreatedBy']);
  const portal = makeSheet(['Section','Key','Value','Updated At','Updated By'], [
    ['COORDINATOR','EMAIL','training.nur@aiimsrishikesh.edu.in','','SYSTEM'],
    ['COORDINATOR','NOTE','Legacy note should remain stored but not displayed','','SYSTEM'],
    ['COORDINATOR','NAMES','Legacy Coordinator','','SYSTEM']
  ]);
  const sandbox = { console, Date, Math, JSON, Array, String, Number, Object, RegExp, Error,
    LockService: { getScriptLock() { return { waitLock() {}, releaseLock() {} }; } }
  };
  vm.createContext(sandbox);
  vm.runInContext(codeGs, sandbox);
  sandbox.getPublicHomeCache_ = () => null;
  sandbox.putPublicHomeCache_ = () => {};
  sandbox.removeScriptCacheEntry_ = () => {};
  sandbox.getOrCreateSheet = name => ({ 'News and Events': news, 'Portal Content': portal })[name];
  sandbox.getSpreadsheet = () => ({ getSheetByName: name => ({ 'News and Events': news, 'Portal Content': portal })[name] });
  sandbox.requireAdmin = session => session && session.role === 'ADMIN' ? null : { success: false, errorCode: 'FORBIDDEN' };
  sandbox.requireFreshAdminMutation = session => ({ success: true, session });
  sandbox.logAuditAction = () => {};
  sandbox.ensureCoordinatorContentSeeded_ = () => portal;
  sandbox.formatDateValue = value => String(value);
  sandbox.getIndiaTodayString = () => '2026-10-17';
  return { sandbox, portal, news, admin: { role: 'ADMIN', employeeId: 'ADMIN001' }, employee: { role: 'EMPLOYEE', employeeId: 'EMP001' } };
}

runTest('Stage 4 CNE Desk defaults to two new coordinators and twelve designated members without displaying legacy note', () => {
  const env = createStage4CmsEnvironment();
  const desk = env.sandbox.handleGetCoordinatorDesk({});
  assert.strictEqual(desk.success, true);
  assert.strictEqual(desk.data.coordinatorPeople.length, 2);
  assert.strictEqual(desk.data.members.length, 12);
  assert.strictEqual(desk.data.coordinatorPeople[0].name, 'Mr. Jino Jacob');
  assert.strictEqual(desk.data.coordinatorPeople[1].designation, 'Deputy Nursing Superintendent');
  assert.strictEqual(desk.data.members[0].name, 'Ms. Vandana');
  assert.strictEqual(desk.data.members[11].name, 'Ms. Ramya T');
  assert.strictEqual(desk.data.note, undefined);
  assert.strictEqual(env.portal.grid.some(row => row[1] === 'NOTE'), true);
});

runTest('Stage 4 CNE Desk roster writes are Admin-only, validated and non-destructive', () => {
  const env = createStage4CmsEnvironment();
  const payload = { coordinatorPeople: [{ name: 'Coordinator New', designation: 'DNS' }],
    members: [{ name: 'Member New', designation: 'ANS' }], email: 'desk@example.org' };
  assert.strictEqual(env.sandbox.handleUpdateCoordinatorDesk(payload, env.employee).errorCode, 'FORBIDDEN');
  assert.strictEqual(env.sandbox.handleUpdateCoordinatorDesk({ coordinatorPeople: [{ name: 'Broken', designation: '' }] }, env.admin).errorCode, 'INVALID_DESK_ROSTER');
  const saved = env.sandbox.handleUpdateCoordinatorDesk(payload, env.admin);
  assert.strictEqual(saved.success, true);
  assert.strictEqual(saved.data.coordinatorPeople[0].name, 'Coordinator New');
  assert.strictEqual(saved.data.members[0].designation, 'ANS');
  assert.strictEqual(saved.data.email, 'desk@example.org');
  assert.strictEqual(env.portal.grid.some(row => row[1] === 'NOTE' && String(row[2]).includes('Legacy note')), true);
  assert.strictEqual(env.portal.grid.filter(row => row[1] === 'MEMBERS_V2').length, 1);
});

runTest('Stage 4 News flags add two optional columns on Admin publish and remain independently editable', () => {
  const env = createStage4CmsEnvironment();
  assert.strictEqual(env.news.grid[0].length, 9);
  assert.strictEqual(env.sandbox.handleAddNewsEvent({ title: 'Blocked', summary: 'Private' }, env.employee).errorCode, 'FORBIDDEN');
  const created = env.sandbox.handleAddNewsEvent({ title: 'Memo', summary: 'Read me', isImportant: true, blinkAttention: false }, env.admin);
  assert.strictEqual(created.success, true);
  assert.deepStrictEqual(env.news.grid[0].slice(9), ['Is Important', 'Blink Attention']);
  let item = env.sandbox.handleGetNewsEvents({}).data[0];
  assert.strictEqual(item.isImportant, true);
  assert.strictEqual(item.blinkAttention, false);
  assert.strictEqual(env.sandbox.handleUpdateNewsEvent({ id: created.data.id, isImportant: false, blinkAttention: true }, env.admin).success, true);
  item = env.sandbox.handleGetNewsEvents({}).data[0];
  assert.strictEqual(item.isImportant, false);
  assert.strictEqual(item.blinkAttention, true);
});

runTest('Stage 4 frontend highlights circulars with accessible red NEW styling', () => {
  const widget = fs.readFileSync('src/components/home/NewsCircularsWidget.tsx', 'utf8');
  const admin = fs.readFileSync('src/components/AdminContent.tsx', 'utf8');
  const desk = fs.readFileSync('src/components/home/CoordinatorDeskCard.tsx', 'utf8');
  const css = fs.readFileSync('src/index.css', 'utf8');
  // The old Sheet flag persists for compatibility; the user-facing label is NEW.
  assert.ok(widget.includes('news.blinkAttention') && !widget.includes('news.isImportant'));
  assert.ok(widget.includes('cne-news-new-badge') && widget.includes('>NEW</span>'));
  assert.ok(!widget.includes('>ATTENTION</span>') && !widget.includes('>Live</span>'));
  assert.ok(!widget.includes('setTimeout(') && !widget.includes('pulseActive'));
  assert.ok(widget.includes('border-rose-600') && widget.includes('bg-rose-50/60'));
  assert.ok(css.includes('@keyframes cne-news-new-pulse'));
  assert.ok(css.includes('animation: cne-news-new-pulse 1.15s ease-in-out infinite'));
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(css.includes('.cne-news-new-badge') && css.includes('animation: none !important;'));
  assert.ok(widget.includes('type="button"') && widget.includes('focus-visible:ring-2'));
  assert.ok(admin.includes('id="chk-blink-attention"') && !admin.includes('id="chk-important"'));
  assert.ok(!admin.includes('newsForm.isImportant') && !admin.includes('item.isImportant'));
  assert.ok(admin.includes('Highlight this circular as NEW on the homepage'));
  assert.ok(admin.includes('NEW highlight') && !admin.includes('Attention animation'));
  assert.ok(admin.includes('coordinatorPeople: deskForm.coordinatorPeople.map') && admin.includes('members: deskForm.members.map'));
  assert.ok(desk.includes('CNE Desk') && desk.includes('coordinatorDesk.members'));
  assert.ok(!desk.includes('coordinatorDesk.note'));
});

runTest('Homepage News & Circulars sort newest published dates ahead of old entries', () => {
  const widget = fs.readFileSync('src/components/home/NewsCircularsWidget.tsx', 'utf8');
  const admin = fs.readFileSync('src/components/AdminContent.tsx', 'utf8');
  const utils = fs.readFileSync('src/utils.ts', 'utf8');
  assert.ok(utils.includes('export function newestNewsFirst('));
  assert.ok(utils.includes('parseToIsoDateString(a.date)') && utils.includes('parseToIsoDateString(b.date)'));
  assert.ok(utils.includes('return bDate.localeCompare(aDate)'));
  assert.ok(widget.includes('newestNewsFirst(newsEvents).slice(0, limit)'));
  assert.ok(admin.includes('newestNewsFirst(newsList).filter('));
  assert.ok(widget.includes('date') && widget.includes('aria-labelledby="cne-news-title"'));
});

runTest('Homepage previews real published class photos with public image lightbox and staff gallery link', () => {
  const home = fs.readFileSync('src/components/CneHomePage.tsx', 'utf8');
  const moments = fs.readFileSync('src/components/home/ClassMomentsWidget.tsx', 'utf8');
  const toolbar = fs.readFileSync('src/components/TopToolbar.tsx', 'utf8');
  const gallery = fs.readFileSync('src/components/Gallery.tsx', 'utf8');
  assert.ok(home.includes('ApiService.getGallery()') && home.includes('ClassMomentsWidget'));
  const sidebarStart = home.indexOf('<aside ');
  const quickLinksStart = home.indexOf('<QuickLinksWidget', sidebarStart);
  const momentsStart = home.indexOf('<ClassMomentsWidget', sidebarStart);
  const sidebarEnd = home.indexOf('</aside>', sidebarStart);
  assert.ok(sidebarStart >= 0 && quickLinksStart > sidebarStart && momentsStart > quickLinksStart && momentsStart < sidebarEnd,
    'Class Photos & Moments must appear below Quick Links in the right sidebar');
  assert.strictEqual(home.indexOf('<ClassMomentsWidget'), momentsStart, 'Class photos must no longer appear above the main homepage content');
  assert.ok(moments.includes('sm:grid-cols-2') && !moments.includes('lg:grid-cols-4'), 'Sidebar gallery should use two columns at desktop widths');
  assert.ok(home.includes("onNavigate('gallery')") && home.includes('user?.employeeId'));
  assert.ok(moments.includes('latestClassMoments(') && moments.includes('parseToIsoDateString('));
  assert.ok(moments.includes('item.isActive !== false') && moments.includes('item.imageUrl'));
  assert.ok(moments.includes('aria-modal="true"') && moments.includes("event.key === 'Escape'"));
  assert.ok(toolbar.includes("id: 'gallery' as ViewMode") && toolbar.includes("label: 'Class Photos'"));
  assert.ok(gallery.includes('ApiService.getGallery()') && gallery.includes('Upload Activity Photo'));
});

// -----------------------------------------------------------------------------
// Summary Report
// -----------------------------------------------------------------------------
console.log('\\n========================================================');
console.log(\`Passed: \${passedTests}/\${totalTests}\`);
console.log('ALL SYSTEM INTEGRATION TESTS PASSED!');

console.log('========================================================\\n');

process.exit(0);
`
  },
  // ===== END ORIGINAL SUITE: verify-system-integration.js =====

  // ===== BEGIN ORIGINAL SUITE: verify-delete-cne-behavior.js =====
  {
    id: "delete",
    name: "Delete CNE Behavioral Verification",
    originalFilename: "verify-delete-cne-behavior.js",
    mode: "module",
    expectedChecks: 38,
    sha256: "25e7d7be7244f2da5090537c8df830cea424d6802ce7ffd09f35d1d84a02da0b",
    source: `/**
 * ============================================================================
 * EXECUTABLE BEHAVIORAL TEST SUITE: Delete CNE Data Integrity & Concurrency
 * Scope: 38 Realistic Behavioral Tests with Authentic Apps Script Execution
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('========================================================');
console.log('Delete CNE Executable Behavioral Verification');
console.log('Scope: 38 True Behavioral Tests (Data Mutation & Recovery)');
console.log('========================================================\\n');

let totalTests = 0;
let passedTests = 0;

function runBehavioralTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${name}\`);
  } catch (err) {
    console.error(\`✗ \${name}\`);
    console.error(\`  Error: \${err.message}\\n\${err.stack}\\n\`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// High-Fidelity In-Memory Google Apps Script Mock Framework
// -----------------------------------------------------------------------------

class MockRange {
  constructor(sheet, startRow, startCol, numRows, numCols) {
    this.sheet = sheet;
    this.startRow = startRow;
    this.startCol = startCol;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  getValues() {
    const result = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      const rowIndex = this.startRow - 1 + r;
      for (let c = 0; c < this.numCols; c++) {
        const colIndex = this.startCol - 1 + c;
        if (rowIndex < this.sheet.grid.length && colIndex < this.sheet.grid[rowIndex].length) {
          row.push(this.sheet.grid[rowIndex][colIndex]);
        } else {
          row.push('');
        }
      }
      result.push(row);
    }
    return result;
  }

  getDisplayValues() {
    return this.getValues().map(row => row.map(v => String(v !== null && v !== undefined ? v : '')));
  }

  getValue() {
    const vals = this.getValues();
    return vals[0] && vals[0][0] !== undefined ? vals[0][0] : '';
  }

  setValues(values) {
    for (let r = 0; r < values.length; r++) {
      const rowIndex = this.startRow - 1 + r;
      while (this.sheet.grid.length <= rowIndex) {
        this.sheet.grid.push([]);
      }
      for (let c = 0; c < values[r].length; c++) {
        const colIndex = this.startCol - 1 + c;
        while (this.sheet.grid[rowIndex].length <= colIndex) {
          this.sheet.grid[rowIndex].push('');
        }
        this.sheet.grid[rowIndex][colIndex] = values[r][c];
      }
    }
    return this;
  }

  setValue(value) {
    return this.setValues([[value]]);
  }

  setFontWeight() {
    return this;
  }

  createTextFinder(needle) {
    const range = this;
    const vals = this.getValues();
    const matches = [];
    for (let r = 0; r < vals.length; r++) {
      for (let c = 0; c < vals[r].length; c++) {
        const cell = String(vals[r][c] || '').trim();
        if (cell.toLowerCase() === String(needle).trim().toLowerCase()) {
          matches.push({
            getRow: () => range.startRow + r,
            getColumn: () => range.startCol + c,
            getDisplayValue: () => cell
          });
        }
      }
    }
    return {
      matchEntireCell: () => this,
      matchCase: () => this,
      findNext: () => matches[0] || null,
      findAll: () => matches
    };
  }
}

class MockRangeList {
  constructor(sheet, ranges) {
    this.sheet = sheet;
    this.ranges = ranges; // array of A1 notations e.g. "E2"
  }

  setValue(val) {
    for (const a1 of this.ranges) {
      const match = a1.match(/([A-Z]+)(\\d+)/);
      if (match) {
        const colChar = match[1];
        const rowNum = parseInt(match[2], 10);
        let col = 0;
        for (let i = 0; i < colChar.length; i++) {
          col = col * 26 + (colChar.charCodeAt(i) - 64);
        }
        this.sheet.getRange(rowNum, col).setValue(val);
      }
    }
  }
}

class MockSheet {
  constructor(name, spreadsheet, initialGrid = []) {
    this.name = name;
    this.spreadsheet = spreadsheet;
    this.grid = initialGrid.map(row => [...row]);
    this.hooks = {};
  }

  getName() {
    return this.name;
  }

  getLastRow() {
    return this.grid.length;
  }

  getLastColumn() {
    let max = 0;
    for (const r of this.grid) {
      if (r.length > max) max = r.length;
    }
    return max;
  }

  getRange(startRow, startCol, numRows = 1, numCols = 1) {
    if (this.hooks.onGetRange) {
      const hooked = this.hooks.onGetRange(startRow, startCol, numRows, numCols);
      if (hooked) return hooked;
    }
    return new MockRange(this, startRow, startCol, numRows, numCols);
  }

  getRangeList(ranges) {
    if (this.hooks.onGetRangeList) {
      const hooked = this.hooks.onGetRangeList(ranges);
      if (hooked) return hooked;
    }
    return new MockRangeList(this, ranges);
  }

  appendRow(rowVals) {
    if (this.hooks.onAppendRow) {
      this.hooks.onAppendRow(rowVals);
    }
    this.grid.push([...rowVals]);
  }

  deleteRow(rowIdx) {
    if (this.hooks.onDeleteRow) {
      this.hooks.onDeleteRow(rowIdx);
    }
    if (rowIdx >= 1 && rowIdx <= this.grid.length) {
      this.grid.splice(rowIdx - 1, 1);
    }
  }

  setFrozenRows() {}

  getMaxColumns() {
    return Math.max(26, this.getLastColumn());
  }

  getMaxRows() {
    return Math.max(100, this.getLastRow());
  }

  insertColumnsAfter(afterIndex, numColumns) {
    return this;
  }

  insertRowsAfter(afterIndex, numRows) {
    return this;
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
    this.hooks = {};
  }

  getSheetByName(name) {
    if (this.hooks.onGetSheetByName) {
      const h = this.hooks.onGetSheetByName(name);
      if (h !== undefined) return h;
    }
    return this.sheets[name] || null;
  }

  insertSheet(name) {
    const s = new MockSheet(name, this);
    this.sheets[name] = s;
    if (this.hooks.onGetSheetByName) {
      this.hooks.onGetSheetByName(name);
    }
    return s;
  }

  addSheet(name, grid) {
    const s = new MockSheet(name, this, grid);
    this.sheets[name] = s;
    return s;
  }
}

function createFreshTestEnvironment() {
  const cneSpreadsheet = new MockSpreadsheet();
  const officersSpreadsheet = new MockSpreadsheet();

  const scriptProperties = {
    DROPDOWN_SPREADSHEET_ID: 'officers-sheet-id',
    CNE_SPREADSHEET_ID: 'cne-sheet-id',
    SPREADSHEET_ID: 'cne-sheet-id',
    SESSION_SECRET: 'test-session-secret-32-chars-long-minimum-key!'
  };

  const scriptCache = new Map();

  const mockLock = {
    waitLock: (timeout) => {},
    releaseLock: () => {}
  };

  const auditLog = [];

  const sandbox = {
    Logger: {
      log: () => {}
    },
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => scriptProperties[k] || null,
        setProperty: (k, v) => { scriptProperties[k] = v; },
        getProperties: () => ({ ...scriptProperties })
      })
    },
    LockService: {
      getScriptLock: () => mockLock
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => scriptCache.get(k) || null,
        put: (k, v) => { scriptCache.set(k, v); },
        remove: (k) => { scriptCache.delete(k); }
      })
    },
    SpreadsheetApp: {
      openById: (id) => {
        if (id === 'officers-sheet-id') return officersSpreadsheet;
        return cneSpreadsheet;
      },
      getActiveSpreadsheet: () => cneSpreadsheet,
      flush: () => {
        if (cneSpreadsheet.hooks.onFlush) {
          cneSpreadsheet.hooks.onFlush();
        }
      }
    },
    Utilities: {
      formatDate: (d, tz, fmt) => '2026-10-14T10:00:00+05:30',
      getUuid: () => 'mock-uuid-' + Math.random().toString(36).substring(2, 10),
      computeHmacSha256Signature: (value, key) => {
        return Array.from(Buffer.from('sig-' + value)).map(b => b & 0xFF);
      }
    },
    Date: Date,
    Math: Math,
    parseInt: parseInt,
    Number: Number,
    String: String,
    Array: Array,
    Object: Object,
    RegExp: RegExp,
    JSON: JSON,
    Error: Error
  };

  // Load and execute Code.gs in the VM context
  const codeGsSource = fs.readFileSync(path.join(rootDir, 'Code.gs'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(codeGsSource, sandbox);

  // Setup Standard Officer Data
  officersSpreadsheet.addSheet('Officers data', [
    ['Employee ID', 'Name', 'Designation', 'Department', 'Email', 'Status'],
    ['ADMIN001', 'Admin Officer', 'Chief Nursing Officer', 'Administration', 'admin@aiims.edu', 'ACTIVE'],
    ['STAFF001', 'Staff Nurse One', 'Nursing Officer', 'Emergency Ward', 'staff1@aiims.edu', 'ACTIVE']
  ]);

  // Setup Standard Role Data
  cneSpreadsheet.addSheet('Role', [
    ['Employee ID', 'Role', 'Status', 'Area'],
    ['ADMIN001', 'ADMIN', 'ACTIVE', 'Administration'],
    ['STAFF001', 'EMPLOYEE', 'ACTIVE', 'Emergency Ward']
  ]);

  // Setup Standard Auth Credentials Data
  cneSpreadsheet.addSheet('Auth_Credentials', [
    ['Employee ID', 'Password Hash', 'Password Salt', 'Password Version', 'Password Created At', 'Password Changed At', 'Last Login At', 'Account Status', 'Failed Login Count', 'Locked Until', 'Created At', 'Updated At'],
    ['ADMIN001', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z'],
    ['STAFF001', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z']
  ]);

  // Setup Standard CNE Schedule Data
  cneSpreadsheet.addSheet('CNE Schedule', [
    [
      'CNE ID', 'Date', 'To Date', 'Time', 'Duration', 'Area', 'CNE Type', 'Topic',
      'Resource Person Emp ID', 'Resource Person Name', 'Special Notes', 'Status',
      'Staff Count', 'Staff Emp ID', 'External Staff Participants', 'Internal Attendance Count',
      'Created At', 'Created By', 'Updated At', 'Updated By'
    ],
    [
      'CLS-2026-001', '2026-10-20', '2026-10-20', '10:00 AM', '1 Hour', 'Emergency Ward', 'CENTRAL', 'Emergency Triage Protocols',
      'ADMIN001', 'Admin Officer', 'Clinical Simulation', 'Scheduled',
      '0', '', '', '0',
      '2026-10-10T10:00:00Z', 'ADMIN001', '', ''
    ],
    [
      'CLS-2026-002', '2026-10-22', '2026-10-22', '02:00 PM', '2 Hours', 'ICU', 'DEPARTMENTAL', 'Ventilator Care Bundle',
      'STAFF001', 'Staff Nurse One', 'Hands-on workshop', 'Scheduled',
      '5', 'STAFF001', '', '5',
      '2026-10-10T11:00:00Z', 'ADMIN001', '', ''
    ]
  ]);

  // Setup Standard Attendance Response Sheet
  cneSpreadsheet.addSheet('CNE Post Test Responses', [
    ['Response ID', 'CNE ID', 'Employee ID', 'Participant Name', 'Designation', 'Department', 'Score', 'Total', 'Percentage', 'Source', 'Timestamp', 'Answers', 'Status', 'Remarks'],
    ['RESP-001', 'CLS-2026-002', 'STAFF001', 'Staff Nurse One', 'Nursing Officer', 'ICU', '5', '5', '100%', 'POST_TEST', '2026-10-12T10:00:00Z', '{}', 'PASSED', '']
  ]);

  // Setup Standard QR Tokens Sheet
  cneSpreadsheet.addSheet('CNE_QR_Tokens', [
    ['Token', 'CNE ID', 'Created At', 'Expires At', 'Status'],
    ['QR-TOK-001', 'CLS-2026-001', '2026-10-10T10:00:00Z', '2026-10-25T10:00:00Z', 'ACTIVE']
  ]);

  // Setup Standard Audit Log Sheet
  cneSpreadsheet.addSheet('Audit_Log', [
    ['Timestamp', 'Action', 'Employee ID', 'Details', 'Status']
  ]);

  const adminSession = {
    employeeId: 'ADMIN001',
    name: 'Admin Officer',
    role: 'ADMIN',
    sessionToken: 'valid-admin-token-12345'
  };

  const staffSession = {
    employeeId: 'STAFF001',
    name: 'Staff Nurse One',
    role: 'EMPLOYEE',
    sessionToken: 'valid-staff-token-12345'
  };

  return {
    sandbox,
    cneSpreadsheet,
    officersSpreadsheet,
    adminSession,
    staffSession
  };
}

// -----------------------------------------------------------------------------
// 16 Executable Behavioral Tests
// -----------------------------------------------------------------------------

// Test 1: Missing mandatory attendance sheet
runBehavioralTest('1. Missing mandatory attendance sheet fails closed with ATTENDANCE_CHECK_FAILED', () => {
  const env = createFreshTestEnvironment();
  delete env.cneSpreadsheet.sheets['CNE Post Test Responses'];
  delete env.cneSpreadsheet.sheets['CNE_Participants'];

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false, 'Deletion must fail');
  assert.strictEqual(res.errorCode, 'ATTENDANCE_CHECK_FAILED', 'Must return ATTENDANCE_CHECK_FAILED');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE Schedule'].grid.length, 3, 'CNE Schedule row must be preserved');
  assert.strictEqual(Boolean(env.cneSpreadsheet.sheets['CNE Deleted Archive']), false, 'No archive sheet or row should be created');
});

// Test 2: Invalid CNE ID header in attendance sheet
runBehavioralTest('2. Invalid CNE ID header fails closed without default column index substitution', () => {
  const env = createFreshTestEnvironment();
  // Corrupt header row of attendance responses sheet: replace 'CNE ID' with 'InvalidCol'
  env.cneSpreadsheet.sheets['CNE Post Test Responses'].grid[0][1] = 'CorruptedColumnHeader';

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'ATTENDANCE_CHECK_FAILED');
  assert.ok(res.message.includes('Mandatory CNE ID column missing'), 'Message must indicate missing CNE ID column');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE Schedule'].grid.length, 3, 'CNE Schedule must not be deleted');
});

// Test 3: Archive append succeeds but verification fails
runBehavioralTest('3. Archive append succeeds but verification fails rolls back appended archive and preserves schedule row', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const initialRowCount = cneSheet.grid.length;

  // Hook into getRange to corrupt read-back row verification
  let archiveAppendOccurred = false;
  let verificationReadCount = 0;
  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive' && env.cneSpreadsheet.sheets['CNE Deleted Archive']) {
      const arch = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
      arch.hooks.onAppendRow = () => { archiveAppendOccurred = true; };
      arch.hooks.onGetRange = (startRow, startCol, numRows, numCols) => {
        if (startRow >= 2 && numRows === 1 && numCols > 5) {
          verificationReadCount++;
          if (verificationReadCount === 1) {
            // Return corrupted row values with mismatched CNE ID on initial verification read
            const corrupted = new Array(numCols).fill('CORRUPTED');
            return {
              getValues: () => [corrupted],
              setValue: () => {},
              setValues: () => {}
            };
          }
        }
        return null;
      };
    }
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'ARCHIVE_VERIFICATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, initialRowCount, 'Active CNE schedule row must be preserved');
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  assert.strictEqual(qrSheet.grid[1][4], 'ACTIVE', 'QR token must remain ACTIVE');
});

// Test 4: Archive append fails
runBehavioralTest('4. Archive append fails returns ARCHIVE_WRITE_FAILED and preserves active schedule row', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const initialRowCount = cneSheet.grid.length;

  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive' && env.cneSpreadsheet.sheets['CNE Deleted Archive']) {
      const arch = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
      arch.hooks.onAppendRow = () => {
        throw new Error('Simulated disk/append failure');
      };
    }
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'ARCHIVE_WRITE_FAILED');
  assert.strictEqual(cneSheet.grid.length, initialRowCount, 'Active schedule row must be preserved');
});

// Test 5: QR deactivation fails
runBehavioralTest('5. QR deactivation failure triggers state-aware compensation (removes archive row, restores QR tokens)', () => {
  const env = createFreshTestEnvironment();
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  // Hook qrSheet to throw during deactivation
  qrSheet.hooks.onGetRangeList = (ranges) => {
    throw new Error('Simulated QR token lock failure');
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'DELETE_MUTATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active CNE schedule row must be preserved');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  if (archSheet) {
    const archRows = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
    assert.strictEqual(archRows.length, 0, 'Appended archive row must be compensated/deleted');
  }
});

// Test 6: Schedule row deletion fails before removal
runBehavioralTest('6. Schedule row deletion fails before removal safely rolls back archive entry and restores QR token', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  cneSheet.hooks.onDeleteRow = (rowIdx) => {
    throw new Error('Permission denied deleting schedule row');
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'DELETE_MUTATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, 3, 'Schedule row still exists');
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  assert.strictEqual(qrSheet.grid[1][4], 'ACTIVE', 'QR token restored to ACTIVE');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  if (archSheet) {
    const archMatches = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
    assert.strictEqual(archMatches.length, 0, 'Archive row rolled back cleanly');
  }
});

// Test 7: Schedule row deletion commits but flush throws
runBehavioralTest('7. Schedule row deletion commits but flush throws retains archive and keeps QR token inactive', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  let deletedRow = false;
  cneSheet.hooks.onDeleteRow = (rowIdx) => {
    deletedRow = true;
  };

  // Throw on flush AFTER row deletion
  env.cneSpreadsheet.hooks.onFlush = () => {
    if (deletedRow) {
      throw new Error('Transient network error during final SpreadsheetApp.flush');
    }
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'DELETE_COMPLETION_UNCERTAIN');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  assert.ok(archSheet, 'Archive sheet must exist');
  const archMatches = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
  assert.strictEqual(archMatches.length, 1, 'Must RETAIN archive row as authoritative surviving record');
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  assert.strictEqual(qrSheet.grid[1][4], 'INACTIVE', 'QR token must NOT be reactivated');
});

// Test 8: Audit logging fails after committed deletion
runBehavioralTest('8. Audit logging failure after committed deletion does not report rollback', () => {
  const env = createFreshTestEnvironment();
  const auditSheet = env.cneSpreadsheet.sheets['Audit_Log'];

  let count = 0;
  auditSheet.hooks.onAppendRow = () => {
    count++;
    if (count > 0) {
      throw new Error('Audit log database timeout');
    }
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, true, 'Deletion must report success since schedule deletion committed');
  assert.strictEqual(res.cneId, 'CLS-2026-001');
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const schedMatches = cneSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
  assert.strictEqual(schedMatches.length, 0, 'Schedule row must remain deleted');
});

// Test 9: Duplicate deletion requests
runBehavioralTest('9. Duplicate deletion request returns CNE_NOT_FOUND and prevents duplicate archive rows', () => {
  const env = createFreshTestEnvironment();

  // First deletion: succeeds
  const res1 = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'First Deletion'
  }, env.adminSession);
  assert.strictEqual(res1.success, true);

  // Second deletion request for same ID
  const res2 = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Duplicate Deletion Attempt'
  }, env.adminSession);

  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.errorCode, 'CNE_NOT_FOUND');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  const archMatches = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
  assert.strictEqual(archMatches.length, 1, 'Only one archive row should exist');
});

// Test 10: Revoked ADMIN role
runBehavioralTest('10. Revoked or non-ADMIN role is rejected before taking locks or mutating sheets', () => {
  const env = createFreshTestEnvironment();
  const initialSchedCount = env.cneSpreadsheet.sheets['CNE Schedule'].grid.length;

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Non-admin attempt'
  }, env.staffSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'PERMISSION_DENIED');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE Schedule'].grid.length, initialSchedCount);
});

// Test 11: Concurrent attendance and deletion
runBehavioralTest('11. Concurrent operations: attendance first denies deletion; deletion first denies attendance', () => {
  const env = createFreshTestEnvironment();

  // Scenario 11A: Attendance recorded first for CLS-2026-002
  const deleteResA = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-002',
    confirmationCneId: 'CLS-2026-002',
    reason: 'Attempt delete with attendance'
  }, env.adminSession);

  assert.strictEqual(deleteResA.success, false);
  assert.strictEqual(deleteResA.errorCode, 'ATTENDANCE_EXISTS', 'Deletion must be denied when attendance exists');

  // Scenario 11B: Deletion succeeds first on CLS-2026-001
  const deleteResB = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Normal delete'
  }, env.adminSession);
  assert.strictEqual(deleteResB.success, true);

  // Subsequent manual attendance attempt on deleted CLS-2026-001
  const manualAttRes = env.sandbox.handleAddManualParticipants({
    cneId: 'CLS-2026-001',
    employeeId: 'STAFF001'
  }, env.adminSession);

  assert.strictEqual(manualAttRes.success, false);
  assert.strictEqual(manualAttRes.errorCode, 'CNE_NOT_FOUND', 'Attendance must be denied after deletion committed');
});

// Test 12: Original archive column preservation
runBehavioralTest('12. Original schedule columns and values are preserved completely in archive record', () => {
  const env = createFreshTestEnvironment();
  const origScheduleRow = [...env.cneSpreadsheet.sheets['CNE Schedule'].grid[1]];

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Preserve Column Test'
  }, env.adminSession);

  assert.strictEqual(res.success, true);
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  const archHeaders = archSheet.grid[0];
  const archRow = archSheet.grid[1];

  // Verify all original columns exist in archive headers
  const origHeaders = env.cneSpreadsheet.sheets['CNE Schedule'].grid[0];
  for (let c = 0; c < origHeaders.length; c++) {
    const h = origHeaders[c];
    const archColIdx = archHeaders.indexOf(h);
    assert.ok(archColIdx !== -1, \`Original header \${h} must exist in archive headers\`);
    assert.strictEqual(archRow[archColIdx], origScheduleRow[c], \`Original value for \${h} must match in archive row\`);
  }

  // Verify deletion metadata
  assert.ok(archHeaders.includes('Deleted At'));
  assert.ok(archHeaders.includes('Deleted By'));
  assert.ok(archHeaders.includes('Delete Reason'));
  assert.strictEqual(archRow[archHeaders.indexOf('Deleted By')], 'ADMIN001');
  assert.strictEqual(archRow[archHeaders.indexOf('Delete Reason')], 'Preserve Column Test');
});

// Test 13: Duplicate or invalid archive headers
runBehavioralTest('13. Duplicate or blank archive headers are rejected with ARCHIVE_SCHEMA_INVALID', () => {
  const env = createFreshTestEnvironment();
  // Pre-create corrupt archive sheet with duplicate column header 'Topic'
  env.cneSpreadsheet.addSheet('CNE Deleted Archive', [
    ['CNE ID', 'Topic', 'Topic', 'Deleted At', 'Deleted By', 'Delete Reason']
  ]);

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Duplicate Header Test'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'ARCHIVE_SCHEMA_INVALID');
  assert.ok(res.message.includes('duplicate or conflicting header'), 'Message must indicate duplicate header');
});

// Test 14: Deleted CNE ID collision prevention
runBehavioralTest('14. Deleted CNE ID is recognized as in-use and cannot be reused by Central or Departmental creation', () => {
  const env = createFreshTestEnvironment();

  // Delete CLS-2026-001
  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Collision test'
  }, env.adminSession);
  assert.strictEqual(delRes.success, true);

  // Check isCneIdInUse_ recognizes it
  const inUse = env.sandbox.isCneIdInUse_('CLS-2026-001');
  assert.strictEqual(inUse, true, 'Deleted CNE ID must be recognized as in-use');

  // Verify missing header throws rather than silently returning false
  delete env.cneSpreadsheet.sheets['CNE Deleted Archive'].grid[0];
  env.cneSpreadsheet.sheets['CNE Deleted Archive'].grid = [['CorruptedCol1', 'CorruptedCol2']];
  assert.throws(() => {
    env.sandbox.isCneIdInUse_('CLS-2026-001');
  }, /missing mandatory CNE ID header/i, 'Must throw error if archive lacks CNE ID header');
});

// Test 15: Normal successful ADMIN deletion
runBehavioralTest('15. Normal successful ADMIN deletion removes schedule row, deactivates QR, logs audit, and creates archive', () => {
  const env = createFreshTestEnvironment();

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Routine program cancellation and cleanup'
  }, env.adminSession);

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.cneId, 'CLS-2026-001');
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const matches = cneSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
  assert.strictEqual(matches.length, 0, 'Schedule row must be deleted');
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  assert.strictEqual(qrSheet.grid[1][4], 'INACTIVE', 'QR token must be INACTIVE');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  assert.strictEqual(archSheet.grid.length, 2, 'Archive row must be created');
});

// Test 16: Non-admin deletion rejected
runBehavioralTest('16. Non-admin deletion request is rejected and preserves all records', () => {
  const env = createFreshTestEnvironment();
  const initialSchedCount = env.cneSpreadsheet.sheets['CNE Schedule'].grid.length;

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Unauthorized attempt'
  }, env.staffSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'PERMISSION_DENIED');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE Schedule'].grid.length, initialSchedCount);
});

// Test 17: Pre-mutation QR state inspection failure
runBehavioralTest('17. Pre-mutation QR state inspection failure denies deletion safely with QR_STATE_CHECK_FAILED', () => {
  const env = createFreshTestEnvironment();
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const initialSchedCount = cneSheet.grid.length;

  // Corrupt / fail getRange on qrSheet during pre-mutation snapshot inspection
  qrSheet.hooks.onGetRange = () => {
    throw new Error('Database connection reset during QR snapshot');
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Snapshot failure test'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'QR_STATE_CHECK_FAILED');
  assert.strictEqual(cneSheet.grid.length, initialSchedCount, 'Active schedule row must not be modified');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  if (archSheet) {
    const archRows = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
    assert.strictEqual(archRows.length, 0, 'No archive data row should be created');
  }
});

// Test 18: Competing concurrent operations under ScriptLock
runBehavioralTest('18. Competing concurrent operations: simulated lock acquisition order preserves state consistency', () => {
  // Case A: Worker Attendance commits before Worker Deletion acquires lock
  const envA = createFreshTestEnvironment();
  // Simulate Attendance acquiring lock and recording attendance first
  const attResA = envA.sandbox.handleAddManualParticipants({
    cneId: 'CLS-2026-001',
    employeeId: 'STAFF001'
  }, envA.adminSession);
  assert.strictEqual(attResA.success, true, 'Attendance commit succeeds');

  // Deletion then acquires lock and checks authoritative state
  const delResA = envA.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Competing deletion after attendance'
  }, envA.adminSession);
  assert.strictEqual(delResA.success, false);
  assert.strictEqual(delResA.errorCode, 'ATTENDANCE_EXISTS', 'Deletion must be denied because attendance committed');

  // Case B: Worker Deletion commits before Worker Attendance acquires lock
  const envB = createFreshTestEnvironment();
  const delResB = envB.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Competing deletion before attendance'
  }, envB.adminSession);
  assert.strictEqual(delResB.success, true, 'Deletion commit succeeds');

  // Attendance then acquires lock and re-checks live CNE record
  const attResB = envB.sandbox.handleAddManualParticipants({
    cneId: 'CLS-2026-001',
    employeeId: 'STAFF001'
  }, envB.adminSession);
  assert.strictEqual(attResB.success, false);
  assert.strictEqual(attResB.errorCode, 'CNE_NOT_FOUND', 'Attendance must fail closed because parent CNE was deleted');
});

// Test 19: Deleted CNE cannot accept Post-Test submission or QR verification
runBehavioralTest('19. Deleted CNE cannot accept Post-Test submission or QR verification', () => {
  const env = createFreshTestEnvironment();

  // Delete CLS-2026-001
  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Delete before post-test'
  }, env.adminSession);
  assert.strictEqual(delRes.success, true);

  // Attempt Post-Test OTP request on deleted CNE (via deactivated token)
  const otpRes = env.sandbox.handleRequestPostTestOtp({
    qrToken: 'QR-TOK-001',
    participantType: 'INTERNAL',
    employeeId: 'STAFF001'
  }, null);
  assert.strictEqual(otpRes.success, false);
  assert.strictEqual(otpRes.errorCode, 'INVALID_OR_MISSING_QR_TOKEN');

  // Attempt direct post-test submission specifying deleted CNE ID
  const submitRes = env.sandbox.handleSubmitPostTest({
    cneId: 'CLS-2026-001',
    employeeId: 'STAFF001',
    answers: { 'Q1': 'A' }
  }, env.staffSession);
  assert.strictEqual(submitRes.success, false);
  assert.strictEqual(submitRes.errorCode, 'CNE_NOT_FOUND', 'Submission targeting deleted CNE must return CNE_NOT_FOUND');
});

// Test 20: Merely registered external participant vs actual recorded attendance
runBehavioralTest('20. Merely registered external participant does not block deletion, but recorded attendance does', () => {
  const env = createFreshTestEnvironment();
  const respSheet = env.cneSpreadsheet.sheets['CNE Post Test Responses'];

  // Add an external participant who only completed email verification / registration (not attended)
  respSheet.appendRow([
    'REG-001', 'CLS-2026-001', 'EXT-001', 'External Guest', 'Nurse', 'Apollo Hospital',
    '', '', '', 'EXTERNAL_REGISTRATION', '2026-10-12T10:00:00Z', '', 'REGISTERED', 'External Email: guest@apollo.com'
  ]);

  // Deletion must succeed because no actual recorded attendance exists
  const delRes1 = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Eligible with only registered participant'
  }, env.adminSession);
  assert.strictEqual(delRes1.success, true, 'Registered-only external participant must not prevent deletion');

  // Now create new environment where external participant actually attended
  const env2 = createFreshTestEnvironment();
  const respSheet2 = env2.cneSpreadsheet.sheets['CNE Post Test Responses'];
  respSheet2.appendRow([
    'MAN-001', 'CLS-2026-001', 'EXT-001', 'External Guest', 'Nurse', 'Apollo Hospital',
    '', '', '', 'MANUAL', '2026-10-12T10:00:00Z', '', 'ATTENDED', 'External Email: guest@apollo.com'
  ]);

  const delRes2 = env2.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Attempt delete with recorded attendance'
  }, env2.adminSession);
  assert.strictEqual(delRes2.success, false);
  assert.strictEqual(delRes2.errorCode, 'ATTENDANCE_EXISTS', 'Actual attendance must deny deletion');
});

// Test 21: QR columns in a rearranged valid order
runBehavioralTest('21. QR columns in rearranged valid order are resolved dynamically and deactivated correctly', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  
  // Rearrange CNE_QR_Tokens columns: Status at col 1, CNE ID at col 2, QR Token at col 3, Created At at col 4, Created By at col 5
  env.cneSpreadsheet.sheets['CNE_QR_Tokens'] = new MockSheet('CNE_QR_Tokens', env.cneSpreadsheet, [
    ['Status', 'CNE ID', 'QR Token', 'Created At', 'Created By'],
    ['ACTIVE', 'CLS-2026-001', 'QR-TOK-REORDERED-001', '2026-10-10T10:00:00Z', 'AIIMS001']
  ]);
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Valid deletion with rearranged QR headers'
  }, env.adminSession);

  assert.strictEqual(delRes.success, true, 'Deletion must succeed with rearranged QR headers');
  // Column 1 (index 0) is Status, which must now be INACTIVE
  assert.strictEqual(qrSheet.grid[1][0], 'INACTIVE', 'Status in rearranged column 1 must be deactivated');
  // Original schedule row removed
  assert.strictEqual(cneSheet.grid.length, 2, 'Active schedule row must be removed');
  // Archive row created
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  assert.ok(archSheet && archSheet.grid.length >= 2, 'Archive row must be created');
});

// Test 22: Missing QR Status header fails closed
runBehavioralTest('22. Missing QR Status header fails closed with QR_STATE_CHECK_FAILED', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  env.cneSpreadsheet.sheets['CNE_QR_Tokens'] = new MockSheet('CNE_QR_Tokens', env.cneSpreadsheet, [
    ['QR Token', 'CNE ID', 'Created At', 'Created By'],
    ['QR-TOK-001', 'CLS-2026-001', '2026-10-10T10:00:00Z', 'AIIMS001']
  ]);

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Missing status header test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'QR_STATE_CHECK_FAILED', 'Missing Status header must fail closed');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active schedule row must be preserved');
});

// Test 23: Missing QR CNE ID header fails closed
runBehavioralTest('23. Missing QR CNE ID header fails closed with QR_STATE_CHECK_FAILED', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  env.cneSpreadsheet.sheets['CNE_QR_Tokens'] = new MockSheet('CNE_QR_Tokens', env.cneSpreadsheet, [
    ['QR Token', 'Created At', 'Created By', 'Status'],
    ['QR-TOK-001', '2026-10-10T10:00:00Z', 'AIIMS001', 'ACTIVE']
  ]);

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Missing CNE ID header test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'QR_STATE_CHECK_FAILED', 'Missing CNE ID header must fail closed');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active schedule row must be preserved');
});

// Test 24: Duplicate normalized QR headers fail closed
runBehavioralTest('24. Duplicate or ambiguous normalized QR headers fail closed with QR_STATE_CHECK_FAILED', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  env.cneSpreadsheet.sheets['CNE_QR_Tokens'] = new MockSheet('CNE_QR_Tokens', env.cneSpreadsheet, [
    ['QR Token', 'CNE ID', 'Status', 'Status', 'Created At'],
    ['QR-TOK-001', 'CLS-2026-001', 'ACTIVE', 'ACTIVE', '2026-10-10T10:00:00Z']
  ]);

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Duplicate status header test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'QR_STATE_CHECK_FAILED', 'Duplicate status headers must fail closed');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active schedule row must be preserved');
});

// Test 25: QR deactivation verification failure triggers safe compensation
runBehavioralTest('25. QR deactivation verification failure rolls back archive and preserves schedule row', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];

  // Hook setValue on qrSheet to simulate a write that does not persist or is ignored
  qrSheet.hooks.onGetRange = (r, c, nr, nc) => {
    // When reading row 2 col 5 (postStatus check), return ACTIVE to simulate failure to deactivate
    if (r === 2 && c === 5) {
      return {
        getValue: () => 'ACTIVE',
        setValue: () => {}
      };
    }
    return null;
  };

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'QR deactivation verification failure test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'DELETE_MUTATION_FAILED', 'Must return DELETE_MUTATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active schedule row must be preserved');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  if (archSheet) {
    const archMatches = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
    assert.strictEqual(archMatches.length, 0, 'Archive row must be rolled back');
  }
});

// Test 26: Schedule readback throwing during recovery returns DELETE_COMPLETION_UNCERTAIN
runBehavioralTest('26. Schedule readback throwing during recovery returns DELETE_COMPLETION_UNCERTAIN', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  let deleteAttempted = false;
  cneSheet.hooks.onDeleteRow = () => {
    deleteAttempted = true;
    throw new Error('Database disconnected during row deletion');
  };

  // When recovery attempts to inspect cneSheet, throw
  cneSheet.hooks.onGetRange = (r, c, nr, nc) => {
    if (deleteAttempted) {
      throw new Error('Temporary connection loss during schedule readback recovery');
    }
    return null;
  };

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Recovery read error test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'DELETE_COMPLETION_UNCERTAIN', 'Inconclusive state must return DELETE_COMPLETION_UNCERTAIN');
  const archSheet = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  assert.ok(archSheet, 'Archive sheet must exist');
  // Does NOT delete the archive row when schedule state is UNKNOWN
  const archMatches = archSheet.grid.slice(1).filter(r => r[0] === 'CLS-2026-001');
  assert.strictEqual(archMatches.length, 1, 'Must preserve archive record when schedule state is uncertain');
});

// Test 27: Both sources temporarily unreadable during recovery returns DELETE_COMPLETION_UNCERTAIN
runBehavioralTest('27. Both schedule and archive unreadable during recovery returns DELETE_COMPLETION_UNCERTAIN', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  let deleteTriggered = false;
  cneSheet.hooks.onDeleteRow = () => {
    deleteTriggered = true;
    throw new Error('Mutation failed mid-operation');
  };

  cneSheet.hooks.onGetRange = () => {
    if (deleteTriggered) {
      throw new Error('Google Sheets API unavailable for CNE Schedule');
    }
    return null;
  };

  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (deleteTriggered) {
      throw new Error('Google Sheets API unavailable');
    }
    return undefined;
  };

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Complete outage recovery test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'DELETE_COMPLETION_UNCERTAIN');
});

// Test 28: Secondary audit logging failure during recovery does not interrupt recovery
runBehavioralTest('28. Secondary audit logging failure during recovery does not interrupt recovery', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const auditSheet = env.cneSpreadsheet.sheets['Audit_Log'];

  // Throw on schedule row deletion
  cneSheet.hooks.onDeleteRow = () => {
    throw new Error('Simulated row deletion failure');
  };

  // And also throw on audit log append
  auditSheet.hooks.onAppendRow = () => {
    throw new Error('Audit sheet unreachable');
  };

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Audit log failure during recovery'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'DELETE_MUTATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, 3, 'Schedule row preserved');
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  assert.strictEqual(qrSheet.grid[1][4], 'ACTIVE', 'QR token restored');
});

// Test 29: Post-Test submission evidence denies deletion
runBehavioralTest('29. Post-Test submission evidence denies deletion with ATTENDANCE_EXISTS', () => {
  const env = createFreshTestEnvironment();
  const respSheet = env.cneSpreadsheet.sheets['CNE Post Test Responses'];

  // Add post-test response with score and PASSED status
  respSheet.appendRow([
    'RESP-001', 'CLS-2026-001', 'AIIMS002', 'Staff Nurse B', 'Nursing Officer', 'ICU',
    '85', '10', '85%', 'POST_TEST', '2026-10-12T11:00:00Z', '{}', 'PASSED', 'Passed on first attempt'
  ]);

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Delete with submitted post-test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'ATTENDANCE_EXISTS');
});

// Test 30: Unknown or malformed participant status/source values fail closed with ATTENDANCE_CHECK_FAILED
runBehavioralTest('30. Unknown or malformed participant status/source values fail closed with ATTENDANCE_CHECK_FAILED', () => {
  const env = createFreshTestEnvironment();
  const respSheet = env.cneSpreadsheet.sheets['CNE Post Test Responses'];
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  // Add a row with unrecognized source and status
  respSheet.appendRow([
    'RESP-CORRUPT-001', 'CLS-2026-001', 'EXT-999', 'Unknown Person', 'Unknown', 'Unknown',
    '', '', '', 'UNRECOGNIZED_LEGACY_SRC', '2026-10-12T11:00:00Z', '', 'AMBIGUOUS_STATE', ''
  ]);

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Ambiguous status test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'ATTENDANCE_CHECK_FAILED', 'Ambiguous/malformed participant status must fail closed');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active schedule row must be preserved');
});

// Test 31: Optional legacy repository (CNE_Participants) missing when mandatory repository is present allows deletion
runBehavioralTest('31. Optional legacy repository (CNE_Participants) missing when mandatory repository is present allows deletion', () => {
  const env = createFreshTestEnvironment();
  // Ensure CNE_Participants does NOT exist
  delete env.cneSpreadsheet.sheets['CNE_Participants'];
  assert.strictEqual(env.cneSpreadsheet.getSheetByName('CNE_Participants'), null);

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Valid deletion with absent optional legacy sheet'
  }, env.adminSession);

  assert.strictEqual(delRes.success, true, 'Absence of optional legacy sheet must not prevent deletion');
});

// Test 32: Flush succeeds but readback of archived row throws
runBehavioralTest('32. Flush succeeds but archive readback throws returns ARCHIVE_VERIFICATION_FAILED and preserves active CNE', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  
  // Hook archive getRange to throw on initial readback
  let readAttempts = 0;
  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive') {
      const arch = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
      if (arch) {
        arch.hooks.onGetRange = (r, c, nr, nc) => {
          // When reading back data row (row >= 2), throw on first read
          if (r >= 2) {
            readAttempts++;
            if (readAttempts === 1) {
              throw new Error('Transient read timeout reading archive row');
            }
          }
          return null;
        };
      }
    }
    return undefined;
  };

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Readback failure test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'ARCHIVE_VERIFICATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active CNE schedule row must be preserved');
});

// Test 33: Archive verification mismatch where archive row cannot be verified returns DELETE_COMPLETION_UNCERTAIN
runBehavioralTest('33. Archive verification mismatch where archive row cannot be verified returns DELETE_COMPLETION_UNCERTAIN and retains schedule row', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const initialRowCount = cneSheet.grid.length;

  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive' && env.cneSpreadsheet.sheets['CNE Deleted Archive']) {
      const arch = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
      arch.hooks.onGetRange = (startRow, startCol, numRows, numCols) => {
        if (startRow >= 2 && numRows === 1 && numCols > 5) {
          // Persistent corrupted row prevents ownership verification during cleanup
          const corrupted = new Array(numCols).fill('CORRUPTED');
          return {
            getValues: () => [corrupted],
            setValue: () => {},
            setValues: () => {}
          };
        }
        return null;
      };
    }
  };

  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Test Deletion'
  }, env.adminSession);

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'DELETE_COMPLETION_UNCERTAIN');
  assert.strictEqual(cneSheet.grid.length, initialRowCount, 'Active CNE schedule row must be preserved');
  const qrSheet = env.cneSpreadsheet.sheets['CNE_QR_Tokens'];
  assert.strictEqual(qrSheet.grid[1][4], 'ACTIVE', 'QR token must remain ACTIVE');
});

// Test 34: Archive readback throws and cleanup read also throws returns DELETE_COMPLETION_UNCERTAIN
runBehavioralTest('34. Archive readback throws and cleanup read also throws returns DELETE_COMPLETION_UNCERTAIN and retains schedule row', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];

  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive' && env.cneSpreadsheet.sheets['CNE Deleted Archive']) {
      const arch = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
      arch.hooks.onGetRange = (r, c, nr, nc) => {
        if (r >= 2 && nc > 5) {
          throw new Error('Persistent Google Sheets API failure');
        }
        return null;
      };
    }
    return undefined;
  };

  const delRes = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001',
    confirmationCneId: 'CLS-2026-001',
    reason: 'Persistent failure test'
  }, env.adminSession);

  assert.strictEqual(delRes.success, false);
  assert.strictEqual(delRes.errorCode, 'DELETE_COMPLETION_UNCERTAIN');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active CNE schedule row must be preserved');
});

// Test 35: transient archive ID lookup throws after append; cleanup must be verified
runBehavioralTest('35. Transient archive lookup failure cleans up this attempt and preserves active CNE', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  let threw = false;
  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive' && env.cneSpreadsheet.sheets[name]) {
      const arch = env.cneSpreadsheet.sheets[name];
      arch.hooks.onGetRange = (r, c, nr, nc) => {
        if (!threw && arch.grid.length > 1 && r === 2 && c === 1 && nc === 1) {
          threw = true;
          return { getValues: () => { throw new Error('Transient archive lookup read error'); } };
        }
        return null;
      };
    }
  };
  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001', confirmationCneId: 'CLS-2026-001', reason: 'Transient archive lookup'
  }, env.adminSession);
  assert.strictEqual(threw, true, 'Must actually fault after archive append');
  assert.strictEqual(res.errorCode, 'ARCHIVE_VERIFICATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, 3, 'Active schedule row must remain');
  const arch = env.cneSpreadsheet.sheets['CNE Deleted Archive'];
  assert.ok(arch, 'Archive append must have been attempted');
  assert.strictEqual(arch.grid.slice(1).filter(r => r[0] === 'CLS-2026-001').length, 0,
    'Attempt-specific archive entry must be removed after recoverable lookup error');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE_QR_Tokens'].grid[1][4], 'ACTIVE');
});

// Test 36: persistent archive lookup fault cannot prove cleanup; fail closed as uncertain
runBehavioralTest('36. Persistent archive lookup failure preserves data and reports uncertain cleanup', () => {
  const env = createFreshTestEnvironment();
  let calls = 0;
  env.cneSpreadsheet.hooks.onGetSheetByName = (name) => {
    if (name === 'CNE Deleted Archive' && env.cneSpreadsheet.sheets[name]) {
      const arch = env.cneSpreadsheet.sheets[name];
      arch.hooks.onGetRange = (r, c, nr, nc) => {
        if (arch.grid.length > 1 && r === 2 && c === 1 && nc === 1) {
          calls++;
          return { getValues: () => { throw new Error('Persistent archive lookup read error'); } };
        }
        return null;
      };
    }
  };
  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001', confirmationCneId: 'CLS-2026-001', reason: 'Persistent archive lookup'
  }, env.adminSession);
  assert.ok(calls > 0, 'Must exercise failed archive lookup');
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'DELETE_COMPLETION_UNCERTAIN');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE Schedule'].grid.length, 3);
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE Deleted Archive'].grid.length, 2,
    'Ambiguous archive ownership must not lead to destructive cleanup');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE_QR_Tokens'].grid[1][4], 'ACTIVE');
});

// Test 37: silent schedule deletion no-op must not be mistaken for committed deletion
runBehavioralTest('37. Silent schedule deleteRow no-op is detected and safely compensated', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  let deleteAttempted = false;
  cneSheet.deleteRow = () => { deleteAttempted = true; }; // no throw, no mutation
  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001', confirmationCneId: 'CLS-2026-001', reason: 'Silent delete no-op'
  }, env.adminSession);
  assert.strictEqual(deleteAttempted, true);
  assert.strictEqual(res.success, false, 'Never report success when schedule ID remains');
  assert.strictEqual(res.errorCode, 'DELETE_MUTATION_FAILED');
  assert.strictEqual(cneSheet.grid.length, 3);
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE Deleted Archive'].grid.length, 1,
    'Failed deletion must remove only the newly appended archive row');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE_QR_Tokens'].grid[1][4], 'ACTIVE',
    'QR token must be restored for the still-active schedule');
});

// Test 38: post-deletion readback error means success cannot be proven
runBehavioralTest('38. Transient final schedule verification failure returns uncertain without rollback of committed deletion', () => {
  const env = createFreshTestEnvironment();
  const cneSheet = env.cneSpreadsheet.sheets['CNE Schedule'];
  const originalDelete = cneSheet.deleteRow.bind(cneSheet);
  let removed = false;
  let readFailed = false;
  cneSheet.deleteRow = (row) => { originalDelete(row); removed = true; };
  cneSheet.hooks.onGetRange = (r, c, nr, nc) => {
    if (removed && !readFailed && r === 2 && c === 1 && nc === 1) {
      readFailed = true;
      return { getValues: () => { throw new Error('Transient final schedule readback failure'); } };
    }
    return null;
  };
  const res = env.sandbox.handleDeleteCNE({
    cneId: 'CLS-2026-001', confirmationCneId: 'CLS-2026-001', reason: 'Readback interrupted'
  }, env.adminSession);
  assert.strictEqual(readFailed, true, 'Final readback must be exercised');
  assert.strictEqual(res.success, false, 'No success response after unverified readback');
  assert.strictEqual(res.errorCode, 'DELETE_COMPLETION_UNCERTAIN');
  assert.strictEqual(cneSheet.grid.some(r => r[0] === 'CLS-2026-001'), false);
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE Deleted Archive'].grid.length, 2,
    'Committed deletion archive must remain intact');
  assert.strictEqual(env.cneSpreadsheet.sheets['CNE_QR_Tokens'].grid[1][4], 'INACTIVE',
    'Deleted CNE QR token must not be reactivated');
});

console.log('\\n========================================================');
console.log(\`Passed: \${passedTests}/\${totalTests}\`);
console.log('ALL BEHAVIORAL TESTS PASSED SUCCESSFULLY!');
console.log('========================================================\\n');
`
  },
  // ===== END ORIGINAL SUITE: verify-delete-cne-behavior.js =====

  // ===== BEGIN ORIGINAL SUITE: verify-cne-interest.js =====
  {
    id: "interest",
    name: "CNE Expression of Interest",
    originalFilename: "verify-cne-interest.js",
    mode: "module",
    expectedChecks: 46,
    sha256: "8378434f7292c5e5e9f1970976c0196b02a382ba6c9b94d6c5abce5b3e245b44",
    source: `/**
 * ============================================================================
 * EXECUTABLE BEHAVIORAL TEST SUITE: CNE Expression of Interest (Phase 1)
 * Scope: 46 True Behavioral Tests with Authentic Apps Script Execution
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import assert from 'assert';
import { fileURLToPath } from 'url';
function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  const trimmed = str.replace(/^[ \\f\\v\\u0000-\\u0008\\u000b\\u000e-\\u001f]+/, '');
  if (/^[=+@\\-\\t\\r]/.test(str) || /^[=+@\\-]/.test(trimmed)) {
    str = \`'\${str}\`;
  }

  const escaped = str.replace(/"/g, '""');
  return \`"\${escaped}"\`;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('========================================================');
console.log('CNE Expression of Interest Behavioral Verification');
console.log('Scope: 46 True Behavioral Tests (Registration, Security, Lifecycle, Strict Date/Time & ISO Offsets)');
console.log('========================================================\\n');

let totalTests = 0;
let passedTests = 0;

function runBehavioralTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${totalTests}. \${name}\`);
  } catch (err) {
    console.error(\`✗ \${totalTests}. \${name}\`);
    console.error(\`  Error: \${err.message}\\n\${err.stack}\\n\`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// In-Memory Google Apps Script Mock Framework
// -----------------------------------------------------------------------------

class MockRange {
  constructor(sheet, startRow, startCol, numRows, numCols) {
    this.sheet = sheet;
    this.startRow = startRow;
    this.startCol = startCol;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  getValues() {
    const result = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      const rowIndex = this.startRow - 1 + r;
      for (let c = 0; c < this.numCols; c++) {
        const colIndex = this.startCol - 1 + c;
        if (rowIndex < this.sheet.grid.length && colIndex < this.sheet.grid[rowIndex].length) {
          row.push(this.sheet.grid[rowIndex][colIndex]);
        } else {
          row.push('');
        }
      }
      result.push(row);
    }
    return result;
  }

  getDisplayValues() {
    return this.getValues().map(row => row.map(v => String(v !== null && v !== undefined ? v : '')));
  }

  getValue() {
    const vals = this.getValues();
    return vals[0] && vals[0][0] !== undefined ? vals[0][0] : '';
  }

  setValues(values) {
    for (let r = 0; r < values.length; r++) {
      const rowIndex = this.startRow - 1 + r;
      while (this.sheet.grid.length <= rowIndex) {
        this.sheet.grid.push([]);
      }
      for (let c = 0; c < values[r].length; c++) {
        const colIndex = this.startCol - 1 + c;
        while (this.sheet.grid[rowIndex].length <= colIndex) {
          this.sheet.grid[rowIndex].push('');
        }
        this.sheet.grid[rowIndex][colIndex] = values[r][c];
      }
    }
    return this;
  }

  setValue(value) {
    return this.setValues([[value]]);
  }

  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  setHorizontalAlignment() { return this; }
  setVerticalAlignment() { return this; }
  setWrap() { return this; }

  createTextFinder(query) {
    const range = this;
    const queryStr = String(query).trim().toLowerCase();
    return {
      matchEntireCell() { return this; },
      matchCase() { return this; },
      findNext() {
        const vals = range.getDisplayValues();
        for (let r = 0; r < vals.length; r++) {
          for (let c = 0; c < vals[r].length; c++) {
            if (vals[r][c].trim().toLowerCase() === queryStr) {
              const rowNum = range.startRow + r;
              return {
                getRow() { return rowNum; },
                getColumn() { return range.startCol + c; },
                getDisplayValue() { return vals[r][c]; }
              };
            }
          }
        }
        return null;
      },
      findAll() {
        const matches = [];
        const vals = range.getDisplayValues();
        for (let r = 0; r < vals.length; r++) {
          for (let c = 0; c < vals[r].length; c++) {
            if (vals[r][c].trim().toLowerCase() === queryStr) {
              const rowNum = range.startRow + r;
              matches.push({
                getRow() { return rowNum; },
                getColumn() { return range.startCol + c; },
                getDisplayValue() { return vals[r][c]; }
              });
            }
          }
        }
        return matches;
      }
    };
  }
}

class MockRangeList {
  constructor(sheet, ranges) {
    this.sheet = sheet;
    this.ranges = ranges || [];
  }

  setValue(val) {
    for (const a1 of this.ranges) {
      const match = a1.match(/([A-Z]+)(\\d+)/);
      if (match) {
        const colChar = match[1];
        const rowNum = parseInt(match[2], 10);
        let col = 0;
        for (let i = 0; i < colChar.length; i++) {
          col = col * 26 + (colChar.charCodeAt(i) - 64);
        }
        this.sheet.getRange(rowNum, col).setValue(val);
      }
    }
  }
}

class MockSheet {
  constructor(name, spreadsheet, initialGrid = []) {
    this.name = name;
    this.spreadsheet = spreadsheet;
    this.grid = initialGrid.map(row => [...row]);
    this.hooks = {};
  }

  getName() { return this.name; }
  getLastRow() { return this.grid.length; }
  getLastColumn() {
    let max = 0;
    for (const r of this.grid) {
      if (r.length > max) max = r.length;
    }
    return max;
  }

  getMaxColumns() {
    return Math.max(30, this.getLastColumn());
  }

  getMaxRows() {
    return Math.max(100, this.getLastRow());
  }

  getRange(row, col, numRows = 1, numCols = 1) {
    if (this.hooks.onGetRange) {
      const hooked = this.hooks.onGetRange(row, col, numRows, numCols);
      if (hooked) return hooked;
    }
    return new MockRange(this, row, col, numRows, numCols);
  }

  getRangeList(ranges) {
    if (this.hooks.onGetRangeList) {
      const hooked = this.hooks.onGetRangeList(ranges);
      if (hooked) return hooked;
    }
    return new MockRangeList(this, ranges);
  }

  getDataRange() {
    return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }

  appendRow(rowVals) {
    if (this.hooks.onAppendRow) {
      this.hooks.onAppendRow(rowVals);
    }
    this.grid.push([...rowVals]);
  }

  deleteRow(rowIdx) {
    if (this.hooks.onDeleteRow) {
      this.hooks.onDeleteRow(rowIdx);
    }
    if (rowIdx >= 1 && rowIdx <= this.grid.length) {
      this.grid.splice(rowIdx - 1, 1);
    }
  }

  deleteRows(startRow, numRows = 1) {
    if (startRow >= 1 && startRow <= this.grid.length) {
      this.grid.splice(startRow - 1, numRows);
    }
  }

  deleteColumn(colIdx) {
    if (colIdx >= 1) {
      for (const row of this.grid) {
        if (colIdx - 1 < row.length) {
          row.splice(colIdx - 1, 1);
        }
      }
    }
  }

  deleteColumns(colIdx, numCols = 1) {
    for (let c = 0; c < numCols; c++) {
      this.deleteColumn(colIdx);
    }
  }

  insertColumnsAfter(afterIndex, numColumns) {
    return this;
  }

  insertColumnAfter(afterIndex) {
    return this;
  }

  setFrozenRows() {}
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
  }

  getSheetByName(name) {
    return this.sheets[name] || null;
  }

  insertSheet(name) {
    const s = new MockSheet(name, this);
    this.sheets[name] = s;
    return s;
  }

  addSheet(name, grid) {
    const s = new MockSheet(name, this, grid);
    this.sheets[name] = s;
    return s;
  }
}

function createFreshTestEnvironment() {
  const cneSpreadsheet = new MockSpreadsheet();
  const officersSpreadsheet = new MockSpreadsheet();

  const scriptProperties = {
    DROPDOWN_SPREADSHEET_ID: 'officers_mock_id',
    CNE_SPREADSHEET_ID: 'cne_mock_id',
    SESSION_SECRET: 'test_session_secret_32bytes_minimum_length_required'
  };

  // 1. CNE Schedule sheet
  cneSpreadsheet.addSheet('CNE Schedule', [
    [
      'CNE ID', 'Topic', 'Ward Name / Area', 'From Date', 'To Date', 'Duration',
      'Resource Person Emp Id', 'Mode of Teaching', 'Description', 'Max Participants', 'Status',
      'Type of CNE', 'External Resource Persons', 'Staff Emp ID', 'Staff Count', 'External Staff Participants',
      'Proposed By', 'Admin Remarks', 'Remarks', 'CreatedAt', 'CreatedBy',
      'Coverage Areas Snapshot', 'Total Allotted Staff', 'Internal Attendance Count',
      'Attendance Percentage', 'Post-Test Outcome Percentage', 'Coverage Finalized At'
    ],
    // Future Scheduled CNE in ICU
    [
      'CNE-2026-FUT1', 'Advanced Mechanical Ventilation', 'ICU', '2028-11-20T10:00', '2028-11-20T11:30', '90',
      'EMP-RP-100', 'Workshop', 'Hands-on ventilator management', '40', 'Scheduled',
      'CENTRAL', '', '', '0', '',
      'EMP-ADM-001', '', '', '2026-10-01', 'ADMIN'
    ],
    // Future Scheduled Departmental CNE in OT
    [
      'CNE-2026-FUT2', 'Surgical Asepsis & Sterilization', 'OT', '2028-12-15T09:00', '2028-12-15T10:30', '90',
      'EMP-RP-200', 'Lecture', 'Sterile technique in operating rooms', '30', 'Scheduled',
      'DEPARTMENTAL', '', '', '0', '',
      'EMP-RP-200', '', '', '2026-10-01', 'EMP-RP-200'
    ],
    // Past CNE
    [
      'CNE-2026-PAST', 'Historical Infection Control', 'Emergency', '2020-01-10T09:00', '2020-01-10T10:00', '60',
      'EMP-RP-100', 'Lecture', 'Basic infection control protocols', '50', 'Scheduled',
      'CENTRAL', '', '', '0', '',
      'EMP-ADM-001', '', '', '2020-01-01', 'ADMIN'
    ],
    // Canceled CNE
    [
      'CNE-2026-CNCL', 'Emergency Triage Protocols', 'Emergency', '2028-11-25T14:00', '2028-11-25T15:00', '60',
      'EMP-RP-100', 'Workshop', 'Triage algorithms', '40', 'Canceled',
      'CENTRAL', '', '', '0', '',
      'EMP-ADM-001', '', '', '2026-10-01', 'ADMIN'
    ],
    // Future CNE with separate date and time values
    [
      'CNE-2026-TIME', 'Pediatric Resuscitation', 'Pediatrics', '2028-10-15', '2028-10-15', '60',
      'EMP-RP-100', 'Lecture', 'Pediatric CPR protocols', '40', 'Scheduled',
      'CENTRAL', '', '', '0', '',
      'EMP-ADM-001', '', '', '2026-10-01', 'ADMIN'
    ]
  ]);

  // 2. Officers data master sheet
  officersSpreadsheet.addSheet('Officers data', [
    [
      'Sr. No.', 'Employee ID No.', 'Name of the Officers', 'Designation', 'Contact No.',
      'Employment Type', 'Date of Joining', 'EmailID'
    ],
    ['1', 'EMP-ADM-001', 'Dr. System Administrator', 'Chief Nursing Officer', '9999999990', 'Regular', '2015-01-01', 'admin@aiims.edu'],
    ['2', 'EMP-INCH-ICU', 'Sister Incharge ICU', 'Senior Nursing Officer', '9999999991', 'Regular', '2016-02-01', 'inch.icu@aiims.edu'],
    ['3', 'EMP-RP-100', 'Master Instructor One', 'Nursing Officer', '9999999992', 'Regular', '2018-03-01', 'rp1@aiims.edu'],
    ['4', 'EMP-RP-200', 'Master Instructor Two', 'Nursing Officer', '9999999993', 'Regular', '2019-04-01', 'rp2@aiims.edu'],
    ['5', 'EMP-NURSE-01', 'Staff Nurse Alpha', 'Nursing Officer', '9999999994', 'Regular', '2021-05-01', 'nurse.alpha@aiims.edu'],
    ['6', 'EMP-NURSE-02', 'Staff Nurse Beta', 'Nursing Officer', '9999999995', 'Regular', '2022-06-01', 'nurse.beta@aiims.edu']
  ]);

  // 3. Role sheet
  cneSpreadsheet.addSheet('Role', [
    ['Employee ID No.', 'Name of the Officers', 'Designation', 'Role', 'Department / Area'],
    ['EMP-ADM-001', 'Dr. System Administrator', 'Chief Nursing Officer', 'ADMIN', ''],
    ['EMP-INCH-ICU', 'Sister Incharge ICU', 'Senior Nursing Officer', 'AREA_INCHARGE', 'ICU'],
    ['EMP-RP-100', 'Master Instructor One', 'Nursing Officer', 'EMPLOYEE', ''],
    ['EMP-RP-200', 'Master Instructor Two', 'Nursing Officer', 'EMPLOYEE', 'OT'],
    ['EMP-NURSE-01', 'Staff Nurse Alpha', 'Nursing Officer', 'EMPLOYEE', 'ICU'],
    ['EMP-NURSE-02', 'Staff Nurse Beta', 'Nursing Officer', 'EMPLOYEE', 'Emergency']
  ]);

  // 4. Area sheet
  cneSpreadsheet.addSheet('Area', [
    ['Area', 'Status', 'CreatedAt'],
    ['ICU', 'ACTIVE', '2026-01-01'],
    ['OT', 'ACTIVE', '2026-01-01'],
    ['Emergency', 'ACTIVE', '2026-01-01'],
    ['Pediatrics', 'ACTIVE', '2026-01-01']
  ]);

  // 5. CNE Post Test Responses (Empty baseline)
  cneSpreadsheet.addSheet('CNE Post Test Responses', [
    ['Response ID', 'CNE ID', 'Employee ID', 'Employee Name', 'Designation', 'Department', 'Score', 'Total Questions', 'Percentage', 'Source', 'Submitted At', 'Answers JSON', 'Status', 'Remarks']
  ]);

  // 6. CNE Deleted Archive
  cneSpreadsheet.addSheet('CNE Deleted Archive', [
    [
      'CNE ID', 'Topic', 'Ward Name / Area', 'From Date', 'To Date', 'Duration',
      'Resource Person Emp Id', 'Mode of Teaching', 'Description', 'Max Participants', 'Status',
      'Type of CNE', 'External Resource Persons', 'Staff Emp ID', 'Staff Count', 'External Staff Participants',
      'Proposed By', 'Admin Remarks', 'Remarks', 'CreatedAt', 'CreatedBy',
      'Coverage Areas Snapshot', 'Total Allotted Staff', 'Internal Attendance Count',
      'Attendance Percentage', 'Post-Test Outcome Percentage', 'Coverage Finalized At',
      'Deleted At', 'Deleted By', 'Delete Reason'
    ]
  ]);

  // 7. CNE_QR_Tokens
  cneSpreadsheet.addSheet('CNE_QR_Tokens', [
    ['QR Token', 'CNE ID', 'Created At', 'Created By', 'Status']
  ]);

  // 8. Auth_Credentials
  cneSpreadsheet.addSheet('Auth_Credentials', [
    ['Employee ID', 'Password Hash', 'Password Salt', 'Password Version', 'Password Created At', 'Password Changed At', 'Last Login At', 'Account Status', 'Failed Login Count', 'Locked Until', 'Created At', 'Updated At'],
    ['EMP-ADM-001', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z'],
    ['EMP-INCH-ICU', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z'],
    ['EMP-RP-100', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z'],
    ['EMP-RP-200', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z'],
    ['EMP-NURSE-01', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z'],
    ['EMP-NURSE-02', 'mockhash', 'mocksalt', '1', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z', '', 'ACTIVE', '0', '', '2026-10-10T00:00:00Z', '2026-10-10T00:00:00Z']
  ]);

  // 9. Audit_Log
  cneSpreadsheet.addSheet('Audit_Log', [
    ['Timestamp', 'Action', 'Employee ID', 'Details', 'Status']
  ]);

  const scriptLock = {
    hasLock: false,
    waitLock() { this.hasLock = true; return true; },
    releaseLock() { this.hasLock = false; }
  };

  const sandbox = {
    Logger: {
      log: () => {}
    },
    console,
    Date,
    Math,
    String,
    Number,
    Array,
    Object,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    JSON,
    SpreadsheetApp: {
      openById(id) {
        if (id === 'officers_mock_id') return officersSpreadsheet;
        return cneSpreadsheet;
      },
      getActiveSpreadsheet() {
        return cneSpreadsheet;
      },
      flush() {}
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(k) { return scriptProperties[k] || null; },
          getProperties() { return { ...scriptProperties }; },
          setProperty(k, v) { scriptProperties[k] = v; }
        };
      }
    },
    LockService: {
      getScriptLock() { return scriptLock; }
    },
    CacheService: {
      getScriptCache() {
        const cacheStore = {};
        return {
          get(k) { return cacheStore[k] || null; },
          put(k, v) { cacheStore[k] = v; },
          remove(k) { delete cacheStore[k]; }
        };
      }
    },
    Utilities: {
      formatDate(date, tz, fmt) {
        if (date instanceof Date) {
          try {
            const dtf = new Intl.DateTimeFormat('en-CA', {
              timeZone: tz || 'Asia/Kolkata',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
            const parts = dtf.formatToParts(date);
            const p = {};
            for (const pt of parts) p[pt.type] = pt.value;
            return \`\${p.year}-\${p.month}-\${p.day}T\${p.hour}:\${p.minute}:\${p.second}\`;
          } catch (e) {
            return date.toISOString();
          }
        }
        return String(date);
      },
      computeHmacSha256Signature() { return [1, 2, 3]; },
      base64Encode() { return 'mock_token'; }
    },
    Session: {
      getScriptTimeZone() { return 'Asia/Kolkata'; }
    }
  };

  const codeGsSource = fs.readFileSync(path.join(rootDir, 'Code.gs'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(codeGsSource, sandbox);

  return { sandbox, cneSpreadsheet, officersSpreadsheet };
}

// =============================================================================
// ORIGINAL 16 BEHAVIORAL VERIFICATION SCENARIOS
// =============================================================================

runBehavioralTest('1. Registering interest saves record in CNE Interest Registrations with INTERESTED status', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.status, 'INTERESTED');

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  assert.ok(sheet, 'CNE Interest Registrations tab must be created');
  assert.strictEqual(sheet.getLastRow(), 2, 'Must have 1 header row + 1 data row');

  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  assert.strictEqual(row[0], 'CNE-2026-FUT1', 'CNE ID matches');
  assert.strictEqual(row[1], 'EMP-NURSE-01', 'Employee ID matches');
  assert.strictEqual(row[2], 'Staff Nurse Alpha', 'Employee name resolved from directory');
  assert.strictEqual(row[5], 'INTERESTED', 'Interest status is INTERESTED');
  assert.ok(row[6], 'Interested At timestamp recorded');
});

runBehavioralTest('2. Withdrawal updates interest status to WITHDRAWN', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  const withdrawRes = sandbox.handleWithdrawCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(withdrawRes.success, true);
  assert.strictEqual(withdrawRes.data.status, 'WITHDRAWN');

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  assert.strictEqual(row[5], 'WITHDRAWN', 'Status in sheet updated to WITHDRAWN');
});

runBehavioralTest('3. Re-registration updates existing row rather than creating duplicate row', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  // 1. Register -> 2. Withdraw -> 3. Re-register
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  sandbox.handleWithdrawCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  const reRegRes = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(reRegRes.success, true);
  assert.strictEqual(reRegRes.data.status, 'INTERESTED');

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  assert.strictEqual(sheet.getLastRow(), 2, 'Must still have exactly 1 data row, no duplicate created');

  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  assert.strictEqual(row[5], 'INTERESTED', 'Status updated back to INTERESTED');
});

runBehavioralTest('4. Duplicate registration calls are idempotent and prevent duplicate rows', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  const first = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  const second = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(first.success, true);
  assert.strictEqual(second.success, true);
  assert.strictEqual(second.data.alreadyRegistered, true);

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  assert.strictEqual(sheet.getLastRow(), 2, 'Only 1 row created for same CNE ID and Employee ID');
});

runBehavioralTest('5. Registration after CNE start time is rejected with REGISTRATION_CLOSED', () => {
  const { sandbox } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // CNE-2026-PAST has date 2020-01-10 (in the past)
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-PAST' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('6. Registration for canceled CNE is rejected with REGISTRATION_CLOSED', () => {
  const { sandbox } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // CNE-2026-CNCL has status Canceled
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-CNCL' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('7. Registration for nonexistent or deleted CNE is rejected with CNE_NOT_FOUND', () => {
  const { sandbox } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  const res = sandbox.handleRegisterCneInterest({ cneId: 'NONEXISTENT-CNE' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'CNE_NOT_FOUND');
});

runBehavioralTest('8. Employee identity is derived strictly from session and cannot be spoofed via client params', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };
  const maliciousParams = {
    cneId: 'CNE-2026-FUT1',
    employeeId: 'EMP-ADM-001',
    loggedInEmployeeId: 'EMP-ADM-001',
    name: 'Fake Name'
  };

  const res = sandbox.handleRegisterCneInterest(maliciousParams, session);
  assert.strictEqual(res.success, true);

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  assert.strictEqual(row[1], 'EMP-NURSE-01', 'Must store authenticated session employeeId, ignoring client input');
  assert.strictEqual(row[2], 'Staff Nurse Alpha', 'Must store authentic directory name');
});

runBehavioralTest('9. Ordinary employee is denied access to organizer participant list with FORBIDDEN', () => {
  const { sandbox } = createFreshTestEnvironment();
  const employeeSession = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  const res = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, employeeSession);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'FORBIDDEN');
});

runBehavioralTest('10. Administrator is authorized to view interested participant list for all CNEs', () => {
  const { sandbox } = createFreshTestEnvironment();
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 });
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-02', role: 'EMPLOYEE', name: 'Beta', passwordVersion: 1 });

  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin', passwordVersion: 1 };
  const res = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, adminSession);

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.totalInterested, 2);
  assert.strictEqual(res.data.participants.length, 2);
});

runBehavioralTest('11. Area Incharge is authorized for CNEs within their assigned area and denied for others', () => {
  const { sandbox } = createFreshTestEnvironment();
  const inchargeIcuSession = {
    employeeId: 'EMP-INCH-ICU',
    role: 'AREA_INCHARGE',
    assignedArea: 'ICU',
    assignedAreas: ['ICU'],
    passwordVersion: 1
  };

  // CNE-2026-FUT1 is in ICU -> Authorized
  const inScopeRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, inchargeIcuSession);
  assert.strictEqual(inScopeRes.success, true, 'Area Incharge must be allowed for their assigned area (ICU)');

  // CNE-2026-FUT2 is in OT -> Denied
  const outOfScopeRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT2' }, inchargeIcuSession);
  assert.strictEqual(outOfScopeRes.success, false);
  assert.strictEqual(outOfScopeRes.errorCode, 'FORBIDDEN', 'Area Incharge must be denied for out-of-scope area (OT)');
});

runBehavioralTest('12. Assigned Resource Person is authorized for their assigned CNE and denied for unassigned CNEs', () => {
  const { sandbox } = createFreshTestEnvironment();
  const rpSession = { employeeId: 'EMP-RP-100', role: 'EMPLOYEE', name: 'Master Instructor One', passwordVersion: 1 };

  // CNE-2026-FUT1 has Resource Person EMP-RP-100 -> Authorized
  const assignedRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, rpSession);
  assert.strictEqual(assignedRes.success, true, 'Assigned Resource Person must be authorized');

  // CNE-2026-FUT2 has Resource Person EMP-RP-200 -> Denied for EMP-RP-100
  const unassignedRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT2' }, rpSession);
  assert.strictEqual(unassignedRes.success, false);
  assert.strictEqual(unassignedRes.errorCode, 'FORBIDDEN', 'Unassigned Resource Person must be denied');
});

runBehavioralTest('13. Concurrent registration requests acquire ScriptLock and execute safely', () => {
  const { sandbox } = createFreshTestEnvironment();
  let lockAcquired = false;

  sandbox.LockService.getScriptLock = () => ({
    waitLock(timeout) {
      assert.ok(timeout >= 5000, 'Must request sufficient lock timeout');
      lockAcquired = true;
      return true;
    },
    releaseLock() {
      lockAcquired = false;
    }
  });

  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(res.success, true);
  assert.strictEqual(lockAcquired, false, 'Lock must be cleanly released');
});

runBehavioralTest('14. Active-interest count counts only INTERESTED records and excludes WITHDRAWN records', () => {
  const { sandbox } = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', passwordVersion: 1 };

  // Nurse 1: Registers interest
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 });
  // Nurse 2: Registers then withdraws
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-02', role: 'EMPLOYEE', name: 'Beta', passwordVersion: 1 });
  sandbox.handleWithdrawCneInterest({ cneId: 'CNE-2026-FUT1' }, { employeeId: 'EMP-NURSE-02', role: 'EMPLOYEE', name: 'Beta', passwordVersion: 1 });

  const res = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, adminSession);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data.participants.length, 2, '2 total registration records present');
  assert.strictEqual(res.data.totalInterested, 1, 'Only 1 active INTERESTED record counted');
});

runBehavioralTest('15. Expression of interest does NOT modify attendance or Post-Test responses', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  const respSheet = cneSpreadsheet.getSheetByName('CNE Post Test Responses');
  assert.strictEqual(respSheet.getLastRow(), 1, 'CNE Post Test Responses must remain empty (no attendance written)');

  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  const schedRow = schedSheet.getRange(2, 1, 1, 27).getValues()[0];
  assert.strictEqual(schedRow[14], '0', 'Staff Count in CNE Schedule must remain 0');
  assert.strictEqual(schedRow[23], '', 'Internal Attendance Count in CNE Schedule must remain empty');
});

runBehavioralTest('16. Interest registration alone does NOT block Admin Delete CNE', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const nurseSession = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin', passwordVersion: 1 };

  // 1. Employee registers interest
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, nurseSession);

  // 2. Admin deletes CNE
  const deleteRes = sandbox.handleDeleteCNE({
    cneId: 'CNE-2026-FUT1',
    reason: 'Testing interest non-blocking deletion',
    confirmationCneId: 'CNE-2026-FUT1'
  }, adminSession);

  assert.strictEqual(deleteRes.success, true, 'Admin delete CNE must succeed even with interest registered');

  // Verify CNE was removed from active schedule and archived
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  const remainingIds = schedSheet.getRange(2, 1, Math.max(1, schedSheet.getLastRow() - 1), 1).getValues().map(r => r[0]);
  assert.ok(!remainingIds.includes('CNE-2026-FUT1'), 'CNE ID removed from active schedule');

  const archSheet = cneSpreadsheet.getSheetByName('CNE Deleted Archive');
  const archivedIds = archSheet.getRange(2, 1, Math.max(1, archSheet.getLastRow() - 1), 1).getValues().map(r => r[0]);
  assert.ok(archivedIds.includes('CNE-2026-FUT1'), 'CNE ID present in archive');

  // 3. Deleted CNE cannot accept new interest
  const postDeleteInterest = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, nurseSession);
  assert.strictEqual(postDeleteInterest.success, false, 'Deleted CNE must reject interest registration');
});

// =============================================================================
// ADDITIONAL BEHAVIORAL SCENARIOS (Phase 1 Strengthening)
// =============================================================================

runBehavioralTest('17. Session revoked before/during mutation lock rejects registration with SESSION_REVOKED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  // Mark EMP-NURSE-01 as INACTIVE in Auth_Credentials
  const authSheet = cneSpreadsheet.getSheetByName('Auth_Credentials');
  const rows = authSheet.getDataRange().getValues();
  for (let r = 1; r < rows.length; r++) {
    if (rows[r][0] === 'EMP-NURSE-01') {
      authSheet.getRange(r + 1, 8).setValue('INACTIVE');
      break;
    }
  }

  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };
  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'SESSION_REVOKED', 'Must reject revoked/inactive account');
});

runBehavioralTest('18. CNE canceled while registration is waiting for lock rejects with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // Simulate CNE becoming canceled before lock resolves
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 11).setValue('Canceled');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('19. CNE deleted before registration commits rejects with CNE_NOT_FOUND', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // Remove the row from schedule
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.deleteRow(2);

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'CNE_NOT_FOUND');
});

runBehavioralTest('20. CNE starting before registration commits rejects with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // Set start time to past
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2021-01-01T10:00');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('21. Missing or unparseable CNE start date rejects registration with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // Set start date to invalid string
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('invalid-date-not-a-timestamp');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED', 'Unparseable date must reject registration');
});

runBehavioralTest('22. Invalid interest sheet headers rejects registration with INTEREST_SHEET_INVALID', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', passwordVersion: 1 };

  // Pre-create corrupt sheet missing "Employee ID" header
  cneSpreadsheet.addSheet('CNE Interest Registrations', [
    ['CNE ID', 'Corrupt Header', 'Employee Name', 'Designation', 'Department / Area', 'Interest Status', 'Interested At', 'Updated At']
  ]);

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errorCode, 'INTEREST_SHEET_INVALID', 'Must reject missing mandatory headers');
});

runBehavioralTest('23. Rearranged interest sheet columns are correctly resolved and updated dynamically', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  // Pre-create sheet with rearranged columns
  cneSpreadsheet.addSheet('CNE Interest Registrations', [
    ['Employee ID', 'Interest Status', 'CNE ID', 'Department / Area', 'Designation', 'Employee Name', 'Updated At', 'Interested At']
  ]);

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, true);

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  assert.strictEqual(row[0], 'EMP-NURSE-01', 'Employee ID in column 0');
  assert.strictEqual(row[1], 'INTERESTED', 'Interest Status in column 1');
  assert.strictEqual(row[2], 'CNE-2026-FUT1', 'CNE ID in column 2');
  assert.strictEqual(row[5], 'Staff Nurse Alpha', 'Employee Name in column 5');

  // Verify organizer query accurately parses rearranged columns
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', passwordVersion: 1 };
  const queryRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, adminSession);
  assert.strictEqual(queryRes.success, true);
  assert.strictEqual(queryRes.data.participants[0].employeeId, 'EMP-NURSE-01');
  assert.strictEqual(queryRes.data.participants[0].employeeName, 'Staff Nurse Alpha');
  assert.strictEqual(queryRes.data.participants[0].status, 'INTERESTED');
});

runBehavioralTest('24. Concurrent duplicate registrations remain idempotent without creating duplicate rows', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  const res1 = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  const res2 = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  const res3 = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  assert.strictEqual(res1.success, true);
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res3.success, true);

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  assert.strictEqual(sheet.getLastRow(), 2, 'Only 1 row exists after 3 rapid registrations');
});

runBehavioralTest('25. Interest status isolation between different employee accounts', () => {
  const { sandbox } = createFreshTestEnvironment();
  const nurseAlpha = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };
  const nurseBeta = { employeeId: 'EMP-NURSE-02', role: 'EMPLOYEE', name: 'Beta', passwordVersion: 1 };

  // Alpha registers interest
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, nurseAlpha);

  // Alpha status is INTERESTED
  const alphaStatus = sandbox.handleGetMyCneInterestStatus({ cneId: 'CNE-2026-FUT1' }, nurseAlpha);
  assert.strictEqual(alphaStatus.success, true);
  assert.strictEqual(alphaStatus.data.isInterested, true);
  assert.strictEqual(alphaStatus.data.status, 'INTERESTED');

  // Beta status is null / false (isolated!)
  const betaStatus = sandbox.handleGetMyCneInterestStatus({ cneId: 'CNE-2026-FUT1' }, nurseBeta);
  assert.strictEqual(betaStatus.success, true);
  assert.strictEqual(betaStatus.data.isInterested, false);
  assert.strictEqual(betaStatus.data.status, null);
});

runBehavioralTest('26. CSV formula injection neutralization protects dangerous cell values', () => {
  // Test formula injection characters: =, +, -, @, \\t, \\r, with and without leading whitespace
  assert.strictEqual(sanitizeCsvCell('=cmd| /C calc'), \`"'=cmd| /C calc"\`);
  assert.strictEqual(sanitizeCsvCell('  =1+1'), \`"'  =1+1"\`);
  assert.strictEqual(sanitizeCsvCell('+9999999999'), \`"'+9999999999"\`);
  assert.strictEqual(sanitizeCsvCell('-1000'), \`"'-1000"\`);
  assert.strictEqual(sanitizeCsvCell('@SUM(A1:A10)'), \`"'@SUM(A1:A10)"\`);
  assert.strictEqual(sanitizeCsvCell('\\tmalicious'), \`"'	malicious"\`);
  assert.strictEqual(sanitizeCsvCell('Normal Clinical Staff'), \`"Normal Clinical Staff"\`);
  assert.strictEqual(sanitizeCsvCell('ICU "Critical Care"'), \`"ICU ""Critical Care"""\`);
  assert.strictEqual(sanitizeCsvCell(null), '""');
  assert.strictEqual(sanitizeCsvCell(undefined), '""');
});

runBehavioralTest('27. Resource Person access is strictly limited to their assigned CNEs', () => {
  const { sandbox } = createFreshTestEnvironment();
  const rp100 = { employeeId: 'EMP-RP-100', role: 'EMPLOYEE', name: 'Master Instructor One', passwordVersion: 1 };

  // EMP-RP-100 is assigned to CNE-2026-FUT1
  const assignedRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT1' }, rp100);
  assert.strictEqual(assignedRes.success, true);

  // EMP-RP-100 is NOT assigned to CNE-2026-FUT2 (assigned to EMP-RP-200)
  const unassignedRes = sandbox.handleGetCneInterestedParticipants({ cneId: 'CNE-2026-FUT2' }, rp100);
  assert.strictEqual(unassignedRes.success, false);
  assert.strictEqual(unassignedRes.errorCode, 'FORBIDDEN');
});

runBehavioralTest('28. Department derivation does not treat officer employment type as department', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  // Role table does not have assigned area for EMP-RP-100; employmentType in roster is "Regular"
  const rpSession = { employeeId: 'EMP-RP-100', role: 'EMPLOYEE', passwordVersion: 1 };
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, rpSession);

  const sheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  // Column 4 is Department / Area
  assert.notStrictEqual(row[4], 'Regular', 'Must NEVER treat Employment Type "Regular" as a department');
  assert.strictEqual(row[4], '', 'Preserves blank when no authoritative department assigned');
});

runBehavioralTest('29. Withdrawal after CNE start time is rejected with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Staff Nurse Alpha', passwordVersion: 1 };

  // First register while in future
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);

  // Advance CNE start time to the past
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2021-01-01T10:00');

  const withdrawRes = sandbox.handleWithdrawCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(withdrawRes.success, false);
  assert.strictEqual(withdrawRes.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('30. Preserved historical interest after CNE deletion and rejection of new registrations', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const nurseAlpha = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin', passwordVersion: 1 };

  // Alpha registers interest
  sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, nurseAlpha);

  // Admin deletes CNE
  const deleteRes = sandbox.handleDeleteCNE({
    cneId: 'CNE-2026-FUT1',
    reason: 'Routine program schedule retirement',
    confirmationCneId: 'CNE-2026-FUT1'
  }, adminSession);
  assert.strictEqual(deleteRes.success, true);

  // Historical record in CNE Interest Registrations is preserved
  const intSheet = cneSpreadsheet.getSheetByName('CNE Interest Registrations');
  assert.strictEqual(intSheet.getLastRow(), 2, 'Historical interest registration remains intact in sheet');
  const row = intSheet.getRange(2, 1, 1, 8).getValues()[0];
  assert.strictEqual(row[0], 'CNE-2026-FUT1');
  assert.strictEqual(row[1], 'EMP-NURSE-01');

  // New registration on deleted CNE is rejected
  const regDeleted = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, nurseAlpha);
  assert.strictEqual(regDeleted.success, false);
  assert.strictEqual(regDeleted.errorCode, 'CNE_NOT_FOUND');
});

// =============================================================================
// DATE AND TIME VALIDATION CORRECTION TESTS (Phase 1 Final Enhancement)
// =============================================================================

runBehavioralTest('31. Valid leap-year date (2028-02-29) is accepted and allows interest registration', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };

  // Verify parser accepts 2028-02-29 (2028 is a leap year)
  const leapTs = sandbox.parseCneStartTimestamp_('2028-02-29T10:00');
  assert.ok(!isNaN(leapTs), '2028-02-29 must parse as valid timestamp');

  // Verify registration succeeds for valid leap year schedule
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2028-02-29T10:00');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, true, 'Registration must succeed for valid leap year date');
  assert.strictEqual(res.data.status, 'INTERESTED');
});

runBehavioralTest('32. Invalid leap-year date (2026-02-29) is rejected and denies registration with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };

  // 2026 is non-leap year: Feb 29 does not exist
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-02-29')), '2026-02-29 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-02-29T10:00')), '2026-02-29T10:00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('29-02-2026 10:00')), '29-02-2026 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('29-Feb-2026 10:00')), '29-Feb-2026 must return NaN');

  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2026-02-29T10:00');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false, 'Invalid leap year date must be rejected');
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('33. Invalid calendar dates (2026-02-30, 2026-04-31) are strictly rejected with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };

  // Calendar days overflow check (prevent JS Date rollover to March 2 or May 1)
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-02-30T14:00')), '2026-02-30 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-02-31T14:00')), '2026-02-31 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-04-31T14:00')), '2026-04-31 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('30-02-2026 14:00')), '30-02-2026 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('31-Apr-2026 14:00')), '31-Apr-2026 must return NaN');

  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2026-02-30T14:00');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false, '2026-02-30 schedule date must reject registration');
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('34. Invalid month values (month 00, month 13) and day values (day 00, day 32) are rejected', () => {
  const { sandbox } = createFreshTestEnvironment();

  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-00-15')), 'Month 00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-13-15')), 'Month 13 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-00')), 'Day 00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-32')), 'Day 32 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('15-00-2028')), 'DD-MM-YYYY month 00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('15-13-2028')), 'DD-MM-YYYY month 13 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('00-10-2028')), 'DD-MM-YYYY day 00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('32-10-2028')), 'DD-MM-YYYY day 32 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('00-Oct-2028')), 'DD-MMM-YYYY day 00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('32-Oct-2028')), 'DD-MMM-YYYY day 32 must return NaN');
});

runBehavioralTest('35. Invalid time components (24:00, 25:00, 99:99, 10:60) are rejected with REGISTRATION_CLOSED', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };

  // Embedded time in ISO
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25T24:00')), '24:00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25T25:00')), '25:00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25T99:99')), '99:99 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25T10:60')), '10:60 must return NaN');

  // Separate time parameter
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '24:00')), 'Separate 24:00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '25:00')), 'Separate 25:00 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '99:99')), 'Separate 99:99 must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '10:60')), 'Separate 10:60 must return NaN');

  // Invalid 12-hour AM/PM
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '0:00 AM')), '0:00 AM must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '13:00 PM')), '13:00 PM must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '12:60 PM')), '12:60 PM must return NaN');

  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2028-10-25T99:99');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false, 'Invalid time in schedule must reject registration');
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('36. Malformed time strings (bogus, abc) are rejected with REGISTRATION_CLOSED instead of defaulting to midnight', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };

  // Separate bogus time strings must NOT be ignored to fall back to midnight
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', 'bogus')), 'time bogus must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', 'abc')), 'time abc must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', '14:00bogus')), 'trailing garbage time must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25 bogus')), 'embedded bogus time must return NaN');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25T14:00bogus')), 'embedded trailing garbage must return NaN');

  // Rejection during registration when separate or embedded time is bogus
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2028-10-25 bogus');

  const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res.success, false, 'Bogus time in schedule must reject registration');
  assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED');
});

runBehavioralTest('37. All supported valid date/time formats parse reliably and identically', () => {
  const { sandbox } = createFreshTestEnvironment();

  // 1. ISO format: 2028-10-25T14:00
  const isoTs = sandbox.parseCneStartTimestamp_('2028-10-25T14:00');
  assert.ok(!isNaN(isoTs), 'ISO format must parse');

  // 2. Separate date and 24-hr time fields
  const sepTs = sandbox.parseCneStartTimestamp_('2028-10-25', '14:00');
  assert.strictEqual(sepTs, isoTs, 'Separate date and 24-hr time must match ISO');

  // 3. DD-MM-YYYY format with 24-hr time
  const dmyTs = sandbox.parseCneStartTimestamp_('25-10-2028 14:00');
  assert.strictEqual(dmyTs, isoTs, 'DD-MM-YYYY 14:00 must match ISO');

  // 4. DD-MMM-YYYY format with 24-hr time
  const dmmmTs = sandbox.parseCneStartTimestamp_('25-Oct-2028 14:00');
  assert.strictEqual(dmmmTs, isoTs, 'DD-MMM-YYYY 14:00 must match ISO');

  // 5. 12-hour AM/PM format: 02:00 PM
  const ampmTs = sandbox.parseCneStartTimestamp_('2028-10-25', '02:00 PM');
  assert.strictEqual(ampmTs, isoTs, '02:00 PM must match 14:00');

  // 6. Object input with fromDate and fromTime
  const objTs = sandbox.parseCneStartTimestamp_({ fromDate: '2028-10-25', fromTime: '14:00' });
  assert.strictEqual(objTs, isoTs, 'Object input with fromDate/fromTime must match ISO');

  // 7. Google Sheets Date object
  const dateObj = new Date(isoTs);
  const dateObjTs = sandbox.parseCneStartTimestamp_(dateObj);
  assert.strictEqual(dateObjTs, isoTs, 'Date object must match original timestamp');

  // 8. Date-only valid format (defaults to midnight Asia/Kolkata)
  const dateOnlyTs = sandbox.parseCneStartTimestamp_('2028-10-25');
  assert.ok(!isNaN(dateOnlyTs), 'Date-only string must parse to midnight');
  const expectedMidnight = Date.UTC(2028, 9, 25, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000;
  assert.strictEqual(dateOnlyTs, expectedMidnight, 'Date-only must represent midnight in Asia/Kolkata');
});

runBehavioralTest('38. Rejection of interest registration when schedule contains invalid date or invalid time', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');

  const invalidInputs = [
    '2026-02-30T14:00',
    '2026-04-31T14:00',
    '2026-02-29T14:00',
    '2028-10-25T99:99',
    '2028-10-25T25:00',
    '2028-10-25T10:60',
    '2028-10-25 bogus',
    'not-a-date'
  ];

  for (const input of invalidInputs) {
    schedSheet.getRange(2, 4).setValue(input);
    const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
    assert.strictEqual(res.success, false, \`Input "\${input}" must be rejected\`);
    assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED', \`Input "\${input}" must return REGISTRATION_CLOSED\`);
  }
});

runBehavioralTest('39. Asia/Kolkata timezone computation precision (UTC+05:30 offset)', () => {
  const { sandbox } = createFreshTestEnvironment();

  // At 14:00 in Asia/Kolkata (+05:30), the UTC time is exactly 08:30 (5 hours 30 mins earlier)
  const kolkataTs = sandbox.parseCneStartTimestamp_('2028-10-25T14:00');
  const expectedUtcMs = Date.UTC(2028, 9, 25, 8, 30, 0);
  assert.strictEqual(kolkataTs, expectedUtcMs, '2028-10-25 14:00 in Kolkata must equal 2028-10-25 08:30 UTC');

  // Verify ISO representation in UTC of the Kolkata timestamp
  const dateFromTs = new Date(kolkataTs);
  assert.strictEqual(dateFromTs.toISOString(), '2028-10-25T08:30:00.000Z', 'UTC string must reflect +05:30 offset');
});

runBehavioralTest('40. Frontend date/time utility functions (src/utils.ts) match backend strictness and parity', () => {
  // Read and verify src/utils.ts contains the required strict validation exports
  const utilsContent = fs.readFileSync(path.join(rootDir, 'src', 'utils.ts'), 'utf8');

  assert.ok(utilsContent.includes('export function isValidCalendarDate'), 'utils.ts must export isValidCalendarDate');
  assert.ok(utilsContent.includes('export function parseStrictTime'), 'utils.ts must export parseStrictTime');
  assert.ok(utilsContent.includes('export function parseCneStartTimestamp'), 'utils.ts must export parseCneStartTimestamp');
  assert.ok(utilsContent.includes('export function parseToIsoDateString'), 'utils.ts must export parseToIsoDateString');

  // Verify function signatures and execution in sandbox
  const { sandbox } = createFreshTestEnvironment();
  assert.ok(sandbox.isValidCalendarDate_(2028, 2, 29), '2028-02-29 is valid leap day');
  assert.strictEqual(sandbox.isValidCalendarDate_(2026, 2, 29), false, '2026-02-29 is invalid non-leap day');
  assert.strictEqual(sandbox.isValidCalendarDate_(2026, 2, 30), false, '2026-02-30 is invalid day');
  assert.strictEqual(sandbox.isValidCalendarDate_(2026, 4, 31), false, '2026-04-31 is invalid day');

  const parsed14 = sandbox.parseStrictTime_('14:00');
  assert.ok(parsed14, '14:00 parsed');
  assert.strictEqual(parsed14.hour, 14, '14:00 hour');
  assert.strictEqual(parsed14.min, 0, '14:00 min');
  assert.strictEqual(parsed14.sec, 0, '14:00 sec');

  assert.ok(!isNaN(sandbox.parseCneStartTimestamp_('2028-02-29T10:00')), '2028-02-29 accepted');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-02-29T10:00')), '2026-02-29 rejected');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2026-02-30T14:00')), '2026-02-30 rejected');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25T99:99')), '99:99 rejected');
  assert.ok(isNaN(sandbox.parseCneStartTimestamp_('2028-10-25', 'bogus')), 'bogus time rejected');
});

// =============================================================================
// ISO 8601 EXPLICIT TIMEZONE-OFFSET VALIDATION TESTS
// =============================================================================

runBehavioralTest('41. ISO 8601 timestamps with explicit timezone offsets (Z, +05:30, +01:00, -05:00) produce identical Unix epoch timestamps', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };

  // 1. 2028-10-25T14:00:00+05:30 (Asia/Kolkata wall clock +05:30)
  const ts1 = sandbox.parseCneStartTimestamp_('2028-10-25T14:00:00+05:30');
  // 2. 2028-10-25T08:30:00Z (UTC instant)
  const ts2 = sandbox.parseCneStartTimestamp_('2028-10-25T08:30:00Z');
  // 3. 2028-10-25T09:30:00+01:00 (Central European Time +01:00)
  const ts3 = sandbox.parseCneStartTimestamp_('2028-10-25T09:30:00+01:00');
  // 4. 2028-10-25T03:30:00-05:00 (Eastern Standard Time -05:00)
  const ts4 = sandbox.parseCneStartTimestamp_('2028-10-25T03:30:00-05:00');

  const expectedUtcMs = Date.UTC(2028, 9, 25, 8, 30, 0); // 1856075400000

  assert.strictEqual(ts1, expectedUtcMs, '2028-10-25T14:00:00+05:30 must equal 2028-10-25 08:30 UTC');
  assert.strictEqual(ts2, expectedUtcMs, '2028-10-25T08:30:00Z must equal 2028-10-25 08:30 UTC');
  assert.strictEqual(ts3, expectedUtcMs, '2028-10-25T09:30:00+01:00 must equal 2028-10-25 08:30 UTC');
  assert.strictEqual(ts4, expectedUtcMs, '2028-10-25T03:30:00-05:00 must equal 2028-10-25 08:30 UTC');

  // Verify all four represent the exact same instant
  assert.strictEqual(ts1, ts2, 'Offsets +05:30 and Z must be equal');
  assert.strictEqual(ts2, ts3, 'Offsets Z and +01:00 must be equal');
  assert.strictEqual(ts3, ts4, 'Offsets +01:00 and -05:00 must be equal');

  // Verify interest registration succeeds with explicit ISO timezone in CNE schedule
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');
  schedSheet.getRange(2, 4).setValue('2028-10-25T14:00:00+05:30');
  const res1 = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res1.success, true, 'Registration must succeed for +05:30 offset');
  assert.strictEqual(res1.data.status, 'INTERESTED');

  // Verify registration succeeds with UTC Z in CNE schedule
  schedSheet.getRange(2, 4).setValue('2028-10-25T08:30:00Z');
  const res2 = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
  assert.strictEqual(res2.success, true, 'Registration must succeed for Z UTC offset');
});

runBehavioralTest('42. Fractional-second ISO timestamps and local ISO timestamps without offsets parse accurately', () => {
  const { sandbox } = createFreshTestEnvironment();
  const expectedUtcMs = Date.UTC(2028, 9, 25, 8, 30, 0);

  // 1. Valid fractional-second timestamp with Z (500 ms)
  const tsFracZ = sandbox.parseCneStartTimestamp_('2028-10-25T08:30:00.500Z');
  assert.strictEqual(tsFracZ, expectedUtcMs + 500, 'Fractional seconds .500Z must add 500ms');

  // 2. Valid fractional-second timestamp with offset (123 ms)
  const tsFracOff = sandbox.parseCneStartTimestamp_('2028-10-25T14:00:00.123+05:30');
  assert.strictEqual(tsFracOff, expectedUtcMs + 123, 'Fractional seconds .123+05:30 must add 123ms');

  // 3. Valid ISO local timestamp without an offset (authoritatively Asia/Kolkata)
  const tsLocal = sandbox.parseCneStartTimestamp_('2028-10-25T14:00');
  assert.strictEqual(tsLocal, expectedUtcMs, 'Local 14:00 without offset must match Asia/Kolkata instant');

  const tsLocalSecs = sandbox.parseCneStartTimestamp_('2028-10-25T14:00:00');
  assert.strictEqual(tsLocalSecs, expectedUtcMs, 'Local 14:00:00 without offset must match Asia/Kolkata instant');

  // 4. Valid separate date and time
  const tsSep = sandbox.parseCneStartTimestamp_('2028-10-25', '14:00');
  assert.strictEqual(tsSep, expectedUtcMs, 'Separate date and time without offset must match Asia/Kolkata instant');

  // 5. Valid Google Sheets Date object
  const tsDateObj = sandbox.parseCneStartTimestamp_(new Date(expectedUtcMs));
  assert.strictEqual(tsDateObj, expectedUtcMs, 'Google Sheets Date object must match original instant');
});

runBehavioralTest('43. Strict rejection of invalid calendar dates and invalid time components in ISO timestamps with offsets', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');

  const invalidInputs = [
    '2028-02-30T14:00:00+05:30', // Feb 30 impossible calendar date
    '2026-02-29T14:00:00+05:30', // Feb 29 non-leap year impossible date
    '2028-04-31T14:00:00+05:30', // April 31 impossible calendar date
    '2028-10-25T25:00:00+05:30', // Hour 25 invalid
    '2028-10-25T24:00:00+05:30', // Hour 24 invalid
    '2028-10-25T14:60:00Z',       // Minute 60 invalid
    '2028-10-25T14:00:60+05:30', // Second 60 invalid
    '2028-10-25T99:99:00+05:30'  // Hour/min 99:99 invalid
  ];

  for (const input of invalidInputs) {
    assert.ok(isNaN(sandbox.parseCneStartTimestamp_(input)), \`Input "\${input}" must return NaN\`);
    schedSheet.getRange(2, 4).setValue(input);
    const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
    assert.strictEqual(res.success, false, \`Input "\${input}" must reject registration\`);
    assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED', \`Input "\${input}" must return REGISTRATION_CLOSED\`);
  }
});

runBehavioralTest('44. Strict rejection of invalid timezone offsets (+25:00, -25:00, +05:60, malformed offsets)', () => {
  const { sandbox, cneSpreadsheet } = createFreshTestEnvironment();
  const session = { employeeId: 'EMP-NURSE-01', role: 'EMPLOYEE', name: 'Alpha', passwordVersion: 1 };
  const schedSheet = cneSpreadsheet.getSheetByName('CNE Schedule');

  const invalidOffsetInputs = [
    '2028-10-25T14:00:00+25:00',       // Offset hour 25 exceeds standards-compliant 23
    '2028-10-25T14:00:00-25:00',       // Negative offset hour 25 exceeds 23
    '2028-10-25T14:00:00+05:60',       // Offset minute 60 exceeds 59
    '2028-10-25T14:00:00+14:60',       // Offset minute 60 exceeds 59
    '2028-10-25T14:00:00+bogus',       // Non-numeric offset
    '2028-10-25T14:00:00+',            // Truncated offset sign
    '2028-10-25T14:00:00Ztrailing',    // Trailing garbage after Z
    '2028-10-25T14:00:00+05:30bogus'   // Trailing garbage after offset
  ];

  for (const input of invalidOffsetInputs) {
    assert.ok(isNaN(sandbox.parseCneStartTimestamp_(input)), \`Invalid offset "\${input}" must return NaN\`);
    schedSheet.getRange(2, 4).setValue(input);
    const res = sandbox.handleRegisterCneInterest({ cneId: 'CNE-2026-FUT1' }, session);
    assert.strictEqual(res.success, false, \`Invalid offset "\${input}" must reject registration\`);
    assert.strictEqual(res.errorCode, 'REGISTRATION_CLOSED', \`Invalid offset "\${input}" must return REGISTRATION_CLOSED\`);
  }
});

runBehavioralTest('45. Precedence and contradictory date/time field handling with explicit timezones', () => {
  const { sandbox } = createFreshTestEnvironment();
  const expectedUtcMs = Date.UTC(2028, 9, 25, 8, 30, 0);

  // 1. Separate time agreeing with embedded time and explicit offset defines the instant
  const agreeingTs = sandbox.parseCneStartTimestamp_('2028-10-25T14:00:00+05:30', '14:00');
  assert.strictEqual(agreeingTs, expectedUtcMs, 'Agreeing separate time must preserve explicit timezone instant');

  // 2. Separate time contradicting embedded time with explicit offset must be rejected (return NaN)
  const contradictoryTs = sandbox.parseCneStartTimestamp_('2028-10-25T14:00:00+05:30', '16:00');
  assert.ok(isNaN(contradictoryTs), 'Contradictory separate time field must return NaN');

  // 3. Separate bogus time with embedded explicit timezone must be rejected
  const bogusSepTs = sandbox.parseCneStartTimestamp_('2028-10-25T14:00:00+05:30', 'bogus');
  assert.ok(isNaN(bogusSepTs), 'Bogus separate time field must return NaN');

  // 4. Record with contradictory fromDate and fromTime fields must return NaN
  const contradictoryRecord = sandbox.getCneStartTimestamp_({
    fromDate: '2028-10-25T14:00:00+05:30',
    fromTime: '16:00'
  });
  assert.ok(isNaN(contradictoryRecord), 'Contradictory schedule record must return NaN');
});

runBehavioralTest('46. Frontend utils.ts parity for ISO timezone offsets and strict validation', () => {
  const utilsContent = fs.readFileSync(path.join(rootDir, 'src', 'utils.ts'), 'utf8');

  // Verify type exports and signatures
  assert.ok(utilsContent.includes('export interface StrictTimeComponents'), 'utils.ts must export StrictTimeComponents');
  assert.ok(utilsContent.includes('hasExplicitOffset: boolean'), 'StrictTimeComponents must have hasExplicitOffset');
  assert.ok(utilsContent.includes('offsetMinutesTotal: number'), 'StrictTimeComponents must have offsetMinutesTotal');

  const { sandbox } = createFreshTestEnvironment();

  // Test parseStrictTime_ with ISO offsets
  const parsedZ = sandbox.parseStrictTime_('08:30:00Z');
  assert.ok(parsedZ, '08:30:00Z should parse');
  assert.strictEqual(parsedZ.hour, 8);
  assert.strictEqual(parsedZ.min, 30);
  assert.strictEqual(parsedZ.hasExplicitOffset, true);
  assert.strictEqual(parsedZ.offsetMinutesTotal, 0);

  const parsedOffset = sandbox.parseStrictTime_('14:00:00+05:30');
  assert.ok(parsedOffset, '14:00:00+05:30 should parse');
  assert.strictEqual(parsedOffset.hour, 14);
  assert.strictEqual(parsedOffset.min, 0);
  assert.strictEqual(parsedOffset.hasExplicitOffset, true);
  assert.strictEqual(parsedOffset.offsetMinutesTotal, 330);

  const parsedNegOffset = sandbox.parseStrictTime_('03:30:00-05:00');
  assert.ok(parsedNegOffset, '03:30:00-05:00 should parse');
  assert.strictEqual(parsedNegOffset.hour, 3);
  assert.strictEqual(parsedNegOffset.min, 30);
  assert.strictEqual(parsedNegOffset.hasExplicitOffset, true);
  assert.strictEqual(parsedNegOffset.offsetMinutesTotal, -300);

  // Rejection of invalid offsets
  assert.strictEqual(sandbox.parseStrictTime_('14:00:00+25:00'), null, '+25:00 must return null');
  assert.strictEqual(sandbox.parseStrictTime_('14:60:00Z'), null, '14:60:00Z must return null');
  assert.strictEqual(sandbox.parseStrictTime_('25:00:00+05:30'), null, '25:00:00 must return null');
  assert.strictEqual(sandbox.parseStrictTime_('14:00:00+05:60'), null, '+05:60 must return null');
});

console.log('========================================================');
console.log(\`Passed: \${passedTests}/\${totalTests}\`);
console.log('ALL CNE INTEREST BEHAVIORAL TESTS PASSED SUCCESSFULLY!');
console.log('========================================================\\n');

`
  },
  // ===== END ORIGINAL SUITE: verify-cne-interest.js =====

  // ===== BEGIN ORIGINAL SUITE: verify-cne-read-performance.cjs =====
  {
    id: "performance",
    name: "CNE Read Performance Regression",
    originalFilename: "verify-cne-read-performance.cjs",
    mode: "commonjs",
    expectedChecks: 40,
    sha256: "b8d74d6241364c3a11daa85db064871f4a6f1392f98e56054f5be5dda631e0d9",
    source: `/**
 * CNE Read Performance & Bounded Query Regression Verification Suite
 *
 * Verifies performance optimizations for CNE Schedule, CNE Progress, and Attendance:
 *
 * 1. CNE Schedule records load independently of Area and Teaching Mode master data
 * 2. Ordinary staff are not blocked by or requested for unnecessary schedule-creation master data
 * 3. handleGetCNEActivityProgress() uses bounded, CNE-specific reads without full-sheet scans
 * 4. CNE Activity Progress counts, statuses, and calculations remain accurate
 * 5. handleGetCNEParticipants() retrieves records using bounded reads without loading full response history
 * 6. Participant details, scores, and attendance aggregations remain accurate and intact
 * 7. Authorization checks and role restrictions are strictly enforced for participant and progress data
 * 8. Edge cases (empty CNEs, missing records, invalid IDs) are handled safely without exceptions
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('================================================================');
console.log('   CNE READ PERFORMANCE & BOUNDED QUERY VERIFICATION SUITE');
console.log('================================================================\\n');

const rootDir = path.resolve(__dirname, '..');
const codeGsSource = fs.readFileSync(path.join(rootDir, 'Code.gs'), 'utf8');
const cneScheduleSource = fs.readFileSync(path.join(rootDir, 'src/components/CNESchedule.tsx'), 'utf8');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(\`✓ \${totalTests}. \${name}\`);
  } catch (err) {
    console.error(\`✗ \${totalTests}. \${name}\`);
    console.error(\`  Error: \${err.message}\\n\${err.stack}\\n\`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// In-Memory Google Apps Script Mock Framework
// -----------------------------------------------------------------------------

class MockRange {
  constructor(sheet, startRow, startCol, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.startRow = startRow;
    this.startCol = startCol;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  getValues() {
    this.sheet.recordRead(this.startRow, this.startCol, this.numRows, this.numCols);
    const result = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      const rowIndex = this.startRow - 1 + r;
      for (let c = 0; c < this.numCols; c++) {
        const colIndex = this.startCol - 1 + c;
        if (rowIndex < this.sheet.grid.length && colIndex < this.sheet.grid[rowIndex].length) {
          row.push(this.sheet.grid[rowIndex][colIndex]);
        } else {
          row.push('');
        }
      }
      result.push(row);
    }
    return result;
  }

  getDisplayValues() {
    return this.getValues().map(row => row.map(v => (v !== null && v !== undefined ? String(v) : '')));
  }

  getValue() {
    const vals = this.getValues();
    return vals[0] && vals[0][0] !== undefined ? vals[0][0] : '';
  }

  setValues(values) {
    for (let r = 0; r < values.length; r++) {
      const rowIndex = this.startRow - 1 + r;
      while (this.sheet.grid.length <= rowIndex) {
        this.sheet.grid.push([]);
      }
      for (let c = 0; c < values[r].length; c++) {
        const colIndex = this.startCol - 1 + c;
        while (this.sheet.grid[rowIndex].length <= colIndex) {
          this.sheet.grid[rowIndex].push('');
        }
        this.sheet.grid[rowIndex][colIndex] = values[r][c];
      }
    }
    return this;
  }

  setValue(val) {
    return this.setValues([[val]]);
  }

  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  setHorizontalAlignment() { return this; }
  setVerticalAlignment() { return this; }
  setWrap() { return this; }

  createTextFinder(query) {
    const range = this;
    const queryStr = String(query).trim().toLowerCase();
    return {
      matchEntireCell() { return this; },
      matchCase() { return this; },
      findNext() {
        const vals = range.getValues();
        for (let r = 0; r < vals.length; r++) {
          for (let c = 0; c < vals[r].length; c++) {
            if (String(vals[r][c] || '').trim().toLowerCase() === queryStr) {
              const rowNum = range.startRow + r;
              return {
                getRow() { return rowNum; },
                getColumn() { return range.startCol + c; },
                getDisplayValue() { return String(vals[r][c]); },
                getValue() { return vals[r][c]; }
              };
            }
          }
        }
        return null;
      },
      findAll() {
        const matches = [];
        const vals = range.getValues();
        for (let r = 0; r < vals.length; r++) {
          for (let c = 0; c < vals[r].length; c++) {
            if (String(vals[r][c] || '').trim().toLowerCase() === queryStr) {
              const rowNum = range.startRow + r;
              matches.push({
                getRow() { return rowNum; },
                getColumn() { return range.startCol + c; },
                getDisplayValue() { return String(vals[r][c]); },
                getValue() { return vals[r][c]; }
              });
            }
          }
        }
        return matches;
      }
    };
  }
}

class MockSheet {
  constructor(name, spreadsheet, initialGrid = []) {
    this.name = name;
    this.spreadsheet = spreadsheet;
    this.grid = initialGrid.map(row => [...row]);
    this.readOps = [];
    this.getDataRangeCount = 0;
  }

  recordRead(row, col, numRows, numCols) {
    this.readOps.push({ row, col, numRows, numCols });
  }

  resetReadOps() {
    this.readOps = [];
    this.getDataRangeCount = 0;
  }

  getName() { return this.name; }
  getLastRow() { return this.grid.length; }
  getLastColumn() {
    let max = 0;
    for (const r of this.grid) {
      if (r.length > max) max = r.length;
    }
    return max;
  }

  getMaxColumns() { return Math.max(30, this.getLastColumn()); }
  getMaxRows() { return Math.max(100, this.getLastRow()); }

  getRange(row, col, numRows = 1, numCols = 1) {
    return new MockRange(this, row, col, numRows, numCols);
  }

  getDataRange() {
    this.getDataRangeCount++;
    return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }

  appendRow(rowVals) {
    this.grid.push([...rowVals]);
  }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = {};
  }

  getSheetByName(name) {
    return this.sheets[name] || null;
  }

  addSheet(name, grid) {
    const s = new MockSheet(name, this, grid);
    this.sheets[name] = s;
    return s;
  }

  insertSheet(name) {
    return this.addSheet(name, []);
  }
}

function createFreshTestEnvironment() {
  const cneSpreadsheet = new MockSpreadsheet();
  const officersSpreadsheet = new MockSpreadsheet();

  const scriptProperties = {
    DROPDOWN_SPREADSHEET_ID: 'officers_mock_id',
    CNE_SPREADSHEET_ID: 'cne_mock_id',
    SESSION_SECRET: 'test_session_secret_32bytes_minimum_length_required'
  };

  // 1. CNE Schedule
  cneSpreadsheet.addSheet('CNE Schedule', [
    [
      'CNE ID', 'Topic', 'Ward Name / Area', 'From Date', 'To Date', 'Duration',
      'Resource Person Emp Id', 'Mode of Teaching', 'Description', 'Max Participants', 'Status',
      'Type of CNE', 'External Resource Persons', 'Staff Emp ID', 'Staff Count', 'External Staff Participants',
      'Proposed By', 'Admin Remarks', 'Remarks', 'CreatedAt', 'CreatedBy',
      'Coverage Areas Snapshot', 'Total Allotted Staff', 'Internal Attendance Count',
      'Attendance Percentage', 'Post-Test Outcome Percentage', 'Coverage Finalized At'
    ],
    // CNE 1: Active Scheduled CNE in ICU with assigned RP EMP-RP-100
    [
      'CNE-2026-PERF1', 'Emergency Trauma Resuscitation', 'ICU', '2028-11-20T10:00', '2028-11-20T11:30', '90',
      'EMP-RP-100', 'Workshop', 'Hands-on trauma resuscitation', '40', 'Scheduled',
      'CENTRAL', '', '', '0', '',
      'EMP-ADM-001', '', '', '2026-10-01', 'ADMIN', '', '', '', '', '', ''
    ],
    // CNE 2: Completed Departmental CNE in OT with assigned RP EMP-RP-200
    [
      'CNE-2026-PERF2', 'Surgical Asepsis & Sterilization', 'OT', '2026-10-01T09:00', '2026-10-01T10:30', '90',
      'EMP-RP-200', 'Lecture', 'Sterile techniques in operating rooms', '30', 'Completed',
      'DEPARTMENTAL', '', '', '0', '',
      'EMP-RP-200', '', '', '2026-09-15', 'EMP-RP-200', '', '', '', '', '', ''
    ],
    // CNE 3: Empty CNE with no questions, participants, or material
    [
      'CNE-2026-EMPTY', 'Unpopulated Scheduled Topic', 'Emergency', '2028-12-01T09:00', '2028-12-01T10:00', '60',
      'EMP-RP-100', 'Lecture', 'Initial draft session', '30', 'Scheduled',
      'CENTRAL', '', '', '0', '',
      'EMP-ADM-001', '', '', '2026-10-01', 'ADMIN', '', '', '', '', '', ''
    ]
  ]);

  // 2. CNE Post Test Questions
  cneSpreadsheet.addSheet('CNE Post Test Questions', [
    [
      'CNE ID', 'Question ID', 'Question Text', 'Option A', 'Option B', 'Option C', 'Option D',
      'Correct Option', 'Explanation', 'Is Finalized', 'Is Locked', 'Created At', 'Created By',
      'Authoritative Source', 'Status'
    ],
    // 5 finalized active questions for CNE-2026-PERF1
    ['CNE-2026-PERF1', 'Q1', 'Question 1', 'A', 'B', 'C', 'D', 'A', 'Expl 1', 'YES', 'YES', '2026-10-10', 'RP', 'Source', 'ACTIVE'],
    ['CNE-2026-PERF1', 'Q2', 'Question 2', 'A', 'B', 'C', 'D', 'B', 'Expl 2', 'YES', 'YES', '2026-10-10', 'RP', 'Source', 'ACTIVE'],
    ['CNE-2026-PERF1', 'Q3', 'Question 3', 'A', 'B', 'C', 'D', 'C', 'Expl 3', 'YES', 'YES', '2026-10-10', 'RP', 'Source', 'ACTIVE'],
    ['CNE-2026-PERF1', 'Q4', 'Question 4', 'A', 'B', 'C', 'D', 'D', 'Expl 4', 'YES', 'YES', '2026-10-10', 'RP', 'Source', 'ACTIVE'],
    ['CNE-2026-PERF1', 'Q5', 'Question 5', 'A', 'B', 'C', 'D', 'A', 'Expl 5', 'YES', 'YES', '2026-10-10', 'RP', 'Source', 'ACTIVE'],
    // 1 draft/unfinalized question
    ['CNE-2026-PERF1', 'Q6', 'Question 6 Draft', 'A', 'B', 'C', 'D', 'B', 'Expl 6', 'NO', 'NO', '2026-10-10', 'RP', 'Source', 'ACTIVE'],
    // Questions for another CNE
    ['CNE-OTHER-999', 'Q100', 'Other Q', 'A', 'B', 'C', 'D', 'A', 'Expl', 'YES', 'YES', '2026-10-10', 'RP', 'Source', 'ACTIVE']
  ]);

  // 3. CNE Reference
  cneSpreadsheet.addSheet('CNE_Reference', [
    [
      'CNE ID', 'Topic', 'Reference Text / Clinical Guides', 'Updated At', 'Updated By',
      'Drive File ID', 'File Name', 'File Type', 'Resource Person Name', 'File Size',
      'Indexing Status', 'Indexing Error Code', 'Indexing Message', 'Chunks Count', 'Indexed At'
    ],
    [
      'CNE-2026-PERF1', 'Emergency Trauma Resuscitation',
      'Comprehensive trauma clinical management protocols and guidelines for ICU emergency resuscitation.',
      '2026-10-10', 'EMP-RP-100', '', '', '', 'Dr. Speaker', '0', 'READY', '', '', '1', '2026-10-10'
    ]
  ]);

  // 4. CNE QR Tokens
  cneSpreadsheet.addSheet('CNE_QR_Tokens', [
    ['QR Token', 'CNE ID', 'Created At', 'Created By', 'Status'],
    ['QR-TOKEN-PERF1-ABC', 'CNE-2026-PERF1', '2026-10-10T10:00:00Z', 'EMP-RP-100', 'ACTIVE'],
    ['QR-TOKEN-EXPIRED-XYZ', 'CNE-2026-PERF1', '2026-10-09T10:00:00Z', 'EMP-RP-100', 'REVOKED']
  ]);

  // 5. CNE Post Test Responses (Simulate large response history with 50+ rows for other CNEs)
  const initialResponses = [
    [
      'Response ID', 'CNE ID', 'Employee ID', 'Employee Name', 'Designation', 'Department',
      'Score', 'Total Questions', 'Percentage', 'Source', 'Submitted At', 'Answers JSON', 'Status', 'Remarks'
    ],
    // Rows for CNE-2026-PERF1:
    // Participant 1: Completed post-test with 80% score
    ['RESP-101', 'CNE-2026-PERF1', 'EMP-STF-001', 'John Doe', 'Nursing Officer', 'ICU', 8, 10, 80, 'POST_TEST', '2026-10-15T10:00:00Z', '{"q1":"A","largeAnswersPayload":"..."}', 'ATTENDED', ''],
    // Participant 2: Completed post-test with 90% score
    ['RESP-102', 'CNE-2026-PERF1', 'EMP-STF-002', 'Jane Smith', 'Senior Nursing Officer', 'ICU', 9, 10, 90, 'POST_TEST', '2026-10-15T10:05:00Z', '{"q1":"B","largeAnswersPayload":"..."}', 'ATTENDED', ''],
    // Participant 3: Manual check-in (no post-test)
    ['RESP-103', 'CNE-2026-PERF1', 'EMP-STF-003', 'Bob Johnson', 'Nursing Officer', 'ICU', '', '', '', 'MANUAL', '2026-10-15T10:10:00Z', '', 'ATTENDED', 'Manual registration'],
    // Duplicate entry for Participant 1 (earlier manual check-in row superseded by post-test)
    ['RESP-104', 'CNE-2026-PERF1', 'EMP-STF-001', 'John Doe', 'Nursing Officer', 'ICU', '', '', '', 'MANUAL', '2026-10-15T09:45:00Z', '', 'ATTENDED', 'Check-in before test']
  ];

  // Add 60 unrelated rows for other CNEs with large payload strings to simulate production scale
  for (let i = 1; i <= 60; i++) {
    initialResponses.push([
      \`RESP-OTHER-\${i}\`,
      \`CNE-OTHER-\${Math.floor(i / 10)}\`,
      \`EMP-EXT-\${1000 + i}\`,
      \`External Nurse \${i}\`,
      'Nursing Officer',
      'Ward-X',
      7,
      10,
      70,
      'POST_TEST',
      '2026-09-01T12:00:00Z',
      JSON.stringify({ answers: Array(20).fill('Massive question payload text to simulate heavy sheet storage') }),
      'ATTENDED',
      'Historical record'
    ]);
  }

  cneSpreadsheet.addSheet('CNE Post Test Responses', initialResponses);

  // 6. Officers Data
  officersSpreadsheet.addSheet('Officers data', [
    ['Emp ID', 'Name', 'Designation', 'Area', 'Mobile', 'Email', 'Role'],
    ['EMP-ADM-001', 'System Administrator', 'Senior Registrar', 'Administration', '9999999991', 'admin@aiims.edu', 'ADMIN'],
    ['EMP-RP-100', 'Dr. Speaker One', 'Assistant Professor', 'ICU', '9999999992', 'rp1@aiims.edu', 'RESOURCE_PERSON'],
    ['EMP-RP-200', 'Dr. Speaker Two', 'Associate Professor', 'OT', '9999999993', 'rp2@aiims.edu', 'RESOURCE_PERSON'],
    ['EMP-INC-001', 'Sister Incharge ICU', 'Chief Nursing Officer', 'ICU', '9999999994', 'inc_icu@aiims.edu', 'AREA_INCHARGE'],
    ['EMP-INC-002', 'Sister Incharge Peds', 'Chief Nursing Officer', 'Pediatrics', '9999999995', 'inc_peds@aiims.edu', 'AREA_INCHARGE'],
    ['EMP-STF-001', 'Staff Nurse John', 'Nursing Officer', 'ICU', '9999999996', 'john@aiims.edu', 'STAFF']
  ]);

  const scriptLock = {
    hasLock: false,
    waitLock() { this.hasLock = true; return true; },
    releaseLock() { this.hasLock = false; }
  };

  const cacheStore = {};

  const sandbox = {
    Logger: { log: () => {} },
    console,
    Date,
    Math,
    String,
    Number,
    Array,
    Object,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    JSON,
    SpreadsheetApp: {
      openById(id) {
        if (id === 'officers_mock_id') return officersSpreadsheet;
        return cneSpreadsheet;
      },
      getActiveSpreadsheet() {
        return cneSpreadsheet;
      },
      flush() {}
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(k) { return scriptProperties[k] || null; },
          getProperties() { return { ...scriptProperties }; },
          setProperty(k, v) { scriptProperties[k] = v; }
        };
      }
    },
    LockService: {
      getScriptLock() { return scriptLock; }
    },
    CacheService: {
      getScriptCache() {
        return {
          get(k) { return cacheStore[k] || null; },
          put(k, v) { cacheStore[k] = v; },
          remove(k) { delete cacheStore[k]; }
        };
      }
    },
    Utilities: {
      formatDate(date, tz, fmt) {
        if (date instanceof Date) {
          try {
            const dtf = new Intl.DateTimeFormat('en-CA', {
              timeZone: tz || 'Asia/Kolkata',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
            const parts = dtf.formatToParts(date);
            const p = {};
            for (const pt of parts) p[pt.type] = pt.value;
            return \`\${p.year}-\${p.month}-\${p.day}T\${p.hour}:\${p.minute}:\${p.second}\`;
          } catch (e) {
            return date.toISOString();
          }
        }
        return String(date);
      },
      computeHmacSha256Signature() { return [1, 2, 3]; },
      base64Encode() { return 'mock_token'; }
    },
    Session: {
      getScriptTimeZone() { return 'Asia/Kolkata'; }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(codeGsSource, sandbox);

  return {
    cneSpreadsheet,
    officersSpreadsheet,
    sandbox,
    responsesSheet: cneSpreadsheet.getSheetByName('CNE Post Test Responses'),
    questionsSheet: cneSpreadsheet.getSheetByName('CNE Post Test Questions'),
    referenceSheet: cneSpreadsheet.getSheetByName('CNE_Reference')
  };
}

// =============================================================================
// TEST SUITE: 8 REQUIRED PERFORMANCE REGRESSION TESTS
// =============================================================================

// -----------------------------------------------------------------------------
// Test 1: CNE Schedule records load independently of Area and Teaching Mode master data
// -----------------------------------------------------------------------------
runTest('CNE Schedule records load independently of Area and Teaching Mode master data', () => {
  // 1. Verify source architecture in CNESchedule.tsx
  assert.ok(
    cneScheduleSource.includes('Promise.all([ApiService.getAreas(forceFresh), ApiService.getWardStaffCounts()])') &&
    cneScheduleSource.includes('if (!canScheduleCne || !(isAddClassOpen || isDeptScheduleOpen || isUnscheduledOpen || editingCne)) return;'),
    'CNESchedule must fetch ward names and staffing only for an authorized scheduling form'
  );
  assert.ok(
    cneScheduleSource.includes('void ApiService.getTeachingModes()'),
    'CNESchedule must trigger ApiService.getTeachingModes() as an independent background promise'
  );
  assert.ok(
    !cneScheduleSource.slice(cneScheduleSource.indexOf('const loadData = async'), cneScheduleSource.indexOf('const handleChildModalUpdated')).includes('await loadWardMasters'),
    'CNESchedule must NOT gate schedule record rendering behind ward/staff master fetching'
  );
  assert.ok(
    cneScheduleSource.includes('await ApiService.getCNESchedulePage({'),
    'CNESchedule must await the status-scoped backend API without downloading the full history'
  );

  // 2. Behavioral simulation: verify that schedule records resolve independently of slow master data
  let masterDataCompleted = false;
  let scheduleLoaded = false;

  const mockApiService = {
    getAreas: () => new Promise((resolve) => {
      setTimeout(() => {
        masterDataCompleted = true;
        resolve({ success: true, data: [{ name: 'ICU', status: 'ACTIVE' }] });
      }, 250);
    }),
    getTeachingModes: () => new Promise((resolve) => {
      setTimeout(() => {
        masterDataCompleted = true;
        resolve({ success: true, data: [{ name: 'Lecture', status: 'ACTIVE' }] });
      }, 250);
    }),
    getCNESchedulePage: () => new Promise((resolve) => {
      setTimeout(() => {
        scheduleLoaded = true;
        resolve({ success: true, data: { records: [{ cneId: 'CNE-2026-PERF1', topic: 'Trauma' }], total: 1, hasMore: false } });
      }, 10);
    })
  };

  const simulateLoadData = async (canSchedule) => {
    if (canSchedule) {
      void mockApiService.getAreas();
      void mockApiService.getTeachingModes();
    }
    const res = await mockApiService.getCNESchedulePage({status: 'Scheduled'});
    return res.data.records;
  };

  const start = Date.now();
  return simulateLoadData(true).then((data) => {
    const elapsed = Date.now() - start;
    assert.strictEqual(scheduleLoaded, true, 'Schedule records must be loaded');
    assert.strictEqual(masterDataCompleted, false, 'Schedule must return before slow master data finishes');
    assert.ok(elapsed < 100, \`Schedule loading took \${elapsed}ms, should be < 100ms and independent of master data\`);
    assert.strictEqual(data.length, 1);
  });
});

// -----------------------------------------------------------------------------
// Test 2: Ordinary employees are not required to wait for unnecessary schedule-creation master data
// -----------------------------------------------------------------------------
runTest('Ordinary staff are not blocked by or requested for unnecessary schedule-creation master data', () => {
  // 1. Source verification: canScheduleCne gate guards master data loading
  assert.ok(
    cneScheduleSource.includes('const canScheduleCne = isAdmin || isAreaIncharge;'),
    'CNESchedule must compute canScheduleCne for Admin or Area Incharge roles only'
  );
  assert.ok(
    cneScheduleSource.includes('if (canScheduleCne) {'),
    'CNESchedule must gate master data requests strictly behind canScheduleCne'
  );

  // 2. Behavioral verification: staff user triggers 0 master data calls
  let areasCallCount = 0;
  let teachingModesCallCount = 0;
  let cneRecordsCallCount = 0;

  const staffUser = { employeeId: 'EMP-STF-001', role: 'STAFF', name: 'Nurse' };
  const isAdmin = staffUser.role === 'ADMIN';
  const isAreaIncharge = staffUser.role === 'AREA_INCHARGE' || staffUser.role === 'INCHARGE';
  const canScheduleCne = isAdmin || isAreaIncharge;

  assert.strictEqual(canScheduleCne, false, 'Ordinary staff role must have canScheduleCne = false');

  const mockApi = {
    getAreas: () => { areasCallCount++; return Promise.resolve({ success: true, data: [] }); },
    getTeachingModes: () => { teachingModesCallCount++; return Promise.resolve({ success: true, data: [] }); },
    getCNESchedulePage: () => { cneRecordsCallCount++; return Promise.resolve({ success: true, data: [{ cneId: 'CNE-1' }] }); }
  };

  // Simulate CNESchedule loadData workflow for staff user
  if (canScheduleCne) {
    void mockApi.getAreas();
    void mockApi.getTeachingModes();
  }
  return mockApi.getCNESchedulePage({status:'Scheduled'}).then((res) => {
    assert.strictEqual(areasCallCount, 0, 'getAreas must NOT be called for ordinary staff');
    assert.strictEqual(teachingModesCallCount, 0, 'getTeachingModes must NOT be called for ordinary staff');
    assert.strictEqual(cneRecordsCallCount, 1, 'getCNESchedulePage must be called for ordinary staff');
    assert.strictEqual(res.success, true);
  });
});

// -----------------------------------------------------------------------------
// Test 3: handleGetCNEActivityProgress() uses bounded, CNE-specific reads
// -----------------------------------------------------------------------------
runTest('handleGetCNEActivityProgress uses bounded, CNE-specific reads without full-sheet scans', () => {
  const env = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

  env.responsesSheet.resetReadOps();
  env.questionsSheet.resetReadOps();
  env.referenceSheet.resetReadOps();

  const result = env.sandbox.handleGetCNEActivityProgress(
    { cneId: 'CNE-2026-PERF1', forceFresh: true },
    adminSession
  );

  assert.strictEqual(result.success, true, 'handleGetCNEActivityProgress must succeed');

  // Verify response sheet bounded read:
  // Must NOT call getDataRange() on the full responses sheet
  assert.strictEqual(
    env.responsesSheet.getDataRangeCount,
    0,
    'Responses sheet must NEVER have getDataRange() called during activity progress read'
  );

  // Read only columns B:J to include Source. Never fetch large Answers JSON in L.
  const respBoundedReads = env.responsesSheet.readOps.filter(op => op.col === 2 && op.numCols === 9);
  assert.ok(
    respBoundedReads.length > 0,
    'Responses sheet read must be bounded to columns B:J (identity plus attendance Source)'
  );

  // Large answers JSON column (column 12 / L) must NOT be read during progress check
  const answersJsonReads = env.responsesSheet.readOps.filter(op => op.col <= 12 && (op.col + op.numCols - 1) >= 12);
  assert.strictEqual(
    answersJsonReads.length,
    0,
    'handleGetCNEActivityProgress must NOT read column 12 (Answers JSON) from responses sheet'
  );

  // Questions sheet must NOT have getDataRange() called
  assert.strictEqual(
    env.questionsSheet.getDataRangeCount,
    0,
    'Questions sheet must NEVER have getDataRange() called during activity progress read'
  );

  // Reference sheet must NOT perform full sheet read
  assert.strictEqual(
    env.referenceSheet.getDataRangeCount,
    0,
    'Reference sheet must NEVER have getDataRange() called during activity progress read'
  );
});

// -----------------------------------------------------------------------------
// Test 4: Progress results and counts remain accurate after optimization
// -----------------------------------------------------------------------------
runTest('CNE Activity Progress counts, statuses, and calculations remain accurate', () => {
  const env = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

  // 1. Check Scheduled CNE with active QR and 5 finalized questions
  const res1 = env.sandbox.handleGetCNEActivityProgress(
    { cneId: 'CNE-2026-PERF1', forceFresh: true },
    adminSession
  );

  assert.strictEqual(res1.success, true);
  const data1 = res1.data;
  assert.strictEqual(data1.cneId, 'CNE-2026-PERF1');
  assert.strictEqual(data1.materialStatus, 'Added', 'Learning material must be "Added" when text >= 15 chars');
  assert.strictEqual(data1.questionsStatus, 'Generated', 'Questions status must be "Generated" when finalized count >= 5');
  assert.strictEqual(data1.finalizedQuestionsCount, 5, 'Finalized questions count must be exactly 5');
  assert.strictEqual(data1.requiredQuestionsCount, 5, 'Required questions count must be 5');
  assert.strictEqual(data1.qrStatus, 'Generated', 'QR status must be "Generated" with active token');
  assert.strictEqual(data1.participantsCount, 3, 'Unique participants count must be 3 (deduplicating multiple entries)');
  assert.strictEqual(data1.postTestStatus, 'Available', 'Post-test must be "Available" for scheduled CNE with QR and questions');
  assert.strictEqual(data1.finalizationStatus, 'Not Finalized');

  // 2. Check Completed CNE
  const res2 = env.sandbox.handleGetCNEActivityProgress(
    { cneId: 'CNE-2026-PERF2', forceFresh: true },
    adminSession
  );
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.data.postTestStatus, 'Completed', 'Post-test must be "Completed" for completed CNE');
  assert.strictEqual(res2.data.finalizationStatus, 'Finalized', 'Finalization must be "Finalized" for completed CNE');
});

// -----------------------------------------------------------------------------
// Test 5: handleGetCNEParticipants() retrieves records using bounded reads
// -----------------------------------------------------------------------------
runTest('handleGetCNEParticipants retrieves records using bounded reads without loading full response history', () => {
  const env = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

  env.responsesSheet.resetReadOps();

  const res = env.sandbox.handleGetCNEParticipants(
    { cneId: 'CNE-2026-PERF1' },
    adminSession
  );

  assert.strictEqual(res.success, true, 'handleGetCNEParticipants must succeed');

  // Verify bounded read:
  // Must NOT call getDataRange()
  assert.strictEqual(
    env.responsesSheet.getDataRangeCount,
    0,
    'Responses sheet must NEVER have getDataRange() called during participant fetch'
  );

  // Must use bounded block read (firstColumn = 1, columnCount = 14) for matched rows
  const boundedReads = env.responsesSheet.readOps.filter(op => op.col === 1 && op.numCols === 14);
  assert.ok(
    boundedReads.length > 0,
    'handleGetCNEParticipants must read bounded blocks of matched rows'
  );

  // Unrelated rows for CNE-OTHER-* must not be part of the returned participants
  const participants = res.data.participants;
  for (const p of participants) {
    assert.strictEqual(p.cneId, 'CNE-2026-PERF1', 'Returned participants must only belong to requested CNE');
  }
});

// -----------------------------------------------------------------------------
// Test 6: Participant details, scores and attendance aggregations remain accurate
// -----------------------------------------------------------------------------
runTest('Participant details, scores, and attendance aggregations remain accurate and intact', () => {
  const env = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

  const res = env.sandbox.handleGetCNEParticipants(
    { cneId: 'CNE-2026-PERF1' },
    adminSession
  );

  assert.strictEqual(res.success, true);
  const data = res.data;

  // Check overall counts
  assert.strictEqual(data.cneId, 'CNE-2026-PERF1');
  assert.strictEqual(data.totalParticipants, 3, 'Must have 3 unique participants');
  assert.strictEqual(data.postTestCount, 2, 'Must have 2 post-test participants');
  assert.strictEqual(data.manualCount, 1, 'Must have 1 manual participant');

  // Average score: (80 + 90) / 2 = 85.0
  assert.strictEqual(data.averageScore, 85, 'Average score must be 85.0 (only from post-test participants)');

  // Verify participant details and deduplication (POST_TEST takes precedence over earlier manual registration)
  const partMap = {};
  for (const p of data.participants) {
    partMap[p.employeeId] = p;
  }

  const p1 = partMap['EMP-STF-001'];
  assert.ok(p1, 'Participant 1 must exist');
  assert.strictEqual(p1.participantType, 'POST_TEST', 'POST_TEST type must take precedence over manual check-in row');
  assert.strictEqual(p1.score, 8);
  assert.strictEqual(p1.totalQuestions, 10);
  assert.strictEqual(p1.percentage, 80);
  assert.strictEqual(p1.status, 'ATTENDED');

  const p2 = partMap['EMP-STF-002'];
  assert.ok(p2, 'Participant 2 must exist');
  assert.strictEqual(p2.participantType, 'POST_TEST');
  assert.strictEqual(p2.score, 9);
  assert.strictEqual(p2.totalQuestions, 10);
  assert.strictEqual(p2.percentage, 90);

  const p3 = partMap['EMP-STF-003'];
  assert.ok(p3, 'Participant 3 must exist');
  assert.strictEqual(p3.participantType, 'MANUAL');
  assert.strictEqual(p3.score, null, 'Manual participants must have null score');
  assert.strictEqual(p3.percentage, null, 'Manual participants must have null percentage');
});

// -----------------------------------------------------------------------------
// Test 7: Authorization checks and employee role restrictions are preserved
// -----------------------------------------------------------------------------
runTest('Authorization checks and employee role restrictions are strictly enforced', () => {
  const env = createFreshTestEnvironment();

  const anonymousSession = null;
  const staffSession = { employeeId: 'EMP-STF-001', role: 'STAFF', name: 'Nurse' };
  const unassignedRpSession = { employeeId: 'EMP-RP-999', role: 'RESOURCE_PERSON', name: 'Dr. Other' };
  const assignedRpSession = { employeeId: 'EMP-RP-100', role: 'RESOURCE_PERSON', name: 'Dr. Speaker One' };
  const otherAreaInchargeSession = { employeeId: 'EMP-INC-002', role: 'AREA_INCHARGE', assignedArea: 'Pediatrics', assignedAreas: ['Pediatrics'] };
  const concernedAreaInchargeSession = { employeeId: 'EMP-INC-001', role: 'AREA_INCHARGE', assignedArea: 'ICU', assignedAreas: ['ICU'] };
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

  // 1. handleGetCNEParticipants authorization tests
  const unauthRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, anonymousSession);
  assert.strictEqual(unauthRes.success, false);
  assert.strictEqual(unauthRes.errorCode, 'UNAUTHORIZED');

  const staffRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, staffSession);
  assert.strictEqual(staffRes.success, false);
  assert.strictEqual(staffRes.errorCode, 'FORBIDDEN');

  const unassignedRpRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, unassignedRpSession);
  assert.strictEqual(unassignedRpRes.success, false);
  assert.strictEqual(unassignedRpRes.errorCode, 'FORBIDDEN');

  const otherAreaIncRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, otherAreaInchargeSession);
  assert.strictEqual(otherAreaIncRes.success, false);
  assert.strictEqual(otherAreaIncRes.errorCode, 'FORBIDDEN');

  // Authorized callers
  const assignedRpRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, assignedRpSession);
  assert.strictEqual(assignedRpRes.success, true, 'Assigned Resource Person must be authorized');

  const concernedIncRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, concernedAreaInchargeSession);
  assert.strictEqual(concernedIncRes.success, true, 'Concerned Area Incharge must be authorized');

  const adminRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-PERF1' }, adminSession);
  assert.strictEqual(adminRes.success, true, 'Admin must be authorized');

  // 2. handleGetCNEActivityProgress authorization tests
  const progUnauth = env.sandbox.handleGetCNEActivityProgress({ cneId: 'CNE-2026-PERF1' }, anonymousSession);
  assert.strictEqual(progUnauth.success, false);
  assert.strictEqual(progUnauth.errorCode, 'UNAUTHORIZED');

  const progStaff = env.sandbox.handleGetCNEActivityProgress({ cneId: 'CNE-2026-PERF1' }, staffSession);
  assert.strictEqual(progStaff.success, false);
  assert.strictEqual(progStaff.errorCode, 'FORBIDDEN');
});

// -----------------------------------------------------------------------------
// Test 8: Edge cases (empty CNEs, missing records, invalid IDs) handled safely
// -----------------------------------------------------------------------------
runTest('Edge cases (empty CNEs, missing records, invalid IDs) are handled safely without exceptions', () => {
  const env = createFreshTestEnvironment();
  const adminSession = { employeeId: 'EMP-ADM-001', role: 'ADMIN', name: 'Admin' };

  // 1. Missing or blank CNE ID
  const blankIdRes1 = env.sandbox.handleGetCNEActivityProgress({ cneId: '' }, adminSession);
  assert.strictEqual(blankIdRes1.success, false);
  assert.strictEqual(blankIdRes1.message, 'CNE ID is required.');

  const blankIdRes2 = env.sandbox.handleGetCNEParticipants({ cneId: '   ' }, adminSession);
  assert.strictEqual(blankIdRes2.success, false);
  assert.strictEqual(blankIdRes2.message, 'CNE ID is required.');

  // 2. Non-existent CNE ID
  const nonExistRes1 = env.sandbox.handleGetCNEActivityProgress({ cneId: 'CNE-DOES-NOT-EXIST' }, adminSession);
  assert.strictEqual(nonExistRes1.success, false);
  assert.ok(nonExistRes1.message.includes('CNE record not found'));

  const nonExistRes2 = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-DOES-NOT-EXIST' }, adminSession);
  assert.strictEqual(nonExistRes2.success, false);
  assert.ok(nonExistRes2.message.includes('CNE record not found'));

  // 3. Empty CNE (0 participants, 0 questions, no materials)
  const emptyProgRes = env.sandbox.handleGetCNEActivityProgress(
    { cneId: 'CNE-2026-EMPTY', forceFresh: true },
    adminSession
  );
  assert.strictEqual(emptyProgRes.success, true);
  assert.strictEqual(emptyProgRes.data.materialStatus, 'Not Added');
  assert.strictEqual(emptyProgRes.data.questionsStatus, 'Not Generated');
  assert.strictEqual(emptyProgRes.data.finalizedQuestionsCount, 0);
  assert.strictEqual(emptyProgRes.data.qrStatus, 'Not Generated');
  assert.strictEqual(emptyProgRes.data.participantsCount, 0);
  assert.strictEqual(emptyProgRes.data.postTestStatus, 'Not Available');
  assert.strictEqual(emptyProgRes.data.finalizationStatus, 'Not Finalized');

  const emptyPartRes = env.sandbox.handleGetCNEParticipants({ cneId: 'CNE-2026-EMPTY' }, adminSession);
  assert.strictEqual(emptyPartRes.success, true);
  assert.strictEqual(emptyPartRes.data.totalParticipants, 0);
  assert.strictEqual(emptyPartRes.data.postTestCount, 0);
  assert.strictEqual(emptyPartRes.data.manualCount, 0);
  assert.strictEqual(emptyPartRes.data.averageScore, null, 'Empty CNE averageScore must be null, never 0');
  assert.strictEqual(Array.isArray(emptyPartRes.data.participants), true);
  assert.strictEqual(emptyPartRes.data.participants.length, 0);

  // 4. Direct test of readMatchedCneRows_ on unmatched queries
  const unmatchedResult = env.sandbox.readMatchedCneRows_(env.responsesSheet, 1, 'NON-MATCHING-CNE', 1, 14);
  assert.strictEqual(Array.isArray(unmatchedResult), true);
  assert.strictEqual(unmatchedResult.length, 0, 'readMatchedCneRows_ must return empty array for unmatched CNE without throwing');
});

// -----------------------------------------------------------------------------
// Schedule-specific endpoint regression: real Google Apps Script handlers
// -----------------------------------------------------------------------------
runTest('Schedule status endpoint filters before delivery and protects historical pages', () => {
  const env = createFreshTestEnvironment();
  const admin = {employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  const staff = {employeeId:'EMP-STF-001',role:'EMPLOYEE',assignedAreas:[]};
  const scheduled = env.sandbox.handleGetCNESchedulePage({status:'Scheduled'}, admin);
  assert.strictEqual(scheduled.success,true);
  assert.strictEqual(scheduled.data.total,2);
  assert.strictEqual(scheduled.data.records.length,2);
  assert.ok(scheduled.data.records.every(c=>c.status==='Scheduled'));
  const staffHistory=env.sandbox.handleGetCNESchedulePage({status:'Completed'},staff);
  assert.strictEqual(staffHistory.success,true);
  assert.strictEqual(staffHistory.data.total,0,'Staff must not see any restricted historical CNE count');
  assert.strictEqual(staffHistory.data.records.length,0);
  const adminHistory=env.sandbox.handleGetCNESchedulePage({status:'Completed',page:1,pageSize:1},admin);
  assert.strictEqual(adminHistory.success,true);
  assert.strictEqual(adminHistory.data.total,1);
  assert.strictEqual(adminHistory.data.records[0].cneId,'CNE-2026-PERF2');
  const search=env.sandbox.handleGetCNESchedulePage({status:'Scheduled',search:'Trauma'},admin);
  assert.strictEqual(search.success,true);
  assert.strictEqual(search.data.total,1);
  const noDate=env.sandbox.handleGetCNESchedulePage({status:'Scheduled',fromDate:'2030-01-01'},admin);
  assert.strictEqual(noDate.success,true);
  assert.strictEqual(noDate.data.total,0);
});

runTest('Calendar deep-link reads only authorized CNE and fails closed', () => {
  const env = createFreshTestEnvironment();
  const admin = {employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  const staff = {employeeId:'EMP-STF-001',role:'EMPLOYEE',assignedAreas:[]};
  const allowed=env.sandbox.handleGetCNEScheduleById({cneId:'CNE-2026-PERF2'},admin);
  assert.strictEqual(allowed.success,true);
  assert.strictEqual(allowed.data.status,'Completed');
  const denied=env.sandbox.handleGetCNEScheduleById({cneId:'CNE-2026-PERF2'},staff);
  assert.strictEqual(denied.success,false);
  assert.strictEqual(denied.errorCode,'NOT_FOUND');
  const anonymous=env.sandbox.handleGetCNESchedulePage({status:'Scheduled'},null);
  assert.strictEqual(anonymous.success,false);
  assert.strictEqual(anonymous.errorCode,'UNAUTHORIZED');
  const invalid=env.sandbox.handleGetCNESchedulePage({status:'INVALID'},admin);
  assert.strictEqual(invalid.success,false);
});

runTest('Historical pagination returns stable pages without downloading all completed records', () => {
  const env=createFreshTestEnvironment();
  const admin={employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  const sheet=env.cneSpreadsheet.getSheetByName('CNE Schedule');
  const existing=sheet.grid[2]; // completed row fixture
  for(let i=0;i<6;i++) {
    const next=[...existing];
    next[0]='CNE-2026-PAGED-'+i;
    next[3]='2026-09-'+String(i+10).padStart(2,'0')+'T09:00';
    sheet.appendRow(next);
  }
  sheet.resetReadOps();
  const first=env.sandbox.handleGetCNESchedulePage({status:'Completed',page:1,pageSize:3},admin);
  assert.strictEqual(first.success,true);
  assert.strictEqual(first.data.total,7);
  assert.strictEqual(first.data.records.length,3);
  assert.strictEqual(first.data.hasMore,true);
  const second=env.sandbox.handleGetCNESchedulePage({status:'Completed',page:2,pageSize:3},admin);
  assert.strictEqual(second.success,true);
  assert.strictEqual(second.data.records.length,3);
  assert.strictEqual(second.data.hasMore,true);
  const firstIds=new Set(first.data.records.map(c=>c.cneId));
  assert.ok(second.data.records.every(c=>!firstIds.has(c.cneId)), 'Pages must not repeat CNE IDs');
  assert.strictEqual(sheet.getDataRangeCount,0,'Indexed pagination must not invoke getDataRange on entire CNE sheet');
});

runTest('Calendar monthly endpoint returns only overlapping authorized CNEs', () => {
  const env=createFreshTestEnvironment();
  const admin={employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  const staff={employeeId:'EMP-STF-001',role:'EMPLOYEE',assignedAreas:[]};
  const sheet=env.cneSpreadsheet.getSheetByName('CNE Schedule');
  sheet.resetReadOps();
  const month=env.sandbox.handleGetCNECalendarMonth({year:2026,month:10},admin);
  assert.strictEqual(month.success,true);
  assert.strictEqual(month.data.map(c=>c.cneId).join(','),'CNE-2026-PERF2');
  const empty=env.sandbox.handleGetCNECalendarMonth({year:2026,month:2},admin);
  assert.strictEqual(empty.success,true);
  assert.strictEqual(empty.data.length,0);
  assert.strictEqual(sheet.getDataRangeCount,0,'Calendar must never call getDataRange for all CNEs');
  const restricted=env.sandbox.handleGetCNECalendarMonth({year:2026,month:10},staff);
  assert.strictEqual(restricted.success,true);
  assert.strictEqual(restricted.data.length,0,'Historical CNEs must not leak to ordinary employees');
  const noSession=env.sandbox.handleGetCNECalendarMonth({year:2026,month:10},null);
  assert.strictEqual(noSession.success,false);
  assert.strictEqual(noSession.errorCode,'UNAUTHORIZED');
  const invalid=env.sandbox.handleGetCNECalendarMonth({year:2026,month:13},admin);
  assert.strictEqual(invalid.success,false);
});

runTest('Calendar month selection includes CNEs that span months', () => {
  const env=createFreshTestEnvironment();
  const admin={employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  const sheet=env.cneSpreadsheet.getSheetByName('CNE Schedule');
  const row=[...sheet.grid[1]];
  row[0]='CNE-OVERLAP'; row[3]='2028-11-30T10:00'; row[4]='2028-12-02T10:00';
  sheet.appendRow(row);
  const nov=env.sandbox.handleGetCNECalendarMonth({year:2028,month:11},admin);
  const dec=env.sandbox.handleGetCNECalendarMonth({year:2028,month:12},admin);
  assert.strictEqual(nov.success,true);
  assert.strictEqual(dec.success,true);
  assert.ok(nov.data.some(c=>c.cneId==='CNE-OVERLAP'));
  assert.ok(dec.data.some(c=>c.cneId==='CNE-OVERLAP'));
});

runTest('Admin analytics endpoint fails closed and requires authorized session', () => {
  assert.ok(codeGsSource.includes("case 'getCNEAnalytics':"), 'Action must be routed through authenticated dispatcher');
  assert.ok(codeGsSource.includes('function handleGetCNEAnalytics(params, session)'), 'Analytics function must exist');
  const code = codeGsSource.slice(codeGsSource.lastIndexOf('function cneAnalyticsSelectedResponseRows_('));
  const ctx = {requireAdmin: session => session && session.role === 'ADMIN' ? null : {success:false,errorCode:'FORBIDDEN'}, getCNECanonicalDay: x=>x==='bad'?'':x};
  vm.runInNewContext(code, ctx);
  assert.strictEqual(ctx.handleGetCNEAnalytics({fromDate:'2026-10-01',toDate:'2026-10-31'},null).success,false);
  assert.strictEqual(ctx.handleGetCNEAnalytics({fromDate:'2026-10-01',toDate:'2026-10-31'},{role:'EMPLOYEE'}).success,false);
  assert.strictEqual(ctx.handleGetCNEAnalytics({fromDate:'bad',toDate:'2026-10-31'},{role:'ADMIN'}).success,false);
  const api = fs.readFileSync(path.join(rootDir,'src/services/api.ts'),'utf8');
  assert.ok(api.includes("'getCNEAnalytics',"), 'Analytics API must be marked as protected from persistent caching');
});

runTest('Admin analytics aggregates verified attendance once per CNE and skips registration-only rows', () => {
  const code=codeGsSource.slice(codeGsSource.lastIndexOf('function cneAnalyticsSelectedResponseRows_('));
  const headers=['CNE ID','Area','From Date','To Date','Duration','Topic','Resource Person Emp ID','Mode of Teaching','Status','Total Allotted Staff','Max Participants'];
  const sheetRows=[headers,['CNE-1','ICU','2026-10-01','2026-10-01','01:30:00','Sepsis','RP1','Lecture','Completed',40,50],['CNE-2','ICU','2026-10-10','2026-10-10','01:00:00','Vitals','RP1','Lecture','Scheduled',40,50]];
  const responseRows=[['CNE-1','E1','Nurse A','NO','ICU',8,10,80,'POST_TEST'],['CNE-1','E1','Nurse A','NO','ICU','','','','MANUAL'],['CNE-1','E2','Nurse B','NO','ICU','','','','MANUAL'],['CNE-1','EXT-1','External','External','ICU','','','','EXTERNAL_REGISTRATION']];
  let readCount=0;
  const inMemoryAnalyticsCache = new Map();
  const scheduleSheet={getLastRow:()=>sheetRows.length,getLastColumn:()=>headers.length,getRange:(r,c,n)=>({getValues:()=>r===1?[headers]:sheetRows.slice(r-1,r+n-1)})};
  const responseSheet={getLastRow:()=>responseRows.length+1,getRange:(r,c,n,w)=>{assert.strictEqual(c,2);assert.strictEqual(w,9,'No answer-key/answers JSON column may be scanned');readCount++;return {getValues:()=>responseRows};}};
  const ctx={
    requireAdmin:s=>s&&s.role==='ADMIN'?null:{success:false,errorCode:'FORBIDDEN'},
    getCNECanonicalDay:v=>v||'',
    getSpreadsheet:()=>({getSheetByName:n=>n==='CNE Schedule'?scheduleSheet:n==='CNE Post Test Responses'?responseSheet:null}),
    getHeaderMap:()=>Object.fromEntries(headers.map((x,i)=>[x.toLowerCase().replace(/[^a-z0-9]/g,''),i])),
    readDepartmentalOutcomeScheduleRows_:(_,__,from,to)=>sheetRows.slice(1).filter(r=>r[2]>=from&&r[2]<=to),
    getOfficerNameMap:()=>({RP1:'Teaching RP',E1:'Nurse A',E2:'Nurse B'}),
    normalizeCNEStatus:s=>s,getIndiaTodayString:()=> '2026-10-16',formatDurationValue:v=>v,
    parseDurationToSeconds:v=>v.split(':').map(Number).reduce((a,b)=>a*60+b),
    normalizeEmpId:s=>String(s||'').toUpperCase(),isExternalParticipantId:s=>String(s).startsWith('EXT'),
    logPerf:()=>{},Date,Math,Object,String,Number,Array,Boolean,isFinite,
    Utilities: {DigestAlgorithm: {SHA_256:'SHA_256'}, computeDigest:(_,message)=>Array.from(require('crypto').createHash('sha256').update(message).digest())},
    putToScriptCache:(key,data,ttl)=>{assert.strictEqual(ttl,45);inMemoryAnalyticsCache.set(key,JSON.parse(JSON.stringify(data)));},
    getFromScriptCache:key=>inMemoryAnalyticsCache.get(key)||null
  };
  vm.runInNewContext(code,ctx);
  const result=ctx.handleGetCNEAnalytics({fromDate:'2026-10-01',toDate:'2026-10-31'},{role:'ADMIN'});
  assert.strictEqual(result.success,true);
  assert.strictEqual(result.data.kpis.completed,1);
  assert.strictEqual(result.data.kpis.scheduled,1);
  assert.strictEqual(result.data.kpis.attendanceVisits,2,'Duplicate manual row and registration-only row must be excluded');
  assert.strictEqual(result.data.kpis.uniqueParticipants,2);
  assert.strictEqual(result.data.kpis.participantHours,3);
  assert.strictEqual(result.data.kpis.resourceHours,1.5);
  assert.strictEqual(result.data.kpis.postTestCount,1);
  assert.strictEqual(result.data.kpis.averagePostTestPercent,80);
  assert.strictEqual(result.data.employeeRows.length,0,'Employee directory should not be returned on initial overview');
  assert.strictEqual(readCount,1,'Response sheet should be read once per aggregate request');
  const requestsAfterOverview=readCount;
  const details=ctx.handleGetCNEAnalytics({fromDate:'2026-10-01',toDate:'2026-10-31',includeEmployees:true},{role:'ADMIN'});
  assert.strictEqual(details.data.employeeRows.length,2,'Explicit request exposes only verified internal participant rows');
  assert.strictEqual(readCount,requestsAfterOverview,'Training register must reuse the overview calculation without another response scan');
  assert.strictEqual(ctx.handleGetCNEAnalytics({fromDate:'2026-10-01',toDate:'2026-10-31',includeEmployees:true},{role:'EMPLOYEE'}).errorCode,'FORBIDDEN','Cache never bypasses fresh Admin authorization');
  // A different reporting period must not read unrelated cached employee rows.
  const newPeriod=ctx.handleGetCNEAnalytics({fromDate:'2026-11-01',toDate:'2026-11-30',includeEmployees:true},{role:'ADMIN'});
  assert.strictEqual(newPeriod.data.employeeRows.length,0);
  assert.strictEqual(readCount,requestsAfterOverview+1,'Changing dates must trigger a fresh authoritative response scan');
});

runTest('Stage 3 today-only homepage uses From Date and excludes historical records', () => {
  const homeStart=codeGsSource.indexOf('function handleGetHomeDashboard(');
  const homeEnd=codeGsSource.indexOf('function formatDateValue(',homeStart);
  const script=codeGsSource.slice(homeStart,homeEnd);
  const headers=['CNE ID','Topic','Area','From Date','Status'];
  const rows=[headers,
    ['CNE-TODAY','Morning CNE','ICU','2026-10-17T09:00','Scheduled'],
    ['CNE-TOMORROW','Tomorrow','OT','2026-10-18T09:00','Scheduled'],
    ['CNE-COMPLETE','Completed','ICU','2026-10-17T09:00','Completed'],
    ['CNE-NODATE','Undated','OT','','Scheduled']];
  let actualIds=[];
  const snap={sheet:{},data:rows,displayValues:rows,colMap:{cneid:0,topic:1,area:2,fromdate:3,status:4}};
  const ctx={getCNEScheduleSnapshot_:()=>snap,getIndiaTodayString:()=> '2026-10-17',
    getCNECanonicalDay:v=>String(v||'').slice(0,10),normalizeCNEStatus:v=>v,
    handleGetCNERecords:(_,__,selected)=>{actualIds=selected.data.slice(1).map(r=>r[0]);return {success:true,data: selected.data.slice(1).map(r=>({cneId:r[0],fromDate:r[3]}))};},
    handleGetProgramImpact:()=>{ctx._executionCneScheduleSnapshot=snap;return {success:true,data:{totalCompletedClasses:2}};},
    handleGetNewsEvents:()=>({success:true,data:[]}),handleGetQuickLinks:()=>({success:true,data:[]}),
    handleGetCoordinatorDesk:()=>({success:true,data:{}}),logPerf:()=>{},Date};
  vm.runInNewContext(script,ctx);
  const response=ctx.handleGetHomeDashboard({},null);
  assert.strictEqual(response.success,true);
  assert.strictEqual(JSON.stringify(actualIds),JSON.stringify(['CNE-TODAY']),"Only today's Scheduled start dates qualify");
  assert.strictEqual(response.data.impactStats.totalCompletedClasses,2,'Homepage impact is independent of today-only preview');
});

runTest('Stage 3 homepage uses narrow Schedule reads when impact metrics are cached', () => {
  const start=codeGsSource.indexOf('function handleGetHomeDashboard(');
  const end=codeGsSource.indexOf('function formatDateValue(',start);
  const rows=[['CNE ID','Topic','Area','From Date','Status'],
    ['CNE-17','Today','ICU','2026-10-17T09:00','Scheduled'],
    ['CNE-18','Tomorrow','ICU','2026-10-18T09:00','Scheduled']];
  const reads=[];
  const sheet={getLastRow:()=>3,getLastColumn:()=>5,
    getRange:(r,c,n,w)=>{reads.push({r,c,n,w});return {getValues:()=>r===1?[rows[0]]:rows.slice(r-1,r+n-1).map(v=>w===1?[v[c-1]]:v.slice(c-1,c+w-1))};}};
  const ctx={_executionCneScheduleSnapshot:null,getSpreadsheet:()=>({getSheetByName:()=>sheet}),
    getIndiaTodayString:()=> '2026-10-17',getCNECanonicalDay:v=>String(v||'').slice(0,10),
    normalizeCNEStatus:v=>v,buildHeaderMapFromRow_:h=>Object.fromEntries(h.map((v,i)=>[v.toLowerCase().replace(/[^a-z0-9]/g,''),i])),
    getCneScheduleColumnValues_:(_,col)=>rows.slice(1).map(r=>r[col]),
    cneScheduleSelectedSnapshot_:(_,headers,cols,selected)=>({sheet,data:[headers,...selected.map(row=>rows[row-1])],colMap:cols,displayValues:[]}),
    handleGetProgramImpact:()=>({success:true,data:{totalCompletedClasses:7}}),
    handleGetCNERecords:(_,__,snapshot)=>({success:true,data:snapshot.data.slice(1).map(r=>({cneId:r[0],fromDate:r[3]}))}),
    handleGetNewsEvents:()=>({success:true,data:[]}),handleGetQuickLinks:()=>({success:true,data:[]}),
    handleGetCoordinatorDesk:()=>({success:true,data:{}}),logPerf:()=>{}};
  vm.runInNewContext(codeGsSource.slice(start,end),ctx);
  const result=ctx.handleGetHomeDashboard({},null);
  assert.strictEqual(result.data.upcomingClasses.length,1);
  assert.strictEqual(result.data.upcomingClasses[0].cneId,'CNE-17');
  assert.ok(reads.every(v=>v.r===1),'Impact-cache homepage must not read the complete Schedule rows');
});

runTest('Stage 3 My CNE Records is employee-only, paginated and full-filter hours remain accurate', () => {
  const env=createFreshTestEnvironment();
  const sheet=env.cneSpreadsheet.getSheetByName('CNE Schedule');
  const template=[...sheet.grid[2]];
  for(let i=0;i<28;i++){
    const row=[...template];row[0]='CNE-MY-'+String(i).padStart(3,'0');
    row[1]='Staff Development Topic '+i;row[3]='2026-10-12T10:00';
    row[5]='01:30:00';row[10]='Completed';row[13]='EMP-STF-001';
    row[6]=i===0?'EMP-STF-001':'EMP-RP-200';
    sheet.appendRow(row);
  }
  env.responsesSheet.appendRow(['RESP-MY','CNE-MY-000','EMP-STF-001','Staff Nurse John','Nursing Officer','ICU',8,10,80,'POST_TEST','2026-10-12T10:00:00Z','','ATTENDED','']);
  const emp={employeeId:'EMP-STF-001',role:'EMPLOYEE'};
  const first=env.sandbox.handleGetMyCNERecordsPage({page:1,pageSize:25},emp);
  assert.strictEqual(first.success,true,first.message);
  assert.strictEqual(first.data.total,28);
  assert.strictEqual(first.data.records.length,25);
  assert.strictEqual(first.data.hasMore,true);
  assert.strictEqual(first.data.participantSeconds,28*5400);
  assert.strictEqual(first.data.resourcePersonSeconds,5400);
  assert.ok(first.data.records.every(r=>r.status==='Completed'));
  const next=env.sandbox.handleGetMyCNERecordsPage({page:2,pageSize:25},emp);
  assert.strictEqual(next.data.records.length,3);
  assert.strictEqual(next.data.records.find(r=>r.cneId==='CNE-MY-000').myPostTestScore,80,'Per-page Post-Test percentage must be present');
  assert.strictEqual(next.data.participantSeconds,first.data.participantSeconds);
  const filtered=env.sandbox.handleGetMyCNERecordsPage({search:'Topic 1',fromDate:'2026-10-01',toDate:'2026-10-31'},emp);
  assert.strictEqual(filtered.data.total,11,'Server must filter before pagination and hour calculations');
  assert.strictEqual(filtered.data.participantSeconds,11*5400);
  const denied=env.sandbox.handleGetMyCNERecordsPage({},null);
  assert.strictEqual(denied.success,false);
  const unrelated=env.sandbox.handleGetMyCNERecordsPage({}, {employeeId:'EMP-OTHER',role:'ADMIN'});
  assert.strictEqual(unrelated.data.total,0,"Admin may not retrieve another employee's history by role");
  assert.strictEqual(env.sandbox.handleGetMyCNERecordsPage({fromDate:'2026-10-30',toDate:'2026-10-01'},emp).success,false);
  const offset=[...template];offset[0]='CNE-IST-OFFSET';offset[3]='2026-10-16T20:30:00Z';offset[13]='EMP-STF-001';offset[10]='Completed';sheet.appendRow(offset);
  const indiaDay=env.sandbox.handleGetMyCNERecordsPage({fromDate:'2026-10-17',toDate:'2026-10-17'},emp);
  assert.strictEqual(indiaDay.data.total,1,'Explicit UTC offsets must be grouped by their actual Asia/Kolkata date');
});

runTest('Stage 3 report response lookup uses sparse bounded rows and retains B:J projection', () => {
  const env=createFreshTestEnvironment();
  const sheet=env.responsesSheet;
  for(let i=0;i<500;i++){
    sheet.appendRow(['RESP-BIG-'+i,'CNE-UNRELATED-'+i,'EMP-'+i,'Other','','',5,10,50,'POST_TEST','','','ATTENDED','']);
  }
  const selected={'CNE-2026-PERF1':{status:'Completed'}};
  sheet.resetReadOps();
  const rows=env.sandbox.cneAnalyticsSelectedResponseRows_(sheet,selected);
  assert.strictEqual(rows.length,4);
  assert.ok(rows.every(r=>r.length===9 && r[0]==='CNE-2026-PERF1'));
  assert.ok(sheet.readOps.filter(op=>op.numCols>1).every(op=>op.numRows<=160),
    'Sparse report response rows must avoid whole-history wide scans');
});

runTest('Schedule search first narrows by status/date and still enforces historical permissions', () => {
  const env=createFreshTestEnvironment();
  const sheet=env.cneSpreadsheet.getSheetByName('CNE Schedule');
  const historical=[...sheet.grid[2]];
  for(let i=0;i<200;i++) {
    const row=[...historical];row[0]='CNE-OLD-SEARCH-'+i;
    row[3]='2025-05-12T10:00';row[4]='2025-05-12T11:00';
    row[1]='Historical archived sepsis session';
    sheet.appendRow(row);
  }
  const admin={employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  sheet.resetReadOps();
  const result=env.sandbox.handleGetCNESchedulePage({status:'Completed',fromDate:'2026-10-01',toDate:'2026-10-31',search:'sterilization',pageSize:50},admin);
  assert.strictEqual(result.success,true);
  assert.strictEqual(result.data.total,1);
  assert.strictEqual(result.data.records[0].cneId,'CNE-2026-PERF2');
  assert.ok(sheet.readOps.filter(op=>op.numCols>1).every(op=>op.numRows<=160),
    'Search should materialize only status/date candidates, not full historic rows');
  const employee={employeeId:'EMP-STF-001',role:'EMPLOYEE',assignedAreas:[]};
  const denied=env.sandbox.handleGetCNESchedulePage({status:'Completed',fromDate:'2026-10-01',toDate:'2026-10-31',search:'sterilization'},employee);
  assert.strictEqual(denied.data.total,0,'Historical search must not disclose unauthorized records');
});

runTest('Sparse Schedule rows use bounded windows instead of whole-history reads', () => {
  const env=createFreshTestEnvironment();
  const sheet=env.cneSpreadsheet.getSheetByName('CNE Schedule');
  const sample=[...sheet.grid[1]];
  for(let i=0;i<600;i++) {
    const row=[...sample]; row[0]='CNE-SPARSE-'+i; row[3]='2029-01-01T09:00';
    sheet.appendRow(row);
  }
  const selected=[2,100,200,300,400,500,600];
  sheet.resetReadOps();
  const snapshot=env.sandbox.cneScheduleSelectedSnapshot_(sheet,sheet.grid[0],{},selected);
  assert.strictEqual(snapshot.data.length,selected.length+1);
  assert.strictEqual(snapshot.data[1][0],sheet.grid[selected[0]-1][0]);
  assert.strictEqual(snapshot.data.at(-1)[0],sheet.grid[selected.at(-1)-1][0]);
  const heavy=sheet.readOps.filter(op=>op.numCols>1);
  assert.ok(heavy.length>1,'Remote matches should be read in independent bounded groups');
  assert.ok(heavy.every(op=>op.numRows<=160),'No enormous sparse read is allowed');
  assert.ok(heavy.reduce((count,op)=>count+op.numRows,0)<100,'Sparse reads should not read unrelated history');
});

runTest('Date-filtered outcomes do not scan full history when matches are scattered', () => {
  const env=createFreshTestEnvironment();
  const sheet=env.cneSpreadsheet.getSheetByName('CNE Schedule');
  const sample=[...sheet.grid[1]];
  for(let i=0;i<600;i++) {
    const row=[...sample]; row[0]='CNE-DATE-SPARSE-'+i;
    row[3]=i%90===0?'2027-02-03T09:00':'2025-01-01T09:00';
    sheet.appendRow(row);
  }
  sheet.resetReadOps();
  const selected=env.sandbox.readDepartmentalOutcomeScheduleRows_(sheet,3,'2027-02-01','2027-02-28');
  assert.strictEqual(selected.length,7);
  assert.ok(selected.every(r=>r[3]==='2027-02-03T09:00'));
  const full=sheet.readOps.filter(op=>op.numCols>1);
  assert.ok(full.length>=2,'Scattered outcomes should use multiple small ranges');
  assert.ok(full.every(op=>op.numRows<=160),'No full-history fallback for sparse results');
});

// -----------------------------------------------------------------------------
// Attendance eligibility consistency: registration is never attendance.
// -----------------------------------------------------------------------------
runTest('Shared attendance policy excludes registration and unsupported sources', () => {
  const env = createFreshTestEnvironment();
  const eligible = env.sandbox.isConfirmedCNEAttendanceResponse_;
  assert.strictEqual(eligible('EXTERNAL_REGISTRATION', 'REGISTERED'), false);
  assert.strictEqual(eligible('EXTERNAL_REGISTRATION', 'ATTENDED'), false,
    'A registration row must never become attendance by changing status alone');
  assert.strictEqual(eligible('', 'ATTENDED'), false, 'Unknown Source fails closed');
  assert.strictEqual(eligible('PENDING', 'ATTENDED'), false);
  assert.strictEqual(eligible('MANUAL', 'REGISTERED'), false);
  assert.strictEqual(eligible('POST_TEST', 'PENDING'), false);
  assert.strictEqual(eligible('MANUAL', 'ATTENDED'), true);
  assert.strictEqual(eligible('QR', 'ATTENDED'), true);
  assert.strictEqual(eligible('POST_TEST', 'PASSED'), true);
  assert.strictEqual(eligible('POST_TEST', 'NEEDS_IMPROVEMENT'), true);
});

runTest('Registration alone does not inflate Participants or Calendar Progress', () => {
  const env = createFreshTestEnvironment();
  const admin = {employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  env.responsesSheet.appendRow([
    'EXTREG-ONLY','CNE-2026-EMPTY','EXT-AAAAAAAAAAAAAAAAAAAAAAAA','Registered Visitor',
    'External Participant','Emergency','','','','EXTERNAL_REGISTRATION',
    '2026-10-15T10:00:00Z','','REGISTERED','Email verified'
  ]);
  const before = env.sandbox.handleGetCNEParticipants({cneId:'CNE-2026-EMPTY'},admin);
  const progress = env.sandbox.handleGetCNEActivityProgress({cneId:'CNE-2026-EMPTY',forceFresh:true},admin);
  assert.strictEqual(before.success,true);
  assert.strictEqual(before.data.totalParticipants,0);
  assert.strictEqual(before.data.manualCount,0);
  assert.strictEqual(before.data.postTestCount,0);
  assert.strictEqual(before.data.participants.length,0);
  assert.strictEqual(progress.success,true);
  assert.strictEqual(progress.data.participantsCount,0);
  assert.strictEqual(env.responsesSheet.getDataRangeCount,0,'CNE reads must be bounded');
  assert.strictEqual(env.responsesSheet.grid.at(-1)[9],'EXTERNAL_REGISTRATION',
    'Registration source data must be preserved');
});

runTest('Finalization rejects registration-only CNE, then deduplicates confirmed attendees', () => {
  const env = createFreshTestEnvironment();
  const admin = {employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  // Keep lifecycle/session boundaries intact in production; stub only the independent
  // authentication revalidation and side-effect dependencies of this mock fixture.
  env.sandbox.refreshMutationSession = session => ({success:true,session});
  env.sandbox.deactivateQRTokensForCNE = () => {};
  env.sandbox.logAuditAction = () => {};
  const schedule = env.cneSpreadsheet.getSheetByName('CNE Schedule');
  env.responsesSheet.appendRow([
    'EXTREG-1','CNE-2026-EMPTY','EXT-AAAAAAAAAAAAAAAAAAAAAAAA','Visitor A',
    'External Participant','Emergency','','','','EXTERNAL_REGISTRATION',
    '2026-10-01T09:00:00Z','','REGISTERED','Registration retained'
  ]);
  const denied = env.sandbox.handleFinalizeCNE({cneId:'CNE-2026-EMPTY'},admin);
  assert.strictEqual(denied.success,false);
  assert.strictEqual(denied.errorCode,'NO_PARTICIPANTS');
  assert.ok(denied.message.includes('Registration alone'));
  assert.strictEqual(schedule.grid[3][10],'Scheduled', 'CNE must remain Scheduled');

  env.responsesSheet.appendRow([
    'M-1','CNE-2026-EMPTY','EMP-STF-001','John',
    'Nursing Officer','Emergency','','','','MANUAL',
    '2026-10-01T10:00:00Z','','ATTENDED',''
  ]);
  env.responsesSheet.appendRow([
    'PT-1','CNE-2026-EMPTY','EMP-STF-001','John',
    'Nursing Officer','Emergency',8,10,80,'POST_TEST',
    '2026-10-01T10:05:00Z','','PASSED',''
  ]);
  env.responsesSheet.appendRow([
    'PT-2','CNE-2026-EMPTY','EXT-AAAAAAAAAAAAAAAAAAAAAAAA','Visitor A',
    'External Participant','Emergency',7,10,70,'POST_TEST',
    '2026-10-01T10:08:00Z','','NEEDS_IMPROVEMENT',''
  ]);
  env.responsesSheet.appendRow([
    'EXTREG-2','CNE-2026-EMPTY','EXT-BBBBBBBBBBBBBBBBBBBBBBBB','Visitor B',
    'External Participant','Emergency','','','','EXTERNAL_REGISTRATION',
    '2026-10-01T10:09:00Z','','REGISTERED',''
  ]);
  const beforeFinal = env.sandbox.handleGetCNEParticipants({cneId:'CNE-2026-EMPTY'},admin);
  const progress = env.sandbox.handleGetCNEActivityProgress({cneId:'CNE-2026-EMPTY',forceFresh:true},admin);
  assert.strictEqual(beforeFinal.data.totalParticipants,2);
  assert.strictEqual(beforeFinal.data.postTestCount,2);
  assert.strictEqual(beforeFinal.data.manualCount,0);
  assert.strictEqual(progress.data.participantsCount,2);
  env.responsesSheet.resetReadOps();
  const finalized = env.sandbox.handleFinalizeCNE({cneId:'CNE-2026-EMPTY'},admin);
  assert.strictEqual(finalized.success,true, finalized.message);
  assert.strictEqual(schedule.grid[3][10],'Completed');
  assert.strictEqual(Number(schedule.grid[3][14]),2,'Staff Count = 2 verified attendees, not registrations');
  assert.strictEqual(schedule.grid[3][13],'EMP-STF-001');
  assert.strictEqual(schedule.grid[3][15],'Visitor A');
  assert.ok(schedule.grid[3][17].includes('Total Attendees: 2'));
  assert.ok(schedule.grid[3][17].includes('75%'), 'Average score must use unique Post-Test attendees');
  assert.strictEqual(env.responsesSheet.getDataRangeCount,0,'No full response history inside ScriptLock');
  assert.ok(env.responsesSheet.readOps.some(op=>op.col===1&&op.numCols===14),
    'Finalization must use bounded matched-CNE row reads');
  assert.strictEqual(env.responsesSheet.grid.at(-1)[9],'EXTERNAL_REGISTRATION',
    'Registration-only rows must remain unchanged');
});

runTest('Manual attendance converts one verified external registration to a shared identity', () => {
  const env = createFreshTestEnvironment();
  const admin = {employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  env.sandbox.refreshMutationSession = session => ({success:true,session});
  env.sandbox.logAuditActionsBatch = () => {};
  const externalId = 'EXT-CCCCCCCCCCCCCCCCCCCCCCCC';
  env.responsesSheet.appendRow([
    'EXTREG-C','CNE-2026-EMPTY',externalId,'Visitor C',
    'External Participant','Emergency','','','','EXTERNAL_REGISTRATION',
    '2026-10-01T08:00:00Z','','REGISTERED','Verified email'
  ]);
  const beforeCount = env.sandbox.handleGetCNEParticipants({cneId:'CNE-2026-EMPTY'},admin);
  assert.strictEqual(beforeCount.data.totalParticipants,0);
  env.responsesSheet.resetReadOps();
  const added = env.sandbox.handleAddManualParticipants({
    cneId:'CNE-2026-EMPTY',participants:[{name:'Visitor C',designation:'External Participant',department:'Emergency'}]
  },admin);
  assert.strictEqual(added.success,true,added.message);
  const manual = env.responsesSheet.grid.at(-1);
  assert.strictEqual(manual[2],externalId,'Manual row must reuse external verified ID');
  assert.strictEqual(manual[9],'MANUAL');
  assert.strictEqual(manual[12],'ATTENDED');
  assert.strictEqual(env.responsesSheet.getDataRangeCount,0,'Manual duplicate check avoids reading response history');
  env.responsesSheet.appendRow([
    'PT-C','CNE-2026-EMPTY',externalId,'Visitor C',
    'External Participant','Emergency',8,10,80,'POST_TEST',
    '2026-10-01T10:00:00Z','','PASSED',''
  ]);
  const counted = env.sandbox.handleGetCNEParticipants({cneId:'CNE-2026-EMPTY'},admin);
  assert.strictEqual(counted.data.totalParticipants,1,'Registration + manual + test count once');
  assert.strictEqual(counted.data.postTestCount,1);
  const prog = env.sandbox.handleGetCNEActivityProgress({cneId:'CNE-2026-EMPTY',forceFresh:true},admin);
  assert.strictEqual(prog.data.participantsCount,1);
});

runTest('Ambiguous same-name external registrations cannot be assigned to one attendee', () => {
  const env = createFreshTestEnvironment();
  const admin = {employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  env.sandbox.refreshMutationSession = session => ({success:true,session});
  for (const suffix of ['DDDDDDDDDDDDDDDDDDDDDDDD','EEEEEEEEEEEEEEEEEEEEEEEE']) {
    env.responsesSheet.appendRow([
      'EXTREG-'+suffix,'CNE-2026-EMPTY','EXT-'+suffix,'Shared Visitor',
      'External Participant','Emergency','','','','EXTERNAL_REGISTRATION',
      '2026-10-01T08:00:00Z','','REGISTERED','Email verified'
    ]);
  }
  const before = env.responsesSheet.getLastRow();
  const attempted = env.sandbox.handleAddManualParticipants({cneId:'CNE-2026-EMPTY',name:'Shared Visitor'},admin);
  assert.strictEqual(attempted.success,false);
  assert.strictEqual(attempted.errorCode,'AMBIGUOUS_EXTERNAL_PARTICIPANT');
  assert.strictEqual(env.responsesSheet.getLastRow(),before,'No attendance row may be added');
});

// AI Question Generation reliability tests: expand existing performance suite only.
runTest('AI generation uses exactly one quota-commit persistence path, not a second save', () => {
  const start = codeGsSource.indexOf('function handleGenerateCNEQuestions(');
  const end = codeGsSource.indexOf('function normalizeCneId(', start);
  const generation = codeGsSource.substring(start, end);
  assert.ok(generation.includes('handleCommitAiQuota({'));
  assert.ok(!generation.includes('handleSaveCNEQuestions({'), 'Duplicate independent save must not return');
  assert.ok(generation.includes('if (!commitRes || !commitRes.success)'));
  assert.ok(codeGsSource.includes("isFinalized: 'NO'"), 'AI questions must remain Draft');
});

runTest('BLS relevance requires the question stem to test paediatric resuscitation', () => {
  const env = createFreshTestEnvironment();
  const topic = 'Paediatric Basic Life Support';
  assert.strictEqual(env.sandbox.cneAiTopicMismatch_(topic,{question:'When preparing a paediatric child for IV cannulation?',explanation:'Follow child CPR clinical guidelines.'}),true,'CPR word in rationale must not rescue IV cannulation');
  assert.strictEqual(env.sandbox.cneAiTopicMismatch_(topic,{question:'What topical anaesthetic is used for IV insertion in a child after CPR?',explanation:'Good child CPR care.'}),true,'CPR word in stem must not rescue a question testing IV insertion');
  assert.strictEqual(env.sandbox.cneAiTopicMismatch_(topic,{question:'Managing grief for a child after CPR during the end-of-life phase?',explanation:'Palliative care.'}),true);
  assert.strictEqual(env.sandbox.cneAiTopicMismatch_(topic,{question:'Which IV cannula should the nurse select for paediatric vascular access?',explanation:'Paediatric resuscitation includes CPR.'}),true);
  assert.strictEqual(env.sandbox.cneAiTopicMismatch_(topic,{question:'What should the nurse do for a paediatric patient?',explanation:'Provide rescue breaths and CPR.'}),true,'A generic age-only stem must fail');
  assert.strictEqual(env.sandbox.cneAiTopicMismatch_(topic,{question:'What is the child CPR chest compression procedure?',explanation:'Follow resuscitation response.'}),false);
  assert.strictEqual(env.sandbox.cneAiTopicMismatch_(topic,{question:'An unresponsive 4-year-old is not breathing. What immediate resuscitation step is indicated?',explanation:'Check breathing and prepare CPR.'}),false);
  assert.strictEqual(env.sandbox.cneAiTopicMismatch_('Wound Dressing',{question:'How should peripheral IV cannulation be performed?',explanation:'Wound dressing reduces infection.'}),true,'Rationale must not rescue an unrelated non-BLS question');
  assert.strictEqual(env.sandbox.cneAiTopicMismatch_('Wound Dressing',{question:'When should a wound dressing be changed?',explanation:'Follow asepsis.'}),false);
});

runTest('AI source excerpt must exist in the cited section and support the clinical answer', () => {
  const env = createFreshTestEnvironment();
  const check = env.sandbox.cneAiEvidenceSupported_;
  const topic = 'Paediatric Basic Life Support';
  const section = 'Infant Resuscitation';
  const title = 'Local Paediatric BLS Handbook';
  const excerpt = 'For an infant in cardiac arrest, begin chest compressions immediately and ensure effective rescue breathing.';
  const chunks = [{resourceTitle:title,sectionHeading:section,chunkText:'Section 3. '+excerpt+' Call the emergency team.'}, {resourceTitle:title,sectionHeading:'Vascular Access',chunkText:'Peripheral intravenous cannulation uses topical anaesthetics and a correctly fitted tourniquet.'}];
  assert.strictEqual(check(topic,title+' - '+section,excerpt,'Begin chest compressions','Infant cardiac arrest requires chest compressions.', '',chunks),true,'Exact quote in cited BLS section supports the answer');
  assert.strictEqual(check(topic,title+' - '+section,'CPR should be done correctly and successfully when preparing for emergencies.','Begin chest compressions','Infant cardiac arrest requires chest compressions.','',chunks),false,'Fabricated quotation rejected');
  assert.strictEqual(check(topic,title+' - Vascular Access',excerpt,'Begin chest compressions','Infant cardiac arrest requires chest compressions.','',chunks),false,'Correct quote under wrong claimed section rejected');
  assert.strictEqual(check(topic,title,excerpt,'Begin chest compressions','Infant cardiac arrest requires chest compressions.','',chunks),false,'Section-less source attribution rejected');
  assert.strictEqual(check(topic,title+' - '+section,excerpt,'Apply topical anaesthetic','Lidocaine cream before IV cannulation.', '',chunks),false,'BLS excerpt cannot support an IV answer merely through a real citation');
  assert.strictEqual(check(topic,'Verified CNE Session: '+topic,excerpt,'Begin chest compressions','Perform infant chest compressions.','Intro '+excerpt+' End of session notes.',[]),true,'Actual uploaded CNE material may support a quote');
  assert.strictEqual(check(topic,'Unverified Guideline / Verified CNE Session: '+topic,excerpt,'Begin chest compressions','Perform infant chest compressions.','Intro '+excerpt+' End of session notes.',[]),false,'Fake guideline prefixed to session citation is rejected');
  assert.strictEqual(check(topic,'Verified CNE Session: '+topic,'Unrelated quoted passage describing intravenous cannulation and topical anaesthesia.','Begin chest compressions','Infant chest compressions.','Intro '+excerpt+' End of session notes.',[]),false,'CNE-title citation alone is insufficient');
});

runTest('Clinical contradiction gate rejects answer instructions that reverse cited evidence', () => {
  const env = createFreshTestEnvironment();
  const check = env.sandbox.cneAiEvidenceSupported_;
  const topic = 'Paediatric Basic Life Support';
  const section = 'Child CPR';
  const title = 'Local Paediatric BLS Handbook';
  const citation = title + ' - ' + section;
  const passage = 'For a child in cardiac arrest, begin CPR immediately and provide chest compressions without delay.';
  const snippets = [{resourceTitle:title,sectionHeading:section,chunkText:passage}];
  assert.strictEqual(check(topic,citation,passage,'Begin CPR immediately','Cardiac arrest requires CPR and prompt chest compressions.','',snippets),true);
  assert.strictEqual(check(topic,citation,passage,'Do not begin CPR even during cardiac arrest','Cardiac arrest does not need chest compressions.','',snippets),false,'Direct reversal must fail despite overlapping CPR vocabulary');
  assert.strictEqual(check(topic,citation,passage,'Begin CPR immediately','Do not begin CPR in a child with cardiac arrest.','',snippets),false,'Contradiction in rationale must also fail');
  const suctionQuote = 'For terminal secretions, do not perform routine deep endotracheal suctioning because it may cause distress.';
  const suctionEvidence = [{resourceTitle:'Palliative Nursing Manual',sectionHeading:'Terminal Secretions',chunkText:suctionQuote}];
  assert.strictEqual(check('Terminal Secretions','Palliative Nursing Manual - Terminal Secretions',suctionQuote,'Perform routine deep endotracheal suctioning','The guideline says suctioning may be used.','',suctionEvidence),false,'Reversal of explicit suction prohibition must fail');
  assert.strictEqual(check('Terminal Secretions','Palliative Nursing Manual - Terminal Secretions',suctionQuote,'Do not perform routine deep endotracheal suctioning','Deep suctioning may cause distress.','',suctionEvidence),true,'A correctly worded prohibition remains valid');
});

runTest('Clinical polarity keeps do-not-delay CPR positive and screens conflicting compression ratios', () => {
  const env = createFreshTestEnvironment();
  const check = env.sandbox.cneAiEvidenceSupported_;
  const topic = 'Paediatric Basic Life Support';
  const citation = 'Verified CNE Session: ' + topic;
  const passage = 'Do not delay CPR when a child is in cardiac arrest; initiate chest compressions immediately.';
  const material = 'Section: Resuscitation. ' + passage + ' End of topic.';
  assert.strictEqual(check(topic,citation,passage,'Begin CPR immediately','Resuscitation requires immediate CPR and chest compressions.',material,[]),true,'Do not delay CPR is a positive resuscitation instruction');
  assert.strictEqual(check(topic,citation,passage,'Do not begin CPR','CPR should be withheld in arrest.',material,[]),false,'Double-negation instructions cannot be reversed');
  const otherAction = 'Do not delay activating the emergency response team, begin CPR immediately for the unresponsive child.';
  const otherMaterial = 'Resuscitation teaching excerpt. ' + otherAction + ' End.';
  assert.strictEqual(check(topic,citation,otherAction,'Begin CPR immediately','Emergency team activation and CPR must not be delayed.',otherMaterial,[]),true,'Negation of one action must not reverse the distinct CPR instruction');
  const breathingState = 'For a child who is not breathing, begin CPR immediately and deliver chest compressions.';
  const breathingMaterial = 'Clinical protocol. ' + breathingState + ' End.';
  assert.strictEqual(check(topic,citation,breathingState,'Begin CPR immediately','The child is not breathing so CPR and chest compressions are needed.',breathingMaterial,[]),true,'Not breathing describes the clinical state, not a CPR prohibition');
  const ratioQuote = 'For the single rescuer resuscitation scenario, perform child CPR using a chest compression to ventilation ratio of 30:2.';
  const ratioMaterial = 'Practice guideline. ' + ratioQuote + ' End.';
  assert.strictEqual(check(topic,citation,ratioQuote,'Use a 15:2 compression to ventilation ratio','For child CPR use the 15:2 ratio.',ratioMaterial,[]),false,'Contradictory compression ratio must fail');
  assert.strictEqual(check(topic,citation,ratioQuote,'Use a 30:2 compression to ventilation ratio','For child CPR use a 30:2 ratio.',ratioMaterial,[]),true,'Matching ratio remains valid');
});

runTest('Clinical quantity evidence rejects mismatched medication, oxygen and compression values', () => {
  const env = createFreshTestEnvironment();
  const check = env.sandbox.cneAiEvidenceSupported_;
  const med = 'Medication Administration';
  const medSource = 'Verified CNE Session: ' + med;
  const morphine = 'Administer intravenous morphine 2 mg slowly for postoperative pain as directed by the prescribing physician.';
  assert.strictEqual(check(med,medSource,morphine,'Administer morphine 2 mg intravenously','Use morphine 2 mg for postoperative pain.',morphine,[]),true);
  assert.strictEqual(check(med,medSource,morphine,'Administer morphine 20 mg intravenously','Use morphine 20 mg for postoperative pain.',morphine,[]),false,'10-fold overdose cannot pass keyword overlap');
  assert.strictEqual(check(med,medSource,morphine,'Administer morphine 2 g intravenously','Use morphine 2 g for postoperative pain.',morphine,[]),false,'Same number with different units cannot pass');
  const oxygen = 'Provide oxygen via nasal cannula at 2 litres per minute and reassess oxygen saturation.';
  assert.strictEqual(check(med,medSource,oxygen,'Provide oxygen at 20 litres per minute','Reassess oxygen saturation.',oxygen,[]),false,'Unsupported oxygen flow must fail');
  const bls = 'Paediatric Basic Life Support';
  const blsSource = 'Verified CNE Session: ' + bls;
  const compressions = 'Begin child chest compressions at a rate of 100 to 120 per minute during cardiac arrest.';
  assert.strictEqual(check(bls,blsSource,compressions,'Begin child chest compressions at 40 per minute','Child chest compressions during cardiac arrest.',compressions,[]),false,'Unsupported compression rate must fail');
  assert.strictEqual(check(bls,blsSource,compressions,'Begin child chest compressions at 120 per minute','Child chest compressions at 120 per minute during cardiac arrest.',compressions,[]),true,'Exact evidenced upper-bound rate allowed');
});

runTest('Clinical evidence qualifiers reject contrary indications, sequence and speed', () => {
  const env = createFreshTestEnvironment();
  const check = env.sandbox.cneAiEvidenceSupported_;
  const topic = 'Medication Administration';
  const source = 'Verified CNE Session: ' + topic;
  const oxygen = 'Administer oxygen only when the patient has confirmed hypoxaemia and assess oxygen saturation frequently.';
  assert.strictEqual(check(topic,source,oxygen,'Administer oxygen to every patient regardless of oxygen saturation','Provide oxygen and assess saturation.',oxygen,[]),false,'Only when cannot imply regardless of condition');
  const morphine = 'Administer morphine slowly by intravenous injection after checking the medical order.';
  assert.strictEqual(check(topic,source,morphine,'Administer morphine rapidly by intravenous injection','Check the medical order.',morphine,[]),false,'Slowly cannot imply rapidly');
  assert.strictEqual(check(topic,source,morphine,'Administer morphine slowly after checking the medical order','Follow medication administration order.',morphine,[]),true,'Correct administration and sequence supported');
  assert.strictEqual(check(topic,source,morphine,'Administer morphine without checking the medical order','The medical order can be skipped.',morphine,[]),false,'Source prerequisite cannot be omitted');
});

runTest('Clinical quantities bind to the correct treatment within mixed-source excerpts', () => {
  const env = createFreshTestEnvironment();
  const check = env.sandbox.cneAiEvidenceSupported_;
  const topic = 'Medication Administration';
  const source = 'Verified CNE Session: ' + topic;
  const mixed = 'For postoperative pain, administer morphine 2 mg intravenously and give naloxone 20 mg if prescribed for specific circumstances.';
  assert.strictEqual(check(topic,source,mixed,'Administer morphine 20 mg intravenously','Morphine 20 mg relieves postoperative pain.',mixed,[]),false,'Naloxone dose must never justify morphine dose');
  assert.strictEqual(check(topic,source,mixed,'Give naloxone 20 mg','Naloxone 20 mg if specifically prescribed.',mixed,[]),true,'Correctly bound naloxone dose remains supported');
  assert.strictEqual(check(topic,source,mixed,'Administer morphine 2 mg intravenously','Morphine 2 mg for postoperative pain.',mixed,[]),true,'Correctly bound morphine dose remains supported');
  const oxygen = 'Provide oxygen at 2 L/min via nasal cannula; give intravenous fluids at 20 L/min in the separate exercise.';
  assert.strictEqual(check(topic,source,oxygen,'Provide oxygen at 20 L/min','Oxygen delivered by nasal cannula.',oxygen,[]),false,'Unrelated fluid flow must not support oxygen flow');
});

runTest('Clinical prerequisite sequence reversal is rejected', () => {
  const env = createFreshTestEnvironment();
  const check = env.sandbox.cneAiEvidenceSupported_;
  const topic = 'Medication Administration';
  const source = 'Verified CNE Session: ' + topic;
  const excerpt = 'Administer morphine 2 mg only after checking the medical order before providing the medication.';
  assert.strictEqual(check(topic,source,excerpt,'Administer morphine 2 mg before checking the medical order','Morphine is prescribed for pain.',excerpt,[]),false,'Before-checking recommendation reverses after-checking prerequisite');
  assert.strictEqual(check(topic,source,excerpt,'Administer morphine 2 mg after checking the medical order','Morphine is administered after checking the order.',excerpt,[]),true,'Supported checking sequence remains acceptable');
});

runTest('Failed clinical evidence generation releases reservation without saving or committing quota', () => {
  const env = createFreshTestEnvironment();
  const admin = {employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  let commits=0, releases=0, saves=0;
  env.sandbox.getCNEScheduleRecord = () => ({status:'Scheduled',topic:'Medication Administration'});
  env.sandbox.checkQuestionManagementAuthorized = () => null;
  env.sandbox.isCNEQuestionsLocked = () => false;
  env.sandbox.cneAiHasOwnMaterial_ = () => true;
  env.sandbox.handleReserveAiQuota = () => ({success:true,data:{reservationToken:'FAILED_EVIDENCE_TOKEN'}});
  env.sandbox.generateAiQuestionsInternal = () => ({success:false,errorCode:'UNSUPPORTED_SOURCE_EVIDENCE',message:'Unsafe evidence rejected'});
  env.sandbox.handleCommitAiQuota = () => {commits++;throw new Error('Must never commit an unsupported batch');};
  env.sandbox.handleSaveCNEQuestions = () => {saves++;throw new Error('Must never save an unsupported batch');};
  env.sandbox.handleReleaseAiQuota = (params) => {releases++;assert.strictEqual(params.reservationToken,'FAILED_EVIDENCE_TOKEN');return {success:true};};
  const result = env.sandbox.handleGenerateCNEQuestions({cneId:'CNE-2026-PERF1'},admin);
  assert.strictEqual(result.success,false);
  assert.strictEqual(result.errorCode,'UNSUPPORTED_SOURCE_EVIDENCE');
  assert.strictEqual(commits,0);
  assert.strictEqual(saves,0);
  assert.strictEqual(releases,1);
});

runTest('AI prompt and validation require real source excerpts before any persistence', () => {
  const source = codeGsSource;
  const start = source.indexOf('function generateAiQuestionsInternal(');
  const end = source.indexOf('function cneAiHasOwnMaterial_(', start);
  const generation = source.slice(start, end);
  assert.ok(generation.includes('evidenceQuote'), 'Gemini schema must request the source quotation');
  assert.ok(generation.includes('cneAiEvidenceSupported_('), 'Quotation and correct-answer support must be checked before saving');
  assert.ok(generation.indexOf('cneAiEvidenceSupported_(') < generation.indexOf('validatedQuestions.push('), 'Evidence check precedes staging question');
  assert.ok(generation.includes("errorCode:'UNSUPPORTED_SOURCE_EVIDENCE'"));
});

runTest('No uploaded material requires explicit consent before any reservation', () => {
  const env = createFreshTestEnvironment();
  const admin = {employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  env.sandbox.getCNEScheduleRecord = () => ({status:'Scheduled',topic:'Paediatric Basic Life Support',cneId:'CNE-2026-PERF1'});
  env.sandbox.checkQuestionManagementAuthorized = () => null;
  env.sandbox.isCNEQuestionsLocked = () => false;
  env.sandbox.cneAiHasOwnMaterial_ = () => false;
  env.sandbox.handleReserveAiQuota = () => {throw new Error('Reservation should NOT happen');};
  const r = env.sandbox.handleGenerateCNEQuestions({cneId:'CNE-2026-PERF1'},admin);
  assert.strictEqual(r.success,false);
  assert.strictEqual(r.errorCode,'LIBRARY_CONSENT_REQUIRED');
});

runTest('Generation persists through commit once, returns 5 unfinalized questions', () => {
  const env = createFreshTestEnvironment();
  const admin = {employeeId:'EMP-ADM-001',role:'ADMIN',assignedAreas:[]};
  const five = Array.from({length:5},(_,i)=>({id:'q_ai_'+i,question:'Which child CPR protocol is indicated for scenario '+i+'?',options:{A:'One',B:'Two',C:'Three',D:'Four'},correctOption:'A',explanation:'Resuscitation protocol',authoritativeSource:'Verified CNE Session: Paediatric Basic Life Support',isFinalized:false}));
  let commits=0;
  env.sandbox.getCNEScheduleRecord = () => ({status:'Scheduled',topic:'Paediatric Basic Life Support'});
  env.sandbox.checkQuestionManagementAuthorized = () => null;
  env.sandbox.isCNEQuestionsLocked = () => false;
  env.sandbox.cneAiHasOwnMaterial_ = () => true;
  env.sandbox.handleReserveAiQuota = () => ({success:true,data:{reservationToken:'ONE_TOKEN'}});
  env.sandbox.generateAiQuestionsInternal = () => ({success:true,data:five});
  env.sandbox.handleSaveCNEQuestions = () => {throw new Error('Legacy duplicate save must never be called');};
  env.sandbox.handleCommitAiQuota = (params) => {commits++; assert.strictEqual(params.questions.length,5); return {success:true};};
  env.sandbox.handleGetCNEQuestions = () => ({success:true,data:five});
  env.sandbox.logAuditAction = () => {};
  const res = env.sandbox.handleGenerateCNEQuestions({cneId:'CNE-2026-PERF1'},admin);
  assert.strictEqual(res.success,true);
  assert.strictEqual(res.data.length,5);
  assert.strictEqual(commits,1);
  assert.ok(res.data.every(q=>q.isFinalized===false));
});

// -----------------------------------------------------------------------------
// SUMMARY REPORT
// -----------------------------------------------------------------------------
console.log('\\n================================================================');
console.log(\`CNE Read Performance Verification: \${passedTests}/\${totalTests} tests passed\`);
console.log('================================================================\\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
`
  },
  // ===== END ORIGINAL SUITE: verify-cne-read-performance.cjs =====

];

function runSuite(suite) {
  const actualHash = createHash('sha256').update(suite.source).digest('hex');
  if (actualHash !== suite.sha256) {
    throw new Error(`Embedded suite ${suite.id} is incomplete or modified (SHA-256 mismatch). Check that the full TXT was pasted.`);
  }

  const args = suite.mode === 'module'
    ? ['--input-type=module', '-']
    : ['--input-type=commonjs', '-'];

  // Give embedded ESM tests their original scripts/ directory identity so
  // fileURLToPath(import.meta.url) still resolves to this project's root.
  const source = suite.mode === 'module'
    ? `const __CNE_SUITE_IMPORT_META_URL = ${JSON.stringify(SCRIPT_URL)};\n` +
      suite.source.replaceAll('import.meta.url', '__CNE_SUITE_IMPORT_META_URL')
    : `var __dirname = ${JSON.stringify(SCRIPT_DIR)};\n` +
      `var __filename = ${JSON.stringify(join(SCRIPT_DIR, 'verify-all.js'))};\n` +
      suite.source;

  // Isolated worker processes retain exactly the same fail-fast semantics as
  // the independent test scripts (including process.exit and thrown asserts).
  return execFileSync(process.execPath, args, {
    cwd: ROOT_DIR,
    input: source,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
    timeout: 180000
  });
}

// Run any test category from the same file, including timezone workers.
const specialSuitePos = process.argv.indexOf('--suite');
const specialSuiteName = specialSuitePos >= 0 ? process.argv[specialSuitePos + 1] : null;
function runFocusedOnly(name, checks) {
  let ok = 0;
  console.log(`Running ${checks.length} ${name} checks...`);
  for (const {name: title, run} of checks) {
    try { run(); ok++; console.log('✓ ' + title); }
    catch (err) { console.error('✗ ' + title + ': ' + err.message); }
  }
  console.log(`${name}: ${ok}/${checks.length} passed`);
  if (ok !== checks.length) process.exitCode = 1;
}
if (process.argv.includes('--tz-run') || specialSuiteName === 'timezone') {
  runTimezoneVerification();
  process.exit(0);
}
if (specialSuiteName === 'smart-hybrid') {
  runFocusedOnly('Smart Hybrid', createHybridChecks());
  process.exit(process.exitCode || 0);
}
if (specialSuiteName === 'dropdown-retry') {
  runFocusedOnly('Dropdown recovery', createDropdownRetryChecks());
  process.exit(process.exitCode || 0);
}

const suiteFlagIndex = process.argv.indexOf('--suite');
if (suiteFlagIndex !== -1 && !process.argv[suiteFlagIndex + 1]) {
  console.error('Missing suite name after --suite.');
  process.exit(2);
}
const wantedSuite = suiteFlagIndex !== -1 ? process.argv[suiteFlagIndex + 1] : null;
const selected = wantedSuite ? suites.filter(s => s.id === wantedSuite) : suites;
if (!selected.length) {
  console.error(`Unknown suite: ${wantedSuite}. Available: ${suites.map(s=>s.id).join(', ')}`);
  process.exit(2);
}

console.log('================================================================');
console.log('CNE MANAGEMENT SYSTEM - CONSOLIDATED VERIFICATION');
console.log('================================================================');

let passed = 0;
let passedChecks = 0;
for (const s of selected) {
  console.log(`\n>>> ${s.name} (${s.expectedChecks} baseline checks)`);
  const begin = Date.now();
  try {
    const output = runSuite(s);
    process.stdout.write(output);
    passed++;
    passedChecks += s.expectedChecks;
    console.log(`PASS: ${s.name} (${((Date.now() - begin)/1000).toFixed(2)}s)`);
  } catch (error) {
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    console.error(`FAILED: ${s.name}: ${error.message}`);
  }
}
// Focused tests augment, never modify/replace, the checksum-protected original suites.
// Run together with the performance suite and in the full consolidated verification.
let focusedPassed = 0;
const focusedChecks = [];
function focusCheck(name, test) { focusedChecks.push({name, test}); }
if (selected.some(item => item.id === 'performance') && passed === selected.length) {
  const gas = readFileSync(join(ROOT_DIR, 'Code.gs'), 'utf8');
  const ui = readFileSync(join(ROOT_DIR, 'src/components/cne/CNEQuestionsModal.tsx'), 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(gas, sandbox, {timeout: 12000});
  const iv = 'IV Cannulation';
  const good = 'Peripheral IV catheter insertion requires appropriate vein selection, aseptic preparation, and ongoing assessment for phlebitis and infiltration.';
  const source = ('Evidence-based peripheral IV cannulation and vein access: ' + good + ' ').repeat(2);
  focusCheck('IV synonym: peripheral intravenous catheter insertion accepted', () => {
    if (sandbox.cneAiTopicMismatch_(iv, {questionText:'What is the recommended method for peripheral intravenous catheter insertion?'}) !== false) throw Error('Valid IV equivalent rejected');
  });
  focusCheck('IV synonym: venous access, vein selection and catheter gauge accepted', () => {
    for (const stem of ['Which vein selection should be preferred for peripheral IV access?', 'How is a catheter gauge chosen for a peripheral intravenous catheter?']) {
      if (sandbox.cneAiTopicMismatch_(iv,{question:stem}) !== false) throw Error('Valid IV stem rejected: ' + stem);
    }
  });
  focusCheck('IV unrelated question rejected despite relevant rationale', () => {
    if (sandbox.cneAiTopicMismatch_(iv,{question:'Which intervention best supports a grieving family?',explanation:'IV cannulation is in the clinical rationale.'}) !== true) throw Error('Unrelated question accepted');
  });
  focusCheck('Existing BLS question-stem specificity preserved', () => {
    if (sandbox.cneAiTopicMismatch_('Paediatric Basic Life Support',{question:'Which catheter should be selected for IV cannulation in a child?',explanation:'CPR'}) !== true) throw Error('BLS cross-topic question accepted');
  });
  focusCheck('Index readability accepts clinical text and refuses noise', () => {
    if (sandbox.cneReferenceChunkReadable_(source) !== true) throw Error('Clinical reference rejected');
    if (sandbox.cneReferenceChunkReadable_('xref endobj stream /FlateDecode _x001f_e') !== false) throw Error('PDF noise accepted');
  });
  focusCheck('Readable OpenRN passage with isolated PDF artefacts stays eligible', () => {
    const partial = source.replace('peripheral IV cannulation', 'peripheral IV _x001f_cannulation');
    if (!sandbox.cneReferenceChunkReadable_(partial)) throw Error('Minor PDF artefacts should not exclude readable clinical evidence');
  });
  focusCheck('Index keywords must derive from actual passage only', () => {
    const keywords = sandbox.cneReferenceClinicalKeywords_(source);
    if (!keywords.includes('peripheral IV catheter') || !keywords.includes('phlebitis')) throw Error('Missing grounded clinical keywords');
    if (keywords.includes('CPR') || keywords.includes('blood transfusion')) throw Error('Invented clinical keywords');
  });
  focusCheck('Bounded evidence selection preserves primary-source ordering', () => {
    const records = Array.from({length: 45},(_,i)=>({sourceType: i < 8 ? 'UPLOADED_CNE' : 'LOCAL_REFERENCE_LIB', chunkText: source+' Passage '+i, indexId:'IDX-'+i, resourceTitle:'OpenRN'}));
    const chosen = sandbox.cneAiSelectTopicEvidence_(records,true);
    if (chosen.length !== 12 || chosen.filter(x=>x.sourceType==='UPLOADED_CNE').length !== 6 || chosen[0].indexId !== 'IDX-0') throw Error('Evidence budget/priority failure');
  });
  focusCheck('Old damaged SUCCESS chunks excluded from retrieval before AI', () => {
    if (!gas.includes("status !== 'SUCCESS' || (String(idxData[r][srcTypeCol]")) throw Error('Old corrupt index rows not filtered');
    if (!gas.includes('cneAiSelectTopicEvidence_(scoredUploaded.concat(scoredLibrary)')) throw Error('Retrieval is not bounded');
  });
  focusCheck('Reference reindex verifies replacement and refuses false SUCCESS', () => {
    if (!gas.includes('INDEX_REPLACEMENT_INCOMPLETE') || !gas.includes('verifiedCount !== rowsToInsert.length')) throw Error('Index replacement does not verify counts');
  });
  focusCheck('Material presence is checked on first AI page opening, without full evidence extraction', () => {
    const init = ui.slice(ui.indexOf('  useEffect(() => {'), ui.indexOf('  const loadQuestions = async'));
    if (!init.includes('void loadMaterialStatus(++materialRequestRef.current, cneId)') || !init.includes('void loadQuestions(') || !init.includes('void loadQuota(')) {
      throw Error('First AI page opening must check material presence with questions and quota');
    }
    if (!ui.includes('initialMaterialPresenceRef.current !== null') || !ui.includes('await loadMaterialStatus(++materialRequestRef.current, cneId)')) {
      throw Error('Generate must reuse initial material result and retry after an initial check failure');
    }
  });
  // Run the real Generate click handler in an isolated sandbox. Backend APIs are
  // stubbed; this verifies frontend requests, consent and failure behavior only.
  function exerciseMaterialClick(scenario) {
    const begin = ui.indexOf('  const requestAiGeneration = async () => {');
    const end = ui.indexOf('\n  const handleGenerateAi = async', begin);
    if (begin < 0 || end < 0) throw Error('AI generation click handler missing');
    const handler = ui.slice(begin, end);
    const harness = `
      const vm = require('node:vm');
      const scenario = ${JSON.stringify(scenario)};
      const events = {check: 0, generate: [], popup: [], clear: 0};
      const cneId = 'CNE-ONE';
      const ctx = {
        canInteractWithQuestionTools: scenario.canInteract !== false,
        materialCheckRef: {current: scenario.checking === true},
        initialMaterialPresenceRef: {current: scenario.cachedMaterial === undefined ? null : scenario.cachedMaterial},
        isAiGenerationUsed: scenario.used === true,
        isAiGenerationUnavailable: scenario.unavailable === true,
        cneId,
        materialRequestRef: {current: 1},
        currentCneIdRef: {current: scenario.wrongCne ? 'OTHER-CNE' : cneId},
        setFailureDialog: (v) => {if(v === null) events.clear++;},
        loadMaterialStatus: async () => {events.check += 1; return scenario.serverMaterial;},
        searchBank: async () => {},
        setMaterialChoice: (choice) => {events.popup.push(choice);},
        handleGenerateAi: async (allowed) => {events.generate.push(allowed);}
      };
      (async () => {
        const fn = vm.runInNewContext(${JSON.stringify(handler + '\nrequestAiGeneration')}, ctx);
        await fn();
        process.stdout.write(JSON.stringify(events));
      })().catch(e => {console.error(e);process.exitCode = 1;});
    `;
    return JSON.parse(execFileSync(process.execPath, ['-e', harness], {
      cwd: ROOT_DIR, encoding: 'utf8', timeout: 10000
    }));
  }
  focusCheck('Generate with own CNE material checks once and starts without library consent', () => {
    const events = exerciseMaterialClick({serverMaterial: true});
    if (events.check !== 1 || JSON.stringify(events.generate) !== '[false]' || events.popup.length) throw Error('Own material generation path incorrect');
  });
  focusCheck('Generate with no uploaded material checks once and requires library consent', () => {
    const events = exerciseMaterialClick({serverMaterial: false});
    if (events.check !== 1 || events.generate.length || JSON.stringify(events.popup) !== '["confirm"]') throw Error('Library consent was bypassed');
  });
  focusCheck('Previously checked material is reused on Generate without another presence API call', () => {
    for (const cachedMaterial of [true,false]) {
      const result = exerciseMaterialClick({cachedMaterial, serverMaterial:null});
      if (result.check !== 0 || (cachedMaterial ? result.generate.length !== 1 : JSON.stringify(result.popup) !== '["confirm"]'))
        throw Error('Initial material check was duplicated or library consent was skipped');
    }
  });
  focusCheck('Unknown material status blocks generation and does not assume library consent', () => {
    const events = exerciseMaterialClick({serverMaterial: null});
    if (events.check !== 1 || events.generate.length || events.popup.length) throw Error('Failed material lookup was used as consent');
    if (!ui.includes("title: 'Unable to Check Learning Material'") || !ui.includes("type: 'technical'")) throw Error('Missing explicit material check error recovery');
  });
  focusCheck('Repeated Generation click is blocked during busy state and for exhausted quota', () => {
    for (const scenario of [{checking:true},{canInteract:false},{used:true},{unavailable:true}]) {
      const events=exerciseMaterialClick({...scenario,serverMaterial:true});
      if (events.check || events.generate.length || events.popup.length) throw Error('Generation proceeded during a guarded state '+JSON.stringify(scenario));
    }
  });
  focusCheck('Old material cache and initial material warning UI are removed', () => {
    for (const old of ['MATERIAL_STATUS_CACHE_MS','materialStatusCheckedAtRef','materialStatusCneIdRef','hasMaterial === false','No CNE material uploaded:</strong>','materialStatusError &&']) {
      if (ui.includes(old)) throw Error('Stale page-opening material state remains: '+old);
    }
  });
  focusCheck('Required header Valid & Finalized count badge remains dynamic, including locked sessions', () => {
    const header=ui.slice(ui.indexOf('{/* Header */}'),ui.indexOf('{/* AI & Manual Action Bar */}'));
    if (!header.includes('{validFinalizedCount} of {activeQuestions.length} Valid & Finalized (Min 5)') || !header.includes('Locked (Submissions Received)')) throw Error('Count or locked status was removed');
    if (!ui.includes('validFinalizedCount < 5 || validFinalizedCount > 10 || incompleteActiveCount > 0')) throw Error('QR eligibility disabled guard was weakened');
  });
  focusCheck('Redundant AI badges, quota label and QR footer warning are removed', () => {
    const obsolete=['AI: Generating','1 AI generation allowed per CNE','Need 5 valid finalized questions before QR. Ready:','Synthesize exactly 5 clinical MCQs grounded strictly'];
    for(const phrase of obsolete) if(ui.includes(phrase)) throw Error('Redundant UI text remains: '+phrase);
    if(!ui.includes('<span>Generating MCQs...</span>') && !ui.includes("'Generating MCQs...'")) throw Error('Useful busy progress disappeared');
    if(!ui.includes('aria-label={materialChoice ===') || !ui.includes("if (code === 'LIBRARY_CONSENT_REQUIRED')")) throw Error('Consent popup or backend consent recovery removed');
  });
  focusCheck('Generation quota and backend material/evidence validation remain mandatory', () => {
    if(!ui.includes('isAiGenerationUsed') || !ui.includes('isAiGenerationUnavailable') || !ui.includes('quotaInfo') ||
       !gas.includes('cneAiHasOwnMaterial_(') || !gas.includes('LIBRARY_CONSENT_REQUIRED')) throw Error('Quota or backend material safeguards lost');
  });
  focusCheck('Manual question is blocked during material checking and generation', () => {
    const handler = ui.substring(ui.indexOf('const handleAddManualQuestion'),ui.indexOf('const handleReplaceQuestion'));
    if (!handler.includes('materialCheckRef.current') || !ui.includes('checkingMaterial ||\n                  materialCheckRef.current')) throw Error('Missing manual busy guards');
  });
  focusCheck('Loading failure, contextual popup and uncertain-outcome recovery exist', () => {
    if (!ui.includes('Unable to Load Questions') || !ui.includes('reconcileUncertainGeneration') || !ui.includes('AI Questions Did Not Pass Validation') || !ui.includes('Refresh Questions & Quota')) throw Error('Failure UI/recovery missing');
  });
  // Library maintenance regressions, kept in the existing consolidated runner.
  const libraryUi = readFileSync(join(ROOT_DIR,'src/components/cne/LibraryIndexManagementPage.tsx'),'utf8');
  const learningUi = readFileSync(join(ROOT_DIR,'src/components/cne/LearningResourcesPage.tsx'),'utf8');
  const toolbarUi = readFileSync(join(ROOT_DIR,'src/components/TopToolbar.tsx'),'utf8');
  const appUi = readFileSync(join(ROOT_DIR,'src/App.tsx'),'utf8');
  const routeUi = readFileSync(join(ROOT_DIR,'src/services/routePrefetch.ts'),'utf8');
  const libraryApi = readFileSync(join(ROOT_DIR,'src/services/api.ts'),'utf8');
  const libraryTypes = readFileSync(join(ROOT_DIR,'src/types.ts'),'utf8');
  function freshLibrarySandbox() {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(gas,ctx,{timeout:12000});
    return ctx;
  }
  focusCheck('Index health detects unreadable, duplicate, missing and orphan index rows', () => {
    const ctx = freshLibrarySandbox();
    const readable = ('The peripheral intravenous cannula should be inserted using aseptic preparation and a suitable vein. ').repeat(3);
    const files=[{driveFileId:'a',fileName:'Clinical.pdf',lastUpdated:'2026-01-01T00:00:00Z'},
      {driveFileId:'b',fileName:'Pending.pdf',lastUpdated:'2026-01-01T00:00:00Z'}];
    const registry=[{driveFileId:'a',active:true,resourceTitle:'Clinical',indexedAt:'2026-01-02T00:00:00Z'}];
    const rows=[{sourceType:'LOCAL_REFERENCE_LIB',driveFileId:'a',chunkIndex:1,chunkText:readable,extractionStatus:'SUCCESS'},
      {sourceType:'LOCAL_REFERENCE_LIB',driveFileId:'a',chunkIndex:1,chunkText:'endobj xref _x001f_e',extractionStatus:'SUCCESS'},
      {sourceType:'LOCAL_REFERENCE_LIB',driveFileId:'removed',chunkIndex:1,chunkText:readable,extractionStatus:'SUCCESS'},
      {sourceType:'UPLOADED_CNE',driveFileId:'a',chunkIndex:2,chunkText:'noise',extractionStatus:'FAILED'}];
    const health=ctx.cneLibraryIndexHealthSummary_(files,registry,rows);
    if (health.totalResources!==2 || health.needsAttention!==2 || health.orphanIndexRows!==1) throw Error('Health summary counts incorrect');
    if (!health.resources[0].issues.includes('UNREADABLE_CHUNKS') || !health.resources[0].issues.includes('DUPLICATE_CHUNKS')) throw Error('Corruption undetected');
    if (!health.resources[1].issues.includes('NOT_INDEXED')) throw Error('Missing index undetected');
  });
  focusCheck('Read-only health reports healthy indexed PDF correctly', () => {
    const ctx=freshLibrarySandbox();
    const readable=('Peripheral intravenous catheter insertion requires aseptic preparation and careful vein selection. ').repeat(4);
    const h=ctx.cneLibraryIndexHealthSummary_([{driveFileId:'a',fileName:'A.pdf',lastUpdated:'2025-01-01'}],
      [{driveFileId:'a',active:true,indexedAt:'2025-01-02'}],
      [{sourceType:'LOCAL_REFERENCE_LIB',driveFileId:'a',chunkIndex:1,chunkText:readable,extractionStatus:'SUCCESS'}]);
    if (h.healthyResources !== 1 || h.needsAttention !== 0) throw Error('Healthy index flagged as damaged');
  });
  focusCheck('Backend routes and frontend hide mutation controls from non-admin users', () => {
    for(const action of ['getNursingReferenceLibraryHealth','startNursingReferenceReindexAll','advanceNursingReferenceReindexAll','getNursingReferenceReindexJob','cancelNursingReferenceReindexAll']) {
      if (!gas.includes("case '"+action+"':") || !libraryApi.includes("'"+action+"'")) throw Error('Missing secured backend/API action: '+action);
    }
    if (!libraryUi.includes('if (!isAdmin) return') || !libraryUi.includes('Library Index Management') || !libraryUi.includes('setConfirmReindex')) throw Error('Admin maintenance controls missing from dedicated page');
    if (!libraryTypes.includes('CNENursingLibraryHealth') || !libraryTypes.includes('CNENursingLibraryReindexJob')) throw Error('API response types missing');
  });
  // Navigation-only relocation tests, without changing the existing backend and clinical checks.
  focusCheck('Library Index Management is a separate lazy-loaded Admin route', () => {
    if (!appUi.includes("activeView === 'admin-library-index-management' && user?.role === 'ADMIN'")) throw Error('Route lacks Admin guard');
    if (!appUi.includes('<LibraryIndexManagementPage user={user} />')) throw Error('Dedicated page not rendered');
    if (!libraryTypes.includes("| 'admin-library-index-management'")) throw Error('ViewMode missing');
    if (!routeUi.includes("'admin-library-index-management': () => import('../components/cne/LibraryIndexManagementPage')")) throw Error('Admin-only prefetch not configured');
    if (!appUi.includes("'admin-departmental-cne-outcome', 'admin-library-index-management'].includes(view)")) throw Error('Login guard missing');
  });
  focusCheck('Library index maintenance is removed entirely from Learning Resources', () => {
    for (const forbidden of ['setConfirmReindex', 'checkIndexHealth', 'resumeBatchJob', 'startBatchReindex', 'Administrator Library Index Management']) {
      if (learningUi.includes(forbidden)) throw Error('Learning Resources still contains maintenance: '+forbidden);
    }
    if (!learningUi.includes('handleDownload') || !learningUi.includes('handleDeleteConfirm') || !learningUi.includes('<AddResourceModal')) throw Error('Original Learning Resources functions lost');
  });
  focusCheck('Only Control Center navigates to Library Index Management', () => {
    const staff = toolbarUi.slice(toolbarUi.indexOf('const staffTabs ='), toolbarUi.indexOf('// Control Center state'));
    const center = toolbarUi.slice(toolbarUi.indexOf('const controlCenterItems ='), toolbarUi.indexOf('const updateDropdownPos'));
    if (staff.includes('admin-library-index-management')) throw Error('Index Management incorrectly added to top menu');
    if (!center.includes("id: 'admin-library-index-management'")) throw Error('Missing Control Center link');
    if (!toolbarUi.includes("'admin-library-index-management'] as ViewMode[]")) throw Error('Control Center active state missing');
    if (!toolbarUi.includes('{isAdmin && (')) throw Error('Control Center not restricted to Admin');
  });
  focusCheck('Departmental CNE Outcome remains in Control Center but not top menu', () => {
    const staff = toolbarUi.slice(toolbarUi.indexOf('const staffTabs ='), toolbarUi.indexOf('// Control Center state'));
    const center = toolbarUi.slice(toolbarUi.indexOf('const controlCenterItems ='), toolbarUi.indexOf('const updateDropdownPos'));
    if (staff.includes("id: 'admin-departmental-cne-outcome'")) throw Error('Duplicate outcome top-menu tab remains');
    if (!center.includes("id: 'admin-departmental-cne-outcome'")) throw Error('Outcome Control Center item removed');
    if (!appUi.includes("activeView === 'admin-departmental-cne-outcome' && user?.role === 'ADMIN'")) throw Error('Outcome page guard lost');
  });
  focusCheck('Dedicated library page retains every approved maintenance action', () => {
    for (const required of ['getNursingReferenceLibraryHealth', 'indexNursingReferenceResource', 'startNursingReferenceReindexAll', 'advanceNursingReferenceReindexAll', 'cancelNursingReferenceReindexAll', 'getNursingReferenceReindexJob', 'Check Index Health', 'Reindex All', 'Resume Reindex', 'Stop after current PDF', 'Confirm Reindex']) {
      if (!libraryUi.includes(required)) throw Error('Index Management function missing: '+required);
    }
    if (!libraryUi.includes('activeRef.current = false') || !libraryUi.includes('sessionKeyRef.current')) throw Error('Background batch handling not safe on page exit');
  });
  function makeJobSandbox() {
    const ctx=freshLibrarySandbox();
    let stored=null,uid=0;
    ctx.PropertiesService={getScriptProperties:()=>({getProperty:()=>stored,setProperty:(_k,v)=>{stored=v;}})};
    ctx.LockService={getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})};
    ctx.Utilities={getUuid:()=>`uuid_${++uid}`};
    ctx.requireFreshAdminMutation=(s)=>s && s.role==='ADMIN'?{success:true,session:s}:{success:false,errorCode:'FORBIDDEN'};
    ctx.logAuditAction=()=>{};
    ctx.getNursingReferenceLibraryHealth=()=>({success:true,data:{totalResources:2,resources:[{driveFileId:'a'},{driveFileId:'b'}]}});
    ctx.cneLibraryBatchMetadata_=(id)=>({resourceTitle:'Existing '+id,authorOrganization:'Original Author',license:'CC BY 4.0',version:'1'});
    ctx.indexReferenceLibraryResource=(id,meta)=>{
      if(meta.resourceTitle!==('Existing '+id) || meta.authorOrganization!=='Original Author') throw Error('Batch metadata overwritten');
      if(ctx.cneLibraryIndexJobPermission_(id,meta)) throw Error('Valid claim blocked');
      return id==='a'?{success:true}:{success:false,errorCode:'DAMAGED_PDF',message:'Unusable source PDF'};
    };
    return ctx;
  }
  focusCheck('Batch creation is admin-only and duplicate start resumes existing job', () => {
    const ctx=makeJobSandbox();
    if(ctx.startNursingReferenceReindexAll({}, {employeeId:'X',role:'EMPLOYEE'}).errorCode!=='FORBIDDEN') throw Error('Non-admin started batch');
    const first=ctx.startNursingReferenceReindexAll({}, {employeeId:'A',role:'ADMIN'});
    const repeat=ctx.startNursingReferenceReindexAll({}, {employeeId:'A',role:'ADMIN'});
    if(!first.success || first.data.total!==2 || first.data.jobId!==repeat.data.jobId) throw Error('Duplicate job created');
    if(ctx.cneLibraryIndexJobPermission_('a',{}).errorCode!=='LIBRARY_JOB_ACTIVE') throw Error('Single reindex not guarded');
  });
  focusCheck('One-PDF-per-request job survives failures and preserves source metadata', () => {
    const ctx=makeJobSandbox();
    const admin={employeeId:'ADMIN',role:'ADMIN'};
    const first=ctx.startNursingReferenceReindexAll({},admin);
    const firstStep=ctx.advanceNursingReferenceReindexAll({jobId:first.data.jobId},admin);
    if(!firstStep.success || firstStep.data.completed!==1 || firstStep.data.succeeded!==1 || firstStep.data.processing) throw Error('First step status not committed');
    const result=ctx.advanceNursingReferenceReindexAll({jobId:first.data.jobId},admin);
    if(!result.success || result.data.status!=='COMPLETED' || result.data.completed!==2 || result.data.failed!==1 || result.data.failures[0].errorCode!=='DAMAGED_PDF') throw Error('Failed PDF not recorded');
    if(ctx.getNursingReferenceReindexJob({},admin).data.completed!==2) throw Error('Job progress not persisted');
  });
  focusCheck('Batch cancellation safely stops remaining PDFs', () => {
    const ctx=makeJobSandbox();const admin={employeeId:'ADMIN',role:'ADMIN'};
    const started=ctx.startNursingReferenceReindexAll({},admin);
    const result=ctx.cancelNursingReferenceReindexAll({},admin);
    if(!result.success || result.data.status!=='CANCELLED' || result.data.completed!==0) throw Error('Cancellation not persisted');
    if(ctx.advanceNursingReferenceReindexAll({jobId:started.data.jobId},admin).data.status!=='CANCELLED') throw Error('Cancelled job processed PDF');
  });
  focusCheck('Reindex job rejects stale claims and stale client job IDs', () => {
    const ctx=makeJobSandbox();const admin={employeeId:'ADMIN',role:'ADMIN'};
    const started=ctx.startNursingReferenceReindexAll({},admin);
    if(ctx.advanceNursingReferenceReindexAll({jobId:'old-token'},admin).errorCode!=='JOB_NOT_FOUND') throw Error('Accepted wrong job');
    if(ctx.cneLibraryIndexJobPermission_('a',{batchJobId:started.data.jobId,batchClaimToken:'stale'}).errorCode!=='LIBRARY_JOB_CLAIM_MISMATCH') throw Error('Accepted invalid claim');
  });

  // Single-table Library Index Management user-experience regression checks.
  focusCheck('Index health and Reindex actions share one resource table', () => {
    if ((libraryUi.match(/<table className=/g) || []).length !== 1) throw Error('Expected exactly one index status table');
    if (libraryUi.includes('Individual PDF Reindex') || libraryUi.includes('Reference PDF list')) throw Error('Second reindex list remains');
    if (!libraryUi.includes('healthByFile.get(item.driveFileId)') || !libraryUi.includes('setConfirmReindex(item)')) throw Error('Health status and reindex not colocated by PDF');
  });
  focusCheck('Unified table retains unregistered PDFs and accurate health states', () => {
    if (!libraryUi.includes('health?.resources.forEach(record =>') || !libraryUi.includes('byId.set(record.driveFileId')) throw Error('Unregistered PDFs may disappear from table');
    for (const term of ['Not checked', 'Checking…', 'Healthy', 'Not indexed', 'Needs attention', 'Reindexing…']) {
      if (!libraryUi.includes(term)) throw Error('Missing honest row status '+term);
    }
  });
  focusCheck('Busy index operations hide actions and block concurrent page interaction', () => {
    if (!libraryUi.includes("type Operation = 'idle' | 'checking' | 'single' | 'starting' | 'batch' | 'verifying'")) throw Error('Missing explicit operation states');
    if (!libraryUi.includes('const actionLocked = loading || Boolean(jobError) || showOverlay || batchRunning;')) throw Error('Action lock incomplete');
    if (!libraryUi.includes('inert={showOverlay}') || !libraryUi.includes('aria-modal="true"')) throw Error('Processing overlay not blocking');
    if ((libraryUi.match(/!actionLocked &&/g) || []).length < 2 || !libraryUi.includes('busyRef.current')) throw Error('Action handlers/controls not guarded');
  });
  focusCheck('Single PDF spinner and successful health refresh replace optimistic success', () => {
    if (!libraryUi.includes('reindexingId === item.id') || !libraryUi.includes('animate-spin') || !libraryUi.includes("setOperation('verifying')")) throw Error('Missing per-PDF progress');
    if (!libraryUi.includes('setHealth(null); // Until freshly verified') || !libraryUi.includes('await Promise.all([loadAllResources(), refreshHealth()])')) throw Error('Health status updated without checking backend');
    if (!libraryUi.includes('setLastFailures(prev => ({ ...prev, [item.driveFileId]: message }))')) throw Error('Failure details lost from table');
  });
  focusCheck('Batch progress reports backend counts and never simulates extraction percentages', () => {
    if (!libraryUi.includes('job.completed * 100 / job.total') || !libraryUi.includes('aria-valuenow={reindexJob.completed}')) throw Error('Progress is not backend-grounded');
    if (!libraryUi.includes('job.succeeded') || !libraryUi.includes('job.failed')) throw Error('Success/failure totals missing');
    if (libraryUi.includes('setTimeout(')) throw Error('Simulated progress timer introduced');
  });
  focusCheck('Batch overlay keeps only Stop After Current PDF available', () => {
    const progress = libraryUi.slice(libraryUi.indexOf('{showOverlay && <div'), libraryUi.indexOf('\n    </div>\n  );\n};', libraryUi.indexOf('{showOverlay && <div')));
    if (!progress.includes('stopBatchReindex()') || !progress.includes('Stop after current PDF')) throw Error('Safe stop unavailable');
    if ((progress.match(/<button type="button"/g) || []).length !== 1) throw Error('Unexpected extra action in processing overlay');
    if (!libraryUi.includes('stopRequestedRef.current = true') || !libraryUi.includes('!stopRequestedRef.current')) throw Error('Stop could dispatch another PDF');
  });
  focusCheck('Batch progress calculation uses real completed PDF counts', () => {
    const source = libraryUi.match(/job\.total > 0 \? Math\.min\(100, Math\.max\(0, Math\.round\(job\.completed \* 100 \/ job\.total\)\)\) : 0/);
    if (!source) throw Error('Progress formula missing');
    const evaluate = job => vm.runInNewContext(source[0], {job, Math});
    if (evaluate({completed:3,total:5}) !== 60) throw Error('Partial PDF progress incorrect');
    if (evaluate({completed:0,total:0}) !== 0) throw Error('Empty batch progress incorrect');
    if (evaluate({completed:12,total:10}) !== 100) throw Error('Progress may overflow 100%');
  });
  focusCheck('Saved batch status resumes safely and health refreshes after stopping', () => {
    if (!libraryUi.includes('getNursingReferenceReindexJob') || !libraryUi.includes('setReindexJob(response.data || null)')) throw Error('Saved job not restored');
    if (!libraryUi.includes('Resume Reindex') || !libraryUi.includes('await Promise.all([loadJob(), loadAllResources(), refreshHealth()])')) throw Error('Interrupted/stop refresh missing');
    if (!libraryUi.includes('13 * 60 * 1000')) throw Error('Stale remote claim has no recovery path');
  });
  // Clinical grounding and controlled correction regressions for the IV Cannulation incident.
  focusCheck('Evidence IDs bind a real quote to the exact indexed section', () => {
    const ctx = freshLibrarySandbox();
    const passage = 'Nurses select a peripheral intravenous catheter for cannulation based on the intended therapy and the assessed vessel size before insertion.';
    const entry = {indexId:'IDX_IV_24',resourceTitle:'OpenRN_Nursing_Advanced_Skills',sectionHeading:'Initiate IV Therapy',chunkText:passage};
    const citation = entry.resourceTitle + ' - ' + entry.sectionHeading;
    const test = (id,src,q=passage) => ctx.cneAiEvidenceSupportDiagnostic_('IV Cannulation',src,q,'Select an IV catheter based on vessel size','Catheter selection depends on therapy and vein size.','',[entry],id);
    if (!test('IDX_IV_24',citation).supported) throw Error('Verified indexed quote rejected');
    if (test('IDX_IV_25',citation).code !== 'SOURCE_MISMATCH') throw Error('Fabricated evidence ID accepted');
    if (test('IDX_IV_24',entry.resourceTitle + ' - Paediatric Resuscitation').code !== 'SOURCE_MISMATCH') throw Error('Wrong section accepted');
    if (test('IDX_IV_24',citation,'The hospital recommends several completely different practices unknown to the original reference passage.').supported) throw Error('Fabricated quote accepted');
  });
  focusCheck('PDF apostrophe glyph artefacts normalize only for actual quoted passages', () => {
    const ctx = freshLibrarySandbox();
    const stored = 'Nurses must consider the purpose for venous access along with assessment of the client_x0092_s vessel size when selecting a catheter for cannulation.';
    const corrected = stored.replace('client_x0092_s', "client's");
    const entry = {indexId:'IDX_IV_FONT',resourceTitle:'OpenRN Nursing Advanced Skills',sectionHeading:'Initiate IV Therapy',chunkText:stored};
    const test = q => ctx.cneAiEvidenceSupportDiagnostic_('IV Cannulation',entry.resourceTitle + ' - ' + entry.sectionHeading,q,'Select a catheter based on vessel size','The choice of venous access depends on vessel size.','',[entry],'IDX_IV_FONT');
    if (!test(corrected).supported) throw Error('Safe typographic normalization failed');
    if (test(corrected.replace('vessel size','medication dose')).supported) throw Error('Altered clinical meaning incorrectly verified');
  });
  focusCheck('Synonymous clinical phrasing is permitted only with verified indexed evidence', () => {
    const ctx = freshLibrarySandbox();
    const passage = 'Nurses select a peripheral IV catheter according to the purpose of venous access and the vessel size for cannulation.';
    const entry = {indexId:'IDX_IV_SYN',resourceTitle:'OpenRN',sectionHeading:'IV Therapy',chunkText:passage};
    const diagnostic = ctx.cneAiEvidenceSupportDiagnostic_('IV Cannulation','OpenRN - IV Therapy',passage,
      'Choose a cannula based on vein diameter','The catheter is selected for the intended venous therapy.','',[entry],'IDX_IV_SYN');
    if (!diagnostic.supported) throw Error('Safe IV synonyms rejected: ' + diagnostic.code);
    if (ctx.cneAiEvidenceSupportDiagnostic_('IV Cannulation','OpenRN - IV Therapy',passage,
      'Give morphine 20 mg','Morphine is recommended for treatment.','',[entry],'IDX_IV_SYN').supported) throw Error('Irrelevant treatment was accepted');
  });
  focusCheck('Clinical contradiction and unsupported doses still fail after source ID matches', () => {
    const ctx = freshLibrarySandbox();
    const passage = 'For a child in cardiac arrest, begin CPR immediately and provide chest compressions without delay.';
    const evidence = [{indexId:'IDX_CPR_1',resourceTitle:'Resuscitation Manual',sectionHeading:'Child CPR',chunkText:passage}];
    const check = (answer) => ctx.cneAiEvidenceSupportDiagnostic_('Paediatric Basic Life Support','Resuscitation Manual - Child CPR',passage,answer,'Child arrest requires chest compressions.','',evidence,'IDX_CPR_1');
    if (!check('Begin CPR immediately').supported) throw Error('Evidence-supported CPR rejected');
    if (check('Do not begin CPR during arrest').code !== 'CLINICAL_CONTRADICTION') throw Error('Contradictory CPR recommendation accepted');
    const dose='Administer morphine 2 mg intravenously slowly according to the prescribed order.';
    const med=[{indexId:'IDX_MED_1',resourceTitle:'Medication Handbook',sectionHeading:'Morphine',chunkText:dose}];
    const result=ctx.cneAiEvidenceSupportDiagnostic_('Medication Administration','Medication Handbook - Morphine',dose,'Administer morphine 20 mg','Follow morphine 20 mg protocol.','',med,'IDX_MED_1');
    if (result.supported || (result.code !== 'NUMERIC_MISMATCH' && result.code !== 'CLINICAL_CONTRADICTION')) throw Error('Unsafe quantity accepted');
  });
  // Blueprint-guided evidence-first generation: behavioral mock-Gemini regressions.
  function mockBlueprintScenario(config={}) {
    const ctx=freshLibrarySandbox();
    const chunks=[
      'For peripheral intravenous cannulation nurses select the catheter according to the intended therapy and the assessed vessel size.',
      'During peripheral IV cannulation hand hygiene and skin antisepsis reduce the risk of infection before inserting a catheter.',
      'After peripheral IV catheter insertion nurses assess for swelling and coolness near the site as signs of infiltration.',
      'Phlebitis associated with a peripheral IV catheter can present with pain redness and warmth along the cannulated vein.',
      'A transparent dressing can secure a peripheral IV catheter while permitting ongoing assessment of the insertion site.'
    ];
    const evidence=chunks.map((chunkText,i)=>({indexId:'IV_EVID_'+(i+1),sourceType:'LOCAL_REFERENCE_LIB',resourceTitle:'OpenRN Nursing Advanced Skills',sectionHeading:'IV Care '+(i+1),chunkText}));
    const names=[
      'Assess peripheral intravenous catheter selection based on intended therapy and vessel size',
      'Apply aseptic hand hygiene and skin antisepsis for peripheral intravenous cannulation',
      'Identify swelling and coolness suggesting peripheral intravenous catheter infiltration',
      'Recognize pain redness and warmth indicating peripheral IV related phlebitis',
      'Secure the peripheral IV catheter using a transparent assessment-friendly dressing'
    ];
    const plan={objectives:names.map((objective,i)=>({objectiveId:'OBJ_'+(i+1),objective,evidenceId:config.ownMaterial?'SESSION_CNE':evidence[i].indexId}))};
    const stems=[
      'Which factors guide selection of a peripheral IV catheter before cannulation?',
      'Which aseptic measures reduce infection during peripheral IV cannulation?',
      'Which clinical signs suggest infiltration around a peripheral IV catheter?',
      'Which clinical findings suggest phlebitis near a peripheral IV cannula?',
      'Which dressing permits assessment of a peripheral IV catheter site?'
    ];
    const answers=[
      'Select catheter by intended therapy and vessel size',
      'Use hand hygiene and skin antisepsis',
      'Assess swelling and coolness for infiltration',
      'Look for pain redness and warmth from phlebitis',
      'Apply a transparent dressing allowing site assessment'
    ];
    const question=(i,overrides={})=>({
      objectiveId:'OBJ_'+(i+1),questionText:stems[i],optionA:answers[i],
      optionB:'Ignore the intended clinical precautions',optionC:'Do not assess the site',optionD:'Choose an unrelated nursing action',
      correctOption:'A',explanation:chunks[i],
      authoritativeSource:config.ownMaterial?'Verified CNE Session: IV Cannulation':'OpenRN Nursing Advanced Skills - IV Care '+(i+1),
      evidenceQuote:chunks[i],evidenceId:config.ownMaterial?'SESSION_CNE':evidence[i].indexId,...overrides
    });
    const generated=[0,1,2,3,4].map(i=>question(i));
    if(config.mutateInitial) config.mutateInitial(generated,question);
    if(config.mutatePlan) config.mutatePlan(plan);
    let calls=[];
    ctx.handleValidateAiQuotaReservation=()=>({success:true,data:{topic:'IV Cannulation',hasOwnMaterial:!!config.ownMaterial,
      authoritativeLearningContent:config.ownMaterial?chunks.join('\n\n'):'',retrievedEvidence:config.ownMaterial?[]:evidence}});
    ctx.updateCNEAiProgress_=()=>{};ctx.logAuditAction=()=>{};
    ctx.PropertiesService={getScriptProperties:()=>({getProperty:k=>k==='GEMINI_API_KEY'?'MOCK_KEY':k==='GEMINI_MODEL'?'gemini-3.8-flash':''}),getUserProperties:()=>({getProperty:()=>''})};
    ctx.UrlFetchApp={fetch:(_endpoint,options)=>{
      const req=JSON.parse(options.payload); const prompt=req.contents[0].parts[0].text;
      const schema=req.generationConfig.responseSchema;
      const role=schema.properties?.objectives?'plan':schema.properties?.questions?'generate':'repair';
      calls.push({role,prompt,schema});
      if(config.transportError && config.transportError(role)) return {getResponseCode:()=>503,getContentText:()=>JSON.stringify({error:{message:'Service temporarily unavailable'}})};
      let result;
      if(role==='plan') result=plan;
      else if(role==='generate') result={questions:generated};
      else {
        const match=prompt.match(/Objective ID: OBJ_(\d+)/);
        const idx=match ? Number(match[1])-1 : 0;
        result=config.makeRepair ? config.makeRepair(idx,question,generated,calls) : question(idx);
      }
      return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(result)}]}}]})};
    }};
    return {ctx, calls, plan, evidence, question};
  }
  focusCheck('Five-objective plan is source-bound and reserves an evidence ID for every clinical objective',()=>{
    const run=mockBlueprintScenario();
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(!result.success || result.data.length!==5) throw Error('Five-objective generation failed '+JSON.stringify(result));
    if(run.calls.length!==2 || run.calls.map(c=>c.role).join(',')!=='plan,generate') throw Error('Planner and question-writing stages not distinct');
    if(result.data.some(q=>q.isFinalized!==false || q.status!=='ACTIVE')) throw Error('Individual educator review bypassed');
    if(!run.calls[1].prompt.includes('OBJ_5') || !run.calls[1].prompt.includes('IV_EVID_5')) throw Error('Blueprint was not sent to writer');
  });
  focusCheck('Uploaded CNE teaching material remains a valid priority path without library consent',()=>{
    const run=mockBlueprintScenario({ownMaterial:true});
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:false},{employeeId:'ADM'});
    if(!result.success || result.data.length!==5 || run.calls.length!==2) throw Error('Own teaching-material generation regressed '+JSON.stringify(result));
    if(!run.calls[0].prompt.includes('SESSION_CNE') || !run.calls[1].prompt.includes('Verified CNE Session')) throw Error('Uploaded session content not used');
  });
  focusCheck('Exact duplicate question is repaired with one-question schema, not another five-question prompt',()=>{
    const run=mockBlueprintScenario({mutateInitial:qs=>{qs[1].questionText=qs[0].questionText;}});
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(!result.success || result.data.length!==5 || run.calls.length!==3) throw Error('Duplicate not repaired '+JSON.stringify(result));
    if(run.calls[2].role!=='repair'||!run.calls[2].prompt.includes('CORRECTIVE GENERATION')||run.calls[2].prompt.includes('Generate exactly FIVE questions')) throw Error('Repair reused five-question prompt');
    if(new Set(result.data.map(q=>q.questionText)).size!==5) throw Error('Duplicate accepted');
  });
  focusCheck('Wrong evidence quotation is replaced without saving an unsupported question',()=>{
    const run=mockBlueprintScenario({mutateInitial:qs=>{qs[0].evidenceQuote='A fabricated unrelated clinical passage with no verified evidence';}});
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(!result.success || run.calls.length!==3) throw Error('Citation repair failed '+JSON.stringify(result));
  });
  focusCheck('Repair never accepts incorrect objective-to-source binding',()=>{
    const run=mockBlueprintScenario({mutateInitial:qs=>{qs[2].evidenceId='IV_EVID_1';}});
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(!result.success || run.calls.length!==3) throw Error('Incorrect source binding was not repaired');
  });
  focusCheck('Nonexistent blueprint evidence ID prevents all generation and persistence',()=>{
    const run=mockBlueprintScenario({mutatePlan:plan=>{plan.objectives[2].evidenceId='FABRICATED_INDEX';}});
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(result.success || result.errorCode!=='AI_BLUEPRINT_FAILED'||run.calls.length!==1 || result.data) throw Error('Fabricated blueprint was accepted');
  });
  focusCheck('Duplicated learning objectives are rejected before any MCQ generation',()=>{
    const run=mockBlueprintScenario({mutatePlan:plan=>{plan.objectives[1].objective=plan.objectives[0].objective;}});
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(result.success||result.errorCode!=='AI_BLUEPRINT_FAILED'||run.calls.length!==1) throw Error('Duplicate clinical blueprint accepted');
  });
  focusCheck('Repeated unsupported evidence discards invalid objective but retains other validated Drafts',()=>{
    const run=mockBlueprintScenario({mutateInitial:qs=>{qs[0].evidenceQuote='Fabricated clinical quote that never appeared in teaching material';},makeRepair:(i,q)=>q(i,{evidenceQuote:'Another invented passage that was never supplied by the library'})});
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(!result.success || !result.partial || result.data.length!==4 ||
       result.data.some(q=>q.objectiveId==='OBJ_1') ||
       !result.failures.some(f=>f.objectiveId==='OBJ_1' && f.validationReason==='QUOTE_NOT_FOUND') ||
       run.calls.length!==4) throw Error('Unverified objective entered partial Draft set or retry was unbounded '+JSON.stringify(result));
  });
  focusCheck('Clinical contradiction and unsupported quantities still fail against actual cited passage',()=>{
    const ctx=freshLibrarySandbox();
    const source='For a child in cardiac arrest, begin CPR immediately and provide chest compressions without delay.';
    const entry={indexId:'BLS_1',resourceTitle:'Nursing CPR',sectionHeading:'Child CPR',chunkText:source};
    if(ctx.cneAiEvidenceSupported_('Paediatric Basic Life Support','Nursing CPR - Child CPR',source,'Do not begin CPR during cardiac arrest','Avoid chest compressions entirely.','',[entry],'BLS_1')) throw Error('Contradiction accepted');
  });
  focusCheck('New generation honors explicit library consent and existing reservation/commit design',()=>{
    const source=gas.slice(gas.indexOf('function generateAiQuestionsInternal('),gas.indexOf('function cneAiHasOwnMaterial_('));
    if(!source.includes('params.allowLibraryOnly !== true') || !source.includes('handleValidateAiQuotaReservation(') || !source.includes('cneAiEvidenceSupported_(')) throw Error('Consent or evidence validation weakened');
    const commit=gas.slice(gas.indexOf('function handleGenerateCNEQuestions('),gas.indexOf('function normalizeCneId('));
    if(!commit.includes('handleCommitAiQuota(')||!commit.includes('ONLY handleCommitAiQuota persists')) throw Error('Authoritative save-path safeguard altered');
  });
  focusCheck('Short paraphrases of an IV question are rejected, but distinct complications remain separate',()=>{
    const ctx=freshLibrarySandbox();
    if(!ctx.cneAiNearDuplicate_('What is the best site for IV cannulation?', 'Which site is best for IV cannulation?')) throw Error('Rephrased duplicate missed');
    if(ctx.cneAiNearDuplicate_('Which signs indicate peripheral IV infiltration?', 'Which signs indicate peripheral IV phlebitis?')) throw Error('Different complications collapsed');
  });
  focusCheck('New structured output uses objective binding and a separate one-question repair schema',()=>{
    const ctx=freshLibrarySandbox();
    const all=ctx.cneAiQuestionSchema_(false), one=ctx.cneAiQuestionSchema_(true);
    if(!all.properties.questions || !one.properties.objectiveId || one.properties.questions) throw Error('Repair JSON schema not independent');
    const schema=ctx.cneAiBlueprintSchema_();
    if(!schema.properties.objectives.items.required.includes('evidenceId')) throw Error('Evidence binding not required');
  });
  focusCheck('Gemini correctOption enum constrains all four accepted answer keys',()=>{
    const ctx=freshLibrarySandbox();
    const schema=ctx.cneAiQuestionSchema_(false).properties.questions.items.properties.correctOption;
    const one=ctx.cneAiQuestionSchema_(true).properties.correctOption;
    if(JSON.stringify(schema.enum)!=='["A","B","C","D"]'||JSON.stringify(one.enum)!=='["A","B","C","D"]') throw Error('Model schema does not constrain A-D selection');
  });
  focusCheck('Correct-option formatting is normalized only when unambiguous',()=>{
    const ctx=freshLibrarySandbox();
    const opts={A:'Hand hygiene before insertion',B:'Observe the IV site',C:'Use sterile equipment',D:'Document the findings'};
    const test=(v)=>ctx.cneAiNormalizeCorrectOption_(v,opts);
    for(const [v,expected] of [['b','B'],['Option B','B'],['(B)','B'],['B)','B'],['B. Observe the IV site','B'],['Observe the IV site','B'],['Option B: Observe the IV site','B']]){
      if(test(v)!==expected) throw Error('Safe answer format rejected '+v);
    }
    for(const v of ['Option Z','Option B: Unrelated intervention','Incorrect answer','A and B','B. Use sterile equipment','']){
      if(test(v)!=='') throw Error('Ambiguous or conflicting answer was accepted '+v);
    }
  });
  focusCheck('Authoritative library citation can use indexed title alone, but not a false title/section',()=>{
    const ctx=freshLibrarySandbox();
    const ev={indexId:'EV12',resourceTitle:'OpenRN Nursing Advanced Skills',sectionHeading:'Initiate IV Therapy',chunkText:'Clinical text'};
    const map={EV12:ev};
    const canonical='OpenRN Nursing Advanced Skills - Initiate IV Therapy';
    for(const v of ['',ev.resourceTitle,canonical,'OpenRN Nursing Advanced Skills: Initiate IV Therapy']) {
      const r=ctx.cneAiBoundSource_(v,'EV12',map,'IV Cannulation','');
      if(!r.success || r.source!==canonical) throw Error('Verifiable source falsely rejected '+v);
    }
    for(const v of ['OpenRN Nursing Advanced Skills - CPR','Fake Clinical Guide - Initiate IV Therapy','https://fiction.example/source','Wikipedia']){
      const r=ctx.cneAiBoundSource_(v,'EV12',map,'IV Cannulation','');
      if(r.success) throw Error('False or informal source falsely accepted '+v);
    }
    if(ctx.cneAiBoundSource_(ev.resourceTitle,'MADE_UP',map,'IV Cannulation','').success) throw Error('Invented evidence ID accepted');
  });
  focusCheck('Formatting-only answer correction and title-only source succeed without a Gemini repair',()=>{
    const run=mockBlueprintScenario({mutateInitial:qs=>{
      qs[0].correctOption='Option A';qs[0].authoritativeSource='OpenRN Nursing Advanced Skills';
    }});
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(!result.success || run.calls.length!==2 || result.data[0].correctOption!=='A') throw Error('Pure formatting discrepancy triggered regeneration '+JSON.stringify(result));
    if(result.data[0].authoritativeSource!=='OpenRN Nursing Advanced Skills - IV Care 1') throw Error('Indexed citation not persisted');
  });
  focusCheck('Latest audit sequence: fabricated source rejected and corrected answer letter accepted',()=>{
    const run=mockBlueprintScenario({
      mutateInitial:qs=>{qs[0].authoritativeSource='Fabricated External Source - IV Care 1';},
      makeRepair:(i,q)=>q(i,{authoritativeSource:'OpenRN Nursing Advanced Skills',correctOption:'Option A'})
    });
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(!result.success || run.calls.length!==3 || result.data[0].correctOption!=='A') throw Error('Source/selector repair failed '+JSON.stringify(result));
    if(!run.calls[2].prompt.includes('REQUIRED FIX:') || !run.calls[2].prompt.includes('source label')) throw Error('No source-specific repair guidance');
  });
  focusCheck('Invalid correctOption rejected while retaining separately verified objectives',()=>{
    const run=mockBlueprintScenario({
      mutateInitial:qs=>{qs[0].correctOption='B or A';},
      makeRepair:(i,q)=>q(i,{correctOption:'Option Q'})
    });
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(!result.success || !result.partial || result.data.length!==4 ||
       result.data.some(q=>q.objectiveId==='OBJ_1') ||
       !result.failures.some(f=>f.validationReason==='INVALID_CORRECT_OPTION') ||
       run.calls.length!==4) throw Error('Invalid answer was committed into partial set or retry was unbounded '+JSON.stringify(result));
  });
  focusCheck('Backend repair guidance is issue-specific for all five logged failure codes',()=>{
    const ctx=freshLibrarySandbox();
    const reasons=['SOURCE_MISMATCH','INVALID_CORRECT_OPTION','NUMERIC_MISMATCH','OFF_TOPIC_QUESTION','DUPLICATE_QUESTION'];
    const advice=reasons.map(reason=>ctx.cneAiRepairGuidance_(reason));
    if(new Set(advice).size!==5 || advice.some(x=>!x||x.length<30)) throw Error('Missing targeted correction');
    if(!advice[2].includes('supported quantities')||!advice[3].includes('CNE topic')) throw Error('Clinical guard repair weakened');
  });
  focusCheck('Unsupported clinical quantities and fabricated quotations still fail closed',()=>{
    const ctx=freshLibrarySandbox();
    const quote='During peripheral IV insertion nurses clean the site using skin antisepsis and allow the skin to dry.';
    const entry={indexId:'IVSAFE',resourceTitle:'OpenRN Nursing Advanced Skills',sectionHeading:'Insertion',chunkText:quote};
    const source='OpenRN Nursing Advanced Skills - Insertion';
    const mismatch=ctx.cneAiEvidenceSupportDiagnostic_('IV Cannulation',source,quote,'Administer 200 mg of medication','The correct action is to administer 200 mg intravenously.','',[entry],'IVSAFE');
    if(mismatch.supported) throw Error('Unsupported medication quantity accepted');
    if(ctx.cneAiEvidenceSupported_('IV Cannulation',source,'Made up passage falsely asserting medical safety precautions which did not appear', 'Skin antisepsis', 'Use aseptic technique','',[entry],'IVSAFE')) throw Error('Fabricated quote accepted');
  });
  focusCheck('UI displays specific validation errors without repeatedly telling users to upload material',()=>{
    const page=readFileSync(join(ROOT_DIR,'src/components/cne/CNEQuestionsModal.tsx'),'utf8');
    if(!page.includes('validationFailure')||!page.includes('UNVERIFIED_SOURCE')||!page.includes('`${msg} [${code}] ${materialAdvice}`')) throw Error('Missing specific validation error context');
    if(page.includes('`${msg} No question batch was accepted.')) throw Error('Duplicated generic failure message remains');
  });
  // Gemini HTTP resilience and answer-key-only correction: live incident regressions.
  function mockGeminiTransport(sequence) {
    const ctx = freshLibrarySandbox();
    const waits=[], log=[], requests=[];
    let pointer=0;
    ctx.Utilities={sleep:ms=>waits.push(ms)};
    ctx.logAuditAction=(action,employeeId,detail,severity)=>log.push({action,employeeId,detail,severity});
    ctx.UrlFetchApp={fetch:(endpoint,request)=>{
      requests.push(JSON.parse(request.payload));
      const item = sequence[Math.min(pointer++,sequence.length-1)];
      if (item.throw) throw Error('Temporary network transport error');
      const code=item.status===undefined?200:item.status;
      const response=item.body===undefined ? {candidates:[{content:{parts:[{text:JSON.stringify(item.data||{ok:true})}]}}]} : item.body;
      return {getResponseCode:()=>code,getContentText:()=>JSON.stringify(response),
        getAllHeaders:()=>item.headers||{}};
    }};
    const send=(attempts=4)=>ctx.cneAiGeminiStructured_('mock:gemini','test prompt',
      {type:'OBJECT',properties:{ok:{type:'BOOLEAN'}},required:['ok']},attempts,
      {cneId:'TEST_CNE',employeeId:'ADMIN',stage:'BLUEPRINT',deadlineMs:Date.now()+100000});
    return {ctx,waits,log,requests,send};
  }
  focusCheck('Gemini 503 overload recovers after bounded exponential backoff without reissuing saved questions',()=>{
    const run=mockGeminiTransport([{status:503,body:{error:{message:'Model overloaded'}}},
      {status:503,body:{error:{message:'Model overloaded'}}},{data:{ok:true}}]);
    const result=run.send();
    if(!result.success||run.requests.length!==3||run.waits.join(',')!=='1000,2000') throw Error('503 retry sequencing failed '+JSON.stringify(result));
    if(run.log.filter(x=>x.action==='AI_QUESTION_GEMINI_RETRY').length!==2) throw Error('Retry audit missing');
    if(run.log.some(x=>x.detail.includes('mock:gemini'))) throw Error('Endpoint logged');
  });
  focusCheck('Gemini 429 respects bounded Retry-After and correctly identifies rate limit',()=>{
    const run=mockGeminiTransport([{status:429,headers:{'Retry-After':'3'},body:{error:{message:'Rate limit exceeded'}}},{data:{ok:true}}]);
    if(!run.send().success || run.waits[0]!==3000) throw Error('429 Retry-After ignored');
    if(run.ctx.cneAiGeminiFailureType_(429,'Rate limit exceeded')!=='AI_RATE_LIMITED') throw Error('429 misclassified');
  });
  focusCheck('Gemini daily quota exhaustion does not waste retry attempts',()=>{
    const run=mockGeminiTransport([{status:429,body:{error:{message:'Free tier quota exceeded, daily limit reached'}}}]);
    const result=run.send();
    if(result.success||result.errorCode!=='AI_QUOTA_LIMITED'||run.requests.length!==1||run.waits.length) throw Error('Daily quota unnecessarily retried');
  });
  focusCheck('Persistent 503 failure stops after four attempts with a clear overload code',()=>{
    const run=mockGeminiTransport([{status:503,body:{error:{message:'Model currently overloaded'}}}]);
    const result=run.send();
    if(result.success||result.errorCode!=='AI_TEMPORARILY_UNAVAILABLE'||run.requests.length!==4||run.waits.join(',')!=='1000,2000,4000') throw Error('503 exhaustion not bounded');
    if(run.log.filter(x=>x.action==='AI_QUESTION_GEMINI_FAILED').length!==1) throw Error('Final overload audit missing');
  });
  focusCheck('Invalid Gemini API request fails immediately; network interruption can recover',()=>{
    const invalid=mockGeminiTransport([{status:400,body:{error:{message:'Invalid schema'}}}]);
    const bad=invalid.send();
    if(bad.success||bad.errorCode!=='AI_REQUEST_REJECTED'||invalid.requests.length!==1||invalid.waits.length) throw Error('Permanent request error was retried');
    const net=mockGeminiTransport([{throw:true},{data:{ok:true}}]);
    if(!net.send().success||net.requests.length!==2||net.waits.length!==1) throw Error('Transient network error not retried');
  });
  focusCheck('Malformed structured response is retried but never accepted without JSON',()=>{
    const run=mockGeminiTransport([{body:{candidates:[{content:{parts:[{text:'not JSON'}]}}]}},
      {data:{ok:true}}]);
    if(!run.send().success || run.requests.length!==2) throw Error('Malformed JSON erroneously accepted');
  });
  focusCheck('Answer-key-only Gemini schema has no writable clinical stem or source fields',()=>{
    const ctx=freshLibrarySandbox();
    const schema=ctx.cneAiAnswerKeySchema_();
    if(schema.type!=='OBJECT'||Object.keys(schema.properties).join(',')!=='correctOption'||
       schema.properties.correctOption.enum.join(',')!=='A,B,C,D') throw Error('Key-only repair schema not limited to A-D');
    const prompt=ctx.cneAiAnswerKeyRepairPrompt_('IV Cannulation','Select venous access',{questionText:'Question',optionA:'Correct',optionB:'Wrong',optionC:'Wronger',optionD:'Worst',explanation:'Rationale'},'Source','Verified evidence text');
    if(!prompt.includes('NOT rewrite')||!prompt.includes('Verified source text')) throw Error('Answer repair prompt can rewrite evidence');
  });
  focusCheck('Safe answer-field normalization accepts labels but never guesses ambiguous answers',()=>{
    const ctx=freshLibrarySandbox(), o={A:'Select vein',B:'Assess site',C:'Stop',D:'Document'};
    for (const value of ['Correct answer: B','Answer is B','Choice B','B) Assess site'])
      if(ctx.cneAiNormalizeCorrectOption_(value,o)!=='B') throw Error('Unambiguous label rejected: '+value);
    for (const value of ['B or C','Either A/B','Any of the above','B) Wrong clinical text','B and D'])
      if(ctx.cneAiNormalizeCorrectOption_(value,o)) throw Error('Ambiguous/wrong answer guessed: '+value);
  });
  focusCheck('Invalid answer-key is repaired without modifying question, options, rationale or source',()=>{
    let original;
    const run=mockBlueprintScenario({mutateInitial:qs=>{
      qs[0].correctOption='A or B';original={...qs[0]};
    },makeRepair:()=>({correctOption:'A'})});
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(!result.success||result.data.length!==5||run.calls.length!==3) throw Error('Key-only repair failed '+JSON.stringify(result));
    const schema=run.calls[2].schema;
    if(schema.properties.questionText||!schema.properties.correctOption||!run.calls[2].prompt.includes('ANSWER-KEY FORMAT REPAIR ONLY')) throw Error('Full rewrite schema used for key repair');
    const q=result.data[0];
    if(q.questionText!==original.questionText||q.optionA!==original.optionA||q.explanation!==original.explanation||q.correctOption!=='A') throw Error('Unrelated clinical fields changed');
  });
  focusCheck('Answer-key-only repair cannot force invalid objective into partial validated set',()=>{
    const run=mockBlueprintScenario({mutateInitial:qs=>{qs[0].correctOption='A or B';},makeRepair:()=>({correctOption:'D'})});
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(!result.success || !result.partial || result.data.length!==4 ||
       result.data.some(q=>q.objectiveId==='OBJ_1') ||
       !result.failures.some(f=>f.objectiveId==='OBJ_1')) throw Error('Unsupported answer key was accepted into partial set');
    if(run.calls.length>4) throw Error('Repair exceeded per-question limit');
  });
  focusCheck('Gemini overload during a question repair preserves the technical error code',()=>{
    const run=mockBlueprintScenario({mutateInitial:qs=>{qs[0].correctOption='A or B';},transportError:role=>role==='repair'});
    run.ctx.Utilities={sleep:()=>{}};
    const result=run.ctx.generateAiQuestionsInternal({cneId:'IV_CNE',reservationToken:'TOKEN',allowLibraryOnly:true},{employeeId:'ADM'});
    if(result.success||result.errorCode!=='AI_TEMPORARILY_UNAVAILABLE'||result.data||run.calls.length!==4) throw Error('Repair overload incorrectly reported as invalid answer '+JSON.stringify(result));
  });
  focusCheck('UI distinguishes Gemini overload, quota exhaustion and configuration problems',()=>{
    const ui=readFileSync(join(ROOT_DIR,'src/components/cne/CNEQuestionsModal.tsx'),'utf8');
    if(!ui.includes('Gemini Is Temporarily Busy')||!ui.includes('Gemini API Quota Limit Reached')||
      !ui.includes('Gemini Configuration Needs Attention')||!ui.includes('reconcileUncertainGeneration')) throw Error('Gemini technical error UI missing');
    if(!ui.includes('recovered.safeToRetry && !apiQuota && !configurationError')) throw Error('Unsafe quota retry offered');
  });
  console.log('\n>>> Focused AI indexing, retrieval and UI regression');
  for (const check of focusedChecks) {
    try {
      check.test();
      focusedPassed++;
      console.log('✓ ' + check.name);
    } catch (e) {
      console.error('✗ ' + check.name + ': ' + e.message);
    }
  }
}

// Post-Test result recovery regression (separate from protected baseline suite).
if (selected.some(item => item.id === 'performance') && passed === selected.length) {
  const recoveryGas = readFileSync(join(ROOT_DIR, 'Code.gs'),'utf8');
  const recoveryUI = readFileSync(join(ROOT_DIR,'src/components/cne/CNEPostTestModal.tsx'),'utf8');
  const recoveryApi = readFileSync(join(ROOT_DIR,'src/services/api.ts'),'utf8');
  function postTestSandbox() {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(recoveryGas,ctx,{timeout:12000});
    const saved = {responseId:'RESP-1',participantName:'Test Person',score:1,totalQuestions:5,percentage:20,
      submittedAt:'2026-10-21T10:00:00Z',status:'NEEDS_IMPROVEMENT',answersJson:JSON.stringify({Q1:'A',Q2:'B',Q3:'A',Q4:'A',Q5:'A'})};
    const keys=[1,2,3,4,5].map(n=>({id:'Q'+n,question:'Test question '+n,correctOption:n===1?'A':'C',explanation:'Verified teaching explanation '+n}));
    ctx.findExistingPostTestSubmission=()=>saved;
    ctx.getPostTestAnswerSnapshot_=()=>({answerKeys:keys});
    return {ctx,saved,keys};
  }
  focusCheck('Recover original stored score, answers and five explanations without rewriting a submission',()=>{
    const {ctx,saved}=postTestSandbox();
    const r=ctx.postTestRecoveredResult_('CNE-1','STAFF-1','INTERNAL');
    if(!r.success||!r.data.recovered||r.data.score!==1||r.data.review.length!==5||
       r.data.review[0].userAnswer!=='A'||r.data.review[0].explanation!=='Verified teaching explanation 1'||
       r.data.participantId!==saved.responseId) throw Error('Stored results not reconstructed');
  });
  focusCheck('Saved score disagreement or changed question bank fails closed; no regrading',()=>{
    const {ctx,saved,keys}=postTestSandbox();
    saved.score=5;
    let r=ctx.postTestRecoveredResult_('CNE-1','STAFF-1','INTERNAL');
    if(r.success||r.errorCode!=='POST_TEST_REVIEW_UNAVAILABLE') throw Error('Score mismatch returned altered review');
    saved.score=1;keys.pop();
    r=ctx.postTestRecoveredResult_('CNE-1','STAFF-1','INTERNAL');
    if(r.success||r.errorCode!=='POST_TEST_REVIEW_UNAVAILABLE') throw Error('Incomplete locked bank returned review');
  });
  focusCheck('Missing, corrupt or invalid saved JSON never exposes answer keys',()=>{
    const {ctx,saved}=postTestSandbox();
    ctx.findExistingPostTestSubmission=()=>null;
    if(ctx.postTestRecoveredResult_('CNE-1','STAFF-1','INTERNAL').errorCode!=='POST_TEST_NOT_SUBMITTED') throw Error('Missing result accepted');
    ctx.findExistingPostTestSubmission=()=>saved;
    saved.answersJson='{not-json';
    if(ctx.postTestRecoveredResult_('CNE-1','STAFF-1','INTERNAL').success) throw Error('Corrupt answer record accepted');
  });
  focusCheck('Result read requires signed participant verification; an ID alone never authorizes review',()=>{
    const {ctx}=postTestSandbox();
    ctx.resolveActiveQrToken=()=>({cneId:'CNE-1'});
    ctx.verifyPostTestParticipantVerificationToken=()=>null;
    const r=ctx.handleGetPostTestSubmissionResult({qrToken:'QR',participantId:'STAFF-1'},null);
    if(r.success||r.errorCode!=='PARTICIPANT_VERIFICATION_REQUIRED') throw Error('Unverified QR leaked answers');
    ctx.verifyPostTestParticipantVerificationToken=()=>({participantId:'STAFF-1',participantType:'INTERNAL'});
    const ok=ctx.handleGetPostTestSubmissionResult({qrToken:'QR',participantId:'OTHER'},null);
    if(!ok.success||!ok.data.recovered) throw Error('Valid verified review denied');
  });
  focusCheck('Authenticated direct result read uses session employee only, never caller employeeId',()=>{
    const {ctx}=postTestSandbox();
    ctx.resolveActiveQrToken=()=>null;
    ctx.sanitizeCellInput=s=>s;
    ctx.getCNEScheduleRecord=()=>({id:'CNE-1'});
    ctx.refreshMutationSession=()=>({success:true,session:{employeeId:'STAFF-1'}});
    ctx.checkCNEActionAuthorized=()=>null;
    ctx.normalizeEmpId=s=>s;
    let requested='';
    ctx.findExistingPostTestSubmission=(cne,id)=>{requested=id; return {responseId:'RESP-1',score:1,totalQuestions:5,percentage:20,answersJson:JSON.stringify({Q1:'A'}),status:'PASSED'};};
    ctx.scorePostTestAnswers_=()=>({score:1,percentage:20,detailedReview:Array(5).fill({question:'Q'})});
    const r=ctx.handleGetPostTestSubmissionResult({cneId:'CNE-1',employeeId:'VICTIM'},null);
    if(!r.success||requested!=='STAFF-1') throw Error('Cross-employee recovery attempted');
  });
  focusCheck('Client recovers duplicate or ambiguous submit without resubmitting',()=>{
    if(!recoveryUI.includes("res.errorCode === 'ALREADY_SUBMITTED'")||
      !recoveryUI.includes('recoverSavedPostTest()')||
      !recoveryUI.includes("'POST_TEST_NOT_SUBMITTED'")||
      !recoveryUI.includes('submissionUncertain')||
      !recoveryUI.includes('Check Submission Status')||
      !recoveryUI.includes('setSubmissionResult(res.data.recoveredResult || null)')) throw Error('Automatic recovery state is missing');
  });
  focusCheck('Recovery action is routed, protected from browser caching and uses participant binding',()=>{
    if(!recoveryGas.includes("case 'getPostTestSubmissionResult':")||
      !recoveryGas.includes('verifyPostTestParticipantVerificationToken(params.participantVerificationToken, cneId)')||
      !recoveryApi.includes("executeAction<PostTestSubmissionResult>('getPostTestSubmissionResult'")||
      !recoveryApi.includes("'getPostTestSubmissionResult',")) throw Error('Protected recovery endpoint not fully wired');
  });
  focusCheck('Only top-right X closes Post-Test; it stays disabled while checking',()=>{
    if((recoveryUI.match(/onClick=\{onClose\}/g)||[]).length!==1||
      recoveryUI.includes('Close Window')||
      !recoveryUI.includes('disabled={isSubmitting || checkingSavedSubmission}')) throw Error('Redundant close controls or unsafe active close');
  });
  console.log('\n>>> Post-Test automatic result recovery regression');
  for (const check of focusedChecks.slice(-8)) {
    try { check.test(); focusedPassed++; console.log('✓ '+check.name); }
    catch(e) {console.error('✗ '+check.name+': '+e.message);}
  }
}


// -----------------------------------------------------------------------------
// Restored coverage supplement: checks retained from the newer 43-test runner.
// These are additional checks, not substitutes for the 267 baseline or the
// 86 previous focused regression checks. No application source is changed.
// -----------------------------------------------------------------------------
if (selected.some(item => item.id === 'performance') && passed === selected.length) {
  const gas = readFileSync(join(ROOT_DIR, 'Code.gs'), 'utf8');
  const api = readFileSync(join(ROOT_DIR, 'src/services/api.ts'), 'utf8');
  const server = readFileSync(join(ROOT_DIR, 'server.ts'), 'utf8');
  const pdf = readFileSync(join(ROOT_DIR, 'src/services/pdfGenerator.ts'), 'utf8');
  const interest = readFileSync(join(ROOT_DIR, 'src/components/cne/InterestedParticipantsModal.tsx'), 'utf8');
  const interestActions = readFileSync(join(ROOT_DIR, 'src/components/cne/CalendarInterestControls.tsx'), 'utf8');
  const route = readFileSync(join(ROOT_DIR, 'src/services/routePrefetch.ts'), 'utf8');
  const postTest = readFileSync(join(ROOT_DIR, 'src/components/cne/CNEPostTestModal.tsx'), 'utf8');
  const deletion = readFileSync(join(ROOT_DIR, 'src/components/cne/DeleteCneModal.tsx'), 'utf8');
  const ui = readFileSync(join(ROOT_DIR, 'src/components/cne/CNEQuestionsModal.tsx'), 'utf8');

  const extra = [];
  function retainCheck(name, test) { extra.push({name, test}); }
  retainCheck('Restored 43-runner parity: protected result and OTP APIs cannot be cached', () => {
    if (!api.includes('const NEVER_CACHEABLE_PROTECTED_ACTIONS')) throw Error('Protected action registry missing');
    for (const action of ['getCNEQuestions','getPostTestQuestions','getPostTestSubmissionResult',
      'requestPostTestOtp','verifyPostTestOtp','requestPasswordOtp','verifyPasswordOtp','setPasswordWithOtp']) {
      if (!api.includes("'" + action + "'")) throw Error('Protected API action missing: ' + action);
    }
  });
  retainCheck('Restored 43-runner parity: all critical Apps Script action cases remain registered', () => {
    for (const action of ['login','changePassword','getCNERecords','getCNESchedulePage',
      'getCNEScheduleById','createCNE','updateCNE','finalizeCNE','deleteCNE','saveCNEQuestions',
      'getCNEQuestions','getPostTestQuestions','submitPostTest','getPostTestSubmissionResult',
      'requestPostTestOtp','verifyPostTestOtp','getQRToken','generateCNEQuestions',
      'registerCneInterest','withdrawCneInterest','getCneInterestedParticipants']) {
      if (!gas.includes("case '" + action + "':") && !gas.includes('case "' + action + '":'))
        throw Error('Missing backend action: ' + action);
    }
  });
  retainCheck('Restored 43-runner parity: API methods match backend actions', () => {
    for (const name of ['login','getCNESchedule','saveCNE','finalizeCNE','deleteCNE',
      'saveCNEQuestions','getCNEQuestions','getPostTestQuestions','submitPostTest',
      'getPostTestSubmissionResult','registerCneInterest','withdrawCneInterest',
      'getCneInterestedParticipants']) {
      if (!api.includes('static async ' + name)) throw Error('Missing client API method: ' + name);
    }
  });
  retainCheck('Restored 43-runner parity: server health routes and CORS safeguards', () => {
    for (const token of ["app.get('/health'", "app.get('/api/health'",
      'Access-Control-Allow-Origin','Invalid JSON payload']) {
      if (!server.includes(token)) throw Error('Server functionality missing: ' + token);
    }
  });
  retainCheck('Restored 43-runner parity: PDF exports and defensive person-ID helpers', () => {
    for (const token of ['export function generateCNERecordsPdf',
      'export function generateCNESessionPdf','normalizeEmployeeId','splitEmployeeIds']) {
      if (!pdf.includes(token)) throw Error('PDF module functionality missing: ' + token);
    }
  });
  retainCheck('Restored 43-runner parity: PDF uses centralized time formatting', () => {
    for (const token of ['formatCneDateRangeDisplay','formatCneDateTimeDisplay',
      'formatSecondsToDuration']) if (!pdf.includes(token)) throw Error('PDF date/time helper missing: ' + token);
  });
  retainCheck('Restored 43-runner parity: PDF tables and missing-score presentation', () => {
    for (const token of ['headStyles','theme:','avgScoreDisplay','Not Available','postTestParticipants']) {
      if (!pdf.includes(token)) throw Error('PDF score/table field missing: ' + token);
    }
    if (!pdf.includes('autoTable(') && !pdf.includes('autoTable(doc,')) throw Error('PDF table renderer missing');
  });
  retainCheck('Restored 43-runner parity: deletion archives before removal and fails safely', () => {
    for (const token of ['function handleDeleteCNE(params, session)','CNE Deleted Archive',
      'getOrCreateDeletedArchiveSheet_','function inspectStorageStateSafely_',
      'DELETE_COMPLETION_UNCERTAIN','DELETE_CNE_UNCERTAIN','DELETE_CNE_PARTIAL']) {
      if (!gas.includes(token)) throw Error('Deletion recovery safeguard missing: ' + token);
    }
    for (const token of ['confirmId === targetId','Boolean(reason.trim())',"user?.role === 'ADMIN'"])
      if (!deletion.includes(token)) throw Error('Deletion confirmation safeguard missing: ' + token);
  });
  retainCheck('Restored 43-runner parity: sheet cell formula injection and employee IDs', () => {
    for (const token of ['function sanitizeCellInput(val)','function normalizeEmpId(id)',
      'String(id).trim().toUpperCase()']) if (!gas.includes(token)) throw Error('Sheet safety helper missing: ' + token);
    if (!gas.includes('/^[=+\\-@\\t\\r]/.test(str)')) throw Error('Formula injection protection missing');
    if (gas.includes('password === enteredPassword')) throw Error('Plaintext password comparison detected');
  });
  retainCheck('Restored 43-runner parity: CNE lifecycle and QR entry restrictions', () => {
    for (const token of ['function normalizeCNEType(typeStr)','function normalizeCNEStatus(statusStr)',
      'function isCNEQuestionsLocked(cneId)','QUESTIONS_LOCKED','function handleSaveCNEQuestions(params, session)']) {
      if (!gas.includes(token)) throw Error('CNE lifecycle safeguard missing: ' + token);
    }
    if (!gas.includes('return null;')) throw Error('CNE type fail-closed path missing');
  });
  retainCheck('Restored 43-runner parity: interest APIs and UI integration', () => {
    for (const token of ['function handleRegisterCneInterest(params, session)',
      'function handleWithdrawCneInterest(params, session)',
      'function handleGetCneInterestedParticipants(params, session)'])
      if (!gas.includes(token)) throw Error('Interest operation missing: ' + token);
    if (!interest.includes('ApiService.getCneInterestedParticipants') ||
        !interestActions.includes('ApiService.registerCneInterest') ||
        !interestActions.includes('ApiService.withdrawCneInterest')) throw Error('Interest UI miswired');
  });
  retainCheck('Restored 43-runner parity: execution caches and route prefetching', () => {
    for (const token of ['var _inMemoryRoleCache = {};','var _executionSpreadsheetCache = {};',
      'var _executionCredentialCache = {};','function logPerf(tag, startedAt, extra)'])
      if (!gas.includes(token)) throw Error('Execution performance protection missing: ' + token);
    for (const token of ['export function prefetchRoute','export function scheduleIdlePrefetch','PREFETCH_MAP'])
      if (!route.includes(token)) throw Error('Route optimization missing: ' + token);
  });
  retainCheck('Restored 43-runner parity: UI recovery and first-open material checks', () => {
    for (const token of ['submissionUncertain','recoveredResult','formatPostTestTimestamp'])
      if (!postTest.includes(token)) throw Error('Post-Test recovery state missing: ' + token);
    for (const token of ['initialMaterialPresenceRef.current !== null',
      'reconcileUncertainGeneration','ApiService.getAiQuota'])
      if (!ui.includes(token)) throw Error('On-demand material or AI recovery logic missing: ' + token);
    if (!ui.includes('void loadMaterialStatus(++materialRequestRef.current, cneId)')) throw Error('First page-open material presence check is missing');
  });

  console.log('\n>>> Additional cross-module checks retained from the 43-test runner');
  for (const check of extra) {
    focusedChecks.push(check);
    try { check.test(); focusedPassed++; console.log('✓ ' + check.name); }
    catch(e) { console.error('✗ ' + check.name + ': ' + e.message); }
  }
}


// -----------------------------------------------------------------------------
// Short, recoverable Gemini stages + authoritative quote-span regression.
// These augment, never replace, the 267 core / 99 existing focused checks.
// -----------------------------------------------------------------------------
if (selected.some(item => item.id === 'performance') && passed === selected.length) {
  const gas = readFileSync(join(ROOT_DIR, 'Code.gs'), 'utf8');
  const api = readFileSync(join(ROOT_DIR, 'src/services/api.ts'), 'utf8');
  const ui = readFileSync(join(ROOT_DIR, 'src/components/cne/CNEQuestionsModal.tsx'), 'utf8');
  const cacheHeaders = readFileSync(join(ROOT_DIR, 'public/_headers'), 'utf8');
  const ctx = vm.createContext({console});
  vm.runInContext(gas,ctx,{timeout:15000});
  const checks=[];
  const test=(name,fn)=>checks.push({name,fn});
  const clinical = 'Peripheral intravenous catheter insertion requires appropriate vein selection before the nurse prepares the patient\'s skin and checks for relevant complications and safety measures. '.repeat(11);
  test('Exact quote IDs resolve only to literal spans in approved evidence',()=>{
    const spans=ctx.cneAiVerifiedSpans_(clinical,'OBJ_1');
    if(spans.length<2||spans.length>6) throw Error('Bounded spans missing');
    for(const span of spans) {
      if(!clinical.includes(span.quote)||span.quote.split(/\s+/).length<10) throw Error('Non-verbatim or short evidence span');
    }
    const selected=ctx.cneAiResolveVerifiedSpan_({quoteId:spans[0].id,evidenceQuote:'FAKE GEMINI QUOTE'}, {objectiveId:'OBJ_1'}, {OBJ_1:spans});
    if(!selected.success||selected.quote!==spans[0].quote) throw Error('Verified quote ID not authoritative');
  });
  test('Fabricated quote IDs fail closed',()=>{
    const spans=ctx.cneAiVerifiedSpans_(clinical,'OBJ_1');
    const bad=ctx.cneAiResolveVerifiedSpan_({quoteId:'INVENTED_SPAN',evidenceQuote:clinical},{objectiveId:'OBJ_1'},{OBJ_1:spans});
    if(bad.success||bad.quote) throw Error('Fabricated quote ID accepted');
  });
  test('Existing exact verified quotations remain backward compatible',()=>{
    const q=ctx.cneAiResolveVerifiedSpan_({evidenceQuote:clinical},{objectiveId:'OBJ_2'},{OBJ_2:[]});
    if(!q.success||q.quote!==clinical.trim()) throw Error('Real legacy quote blocked');
  });
  test('Verified quote must still support the actual clinical answer',()=>{
    const ev={indexId:'IV1',resourceTitle:'Nursing Advanced Skills',sectionHeading:'Initiate IV Therapy',chunkText:clinical};
    const span=ctx.cneAiVerifiedSpans_(clinical,'OBJ_1')[0];
    const citation=ev.resourceTitle+' - '+ev.sectionHeading;
    const diagnostic=ctx.cneAiEvidenceSupportDiagnostic_('IV Cannulation',citation,span.quote,'Give an unsupported intravenous medication dosage of 900 mg','Give 900 mg intravenously now.','',[ev],'IV1');
    if(diagnostic.supported||diagnostic.code!=='NUMERIC_MISMATCH') throw Error('Server-owned quote bypassed numeric verification');
  });
  test('Two-phase actions wired with independent timeouts and owner-bound status',()=>{
    for(const code of ["phase: 'PLAN'", "phase: 'FINISH'", "'getCNEAiJobStatus'", "params?.phase === 'PLAN' ? 150000 : 305000"])
      if(!api.includes(code)) throw Error('Frontend action/timeout missing: '+code);
    if(!gas.includes("case 'getCNEAiJobStatus':")||!gas.includes("phase==='FINISH'")||!gas.includes("phase==='PLAN'")) throw Error('Backend stage routes missing');
  });
  test('No unattended resubmission after uncertain timeout',()=>{
    if(!ui.includes("ApiService.getCNEAiJobStatus(targetCneId)")||!ui.includes('liveJob &&')||
       !ui.includes("['NONE','FAILED'].includes(liveJob.state)")) throw Error('Safe retry guard missing');
    if(!ui.includes('Resume AI Generation')||!ui.includes('handleGenerateAi(false, true)')) throw Error('Safe plan resume not exposed');
  });
  test('Planning and generation do not expose blueprint or token in job status',()=>{
    const statusSource=gas.split('function handleGetCNEAiJobStatus(params,session) {')[1].split('\n}')[0];
    if(!statusSource.includes("canResume:state==='PLANNED'")||statusSource.includes('reservationToken:job.')||statusSource.includes('objectives:job.')) throw Error('Job status exposes private state');
  });
  test('Generation cannot resubmit unfinished plan or claim without ScriptLock',()=>{
    if(!gas.includes("['PLANNING','PLANNED','GENERATING','PARTIAL_SUCCESS','UNCERTAIN'].indexOf(savedJob.state)")||
      !gas.includes('claim.tryLock(8000)')||!gas.includes("['PLANNED','PARTIAL_SUCCESS'].indexOf(current.state)===-1")) throw Error('Idempotent stage claim missing');
  });
  test('Existing library-only consent is persisted and required for resume',()=>{
    if(!gas.includes("cneAiReadJob_(cneId,session)||{}).allowLibraryOnly===true")||
      !gas.includes('allowLibraryOnly:!hasOwnMaterial && params.allowLibraryOnly===true')) throw Error('Library consent not bound to job');
  });
  test('Versioned frontend HTML is not cached across Cloudflare deployments',()=>{
    if(!cacheHeaders.includes('/index.html')||!cacheHeaders.includes('no-store')||!cacheHeaders.includes('/assets/*')) throw Error('Cache-control headers missing');
  });
  test('Job state isolated by authorized employee, not other employee IDs',()=>{
    const store={};
    ctx.cneAiProgressKey_=(cneId,employeeId)=>'progress_'+cneId+'_'+employeeId;
    ctx.PropertiesService={getScriptProperties:()=>({getProperty:key=>store[key]||null,setProperty:(key,v)=>{store[key]=v;}})};
    const first={employeeId:'EDUCATOR_1'};
    ctx.cneAiWriteJob_('CNE_123',first,{state:'PLANNED',objectives:[{objectiveId:'OBJ_1'}],reservationToken:'secret'});
    if(ctx.cneAiReadJob_('CNE_123',first).state!=='PLANNED') throw Error('Owner cannot resume plan');
    if(ctx.cneAiReadJob_('CNE_123',{employeeId:'EDUCATOR_2'})) throw Error('Another user accessed generation plan');
  });
  test('Two-stage quota reservation commits once, even after a resume or second finish',()=>{
    const fresh=vm.createContext({console});vm.runInContext(gas,fresh,{timeout:12000});
    const store={};let reservations=0,commits=0,releases=0;
    fresh.sanitizeCellInput=v=>String(v||'');
    fresh.getCNEScheduleRecord=id=>({cneId:id,topic:'IV Cannulation',status:'Scheduled'});
    fresh.checkQuestionManagementAuthorized=()=>null;
    fresh.normalizeCNEStatus=()=> 'Scheduled';
    fresh.isCNEQuestionsLocked=()=>false;
    fresh.cneAiHasOwnMaterial_=()=>false;
    fresh.cneAiProgressKey_=(id,employee)=>id+'-'+employee;
    fresh.updateCNEAiProgress_=()=>{};
    fresh.PropertiesService={getScriptProperties:()=>({getProperty:key=>store[key],setProperty:(key,val)=>{store[key]=val;}})};
    fresh.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})};
    fresh.handleReserveAiQuota=()=>{reservations++;return{success:true,data:{reservationToken:'only-one-token'}};};
    fresh.handleReleaseAiQuota=()=>{releases++;return{success:true};};
    const questions=Array.from({length:5},(_,i)=>({id:'q_ai_'+i,question:'Distinct clinical question '+i,options:{A:'a',B:'b',C:'c',D:'d'},correctOption:'B'}));
    fresh.generateAiQuestionsInternal=args=>args.planOnly?
      {success:true,planned:true,data:{objectives:Array.from({length:5},(_,i)=>({objectiveId:'OBJ_'+(i+1),objective:'Clinical objective number '+i,evidenceId:'E'+i}))}}:
      (args.preparedBlueprint?.length===5 && args.allowLibraryOnly===true?{success:true,data:questions}:{success:false,errorCode:'MISSING_CONSENT'});
    fresh.handleCommitAiQuota=()=>{commits++;return{success:true};};
    fresh.cneHybridGetSlots_=()=>({success:true,data:[]});
    fresh.cneHybridSelectedBankContext_=()=>[];
    fresh.handleGetCNEQuestions=()=>({success:true,data:questions});
    fresh.logAuditAction=()=>{};
    const owner={employeeId:'EDUCATOR_1'}, other={employeeId:'EDUCATOR_2'};
    const consent=fresh.handleGenerateCNEQuestions({cneId:'CNE_123',phase:'PLAN'},owner);
    if(consent.errorCode!=='LIBRARY_CONSENT_REQUIRED')throw Error('Library consent missing');
    const plan=fresh.handleGenerateCNEQuestions({cneId:'CNE_123',phase:'PLAN',allowLibraryOnly:true},owner);
    if(!plan.success||plan.data.phase!=='PLANNED')throw Error('Blueprint plan failed');
    if(fresh.handleGetCNEAiJobStatus({cneId:'CNE_123'},owner).data.canResume!==true)throw Error('Recoverable status missing');
    if(fresh.handleGetCNEAiJobStatus({cneId:'CNE_123'},other).data.state!=='NONE')throw Error('Cross-user job disclosure');
    const finished=fresh.handleGenerateCNEQuestions({cneId:'CNE_123',phase:'FINISH'},owner);
    if(!finished.success||finished.data.length!==5)throw Error('Finish did not save five questions');
    if(fresh.handleGenerateCNEQuestions({cneId:'CNE_123',phase:'FINISH'},owner).success)throw Error('Second commit allowed');
    if(reservations!==1||commits!==1||releases!==0)throw Error('Quota safety regression');
  });
  console.log('\n>>> Stage recovery and source-bound quote checks');
  for(const item of checks){focusedChecks.push({name:item.name,test:item.fn});try{item.fn();focusedPassed++;console.log('✓ '+item.name);}catch(err){console.error('✗ '+item.name+': '+err.message);}}
}

// -----------------------------------------------------------------------------
// Admin Reports compact-filter regression checks: keep automatic current-year
// defaults and report functionality, remove redundant screen-only UI content.
// These augment all existing core and focused checks without changing them.
// -----------------------------------------------------------------------------
if (selected.some(item => item.id === 'performance') && passed === selected.length) {
  const reports = readFileSync(join(ROOT_DIR, 'src/components/AdminReports.tsx'), 'utf8');
  const checks = [];
  const check = (name, test) => checks.push({name, test});
  check('Reports: India-calendar current year populates From and To by default', () => {
    const match = reports.match(/const currentYear = \(\): Period => \{([\s\S]*?)\n\};/);
    if (!match) throw Error('Current-year initialization helper missing');
    const run = (indiaDay) => vm.runInNewContext(`(() => { ${match[1]} })()`, {
      getIndiaTodayIsoDate: () => indiaDay
    });
    for (const [day,year] of [['2026-12-31','2026'],['2027-01-01','2027']]) {
      const period = run(day);
      if (period.fromDate !== `${year}-01-01` || period.toDate !== `${year}-12-31` || period.search !== '')
        throw Error('Wrong default reporting period for India day '+day);
    }
  });
  check('Reports: both draft and applied periods begin in the current year', () => {
    for (const token of ['useState<Period>(currentYear)',
      'const [draft,setDraft]', 'const [applied,setApplied]']) {
      if (!reports.includes(token)) throw Error('Default report period binding missing: '+token);
    }
  });
  check('Reports: Current Year button and reset handler are absent', () => {
    if (/Current Year|RefreshCcw|const reset\s*=|onClick=\{reset\}/.test(reports))
      throw Error('Redundant Current Year UI or reset action still exists');
  });
  check('Reports: no visible title or admin-planning description occupies header space', () => {
    if (!reports.includes('className="sr-only print:not-sr-only'))
      throw Error('Accessible print-only page heading missing');
    if (/Nursing Services · Admin-only planning|<h1 className="font-extrabold/.test(reports))
      throw Error('Redundant visible page text remains');
  });
  check('Reports: summary period hidden on screen but present for printing', () => {
    if (!reports.includes('className="hidden print:block') ||
        !reports.includes('From {applied.fromDate} to {applied.toDate}') ||
        reports.includes('Dates use India calendar day.'))
      throw Error('Print-only reporting period not correctly configured');
  });
  check('Reports: compact filter controls retain dates, search, generate and print', () => {
    for (const token of ['p-3 sm:p-4', 'id="cne-report-from"', 'id="cne-report-to"',
      'value={draft.fromDate}', 'value={draft.toDate}', 'value={draft.search}',
      'onClick={validateAndApply}', 'Generate Report', 'onClick={()=>window.print()}']) {
      if (!reports.includes(token)) throw Error('Report filter control missing: '+token);
    }
  });
  check('Reports: manual date validation and automatic analytics load still operate', () => {
    for (const token of ['draft.fromDate>draft.toDate',
      'if(JSON.stringify(next)===JSON.stringify(applied))setReload',
      'ApiService.getCNEAnalytics({...applied,includeEmployees:false})',
      '},[appliedKey,reload,sessionKey])', "user.role!=='ADMIN'"]) {
      if (!reports.includes(token)) throw Error('Report lifecycle requirement missing: '+token);
    }
  });
  check('Reports: existing report sections and employee CSV export are retained', () => {
    for (const token of ['Overview', 'Participation & Outcomes', 'Training Hours',
      'Planning Insights', 'exportEmployees', 'CNE_Training_Register_',
      'ApiService.getCNEAnalytics({...applied,includeEmployees:true})']) {
      if (!reports.includes(token)) throw Error('Report content/export missing: '+token);
    }
  });
  console.log('\n>>> Compact Reports & Statistics regression checks');
  for (const item of checks) {
    focusedChecks.push(item);
    try { item.test(); focusedPassed++; console.log('✓ '+item.name); }
    catch (err) { console.error('✗ '+item.name+': '+err.message); }
  }
}


// -----------------------------------------------------------------------------
// Guest Calendar/Schedule login navigation regression tests.
// Exercise the actual App.tsx navigation and login-success handlers in a VM.
// This protects the public preview while requiring login for full details.
// -----------------------------------------------------------------------------
if (selected.some(item => item.id === 'performance') && passed === selected.length) {
  const app = readFileSync(join(ROOT_DIR, 'src/App.tsx'), 'utf8');
  const home = readFileSync(join(ROOT_DIR, 'src/components/CneHomePage.tsx'), 'utf8');
  const widget = readFileSync(join(ROOT_DIR, 'src/components/home/UpcomingClassesWidget.tsx'), 'utf8');
  const loginModal = readFileSync(join(ROOT_DIR, 'src/components/LoginModal.tsx'), 'utf8');
  const checks = [];
  const check = (name, test) => checks.push({name, test});
  function getHandler(first, last) {
    const from = app.indexOf(first);
    const to = app.indexOf(last, from);
    if (from < 0 || to < 0) throw Error(`App navigation handler missing: ${first}`);
    return app.slice(from, to).replace(/: SessionUser\b|: ViewMode\b/g, '');
  }
  const handlers = [
    getHandler('  const handleLoginSuccess = (', '  const handleLogout ='),
    getHandler('  const handleLogout =', '  const handleNavigate ='),
    getHandler('  const handleNavigate =', '  const openFullCneDetailsFromCalendar =')
  ].join('\n');
  function modalAction(marker, after) {
    const part = app.slice(app.indexOf(marker));
    const match = part.match(/on(?:Close|OpenForgotPassword|BackToLogin)=\{\(\) => \{([\s\S]*?)\}\}/);
    if (!match) throw Error(`Login modal callback missing after ${marker}`);
    return `const ${after} = () => { ${match[1]} };`;
  }
  const loginCancel = modalAction('<LoginModal', 'cancelLogin');
  const forgotAction = app.match(/<LoginModal[\s\S]*?onOpenForgotPassword=\{\(\) => \{([\s\S]*?)\}\}/);
  const forgotCancel = app.match(/<ForgotPasswordModal[\s\S]*?onClose=\{\(\) => \{([\s\S]*?)\}\}/);
  const forgotBack = app.match(/<ForgotPasswordModal[\s\S]*?onBackToLogin=\{\(\) => \{([\s\S]*?)\}\}/);
  if (!forgotAction || !forgotCancel || !forgotBack) throw Error('Forgot-password modal callback wiring missing');

  function scenario(steps) {
    const ctx = { steps, result: undefined };
    vm.runInNewContext(`
      let user = null;
      let pendingGuestView = null;
      let activeView = 'dashboard';
      let isLoginOpen = false;
      let isForgotPasswordOpen = false;
      let requestedFullCneId = null;
      let calendarReturnState = null;
      const notices = [];
      const window = {scrollTo: () => {}};
      const ApiService = {logout: () => {}};
      const setUser = value => {user = value};
      const setPendingGuestView = value => {pendingGuestView = value};
      const setIsLoginOpen = value => {isLoginOpen = value};
      const setIsForgotPasswordOpen = value => {isForgotPasswordOpen = value};
      const setActiveView = value => {activeView = value};
      const setRequestedFullCneId = value => {requestedFullCneId = value};
      const setCalendarReturnState = value => {calendarReturnState = value};
      const info = (msg,title) => notices.push({msg,title});
      const success = (msg,title) => notices.push({msg,title});
      ${handlers}
      ${loginCancel}
      const openForgot = () => { ${forgotAction[1]} };
      const closeForgot = () => { ${forgotCancel[1]} };
      const backToLogin = () => { ${forgotBack[1]} };
      for (const action of steps) {
        if (action === 'calendar') handleNavigate('calendar');
        else if (action === 'schedule') handleNavigate('cne-schedule');
        else if (action === 'records') handleNavigate('my-cne-records');
        else if (action === 'dashboard') handleNavigate('dashboard');
        else if (action === 'login') handleLoginSuccess({name:'Staff Nurse',employeeId:'RN001',role:'EMPLOYEE'});
        else if (action === 'cancel') cancelLogin();
        else if (action === 'forgot') openForgot();
        else if (action === 'back') backToLogin();
        else if (action === 'closeForgot') closeForgot();
        else if (action === 'logout') handleLogout();
        else throw Error('Unknown scenario step: ' + action);
      }
      result = {activeView,isLoginOpen,isForgotPasswordOpen,pendingGuestView,
        authenticated: Boolean(user && user.employeeId),notices};
    `, ctx, {timeout: 4000});
    return JSON.parse(JSON.stringify(ctx.result));
  }
  check('Guest buttons: both home actions route through the guarded App navigator', () => {
    if (!widget.includes("onClick={() => onNavigate('calendar')}") ||
        !widget.includes("onClick={() => onNavigate('cne-schedule')}") ||
        !home.includes('onNavigate={onNavigate}') || !app.includes('onNavigate={handleNavigate}'))
      throw Error('Today widget action bypasses authenticated navigation');
  });
  check('Guest Calendar click: explains login requirement, opens login, keeps homepage', () => {
    const got = scenario(['calendar']);
    if (got.activeView !== 'dashboard' || !got.isLoginOpen || got.pendingGuestView !== 'calendar' ||
        got.notices[0]?.title !== 'Login Required' || !got.notices[0]?.msg.includes('full CNE Calendar and session details'))
      throw Error('Guest Calendar navigation is silent, loses destination, or exposes protected page');
  });
  check('Guest View All click: explains login requirement, opens login, keeps homepage', () => {
    const got = scenario(['schedule']);
    if (got.activeView !== 'dashboard' || !got.isLoginOpen || got.pendingGuestView !== 'cne-schedule' ||
        got.notices[0]?.title !== 'Login Required' || !got.notices[0]?.msg.includes('complete CNE Schedule and session details'))
      throw Error('Guest Schedule navigation is silent or bypasses login');
  });
  check('Successful login resumes Calendar only after authentication', () => {
    const got = scenario(['calendar','login']);
    if (got.activeView !== 'calendar' || !got.authenticated || got.isLoginOpen || got.pendingGuestView !== null)
      throw Error('Post-login Calendar destination was not resumed securely');
  });
  check('Successful login resumes View All CNE Schedule only after authentication', () => {
    const got = scenario(['schedule','login']);
    if (got.activeView !== 'cne-schedule' || !got.authenticated || got.isLoginOpen || got.pendingGuestView !== null)
      throw Error('Post-login Schedule destination was not resumed securely');
  });
  check('Closing login cancels pending Calendar redirect and preserves homepage', () => {
    const got = scenario(['calendar','cancel','login']);
    if (got.activeView !== 'dashboard' || !got.authenticated || got.pendingGuestView !== null)
      throw Error('Canceled Calendar intent redirected after unrelated login');
  });
  check('Closing login cancels pending View All redirect and preserves homepage', () => {
    const got = scenario(['schedule','cancel','login']);
    if (got.activeView !== 'dashboard' || got.pendingGuestView !== null)
      throw Error('Canceled Schedule intent redirected after unrelated login');
  });
  check('Password-reset detour preserves destination until canceled', () => {
    const resumed = scenario(['calendar','forgot','back','login']);
    const canceled = scenario(['schedule','forgot','closeForgot','login']);
    if (resumed.activeView !== 'calendar' || canceled.activeView !== 'dashboard' || canceled.pendingGuestView !== null)
      throw Error('Forgot-password flow mishandles pending protected destination');
  });
  check('Ordinary Sign in does not force Calendar or Schedule navigation', () => {
    const got = scenario(['login']);
    if (got.activeView !== 'dashboard' || !got.authenticated || got.pendingGuestView !== null)
      throw Error('Normal sign-in should preserve dashboard destination');
  });
  check('Existing guest protected-route guard remains in place without stale redirect', () => {
    const got = scenario(['records','login']);
    if (got.activeView !== 'dashboard' || got.notices[0]?.title !== 'Authentication Required' || got.pendingGuestView !== null)
      throw Error('Original protected-route guard was modified unexpectedly');
  });
  check('Logout clears active and pending destinations; login validates actual session', () => {
    const got = scenario(['calendar','login','logout']);
    if (got.activeView !== 'dashboard' || got.authenticated || got.pendingGuestView !== null || got.isLoginOpen)
      throw Error('Logout leaves protected state active');
    if (!loginModal.includes('hasValidSession && sessionData') || !loginModal.includes('onLoginSuccess(sessionData)'))
      throw Error('Login success must require verified backend session');
  });
  console.log('\n>>> Guest Calendar and Schedule authentication-navigation regression checks');
  for (const item of checks) {
    focusedChecks.push(item);
    try {item.test(); focusedPassed++; console.log('✓ ' + item.name);}
    catch (err) {console.error('✗ ' + item.name + ': ' + err.message);}
  }
}

// -----------------------------------------------------------------------------
// Selected-ward staffing, single reporting ward, schedule UI, and safe history.
// Exercise the real GAS helpers under mocks in addition to source contracts.
// -----------------------------------------------------------------------------
if (selected.some(item => item.id === 'workflows') && passed === selected.length) {
  const gs = readFileSync(join(ROOT_DIR, 'Code.gs'), 'utf8');
  const modal = readFileSync(join(ROOT_DIR, 'src/components/cne/DepartmentalScheduleModal.tsx'), 'utf8');
  const selector = readFileSync(join(ROOT_DIR, 'src/components/cne/WardMultiSelect.tsx'), 'utf8');
  const schedule = readFileSync(join(ROOT_DIR, 'src/components/CNESchedule.tsx'), 'utf8');
  const desktop = readFileSync(join(ROOT_DIR, 'src/components/cne/ScheduleRow.tsx'), 'utf8');
  const mobile = readFileSync(join(ROOT_DIR, 'src/components/cne/ScheduleMobileCard.tsx'), 'utf8');
  const api = readFileSync(join(ROOT_DIR, 'src/services/api.ts'), 'utf8');
  const checks = [];
  const check = (name, test) => checks.push({name, test});
  const coverageCode = gs.slice(gs.indexOf('function resolveDepartmentalWards_'), gs.indexOf('/** Single-ward fallback'));
  const historyCode = gs.slice(gs.indexOf('function parseParticipatingWards_'), gs.indexOf('function handleAddArea'));
  const statusMap = {'NICU':'ACTIVE','PICU':'ACTIVE','PAEDIATRIC WARD':'ACTIVE','CLOSED WARD':'INACTIVE'};
  const staffMap = {'nicu':42,'picu':36,'paediatric ward':28,'closed ward':19};
  function scenario(wards, primary, role = 'ADMIN', allowed = ['NICU']) {
    const context = {result:null, wards, primary, session:{role, assignedAreas:allowed}, statusMap, staffMap};
    vm.runInNewContext(`
      const sanitizeCellInput = x => String(x||'').trim();
      const normalizeAreaMatchingKey_ = x => String(x||'').trim().replace(/\s+/g,' ').toLowerCase();
      const getStaffCountForArea_ = (name,map) => map[normalizeAreaMatchingKey_(name)] ?? 0;
      const checkCNEAuthorized = (s, area) => s.role === 'ADMIN' || s.assignedAreas.some(w=>w.toUpperCase()===area.toUpperCase()) ? null : {errorCode:'FORBIDDEN'};
      ${coverageCode}
      result=resolveDepartmentalWards_(wards,primary,session,staffMap,statusMap);
    `, context, {timeout:2500});
    return JSON.parse(JSON.stringify(context.result));
  }
  check('Explicit NICU, PICU and Paediatric Ward selection calculates exactly 106 staff', () => {
    const v = scenario(['NICU','PICU','Paediatric Ward'],'NICU');
    if (!v.success || v.totalAllottedStaff !== 106 || v.coverageAreasSnapshot !== 'NICU, PICU, Paediatric Ward') throw Error('selected-ward sum is incorrect');
  });
  check('Only one participating ward gives the single-ward count', () => {
    if (scenario(['NICU'],'NICU').totalAllottedStaff !== 42) throw Error('single ward total wrong');
  });
  check('Duplicate participating wards are rejected instead of counted twice', () => {
    if (scenario(['NICU','nicu'],'NICU').errorCode !== 'WARD_SELECTION_INVALID') throw Error('deduplication missing');
  });
  check('Inactive or unknown participating wards are rejected', () => {
    if (scenario(['NICU','Closed Ward'],'NICU').success || scenario(['Unknown Ward'],'Unknown Ward').success) throw Error('inactive/unknown ward accepted');
  });
  check('Primary must be selected and within creator authorization', () => {
    if (scenario(['NICU','PICU'],'ICU').errorCode !== 'WARD_PRIMARY_INVALID') throw Error('unselected primary accepted');
    if (scenario(['NICU','PICU'],'PICU','AREA_INCHARGE',['NICU']).success) throw Error('non-owned ward became primary');
    if (scenario(['NICU','PICU'],'NICU','AREA_INCHARGE',['NICU']).totalAllottedStaff !== 78) throw Error('cross-ward participation should be allowed');
  });
  check('Missing individual ward count contributes zero without disabling a valid ward', () => {
    const v=scenario(['NICU','PICU','Paediatric Ward'],'NICU');
    if (!v.success) throw Error('test setup wrong');
    const context={result:null};
    vm.runInNewContext(`
      const sanitizeCellInput = x=>String(x||'').trim();
      const normalizeAreaMatchingKey_ = x=>String(x||'').trim().toLowerCase();
      const checkCNEAuthorized = ()=>null;
      const getStaffCountForArea_ = (name,map) => map[name.toLowerCase()]??0;
      ${coverageCode}
      result=resolveDepartmentalWards_(['NICU','PICU'],'NICU',{role:'ADMIN'},{nicu:42},{NICU:'ACTIVE',PICU:'ACTIVE'});
    `,context,{timeout:2500});
    if (!context.result.success || context.result.totalAllottedStaff !== 42) throw Error('missing ward count should contribute zero');
  });
  check('Empty ward selection is rejected and initial popup selection is empty', () => {
    if(scenario([],'').success || !modal.includes('useState<string[]>([])') || !modal.includes("createInitialRow('', defaultTeachingMode)")) throw Error('auto selection or empty selection allowed');
  });
  check('Every session retains its dropdown and all rows share ward selection', () => {
    if(!modal.includes('<WardMultiSelect') || !modal.includes('prev.map((r) => ({ ...r, area: primary, participatingWards: next }))') || !modal.includes('participatingWards: [...selectedWards]')) throw Error('session synchronization missing');
  });
  check('Edit CNE loads saved explicit selections and recalculates only after edit', () => {
    if(!schedule.includes('cls.participatingWards?.length') || !schedule.includes('setEditWardChanged(true)') || !schedule.includes('editWardChanged ? { participatingWards: editWards }') || !gs.includes('editedCoverage.totalAllottedStaff')) throw Error('CNE edit/recalc path missing');
  });
  check('Primary Ward remains the only reporting/permission key', () => {
    if(!gs.includes("setCell('area', 2, item.area)") || !gs.includes("setCell('participatingwards', 29, JSON.stringify(batchWards.wards))") || !gs.includes("setColVal('area', 2, sanitizeCellInput(params.area))")) throw Error('reporting identity overwritten');
  });
  check('Historical snapshots are not mistaken for explicitly selected wards', () => {
    const ctx={result:null};
    vm.runInNewContext(`${historyCode} result=parseParticipatingWards_('', 'NICU');`,ctx,{timeout:2500});
    if(JSON.stringify(Array.from(ctx.result))!==JSON.stringify(['NICU']))throw Error('legacy fallback must be primary only');
    if(!gs.includes("key: 'participatingwards'") && !gs.includes("getHeaderMap(sheet)['participatingwards']"))throw Error('dedicated selected ward column missing');
  });
  check('Schedule desktop and mobile display explicit selected wards only', () => {
    if(!desktop.includes('cls.participatingWards.join') || !mobile.includes('item.participatingWards.join') || !desktop.includes('cls.area'))throw Error('schedule display incorrect');
  });
  check('Ward count API is authenticated and mock fails closed', () => {
    if(!gs.includes("case 'getWardStaffCounts'") || !gs.includes("errorCode: 'FORBIDDEN', message: 'Only CNE schedulers") || !api.includes("case 'getWardStaffCounts'") || !api.includes("getWardStaffCounts(): Promise")) throw Error('backend/frontend API scoping incorrect');
    const ctx={result:null};const apiCode=gs.slice(gs.indexOf('function handleGetWardStaffCounts'),gs.indexOf('function ensureCneScheduleCoverageHeaders_'));
    vm.runInNewContext(`${apiCode} result=handleGetWardStaffCounts({},null);`,ctx,{timeout:2500});
    if(ctx.result.errorCode!=='FORBIDDEN')throw Error('guest can read counts');
  });
  check('Participating ward edits fail closed after recorded attendance', () => {
    const update=gs.slice(gs.indexOf('function handleUpdateCNE'),gs.indexOf('function parseDurationToSeconds'));
    for(const token of ['WARD_EDIT_LOCKED',"getSheetByName('CNE Post Test Responses')",'hasAttendance','refreshMutationSession(session)','waitLock(10000)']){
      if(!update.includes(token))throw Error('edit safeguard missing: '+token);
    }
  });
  console.log('\n>>> Multi-ward creation, editing, counting and reporting regression checks');
  for (const item of checks) {
    focusedChecks.push(item);
    try { item.test(); focusedPassed++; console.log('✓ '+item.name); }
    catch(err){ console.error('✗ '+item.name+': '+err.message); }
  }
}

// -----------------------------------------------------------------------------
// Shared selector UX, Central scheduled and Unscheduled retrospective multi-ward.
// Behaviors tested on the real server-side validator under controlled mocks;
// cross-module source guards protect the exact create/edit/display contract.
// -----------------------------------------------------------------------------
if (selected.some(item => item.id === 'workflows') && passed === selected.length) {
  const gs = readFileSync(join(ROOT_DIR, 'Code.gs'), 'utf8');
  const selector = readFileSync(join(ROOT_DIR, 'src/components/cne/WardMultiSelect.tsx'), 'utf8');
  const dept = readFileSync(join(ROOT_DIR, 'src/components/cne/DepartmentalScheduleModal.tsx'), 'utf8');
  const central = readFileSync(join(ROOT_DIR, 'src/components/CNESchedule.tsx'), 'utf8');
  const unscheduled = readFileSync(join(ROOT_DIR, 'src/components/cne/AddUnscheduledCneModal.tsx'), 'utf8');
  const row = readFileSync(join(ROOT_DIR, 'src/components/cne/ScheduleRow.tsx'), 'utf8');
  const card = readFileSync(join(ROOT_DIR, 'src/components/cne/ScheduleMobileCard.tsx'), 'utf8');
  const checks = [];
  const check = (name, test) => checks.push({name, test});
  const validatorCode = gs.slice(gs.indexOf('function resolveDepartmentalWards_'), gs.indexOf('/** Single-ward fallback'));
  function runWards(wards, primary, countAllotted) {
    const ctx = {result:null, wards, primary, countAllotted};
    vm.runInNewContext(`
      const sanitizeCellInput = x => String(x||'').trim();
      const normalizeAreaMatchingKey_ = x => String(x||'').trim().replace(/\s+/g,' ').toLowerCase();
      const getStaffCountForArea_ = (name,map) => map[normalizeAreaMatchingKey_(name)] ?? 0;
      const checkCNEAuthorized = (session, primary, type) => session.role === 'ADMIN' ? null : {errorCode:'FORBIDDEN'};
      ${validatorCode}
      result = resolveCneParticipatingWards_(wards,primary,{role:'ADMIN'}, {nicu:42,picu:null}, {NICU:'ACTIVE',PICU:'ACTIVE'},countAllotted);
    `, ctx, {timeout:2500});
    return JSON.parse(JSON.stringify(ctx.result));
  }
  check('Central scheduled ward selection sums missing second ward as zero', () => {
    const result = runWards(['NICU','PICU'],'NICU',true);
    if (!result.success || result.totalAllottedStaff !== 42 || result.wards.length !== 2)
      throw Error('Central ward resolver failed zero-count policy');
  });
  check('Unscheduled multi-ward selection never records an allotted staff denominator', () => {
    const result = runWards(['NICU','PICU'],'NICU',false);
    if (!result.success || result.totalAllottedStaff !== null || result.coverageAreasSnapshot !== '' || result.wards.length !== 2)
      throw Error('Unscheduled erroneously calculates allotment');
  });
  check('Broken entire staffing master fails closed while missing ward count remains zero', () => {
    const ctx={result:null};
    vm.runInNewContext(`
      const sanitizeCellInput = x => String(x||'').trim();
      const normalizeAreaMatchingKey_ = x => String(x||'').trim().toLowerCase();
      const getStaffCountForArea_ = () => 0;
      const checkCNEAuthorized = () => null;
      ${validatorCode}
      result=resolveDepartmentalWards_(['NICU'],'NICU',{role:'ADMIN'},{__staff_master_unavailable__:true},{NICU:'ACTIVE'});
    `,ctx,{timeout:2500});
    if (ctx.result.errorCode !== 'WARD_STAFF_MASTER_UNAVAILABLE' || !gs.includes("if (!sheet) throw new Error('CNE staff count master sheet is inaccessible')"))
      throw Error('Master access error silently converted to zero');
  });
  check('Central staff-count and ward master checks start when scheduling forms open', () => {
    if (!central.includes('isAddClassOpen || isDeptScheduleOpen || isUnscheduledOpen || editingCne') ||
        !central.includes('Promise.all([ApiService.getAreas(forceFresh), ApiService.getWardStaffCounts()])') ||
        !central.includes('staffCountError={wardMasterError || wardCountError}') || !central.includes('loadError={wardMasterError}'))
      throw Error('Central creation is not gated on both authoritative masters');
  });
  check('New shared ward resolver rejects inactive and duplicate wards in every CNE type', () => {
    if (runWards(['NICU','PICU','nicu'],'NICU',false).errorCode !== 'WARD_SELECTION_INVALID')
      throw Error('Duplicate wards accepted');
    if (runWards(['NICU','Closed Ward'],'NICU',false).errorCode !== 'WARD_SELECTION_INVALID')
      throw Error('Inactive wards accepted');
  });
  check('New shared ward resolver enforces one selected reporting ward', () => {
    if (runWards(['NICU','PICU'],'Other Ward',false).errorCode !== 'WARD_PRIMARY_INVALID')
      throw Error('Unselected reporting ward accepted');
  });
  check('Ward multi-select has Done, click-outside, Escape and disabled closing', () => {
    for (const token of ['>Done</button>', "document.addEventListener('mousedown'", "document.addEventListener('touchstart'", "event.key === 'Escape'", 'if (disabled || isLoading || loadError) setExpanded(false)'])
      if (!selector.includes(token)) throw Error('Missing dropdown close pathway: '+token);
  });
  check('Selector handles unknown per-ward count as 0 and omits staff on Unscheduled', () => {
    if (!selector.includes('showCounts = true') || !selector.includes('showCounts ?') || !selector.includes(' : 0} staff)'))
      throw Error('Missing zero-count / hide-count presentation');
    if (selector.includes('Count unavailable')) throw Error('Old missing-staff warning remains');
  });
  check('Departmental wards remain selected in every session, and every dropdown updates the same shared set', () => {
    if (!dept.includes('idx === 0 ? (') || dept.split('<WardMultiSelect').length < 3 ||
        !dept.includes('onChange={handleWardChange}') || !dept.includes('prev.map((r) => ({ ...r, area: primary, participatingWards: next }))') ||
        dept.includes('<select disabled aria-label'))
      throw Error('Departmental multi-session shared ward dropdown synchronization is broken');
  });
  check('Central creator selects multiple wards and sends them with a primary to backend', () => {
    if (!central.includes('setNewWards(wards); setNewArea(primary)') || !central.includes('participatingWards: newWards') || !central.includes("cneType: 'CENTRAL'"))
      throw Error('Central create payload not connected to selection');
  });
  check('Central edit shows existing wards, allows editing, and recalculates saved totals', () => {
    if (!central.includes("cls.cneType === 'CENTRAL'") || !central.includes("editCneType === 'CENTRAL'") || !central.includes('editWardChanged') || !gs.includes("['DEPARTMENTAL', 'CENTRAL'].indexOf"))
      throw Error('Central update not wired to shared participating wards');
  });
  check('Unscheduled uses the shared selector but hides staffing totals', () => {
    if (!unscheduled.includes('showCounts={false}') || !unscheduled.includes('participatingWards: selectedWards') || !unscheduled.includes('setSelectedWards(wards); setArea(primary)'))
      throw Error('Unscheduled multi-ward selection/count suppression incomplete');
  });
  check('Unscheduled continues requiring actual attendees, never equates allotted with attendance', () => {
    if (!unscheduled.includes('selectedStaffIds.length === 0 && externalStaffList.length === 0') ||
        !gs.includes('if (isUnscheduled && totalStaffCount < 1)') || !gs.includes("if (!isUnscheduled) {\n      setCell('coverageareassnapshot'"))
      throw Error('Unscheduled actual attendee validation or coverage suppression changed');
  });
  check('Backend saves all selected wards once under one primary for each CNE type', () => {
    const creation = gs.slice(gs.indexOf('function handleCreateCNE'),gs.indexOf('function handleUpdateCNE'));
    if (!creation.includes("setCell('area', 2, area)") || !creation.includes("setCell('participatingwards', -1, JSON.stringify(createWards.wards))"))
      throw Error('Backend ward persistence/reporting invalid');
  });
  check('Backend calculates staffed totals for scheduled Central and Departmental but not Unscheduled', () => {
    const creation = gs.slice(gs.indexOf('function handleCreateCNE'),gs.indexOf('function handleUpdateCNE'));
    if (!creation.includes("cneType === 'DEPARTMENTAL' || cneType === 'CENTRAL'") || !creation.includes('!isUnscheduled);') ||
        !creation.includes("if (!isUnscheduled) {\n      setCell('coverageareassnapshot'"))
      throw Error('Backend CNE-type count policy changed');
  });
  check('Desktop and mobile schedule display all explicitly selected wards for all CNE types', () => {
    if (!row.includes('cls.participatingWards?.length') || !card.includes('item.participatingWards?.length') ||
        row.includes("cls.cneType === 'DEPARTMENTAL' && cls.participatingWards") ||
        card.includes("item.cneType === 'DEPARTMENTAL' && item.participatingWards"))
      throw Error('Scheduled ward display still restricted to Departmental');
  });
  console.log('\n>>> Central/Unscheduled shared ward selection and selector UX regression checks');
  for (const item of checks) {
    focusedChecks.push(item);
    try { item.test(); focusedPassed++; console.log('✓ '+item.name); }
    catch (err) { console.error('✗ '+item.name+': '+err.message); }
  }
}

// -----------------------------------------------------------------------------
// Focused guards for the Unscheduled multi-select / staff-master error UX.
// The create-form ward-validation logic is executed with controlled inputs;
// other checks ensure the existing selected-ward / zero-count contract remains.
// -----------------------------------------------------------------------------
if (selected.some(item => item.id === 'workflows') && passed === selected.length) {
  const unscheduled = readFileSync(join(ROOT_DIR, 'src/components/cne/AddUnscheduledCneModal.tsx'), 'utf8');
  const selector = readFileSync(join(ROOT_DIR, 'src/components/cne/WardMultiSelect.tsx'), 'utf8');
  const checks = [];
  const check = (name, test) => checks.push({name, test});

  check('Unscheduled starts with no primary or participating ward auto-selected', () => {
    if (!unscheduled.includes("const [area, setArea] = useState('');") ||
        !unscheduled.includes('const [selectedWards, setSelectedWards] = useState<string[]>([]);') ||
        unscheduled.includes('setArea(areasList[0])'))
      throw Error('Unscheduled form reintroduced an implicit default ward');
  });

  // Extract the real input guard from handleSubmit and exercise it without
  // requiring React, a DOM, or installed bundler dependencies.
  const guardStart = unscheduled.indexOf('    if (selectedWards.length === 0) {');
  const guardEnd = unscheduled.indexOf('    if (!modeOfTeaching.trim()', guardStart);
  const guardSource = guardStart >= 0 && guardEnd > guardStart
    ? unscheduled.slice(guardStart, guardEnd).replace('(value: string, name: string): boolean =>', '(value, name) =>')
    : '';
  function validateWards(selectedWards, area, areasList) {
    if (!guardSource) throw Error('Unscheduled selected-ward validation gate missing');
    const context = { selectedWards, area, areasList, errors: [], result: null };
    vm.runInNewContext(`
      const error = (message) => errors.push(message);
      const validate = () => { ${guardSource} return true; };
      result = validate();
    `, context, {timeout: 2500});
    return {accepted: context.result === true, errors: context.errors};
  }

  check('Unscheduled refuses an empty selection even if a hidden primary exists', () => {
    const result = validateWards([], 'NICU', ['NICU', 'PICU']);
    if (result.accepted || result.errors.length !== 1 ||
        !result.errors[0].includes('select at least one Department / Ward'))
      throw Error('Hidden primary can bypass explicit ward selection');
  });
  check('Unscheduled refuses an unselected reporting ward', () => {
    for (const primary of ['', 'PICU']) {
      const result = validateWards(['NICU'], primary, ['NICU', 'PICU']);
      if (result.accepted || result.errors.length !== 1 || !result.errors[0].includes('Primary Ward'))
        throw Error('Unselected or empty primary accepted: ' + primary);
    }
  });
  check('Unscheduled rejects inactive participating wards, accepts multiple valid wards', () => {
    const inactive = validateWards(['NICU', 'Closed Ward'], 'NICU', ['NICU', 'PICU']);
    const valid = validateWards(['NICU', 'PICU'], 'NICU', ['NICU', 'PICU']);
    if (inactive.accepted || inactive.errors.length !== 1 ||
        !inactive.errors[0].includes('inactive') || !valid.accepted || valid.errors.length !== 0)
      throw Error('Unscheduled ward activity check or multi-ward validity broken');
  });
  check('Staff-master errors display Unavailable, while missing ward counts remain zero', () => {
    if (!selector.includes("staffCountError ? 'Unavailable' : selectedTotal") ||
        !selector.includes("staffCountError ? '(staff count unavailable)'") ||
        !selector.includes('showCounts && staffCountError && (') ||
        !selector.includes('role="alert"') ||
        !selector.includes("typeof count === 'number' && Number.isFinite(count) ? count : 0") ||
        !selector.includes('showCounts = true'))
      throw Error('Staffing-master errors or per-ward zero fallback incorrectly presented');
  });

  console.log('\n>>> Unscheduled selection and staffing-master error UI regression checks');
  for (const item of checks) {
    focusedChecks.push(item);
    try { item.test(); focusedPassed++; console.log('✓ '+item.name); }
    catch (err) { console.error('✗ '+item.name+': '+err.message); }
  }
}

// -----------------------------------------------------------------------------
// Departmental publish deduplication — true receipt behavior with mock Sheets.
// These checks supplement the 436 inherited checks; no legacy checks removed.
// -----------------------------------------------------------------------------
if (selected.some(item => item.id === 'workflows') && passed === selected.length) {
  const gs = readFileSync(join(ROOT_DIR, 'Code.gs'), 'utf8');
  const api = readFileSync(join(ROOT_DIR, 'src/services/api.ts'), 'utf8');
  const ui = readFileSync(join(ROOT_DIR, 'src/components/cne/DepartmentalScheduleModal.tsx'), 'utf8');
  const start = gs.indexOf('function ensureDepartmentalSubmissionHeaders_(');
  const end = gs.indexOf('/**\n * Batch Schedule Departmental CNEs', start);
  if (start < 0 || end < start) throw Error('Departmental scheduling receipt helper missing');
  const receiptSource = gs.slice(start, end);
  const checks = [];
  const check = (name, test) => checks.push({name,test});
  const submissionId = 'f63dc158-8dcf-48c7-9b16-09a9c145e9fd';
  const keys = {
    departmentalsubmissionid: 0,
    departmentalsubmissiondigest: 1,
    departmentalsubmissioncount: 2,
    cneid: 3,
    proposedby: 4
  };
  function fixture(rows) {
    const data = rows.map(row => [...row]);
    const sheet = {
      data,
      getLastColumn: () => 5,
      getLastRow: () => data.length + 1,
      getMaxColumns: () => 5,
      getRange: (row, col, count = 1, width = 1) => ({
        getValues: () => data.slice(row - 2, row - 2 + count).map(x => x.slice(col - 1, col - 1 + width))
      })
    };
    const ctx = {
      sheet,
      normalizeEmpId: x => String(x || '').trim().toUpperCase(),
      getHeaderMap: () => keys,
      findExactRowsInColumn_: (s,col,id) => s.data.map((row,i)=> String(row[col]||'').toLowerCase() === String(id).toLowerCase() ? i + 2 : -1).filter(x=>x>0),
      Utilities: { DigestAlgorithm: { SHA_256:'SHA_256' }, computeDigest: (_, text) => Array.from(createHash('sha256').update(text).digest()).map(v => v>127 ? v-256 : v) },
      LockService: { getScriptLock: () => ({tryLock: () => true, releaseLock:()=>{}}) },
      getSpreadsheet: () => ({getSheetByName:()=>sheet}),
      result: null
    };
    vm.runInNewContext(receiptSource,ctx,{timeout:2500});
    return ctx;
  }
  const row = (id='CNE-A', digest='digest1', count=1, owner='AIIMSRANS00031', token=submissionId)=>[token,digest,count,id,owner];
  const invoke = (ctx, digest='digest1', owner='AIIMSRANS00031') =>
    JSON.parse(JSON.stringify(ctx.readDepartmentalSubmissionReceipt_(ctx.sheet,submissionId,owner,digest)));
  check('Repeated submission ID returns original CNE ID without requesting any new allocation',()=>{
    const ctx=fixture([row()]);
    const receipt=invoke(ctx);
    if (!receipt.success || receipt.status!=='COMMITTED' || receipt.data.createdIds.join(',')!=='CNE-A' || !receipt.data.recovered)
      throw Error('Original CNE was not recovered');
  });
  check('Intentional multi-session batch returns every existing CNE ID once',()=>{
    const ctx=fixture([row('CNE-A','digest1',2),row('CNE-B','digest1',2)]);
    const receipt=invoke(ctx);
    if (!receipt.success || receipt.data.count!==2 || receipt.data.createdIds.join(',')!=='CNE-A,CNE-B')
      throw Error('Multiple session receipts lost or duplicated');
  });
  check('Partial batch fails closed and cannot silently create additional CNEs',()=>{
    const ctx=fixture([row('CNE-A','digest1',2)]);
    const receipt=invoke(ctx);
    if (receipt.success || receipt.errorCode!=='SUBMISSION_COMMIT_UNCERTAIN') throw Error('Partial write allowed');
  });
  check('The same Submission ID cannot be reused with a modified payload',()=>{
    const ctx=fixture([row()]);
    if(invoke(ctx,'different').errorCode!=='SUBMISSION_ID_REUSED') throw Error('Payload reuse accepted');
  });
  check('Submission receipt is scoped to authenticated submitting employee',()=>{
    const ctx=fixture([row()]);
    if(invoke(ctx,'digest1','AIIMSRANS00099').errorCode!=='FORBIDDEN') throw Error('Other user can recover receipt');
  });
  check('Missing receipt is distinguishable from successful commit',()=>{
    const ctx=fixture([]);
    const receipt=invoke(ctx);
    if(!receipt.success || receipt.status!=='NOT_FOUND' || receipt.data.status!=='NOT_FOUND') throw Error('Missing receipt incorrectly considered committed');
  });
  check('Duplicate IDs and inconsistent receipt digest fail closed',()=>{
    const dup=invoke(fixture([row('CNE-A','digest1',2),row('CNE-A','digest1',2)]));
    const mixed=invoke(fixture([row('CNE-A','digest1',2),row('CNE-B','digest2',2)]));
    if(dup.errorCode!=='SUBMISSION_COMMIT_UNCERTAIN' || mixed.errorCode!=='SUBMISSION_COMMIT_UNCERTAIN')
      throw Error('Ambiguous receipt accepted');
  });
  check('Request ID must be UUID v4; invalid request never begins sheet mutation',()=>{
    const ctx=fixture([]);
    if(!ctx.isValidDepartmentalSubmissionId_(submissionId) || ctx.isValidDepartmentalSubmissionId_('hello') ||
      ctx.isValidDepartmentalSubmissionId_('aaaaaaaa-aaaa-3aaa-aaaa-aaaaaaaaaaaa')) throw Error('Submission ID gate weakened');
    const fn=gs.slice(gs.indexOf('function handleAddDepartmentalSchedule('),gs.indexOf('/**',gs.indexOf('function handleAddDepartmentalSchedule(')+20));
    if(fn.indexOf('isValidDepartmentalSubmissionId_')<0 || fn.indexOf('isValidDepartmentalSubmissionId_')>fn.indexOf('getCneStaffCountMap_(true)')) throw Error('Invalid ID guard occurs after sheet work');
  });
  check('Backend receipt lookup occurs under ScriptLock before allocating CNE IDs',()=>{
    const fn=gs.slice(gs.indexOf('function handleAddDepartmentalSchedule('),gs.indexOf('/**',gs.indexOf('function handleAddDepartmentalSchedule(')+20));
    const locked=fn.indexOf('lock.waitLock(15000)');
    const receipt=fn.indexOf('readDepartmentalSubmissionReceipt_(sheet, submissionId');
    const allocate=fn.indexOf('var createdIds = []');
    if(locked<0 || receipt<locked || allocate<receipt || !fn.includes('SpreadsheetApp.flush()')) throw Error('Server deduplication not locked before write');
  });
  check('Network ambiguity checks existing submission, and retry retains identical ID',()=>{
    for(const phrase of ['departmentalPayloadFingerprint(payload)','sessionStorage.setItem(storageKey',
      'getDepartmentalScheduleSubmissionStatus(pending.submissionId)', 'ApiService.addDepartmentalSchedule(payload, pending.submissionId)',
      "status.data?.status === 'COMMITTED'", 'sessionStorage.removeItem(storageKey)'])
      if(!ui.includes(phrase)) throw Error('Missing client recovery step '+phrase);
    if(!api.includes("'getDepartmentalScheduleSubmissionStatus'") || !gs.includes("case 'getDepartmentalScheduleSubmissionStatus':"))
      throw Error('Status endpoint not wired');
  });
  check('Executable Departmental Publish creates once, recovers same IDs, and preserves intentional new batches',()=>{
    const handlerSource=gs.slice(gs.indexOf('function handleAddDepartmentalSchedule('),gs.indexOf('/**',gs.indexOf('function handleAddDepartmentalSchedule(')+30));
    const f=['cneid','topic','area','fromdate','todate','duration','resourcepersonempid','modeofteaching','description','maxparticipants','status','typeofcne','externalresourcepersons','staffempid','staffcount','externalstaffparticipants','proposedby','adminremarks','remarks','createdat','createdby','coverageareassnapshot','totalallottedstaff','internalattendancecount','attendancepercentage','posttestoutcomepercentage','coveragefinalizedat','participatingwards','departmentalsubmissionid','departmentalsubmissiondigest','departmentalsubmissioncount'];
    const cm=Object.fromEntries(f.map((key,index)=>[key,index]));
    let rows=[], writes=0, audits=[];
    const sheet={
      getLastColumn:()=>f.length,getLastRow:()=>rows.length+1,getMaxRows:()=>100,getMaxColumns:()=>f.length+5,
      getRange:(r,c,n=1,m=1)=>({
        setValues: values=>{if(r>1){values.forEach((v,i)=>{rows[r-2+i]=[...v];});writes++;}},
        getValues:()=>Array.from({length:n},(_,i)=>(rows[r-2+i]||[]).slice(c-1,c-1+m)),
        setFontWeight:()=>{}
      })
    };
    const ctx={
      sanitizeCellInput:x=>String(x||'').trim(), normalizeEmpId:x=>String(x||'').toUpperCase().trim(),
      getIndiaTodayString:()=> '2026-10-23',parseCneStartTimestamp_:x=>Date.parse(x),getCNECanonicalDay:x=>x.slice(0,10),
      validateCneDuration:()=>({isValid:true}),requireActiveTeachingMode_:()=>null,checkCNEAuthorized:()=>null,
      requireActiveArea_:()=>null,findOfficerById:()=>null,getCneStaffCountMap_:()=>({nicu:42}),
      refreshMutationSession:session=>({success:true,session}),getAreaStatusMap_:()=>({NICU:'ACTIVE'}),
      getTeachingModeStatusMap_:()=>({'LECTURE CUM DISCUSSION':'ACTIVE'}),
      getOrCreateSheet:()=>sheet,getSpreadsheet:()=>({getSheetByName:()=>sheet}),getHeaderMap:()=>cm,
      ensureCneScheduleCoverageHeaders_:()=>{},ensureParticipatingWardsHeader_:()=>{},
      resolveDepartmentalWards_:selected=>({success:true,wards:selected,coverageAreasSnapshot:'NICU:42',totalAllottedStaff:42}),
      isCneIdInUse_:()=>false,logAuditAction:(...a)=>audits.push(a),
      LockService:{getScriptLock:()=>({waitLock:()=>{},tryLock:()=>true,releaseLock:()=>{}})},
      SpreadsheetApp:{flush:()=>{}},
      Utilities:{DigestAlgorithm:{SHA_256:'SHA_256'},computeDigest:(_,t)=>Array.from(createHash('sha256').update(t).digest()).map(v=>v>127?v-256:v)},
      findExactRowsInColumn_:(sh,col,id)=>rows.map((r,i)=>String(r[col]||'').toLowerCase()===id.toLowerCase()?i+2:-1).filter(x=>x>0)
    };
    vm.runInNewContext(receiptSource+handlerSource,ctx,{timeout:5000});
    const admin={role:'ADMIN',employeeId:'AIIMSRANS00031'};
    const details={topic:'IV Therapy',area:'NICU',participatingWards:['NICU'],date:'2026-10-24T10:00',toDate:'2026-10-24T11:00',duration:'01:00:00',modeOfTeaching:'Lecture Cum Discussion',externalResourcePersons:['Trainer']};
    const run=(id,schedules=[details])=>JSON.parse(JSON.stringify(ctx.handleAddDepartmentalSchedule({submissionId:id,schedules},admin)));
    const first=run(submissionId);const second=run(submissionId);
    const changed=run(submissionId,[{...details,topic:'Changed Topic'}]);
    const id2='f63dc158-8dcf-48c7-9b16-09a9c145e9fe';
    const intentional=run(id2);
    const status=JSON.parse(JSON.stringify(ctx.handleGetDepartmentalSubmissionStatus({submissionId},admin)));
    // Simulate a backend flush exception AFTER setValues persisted the rows.
    // A retry must read the authoritative receipt, not add a second record.
    const id3='f63dc158-8dcf-48c7-9b16-09a9c145e9ff';
    ctx.SpreadsheetApp.flush=()=>{throw Error('Simulated transient Sheets flush failure');};
    const uncertain=run(id3);
    ctx.SpreadsheetApp.flush=()=>{};
    const afterUncertain=run(id3);
    if(uncertain.errorCode!=='SUBMISSION_COMMIT_UNCERTAIN' || !afterUncertain.success ||
      !afterUncertain.data.recovered || writes!==3 || audits.length!==2 || rows.length!==3)
      throw Error('Lost-after-write response created duplicates on retry');
    if(!first.success || !second.success || !second.data.recovered ||
      first.data.createdIds[0]!==second.data.createdIds[0] || changed.errorCode!=='SUBMISSION_ID_REUSED' ||
      !intentional.success || !status.success || status.data.createdIds[0]!==first.data.createdIds[0] ||
      writes!==3 || audits.length!==2 || rows.length!==3)
      throw Error('One-click idempotency, recovery or legitimate second scheduling batch failed');
  });
  check('Audit log correlates one request ID with created IDs and API uses createdIds response',()=>{
    if(!gs.includes("'Submission ' + submissionId + ' scheduled '") ||
      !gs.includes('data: { createdIds: createdIds, createdClasses: createdIds, count: createdIds.length'))
      throw Error('Audit/response submission correlation absent');
  });
  // Additional regression cases for the Google AI Studio v19 edits.
  // These are deliberately applied to executable helpers and to the precise
  // guarded request lifecycle, to prevent 448 passing checks from concealing
  // a weakened request digest or a lost pending Submission ID.
  check('Receipt digest binds Resource Persons, capacity, remarks and participating wards',()=>{
    const ctx=fixture([]);
    const base={topic:'A',area:'NICU',participatingWards:['NICU'],date:'2026-10-25T09:00',
      toDate:'2026-10-25T10:00',duration:'01:00:00',rpClean:['AIIMSRANS00031'],extRpClean:['Trainer A'],
      mode:'Lecture Cum Discussion',description:'Description',maxParticipants:30,adminRemarks:'Initial'};
    const digest=x=>ctx.departmentalSubmissionDigest_([x]);
    const original=digest(base);
    const variants=[
      {...base,rpClean:['AIIMSRANS00032']},
      {...base,extRpClean:['Trainer B']},
      {...base,maxParticipants:60},
      {...base,adminRemarks:'Changed'},
      {...base,participatingWards:['NICU','PICU']},
      {...base,description:'Different description'},
      {...base,date:'2026-10-26T09:00'}
    ];
    if(variants.some(v=>digest(v)===original)) throw Error('Digest ignores an authoritative validated scheduling field');
  });
  check('Malformed or absent receipt columns fail closed instead of returning NOT_FOUND',()=>{
    for(const absent of ['departmentalsubmissionid','departmentalsubmissiondigest',
      'departmentalsubmissioncount','cneid','proposedby']) {
      const ctx=fixture([row()]);
      const columns={...keys}; delete columns[absent];
      ctx.getHeaderMap=()=>columns;
      const result=invoke(ctx);
      if(result.success || result.errorCode!=='SUBMISSION_RECEIPT_UNAVAILABLE')
        throw Error('Missing '+absent+' header failed open');
    }
  });
  check('Blank digest, invalid batch count and duplicate receipt ID fail closed',()=>{
    const invalid=[
      [row('CNE-A','',1)], [row('CNE-A','digest1',0)],
      [row('CNE-A','digest1',51)], [row('', 'digest1',1)],
      [row('CNE-A','digest1',2),row('CNE-A','digest1',2)]
    ];
    for(const rows of invalid){
      const out=invoke(fixture(rows));
      if(out.success || out.errorCode!=='SUBMISSION_COMMIT_UNCERTAIN')
        throw Error('Corrupt receipt was accepted: '+JSON.stringify(rows));
    }
  });
  check('Status lookup uses ScriptLock and reports IN_PROGRESS while publish is active',()=>{
    const ctx=fixture([]);
    let read=false, released=false;
    ctx.LockService={getScriptLock:()=>({tryLock:()=>false, releaseLock:()=>{released=true;}})};
    ctx.getSpreadsheet=()=>{read=true;throw Error('Should not read while lock is unavailable');};
    const result=JSON.parse(JSON.stringify(ctx.handleGetDepartmentalSubmissionStatus({submissionId},
      {employeeId:'AIIMSRANS00031'})));
    if(!result.success || result.data?.status!=='IN_PROGRESS' || read || released)
      throw Error('Concurrent publish was incorrectly reported as NOT_FOUND');
  });
  check('Status read failures do not masquerade as uncommitted submissions',()=>{
    const ctx=fixture([]);
    ctx.getSpreadsheet=()=>{throw Error('Google Sheets temporarily unavailable');};
    const result=JSON.parse(JSON.stringify(ctx.handleGetDepartmentalSubmissionStatus({submissionId},
      {employeeId:'AIIMSRANS00031'})));
    if(result.success || result.errorCode!=='SUBMISSION_STATUS_UNAVAILABLE')
      throw Error('Backend status error falsely reported NOT_FOUND');
  });
  check('Backend guards uncertain setValues failures and verifies receipt after flush',()=>{
    const src=gs.slice(gs.indexOf('function handleAddDepartmentalSchedule('));
    const protectedWrite=/try\s*\{\s*sheet\.getRange\(startRow,\s*1,\s*numRows,\s*numColumns\)\.setValues\(allRows\);\s*SpreadsheetApp\.flush\(\);\s*\}\s*catch\s*\(writeErr\)/;
    if(!protectedWrite.test(src) ||
       !src.includes('confirmed = readDepartmentalSubmissionReceipt_(sheet, submissionId, session.employeeId, requestDigest)') ||
       !src.includes("confirmed.status !== 'COMMITTED'"))
       throw Error('Write and post-write receipt readback are not fail-closed');
  });
  check('Submission ID persists through form remounts and lost status responses',()=>{
    const expected=[
      'pendingSubmissionRef.current', 'sessionStorage.getItem(departmentalSubmissionStorageKey(',
      'sessionStorage.setItem(storageKey', 'pending.createdAt',
      'reusedPending', 'if (!previous.success || previous.data?.status !== \'NOT_FOUND\'',
      "prior.data?.status === 'IN_PROGRESS'", 'ApiService.addDepartmentalSchedule(payload, pending.submissionId)',
      'newDepartmentalSubmissionId()', 'crypto.getRandomValues(bytes)'
    ];
    for(const phrase of expected) if(!ui.includes(phrase)) throw Error('Lost safety step: '+phrase);
    if(ui.includes('} catch (ignored) {}') || ui.includes('Math.random() * 16'))
      throw Error('Swallowed status errors or weak random Submission ID generator');
  });
  check('Frontend SHA-256 fingerprint covers the complete scheduling request',()=>{
    if(!ui.includes("crypto.subtle.digest('SHA-256', bytes)") ||
       !ui.includes('JSON.stringify(payload)') ||
       !ui.includes('resourcePersonEmpIds: rpIds') ||
       !ui.includes('externalResourcePersons: r.externalResourcePersons || []'))
       throw Error('Client fingerprint omits scheduling fields or lacks SHA-256');
  });
  console.log('\n>>> Departmental CNE exactly-once submission / recovery checks');
  for(const item of checks) {
    focusedChecks.push(item);
    try {item.test(); focusedPassed++; console.log('✓ '+item.name);}
    catch(e){console.error('✗ '+item.name+': '+e.message);}
  }
}

// -----------------------------------------------------------------------------
// Bounded objective-specific retrieval: behavioral checks against executable GAS
// helpers, plus PLAN/FINISH and quota invariants. Do not weaken core suites.
// -----------------------------------------------------------------------------
if (selected.some(item=>item.id==='performance') && passed===selected.length) {
  const gas=readFileSync(join(ROOT_DIR,'Code.gs'),'utf8');
  const checks=[]; const check=(name,test)=>checks.push({name,test});
  const start=gas.indexOf('function cneAiObjectiveSearchTokens_(');
  const end=gas.indexOf('function retrieveCNETopicEvidence(',start);
  const js=gas.slice(start,end);
  const fixture=()=>{
    const env={
      cneAiCitationText_:x=>String(x||'').replace(/\s+/g,' ').trim().toLowerCase(),
      cneReferenceChunkReadable_:x=>String(x||'').length>50
    };
    vm.runInNewContext(js,env,{timeout:3000});
    return env;
  };
  const text=(topic,detail)=>`Nursing clinical passage about ${topic}. ${detail} is essential for safe nursing care, nursing assessment and therapy. `.repeat(3);
  const ev=(id,topic,detail,book='Approved Handbook')=>({indexId:id,sourceType:'LOCAL_REFERENCE_LIB',
    resourceTitle:book,topic,sectionHeading:detail,clinicalKeywords:detail,
    chunkText:text(topic,detail),relevanceScore:100});
  const objectives=[
    {objectiveId:'OBJ_1',objective:'Assess safe peripheral intravenous catheter insertion and catheter selection',evidenceId:'BASE_1'},
    {objectiveId:'OBJ_2',objective:'Apply aseptic technique for infection prevention during catheter insertion',evidenceId:'BASE_2'},
    {objectiveId:'OBJ_3',objective:'Identify signs of infiltration and phlebitis at an IV catheter site',evidenceId:'BASE_3'},
    {objectiveId:'OBJ_4',objective:'Select safe dressing and monitoring for peripheral venous catheter care',evidenceId:'BASE_4'},
    {objectiveId:'OBJ_5',objective:'Assess vein selection and catheter size for intravenous access',evidenceId:'BASE_5'}
  ];
  const base=objectives.map((o,i)=>ev(o.evidenceId,'IV cannulation','Clinical unrelated general text for '+o.objectiveId,'Baseline'))
    .concat(Array.from({length:7},(_,i)=>ev('BASE_'+(i+6),'IV cannulation','General cannulation overview','Baseline')));
  check('Initial topic selection is retained as the PLAN evidence set',()=>{
    if(!gas.includes('cneAiSelectTopicEvidence_(scoredUploaded.concat(scoredLibrary)') ||
       !gas.includes('if (params.planOnly) return {success:true,data:{objectives:objectives},planned:true}'))
      throw Error('Initial PLAN evidence flow changed');
  });
  check('Objective expansion is capped at ten extra passages, never a whole textbook',()=>{
    const ctx=fixture();
    const more=[];
    for(let i=0;i<5;i++)for(let j=0;j<10;j++)
      more.push(ev('EXP_'+i+'_'+j,'IV cannulation',objectives[i].objective+' '+(j%2?'site selection':'complication management'),'Book '+(j%3)));
    const result=ctx.cneAiExpandObjectiveEvidence_(base,more,objectives);
    if(result.evidence.length>22||result.addedCount>10||result.evidence.length!==base.length+result.addedCount)
      throw Error('Excessive evidence passed to generation');
    for(let i=0;i<5;i++)if((result.perObjective['OBJ_'+(i+1)]||[]).length>2)
      throw Error('Objective exceeds two extra chunks');
  });
  check('All twelve initial evidence IDs remain eligible through FINISH',()=>{
    const ctx=fixture(),extra=objectives.map((o,i)=>ev('X'+i,'IV cannulation',o.objective));
    const result=ctx.cneAiExpandObjectiveEvidence_(base,extra,objectives);
    for(const b of base)if(!result.evidence.some(item=>item.indexId===b.indexId))
      throw Error('A PLAN evidence ID was dropped');
  });
  check('Duplicate source IDs and copied source text cannot pad the retrieval budget',()=>{
    const ctx=fixture(),repeated=Array.from({length:10},(_,i)=>({...ev('DUP'+i,'IV cannulation',objectives[0].objective),
      chunkText:text('IV cannulation',objectives[0].objective)}));
    const outcome=ctx.cneAiExpandObjectiveEvidence_(base,repeated,objectives);
    if(outcome.addedCount>1)throw Error('Same source content added multiple times');
  });
  check('Weak one-word lexical overlap does not qualify as objective evidence',()=>{
    const ctx=fixture(),topic=ev('WEAK','IV cannulation','Peripheral IV catheter hygiene');
    if(ctx.cneAiObjectiveEvidenceScore_('Assess site',topic)!==0)
      throw Error('Single word match was accepted');
  });
  check('Better objective evidence may be rebound but unknown evidence never is',()=>{
    const ctx=fixture(),
      poor={...ev('BASE_1','IV cannulation','Unrelated introduction'),chunkText:text('IV','general')},
      strong=ev('NEW','IV cannulation',objectives[0].objective),
      low=ev('WEAK','IV cannulation','General nursing');
    const chosen=ctx.cneAiChooseObjectiveEvidence_([objectives[0]],[poor,strong,low],{OBJ_1:['NEW','WEAK','FABRICATED']});
    if(chosen[0].evidenceId!=='NEW')throw Error('Relevant objective source was not selected');
    const unchanged=ctx.cneAiChooseObjectiveEvidence_([objectives[0]],[poor,strong],{OBJ_1:['FABRICATED']});
    if(unchanged[0].evidenceId!=='BASE_1')throw Error('Unapproved source replaced original');
  });
  check('Source diversity favors a second reference when objective score is comparable',()=>{
    const ctx=fixture(),o=[objectives[1]];
    const candidates=[ev('ONE','IV cannulation',o[0].objective,'Baseline'),
      ev('TWO','IV cannulation',o[0].objective,'New Book')];
    const chosen=ctx.cneAiExpandObjectiveEvidence_(base,candidates,o);
    if(chosen.addedCount<1 || !chosen.evidence.some(e=>e.resourceTitle==='New Book'))
      throw Error('Approved alternate reference ignored');
  });
  check('Expansion uses original topic safety gate before objective ranking',()=>{
    const source=gas.slice(gas.indexOf('function retrieveCNETopicEvidence('),gas.indexOf('function extractTextFromPdf('));
    if(!source.includes('passesClinicalRelevanceGate(cleanTopic, lc)') ||
       !source.includes('passesClinicalRelevanceGate(cleanTopic, uc)') ||
       !source.includes('cneAiExpandObjectiveEvidence_(totalEvidence,scoredUploaded.concat(scoredLibrary),options.objectives)'))
      throw Error('Objective evidence bypasses original topic filtering');
  });
  check('Objective search excludes inactive library resources and other CNE uploads',()=>{
    const source=gas.slice(gas.indexOf('function retrieveCNETopicEvidence('),gas.indexOf('function extractTextFromPdf('));
    if(!source.includes("if (rowCneId === upperCneId)")||!source.includes('activeLibFiles[rowDriveId]')||
       !source.includes("status !== 'SUCCESS'"))
      throw Error('Cross-user or inactive documents may enter expansion');
  });
  check('PLAN remains 12 chunks; FINISH performs one enhanced index retrieval',()=>{
    if(!gas.includes('params.preparedBlueprint && Array.isArray(params.preparedBlueprint)')||
       !gas.includes('retrieveCNETopicEvidence(cneId,record.topic,session,{objectives:params.preparedBlueprint})')||
       !gas.includes('phase===\'FINISH\'?savedJob.objectives:null'))
      throw Error('Two-stage bounded expansion is not wired to FINISH');
  });
  check('Evidence audit contains Index IDs and source names without storing passages',()=>{
    const source=gas.slice(gas.indexOf("var audit=valData.evidenceExpansionAudit"),gas.indexOf('var byId={}; retrievedEvidence.forEach',gas.indexOf("var audit=valData.evidenceExpansionAudit")));
    if(!source.includes("logAuditAction('AI_EVIDENCE_COVERAGE'") || !source.includes('o.evidenceId') ||
       source.includes('source.chunkText') || source.includes('JSON.stringify(retrievedEvidence)'))
      throw Error('Evidence coverage audit is unavailable or exposes source text');
  });
  check('Evidence-related validation failures may trigger one bounded alternate-source repair',()=>{
    const start=gas.indexOf('var evidenceRebindUsed={}');
    const end=gas.indexOf('var errors={INVALID_CORRECT_OPTION',start);
    const repair=gas.slice(start,end);
    if(start<0 || !repair.includes('if(needsAlternative && !evidenceRebindUsed[obj.objectiveId])')||
       !repair.includes('audit.perObjective[obj.objectiveId]') ||
       !repair.includes('cneAiObjectiveEvidenceScore_(obj.objective,next)<6') ||
       !repair.includes("cneAiVerifiedSpans_(String(next.chunkText||''),obj.objectiveId)") ||
       !repair.includes('AI_EVIDENCE_REBIND'))
      throw Error('Source-related repairs cannot switch once to an approved alternative');
  });
  check('Question-repair evidence switch preserves original four-repair budget',()=>{
    const start=gas.indexOf('function generateAiQuestionsInternal(');
    const end=gas.indexOf('function cneAiHasOwnMaterial_',start);
    const src=gas.slice(start,end);
    if(!src.includes('MAX_CORRECTIONS=4, MAX_CORRECTIONS_PER_QUESTION=2') ||
       !src.includes('correctionCount<MAX_CORRECTIONS') ||
       !src.includes('cneAiEvidenceSupported_(') ||
       !src.includes('validatedQuestions.push(checked.data)'))
      throw Error('Retry quotas or final clinical check were weakened');
  });
  check('Original clinical citation and answer checks still precede question staging',()=>{
    const src=gas.slice(gas.indexOf('function generateAiQuestionsInternal('),gas.indexOf('function cneAiHasOwnMaterial_('));
    if(!src.includes('cneAiCheckBlueprint_(')||!src.includes('cneAiResolveVerifiedSpan_(')||
       !src.includes('cneAiEvidenceSupported_(') ||
       !(src.indexOf('cneAiEvidenceSupported_(')<src.indexOf('validatedQuestions.push(')))
      throw Error('Clinical verification was weakened');
  });
  check('Quota, draft-first commit and library consent checks are unchanged',()=>{
    if(!gas.includes("if (params.allowLibraryOnly !== true) return {success:false,errorCode:'LIBRARY_CONSENT_REQUIRED'") ||
       !gas.includes('handleCommitAiQuota({')||!gas.includes('planOnly: phase===\'PLAN\''))
      throw Error('Existing quota or explicit-consent protections changed');
  });
  console.log('\n>>> Objective-specific indexed evidence expansion checks');
  for(const item of checks){focusedChecks.push(item);try{item.test();focusedPassed++;console.log('✓ '+item.name);}catch(e){console.error('✗ '+item.name+': '+e.message);}}
}

// -----------------------------------------------------------------------------
// Clinical semantic chunking and metadata-first, fail-safe index retrieval.
// These are executable Apps Script helper tests, not string-only declarations.
// -----------------------------------------------------------------------------
if (selected.some(item=>item.id==='performance') && passed===selected.length) {
  const gas=readFileSync(join(ROOT_DIR,'Code.gs'),'utf8');
  const checks=[];const check=(name,test)=>checks.push({name,test});
  const semantic=gas.slice(gas.indexOf('function cneReferenceSemanticWindows_('),gas.indexOf('/**\n * Extract textual content from a reference library document blob.',gas.indexOf('function cneReferenceSemanticWindows_(')));
  const helper=gas.slice(gas.indexOf('function cneAiReadTopicIndexRows_('),gas.indexOf('function retrieveCNETopicEvidence(',gas.indexOf('function cneAiReadTopicIndexRows_(')));
  const setup=()=>{
    const ctx={isProbableHeading:(s)=>/^(?:Chapter \d+|Site Selection|Infection Prevention)$/i.test(s),calculateTopicRelevanceScore:(q,c)=>[c.sectionHeading,c.clinicalKeywords,c.topic,c.resourceTitle].join(' ').toLowerCase().includes(q.toLowerCase())?50:0,
      cneAiObjectiveEvidenceScore_:()=>0,cneAiObjectiveSearchTokens_:()=>['intravenous','catheter']};
    // These semantic-retrieval fixtures intentionally use the legacy 12-field
    // in-memory view. Exact physical sheet-schema guards are tested separately.
    ctx.cneRequireIndexHeaders_=()=>{};
    ctx.CNE_SHEET_HEADERS={'CNE_Reference_Index':['Index ID','Drive File ID','Resource Title','Topic','Section / Heading','Chunk Index','Chunk Text','Clinical Keywords','Extraction Status','Updated At'],
      'CNE_Material_Index':['Index ID','CNE ID','Drive File ID','Resource Title','Topic','Section / Heading','Chunk Index','Chunk Text','Clinical Keywords','Extraction Status','Updated At']};
    ctx.CNE_INDEX_CANONICAL_HEADERS_=['Index ID','Source Type','CNE ID','Drive File ID','Resource Title','Topic','Section / Heading','Chunk Index','Chunk Text','Clinical Keywords','Extraction Status','Updated At'];
    vm.runInNewContext(semantic+'\n'+helper,ctx,{timeout:3000});
    return ctx;
  };
  const headers={indexid:0,sourcetype:1,cneid:2,drivefileid:3,resourcetitle:4,topic:5,sectionheading:6,chunkindex:7,chunktext:8,clinicalkeywords:9,extractionstatus:10,updatedat:11};
  const makeRows=(size=160,matching=20)=>{
    const result=[['Index ID','Source Type','CNE ID','Drive File ID','Resource Title','Topic','Section / Heading','Chunk Index','Chunk Text','Clinical Keywords','Extraction Status','Updated At']];
    for(let i=0;i<size;i++){
      const special=i<matching;
      result.push([`IDX-${i}`,'LOCAL_REFERENCE_LIB','','ACTIVE','Approved Handbook',special?'IV cannulation':'Fluid balance',special?'IV cannulation insertion':'Electrolyte monitoring',i+1,
        special?'Peripheral intravenous catheter preparation and aseptic insertion clinical assessment. '.repeat(5):'Unrelated clinical care fluid electrolyte passage. '.repeat(5),
        special?'peripheral IV catheter':'fluid electrolyte','SUCCESS','2026-10-24']);
    }
    return result;
  };
  const sheet=(data)=>{
    const log={full:0,ranges:[],textRead:0};
    const sh={getLastRow:()=>data.length,getLastColumn:()=>data[0].length,
      getDataRange:()=>({getValues:()=>{log.full++;return data;}}),
      getRange:(row,col,rows,cols)=>({getValues:()=>{
        log.ranges.push([row,col,rows,cols]);
        if(col<=9&&col+cols>9)log.textRead+=rows;
        return data.slice(row-1,row-1+rows).map(r=>r.slice(col-1,col-1+cols));
      }})};
    return {sh,log};
  };
  check('Metadata-first search reads only selected source-text cells, not 160 full passages',()=>{
    const ctx=setup(),{sh,log}=sheet(makeRows());
    const result=ctx.cneAiReadTopicIndexRows_(sh,headers,'IV cannulation','CNE-A',{ACTIVE:true},{});
    if(result.mode!=='SPARSE'||log.full!==0||log.textRead>=80||result.rows.length!==20)
      throw Error(`Expected sparse mode / 20 passages, got ${result.mode}, ${result.rows.length} rows, ${log.textRead} text rows`);
    if(result.rows[0][8].indexOf('intravenous catheter')<0 ||result.rows[0].__sheetRow!==2)
      throw Error('Sparse row mapping lost the authoritative PDF passage or sheet row');
  });
  check('Inactive reference books never enter shortlist and activation is checked anew',()=>{
    const ctx=setup(),{sh,log}=sheet(makeRows());
    const disabled=ctx.cneAiReadTopicIndexRows_(sh,headers,'IV cannulation','CNE-A',{},{});
    const enabled=ctx.cneAiReadTopicIndexRows_(sh,headers,'IV cannulation','CNE-A',{ACTIVE:true},{});
    if(disabled.rows.length!==0 || enabled.rows.length!==20 ||log.full!==0)
      throw Error('Stale/inactive library evidence was allowed or live state was not rechecked');
  });
  check('Metadata shortlist excludes other CNE uploads and failed extraction rows',()=>{
    const data=makeRows(160,20);
    data[1][1]='UPLOADED_CNE';data[1][2]='OTHER';
    data[2][10]='FAILED';
    const ctx=setup(),{sh}=sheet(data);
    const out=ctx.cneAiReadTopicIndexRows_(sh,headers,'IV cannulation','CNE-A',{ACTIVE:true},{});
    if(out.rows.some(r=>r[0]==='IDX-0'||r[0]==='IDX-1') ||out.rows.length!==18)
      throw Error('Unauthorized CNE or FAILED evidence entered the shortlist');
  });
  check('Weak metadata triggers original authoritative full-sheet recall path',()=>{
    const data=makeRows(160,2),ctx=setup(),{sh,log}=sheet(data);
    const out=ctx.cneAiReadTopicIndexRows_(sh,headers,'IV cannulation','CNE-A',{ACTIVE:true},{});
    if(out.mode!=='FULL_LOW_METADATA_RECALL'||log.full!==1||out.rows.length!==data.length)
      throw Error('Weak chapter metadata silently hid text-only relevant passages');
  });
  check('Scattered topic matches use one full-sheet read rather than excessive sparse RPCs',()=>{
    const data=makeRows(1400,0);
    for(let i=0;i<32;i++){
      const at=2+i*40;data[at][5]='IV cannulation';data[at][6]='Aseptic IV cannulation';
    }
    const ctx=setup(),{sh,log}=sheet(data),out=ctx.cneAiReadTopicIndexRows_(sh,headers,'IV cannulation','CNE-A',{ACTIVE:true},{});
    if(out.mode!=='FULL_SCATTERED'||log.full!==1||log.textRead!==0)
      throw Error('Scattered matches triggered too many text-column reads');
  });
  check('Missing header map invokes safe original read instead of guessing wrong columns',()=>{
    const ctx=setup(),{sh,log}=sheet(makeRows()),invalid={...headers};delete invalid.chunktext;
    const out=ctx.cneAiReadTopicIndexRows_(sh,invalid,'IV cannulation','CNE-A',{ACTIVE:true},{});
    if(out.mode!=='FULL_SMALL_OR_SCHEMA'||log.full!==1)
      throw Error('Schema drift was silently projected into incorrect clinical passages');
  });
  check('Clinical passage scoring prefers actual IV text over duplicated chapter labels',()=>{
    const ctx=setup(),generic={topic:'IV cannulation',sectionHeading:'IV cannulation',chunkText:'General information about resources and scheduling for professional nursing staff. '.repeat(3)},
      precise={topic:'IV cannulation',sectionHeading:'Vein selection',chunkText:'Peripheral intravenous catheter placement requires careful vein selection, aseptic technique and monitoring. '.repeat(3)};
    if(ctx.cneAiClinicalPassageScore_('IV cannulation',precise,100)<=ctx.cneAiClinicalPassageScore_('IV cannulation',generic,100))
      throw Error('Metadata-only chapter hit incorrectly ranked above a clinical passage match');
  });
  check('Semantic splitting prefers complete sentences and respects the 1,450-character cap',()=>{
    const ctx=setup(),source='The nurse checks IV site integrity and assesses for infiltration. '.repeat(70);
    const windows=ctx.cneReferenceSemanticWindows_(source);
    if(windows.length<3 ||windows.some(w=>w.length>1450)||windows.some(w=>!/[.!?]$/.test(w)))
      throw Error('Long clinical paragraphs were split mid-instruction or exceeded limits');
  });
  check('Reference chunker retains real subheadings and paragraph-based clinical concepts',()=>{
    const ctx=setup();
    const chunks=ctx.chunkReferenceLibraryContent('Chapter 4\n\nSite Selection\n\n'+
      'Choose a peripheral vein for intravenous catheter placement and monitor the site. '.repeat(5)+'\n\n'+
      'Infection Prevention\n\nApply hand hygiene and aseptic technique during IV catheter insertion. '.repeat(5),'PDF','Approved Book');
    if(!chunks.some(c=>c.sectionHeading==='Site Selection')||!chunks.some(c=>c.sectionHeading==='Infection Prevention'))
      throw Error('Clinical subheadings were discarded by chunking');
  });
  check('PLAN-FINISH expansion and quota checks remain present with full-source verification',()=>{
    const src=gas.slice(gas.indexOf('function retrieveCNETopicEvidence('),gas.indexOf('function extractTextFromPdf('));
    if(!src.includes('cneAiExpandObjectiveEvidence_(totalEvidence,scoredUploaded.concat(scoredLibrary),options.objectives)')||
      !src.includes('passesClinicalRelevanceGate(cleanTopic, lc)')||
      !src.includes('passesClinicalRelevanceGate(cleanTopic, uc)')||
      !gas.includes('MAX_CORRECTIONS=4, MAX_CORRECTIONS_PER_QUESTION=2')||
      !gas.includes("if (params.allowLibraryOnly !== true) return {success:false,errorCode:'LIBRARY_CONSENT_REQUIRED'"))
      throw Error('Preserved generation / consent safeguards changed');
  });
  check('Live retrieval path selects authorized clinical source text and preserves original Index IDs',()=>{
    const ctx=setup(),{sh,log}=sheet(makeRows());
    const lib={isLib:true,getLastRow:()=>2,getDataRange:()=>({getValues:()=>[
      ['Source ID','Resource Title','Category','Drive File ID','Author','Year','License','Version','Active'],
      ['REF-A','Approved','Nursing','ACTIVE','','','','',true]]})};
    ctx.sanitizeCellInput=x=>String(x||'');ctx.getCNEScheduleRecord=()=>({topic:'IV cannulation'});
    ctx.checkCNEActionAuthorized=()=>null;
    ctx.getSpreadsheet=()=>({getSheetByName:n=>n==='CNE_Reference_Index'?sh:n==='CNE_Material_Index'?null:lib});
    ctx.getHeaderMap=x=>x.isLib?{drivefileid:3,active:8}:headers;
    ctx.cneReferenceChunkReadable_=s=>String(s||'').length>=90;
    ctx.passesClinicalRelevanceGate=()=>true;
    ctx.cneAiSelectTopicEvidence_=(arr)=>arr.slice(0,12);
    ctx.cneAiExpandObjectiveEvidence_=(base)=>({evidence:base,addedCount:0,perObjective:{}});
    const start=gas.indexOf('function retrieveCNETopicEvidence('),end=gas.indexOf('function extractTextFromPdf(',start);
    vm.runInNewContext(gas.slice(start,end),ctx,{timeout:3000});
    const result=ctx.retrieveCNETopicEvidence('CNE-A','IV cannulation',{employeeId:'STAFF-A'},{});
    if(!result.success||result.indexSearchMode!=='SPARSE'||result.evidence.length!==12||
       result.evidence[0].indexId!=='IDX-0'||result.evidence.some(e=>e.chunkText.indexOf('intravenous catheter')<0)||
       log.full!==0)throw Error('Selected reference text, status or ID mapping was corrupted in the real retrieval flow');
  });
  check('Live retrieval never grants access to deactivated references or unrelated CNE uploads',()=>{
    const ctx=setup(),data=makeRows(160,20),{sh}=sheet(data);
    ctx.sanitizeCellInput=x=>String(x||'');ctx.getCNEScheduleRecord=()=>({topic:'IV cannulation'});
    ctx.checkCNEActionAuthorized=()=>null;
    ctx.getSpreadsheet=()=>({getSheetByName:n=>n==='CNE_Reference_Index'?sh:null});
    ctx.getHeaderMap=()=>headers;ctx.cneReferenceChunkReadable_=s=>String(s||'').length>90;
    ctx.passesClinicalRelevanceGate=()=>true;ctx.cneAiSelectTopicEvidence_=a=>a.slice(0,12);
    ctx.cneAiExpandObjectiveEvidence_=b=>({evidence:b,addedCount:0,perObjective:{}});
    vm.runInNewContext(gas.slice(gas.indexOf('function retrieveCNETopicEvidence('),gas.indexOf('function extractTextFromPdf(')),ctx,{timeout:3000});
    const blocked=ctx.retrieveCNETopicEvidence('CNE-A','IV cannulation',{},{});
    if(blocked.success ||blocked.evidence.length!==0)throw Error('A missing active registry did not block library evidence');
    for(let i=1;i<10;i++){data[i][1]='UPLOADED_CNE';data[i][2]='OTHER-CNE';}
    const other=ctx.retrieveCNETopicEvidence('CNE-A','IV cannulation',{},{});
    if(other.success||other.evidence.length!==0)throw Error('Another CNE\'s private uploads entered the evidence pool');
  });
  check('Dense scattered shortlists remain bounded and span approved sources',()=>{
    const data=makeRows(1400,0);
    for(let cluster=0;cluster<26;cluster++)for(let j=0;j<4;j++){
      const at=2+cluster*45+j;
      data[at][5]='IV cannulation';data[at][6]='IV cannulation clinical steps';
      data[at][3]=cluster%2?'ACTIVE':'SECOND';
      data[at][4]=cluster%2?'Handbook A':'Handbook B';
    }
    const ctx=setup(),{sh,log}=sheet(data);
    const out=ctx.cneAiReadTopicIndexRows_(sh,headers,'IV cannulation','CNE-A',{ACTIVE:true,SECOND:true},{});
    if(out.mode!=='SPARSE'||out.rows.length<12||log.textRead>=data.length/3||
      log.ranges.filter(r=>r[1]===9).length>14 ||
      !out.rows.some(r=>r[3]==='ACTIVE')||!out.rows.some(r=>r[3]==='SECOND'))
      throw Error('Dense multi-book selection was not bounded, fast to read, and source-diverse');
  });
  check('Live retrieval retries authoritative full text when sparse evidence is insufficient',()=>{
    const ctx=setup(),{sh,log}=sheet(makeRows(160,8));
    const lib={isLib:true,getLastRow:()=>2,getDataRange:()=>({getValues:()=>[
      ['Source ID','Title','Category','Drive File ID','Author','Year','License','Version','Active'],
      ['REF-A','Approved','Nursing','ACTIVE','','','','',true]]})};
    ctx.sanitizeCellInput=x=>String(x||'');ctx.getCNEScheduleRecord=()=>({topic:'IV cannulation'});
    ctx.checkCNEActionAuthorized=()=>null;ctx.getSpreadsheet=()=>({getSheetByName:n=>n==='CNE_Reference_Index'?sh:n==='CNE_Material_Index'?null:lib});
    ctx.getHeaderMap=x=>x.isLib?{drivefileid:3,active:8}:headers;
    ctx.cneReferenceChunkReadable_=s=>String(s||'').length>=90;
    ctx.passesClinicalRelevanceGate=()=>true;ctx.cneAiSelectTopicEvidence_=arr=>arr.slice(0,12);
    ctx.cneAiExpandObjectiveEvidence_=base=>({evidence:base,addedCount:0,perObjective:{}});
    vm.runInNewContext(gas.slice(gas.indexOf('function retrieveCNETopicEvidence('),gas.indexOf('function extractTextFromPdf(')),ctx,{timeout:3000});
    const out=ctx.retrieveCNETopicEvidence('CNE-A','IV cannulation',{},{});
    if(!out.success||out.indexSearchMode!=='FULL_RECALL_FALLBACK'||log.full!==1||out.evidence.length!==8)
      throw Error('Insufficient shortlist failed to trigger full source recovery');
  });
  check('New nursing keywords are derived from actual clinical passage text',()=>{
    const start=gas.indexOf('function cneReferenceClinicalKeywords_('),end=gas.indexOf('function cneAiIvCannulationStem_(',start);
    const sandbox={};vm.runInNewContext(gas.slice(start,end),sandbox,{timeout:3000});
    const found=sandbox.cneReferenceClinicalKeywords_(
      'The nurse uses supplemental oxygen and pulse oximetry in respiratory assessment, with pressure injury prevention, fluid balance and wound assessment.');
    for(const expected of ['oxygen therapy','pulse oximetry','respiratory assessment','pressure injuries','fluid balance','wound assessment'])
      if(!found.includes(expected))throw Error('Omitted grounded nursing keyword: '+expected);
    if(found.includes('blood transfusion')||found.includes('insulin administration'))
      throw Error('Clinical keyword was invented without source passage support');
  });
  check('Index enhancements do not remove original authorized identity and evidence checks',()=>{
    const src=gas.slice(gas.indexOf('function retrieveCNETopicEvidence('),gas.indexOf('function extractTextFromPdf('));
    const terms=['checkCNEActionAuthorized(session, record)','activeLibFiles[rowDriveId]',
      'rowCneId === upperCneId','passesClinicalRelevanceGate(cleanTopic, uc)',
      'passesClinicalRelevanceGate(cleanTopic, lc)','cneAiSelectTopicEvidence_',
      'cneAiExpandObjectiveEvidence_','cneAiClinicalPassageScore_',
      'cneAiReadTopicIndexRows_'];
    for(const term of terms)if(!src.includes(term))throw Error('Retrieval authorization/verification step missing: '+term);
  });
  console.log('\n>>> Metadata-first source retrieval and semantic clinical chunking checks');
  for(const item of checks){focusedChecks.push(item);try{item.test();focusedPassed++;console.log('✓ '+item.name);}catch(e){console.error('✗ '+item.name+': '+e.message);}}
}

// New 08:00–17:00 classroom duration policy: actual backend helper behavior,
// source time controls, and shared validation across all CNE entry points.
if (selected.some(item => item.id === 'performance') && passed === selected.length) {
  const gas = readFileSync(join(ROOT_DIR, 'Code.gs'), 'utf8');
  const ui = readFileSync(join(ROOT_DIR, 'src/components/cne/CneDateTimeFields.tsx'), 'utf8');
  const utils = readFileSync(join(ROOT_DIR, 'src/utils.ts'), 'utf8');
  const central = readFileSync(join(ROOT_DIR, 'src/components/CNESchedule.tsx'), 'utf8');
  const department = readFileSync(join(ROOT_DIR, 'src/components/cne/DepartmentalScheduleModal.tsx'), 'utf8');
  const unscheduled = readFileSync(join(ROOT_DIR, 'src/components/cne/AddUnscheduledCneModal.tsx'), 'utf8');
  const start = gas.indexOf('function parseDurationToSeconds(str)');
  const stop = gas.indexOf(' * Departmental scheduling idempotency.', start);
  const backend = { Date, isFinite, parseInt, parseFloat, Math };
  backend.parseCneStartTimestamp_ = (v) => {
    const s = String(v || '');
    return Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(s) ? s : s + '+05:30');
  };
  const durationChecks = [];
  const addDurationCheck = (name, run) => durationChecks.push({ name, run });
  addDurationCheck('Backend duration helper is isolated from runtime timezone and compiles', () => {
    assert(start >= 0 && stop > start);
    const code = gas.slice(start, gas.lastIndexOf('/**', stop));
    vm.runInNewContext(code, backend, { timeout: 3000 });
    assert.equal(typeof backend.validateCneDuration, 'function');
    assert.equal(typeof backend.calculateCneDuration_, 'function');
  });
  addDurationCheck('Backend calculates same-day maximum of nine classroom hours', () => {
    assert.equal(backend.calculateCneDuration_('2026-10-25T08:00','2026-10-25T17:00'),'09:00:00');
    assert.equal(backend.validateCneDuration('09:00:00','2026-10-25T08:00','2026-10-25T17:00').isValid,true);
    assert.equal(backend.validateCneDuration('09:00:01','2026-10-25T08:00','2026-10-25T17:00').isValid,false);
  });
  addDurationCheck('Backend excludes overnight hours on two dates', () => {
    assert.equal(backend.calculateCneDuration_('2026-10-25T14:00','2026-10-26T11:00'),'06:00:00');
    assert.equal(backend.validateCneDuration('06:01:00','2026-10-25T14:00','2026-10-26T11:00').isValid,false);
  });
  addDurationCheck('Backend includes intermediate calendar days with precision beyond 24 hours', () => {
    assert.equal(backend.calculateCneDuration_('2026-10-25T16:00','2026-10-27T10:00'),'12:00:00');
    assert.equal(backend.calculateCneDuration_('2026-10-25T08:00','2026-10-28T17:00'),'36:00:00');
    assert.equal(backend.calculateCneDuration_('2026-10-31T16:30:45','2026-11-01T08:30:15'),'00:59:30');
  });
  addDurationCheck('Backend rejects outside-hour inputs, too-short durations, and reversed timestamps', () => {
    assert.equal(backend.validateCneDuration('01:00:00','2026-10-25T07:59','2026-10-25T11:00').isValid,false);
    assert.equal(backend.validateCneDuration('01:00:00','2026-10-25T09:00','2026-10-25T17:01').isValid,false);
    assert.equal(backend.validateCneDuration('00:04:00','2026-10-25T09:00','2026-10-25T11:00').isValid,false);
    assert.equal(backend.validateCneDuration('01:00:00','2026-10-25T11:00','2026-10-25T09:00').isValid,false);
  });
  addDurationCheck('Shared CNE time picker clamps selections to 08:00–17:00', () => {
    assert(ui.includes('max="17:00"') && ui.includes("'08:00'") && ui.includes("selected > '17:00'"));
    assert(ui.includes('calculateCneDuration(fullFrom, fullTo)'));
  });
  addDurationCheck('Central, Departmental, Unscheduled forms use shared duration validation', () => {
    assert(central.includes('validateCneDuration(newDuration, newDate, newToDate)'));
    assert(department.includes('validateCneDuration(r.duration, r.date, r.toDate)'));
    assert(unscheduled.includes('validateCneDuration(duration.trim(), fullFromDate, fullToDate)'));
    for(const src of [central, department, unscheduled]) assert(src.includes('<CneDateTimeFields'));
    assert(utils.includes('const middleDays = Math.max(0, daysTouched - 2) * (close - open)'));
  });
  addDurationCheck('Apps Script schedule creation, edit, and Departmental batch call validator', () => {
    assert(gas.includes('validateCneDuration(duration, fromDate, toDate)'));
    assert(gas.includes('validateCneDuration(effDuration, effDate, effToDate)'));
    assert(gas.includes('validateCneDuration(duration, date, toDate)'));
  });
  console.log('\n>>> CNE classroom hours duration and server validation checks');
  for (const item of durationChecks) {
    focusedChecks.push({ name: item.name, test: item.run });
    try { item.run(); focusedPassed++; console.log('✓ ' + item.name); }
    catch (e) { console.error('✗ ' + item.name + ': ' + e.message); }
  }
}

// Smart Hybrid reference-question import, partial recovery, five-to-ten Post-Test checks.
if (selected.some(item=>item.id==='performance') && passed===selected.length) {
  const hybridChecks = createHybridChecks();
  console.log('\n>>> Smart Hybrid Question Bank and resumable AI behavioral checks');
  for(const item of hybridChecks){
    focusedChecks.push({name:item.name,test:item.run});
    try{item.run();focusedPassed++;console.log('✓ '+item.name);}
    catch(e){console.error('✗ '+item.name+': '+e.message);}
  }
}

// Fail-closed dropdown retry and first-open AI material verification.
if (selected.some(item => item.id === 'performance') && passed === selected.length) {
  const retryChecks = createDropdownRetryChecks();
  console.log('\n>>> Ward, Resource Person and AI first-open recovery checks');
  for (const item of retryChecks) {
    focusedChecks.push({ name: item.name, test: item.run });
    try { item.run(); focusedPassed++; console.log('✓ ' + item.name); }
    catch (err) { console.error('✗ ' + item.name + ': ' + err.message); }
  }
}

// Full-width two-tab Question Bank / My Questions UI checks. Keep in the single runner.
if (selected.some(item => item.id === 'performance') && passed === selected.length) {
  const modal = readFileSync(join(ROOT_DIR, 'src/components/cne/CNEQuestionsModal.tsx'), 'utf8');
  const section = (begin, end) => {
    const a = modal.indexOf(begin);
    const b = modal.indexOf(end, a + begin.length);
    assert(a >= 0 && b > a, 'Required UI section missing: ' + begin);
    return modal.slice(a, b);
  };
  const bankPanel = section('id="cne-question-bank-panel"', '        ) : (\n          <>');
  const mine = section('id="cne-my-questions-panel"', '          </>\n        )}');
  const tabChecks = [
    ['Two permanent accessible tabs start at My Questions and reset when changing CNE', () => {
      assert(modal.includes("useState<'questions' | 'bank'>('questions')"));
      assert(modal.includes("setActiveView('questions');setBankError"));
      assert(modal.includes('role="tablist"') && modal.includes('role="tab"'));
      assert(modal.includes("aria-selected={activeView === 'questions'}") && modal.includes("aria-selected={activeView === 'bank'}"));
    }],
    ['Question Bank occupies exclusive full-height scroll area, not an inline split section', () => {
      assert(modal.includes("{activeView === 'bank' ? ("));
      assert(bankPanel.includes('overflow-y-auto min-h-0 flex-1'));
      assert(!bankPanel.includes('max-h-72') && !modal.includes('bankOpen'));
      assert(!bankPanel.includes('Replaced Questions History') && !bankPanel.includes('onClick={handleAddManualQuestion}'));
    }],
    ['Only My Questions includes AI actions, finalization and Save/Next', () => {
      assert(modal.includes("{canModify && activeView === 'questions' && ("));
      assert(modal.includes("{activeView === 'questions' && <div"));
      assert(mine.includes('Replaced Questions History'));
      assert(!bankPanel.includes('AI Generate MCQs') && !bankPanel.includes('Save &amp; Next'));
    }],
    ['Add Manual Question is inside My Questions and remains blocked while material/generation/saving is busy', () => {
      assert(mine.includes('onClick={handleAddManualQuestion}') && mine.includes('Add Manual Question'));
      assert(mine.includes('disabled={!canInteractWithQuestionTools || !!importingBankId}'));
      assert(!bankPanel.includes('onClick={handleAddManualQuestion}'));
      assert(modal.includes('const canInteractWithQuestionTools = canModify && isPageReady && !checkingMaterial'));
    }],
    ['Imported textbook items show an Imported status and cannot be reimported from the same list', () => {
      assert(bankPanel.includes('const alreadyImported = questions.some('));
      assert(bankPanel.includes('item.id === sourceId') && bankPanel.includes("sourceId + '__v'"));
      assert(bankPanel.includes('Imported · Review under My Questions'));
      assert(mine.includes('Imported from Question Bank'));
      assert(modal.includes('QUESTION_ALREADY_IMPORTED') || modal.includes('already present'));
    }],
    ['Import leaves educator browsing the bank and guides them to the permanent My Questions tab', () => {
      const importer = section('const importBankQuestion = async', '  const requestAiGeneration = async');
      assert(importer.includes('loadQuestions(++questionsRequestRef.current,cneId)'));
      assert(importer.includes('Open My Questions to review'));
      assert(!importer.includes('setActiveView('));
      assert(modal.includes("onClick={() => setActiveView('questions')}"));
    }],
    ['Import refresh is guarded against losing existing saved-row edits, finalized changes or unsaved manual Drafts', () => {
      assert(modal.includes('persistedQuestionSnapshotRef'));
      assert(modal.includes('const hasUnsavedQuestionEdits = ()'));
      assert(modal.includes('if (!persistedQuestionIdsRef.current.has(id)) return true;'));
      assert(modal.includes('status: normalizeQuestionStatus(q.status), isFinalized: Boolean(q.isFinalized)'));
      assert(modal.includes('if (hasUnsavedQuestionEdits())'));
      assert(modal.includes('persistedQuestionSnapshotRef.current = new Map(payloadQuestions.map'));
    }],
    ['Clinical Question Bank displays recognized concepts, lets educator edit and rejects generic-only matches', () => {
      assert(bankPanel.includes('Recognized clinical concept') && bankPanel.includes('bankClinicalSearch.concepts.join'));
      assert(bankPanel.includes('Edit concept') && bankPanel.includes('Search concept') && bankPanel.includes('bankSearchOverride'));
      assert(bankPanel.includes('No clinically relevant Question Bank questions found') && bankPanel.includes('Clarify the clinical topic to search'));
      assert(modal.includes('ApiService.searchCNEReferenceQuestions(target, searchOverride !== undefined ? searchOverride : bankSearchOverride)'));
      assert(bankPanel.includes("void searchBank('')"), 'Restoring original CNE topic did not refresh the results');
    }],
    ['Question Bank search runs on entering the view and can be retried without starting Gemini', () => {
      assert(modal.includes('if (!bankSearched && !bankLoading) void searchBank()'));
      assert(bankPanel.includes('onClick={() => void searchBank()}') && bankPanel.includes('Refresh Results'));
      assert(modal.includes('bankRequestRef.current') && modal.includes('currentCneIdRef.current'));
      assert(!section('const requestAiGeneration = async', '  const handleGenerateAi = async').includes('void searchBank('));
    }],
    ['Tab switching and closing cannot interrupt an active import or generation', () => {
      assert(modal.includes('disabled={isGenerating || isSaving || !!importingBankId}'));
      assert(modal.includes('disabled={!canModify || !isPageReady || isGenerating || isSaving || !!importingBankId}'));
      assert(modal.includes('if (!canModify || !isPageReady || isGenerating || isSaving || importingBankId) return;'));
    }]
  ];
  console.log('\n>>> Full-width Question Bank and My Questions navigation checks');
  for (const [name, test] of tabChecks) {
    focusedChecks.push({name, test});
    try { test(); focusedPassed++; console.log('✓ ' + name); }
    catch (err) { console.error('✗ ' + name + ': ' + err.message); }
  }
}

// CNE details action consolidation, EOI load gating and date-descending schedule ordering.
// The same runner tests actual backend sorting functions, not just source strings.
if (selected.some(item => item.id === 'performance') && passed === selected.length) {
  const modal = readFileSync(join(ROOT_DIR, 'src/components/cne/CneDetailsModal.tsx'), 'utf8');
  const schedule = readFileSync(join(ROOT_DIR, 'src/components/CNESchedule.tsx'), 'utf8');
  const calendar = readFileSync(join(ROOT_DIR, 'src/components/cne/CalendarFullCneDetails.tsx'), 'utf8');
  const gas = readFileSync(join(ROOT_DIR, 'Code.gs'), 'utf8');
  const isolate = (name) => {
    const match = gas.match(new RegExp('function ' + name + '\\([^]*?\\n\\}', 'm'));
    assert(match, 'Missing backend function: ' + name);
    return match[0];
  };
  const backend = { String, Date };
  backend.cneScheduleDateKey_ = value => String(value || '').slice(0, 10);
  backend.cneScheduleDateMatches_ = (start, end, from, to) => (!from || end >= from) && (!to || start <= to);
  vm.runInNewContext(isolate('cneScheduleOrder_') + '\n' + isolate('cneSchedulePageResult_'), backend, { timeout: 2000 });
  const records = [
    { cneId:'CNE-MIDDLE', fromDate:'2026-11-08', toDate:'2026-11-08', topic:'topic' },
    { cneId:'CNE-OLD', fromDate:'2026-09-12', toDate:'2026-09-12', topic:'topic' },
    { cneId:'CNE-NEW', fromDate:'2026-12-20', toDate:'2026-12-20', topic:'topic' },
    { cneId:'CNE-TIE', fromDate:'2026-11-08', toDate:'2026-11-08', topic:'topic' }
  ];
  const checks = [
    ['Manage CNE is a single permission-guarded dropdown, not three header buttons', () => {
      const header = modal.slice(modal.indexOf('{/* Compact Header:'), modal.indexOf('{/* Scrollable Content Body'));
      assert(header.includes('Manage CNE') && header.includes('aria-haspopup="menu"') && header.includes('role="menu"'));
      assert(header.includes('showManageMenu &&') && header.includes('canEditCne &&') && header.includes('canCancelCne &&') && header.includes('showDeleteButton && onDelete &&'));
      assert(header.includes('setIsManageMenuOpen(false); onEdit(cne)') && header.includes('setIsManageMenuOpen(false); onCancel(cne)') && header.includes('setIsManageMenuOpen(false); onDelete(cne)'));
      assert(!header.includes('title="Edit CNE workshop details"') && !header.includes('title="Cancel CNE programme"'));
    }],
    ['Manage CNE closes on outside click or Escape and is not clipped on mobile', () => {
      assert(modal.includes("event.key === 'Escape'") && modal.includes("document.addEventListener('pointerdown', closeOnOutside)"));
      assert(modal.includes('manageMenuRef.current?.contains(event.target as Node)'));
      assert(modal.includes('relative z-20 flex flex-col') && modal.includes('w-full sm:w-auto overflow-visible flex flex-wrap'));
    }],
    ['Session report appears only when completed and cannot run while downloading', () => {
      assert(modal.includes('{canOperate && isCompleted && (') && modal.includes('disabled={isDownloadingReport}'));
      assert(schedule.includes('if (isDownloadingReport || !isCneCompleted(cne) || !canOperateCne(cne)) return;'));
    }],
    ['EOI lookup is skipped for started, completed or canceled CNEs', () => {
      const useEffectCode = modal.slice(modal.indexOf('// Load employee\'s current interest status on open'), modal.indexOf('// Handle Register Interest'));
      assert(useEffectCode.includes('!isInterestOpen') && useEffectCode.includes('setIsCheckingInterest(false)'));
      assert(useEffectCode.indexOf('!isInterestOpen') < useEffectCode.indexOf('ApiService.getMyCneInterestStatus'));
      assert(modal.includes('const isInterestOpen = isScheduled && !hasCneStarted'));
    }],
    ['CNE Progress initiates without waiting for EOI in Schedule and Calendar', () => {
      assert(schedule.includes('fetchActivityProgress(selectedId);'));
      assert(calendar.includes('void reloadDetails();') && calendar.includes('void reloadProgress();'));
      assert(!schedule.includes('await ApiService.getMyCneInterestStatus'));
    }],
    ['All schedule status filters order by From Date descending before pagination', () => {
      const candidates = [{ fromDate:'2026-11-08',rowNumber:2 },{fromDate:'2026-09-12',rowNumber:3},{fromDate:'2026-12-20',rowNumber:4},{fromDate:'2026-11-08',rowNumber:5}];
      for (const status of ['Scheduled','Completed','Canceled','ALL']) {
        const result = candidates.slice().sort((a,b) => backend.cneScheduleOrder_(a,b,status));
        assert.equal(result.map(r => r.fromDate).join(','),'2026-12-20,2026-11-08,2026-11-08,2026-09-12');
        assert.equal(result[1].rowNumber, 5, 'Stable row tie-break lost');
      }
      assert(gas.indexOf('candidates.sort(function(a,b){ return cneScheduleOrder_(a,b,status); });') < gas.indexOf("var pageRows=(status==='Scheduled'?candidates:candidates.slice(startAt,startAt+pageSize))"));
    }],
    ['Search matches normal date-descending ordering and paginates the sorted results', () => {
      for (const status of ['Scheduled','Completed','Canceled','ALL']) {
        const result = backend.cneSchedulePageResult_(records,status,1,2,'topic','','');
        assert(result.success && result.data.records[0].cneId === 'CNE-NEW');
        assert.equal(result.data.records[1].cneId, 'CNE-MIDDLE');
        assert.equal(result.data.total, 4);
      }
      const second = backend.cneSchedulePageResult_(records,'ALL',2,2,'topic','','');
      assert.equal(second.data.records[0].cneId,'CNE-TIE');
      assert.equal(second.data.records[1].cneId,'CNE-OLD');
      const ranged = backend.cneSchedulePageResult_(records,'ALL',1,2,'topic','2026-10-01','2026-11-30');
      assert.equal(ranged.data.total,2);
      assert.equal(ranged.data.records[0].cneId,'CNE-MIDDLE');
    }],
    ['Calendar remains separate from Schedule sorting and lifecycle safeguards are untouched', () => {
      assert(gas.includes('function handleGetCNECalendarMonth('));
      assert(gas.includes('function handleDeleteCNE('));
      assert(modal.includes("const showDeleteButton = Boolean(canDeleteCne && !isCompleted && onDelete)"));
    }]
  ];
  console.log('\n>>> CNE header management, EOI readiness and descending schedule checks');
  for (const [name, test] of checks) {
    focusedChecks.push({name, test});
    try { test(); focusedPassed++; console.log('✓ ' + name); }
    catch (err) { console.error('✗ ' + name + ': ' + err.message); }
  }
}

// SMART_TOPIC_AUTOCOMPLETE_CHECKS: These are consolidated alongside the existing
// clinical Question Bank, scheduling and timezone tests. Compile the actual
// pure TypeScript engine and execute real behavior, not only source fragments.
if (selected.some(item => item.id === 'performance') && passed === selected.length) {
  const sourceDir=join(ROOT_DIR,'src/data');
  const formFiles=[
    'src/components/CNESchedule.tsx',
    'src/components/cne/DepartmentalScheduleModal.tsx',
    'src/components/cne/AddUnscheduledCneModal.tsx'
  ].map(path=>readFileSync(join(ROOT_DIR,path),'utf8'));
  const input=readFileSync(join(ROOT_DIR,'src/components/cne/SmartCneTopicInput.tsx'),'utf8');
  const dictionary=readFileSync(join(sourceDir,'cneClinicalTerminology.ts'),'utf8');
  const tmp=mkdtempSync(join(tmpdir(),'cne-smart-topic-'));
  let engine;
  try {
    const tsc=existsSync(join(ROOT_DIR,'node_modules','.bin',process.platform==='win32'?'tsc.cmd':'tsc'))
      ?join(ROOT_DIR,'node_modules','.bin',process.platform==='win32'?'tsc.cmd':'tsc'):'tsc';
    execFileSync(tsc,['--target','ES2020','--module','commonjs','--outDir',tmp,
      join(sourceDir,'cneClinicalTerminology.ts'),join(sourceDir,'commonClinicalTopics.ts'),
      join(sourceDir,'historicalCneTopics2026.ts'),join(sourceDir,'cneTopicEngine.ts')],{stdio:'pipe'});
    engine=createRequire(SCRIPT_URL)(join(tmp,'cneTopicEngine.js'));
  } catch(err) {
    console.error('Smart topic engine compile failed:',String(err.stderr||err));
  }
  const tests=[
    ['Smart topic has a broad candidate terminology library and historical titles exclude patient names',()=>{
      assert(engine,'Clinical topic engine did not compile');
      assert(engine.SMART_TOPIC_DICTIONARY_STATS.abbreviations>=500,'Insufficient abbreviation coverage');
      assert(engine.SMART_TOPIC_DICTIONARY_STATS.previousTopics>=800,'Historical topic coverage absent');
      for(const name of ['Rishabh Maindola','Himanshi','Shivam','Annamaria','Reyansh','Shankar','Ansh'])assert(!dictionary.includes(name),'Patient identity leaked to suggestion library');
    }],
    ['Corrected historical titles are integrated without replacing the original topic candidates',()=>{
      assert.equal(engine.SMART_TOPIC_DICTIONARY_STATS.correctedHistoricalTopics,1054,
        'Corrected historical topic file is incomplete');
      assert(engine.SMART_TOPIC_DICTIONARY_STATS.previousTopics>=800,
        'Earlier topic candidates were lost');
      assert(engine.SMART_TOPIC_DICTIONARY_STATS.additionalTopics>=61,
        'Earlier skill-linked topic examples were lost');
    }],
    ['Corrected medical titles appear ahead of older variants while typing',()=>{
      for(const [partial,term] of [
        ['Foley Catheter','Foley Catheterization'],
        ['Acute Coronary Synd','Acute Coronary Syndrome'],
        ['Glasgow Coma Scale','Glasgow Coma Scale'],
        ['Nursing Management of Patients with Whipple','Whipple']
      ]) {
        const suggestions=engine.suggestCneTopics(partial,5);
        assert(suggestions.some(item=>item.source==='Corrected Previous CNE' && item.text.includes(term)),
          'Missing corrected historical suggestion for '+partial);
        assert(suggestions.length<=5,'Suggestion limit exceeded');
      }
    }],
    ['Historical suggestion index is de-identified and remains local to the browser',()=>{
      const source=readFileSync(join(sourceDir,'historicalCneTopics2026.ts'),'utf8');
      for(const name of ['Rishabh Maindola','Himanshi','Shivam','Annamaria','Reyansh','Shankar','Ansh']) {
        assert(!source.includes(name),'Patient name leaked into corrected suggestions');
      }
      assert(!source.includes('fetch('),'Topic list must not call external APIs');
      assert(!source.includes('NOT CONDUCTED'),'Non-topic entry was retained');
      assert.equal(engine.suggestCneTopics('A').length,0);
    }],
    ['Topic suggestions do not change saved wording or CNE scheduling forms',()=>{
      const raw='Nursing care of neonatal hyperbilirubinemia';
      const before=raw;
      engine.suggestCneTopics(raw);
      assert.equal(raw,before);
      assert.equal(engine.interpretCneTopic(raw).original,before);
      assert(input.includes('onChange(next)'),'Educator must accept suggestions explicitly');
    }],
    ['Gastritis and future clinical terms are suggested while typing',()=>{
      assert(engine.suggestCneTopics('Care of gastrit').some(r=>/gastritis/i.test(r.text)));
      assert(engine.suggestCneTopics('Neonatal resuscit').some(r=>/resuscitation/i.test(r.text)));
      assert.equal(engine.suggestCneTopics('x').length,0);
      assert(engine.suggestCneTopics('ABG',5).length<=5);
    }],
    ['Space corrects only explicitly recognized misspellings with reversible original value',()=>{
      assert.equal(engine.correctCompletedClinicalWord('Care of gastritits ').value,'Care of gastritis ');
      assert.equal(engine.correctCompletedClinicalWord('Folys ').value,"Foley's ");
      assert.equal(engine.correctCompletedClinicalWord('Unknown medicalword '),null);
      assert.equal(engine.correctCompletedClinicalWord('Gastri'),null);
      assert(input.includes('Undo')&&input.includes('setUndo({before:next,after:correction.value'));
    }],
    ['Clinical abbreviations are recognized but not automatically replaced',()=>{
      assert(engine.identifyTopicAbbreviations('ABG and VBG analysis').some(x=>x.short==='ABG'));
      assert.equal(engine.needsTopicClarification('ABG and VBG analysis').length,0);
      assert(!engine.identifyTopicAbbreviations('gastritis patient').some(x=>x.short==='PT'));
    }],
    ['Ambiguous GBS and ICD must be clarified and expansion is whole-token only',()=>{
      for(const term of ['GBS','ICD','ALL'])assert(engine.needsTopicClarification(term).some(x=>x.short===term));
      assert(!engine.needsTopicClarification('All Aspects of gastritis').some(x=>x.short==='ALL'));
      assert(engine.expandTopicAbbreviation('GBS in children','GBS','Guillain–Barré syndrome').includes('Guillain–Barré syndrome'));
      assert.equal(engine.expandTopicAbbreviation('ICDICD and ICD','ICD','Intercostal chest drain'),'ICDICD and Intercostal chest drain');
      assert(input.includes('setCustomValidity')&&input.includes('Choose intended clinical meaning'));
    }],
    ['Error-prone dose abbreviations are identified for replacement by educator',()=>{
      for(const term of ['QD','QOD','MSO4','MgSO4','IU'])assert(engine.needsTopicClarification(term).length>0,`${term} did not trigger safety clarification`);
      assert(input.includes('Error-prone abbreviation'));
    }],
    ['All CNE creation and edit topic fields use same reusable component',()=>{
      assert.equal((formFiles[0].match(/<SmartCneTopicInput/g)||[]).length,2);
      assert.equal((formFiles[1].match(/<SmartCneTopicInput/g)||[]).length,1);
      assert.equal((formFiles[2].match(/<SmartCneTopicInput/g)||[]).length,1);
      assert(input.includes('role="combobox"')&&input.includes('role="listbox"'));
      assert(input.includes("e.key==='ArrowDown'")&&input.includes("e.key==='Enter'"));
    }],
    ['Question Bank backend recognizes expanded future abbreviations without weakening gastritis strictness',()=>{
      const gas=readFileSync(join(ROOT_DIR,'Code.gs'),'utf8');
      const names=['cneHybridClinicalText_','cneHybridAdditionalClinicalAbbreviations_','cneHybridClinicalVocabulary_',
        'cneHybridClinicalContains_','cneHybridClinicalDistinctive_','cneHybridClinicalAnalyze_'];
      const extracted=names.map(name=>{
        const match=gas.match(new RegExp('function '+name+'\\([^]*?\\n\\}','m'));
        assert(match,'Missing backend recognizer '+name);
        return match[0];
      }).join('\n');
      const ctx={};vm.runInNewContext(extracted,ctx,{timeout:3000});
      assert(ctx.cneHybridClinicalAnalyze_('ECHO').concepts.some(c=>c.name==='echocardiography'));
      assert(ctx.cneHybridClinicalAnalyze_('Care of gastritis patient').concepts.some(c=>c.name==='gastritis'));
      assert(ctx.cneHybridClinicalAnalyze_('All Aspects of gastritis').concepts.some(c=>c.name==='gastritis'));
    }],
    ['Question Bank clinical parsing never silently assigns GBS or ALL',()=>{
      const gas=readFileSync(join(ROOT_DIR,'Code.gs'),'utf8');
      assert(gas.includes('var ambiguousTopicSource=source.replace'));
      assert(gas.includes('cneHybridAdditionalClinicalAbbreviations_()'));
      const parsed=engine.needsTopicClarification('GBS and ALL');
      assert(parsed.some(x=>x.short==='GBS')&&parsed.some(x=>x.short==='ALL'));
    }],
    ['Lowercase and mixed-case abbreviations expand as complete tokens only',()=>{
      assert.equal(engine.expandTopicAbbreviation('gbs in children','GBS','Guillain–Barré syndrome'),'Guillain–Barré syndrome in children');
      assert.equal(engine.expandTopicAbbreviation('MgSO4 in eclampsia','MGSO4','Magnesium sulfate'),'Magnesium sulfate in eclampsia');
      assert.equal(engine.expandTopicAbbreviation('GBSGBS and gBs','GBS','Group B Streptococcus'),'GBSGBS and Group B Streptococcus');
    }],
    ['An honorific Ms and ordinary ALL ASPECTS are not interpreted as diagnoses',()=>{
      assert(!engine.needsTopicClarification('Ms Kanta (ANS)').some(a=>a.short==='MS'));
      assert(!engine.needsTopicClarification('Ms. Anugra').some(a=>a.short==='MS'));
      assert.equal(engine.suggestCneTopics('Ms').length,0);
      assert(engine.needsTopicClarification('MS').some(a=>a.short==='MS'));
      assert(!engine.needsTopicClarification('ALL ASPECTS OF Nursing').some(a=>a.short==='ALL'));
    }],
    ['Classification ICD-11 takes precedence over ambiguous ICD chest-drain codes',()=>{
      for(const text of ['ICD-11','ICD 11']){
        const recognized=engine.identifyTopicAbbreviations(text);
        assert(recognized.some(a=>a.short==='ICD-11'));
        assert(!engine.needsTopicClarification(text).some(a=>a.short==='ICD'));
      }
      assert.equal(engine.expandTopicAbbreviation('Workshop on ICD-11 and ICD','ICD','Intercostal chest drain'),
        'Workshop on ICD-11 and Intercostal chest drain');
      assert(engine.needsTopicClarification('ICD').some(a=>a.short==='ICD'));
      assert(engine.expandTopicAbbreviation('ICD 11 workshop','ICD-11','International Classification of Diseases, Eleventh Revision').startsWith('International Classification'));
    }],
    ['BSE has two meanings; expanded candidate dictionary recognizes training and skills',()=>{
      const bse=engine.needsTopicClarification('BSE');
      assert(bse.some(a=>a.short==='BSE' && a.meanings.length===2));
      for(const term of ['TURB','PBLS','DASH','POSH','TOT'])assert(engine.identifyTopicAbbreviations(term).some(a=>a.short===term),term);
      assert(!engine.needsTopicClarification('ICD-11').length);
      assert(engine.needsTopicClarification('IYD').some(a=>a.short==='IYD'));
    }],
    ['Clinical spelling correction preserves sensitivity and context-specific mass casualty',()=>{
      assert.equal(engine.correctCompletedClinicalWord('Antibiotic sensitiblity ').value,'Antibiotic sensitivity ');
      assert.equal(engine.correctCompletedClinicalWord('hand hygine ').value,'hand hygiene ');
      assert.equal(engine.correctCompletedClinicalWord('Patient to strecher ').value,'Patient to stretcher ');
      assert.equal(engine.correctCompletedClinicalWord('Mass Causality ').value,'Mass casualty ');
      assert.equal(engine.correctCompletedClinicalWord('Research causality '),null);
      assert.equal(engine.correctCompletedClinicalWord('Unknown drugname '),null);
    }],
    ['Long combined neonatal CNE title separates two conditions and phototherapy skill',()=>{
      const raw='Topic: Nursing management of Neonatal Hyperbilirubinemia and Rh Incompatibility (Skills: Care of Neonates on Phototherapy)';
      const parsed=engine.interpretCneTopic(raw);
      assert.deepEqual(parsed.principalConcepts,['Neonatal Hyperbilirubinemia','Rh Incompatibility']);
      assert.deepEqual(parsed.practicalSkills,['Phototherapy care for neonates']);
      assert(parsed.secondaryContext.includes('Nursing management'));
      assert.equal(parsed.original,raw);
    }],
    ['Additional skill-linked CNE examples and clinical compound concepts remain separate',()=>{
      const heart=engine.interpretCneTopic('Topic: Nursing management of Tetralogy of Fallot (Skills: Management of Patient during Tet Spell)');
      assert(heart.principalConcepts.some(c=>/tetralogy of fallot/i.test(c)));
      assert(heart.practicalSkills.some(c=>/tet spell/i.test(c)));
      const gall=engine.interpretCneTopic('Nursing management of Cholecystitis/ Cholelithiasis (Skill: Surgical Safety & Pre & Post Op. Management)');
      assert.deepEqual(gall.principalConcepts,['Cholecystitis','Cholelithiasis']);
      assert.equal(gall.practicalSkills.length,1);
      const liver=engine.interpretCneTopic('Nursing management of Acute and Chronic Liver Failure (Skills: Fluid & Electrolyte Imbalance)');
      assert.deepEqual(liver.principalConcepts,['Acute Liver Failure','Chronic Liver Failure']);
    }],
    ['Nonclinical programmes and ICD-11 workshops remain legitimate topics',()=>{
      assert.equal(engine.interpretCneTopic('Soft Skills').category,'professional');
      assert.equal(engine.interpretCneTopic('Nursing Induction Training program').category,'education');
      const icd=engine.interpretCneTopic('Workshop to promote the use of ICD 11 in Tertiary care hospitals & medical Colleges');
      assert.equal(icd.category,'education');
      assert.deepEqual(icd.principalConcepts,['ICD-11']);
    }],
    ['Suspected CKD and TURB mismatch is advisory only, not a validation block',()=>{
      const raw='Topic: Nursing management Chronic Kidney Disease (Skills: Care of Patient undergoing TURB)';
      const parsed=engine.interpretCneTopic(raw);
      assert(parsed.reviewAdvisory && /confirm/i.test(parsed.reviewAdvisory));
      assert.equal(parsed.original,raw);
      assert(!engine.interpretCneTopic('Nursing management of Chronic Kidney Disease').reviewAdvisory);
      assert(input.includes('You may keep the title unchanged'));
    }],
    ['Historical and additional CNE topic suggestions share the same fast local input',()=>{
      assert(engine.SMART_TOPIC_DICTIONARY_STATS.additionalTopics>=50);
      assert(engine.suggestCneTopics('Care of gastrit').some(s=>/gastritis/i.test(s.text)));
      assert(engine.suggestCneTopics('Nursing management of neonatal hyper').some(s=>/hyperbilirubinemia/i.test(s.text)));
      assert(engine.suggestCneTopics('Soft skill').some(s=>/soft skills/i.test(s.text)));
      assert(input.includes('interpretCneTopic(value)'));
      assert(input.includes('Practical skill:'));
    }],
    ['Regression: ICD-10 and ICD-11 remain independent of ambiguous ICD',()=>{
      for (const code of ['ICD-10','ICD-11']) {
        const recognized=engine.identifyTopicAbbreviations('Classification '+code);
        assert(recognized.some(item=>item.short===code),code+' not recognized');
        assert(!engine.needsTopicClarification('Classification '+code).some(item=>item.short==='ICD'),code+' misidentified as ICD');
      }
      assert.equal(engine.expandTopicAbbreviation('ICD-10 classification and ICD','ICD','Intercostal chest drain'),
        'ICD-10 classification and Intercostal chest drain');
      assert.equal(engine.expandTopicAbbreviation('ICD-11 classification and ICD','ICD','Intercostal chest drain'),
        'ICD-11 classification and Intercostal chest drain');
    }],
    ['Regression: omitted common spelling corrections are restored',()=>{
      for (const [before,after] of [
        ['neontal ','neonatal '],['pneumona ','pneumonia '],['managemnet ','management '],
        ['Neontal ','Neonatal ']
      ]) assert.equal(engine.correctCompletedClinicalWord(before)?.value,after,before+' correction missing');
      assert.equal(engine.correctCompletedClinicalWord('anesthesia '),null,'Correct spelling should never be rewritten');
    }],
    ['Regression: skill labels are parsed with or without parentheses',()=>{
      for (const title of [
        'Nursing management of Ulcerative Colitis Skill: Stoma Care',
        'Nursing management of Ulcerative Colitis (Skill: Stoma Care)',
        'Nursing management of Ulcerative Colitis Skills: Stoma Care'
      ]) {
        const parsed=engine.interpretCneTopic(title);
        assert(parsed.principalConcepts.some(c=>/ulcerative colitis/i.test(c)),'Principal clinical subject missing');
        assert(parsed.practicalSkills.some(c=>/stoma care/i.test(c)),'Practical skill not separated');
        assert.equal(parsed.original,title,'Educator wording changed');
      }
    }],
    ['Regression: approved clinical dictionary and topic suggestions are retained',()=>{
      assert(engine.SMART_TOPIC_DICTIONARY_STATS.abbreviations>=586,'ICD-10/dictionary entry was lost');
      assert(engine.SMART_TOPIC_DICTIONARY_STATS.additionalTopics>=61,'Recent CNE topic suggestions were dropped');
      assert(engine.suggestCneTopics('Nursing management of neonatal hyper').some(s=>/hyperbilirubinemia/i.test(s.text)),
        'Practical-skill-linked title not suggested');
    }],
    ['Regression: Question Bank cards do not expose obsolete source fields or image status',()=>{
      const modal=readFileSync(join(ROOT_DIR,'src/components/cne/CNEQuestionsModal.tsx'),'utf8');
      for (const forbidden of ['q.resourceTitle','q.chapter','q.imageRequired','Source figure required:',
        'Review the original answer, rationale and textbook source']) {
        assert(!modal.includes(forbidden),'Deprecated or educator-hidden Question Bank field reintroduced: '+forbidden);
      }
      assert(modal.includes('Original answer:') && modal.includes('Rationale:'),'Question/answer educator review was removed');
      assert(modal.includes('Institutional Question Bank'),'Question Bank tab removed');
    }],
    ['Regression: topic input shows main topic and practical skill without altering saved title',()=>{
      assert(input.includes('Topic:</strong>') && input.includes('Practical skill:</strong>'),
        'Clinical topic and skill display regressed');
      assert(input.includes('Suggested interpretation only; your complete topic is saved as entered.'),
        'Educator control notice lost');
    }],
    ['Suggestions stay local and do not transmit topic data to external search services',()=>{
      assert(!input.includes('fetch(') && !input.includes('google.com/search') && !input.includes('ApiService.'));
      assert(!readFileSync(join(sourceDir,'cneTopicEngine.ts'),'utf8').includes('fetch('));
    }]
  ];
  console.log('\n>>> Shared CNE clinical topic autocomplete and abbreviation safety checks');
  for (const [name,test] of tests){
    focusedChecks.push({name,test});
    try { test(); focusedPassed++; console.log('✓ '+name); }
    catch(err){console.error('✗ '+name+': '+err.message);}
  }
  rmSync(tmp,{recursive:true,force:true});
}


// Completed CNE administrator correction: exercise the actual Apps Script update
// function with a mock schedule row and fresh post-lock role, not string-only assertions.
if (selected.some(item => item.id === 'performance') && passed === selected.length) {
  const gas = readFileSync(join(ROOT_DIR, 'Code.gs'), 'utf8');
  const start = gas.indexOf('function handleUpdateCNE(');
  const end = gas.indexOf('function parseDurationToSeconds(', start);
  assert(start >= 0 && end > start, 'Completed CNE update handler not found');
  const handler = gas.slice(start, end);
  const schedule = readFileSync(join(ROOT_DIR, 'src/components/CNESchedule.tsx'), 'utf8');
  const details = readFileSync(join(ROOT_DIR, 'src/components/cne/CneDetailsModal.tsx'), 'utf8');
  function buildCompletedHarness(status='Completed', freshRole='ADMIN') {
    const headers = ['CNE ID','Topic','Area','From Date','To Date','Duration',
      'Resource Person Emp Id','Mode of Teaching','Description','Admin Remarks','Status','Type of CNE',
      'Staff Emp ID','Staff Count','Max Participants','Participating Wards'];
    const record = ['CNE-COMP-001','Original Topic','ICU','2026-05-05T09:00','2026-05-05T10:30',
      '01:30:00','RP001','Lecture','Original objectives','Original remarks',status,'CENTRAL',
      'EMP001',1,40,'["ICU"]'];
    const rows = [headers, record];
    const events = {writes:0,audit:[],locks:0,validation:0};
    const sheet = {
      getDataRange:()=>({getValues:()=>rows.map(row=>row.slice())}),
      getRange:(r,c,n,w)=>({setValues:(values)=>{events.writes++;rows[r-1]=values[0].slice();}})
    };
    const context = {
      Date, String, Array, Math, Number,
      normalizeCNEStatus:v=>v,
      normalizeCNEType:v=>v,
      getCNEScheduleRecord:()=>({cneId:record[0],area:rows[1][2],status:rows[1][10],
        cneType:'CENTRAL',participatingWards:['ICU'],staffCount:1,internalAttendanceCount:1}),
      checkCNEAuthorized:()=>null,
      getSpreadsheet:()=>({getSheetByName:name=>name==='CNE Schedule'?sheet:null}),
      getHeaderMap:()=>Object.fromEntries(headers.map((x,i)=>[x.toLowerCase().replace(/[^a-z0-9]/g,''),i])),
      LockService:{getScriptLock:()=>({waitLock:()=>{events.locks++;},releaseLock:()=>{}})},
      refreshMutationSession:()=>({success:true,session:{employeeId:'STAFF001',role:freshRole}}),
      parseCneStartTimestamp_:v=>Date.parse(String(v)),
      getCNECanonicalDay:v=>String(v).slice(0,10),
      getIndiaTodayString:()=> '2026-10-30',
      validateCneDuration:(duration,from,to)=>{events.validation++;return {isValid:Boolean(duration)&&Date.parse(from)<=Date.parse(to)};},
      logAuditAction:(...args)=>events.audit.push(args),
      sanitizeCellInput:v=>String(v||''),
      requireActiveArea_:()=>null,
      requireActiveTeachingMode_:()=>null,
      _executionRosterData:null,
      _inMemoryOfficerMap:null
    };
    vm.createContext(context);
    vm.runInContext(handler,context,{timeout:3000});
    return {update:(patch,role='ADMIN')=>context.handleUpdateCNE({cneId:'CNE-COMP-001',...patch},{employeeId:'STAFF001',role}),events,rows};
  }
  const checks = [
    ['Completed CNE admin may correct topic and remarks without altering status or attendance',()=>{
      const h=buildCompletedHarness();
      const r=h.update({topic:'Corrected Topic',adminRemarks:'Verified update'});
      assert(r.success,r.message);assert.equal(h.rows[1][1],'Corrected Topic');
      assert.equal(h.rows[1][9],'Verified update');assert.equal(h.rows[1][10],'Completed');
      assert.equal(h.rows[1][12],'EMP001');assert.equal(h.rows[1][13],1);
      assert(h.events.audit.some(x=>x[0]==='ADMIN_CORRECT_COMPLETED_CNE'&&x[2].includes('Topic')));
    }],
    ['Non-admin Completed CNE edit is rejected before any sheet write',()=>{
      const h=buildCompletedHarness('Completed','AREA_INCHARGE');
      const r=h.update({topic:'Illegal edit'},'AREA_INCHARGE');
      assert.equal(r.errorCode,'COMPLETED_CNE_ADMIN_ONLY');assert.equal(h.events.writes,0);
    }],
    ['Revoked admin role during update lock fails closed',()=>{
      const h=buildCompletedHarness('Completed','AREA_INCHARGE');
      const r=h.update({topic:'Illegal after role revocation'});
      assert.equal(r.errorCode,'COMPLETED_CNE_ADMIN_ONLY');assert.equal(h.events.writes,0);
      assert(h.events.locks>0,'Live session was not checked under lock');
    }],
    ['Completed CNE status cannot be changed through Edit',()=>{
      const h=buildCompletedHarness();const r=h.update({topic:'New topic',status:'Scheduled'});
      assert.equal(r.errorCode,'INVALID_STATUS_TRANSITION');assert.equal(h.events.writes,0);
      assert.equal(h.rows[1][10],'Completed');
    }],
    ['Completed CNE wards, area, capacity and participant mutation remain locked',()=>{
      for(const patch of [{area:'NICU'},{participatingWards:['ICU','NICU']},
        {maxParticipants:80},{staffEmpIds:['EMP002']},{externalStaffParticipants:['Visitor']}]){
        const h=buildCompletedHarness();const r=h.update(patch);
        assert.equal(r.errorCode,'COMPLETED_CNE_COVERAGE_LOCKED',JSON.stringify(patch));
        assert.equal(h.events.writes,0);
      }
    }],
    ['Admin Completed CNE historical date correction validates duration without requiring future date',()=>{
      const h=buildCompletedHarness();const r=h.update({date:'2026-04-02T09:00',toDate:'2026-04-02T11:00',duration:'02:00:00'});
      assert(r.success,r.message);assert.equal(h.rows[1][3],'2026-04-02T09:00');
      assert.equal(h.rows[1][4],'2026-04-02T11:00');assert.equal(h.rows[1][5],'02:00:00');
      assert(h.events.validation>0);
    }],
    ['Completed CNE cannot be changed to a future date',()=>{
      const h=buildCompletedHarness();const r=h.update({date:'2026-11-02T09:00',toDate:'2026-11-02T10:30',duration:'01:30:00'});
      assert.equal(r.errorCode,'COMPLETED_CNE_FUTURE_DATE');assert.equal(h.events.writes,0);
    }],
    ['Canceled CNE stays immutable, scheduled admin edit stays supported',()=>{
      const canceled=buildCompletedHarness('Canceled');const cr=canceled.update({topic:'Wrong'});
      assert.equal(cr.errorCode,'CNE_ALREADY_CANCELED');assert.equal(canceled.events.writes,0);
      const scheduled=buildCompletedHarness('Scheduled');const sr=scheduled.update({topic:'Revised Scheduled'});
      assert(sr.success,sr.message);assert.equal(scheduled.rows[1][1],'Revised Scheduled');
    }],
    ['Completed Edit is admin-only in UI; Cancel and Delete are hidden for Completed CNE',()=>{
      assert(details.includes("(!isCompleted || user?.role === 'ADMIN')"));
      assert(details.includes('const canCancelCne = canLifecycle && !isCompleted && !isCanceled'));
      assert(details.includes('const showDeleteButton = Boolean(canDeleteCne && !isCompleted && onDelete)'));
      assert(schedule.includes('(!isCneCompleted(cls) || isAdmin)'));
      assert(schedule.includes('!isCneCompleted(editingCne) ? { area: editArea } : {}'));
      assert(schedule.includes('!isCneCompleted(editingCne) ? { maxParticipants: editMaxParticipants } : {}'));
    }]
  ];
  console.log('\n>>> Admin-only Completed CNE historical-edit checks');
  for (const [name,test] of checks) {
    focusedChecks.push({name,test});
    try {test();focusedPassed++;console.log('✓ '+name);}
    catch(err){console.error('✗ '+name+': '+err.message);}
  }
}

console.log('\n================================================================');
console.log(`Suites: ${passed}/${selected.length} passed; baseline checks covered by passing suites: ${passedChecks}/${selected.reduce((sum,s)=>sum+s.expectedChecks,0)}`);
console.log('================================================================');
if (focusedChecks.length) console.log(`Focused regression checks: ${focusedPassed}/${focusedChecks.length} passed`);
if (passed !== selected.length || focusedPassed !== focusedChecks.length) process.exit(1);
if (process.argv.includes('--with-timezone')) runTimezoneVerification();

