import sys, itertools, numpy as np, trimesh, re, warnings
from scipy.spatial import cKDTree
warnings.filterwarnings('ignore')
G='/root/.claude/uploads/7eddd5ea-5071-5efd-8b0f-110fef5138f6/8e26ae94-T2A_machine_cuivre_bleu_reservoir_F3_deflecteurs_sans_parachute.glb'
s=trimesh.load(G,force='scene')
def ref(pat):
    pts=[]
    for n in s.graph.nodes_geometry:
        if re.search(pat,n):
            T,g=s.graph[n]; m=s.geometry[g].copy(); m.apply_transform(T); pts.append(m.sample(6000) if len(m.faces)>6000 else m.vertices)
    return np.vstack(pts)
def rots():
    out=[]
    for p in itertools.permutations(range(3)):
        for sg in itertools.product([1,-1],repeat=3):
            R=np.zeros((3,3))
            for i in range(3): R[i,p[i]]=sg[i]
            if np.linalg.det(R)>0: out.append(R)
    return out
def best(stepglb, pat, label):
    A=ref(pat); sc=trimesh.load(stepglb,force='scene'); pts=[]
    for g in sc.geometry.values(): pts.append(g.sample(6000) if len(g.faces)>6000 else g.vertices)
    B=np.vstack(pts)*0.001
    tree=cKDTree(A); res=[]
    for R in rots():
        Bp=B@R.T
        Bp=Bp-(Bp.min(0)+Bp.max(0))/2+(A.min(0)+A.max(0))/2
        d,_=tree.query(Bp); d2,_=cKDTree(Bp).query(A)
        res.append((d.mean()*1000+d2.mean()*1000, R))
    res.sort(key=lambda x:x[0])
    print(label,'meilleurs écarts moyens (mm):',[round(r[0],1) for r in res[:3]])
    R=res[0][1]; Bp=B@R.T; t=(A.min(0)+A.max(0))/2-(Bp.min(0)+Bp.max(0))/2
    print('  R=',R.astype(int).tolist(),'t(m)=',t.round(4).tolist())
    return R,t
best('conv/exhaust.glb','^B06_ECHAPPEMENT','échappement')
best('conv/chassis.glb','^B01_CHASSIS','châssis D')
best('conv/alu.glb','^CAR_025','réservoir alu STEP (contrôle)')
