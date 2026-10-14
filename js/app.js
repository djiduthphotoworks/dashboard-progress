/* app.js
 * Logika tampilan dashboard: grafik Kurva-S, tabel ceklis, upload foto bukti,
 * tema gelap/terang. Data ada di data.js, penyimpanan ada di storage.js.
 */

lucide.createIcons();

const root = document.documentElement;
const MAX_PHOTOS = 5;

const photos = {};            // { idTask: [ { id, url, path? } ] }
const uploading = new Set();  // idTask yang sedang mengunggah foto
let currentFilter = 'all';
let lastSyncSignature = null;

/* =====================================================================
 * Grafik Kurva-S (Chart.js)
 * ===================================================================== */
const ctx = document.getElementById('scurveChart').getContext('2d');
const scurveChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['Start (H-0)', 'Minggu 1 (H-7)', 'Minggu 2 (H-14)', 'Minggu 3 (H-21)', 'Minggu 4 (H-30)'],
        datasets: [
            {
                label: 'Target Rencana (%)',
                data: [0, 17.0, 35.0, 60.0, 100.0],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#2563eb',
                pointRadius: 5
            },
            {
                label: 'Realisasi Live (%)',
                data: [0, 0, 0, 0, 0],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3.5,
                borderDash: [5, 5],
                fill: false,
                tension: 0.35,
                pointBackgroundColor: '#10b981',
                pointRadius: 6
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: {
                min: 0, max: 100,
                ticks: { callback: v => v + '%', color: '#64748b' },
                grid: { color: '#f1f5f9' }
            },
            x: { grid: { display: false }, ticks: { color: '#64748b' } }
        }
    }
});

// Sesuaikan warna grafik dengan tema aktif
function applyChartTheme() {
    const dark = root.classList.contains('dark');
    const tick = dark ? '#94a3b8' : '#64748b';
    scurveChart.options.scales.y.ticks.color = tick;
    scurveChart.options.scales.x.ticks.color = tick;
    scurveChart.options.scales.y.grid.color = dark ? '#1e293b' : '#f1f5f9';
    scurveChart.data.datasets[0].borderColor = dark ? '#60a5fa' : '#2563eb';
    scurveChart.data.datasets[0].pointBackgroundColor = dark ? '#60a5fa' : '#2563eb';
    scurveChart.data.datasets[0].backgroundColor = dark ? 'rgba(96, 165, 250, 0.12)' : 'rgba(37, 99, 235, 0.08)';
    scurveChart.update('none');
}

/* =====================================================================
 * Tema gelap / terang
 * ===================================================================== */
function toggleTheme() {
    const next = root.classList.contains('dark') ? 'light' : 'dark';
    root.classList.toggle('dark', next === 'dark');
    try { localStorage.setItem('theme', next); } catch (e) { }
    applyChartTheme();
}

// Ikuti pengaturan sistem selama user belum memilih manual
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (err) { }
    if (!saved) {
        root.classList.toggle('dark', e.matches);
        applyChartTheme();
    }
});

// Saat cetak, selalu pakai tampilan terang (hemat tinta & tetap terbaca)
let wasDark = false;
window.addEventListener('beforeprint', () => {
    wasDark = root.classList.contains('dark');
    if (wasDark) { root.classList.remove('dark'); applyChartTheme(); }
});
window.addEventListener('afterprint', () => {
    if (wasDark) { root.classList.add('dark'); applyChartTheme(); }
});

/* =====================================================================
 * Notifikasi kecil (toast) & banner status penyimpanan
 * ===================================================================== */
let toastTimer;
function showToast(msg, ms = 3200) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

function errMsg(e) {
    return (e && (e.message || e.error_description)) ? (e.message || e.error_description) : String(e);
}

const BANNER_STYLE = {
    warn: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
    error: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300'
};
function setBanner(kind, msg) {
    const el = document.getElementById('mode-banner');
    if (!el) return;
    if (!kind) { el.classList.add('hidden'); el.textContent = ''; return; }
    el.className = 'no-print rounded-xl border px-4 py-3 text-xs font-semibold ' + BANNER_STYLE[kind];
    el.textContent = msg;
}

