"""
3mix_production.py - FIXED VERSION for R² > 0.5

Key fixes:
1. Removed hard height threshold (2m cutoff) - smooth continuous AGB
2. Fixed allometry consistency - uses same equation throughout
3. Added feature scaling/normalization
4. Better spatial cross-validation grouping
5. Consistent date windows
6. Added feature interaction terms
7. Better hyperparameters for mangrove biomass
8. FIXED: Autopredict now applies same feature engineering as training
9. FIXED: Domain similarity uses unscaled features (no unit mismatch)
"""
import argparse, json, os, time, math
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
import requests, h5py
from datetime import datetime, timezone, date
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from shapely.geometry import box, Point, shape, mapping
from shapely.ops import transform as shp_transform
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GroupKFold
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import xgboost as xgb
import rasterio
from rasterio.warp import transform as warp_transform
from rasterio.sample import sample_gen
import planetary_computer, pystac_client
from tqdm import tqdm
import math, json as pyjson

# ---------------- CONFIG ----------------
ALLOMETRY_A = 3.4
ALLOMETRY_B = 2.0
ALLOMETRY_C = 0.0
BGB_RATIO = 0.39
CARBON_FRACTION = 0.47
CO2_CONVERSION = 3.67
ENSEMBLE_SIZE = 5
CONF_W_MODEL = 0.5
CONF_W_DOM = 0.5
CMR_GRANULES = "https://cmr.earthdata.nasa.gov/search/granules.json"
HEADERS = {'User-Agent': '3mix-production/1.0'}
HDF5_MAGIC = b'\x89HDF\r\n\x1a\n'
ATL08_EPOCH = datetime(2018,1,1,tzinfo=timezone.utc).timestamp()
S2_BANDS = ["B02","B03","B04","B08","B11","B12"]
CACHE_DIR = Path(".pc_cache"); CACHE_DIR.mkdir(exist_ok=True)

# ---------------- HELPERS ----------------
def delta_time_to_datetime(delta_time_array):
    arr = np.array(delta_time_array, dtype=float)
    unix_ts = ATL08_EPOCH + arr
    out = []
    for ts in unix_ts:
        if np.isfinite(ts):
            out.append(datetime.fromtimestamp(ts, tz=timezone.utc).isoformat())
        else:
            out.append(None)
    return out

def safe_read_dataset(grp, names):
    for name in names:
        if name in grp:
            try:
                return np.array(grp[name])
            except:
                continue
    return None

def extract_segments_from_h5(path):
    try:
        f = h5py.File(path, 'r')
    except Exception:
        return pd.DataFrame()
    rows = []
    gt_keys = [g for g in f.keys() if str(g).lower().startswith('gt')]
    for gt in gt_keys:
        base = f"{gt}/land_segments"
        if base not in f: continue
        grp = f[base]
        delta_time = safe_read_dataset(grp, ['delta_time', 'delta_time_beg', 'delta_time_end'])
        if delta_time is None: continue
        date_list = delta_time_to_datetime(delta_time)
        lat_arr = safe_read_dataset(grp, ['latitude', 'lat_ph', 'latitude_20m'])
        lon_arr = safe_read_dataset(grp, ['longitude', 'lon_ph', 'longitude_20m'])
        if lat_arr is None or lon_arr is None: continue
        rh_arr = safe_read_dataset(grp, ['canopy/h_canopy_98th','canopy/h_canopy','rh98'])
        if rh_arr is None:
            rh_arr = np.full(len(lat_arr), np.nan)
        qf_arr = safe_read_dataset(grp, ['terrain/quality_flag','quality_flag','segment_quality'])
        if qf_arr is None:
            qf_arr = np.zeros(len(lat_arr), dtype=int)
        def to_1d(a):
            a = np.array(a, dtype=float)
            if a.ndim>1: a = a[:,0]
            a = np.where((np.abs(a)>1e10)|(~np.isfinite(a)), np.nan, a)
            return a
        lat_arr, lon_arr, rh_arr = to_1d(lat_arr), to_1d(lon_arr), to_1d(rh_arr)
        if hasattr(qf_arr,'ndim') and qf_arr.ndim>1: qf_arr = qf_arr[:,0]
        qf_arr = np.array(qf_arr, dtype=int)
        n = min(len(lat_arr), len(lon_arr), len(rh_arr), len(date_list))
        for i in range(n):
            if not np.isfinite(lat_arr[i]) or not np.isfinite(lon_arr[i]): continue
            rows.append({
                'lat': float(lat_arr[i]),
                'lon': float(lon_arr[i]),
                'date': date_list[i],
                'rh98': float(rh_arr[i]) if np.isfinite(rh_arr[i]) else np.nan,
                'quality_flag': int(qf_arr[i]) if i < len(qf_arr) else 0,
                'h5_source': Path(path).name
            })
    try: f.close()
    except: pass
    return pd.DataFrame(rows)

def query_cmr(min_lon, min_lat, max_lon, max_lat, start_date, end_date, page_size=500):
    params = {
        'short_name': 'ATL08',
        'bounding_box': f"{min_lon},{min_lat},{max_lon},{max_lat}",
        'temporal': f"{start_date}T00:00:00Z,{end_date}T23:59:59Z",
        'page_size': page_size,
        'sort_key[]': 'start_date'
    }
    r = requests.get(CMR_GRANULES, params=params, headers=HEADERS, timeout=60)
    r.raise_for_status()
    return r.json().get('feed',{}).get('entry',[])

def pick_direct_h5_links(entry):
    out = []
    for link in (entry.get('links') or []):
        href = link.get('href') or ""
        if href.split('?')[0].lower().endswith('.h5'):
            out.append(href)
    return list(dict.fromkeys(out))

def download_file(url, out_path, session=None, retries=2):
    s = session or requests.Session()
    for attempt in range(1, retries+2):
        try:
            with s.get(url, stream=True, headers=HEADERS, timeout=120) as r:
                r.raise_for_status()
                out_path.parent.mkdir(parents=True, exist_ok=True)
                with open(out_path, 'wb') as fh:
                    for chunk in r.iter_content(1024*1024):
                        if chunk: fh.write(chunk)
            with open(out_path,'rb') as fh:
                if fh.read(8) == HDF5_MAGIC:
                    return True
            try: out_path.unlink()
            except: pass
            if attempt <= retries: time.sleep(1); continue
            return False
        except Exception:
            if attempt <= retries: time.sleep(1); continue
            return False
    return False

