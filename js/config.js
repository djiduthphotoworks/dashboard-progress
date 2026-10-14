/* config.js
 * Pengaturan koneksi penyimpanan cloud. Edit file ini, bukan file lain.
 *
 * Selama nilai masih "GANTI_...", dashboard jalan dalam MODE LOKAL:
 * foto & centang hanya tersimpan di browser perangkat itu sendiri.
 *
 * Catatan: apiKey Firebase untuk aplikasi web memang bukan rahasia (boleh ikut ke GitHub);
 * yang melindungi data adalah aturan akses (rules) di console Firebase. Lihat README.md.
 */
window.APP_CONFIG = {
    BACKEND: 'firebase',          // 'firebase' atau 'supabase'

    /* ---------- Firebase ----------
     * Ambil dari: Firebase console > Project settings > General > Your apps > (aplikasi Web) > SDK setup & configuration
     * Yang sudah terisi di bawah diambil dari halaman Project settings project Anda. */
    FIREBASE: {
        apiKey: "AIzaSyAcmMA_p-lWMfrhhzBKUdLBCyog50gyBW8",
        authDomain: 'peminjaman-ruangan-7f797.firebaseapp.com',
        projectId: 'peminjaman-ruangan-7f797',
        storageBucket: 'peminjaman-ruangan-7f797.firebasestorage.app',  // contoh: peminjaman-ruangan-7f797.firebasestorage.app
        messagingSenderId: '684694607412',
        appId: '1:684694607412:web:b4c480cc6a8c95b13d1c61',               // contoh: 1:684694607412:web:xxxxxxxxxxxx
    },

    // Tempat menyimpan foto:
    //   'storage'   -> Firebase Storage (disarankan, tetapi perlu paket Blaze / kartu kredit)
    //   'firestore' -> langsung di Firestore, foto dikecilkan lebih kuat (jalan di paket gratis Spark)
    PHOTO_STORAGE: 'firestore',

    /* ---------- Supabase (hanya jika BACKEND = 'supabase') ---------- */
    SUPABASE_URL: 'GANTI_DENGAN_PROJECT_URL',
    SUPABASE_ANON_KEY: 'GANTI_DENGAN_ANON_PUBLIC_KEY',
    BUCKET: 'evidence',
    SYNC_INTERVAL_MS: 30000
};
