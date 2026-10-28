/** Smart Hybrid behavioral checks. No Google Sheets or Gemini network calls. */
import {readFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const gas=readFileSync(join(ROOT,'Code.gs'),'utf8');
const TYPES=readFileSync(join(ROOT,'src/types.ts'),'utf8');
const MODAL=readFileSync(join(ROOT,'src/components/cne/CNEQuestionsModal.tsx'),'utf8');
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
const HEADERS=['Question ID','Resource Title','Drive File ID','Unit','Chapter Number','Chapter Title','Topic','Subtopic','Clinical Keywords','Original Question Number','Question Type','Question Text','Option A','Option B','Option C','Option D','Option E','Option F','Correct Answer','Explanation / Rationale','Question PDF Page','Explanation PDF Page','Printed Page Number','Image / Table Required','Image / Table Reference','Clinical Evidence Reference','Verification Status','Reuse Permission','Updated At'];
const QHEAD=['CNE ID','Question ID','Question Text','Option A','Option B','Option C','Option D','Correct Option','Explanation','Is Finalized','Is Locked','Created At','Created By','Authoritative Source','Status'];
function question(sourceId='REF-001'){
 const row=Array(29).fill('');
 Object.assign(row,{0:sourceId,1:'Approved Nursing Textbook',2:'drive-filename-123',5:'Peripheral Intravenous Therapy',6:'IV Cannulation',7:'Site selection',8:'venipuncture, cannula insertion',10:'Single best answer',11:'Which peripheral vein is appropriate for IV cannulation in this situation?',12:'Appropriate vein with intact skin',13:'Unassessed vein',14:'Inflamed vein',15:'Previous infiltration site',18:'A',19:'The clinical source explains the safe nursing assessment required for IV site selection.',20:101,21:105,23:'NO',26:'EXTRACTED_PENDING_CLINICAL_REVIEW',27:'Institution Authorized (user-confirmed)'});return row;
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
export const hybridChecks=[
 {name:'Bank search requires an authorized CNE owner',run(){const {ctx}=fixture();ctx.checkQuestionManagementAuthorized=()=>({success:false,errorCode:'FORBIDDEN'});assert(ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session).errorCode==='FORBIDDEN','Unauthorized search exposed answers');}},
 {name:'Bank search ranks question text and subtopic for all relevant textbook sources',run(){const {ctx}=fixture();const result=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);assert(result.success&&result.data.length===2&&result.data[0].matchScore>0,'Relevant existing question not found');}},
 {name:'Bank refuses malformed schema rather than guess answer column positions',run(){const {ctx,b}=fixture();b.rows[0][18]='Unknown Answer';const result=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);assert(result.errorCode==='QUESTION_BANK_SCHEMA_INVALID','Bad schema accepted');}},
 {name:'Question Bank records needing review are not importable',run(){const {ctx,b}=fixture();b.rows[1][26]='NEEDS_REVIEW';const result=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);assert(!result.data.find(x=>x.questionId==='REF-001').canImport,'Unreviewed figure item import allowed');}},
 {name:'Question Bank rejects extra options E/F that Post-Test does not support',run(){const {ctx,b}=fixture();b.rows[1][16]='Fifth choice';let result=ctx.handleSearchCNEReferenceQuestions({cneId:'CNE-123'},session);assert(!result.data.find(x=>x.questionId==='REF-001').canImport,'Extra option ignored');result=ctx.handleImportCNEReferenceQuestion({cneId:'CNE-123',questionId:'REF-001',confirmReview:true},session);assert(result.errorCode==='SOURCE_QUESTION_NEEDS_REVIEW','Forced import succeeded');}},
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
    assert(q.rows[1][11]===original[11] && q.rows[1][13]===original[13] && q.rows[1][8]===edited.explanation,'Question Bank source or edit was lost');
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

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  console.log(`Running ${hybridChecks.length} Smart Hybrid checks...`);
  let passed = 0;
  for (const check of hybridChecks) {
    try {
      check.run();
      console.log(`✓ ${check.name}`);
      passed++;
    } catch (err) {
      console.error(`✗ ${check.name}:`, err.message);
      process.exit(1);
    }
  }
  console.log(`\nAll ${passed}/${hybridChecks.length} Smart Hybrid checks passed.`);
}
