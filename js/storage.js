/* storage.js
 * Lapisan penyimpanan: semua urusan simpan/ambil data ada di sini,
 * app.js cukup memanggil objek `store`.
 *
 *   store.mode                      -> 'firebase', 'supabase', atau 'local' (browser saja)
 *   store.subscribe(fn)             -> (opsional, Firebase) dipanggil tiap ada perubahan data
 *   store.imageOptions              -> (opsional) { maxSide, quality } untuk kompresi foto
 *   store.loadAll()                 -> { status: {idTask: true/false}, photos: {idTask: [foto]} }
 *   store.addPhoto(idTask, blob)    -> foto baru { id, url, path }
 *   store.deletePhoto(idTask, foto) -> hapus foto
 *   store.setDone(idTask, true)     -> simpan status centang
 *
 * Bentuk satu foto: { id, url, path? }
 */

function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    // Cadangan: format UUID v4 yang valid (kolom id di database bertipe uuid)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
        const r = Math.random() * 16 | 0;
        return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/* =====================================================================
 * MODE CLOUD  (Supabase: tabel + Storage) -> dibagi ke semua perangkat
 * ===================================================================== */
function createCloudStore(cfg) {
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const bucket = cfg.BUCKET || 'evidence';
    const publicUrl = path => sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;

    return {
        mode: 'supabase',

        async loadAll() {
            const [st, ph] = await Promise.all([
                sb.from('task_status').select('task_id, done'),
                sb.from('task_photos').select('id, task_id, path, created_at').order('created_at', { ascending: true })
            ]);
            if (st.error) throw st.error;
            if (ph.error) throw ph.error;

            const status = {};
            st.data.forEach(r => { status[r.task_id] = r.done; });

            const photos = {};
            ph.data.forEach(r => {
                (photos[r.task_id] = photos[r.task_id] || []).push({ id: r.id, path: r.path, url: publicUrl(r.path) });
            });
            return { status, photos };
        },

        async addPhoto(taskId, blob) {
            const id = uid();
            const path = `${taskId}/${id}.jpg`;

            const up = await sb.storage.from(bucket).upload(path, blob, {
                contentType: 'image/jpeg', cacheControl: '31536000', upsert: false
            });
            if (up.error) throw up.error;

            const ins = await sb.from('task_photos').insert({ id, task_id: taskId, path });
            if (ins.error) {
                // Batal: bersihkan file yang sudah terlanjur terunggah
                await sb.storage.from(bucket).remove([path]);
                throw ins.error;
            }
            return { id, path, url: publicUrl(path) };
        },

        async deletePhoto(taskId, photo) {
            const del = await sb.from('task_photos').delete().eq('id', photo.id);
            if (del.error) throw del.error;
            // File di Storage dihapus juga (kalau gagal, data tabel sudah bersih, jadi aman diabaikan)
            await sb.storage.from(bucket).remove([photo.path]);
        },

        async setDone(taskId, done) {
            const { error } = await sb.from('task_status').upsert({
                task_id: taskId, done, updated_at: new Date().toISOString()
            });
            if (error) throw error;
        }
    };
}

/* =====================================================================
 * MODE FIREBASE  (Firestore + Storage) -> dibagi ke semua perangkat, realtime
 *
 * Koleksi yang dipakai (sengaja diberi awalan "dashboard_" supaya tidak
 * bentrok dengan data aplikasi lain di project Firebase yang sama):
 *   dashboard_status/{idTask}   { done, updatedAt }
 *   dashboard_photos/{idFoto}   { taskId, createdAt, url, path }        (foto di Storage)
 *                               { taskId, createdAt, data }             (foto di Firestore)
 * ===================================================================== */
function readBlobAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(new Error('Gagal membaca foto'));
        r.readAsDataURL(blob);
    });
}