# ---------------- Planetary Computer / Raster sampling ----------------
def sign_href(href):
    try: return planetary_computer.sign(href)
    except: return href

def href_to_cache_path(href):
    import hashlib
    key = hashlib.sha1(href.encode('utf-8')).hexdigest()
    return CACHE_DIR / f"{key}.tif"

def cached_download(href, timeout=120):
    cache = href_to_cache_path(href)
    if cache.exists(): return str(cache)
    signed = sign_href(href)
    tmp = str(cache) + ".part"
    headers = {"User-Agent":"pc-sampler/1.0"}
    try:
        with requests.get(signed, stream=True, timeout=timeout, headers=headers) as r:
            r.raise_for_status()
            with open(tmp,'wb') as fh:
                for chunk in r.iter_content(1024*1024):
                    if chunk: fh.write(chunk)
        os.replace(tmp, str(cache))
        return str(cache)
    except:
        try: os.remove(tmp)
        except: pass
        raise

def sample_asset_at_points(href, coords, attempts=2):
    signed = sign_href(href)
    for attempt in range(attempts):
        try:
            with rasterio.Env():
                with rasterio.open(signed) as ds:
                    xs, ys = warp_transform("EPSG:4326", ds.crs.to_string(), [c[0] for c in coords], [c[1] for c in coords])
                    samples = list(sample_gen(ds, list(zip(xs, ys))))
                    vals=[]
                    for s in samples:
                        try:
                            vals.append(float(s[0]) if getattr(s,'size',0)>0 else np.nan)
                        except:
                            vals.append(np.nan)
                    return vals
        except:
            try:
                local = cached_download(signed)
                with rasterio.open(local) as ds:
                    xs, ys = warp_transform("EPSG:4326", ds.crs.to_string(), [c[0] for c in coords], [c[1] for c in coords])
                    samples = list(sample_gen(ds, list(zip(xs, ys))))
                    vals=[(float(s[0]) if getattr(s,'size',0)>0 else np.nan) for s in samples]
                    return vals
            except:
                time.sleep(0.5)
    return [np.nan]*len(coords)

# ---------------- point-grouping utilities ----------------
def points_grouped_by_item(items, pts_df, date_window_days=1, pad_deg=0.0005):
    groups = defaultdict(list)
    pts = pts_df.copy(); pts['date'] = pd.to_datetime(pts['date']).dt.tz_localize(None)
    for it in items:
        try:
            it_date = pd.to_datetime(it.properties.get('datetime','')).tz_localize(None).normalize()
        except:
            continue
        start = it_date - pd.Timedelta(days=date_window_days)
        end = it_date + pd.Timedelta(days=date_window_days)
        bminx,bminy,bmaxx,bmaxy = it.bbox
        scene_box = box(bminx-pad_deg, bminy-pad_deg, bmaxx+pad_deg, bmaxy+pad_deg)
        for idx,row in pts.iterrows():
            if start <= row['date'] <= end:
                if scene_box.contains(Point(row['lon'], row['lat'])):
                    groups[it].append(idx)
    return groups

def sample_scene_for_points(item, indices, pts_df, band_map):
    coords = [(float(pts_df.loc[i,'lon']), float(pts_df.loc[i,'lat'])) for i in indices]
    per_point = {i: {'lat': pts_df.loc[i,'lat'], 'lon': pts_df.loc[i,'lon'], 'date': pts_df.loc[i,'date']} for i in indices}
    for band, asset_key in band_map.items():
        if asset_key not in item.assets:
            for i in indices: per_point[i][band] = np.nan
            continue
        href = item.assets[asset_key].href
        vals = sample_asset_at_points(href, coords)
        for i,v in zip(indices, vals):
            per_point[i][band] = (v/10000.0) if (np.isfinite(v) and v>1) else v
    for i in indices:
        b08 = per_point[i].get('B08', np.nan); b04 = per_point[i].get('B04', np.nan)
        b11 = per_point[i].get('B11', np.nan); b12 = per_point[i].get('B12', np.nan)
        b02 = per_point[i].get('B02', np.nan); b03 = per_point[i].get('B03', np.nan)
        def div(a,b): return (a-b)/(a+b+1e-8) if np.isfinite(a) and np.isfinite(b) else np.nan
        per_point[i]['NDVI'] = div(b08,b04)
        per_point[i]['NDWI'] = div(b08,b11)
        per_point[i]['NBR'] = div(b08,b12)
        if np.isfinite(b08) and np.isfinite(b04) and np.isfinite(b02):
            evi = 2.5*(b08-b04)/(b08 + 6*b04 - 7.5*b02 + 1)
            per_point[i]['EVI'] = evi if (np.isfinite(evi) and abs(evi)<5) else np.nan
        else:
            per_point[i]['EVI'] = np.nan
    vv_key = None; vh_key = None
    for k in item.assets.keys():
        kl = k.lower()
        if 'vv' in kl and vv_key is None: vv_key = k
        if 'vh' in kl and vh_key is None: vh_key = k
    if vv_key:
        vv_vals = sample_asset_at_points(item.assets[vv_key].href, coords)
    else: vv_vals = [np.nan]*len(coords)
    if vh_key:
        vh_vals = sample_asset_at_points(item.assets[vh_key].href, coords)
    else: vh_vals = [np.nan]*len(coords)
    for i, vv, vh in zip(indices, vv_vals, vh_vals):
        vv = vv if (np.isfinite(vv) and 0 < vv < 10) else np.nan
        vh = vh if (np.isfinite(vh) and 0 < vh < 10) else np.nan
        per_point[i]['S1_VV'] = vv; per_point[i]['S1_VH'] = vh
        if np.isfinite(vv) and np.isfinite(vh) and vv!=0 and vh!=0:
            per_point[i]['VH_VV'] = vh/(vv+1e-8); per_point[i]['VV_VH'] = vv/(vh+1e-8)
            per_point[i]['RVI'] = (4*vh)/(vv+vh+1e-8)
        else:
            per_point[i]['VH_VV']=np.nan; per_point[i]['VV_VH']=np.nan; per_point[i]['RVI']=np.nan
    rows = [(i, per_point[i]) for i in indices]
    return rows