/* =====================================================================
 * Metrik dashboard (progress total, bar kategori, Kurva-S)
 * ===================================================================== */
function updateDashboardMetrics() {
    let totalProgress = 0;
    let completedCount = 0;
    const categorySums = { 'MEP': 0, 'SIPIL': 0, 'FURNITURE': 0, 'STRUKTUR': 0, 'BRANDING': 0, 'HVAC': 0 };

    taskData.forEach(task => {
        if (task.done) {
            totalProgress += task.weight;
            completedCount++;
            if (categorySums.hasOwnProperty(task.cat)) categorySums[task.cat] += task.weight;
        }
    });

    totalProgress = Math.round(totalProgress * 10) / 10;

    document.getElementById('stat-progress').innerText = totalProgress.toFixed(1).replace('.', ',') + '%';
    document.getElementById('stat-completed-count').innerText = completedCount;
    document.getElementById('stat-remaining').innerText = (taskData.length - completedCount) + ' Task';

    for (const [catKey, maxTarget] of Object.entries(categoryTargets)) {
        const currentVal = categorySums[catKey] || 0;
        const percentFilled = (currentVal / maxTarget) * 100;
        const valElem = document.getElementById(`cat-val-${catKey}`);
        const barElem = document.getElementById(`cat-bar-${catKey}`);
        if (valElem) valElem.innerText = currentVal.toFixed(1).replace('.', ',') + '%';
        if (barElem) barElem.style.width = Math.min(percentFilled, 100).toFixed(1) + '%';
    }

    const weekSum = w => taskData.filter(t => t.week === w && t.done).reduce((a, t) => a + t.weight, 0);
    const cumW1 = weekSum('W1');
    const cumW2 = cumW1 + weekSum('W2');
    const cumW3 = cumW2 + weekSum('W3');
    const cumW4 = cumW3 + weekSum('W4');

    scurveChart.data.datasets[1].data = [0, cumW1, cumW2, cumW3, cumW4];
    scurveChart.update();
}

function refreshUI() {
    updateDashboardMetrics();
    renderTable(currentFilter);
}

/* =====================================================================
 * Tabel ceklis
 * ===================================================================== */
function hasPhotos(id) {
    return !!(photos[id] && photos[id].length);
}

function photoCellHTML(task) {
    const list = photos[task.id] || [];
    const isUploading = uploading.has(task.id);

    const thumbs = list.map((p, i) =>
        `<button type="button" class="photo-thumb" onclick="openLightbox('${task.id}', ${i})" aria-label="Lihat foto ${i + 1} item ${task.id}"><img src="${p.url}" loading="lazy" alt="Bukti ${task.id} foto ${i + 1}"></button>`
    ).join('');

    let action;
    if (isUploading) {
        action = `<span class="no-print text-[11px] font-semibold text-blue-600 dark:text-blue-400 animate-pulse">Mengunggah…</span>`;
    } else if (list.length >= MAX_PHOTOS) {
        action = `<span class="no-print text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Maksimal tercapai</span>`;
    } else {
        action = `<label class="no-print inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition">
                    <i data-lucide="camera" class="w-3.5 h-3.5"></i> Upload
                    <input type="file" accept="image/*" multiple class="hidden" onchange="handlePhotoInput('${task.id}', this)">
                  </label>`;
    }

    const hint = (list.length || isUploading) ? '' : (task.done
        ? `<span class="no-print text-[11px] font-medium text-amber-600 dark:text-amber-400">Belum ada bukti foto</span>`
        : `<span class="no-print text-[11px] text-slate-400">Upload foto agar bisa dicentang</span>`);

    return `<div class="flex flex-col gap-1.5">
                ${list.length ? `<div class="flex flex-wrap gap-1.5">${thumbs}</div>` : ''}
                <div class="flex items-center gap-2">${action}<span class="no-print text-[11px] text-slate-400">${list.length}/${MAX_PHOTOS}</span>${hint}</div>
            </div>`;
}