function createFirebaseStore(cfg) {
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg.FIREBASE);
    const db = firebase.firestore(app);
    const useStorage = (cfg.PHOTO_STORAGE || 'storage') !== 'firestore';
    const COL_STATUS = 'dashboard_status';
    const COL_PHOTOS = 'dashboard_photos';

    // Salinan data terbaru dari listener realtime (loadAll() membaca dari sini, tanpa biaya baca ulang)
    const state = { status: {}, photos: {} };
    const got = { status: false, photos: false };
    const listeners = [];
    let failure = null;
    let resolveReady, rejectReady;
    const ready = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });
    ready.catch(() => { });   // error tetap sampai ke pemanggil loadAll()

    function notify() {
        if (!(got.status && got.photos)) return;
        resolveReady();
        listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    }
    function fail(err) {
        failure = err;
        rejectReady(err);
        listeners.forEach(fn => { try { fn(); } catch (e) { } });
    }

    db.collection(COL_STATUS).onSnapshot(snap => {
        const s = {};
        snap.forEach(d => { s[d.id] = !!d.data().done; });
        state.status = s; got.status = true; failure = null;
        notify();
    }, fail);

    db.collection(COL_PHOTOS).orderBy('createdAt').onSnapshot(snap => {
        const p = {};
        snap.forEach(d => {
            const x = d.data();
            (p[x.taskId] = p[x.taskId] || []).push({ id: d.id, path: x.path, url: x.url || x.data });
        });
        state.photos = p; got.photos = true; failure = null;
        notify();
    }, fail);

    return {
        mode: 'firebase',

        // Bila foto disimpan di Firestore (tanpa Storage), perkecil lagi supaya muat di dokumen (maks 1 MB)
        imageOptions: useStorage ? undefined : { maxSide: 900, quality: 0.6 },

        // app.js memanggil fungsi ini tiap ada perubahan dari perangkat mana pun
        subscribe(fn) { listeners.push(fn); },

        async loadAll() {
            await ready;
            if (failure) throw failure;
            const photos = {};
            Object.keys(state.photos).forEach(k => { photos[k] = state.photos[k].slice(); });
            return { status: Object.assign({}, state.status), photos };
        },

        async addPhoto(taskId, blob) {
            const id = uid();
            const createdAt = Date.now();

            if (useStorage) {
                const path = `dashboard-evidence/${taskId}/${id}.jpg`;
                const ref = firebase.storage().ref(path);
                await ref.put(blob, { contentType: 'image/jpeg', cacheControl: 'public,max-age=31536000' });
                const url = await ref.getDownloadURL();
                try {
                    await db.collection(COL_PHOTOS).doc(id).set({ taskId, path, url, createdAt });
                } catch (e) {
                    await ref.delete().catch(() => { });   // batal: bersihkan file yang sudah terlanjur terunggah
                    throw e;
                }
                return { id, path, url };
            }

            const data = await readBlobAsDataUrl(blob);
            if (data.length > 900000) throw new Error('Foto terlalu besar untuk disimpan, coba foto lain');
            await db.collection(COL_PHOTOS).doc(id).set({ taskId, data, createdAt });
            return { id, url: data };
        },

        async deletePhoto(taskId, photo) {
            await db.collection(COL_PHOTOS).doc(photo.id).delete();
            if (useStorage && photo.path) {
                await firebase.storage().ref(photo.path).delete().catch(() => { });
            }
        },

        async setDone(taskId, done) {
            await db.collection(COL_STATUS).doc(taskId).set({ done, updatedAt: Date.now() });
        }
    };
}

/* =====================================================================
 * MODE LOKAL  (cadangan bila cloud belum diisi) -> hanya di browser ini
 * ===================================================================== */
function createLocalStore() {
    let db = null;
    const cache = {};   // { idTask: [foto] }
    const STATUS_KEY = 'erafone-barombong-status';

    function openDB() {
        return new Promise(resolve => {
            if (db) return resolve(db);
            try {
                const req = indexedDB.open('erafone-barombong-evidence', 1);
                req.onupgradeneeded = () => req.result.createObjectStore('photos');
                req.onsuccess = () => { db = req.result; resolve(db); };
                req.onerror = () => resolve(null);
            } catch (e) { resolve(null); }
        });
    }

    function persist(taskId) {
        if (!db) return;
        try {
            const os = db.transaction('photos', 'readwrite').objectStore('photos');
            if (cache[taskId] && cache[taskId].length) os.put(cache[taskId], taskId);
            else os.delete(taskId);
        } catch (e) { }
    }

    function readStatus() {
        try { return JSON.parse(localStorage.getItem(STATUS_KEY) || '{}'); } catch (e) { return {}; }
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => reject(new Error('Gagal membaca foto'));
            r.readAsDataURL(blob);
        });
    }

    return {
        mode: 'local',

        async loadAll() {
            await openDB();
            if (db && !Object.keys(cache).length) {
                await new Promise(resolve => {
                    try {
                        const req = db.transaction('photos').objectStore('photos').openCursor();
                        req.onsuccess = () => {
                            const c = req.result;
                            if (c) { cache[c.key] = c.value; c.continue(); } else resolve();
                        };
                        req.onerror = () => resolve();
                    } catch (e) { resolve(); }
                });
            }
            return { status: readStatus(), photos: JSON.parse(JSON.stringify(cache)) };
        },

        async addPhoto(taskId, blob) {
            await openDB();
            const photo = { id: uid(), url: await blobToDataUrl(blob) };
            (cache[taskId] = cache[taskId] || []).push(photo);
            persist(taskId);
            return photo;
        },

        async deletePhoto(taskId, photo) {
            cache[taskId] = (cache[taskId] || []).filter(p => p.id !== photo.id);
            persist(taskId);
        },

        async setDone(taskId, done) {
            const s = readStatus();
            s[taskId] = done;
            try { localStorage.setItem(STATUS_KEY, JSON.stringify(s)); } catch (e) { }
        }
    };
}

/* =====================================================================
 * Pilih mode otomatis berdasarkan js/config.js
 * ===================================================================== */
const store = (function () {
    const cfg = window.APP_CONFIG || {};
    const filled = v => !!v && !/GANTI/i.test(String(v));
    const want = cfg.BACKEND || 'firebase';

    try {
        if (want === 'firebase') {
            const fb = cfg.FIREBASE || {};
            if (filled(fb.apiKey) && filled(fb.projectId) && filled(fb.appId) && window.firebase && firebase.firestore) {
                return createFirebaseStore(cfg);
            }
        } else if (want === 'supabase') {
            if (filled(cfg.SUPABASE_URL) && filled(cfg.SUPABASE_ANON_KEY) && window.supabase && window.supabase.createClient) {
                return createCloudStore(cfg);
            }
        }
    } catch (e) {
        console.error('Backend "' + want + '" gagal diinisialisasi:', e);
    }
    return createLocalStore();
})();
