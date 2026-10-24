import sys, numpy as np, trimesh
from OCP.STEPControl import STEPControl_Reader
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE, TopAbs_SOLID, TopAbs_REVERSED
from OCP.TopoDS import TopoDS
from OCP.BRep import BRep_Tool
from OCP.TopLoc import TopLoc_Location
from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib

def convert(src, dst, lin=0.15, ang=0.2, scale=1.0, name='piece'):
    r = STEPControl_Reader(); assert r.ReadFile(src) == 1, 'lecture STEP'
    r.TransferRoots(); shape = r.OneShape()
    bb = Bnd_Box(); BRepBndLib.Add_s(shape, bb); lo, hi = bb.CornerMin(), bb.CornerMax(); b = [lo.X(),lo.Y(),lo.Z(),hi.X(),hi.Y(),hi.Z()]
    print(src.split('/')[-1][:40], 'bbox mm', [round(x,1) for x in b])
    BRepMesh_IncrementalMesh(shape, lin, False, ang, True)
    scene = trimesh.Scene(); nsol = 0; ntri = 0
    sx = TopExp_Explorer(shape, TopAbs_SOLID)
    solids = []
    while sx.More(): solids.append(TopoDS.Solid(sx.Current())); sx.Next()
    if not solids: solids = [shape]
    for si, solid in enumerate(solids):
        V=[];F=[];N=[];off=0
        fx = TopExp_Explorer(solid, TopAbs_FACE)
        while fx.More():
            face = TopoDS.Face(fx.Current()); fx.Next()
            loc = TopLoc_Location(); tri = BRep_Tool.Triangulation_s(face, loc)
            if tri is None: continue
            tr = loc.Transformation()
            pts = np.array([[tri.Node(i).Transformed(tr).X(), tri.Node(i).Transformed(tr).Y(), tri.Node(i).Transformed(tr).Z()] for i in range(1, tri.NbNodes()+1)])
            ts = np.array([[tri.Triangle(i).Value(1)-1, tri.Triangle(i).Value(2)-1, tri.Triangle(i).Value(3)-1] for i in range(1, tri.NbTriangles()+1)])
            if face.Orientation() == TopAbs_REVERSED: ts = ts[:, [0,2,1]]
            m = trimesh.Trimesh(pts, ts, process=False)
            N.append(m.vertex_normals.copy()); V.append(pts); F.append(ts+off); off += len(pts)
        if not V: continue
        mesh = trimesh.Trimesh(np.vstack(V)*scale, np.vstack(F), vertex_normals=np.vstack(N), process=False)
        scene.add_geometry(mesh, node_name=f'{name}_{si:02d}', geom_name=f'{name}_{si:02d}'); nsol += 1; ntri += len(mesh.faces)
    scene.export(dst)
    print('  ->', dst.split('/')[-1], 'solides', nsol, 'triangles', ntri)
    return b

if __name__ == '__main__':
    convert(sys.argv[1], sys.argv[2], name=sys.argv[3], scale=float(sys.argv[4]) if len(sys.argv)>4 else 1.0)