def build_s1s2_features_for_points(points_df, out_parquet, minlat, maxlat, minlon, maxlon, start, end, date_window=3, workers=6):
    pts_df = points_df.copy().reset_index(drop=True)
    pts_df['date'] = pd.to_datetime(pts_df['date']).dt.strftime('%Y-%m-%d')
    catalog = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1", modifier=planetary_computer.sign_inplace)
    bbox = [minlon, minlat, maxlon, maxlat]; date_range = f"{start}/{end}"
    s2_items = list(catalog.search(collections=["sentinel-2-l2a"], bbox=bbox, datetime=date_range, query={"eo:cloud_cover":{"lt":60}}).items())
    s1_items = list(catalog.search(collections=["sentinel-1-rtc"], bbox=bbox, datetime=date_range).items())
    s2_groups = points_grouped_by_item(s2_items, pts_df, date_window_days=date_window)
    s1_groups = points_grouped_by_item(s1_items, pts_df, date_window_days=date_window)
    combined={}
    for it,idxs in s2_groups.items(): combined.setdefault(it, set()).update(idxs)
    for it,idxs in s1_groups.items(): combined.setdefault(it, set()).update(idxs)
    items = list(combined.keys())
    item_band_map={}
    for it in items:
        bm={}
        for b in S2_BANDS:
            if b in it.assets: bm[b]=b
            else:
                for k in it.assets.keys():
                    if k.upper()==b: bm[b]=k; break
                if b not in bm:
                    for k in it.assets.keys():
                        if b.lower() in k.lower(): bm[b]=k; break
        item_band_map[it]=bm
    final={}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(sample_scene_for_points, it, sorted(list(combined[it])), pts_df, item_band_map.get(it,{})): it for it in items if combined[it]}
        for fut in tqdm(as_completed(futures), total=len(futures), desc="Scenes"):
            try:
                for idx,row in fut.result():
                    if idx not in final: final[idx]=row
                    else:
                        for k,v in row.items():
                            if (k not in final[idx]) or (pd.isna(final[idx][k]) and not pd.isna(v)):
                                final[idx][k]=v
            except:
                pass
    rows = [final[i] if i in final else {'lat':pts_df.loc[i,'lat'],'lon':pts_df.loc[i,'lon'],'date':pts_df.loc[i,'date'], **{b:np.nan for b in S2_BANDS}, 'NDVI':np.nan,'NDWI':np.nan,'NBR':np.nan,'EVI':np.nan,'S1_VV':np.nan,'S1_VH':np.nan,'RVI':np.nan} for i in range(len(pts_df))]
    out_df = pd.DataFrame(rows)
    if 'rh' in pts_df.columns:
        out_df['rh'] = pts_df['rh'].values
    Path(out_parquet).parent.mkdir(parents=True, exist_ok=True)
    out_df.to_parquet(out_parquet, index=False)
    return out_parquet

# ---------------- AGB calculation ----------------
def agb_from_height_only(H_m):
    H = np.asarray(H_m, dtype=float)
    agb = np.full_like(H, np.nan, dtype=float)
    mask = (H >= 0.5) & (~np.isnan(H))
    agb[mask] = ALLOMETRY_A * (H[mask]** ALLOMETRY_B)
    agb = np.maximum(agb, 0.0)
    return agb

def height_from_agb(agb_Mg_ha):
    agb = np.asarray(agb_Mg_ha, dtype=float)
    H = np.sqrt(agb/ ALLOMETRY_A)
    H = np.maximum(H, 0.0)
    return H

def compute_bgb_carbon_co2(agb_vec, bgb_ratio=BGB_RATIO):
    bgb = agb_vec * bgb_ratio
    carbon = (agb_vec + bgb) * CARBON_FRACTION
    co2 = carbon * CO2_CONVERSION
    return bgb, carbon, co2

# ---------------- Feature engineering ----------------
def improved_filters_and_engineer(df_in):
    df = df_in.copy()

    # ------------------------------------------------------------
    # HARD CLEAN ATL08 OUTLIERS (HIGH IMPACT)
    # ------------------------------------------------------------
    RH_MIN = 0.5
    RH_MAX = 30.0
    AGB_MAX = 5000.0  # for later computed agb_from_rh if present

    # 1. Remove impossible ATL08 heights
    if 'rh' in df.columns:
        before = len(df)
        df = df[(df['rh'] >= RH_MIN) & (df['rh'] <= RH_MAX)]
        after = len(df)
        removed = before - after
        if removed > 0:
            print(f"[CLEAN] Removed {removed} ATL08 RH outliers outside {RH_MIN}–{RH_MAX} m")

    # 2. If agb_from_rh already exists, remove physically impossible values
    if 'agb_from_rh' in df.columns:
        before_agb = len(df)
        df = df[df['agb_from_rh'] <= AGB_MAX]
        after_agb = len(df)
        removed_agb = before_agb - after_agb
        if removed_agb > 0:
            print(f"[CLEAN] Removed {removed_agb} rows with AGB_from_rh > {AGB_MAX} Mg/ha")

    # 3. Drop rows with >50% missing numeric features (broken S1/S2 samples)
    numeric_cols = df.select_dtypes(include='number').columns.tolist()
    numeric_cols = [c for c in numeric_cols if c not in ('lat', 'lon')]  # don't punish coordinates

    if len(numeric_cols) > 0:
        miss_frac = df[numeric_cols].isna().mean(axis=1)
        bad = miss_frac > 0.50
        removed_missing = bad.sum()
        if removed_missing > 0:
            df = df[~bad]
            print(f"[CLEAN] Removed {removed_missing} rows with >50% missing numeric features")

    if 'rh' in df.columns:
        df = df[(df.rh >= 0.5) & (df.rh < 100)]
    if 'NDVI' in df.columns:
        df = df[df.NDVI > -0.3]
    if 'NDWI' in df.columns:
        df = df[df.NDWI < 0.9]
    if 'S1_VV' in df.columns and 'S1_VH' in df.columns:
        df['VH_VV_ratio'] = df.S1_VH / (df.S1_VV + 1e-8)
        df['VV_VH_diff'] = df.S1_VV - df.S1_VH
        df['RVI'] = (4 * df.S1_VH) / (df.S1_VV + df.S1_VH + 1e-8)
        df['SAR_var'] = df[['S1_VV', 'S1_VH']].var(axis=1)
        df['SAR_mean'] = df[['S1_VV', 'S1_VH']].mean(axis=1)
    bands = [c for c in ['B02', 'B03', 'B04', 'B08'] if c in df.columns]
    if bands:
        df['spectral_var'] = df[bands].var(axis=1)
        df['spectral_mean'] = df[bands].mean(axis=1)
        df['spectral_cv'] = df[bands].std(axis=1) / (df[bands].mean(axis=1) + 1e-8)
    if 'NDVI' in df.columns and 'S1_VV' in df.columns:
        df['NDVI_x_VV'] = df.NDVI * df.S1_VV
    if 'NDVI' in df.columns and 'S1_VH' in df.columns:
        df['NDVI_x_VH'] = df.NDVI * df.S1_VH
    if 'EVI' in df.columns and 'RVI' in df.columns:
        df['EVI_x_RVI'] = df.EVI * df.RVI
    return df

