import numpy as np, trimesh, warnings
warnings.filterwarnings('ignore')
OUT='/home/user/SIE-SAPET/configurateur/models/'
J={ # nom: (entrée, R, t en m)
 'reservoir_roto':('conv/roto.glb',np.eye(3),np.zeros(3)),
 'reservoir_alu_step':('conv/alu.glb',np.eye(3),np.zeros(3)),
 'chassis_D':('conv/chassis.glb',np.array([[1,0,0],[0,0,-1],[0,1,0]],float),np.array([0.8863,0.3386,0.0008])),
 'echappement_16-01a':('conv/exhaust.glb',np.array([[0,0,-1],[0,1,0],[1,0,0]],float),np.array([-0.1708,0.7166,-0.0055])),
}
for k,(src,R,t) in J.items():
    sc=trimesh.load(src,force='scene')
    T=np.eye(4); T[:3,:3]=R*0.001; T[:3,3]=t
    # R*0.001 : mm->m puis rotation ; la translation t a été calculée après mise à l'échelle
    sc.apply_transform(T)
    # normales : on les fait recalculer par trimesh (rotation uniforme conserve celles du maillage)
    sc.export(OUT+k+'.glb'); b=sc.bounds
    print(k,'bbox m',b[0].round(3).tolist(),b[1].round(3).tolist())
