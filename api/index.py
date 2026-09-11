import json
import os
from pathlib import Path
from starlette.applications import Starlette
from starlette.responses import JSONResponse, FileResponse, Response, PlainTextResponse
from starlette.routing import Route, Mount
from starlette.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / 'static'
DATA_DIR = BASE_DIR / 'data'
DB_FILE = DATA_DIR / 'vani_database.json'

DB = None

def load_db():
    global DB
    if DB is not None:
        return DB
    if DB_FILE.exists():
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                DB = json.load(f)
        except Exception as e:
            print("Error loading DB:", e)
            DB = {}
    else:
        DB = {}
    return DB

async def get_summary(request):
    db = load_db()
    return JSONResponse(db.get('summary', {}))

async def get_all_data(request):
    db = load_db()
    return JSONResponse(db)

async def search(request):
    q = request.query_params.get('q', '').strip().lower()
    if not q:
        return JSONResponse({'results': []})
    
    db = load_db()
    results = []

    # Search Bridges
    for b in db.get('bridges', []):
        text = f"bridge {b.get('bridge_no')} {b.get('old_bridge_no')} {b.get('bridge_type')} {b.get('section')} km {b.get('km_from')}".lower()
        if q in text:
            results.append({
                'type': 'Bridge',
                'title': f"Bridge {b.get('bridge_no')} ({b.get('bridge_type')})",
                'subtitle': f"Km {b.get('km_from')} - {b.get('km_to')} | {b.get('section')}",
                'category': 'bridges',
                'data': b
            })

    # Search Curves
    for c in db.get('curves', []):
        text = f"curve {c.get('curve_no')} {c.get('km_from')} {c.get('km_to')} deg {c.get('degree')} rad {c.get('radius')}".lower()
        if q in text:
            results.append({
                'type': 'Curve',
                'title': f"Curve No. {c.get('curve_no')}",
                'subtitle': f"Km {c.get('km_from')} - {c.get('km_to')} | R={c.get('radius')}m | {c.get('degree')}°",
                'category': 'curves',
                'data': c
            })

    # Search Points & Crossings
    for p in db.get('points_and_crossings', []):
        text = f"point {p.get('point_no')} {p.get('station')} {p.get('line')} {p.get('angle')} {p.get('srj_chainage')}".lower()
        if q in text:
            results.append({
                'type': 'Point & Crossing',
                'title': f"Point {p.get('point_no')} ({p.get('station')})",
                'subtitle': f"SRJ Ch. {p.get('srj_chainage')} | {p.get('line')} ({p.get('angle')})",
                'category': 'pnc',
                'data': p
            })

    # Search Staff
    for s in db.get('master_staff', []):
        text = f"{s.get('name')} {s.get('awpo_id')} {s.get('designation')} {s.get('beat_no')} {s.get('mobile')} {s.get('residence')}".lower()
        if q in text:
            results.append({
                'type': 'Staff',
                'title': f"{s.get('name')} ({s.get('designation')})",
                'subtitle': f"AWPO ID: {s.get('awpo_id')} | Beat: {s.get('beat_no')} | Mob: {s.get('mobile')}",
                'category': 'staff',
                'data': s
            })

    # Search Drawings
    for d in db.get('drawings', []):
        text = f"{d.get('filename')} {d.get('category')} {d.get('sheet_no')} {d.get('km_from')} {d.get('km_to')}".lower()
        if q in text:
            results.append({
                'type': 'Drawing',
                'title': d.get('filename'),
                'subtitle': f"{d.get('category')} | Sheet: {d.get('sheet_no')} | {d.get('size_kb')} KB",
                'category': 'drawings',
                'data': d
            })

    # Search Store
    for p in db.get('store', {}).get('pway_material', []):
        text = f"{p.get('particular')} {p.get('page_no')} pway".lower()
        if q in text:
            results.append({
                'type': 'Store (P-Way)',
                'title': p.get('particular'),
                'subtitle': f"Bal: {p.get('balance')} {p.get('unit')} | Ledger Pg: {p.get('page_no')}",
                'category': 'store',
                'data': p
            })

    return JSONResponse({'results': results[:50]})

