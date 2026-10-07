#!/usr/bin/env python3
"""Independent analytical reference for the current Woodland configuration.

Per-line expectation uses independent uniform reel stops, conditioned on the
shared replacement symbol. Scatter counts use exact cyclic-window convolution.
The award is the first repeated weighted draw, evaluated over all 1024 seen
subsets, rather than the mean of one draw. Retriggers form a branching process.
This verifies existing math; it does not calibrate a target RTP.
"""
import json, collections, math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
c=json.loads((root/'packages/games/woodland-whisper/config/config.json').read_text())
strips=list(c['reel_strips'].values())
inner=collections.Counter(c['inner_reel_strip']['reel1']); total=sum(inner.values()); wild=c['symbols']['wild']
line=0
for replacement,weight in inner.items():
 distributions=[collections.Counter(replacement if s=='REPLACEMENT' else s for s in strip) for strip in strips]
 p=[{s:n/len(strip) for s,n in dist.items()} for strip,dist in zip(strips,distributions)]
 expected=0
 for target,pays in c['paytable'].items():
  for count,payout in pays.items():
   k=int(count)
   matching=math.prod(r.get(wild,0)+r.get(target,0) for r in p[:k])
   allwild=math.prod(r.get(wild,0) for r in p[:k])
   breakprob=1 if k==5 else 1-p[k].get(wild,0)-p[k].get(target,0)
   expected+=(matching-allwild)*breakprob*payout
 expected+=math.prod(r.get(wild,0) for r in p)*max(pays.get('5',0) for pays in c['paytable'].values())
 line+=expected*weight/total
prob=[1.]
for strip in strips:
 counts=collections.Counter(sum(strip[(stop+r)%len(strip)]=='COIN' for r in range(3)) for stop in range(len(strip)))
 nxt=[0.]*(len(prob)+3)
 for i,v in enumerate(prob):
  for k,n in counts.items():nxt[i+k]+=v*n/len(strip)
 prob=nxt
trigger=sum(prob[c['feature']['trigger']['min_count']:])
scatter=sum(prob[int(k)]*v for k,v in c['scatter_paytable']['COIN'].items())
values=[v for v,w in c['feature']['pick_bonus']]
weights=[w for v,w in c['feature']['pick_bonus']]
chances=[w/sum(weights) for w in weights]
mass=[0.]*(1<<len(values)); mass[0]=1.
award=0.
for mask in range(len(mass)):
 for i,p in enumerate(chances):
  if mask & (1<<i): award+=mass[mask]*p*values[i]
  else: mass[mask|(1<<i)]+=mass[mask]*p
base=line+scatter
freecount=award/(1-trigger*award)
feature=trigger*freecount*base*c['feature']['free_spin_multiplier']
out=dict(method='Exact marginal reel probabilities; scatter convolution; branching expectation of retriggered free spins. No RNG or engine evaluator.',lineRtp=line,scatterRtp=scatter,baseRtp=base,triggerProbability=trigger,triggerCycle=1/trigger,meanAward=award,meanTotalFreeSpins=freecount,featureRtp=feature,totalRtp=base+feature,meanFeatureWin=freecount*base*c['feature']['free_spin_multiplier']*c['game_metadata']['cost_to_play'])
print(json.dumps(out,indent=2))
