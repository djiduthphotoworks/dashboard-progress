/* data.js
 * Data pekerjaan (BoQ) dan bobot kategori.
 * Edit file ini untuk mengubah item, bobot, volume, atau catatan.
 *
 * Field "done" di sini hanya nilai AWAL. Status centang yang sebenarnya
 * dibaca dari penyimpanan (Supabase / lokal) saat halaman dibuka.
 */

// Bobot maksimum tiap kategori (total = 100%)
const categoryTargets = {
    'MEP': 20.0, 'SIPIL': 18.0, 'FURNITURE': 15.0,
    'STRUKTUR': 12.0, 'BRANDING': 10.0, 'HVAC': 25.0
};

const taskData = [
    // Minggu 1
    { id: "1.1", week: "W1", cat: "SIPIL", title: "Mobilisasi pekerja, alat kerja, & material", days: "H-01", weight: 2.5, vol: 1, unit: "Lot", done: true, note: "Basecamp & akomodasi siap" },
    { id: "1.2", week: "W1", cat: "SIPIL", title: "Pemasangan penutup Opening Soon (Kain Hitam D300)", days: "H-01", weight: 2.5, vol: 9.88, unit: "m²", done: true, note: "Penutup Logo Erafone & Pole Sign" },
    { id: "1.3", week: "W1", cat: "STRUKTUR", title: "Sewa & Pemasangan Steger/Scaffolding Façade", days: "H-02", weight: 2.5, vol: 1, unit: "Lot", done: true, note: "Skala 2 (lebar façade 6-10m)" },
    { id: "1.4", week: "W1", cat: "SIPIL", title: "Bongkar keramik/lantai existing (store & toilet)", days: "H-03", weight: 3.0, vol: 15.39, unit: "m²", done: true, note: "Store 12m² & toilet 3.39m²" },
    { id: "1.5", week: "W1", cat: "SIPIL", title: "Pembersihan sampah proyek & puing keluar lokasi", days: "H-04", weight: 2.5, vol: 121.24, unit: "m²", done: true, note: "Area bersih siap konstruksi" },
    { id: "1.6", week: "W1", cat: "STRUKTUR", title: "Fabrikasi & Pasang Tiang Pipa Schedule 40", days: "H-05 - 07", weight: 4.0, vol: 140.32, unit: "kg", done: true, note: "Pipa dia 5,4,3,2 inch fin zincromate" },

    // Minggu 2
    { id: "2.1", week: "W2", cat: "SIPIL", title: "Pemasangan Talang Air PVC Kotak KW1 + Siku", days: "H-08", weight: 3.0, vol: 8, unit: "m1", done: true, note: "Talang PVC abu-abu rapi" },
    { id: "2.2", week: "W2", cat: "SIPIL", title: "Cat & Perbaikan Rangka Kanopi Existing", days: "H-09", weight: 4.5, vol: 20, unit: "m²", done: true, note: "Pengecekan kebocoran rampung" },
    { id: "2.3", week: "W2", cat: "MEP", title: "Bobokan dinding/lantai jalur kabel & pipa", days: "H-10 - 11", weight: 3.5, vol: 1, unit: "Lot", done: true, note: "Sesuai Approved Drawing" },
    { id: "2.4", week: "W2", cat: "MEP", title: "Pasang Pipa Conduit Dia. 20mm Clipsal", days: "H-11 - 13", weight: 3.5, vol: 1, unit: "Lot", done: true, note: "Jalur terpasang di balik ceiling" },
    { id: "2.5", week: "W2", cat: "MEP", title: "Tarikan Kabel Utama Eterna NYM 2x1.5mm & 3x2.5mm", days: "H-13 - 14", weight: 4.5, vol: 66, unit: "ttk", done: true, note: "Titik lampu & stop kontak" },

    // Minggu 3
    { id: "3.1", week: "W3", cat: "HVAC", title: "Pasang AC Split Wall Midea 2 PK (MSFQ-18 CRN)", days: "H-15", weight: 4.5, vol: 3, unit: "Unit", done: false, note: "Unit outdoor siap dipasang" },
    { id: "3.2", week: "W3", cat: "HVAC", title: "Pasang Pipa Refrigerant Hoda (0.6mm)", days: "H-16", weight: 2.0, vol: 30, unit: "m1", done: false, note: "Persiapan vakum sistem" },
    { id: "3.3", week: "W3", cat: "HVAC", title: "Vakum Sistem & Penguncian Outdoor AC", days: "H-16", weight: 2.0, vol: 3, unit: "Unit", done: false, note: "Las bracket & gembok pengaman" },
    { id: "3.4", week: "W3", cat: "HVAC", title: "Pasang Security Wiremesh Gudang Hollow 40x40", days: "H-17 - 18", weight: 3.5, vol: 34.75, unit: "m²", done: false, note: "Frame cat hitam kawat M6" },
    { id: "3.5", week: "W3", cat: "HVAC", title: "Service & Modifikasi Folding Gate/Pintu Lipat", days: "H-18", weight: 2.5, vol: 21.1, unit: "m²", done: false, note: "Ganti kunci Dekson & rel" },
    { id: "3.6", week: "W3", cat: "HVAC", title: "Pasang Closet Toto CW 422 + Jet Washer", days: "H-19", weight: 2.5, vol: 1, unit: "Set", done: false, note: "Fitting sanitary toilet" },
    { id: "3.7", week: "W3", cat: "MEP", title: "Pasang Lampu LED T5 Morgen 18W (1200 & 600mm)", days: "H-20", weight: 5.5, vol: 66, unit: "ttk", done: false, note: "Lampu store 6500K" },
    { id: "3.8", week: "W3", cat: "MEP", title: "Pasang Automatic Timer SUL181D + Kontaktor", days: "H-21", weight: 3.0, vol: 1, unit: "Set", done: false, note: "Timer otomatis shop sign" },

    // Minggu 4
    { id: "4.1", week: "W4", cat: "STRUKTUR", title: "Base Logo Sticker Galvalum 0.6mm Façade", days: "H-22", weight: 5.5, vol: 20.29, unit: "m²", done: false, note: "Plat galvalum abu & merah" },
    { id: "4.2", week: "W4", cat: "BRANDING", title: "Pasang LED Flood Light 50W Vacolux Façade", days: "H-23", weight: 2.5, vol: 3, unit: "ttk", done: false, note: "Lampu sorot luar" },
    { id: "4.3", week: "W4", cat: "BRANDING", title: "Frame Stainless & Signage Box Pole Sign", days: "H-24", weight: 4.0, vol: 2.88, unit: "m²", done: false, note: "Box reklame 2 muka" },
    { id: "4.4", week: "W4", cat: "BRANDING", title: "Pemasangan Stiker Doodle Art & Wallbay", days: "H-25", weight: 3.5, vol: 30.09, unit: "m²", done: false, note: "Samsung, Vivo, Oppo, Apple" },
    { id: "4.5", week: "W4", cat: "FURNITURE", title: "Unloading & Instalasi Furniture Custom", days: "H-26 - 27", weight: 15.0, vol: 1, unit: "Lot", done: false, note: "Knockdown furniture Erajaya" },
    { id: "4.6", week: "W4", cat: "HVAC", title: "Pemasangan Hanging Gripper & Flexy Banner", days: "H-27", weight: 3.0, vol: 5, unit: "Unit", done: false, note: "Hanging gripper & flexy" },
    { id: "4.7", week: "W4", cat: "HVAC", title: "General Cleaning & Touch-up Cat Wall/Ceiling", days: "H-28", weight: 2.5, vol: 1, unit: "Lot", done: false, note: "Area toko bersih" },
    { id: "4.8", week: "W4", cat: "HVAC", title: "Pre-Checklist Internal Supervisi & Commissioning", days: "H-29", weight: 1.5, vol: 1, unit: "Lot", done: false, note: "Tes fungsi menyeluruh" },
    { id: "4.9", week: "W4", cat: "HVAC", title: "Joint Inspection & BAST Handover", days: "H-30", weight: 1.0, vol: 1, unit: "Lot", done: false, note: "Serah terima toko" }
];

// Simpan nilai awal, dipakai bila item belum pernah diubah di penyimpanan
taskData.forEach(t => { t.defaultDone = t.done; });
