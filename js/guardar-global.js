/**
 * AppBogado — js/guardar-global.js
 * Botón Guardar Global, atajo Ctrl+S e indicador de modo almacenamiento.
 * Extraído de index.html (estaba mal ubicado dentro de un modal).
 */

// ── Botón Guardar Global ──────────────────────────────────────────────────
async function guardarCambiosGlobal() {
    const btn = document.getElementById('btn-guardar-global');
    try {
        // Marcar cambios pendientes
        if (typeof markAppDirty === 'function') markAppDirty();

        // Guardar datos en memoria → store
        if (typeof save === 'function') save();

        // Si estamos en Electron: flush inmediato al disco
        if (window.DiskStorage && window.DiskStorage.isElectron) {
            const res = await window.DiskStorage.flush();
            console.info(`[Guardar] Flush al disco: ${res.claves} claves guardadas.`);
        }

        // Feedback visual ✓
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> <span>¡Guardado!</span>';
            btn.style.background = '#16a34a';
            btn.disabled = true;
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.background = '';
                btn.disabled = false;
            }, 2000);
        }
    } catch(e) {
        console.error('[Guardar] Error:', e);
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>Error</span>';
            btn.style.background = '#dc2626';
            setTimeout(() => { btn.innerHTML = original; btn.style.background = ''; }, 2500);
        }
    }
}

// ── Atajo de teclado Ctrl+S / Cmd+S ──────────────────────────────────────
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        guardarCambiosGlobal();
    }
});

// ── Indicador modo almacenamiento en topbar ───────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const badge = document.getElementById('storage-text');
        if (badge && window.DiskStorage) {
            if (window.DiskStorage.isElectron) {
                badge.textContent = '🔒 Disco';
                badge.parentElement.title = 'Datos cifrados en disco (Electron)';
            } else {
                badge.textContent = '🌐 Local';
                badge.parentElement.title = 'Datos en localStorage del navegador';
            }
        }
    }, 500);
});