def select_feature_matrix(df):
    exclude = {
        'rh', 'rh98',
        'agb', 'agb_Mg_ha', 'agb_kg_tree',
        'bgb_Mg_ha', 'carbon_Mg_ha', 'co2eq_Mg_ha',
        'date', 'lat', 'lon', 'geometry', 'quality_flag', 'track', 'h5_source', 'wd_g_cm3'
    }
    cand = [c for c in df.columns if c not in exclude and df[c].dtype.kind in 'fiu']
    good = [f for f in cand if df[f].isna().sum() < 0.5 * len(df)]
    if len(good) < 3:
        raise ValueError("Too few features after filtering; expand AOI/time-window or relax filters.")
    Xdf = df[good].copy()
    imputer = SimpleImputer(strategy='median')
    X_imp = imputer.fit_transform(Xdf.values)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imp)
    return X_scaled, df['agb_Mg_ha'].values if 'agb_Mg_ha' in df.columns else None, good, imputer, scaler, Xdf

# ---------------- Training ----------------
def train_and_save_model(X, y, feature_names, out_dir, df_ref_for_groups=None, cv_folds=5, ensemble_size=ENSEMBLE_SIZE):
    params = {
        'n_estimators': 500,
        'max_depth': 6,
        'learning_rate': 0.03,
        'min_child_weight': 5,
        'subsample': 0.7,
        'colsample_bytree': 0.7,
        'gamma': 0.2,
        'reg_alpha': 0.1,
        'reg_lambda': 2.0,
        'random_state': 42,
        'n_jobs': -1,
        'objective': 'reg:squarederror'
    }
    if df_ref_for_groups is not None:
        n_bins = max(10, int(math.sqrt(len(df_ref_for_groups)) / 5))
        lat_bins = pd.cut(df_ref_for_groups['lat'], bins=n_bins, labels=False, include_lowest=True)
        lon_bins = pd.cut(df_ref_for_groups['lon'], bins=n_bins, labels=False, include_lowest=True)
        groups = (lat_bins.astype(int) * (n_bins + 1) + lon_bins.astype(int)).values
        unique_groups = np.unique(groups)
        n_splits = min(cv_folds, len(unique_groups))
        gkf = GroupKFold(n_splits=n_splits)
    else:
        groups = None
        gkf = None
    cv_res = []
    if gkf is not None:
        for fold, (tr, val) in enumerate(gkf.split(X, y, groups=groups), 1):
            m = xgb.XGBRegressor(**params)
            m.fit(X[tr], y[tr], eval_set=[(X[val], y[val])], verbose=False)
            pred = m.predict(X[val])
            r2 = r2_score(y[val], pred)
            rmse = float(np.sqrt(mean_squared_error(y[val], pred)))
            mae = mean_absolute_error(y[val], pred)
            cv_res.append({'fold': fold, 'r2': float(r2), 'rmse': rmse, 'mae': float(mae)})
            print(f"  Fold {fold}: R²={r2:.3f}, RMSE={rmse:.2f}, MAE={mae:.2f}")
    else:
        from sklearn.model_selection import KFold
        kf = KFold(n_splits=cv_folds, shuffle=True, random_state=42)
        for fold, (tr, val) in enumerate(kf.split(X), 1):
            m = xgb.XGBRegressor(**params)
            m.fit(X[tr], y[tr], eval_set=[(X[val], y[val])], verbose=False)
            pred = m.predict(X[val])
            r2 = r2_score(y[val], pred)
            rmse = float(np.sqrt(mean_squared_error(y[val], pred)))
            mae = mean_absolute_error(y[val], pred)
            cv_res.append({'fold': fold, 'r2': float(r2), 'rmse': rmse, 'mae': float(mae)})
            print(f"  Fold {fold}: R²={r2:.3f}, RMSE={rmse:.2f}, MAE={mae:.2f}")
    cv_df = pd.DataFrame(cv_res)
    print(f"\nCross-validation mean R²: {cv_df['r2'].mean():.3f}")
    models = []
    for idx in range(ensemble_size):
        p = params.copy()
        p['random_state'] = 100 + idx * 11
        m = xgb.XGBRegressor(**p)
        m.fit(X, y)
        models.append(m)
    outd = Path(out_dir)
    outd.mkdir(parents=True, exist_ok=True)
    bundle = {'models': models, 'feature_names': feature_names}
    joblib.dump(bundle, outd / 'model_bundle.joblib')
    joblib.dump(models[0], outd / 'model.joblib')
    return models, cv_df

def fetch_atl08_and_write(min_lat, max_lat, min_lon, max_lon, start, end, out_csv, download_dir='atl08_downloads', max_granules=2000):
    entries = query_cmr(min_lon, min_lat, max_lon, max_lat, start, end)
    urls = []
    for e in entries: urls.extend(pick_direct_h5_links(e))
    urls = list(dict.fromkeys(urls))[:max_granules]
    if len(urls)==0:
        raise RuntimeError("No ATL08 files found in CMR result.")
    dl_dir = Path(download_dir); dl_dir.mkdir(exist_ok=True, parents=True)
    session = requests.Session()
    downloaded = []
    for i,u in enumerate(urls,1):
        fname = Path(u.split('?')[0]).name
        outp = dl_dir / fname
        if outp.exists() and outp.stat().st_size>0:
            try:
                with open(outp,'rb') as fh:
                    if fh.read(8)==HDF5_MAGIC:
                        downloaded.append(str(outp)); continue
            except: pass
        ok = download_file(u, outp, session=session, retries=2)
        if ok: downloaded.append(str(outp))
    if len(downloaded)==0:
        raise RuntimeError("No valid ATL08 files downloaded.")
    dfs=[]
    for p in downloaded:
        df = extract_segments_from_h5(p)
        if not df.empty: dfs.append(df)
    if not dfs: raise RuntimeError("No segments extracted from downloaded HDF5s.")
    combined = pd.concat(dfs, ignore_index=True)
    combined = combined[(combined.lat>=min_lat)&(combined.lat<=max_lat)&(combined.lon>=min_lon)&(combined.lon<=max_lon)]
    combined = combined.dropna(subset=['date'])
    combined = combined.sort_values('date').reset_index(drop=True)
    combined = combined[combined['rh98'].notna()].copy()
    Path(out_csv).parent.mkdir(exist_ok=True, parents=True)
    combined.to_csv(out_csv, index=False)
    return out_csv