function renderTable(filter = 'all') {
    const tbody = document.getElementById('checklistTableBody');
    tbody.innerHTML = '';
    const filteredData = filter === 'all' ? taskData : taskData.filter(t => t.week === filter);

    filteredData.forEach(task => {
        const checkTitle = task.done
            ? 'Klik untuk membatalkan centang'
            : (hasPhotos(task.id) ? 'Tandai selesai' : 'Upload foto bukti dulu untuk bisa mencentang');

        const tr = document.createElement('tr');
        tr.className = `hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${task.done ? 'bg-emerald-50/40 dark:bg-emerald-500/10' : ''}`;
        tr.innerHTML = `
            <td class="py-3 px-4 text-center">
                <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask('${task.id}')" title="${checkTitle}" class="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-emerald-500 cursor-pointer">
            </td>
            <td class="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">${task.id} <span class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${task.week}</span></td>
            <td class="py-3 px-4 font-medium ${task.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}">${task.title}</td>
            <td class="py-3 px-4 text-center font-semibold text-slate-500 dark:text-slate-400">${task.cat}</td>
            <td class="py-3 px-4 text-center font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">${task.days}</td>
            <td class="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">${task.weight.toFixed(1).replace('.', ',')}%</td>
            <td class="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">${task.vol}</td>
            <td class="py-3 px-4 text-center text-slate-500 dark:text-slate-400">${task.unit}</td>
            <td class="py-3 px-4 text-slate-500 dark:text-slate-400 italic">${task.note}</td>
            <td class="py-3 px-4 align-middle">${photoCellHTML(task)}</td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function filterWeek(week, btn) {
    currentFilter = week;
    document.querySelectorAll('.week-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderTable(week);
}

// Centang / batal centang. Mencentang WAJIB sudah punya minimal 1 foto bukti.
async function toggleTask(id) {
    const task = taskData.find(t => t.id === id);
    if (!task) return;

    const next = !task.done;
    if (next && !hasPhotos(id)) {
        renderTable(currentFilter); // kembalikan checkbox ke kondisi semula
        showToast('Upload minimal 1 foto bukti dulu sebelum item ' + id + ' dicentang.');
        return;
    }

    task.done = next;
    refreshUI();
    try {
        await store.setDone(id, next);
    } catch (e) {
        task.done = !next;   // gagal tersimpan -> kembalikan
        refreshUI();
        showToast('Gagal menyimpan status: ' + errMsg(e), 5000);
    }
}

/* =====================================================================
 * Upload foto bukti
 * ===================================================================== */

// Kecilkan foto (maks. 1280px, JPEG) supaya ringan disimpan & dibuka
function compressToBlob(file, maxSide = 1280, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const g = c.getContext('2d');
            g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
            g.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            c.toBlob(b => b ? resolve(b) : reject(new Error('Gagal memproses foto')), 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('File bukan gambar yang valid')); };
        img.src = url;
    });
}

async function handlePhotoInput(taskId, input) {
    const images = Array.from(input.files || []).filter(f => f.type.startsWith('image/'));
    input.value = '';
    if (!images.length) { showToast('Pilih file gambar (JPG / PNG).'); return; }

    const list = photos[taskId] || (photos[taskId] = []);
    const slots = MAX_PHOTOS - list.length;
    if (slots <= 0) { showToast('Maksimal ' + MAX_PHOTOS + ' foto per item.'); return; }

    const accepted = images.slice(0, slots);
    const skipped = images.length - accepted.length;
    let ok = 0, failed = 0, lastError = '';

    uploading.add(taskId);
    renderTable(currentFilter);

    for (const f of accepted) {
        try {
            const opts = store.imageOptions || {};
            const blob = await compressToBlob(f, opts.maxSide, opts.quality);
            const photo = await store.addPhoto(taskId, blob);
            list.push(photo);
            ok++;
            renderTable(currentFilter);
        } catch (e) {
            failed++;
            lastError = errMsg(e);
        }
    }

    uploading.delete(taskId);
    refreshUI();
    syncFromStore();

    if (failed) showToast(failed + ' foto gagal diunggah: ' + lastError, 6000);
    else if (skipped) showToast(ok + ' foto diunggah, ' + skipped + ' dilewati (maks. ' + MAX_PHOTOS + ' foto per item).', 4500);
    else showToast(ok + ' foto bukti tersimpan.');
}

/* =====================================================================
 * Lightbox (pratinjau foto)
 * ===================================================================== */
let lbTask = null, lbIndex = 0;

function openLightbox(taskId, index) {
    lbTask = taskId; lbIndex = index;
    drawLightbox();
    document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    lbTask = null;
}
function drawLightbox() {
    const list = photos[lbTask] || [];
    if (!list.length) { closeLightbox(); return; }
    lbIndex = (lbIndex + list.length) % list.length;
    const task = taskData.find(t => t.id === lbTask);
    document.getElementById('lb-img').src = list[lbIndex].url;
    document.getElementById('lb-caption').textContent =
        `${lbTask} · ${task ? task.title : ''} — foto ${lbIndex + 1}/${list.length}`;
    const multi = list.length > 1;
    document.getElementById('lb-prev').style.visibility = multi ? 'visible' : 'hidden';
    document.getElementById('lb-next').style.visibility = multi ? 'visible' : 'hidden';
}
function stepLightbox(d) { lbIndex += d; drawLightbox(); }

async function deleteCurrentPhoto() {
    if (!lbTask || !confirm('Hapus foto ini dari item ' + lbTask + '?')) return;
    const id = lbTask;
    const photo = (photos[id] || [])[lbIndex];
    if (!photo) return;

    try {
        await store.deletePhoto(id, photo);
    } catch (e) {
        showToast('Gagal menghapus foto: ' + errMsg(e), 5000);
        return;
    }

    photos[id] = photos[id].filter(p => p.id !== photo.id);

    // Foto terakhir habis -> centang dibatalkan (tidak boleh selesai tanpa bukti)
    const task = taskData.find(t => t.id === id);
    if (!photos[id].length && task && task.done) {
        task.done = false;
        try { await store.setDone(id, false); } catch (e) { showToast('Gagal menyimpan status: ' + errMsg(e), 5000); }
        showToast('Foto bukti habis, centang item ' + id + ' dibatalkan.');
    }

    refreshUI();
    drawLightbox();
}

document.addEventListener('keydown', e => {
    if (!lbTask) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') stepLightbox(-1);
    else if (e.key === 'ArrowRight') stepLightbox(1);
});

/* =====================================================================
 * Sinkronisasi dengan penyimpanan (ambil data terbaru)
 * ===================================================================== */
async function syncFromStore(force = false) {
    if (uploading.size) return;  // jangan ganggu proses upload
    try {
        const data = await store.loadAll();

        const signature = JSON.stringify([
            data.status,
            Object.fromEntries(Object.entries(data.photos).map(([k, v]) => [k, v.map(p => p.id)]))
        ]);
        if (!force && signature === lastSyncSignature) return;   // tidak ada perubahan
        lastSyncSignature = signature;

        Object.keys(photos).forEach(k => delete photos[k]);
        Object.assign(photos, data.photos);
        taskData.forEach(t => {
            t.done = (t.id in data.status) ? !!data.status[t.id] : t.defaultDone;
        });

        refreshUI();
        if (lbTask) drawLightbox();
        if (store.mode !== 'local') setBanner(null);
    } catch (e) {
        console.error('Sinkronisasi gagal:', e);
        setBanner('error', 'Gagal terhubung ke penyimpanan cloud (' + errMsg(e) + '). Data yang tampil mungkin belum terbaru. Cek js/config.js dan aturan akses (rules) di console, lihat README.md.');
    }
}

/* =====================================================================
 * Mulai
 * ===================================================================== */
applyChartTheme();
refreshUI();

if (store.mode === 'local') {
    setBanner('warn', 'Mode lokal: Firebase belum dikonfigurasi, jadi foto & centang hanya tersimpan di browser ini dan tidak terlihat di perangkat lain. Isi js/config.js untuk menyimpan ke cloud (lihat README.md).');
}

syncFromStore(true);

if (store.subscribe) {
    // Firebase: perubahan dari perangkat lain masuk otomatis (realtime)
    store.subscribe(() => syncFromStore());
} else if (store.mode === 'supabase') {
    // Supabase: cek pembaruan berkala
    const every = (window.APP_CONFIG && window.APP_CONFIG.SYNC_INTERVAL_MS) || 30000;
    setInterval(() => { if (!document.hidden) syncFromStore(); }, every);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) syncFromStore(); });
}