async def chainage_lookup(request):
    km_str = request.query_params.get('km', '').strip()
    if not km_str:
        return JSONResponse({'error': 'km parameter required'}, status_code=400)
    
    try:
        km = float(km_str)
    except ValueError:
        return JSONResponse({'error': 'invalid km value'}, status_code=400)

    db = load_db()
    res = {
        'target_km': km,
        'section': None,
        'keyman': None,
        'bridges': [],
        'curves': [],
        'points': [],
        'loop_lines': [],
        'defects': [],
        'drawings': []
    }

    # Section lookup
    for s in db.get('sections', []):
        if s['km_from'] <= km <= s['km_to']:
            res['section'] = s
            break

    # Keyman beat lookup
    for staff in db.get('master_staff', []):
        if staff.get('km_from') and staff.get('km_to'):
            if staff['km_from'] <= km <= staff['km_to']:
                res['keyman'] = staff
                break

    # Bridges within 1 km
    for b in db.get('bridges', []):
        b_from = b.get('km_from', 0)
        b_to = b.get('km_to', 0)
        if abs(b_from - km) <= 1.0 or abs(b_to - km) <= 1.0 or (b_from <= km <= b_to):
            res['bridges'].append(b)

    # Curves within 1 km
    for c in db.get('curves', []):
        c_from = c.get('km_from', 0)
        c_to = c.get('km_to', 0)
        if (c_from <= km <= c_to) or abs(c_from - km) <= 0.8:
            res['curves'].append(c)

    # Points within 1 km
    for p in db.get('points_and_crossings', []):
        srj = p.get('srj_chainage', 0)
        if abs(srj - km) <= 1.0:
            res['points'].append(p)

    # Loop lines within 1 km
    for l in db.get('loop_lines', []):
        l_from = l.get('ch_from', 0)
        l_to = l.get('ch_to', 0)
        if (l_from <= km <= l_to) or abs(l_from - km) <= 0.8:
            res['loop_lines'].append(l)

    # Turnout defects
    for d in db.get('turnout_defects', []):
        srj = d.get('srj_chainage', 0)
        if abs(srj - km) <= 1.0:
            res['defects'].append(d)

    # DFWO defects
    for df in db.get('dfwo', []):
        ch = df.get('chainage', 0)
        if abs(ch - km) <= 1.0:
            res['defects'].append(df)

    # Drawings
    for dwg in db.get('drawings', []):
        d_from = dwg.get('km_from')
        d_to = dwg.get('km_to')
        if d_from is not None and d_to is not None:
            if d_from <= km <= d_to or abs(d_from - km) <= 2.0:
                res['drawings'].append(dwg)

    return JSONResponse(res)

async def media_handler(request):
    subpath = request.path_params['path']
    filepath = BASE_DIR / subpath
    if not filepath.exists() or not filepath.is_file():
        return Response("File not found", status_code=404)
    
    ext = filepath.suffix.lower()
    content_type = "application/octet-stream"
    if ext == '.pdf':
        content_type = "application/pdf"
    elif ext in ['.png', '.webp']:
        content_type = f"image/{ext[1:]}"
    elif ext in ['.jpg', '.jpeg']:
        content_type = "image/jpeg"
    elif ext == '.dwg':
        content_type = "application/acad"
    
    return FileResponse(
        str(filepath),
        media_type=content_type,
        headers={"Content-Disposition": f"inline; filename=\"{filepath.name}\""}
    )

async def index_view(request):
    return FileResponse(str(STATIC_DIR / 'index.html'))

async def linear_view(request):
    return FileResponse(str(STATIC_DIR / 'linear.html'))

async def map_view(request):
    return FileResponse(str(STATIC_DIR / 'map_linear.html'))

async def download_apk(request):
    apk_path = BASE_DIR / 'apk' / 'VaniTrack_Linear_Diagram.apk'
    if not apk_path.exists():
        return PlainTextResponse("APK not found", status_code=404)
    return FileResponse(
        str(apk_path),
        media_type='application/vnd.android.package-archive',
        headers={"Content-Disposition": "attachment; filename=\"VaniTrack_Linear_Diagram.apk\""}
    )

routes = [
    Route('/', index_view),
    Route('/map', map_view),
    Route('/linear', linear_view),
    Route('/api/summary', get_summary),
    Route('/api/database', get_all_data),
    Route('/api/search', search),
    Route('/api/chainage', chainage_lookup),
    Route('/download/apk', download_apk),
    Route('/media/{path:path}', media_handler),
    Mount('/static', StaticFiles(directory=str(STATIC_DIR)), name='static'),
]

app = Starlette(debug=False, routes=routes)
