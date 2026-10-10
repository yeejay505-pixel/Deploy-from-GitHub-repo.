// Pure routing: no network, persistence, paid generation or messages.
// config comes from the operator's configuration node, never from user text.
export const DEFAULT_ROUTER_CONFIG = {
  allowed_chat_ids: ['8580375575'],
  dispatch_enabled: false,
  intake_gateway_workflow_id: '',
};

export function routeIntake(item, config, profile) {
  const update = item?.json ?? {}, binary = item?.binary ?? {};
  const m = update.message ?? update.edited_message;
  const reject = (reason) => ({json: {schema_version:'universal-intake.v1',status:'blocked',reason,dispatch_ready:false,release_eligible:false}});
  if (!m || m.chat?.id == null || !Number.isSafeInteger(m.message_id) || !Number.isSafeInteger(m.date) || m.date<0 || m.date>8640000000000) return reject('invalid_telegram_envelope');
  const chatId = String(m.chat.id);
  if (!config.allowed_chat_ids?.map(String).includes(chatId)) return reject('chat_not_allowed');
  if (!profile?.profile_id || profile.scope_status?.visual_reference !== 'approved') return reject('approved_visual_profile_missing');
  const raw = String(m.text ?? m.caption ?? '').trim();
  const mediaEntries = [['voice',m.voice],['video',m.video],['image',m.photo?.at(-1)],['document',m.document],['audio',m.audio],['animation',m.animation]];
  const mediaEntry = mediaEntries.find(([,v])=>v);
  const type = mediaEntry?.[0] ?? (/^https?:\/\/\S+$/i.test(raw)?'url':raw?'text':'unknown');
  const media = mediaEntry?.[1];
  const date = new Date(m.date*1000).toISOString();
  // Stable across retries; chat scoping prevents equal message IDs from colliding.
  const eventId = `TG-${chatId}-${m.message_id}`;
  const intakeId = `INT-${date.slice(0,10).replace(/-/g,'')}-${chatId}-${m.message_id}`;
  const projectId = `VID-${date.slice(0,10).replace(/-/g,'')}-${chatId}-${m.message_id}`;
  const commandMatch = raw.match(/^\/([a-z_]+)(?:@\w+)?(?:\s+(.*))?$/i);
  const command = commandMatch?.[1].toLowerCase() ?? null, arg = commandMatch?.[2]?.trim() ?? '';
  const routes = {
    reprelaunch:['real_estate_intelligence','18.1','re_project_key'],
    recreative:['real_estate_creative','19B','re_project_key'],
    assetmode:['asset_session_start','19A','re_project_key'],
    assetdone:['asset_session_close','19A',null],
    voice:['voice_production','20.2','project_id'],
    final:['final_assembly','24.1','project_id'],
    status:['project_query',null,null],
    help:['help',null,null], start:['help',null,null]
  };
  let route='manual_review', destination=null, intent='UNKNOWN', key=null, reason=null, topic=raw;
  if (update.edited_message) reason='edited_message_requires_revision_review';
  else if (command) {
    const known = routes[command];
    if (!known) reason='unsupported_command';
    else if (known[2] && !/^[A-Za-z0-9_-]+$/.test(arg)) reason='missing_or_invalid_project_key';
    else if (known[2]==='project_id' && !arg.startsWith('VID-')) reason='expected_video_project_id';
    else if (['assetdone','help','start'].includes(command) && arg) reason='unexpected_command_arguments';
    else { [route,destination]=known; key=known[2]?arg:null; intent='COMMAND'; }
  } else if (media) {
    intent=type==='voice'?'VOICE_BRIEF':'SOURCE_OR_REFERENCE';
    route=type==='voice'?'transcribe':raw?'source_brief_intelligence':'reference_analyzer';
    // No implicit active project or attachment reassignment. 19A session lookup belongs
    // to the durable gateway, which can route a verified open session to asset upload.
  } else if (/\b(change|replace|revise|redo|regenerate|fix)\b/i.test(raw) && /\b(scene|opening|ending|hook)\b/i.test(raw)) {
    intent='REVISION';route='revision_router';
    key=raw.match(/\bVID-[A-Za-z0-9_-]+\b/)?.[0] ?? null;
    if (!key) reason='revision_project_required';
  } else if (raw) {
    intent='NEW_VIDEO';route='research_story';
    topic=raw.replace(/^(?:topic\s*:\s*)/i,'');
  } else reason='empty_or_unsupported_input';
  if (media && !media.file_id) reason='media_file_id_missing';
  if (media && !Object.keys(binary).length) reason='media_download_required';
  if (media && command) reason='command_with_attachment_requires_review';
  const durationMatch=raw.match(/\b(\d{1,4})\s*(seconds?|secs?|minutes?|mins?)\b/i);
  const requestedDuration=durationMatch?Number(durationMatch[1])*(durationMatch[2].toLowerCase().startsWith('m')?60:1):60;
  const format=/\b(16\s*:\s*9|landscape|horizontal)\b/i.test(raw)?'16:9':/\b(1\s*:\s*1|square)\b/i.test(raw)?'1:1':'9:16';
  if (requestedDuration<10 || requestedDuration>3600) reason='duration_out_of_range';
  const hasGateway=typeof config.intake_gateway_workflow_id==='string' && /^[A-Za-z0-9_-]+$/.test(config.intake_gateway_workflow_id) && !/REPLACE|PLACEHOLDER/i.test(config.intake_gateway_workflow_id);
  const status=reason?'review_required':config.dispatch_enabled===true?(hasGateway?'handoff_ready':'gateway_binding_pending'):'dry_run_ready';
  const json={
    schema_version:'universal-intake.v1',intake_id:intakeId,idempotency_key:eventId,
    source:'telegram',chat_id:chatId,user_id:String(m.from?.id??''),message_id:m.message_id,update_id:update.update_id??null,received_at:date,
    input_type:type,raw_input:raw,caption:String(m.caption??''),intent,command,route_next:route,destination_workflow_label:destination,
    re_project_key:routes[command]?.[2]==='re_project_key'?key:null,
    project_id:routes[command]?.[2]==='project_id'||intent==='REVISION'?key:['NEW_VIDEO','SOURCE_OR_REFERENCE','VOICE_BRIEF'].includes(intent)?projectId:null,
    topic,original_brief:raw,duration_seconds:requestedDuration,duration_policy:'target_only_retime_to_measured_narration',format,
    style:'approved_visual_reference',mascot:/\b(no mascot|no presenter|without a?\s*presenter)\b/i.test(raw)?false:true,
    requested_visuals_json:JSON.stringify({quality_profile_id:profile.profile_id,benchmark_sha256:profile.reference.sha256,deterministic_graphics:true,persistent_objects:true,sentence_visual_contract:profile.required_sentence_fields}),
    quality_profile:profile,
    source_asset:media?{file_id:media.file_id,file_unique_id:media.file_unique_id??null,file_name:media.file_name??null,mime_type:media.mime_type??null,file_size:media.file_size??null,binary_property:Object.keys(binary)[0]??null,purpose:raw?'supplied_source_requires_extraction':'reference_requires_analysis'}:null,
    // The raw Telegram envelope keeps existing command parsers compatible.
    telegram_update:update,
    required_gateway_steps:['atomic_durable_event_reservation','resolve_project_or_open_asset_session','persist_downloaded_sources','extract_and_cite_supplied_sources','bind_compatible_subworkflow','preserve_quality_profile','block_unsupported_renderer_fallback','record_progress_and_failures'],
    production_gate:{visual_sample_review:'required_for_new_render',final_voice:'pending',claims:'verification_required',renderer_profile_binding:'required',publication:'not_authorized_by_intake'},
    status,reason,dispatch_ready:status==='handoff_ready',gateway_workflow_id:hasGateway?config.intake_gateway_workflow_id:null,release_eligible:false
  };
  return {json,...(Object.keys(binary).length?{binary}:{})};
}