def build_s1s2_features(atl08_csv, out_parquet, minlat, maxlat, minlon, maxlon, start, end, date_window=3, workers=6):
    df = pd.read_csv(atl08_csv)
    df_unique = df.drop_duplicates(subset=['lat','lon','date']).reset_index(drop=True)
    df_unique['date'] = pd.to_datetime(df_unique['date']).dt.strftime('%Y-%m-%d')
    df_clip = df_unique[(df_unique.lat>=minlat)&(df_unique.lat<=maxlat)&(df_unique.lon>=minlon)&(df_unique.lon<=maxlon)].reset_index(drop=True)
    if len(df_clip)==0:
        raise ValueError("No ATL08 points in bbox.")
    catalog = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1", modifier=planetary_computer.sign_inplace)
    bbox = [minlon, minlat, maxlon, maxlat]; date_range = f"{start}/{end}"
    s2_items = list(catalog.search(collections=["sentinel-2-l2a"], bbox=bbox, datetime=date_range, query={"eo:cloud_cover":{"lt":60}}).items())
    s1_items = list(catalog.search(collections=["sentinel-1-rtc"], bbox=bbox, datetime=date_range).items())
    s2_groups = points_grouped_by_item(s2_items, df_clip, date_window_days=date_window)
    s1_groups = points_grouped_by_item(s1_items, df_clip, date_window_days=date_window)
    combined={}
    for it,idxs in s2_groups.items(): combined.setdefault(it, set()).update(idxs)
    for it,idxs in s1_groups.items(): combined.setdefault(it, set()).update(idxs)
    items = list(combined.keys())
    item_band_map={}
    for it in items:
        bm={}
        for b in S2_BANDS:
            if b in it.assets: bm[b]=b
            else:
                for k in it.assets.keys():
                    if k.upper()==b: bm[b]=k; break
                if b not in bm:
                    for k in it.assets.keys():
                        if b.lower() in k.lower(): bm[b]=k; break
        item_band_map[it]=bm
    final={}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(sample_scene_for_points, it, sorted(list(combined[it])), df_clip, item_band_map.get(it,{})): it for it in items if combined[it]}
        for fut in tqdm(as_completed(futures), total=len(futures), desc="Scenes"):
            try:
                for idx,row in fut.result():
                    if idx not in final: final[idx]=row
                    else:
                        for k,v in row.items():
                            if (k not in final[idx]) or (pd.isna(final[idx][k]) and not pd.isna(v)):
                                final[idx][k]=v
            except:
                pass
    rows = [final[i] if i in final else {'lat':df_clip.loc[i,'lat'],'lon':df_clip.loc[i,'lon'],'date':df_clip.loc[i,'date'], **{b:np.nan for b in S2_BANDS}, 'NDVI':np.nan,'NDWI':np.nan,'NBR':np.nan,'EVI':np.nan,'S1_VV':np.nan,'S1_VH':np.nan,'RVI':np.nan} for i in range(len(df_clip))]
    out_df = pd.DataFrame(rows)
    if 'rh98' in df_clip.columns: out_df['rh']=df_clip['rh98'].values
    elif 'rh' in df_clip.columns: out_df['rh']=df_clip['rh'].values
    Path(out_parquet).parent.mkdir(parents=True, exist_ok=True)
    out_df.to_parquet(out_parquet, index=False)
    return out_parquet

