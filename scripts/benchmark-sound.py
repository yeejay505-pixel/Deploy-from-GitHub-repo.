"""Event-linked SFX for the visual benchmark. No narration or music is fabricated."""
import array, json, math, pathlib, random, subprocess, sys, wave

root=pathlib.Path(__file__).resolve().parents[1]
events=json.loads(subprocess.check_output(['node','--input-type=module','-e',
    "import {OFFICE_EVENTS} from './src/semantic/office-demand.mjs';console.log(JSON.stringify(OFFICE_EVENTS))"],cwd=root))
sr=48000; duration=20; mix=[0.0]*(sr*duration); rng=random.Random(94)
def add(at,kind):
    if kind=='arrival': length=.075; level=.035
    elif kind in ('lock','shift'): length=.13;level=.07
    elif kind=='resolve':length=.65;level=.075
    else:length=.48;level=.045
    start=int(at*sr); previous=0
    for j in range(int(length*sr)):
        t=j/sr; p=t/length
        if kind in ('trace','unfold'):
            previous=.87*previous+.13*rng.uniform(-1,1)
            value=previous*math.sin(math.pi*p)**2
        elif kind=='resolve':
            value=(math.sin(2*math.pi*523.25*t)+.55*math.sin(2*math.pi*783.99*t))*math.exp(-7*t)*min(1,t/.01)
        else:
            freq=440 if kind=='arrival' else 190
            value=math.sin(2*math.pi*freq*t)*math.exp(-65*t)*min(1,t/.002)
        if start+j<len(mix):mix[start+j]+=value*level
for event in events:add(event['at'],event['type'])
out=pathlib.Path(sys.argv[1]);out.parent.mkdir(parents=True,exist_ok=True)
pcm=array.array('h',(int(max(-1,min(1,x))*32767) for x in mix))
if sys.byteorder!='little':pcm.byteswap()
with wave.open(str(out),'wb') as wav:
    wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(sr);wav.writeframes(pcm.tobytes())
print(f'Saved {len(events)} timed SFX events. Narration: pending.')
