/* Runs before first paint (render-blocking, ~1 KB) so there is no flash of the wrong
   effects mode. Sets two things on <html>:
   - data-fx = "full" | "lite"  (user choice, saved in localStorage)
   - class "lens"               (Chromium only: real edge refraction via SVG filter) */
(function () {
    var root = document.documentElement;
    var fx = 'full';
    try { var saved = localStorage.getItem('fx'); if (saved === 'lite' || saved === 'full') fx = saved; } catch (e) {}
    root.setAttribute('data-fx', fx);

    var brands = navigator.userAgentData && navigator.userAgentData.brands;
    var chromium = brands
        ? brands.some(function (b) { return /Chromium/.test(b.brand); })
        : false;
    if (chromium && window.CSS && CSS.supports && CSS.supports('backdrop-filter', 'url(#lens-wide)')) {
        root.classList.add('lens');
    }
})();