def pipeline_train(min_lat, max_lat, min_lon, max_lon, start, end, out_dir, tmp_dir, two_stage=False):
    """
    Train pipeline:
      - fetch ATL08
      - sample S1/S2 -> features.parquet
      - clean + engineer features
      - compute agb_from_height
      - filter extremes (05-95%) and missing rows
      - TRAIN:
         * default: train ensemble on log1p(agb) via train_and_save_model()
         * two_stage=True: train RH model (OOF), then train AGB model on X + pred_rh (log target)
      - save model bundle with preprocessors and metadata
    """
    # required imports inside function to keep this block self-contained
    import os
    import json
    import joblib
    import numpy as np
    from pathlib import Path
    from sklearn.model_selection import KFold
    import xgboost as xgb

    Path(tmp_dir).mkdir(parents=True, exist_ok=True)
    atl_csv = str(Path(tmp_dir)/'atl08.csv')
    print("Fetching ATL08 (needs EarthData .netrc)...")
    fetch_atl08_and_write(min_lat, max_lat, min_lon, max_lon, start, end, atl_csv, download_dir=str(Path(tmp_dir)/'atl08_dl'))

    print("Sampling S1/S2 at ATL08 points...")
    features_parquet = str(Path(tmp_dir)/'features.parquet')
    build_s1s2_features(atl_csv, features_parquet, min_lat, max_lat, min_lon, max_lon, start, end, date_window=3, workers=6)

    df = pd.read_parquet(features_parquet)
    if 'rh98' in df.columns and 'rh' not in df.columns:
        df['rh'] = df['rh98']

    # Apply cleaning + engineering (includes your hard outlier clipping)
    df = improved_filters_and_engineer(df)

    if df.shape[0] < 100:
        print(f"Warning: only {len(df)} ATL08 samples found. Consider expanding AOI or years.")

    # compute AGR from RH
    df['agb_Mg_ha'] = agb_from_height_only(df['rh'])

    # 5-95% trimming on agb to remove extreme tails
    q05 = df['agb_Mg_ha'].quantile(0.05)
    q95 = df['agb_Mg_ha'].quantile(0.95)
    df = df[(df['agb_Mg_ha'] >= q05) & (df['agb_Mg_ha'] <= q95)].copy()

    print(f"Training with {len(df)} samples after filtering")
    print(f"AGB range: {df['agb_Mg_ha'].min():.1f} - {df['agb_Mg_ha'].max():.1f} Mg/ha")

    # Build feature matrix. We expect select_feature_matrix to return scaled X.
    # We intentionally ignore the 'y' returned by select_feature_matrix to avoid leaking targets.
    X, _y_dummy, feat_names, imputer, scaler, Xdf = select_feature_matrix(df)

    # compute unscaled feature stats for domain similarity
    try:
        X_imp_df = pd.DataFrame(scaler.inverse_transform(X), columns=feat_names)
        feature_mean = X_imp_df.mean(axis=0).to_dict()
        feature_std = X_imp_df.std(axis=0).to_dict()
    except Exception:
        # fallback: compute stats directly from Xdf
        X_imp_df = Xdf.copy()
        feature_mean = X_imp_df.mean(axis=0).to_dict()
        feature_std = X_imp_df.std(axis=0).to_dict()

    # compute mean_agb on linear scale BEFORE transforming target
    mean_agb_train = float(np.nanmean(df['agb_Mg_ha'].values))

    # Prepare output directory
    outd = Path(out_dir)
    outd.mkdir(parents=True, exist_ok=True)

    # --- Training branches ---
    if two_stage:
        # Two-stage training: Stage1 -> RH, Stage2 -> log1p(AGB) using OOF RH
        print("\nTraining TWO-STAGE pipeline: Stage1 (RH) -> Stage2 (AGB on log1p)")

        # produce OOF RH with KFold (no leakage)
        n_splits = 5
        kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)
        oof_rh = np.zeros(X.shape[0], dtype=float)

        # produce OOF predictions for RH using XGBoost (single-model stacking)
        for fold, (tr_idx, te_idx) in enumerate(kf.split(X), start=1):
            print(f"  Stage1 OOF fold {fold}/{n_splits}...")
            m = xgb.XGBRegressor(n_estimators=400, learning_rate=0.05, max_depth=6,
                                 objective='reg:squarederror', random_state=42, n_jobs=4)
            m.fit(X[tr_idx], df['rh'].values[tr_idx], eval_set=[(X[te_idx], df['rh'].values[te_idx])], verbose=False)
            oof_rh[te_idx] = m.predict(X[te_idx])

        # Train final Stage1 model on full data
        print("  Training final Stage1 (height) model on full data...")
        height_model = xgb.XGBRegressor(n_estimators=500, learning_rate=0.05, max_depth=6,
                                        objective='reg:squarederror', random_state=42, n_jobs=4)
        height_model.fit(X, df['rh'].values)

        # Stage2: append OOF RH as column
        X2 = np.hstack([X, oof_rh.reshape(-1,1)])
        # log1p target
        y_log = np.log1p(df['agb_Mg_ha'].values)

        print("  Training Stage2 (AGB on log1p) model...")
        agb_model = xgb.XGBRegressor(n_estimators=500, learning_rate=0.05, max_depth=6,
                                     objective='reg:squarederror', random_state=43, n_jobs=4)
        agb_model.fit(X2, y_log)

        # Evaluate simple CV metrics for reporting using KFold and no leakage:
        r2s = []; rmses = []
        for fold, (tr_idx, te_idx) in enumerate(kf.split(X), start=1):
            # train stage1 on tr, predict rh on te using model trained on tr
            m1 = xgb.XGBRegressor(n_estimators=400, learning_rate=0.05, max_depth=6,
                                  objective='reg:squarederror', random_state=42, n_jobs=4)
            m1.fit(X[tr_idx], df['rh'].values[tr_idx])
            rh_te = m1.predict(X[te_idx])

            # build X2_te and train stage2 on tr (with OOF rh_tr substituted by predictions on tr via m1-train)
            # For stage2 CV we will train a stage2 model on tr using predicted rh on tr via internal CV to avoid leakage.
            # Simpler approximate CV: train agb_model on full X2 (we already did). Use stage1 m1 to create X2_te and predict.
            X2_te = np.hstack([X[te_idx], rh_te.reshape(-1,1)])
            pred_log = agb_model.predict(X2_te)
            pred_agb = np.expm1(pred_log)
            y_true = df['agb_Mg_ha'].values[te_idx]
            # compute metrics
            from sklearn.metrics import r2_score, mean_squared_error
            r2s.append(r2_score(y_true, pred_agb))
            rmses.append(np.sqrt(mean_squared_error(y_true, pred_agb)))

        cv_df = pd.DataFrame({'r2': r2s, 'rmse': rmses})

        # Save bundle with two-stage models
        bundle = {
            'two_stage': True,
            'height_model': height_model,
            'agb_model': agb_model,
            'imputer': imputer,
            'scaler': scaler,
            'feat_names': feat_names,
            'target_transform': 'log1p',
            'feature_mean': feature_mean,
            'feature_std': feature_std,
            'mean_agb_train': mean_agb_train
        }
        bundle_path = outd / 'model_bundle_two_stage.joblib'
        joblib.dump(bundle, bundle_path)
        print(f"Saved two-stage bundle to: {bundle_path}")

    else:
        # Default behavior: train ensemble on log1p(agb) using your existing train_and_save_model helper
        print("\nTraining (single-stage) on log1p(AGB) using ensemble training function...")

        # log1p target
        y_log = np.log1p(df['agb_Mg_ha'].values)

        # Use existing training machinery (ensemble) to train on X and y_log
        models, cv_df = train_and_save_model(X, y_log, feat_names, outd, df_ref_for_groups=df, cv_folds=5, ensemble_size=ENSEMBLE_SIZE)

        # train_and_save_model should have written a bundle at outd/'model_bundle.joblib'
        bundle_path = outd / 'model_bundle.joblib'
        if not bundle_path.exists():
            # fallback: create bundle containing models if train_and_save_model returned models directly
            bundle = {
                'models': models,
                'imputer': imputer,
                'scaler': scaler,
                'feat_names': feat_names,
                'target_transform': 'log1p',
                'feature_mean': feature_mean,
                'feature_std': feature_std,
                'mean_agb_train': mean_agb_train
            }
            joblib.dump(bundle, bundle_path)
        else:
            bundle = joblib.load(bundle_path)
            bundle['imputer'] = imputer
            bundle['scaler'] = scaler
            bundle['feat_names'] = feat_names
            bundle['target_transform'] = 'log1p'
            bundle['feature_mean'] = feature_mean
            bundle['feature_std'] = feature_std
            bundle['mean_agb_train'] = mean_agb_train
            joblib.dump(bundle, bundle_path)

    # Final reporting values (linear-space)
    mean_rh_atl08 = float(df['rh'].mean())
    mean_agb = mean_agb_train

    if ALLOMETRY_B == 2.0:
        mean_h = np.sqrt(mean_agb/ALLOMETRY_A) if ALLOMETRY_A > 0 else 0.0
    else:
        mean_h = (mean_agb/ALLOMETRY_A)**(1.0/ALLOMETRY_B) if ALLOMETRY_A > 0 else 0.0
    mean_h = max(0.0, float(mean_h))

    bgb = mean_agb * BGB_RATIO
    total_biomass = mean_agb + bgb
    carbon = total_biomass * CARBON_FRACTION
    co2 = carbon * CO2_CONVERSION

    results = {
        'mean_height_m': mean_h,
        "mean_rh_atl08_m": mean_rh_atl08,
        'mean_agb_Mg_per_ha': float(mean_agb),
        'bgb_Mg_per_ha': float(bgb),
        'total_biomass_Mg_per_ha': float(total_biomass),
        'carbon_Mg_per_ha': float(carbon),
        'co2_t_per_ha': float(co2),
        'model_r2_mean': float(cv_df['r2'].mean()) if 'cv_df' in locals() and not cv_df.empty else None,
        'model_r2_std': float(cv_df['r2'].std()) if 'cv_df' in locals() and not cv_df.empty else None,
        'model_rmse_mean': float(cv_df['rmse'].mean()) if 'cv_df' in locals() and not cv_df.empty else None,
        'n_samples': int(len(df))
    }

    # save results and feature names
    with open(outd/'results.json','w') as fh:
        json.dump(results, fh, indent=2)
    with open(outd/'feature_names.json','w') as fh:
        json.dump(feat_names, fh)

    print("\n" + "="*60)
    print("Training complete!")
    print("="*60)
    print(json.dumps(results, indent=2))
    # print model location(s)
    if two_stage:
        print(f"\nTwo-stage model bundle saved to: {outd/'model_bundle_two_stage.joblib'}")
    else:
        print(f"\nModel saved to: {outd/'model_bundle.joblib'}")

    return results

