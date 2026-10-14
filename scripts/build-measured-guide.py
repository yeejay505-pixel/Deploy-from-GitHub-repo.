"""Offline temporary narration with synthesizer-measured word boundaries.
No paid service. Does not approve voice, verify text or estimate alignment.
Requires the locally installed libflite CMU AWB voice. No time-stretching.
"""
import ctypes as C, hashlib, json, re, sys, wave
from pathlib import Path
base=Path(sys.argv[1]).resolve();plan=json.loads((base/'plan.json').read_text())
F=C.CDLL('/lib/x86_64-linux-gnu/libflite.so.2.2',mode=C.RTLD_GLOBAL);V=C.CDLL('/lib/x86_64-linux-gnu/libflite_cmu_us_awb.so.2.2');ptr=C.c_void_p;st=C.c_char_p
def sig(lib,name,args,ret):
 f=getattr(lib,name);f.argtypes=args;f.restype=ret;return f
sig(F,'flite_init',[],C.c_int)();voice=sig(V,'register_cmu_us_awb',[st],ptr)(None)
synth=sig(F,'flite_synth_text',[st,ptr],ptr);rel=sig(F,'utt_relation',[ptr,st],ptr);head=sig(F,'relation_head',[ptr],ptr);as_=sig(F,'item_as',[ptr,st],ptr);first=sig(F,'item_daughter',[ptr],ptr);last=sig(F,'item_last_daughter',[ptr],ptr);next_=sig(F,'item_next',[ptr],ptr);prev=sig(F,'item_prev',[ptr],ptr);flt=sig(F,'item_feat_float',[ptr,st],C.c_float);string=sig(F,'item_feat_string',[ptr,st],st);uw=sig(F,'utt_wave',[ptr],ptr);save=sig(F,'cst_wave_save_riff',[ptr,st],C.c_int);delete=sig(F,'delete_utterance',[ptr],None)
rate=16000;cursor=round(.6*rate);audio=bytearray(cursor*2);sentences=[]
def norm(s):return re.sub(r'[^\w]','',s.lower()).replace('_','')
for i,s in enumerate(plan['sentences']):
 utt=synth(s['narration'].encode(),voice);raw=base/f'guide-raw-{i:02d}.wav'
 try:
  if save(uw(utt),str(raw).encode()):raise RuntimeError('guide_wave_save_failed')
  words=[];item=head(rel(utt,b'Word'))
  while item:
   ss=as_(item,b'SylStructure');aa=as_(first(first(ss)),b'Segment');bb=as_(last(last(ss)),b'Segment');pr=prev(aa)
   words.append({'word':string(item,b'name').decode(),'start':float(flt(pr,b'end')) if pr else 0.,'end':float(flt(bb,b'end'))});item=next_(item)
 finally:delete(utt)
 with wave.open(str(raw)) as w:
  if w.getframerate()!=rate or w.getsampwidth()!=2 or w.getnchannels()!=1:raise RuntimeError('unexpected_guide_audio_format')
  samples=w.getnframes();payload=w.readframes(samples)
 # Merge only segmentation fragments that exactly reconstruct the given transcript token.
 merged=[];j=0
 for token in s['narration'].split():
  wanted=norm(token);collected='';begin=j
  while j<len(words) and wanted.startswith(collected+norm(words[j]['word'])):
   collected+=norm(words[j]['word']);j+=1
   if collected==wanted:break
  if collected!=wanted or j==begin:raise RuntimeError('guide_transcript_alignment_requires_review: '+token)
  merged.append({'word':token,'start':round(cursor/rate+words[begin]['start'],6),'end':round(cursor/rate+words[j-1]['end'],6)})
 if j!=len(words):raise RuntimeError('extra_synthesized_words')
 start=cursor/rate;audio.extend(payload);cursor+=samples;end=cursor/rate
 sentences.append({'id':s['id'],'narration':s['narration'],'start':start,'end':end,'words':merged})
 pause=round((.22 if i<len(plan['sentences'])-1 else 1.)*rate);audio.extend(bytes(pause*2));cursor+=pause
 raw.unlink()
output=base/'guide-narration.wav'
with wave.open(str(output),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(audio)
duration=cursor/rate
if duration>180:raise RuntimeError('narration_exceeds_render_limit')
timing={'schema_version':'measured-narration.v1','audio':{'path':output.name,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'duration':duration,'voice_status':'guide','alignment_method':'measured_word_timestamps'},'sentences':sentences}
(base/'timing.json').write_text(json.dumps(timing,indent=2)+'\n');(base/'audio-provenance.json').write_text(json.dumps({'engine':'libflite','voice':'CMU AWB','sample_rate':rate,'alignment':'Synthesizer word relation and phoneme segment boundaries on the exact waveform; transcript segmentation merges verified. Not speech-recognition forced alignment.','time_stretch':False,'voice_approved':False,'release_eligible':False},indent=2)+'\n')
print(json.dumps({'duration':duration,'sentences':len(sentences),'words':sum(len(s['words']) for s in sentences),'voice':'temporary_guide','paid_calls':0}))
