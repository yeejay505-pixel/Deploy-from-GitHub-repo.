// Patches a current 03S export without replacing credentials or unrelated nodes.
export const RENDER_WORKFLOW_ID = 'H5lLMa2U0RYPrylE';
export const BENCHMARK = 'bbe16b9b82eb225ee9c6f781c1573a4f6d439ca53e85f316f0c68bdd509c23f4';
export function bindSourceRender(source) {
  const w = structuredClone(source);
  const get = (name, type) => {
    const matches = w.nodes?.filter(n => n.name === name);
    if (matches?.length !== 1 || matches[0].type !== `n8n-nodes-base.${type}`)
      throw Error(`Current 03S export required: ${name}`);
    return matches[0];
  };
  const cfg = get('Configure Adapter', 'code');
  if (cfg.parameters.jsCode.includes('source-render-binding.v1')) throw Error('Already bound; inspect current configuration.');
  cfg.parameters.jsCode = `// source-render-binding.v1\nconst configured = (() => {\n${cfg.parameters.jsCode}\n})();\nreturn configured.map(item => {\nconst c=item.json.config;\nif(c.base_url.replace(/\\/$/,'')!=='https://adaptable-emotion-production-6031.up.railway.app')throw Error('Expected existing engine host.');\nc.render_workflow_id='${RENDER_WORKFLOW_ID}';c.render_enabled=true;\nreturn item;\n});`;
  get('Prepare Render Handoff','code').parameters.jsCode = `const r=$input.first().json,j=$items('Check Adapter Configuration')[0].json,c=j.config,p=r.receipt;\nif(r.status!=='validated_draft'||r.event_id!==j.event_id||!/^TG-[0-9]+-[0-9]+$/.test(j.event_id)||p?.schema_version!=='intake-receipt.v1'||p.accepted!==true||p.idempotency_key!==j.event_id||p.stage!=='intelligence_draft'||!/^INTEL-[a-f0-9]{24}$/.test(p.receipt_id)||p.benchmark_sha256!=='${BENCHMARK}'||p.release_eligible!==false||c.render_enabled!==true||c.render_workflow_id!=='${RENDER_WORKFLOW_ID}')throw Error('Validated stored model receipt and exact render binding required.');\nreturn [{json:{...p,workflow_id:c.render_workflow_id}}];`;
  const dispatch=get('Execute Durable Review Render','executeWorkflow');
  dispatch.onError='stopWorkflow';
  dispatch.retryOnFail=false;
  dispatch.parameters.options={...dispatch.parameters.options,waitForSubWorkflow:false};
  get('Restore Intelligence Receipt','code').parameters.jsCode = `const stored=$items('Prepare Render Handoff')[0].json,render=$input.first().json;\nif(render.error)throw Error('Render dispatch failed; stored intelligence remains available.');\nreturn [{json:{render_dispatch_status:'requested',render_handoff:render,receipt:Object.fromEntries(Object.entries(stored).filter(([k])=>k!=='workflow_id')),release_eligible:false}}];`;
  get('Model Call Permitted','if');
  get('Durable Render Bound','if');
  if (!w.connections?.['Model Call Permitted']?.main?.[1]) throw Error('Missing reservation denial branch.');
  // Concurrent completion can return a cached valid draft when reservation is denied.
  w.connections['Model Call Permitted'].main[1]=[{node:'Durable Render Bound',type:'main',index:0}];
  w.active=false;
  w.pinData={};
  return w;
}