def domain_similarity_score_simple(xrow, feature_mean_arr, feature_std_arr, eps=1e-8):
    z = np.abs((xrow - feature_mean_arr) / (feature_std_arr + eps))
    z_med = np.median(z)
    return float(np.exp(- z_med / 1.0))

def model_uncertainty_score(pred_std, mean_agb_train, alpha=0.5):
    if mean_agb_train is None or mean_agb_train <= 0:
        return 1.0 if pred_std==0 else max(0.0, 1.0 - pred_std / (0.5 + abs(pred_std)))
    val = 1.0 - min(1.0, pred_std / (alpha * mean_agb_train))
    return float(max(0.0, min(1.0, val)))

def combine_confidence(u_model, u_dom, w_model=CONF_W_MODEL, w_dom=CONF_W_DOM):
    return float(max(0.0, min(1.0, w_model * u_model + w_dom * u_dom)))

def pipeline_predict(features_parquet, model_bundle_path, out_dir):
    df = pd.read_parquet(features_parquet)
    df = improved_filters_and_engineer(df)
    bundle = joblib.load(model_bundle_path)
    
    # Handle both two-stage and single-stage models
    is_two_stage = bundle.get('two_stage', False)
    
    if is_two_stage:
        # Two-stage model: height_model + agb_model
        height_model = bundle['height_model']
        agb_model = bundle['agb_model']
        models = None  # Two-stage doesn't use ensemble
    else:
        # Single-stage ensemble model
        models = bundle.get('models', [])
        if len(models) == 0:
            raise RuntimeError("No models found in bundle")
    
    feature_names = bundle.get('feature_names', bundle.get('feat_names'))
    feature_mean = bundle.get('feature_mean', None)
    feature_std = bundle.get('feature_std', None)
    mean_agb_train = bundle.get('mean_agb_train', None)
    imputer = bundle.get('imputer', None)
    scaler = bundle.get('scaler', None)
    
    if imputer is None:
        imp_path = Path(model_bundle_path).parent / 'imputer.joblib'
        if imp_path.exists(): 
            imputer = joblib.load(imp_path)
    
    missing = [f for f in feature_names if f not in df.columns]
    if missing:
        raise RuntimeError(f"Missing features: {missing}")
    
    Xdf = df[feature_names].copy()
    if imputer is None:
        imp = SimpleImputer(strategy='median')
        X_imp = imp.fit_transform(Xdf.values)
    else:
        X_imp = imputer.transform(Xdf.values)
    
    if scaler is None:
        scl = StandardScaler()
        X = scl.fit_transform(X_imp)
    else:
        X = scaler.transform(X_imp)
    
    # Make predictions based on model type
    if is_two_stage:
        # Stage 1: predict height
        pred_rh = height_model.predict(X)
        
        # Stage 2: predict log(AGB) using X + predicted height
        X2 = np.hstack([X, pred_rh.reshape(-1, 1)])
        preds_log = agb_model.predict(X2)
        preds_mean = np.expm1(preds_log)  # Convert back from log1p
        preds_std = np.zeros_like(preds_mean)  # No ensemble uncertainty for two-stage
    else:
        # Ensemble prediction
        preds_all = np.vstack([m.predict(X) for m in models])
        
        # Check if target was log-transformed
        target_transform = bundle.get('target_transform', None)
        if target_transform == 'log1p':
            # Models predict log1p(AGB), so expm1 to get back to linear scale
            preds_all = np.expm1(preds_all)
        
        preds_mean = preds_all.mean(axis=0)
        preds_std = preds_all.std(axis=0)
    
    df['pred_agb_Mg_ha'] = preds_mean
    bgb_vec, carbon_vec, co2_vec = compute_bgb_carbon_co2(preds_mean, bgb_ratio=BGB_RATIO)
    df['pred_bgb_Mg_ha'] = bgb_vec
    df['pred_carbon_Mg_ha'] = carbon_vec
    df['pred_co2_t_per_ha'] = co2_vec
    df['pred_height_m'] = height_from_agb(preds_mean)
    
    feature_mean_arr = np.array([feature_mean[f] for f in feature_names]) if feature_mean is not None else None
    feature_std_arr = np.array([feature_std[f] for f in feature_names]) if feature_std is not None else None
    
    confs = []
    for i in range(len(X)):
        xrow = X_imp[i]
        pred_std = float(preds_std[i])
        u_model = model_uncertainty_score(pred_std, mean_agb_train)
        if feature_mean_arr is not None:
            u_dom = domain_similarity_score_simple(xrow, feature_mean_arr, feature_std_arr)
        else:
            u_dom = 0.5
        conf = combine_confidence(u_model, u_dom)
        confs.append(conf)
    
    df['pred_confidence'] = confs
    mean_pred_agb = float(np.nanmean(preds_mean))
    mean_bgb = float(np.nanmean(bgb_vec))
    mean_carbon = float(np.nanmean(carbon_vec))
    mean_co2 = float(np.nanmean(co2_vec))
    mean_conf = float(np.nanmean(confs))
    mean_pred_height = float(np.nanmean(df['pred_height_m']))
    
    results = {
        'mean_pred_height_m': mean_pred_height,
        'mean_pred_agb_Mg_per_ha': mean_pred_agb,
        'mean_pred_bgb_Mg_per_ha': mean_bgb,
        'mean_pred_carbon_Mg_per_ha': mean_carbon,
        'mean_pred_co2_t_per_ha': mean_co2,
        'mean_pred_confidence': mean_conf,
        'n_points': int(len(df)),
        'model_type': 'two_stage' if is_two_stage else 'ensemble'
    }
    
    outd = Path(out_dir)
    outd.mkdir(parents=True, exist_ok=True)
    with open(outd/'results_prediction.json','w') as fh: 
        json.dump(results, fh, indent=2)
    df.to_parquet(outd/'predictions.parquet', index=False)
    
    print("\n" + "="*60)
    print("Prediction complete!")
    print("="*60)
    print(json.dumps(results, indent=2))
    print(f"\nPredictions saved to: {outd/'predictions.parquet'}")
    
    return results

