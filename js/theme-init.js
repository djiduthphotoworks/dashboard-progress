/* theme-init.js
 * Dijalankan di <head> sebelum halaman tampil, supaya mode gelap/terang
 * sudah benar sejak awal (tidak berkedip).
 */

// Tailwind: mode gelap dikontrol lewat class "dark" di <html>
tailwind.config = { darkMode: 'class' };

(function () {
    var t = null;
    try { t = localStorage.getItem('theme'); } catch (e) { }
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
})();