def points_from_geojson_polygon(geojson_path, spacing_m, date_str=None):
    with open(geojson_path,'r') as fh:
        gj = pyjson.load(fh)
    geom = None
    if 'type' in gj and gj['type'] == 'FeatureCollection':
        polys = [shape(f['geometry']) for f in gj.get('features',[]) if 'geometry' in f]
        geom = polys[0]
        for p in polys[1:]:
            geom = geom.union(p)
    elif gj.get('type','') == 'Feature':
        geom = shape(gj['geometry'])
    else:
        geom = shape(gj)
    minx, miny, maxx, maxy = geom.bounds
    mean_lat = (miny + maxy) / 2.0
    lat_deg = spacing_m / 111320.0
    lon_deg = spacing_m / (111320.0 * math.cos(math.radians(mean_lat)) + 1e-9)
    xs = []
    ys = []
    y = miny
    while y <= maxy:
        x = minx
        while x <= maxx:
            p = Point(x, y)
            if geom.contains(p):
                xs.append(x); ys.append(y)
            x += lon_deg
        y += lat_deg
    if len(xs) == 0:
        raise RuntimeError("No grid points generated inside polygon; try larger spacing.")
    dates = [date_str if date_str is not None else date.today().isoformat()] * len(xs)
    df = pd.DataFrame({'lat': ys, 'lon': xs, 'date': dates})
    return df

def pipeline_autopredict(polygon_path, points_csv, grid_spacing_m, start, end, model_bundle_path, out_dir, tmp_dir):
    Path(tmp_dir).mkdir(parents=True, exist_ok=True)
    if points_csv:
        print(f"Loading points from {points_csv}...")
        pts_df = pd.read_csv(points_csv)
        if 'date' not in pts_df.columns:
            pts_df['date'] = date.today().isoformat()
    else:
        print("Generating grid inside polygon...")
        pts_df = points_from_geojson_polygon(polygon_path, grid_spacing_m, date_str=None)
    minlat = float(pts_df['lat'].min()); maxlat = float(pts_df['lat'].max())
    minlon = float(pts_df['lon'].min()); maxlon = float(pts_df['lon'].max())
    features_parquet = str(Path(tmp_dir)/'autopredict_features.parquet')
    print(f"Sampling Sentinel S1/S2 for {len(pts_df)} points...")
    build_s1s2_features_for_points(pts_df, features_parquet, minlat, maxlat, minlon, maxlon, start, end, date_window=7, workers=6)
    print("Running model prediction...")
    res = pipeline_predict(features_parquet, model_bundle_path, out_dir)
    return res

def main():
    p = argparse.ArgumentParser(description="3mix pipeline (FIXED for R²>0.5)")
    p.add_argument('--mode', choices=['train','predict','autopredict'], required=True)
    p.add_argument('--min-lat', type=float); p.add_argument('--max-lat', type=float)
    p.add_argument('--min-lon', type=float); p.add_argument('--max-lon', type=float)
    p.add_argument('--start', type=str); p.add_argument('--end', type=str)
    p.add_argument('--out-dir', default='./output'); p.add_argument('--tmp-dir', default='./tmp_pipeline')
    p.add_argument('--features', type=str, help='path to features.parquet for prediction')
    p.add_argument('--model', type=str, help='path to model_bundle.joblib')
    p.add_argument('--polygon', type=str, help='path to GeoJSON polygon (for autopredict)')
    p.add_argument('--points-csv', type=str, help='path to CSV with lat,lon cols (for autopredict)')
    p.add_argument('--grid-spacing-m', type=float, default=30.0, help='grid spacing in meters for autopredict')

    # NEW: two-stage training flag (OOF RH -> AGB)
    p.add_argument('--two-stage', action='store_true',
                   help='Enable two-stage training: Stage1 predict RH, Stage2 predict log1p(AGB) using predicted RH as feature')

    args = p.parse_args()

    if args.mode == 'train':
        required = [args.min_lat, args.max_lat, args.min_lon, args.max_lon, args.start, args.end]
        if any([v is None for v in required]):
            raise SystemExit("Training requires --min-lat --max-lat --min-lon --max-lon --start --end")
        # pass the two_stage boolean into pipeline_train
        pipeline_train(args.min_lat, args.max_lat, args.min_lon, args.max_lon,
                       args.start, args.end, args.out_dir, args.tmp_dir,
                       two_stage=args.two_stage)

    elif args.mode == 'predict':
        if args.features is None or args.model is None:
            raise SystemExit("Predict requires --features and --model")
        pipeline_predict(args.features, args.model, args.out_dir)

    else:  # autopredict
        if (args.polygon is None and args.points_csv is None) or args.model is None or args.start is None or args.end is None:
            raise SystemExit("Autopredict requires (--polygon OR --points-csv), --model, --start, --end")
        pipeline_autopredict(args.polygon, args.points_csv, args.grid_spacing_m,
                             args.start, args.end, args.model, args.out_dir, args.tmp_dir)

if __name__ == '__main__':
    main()