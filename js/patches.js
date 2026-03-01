/**
 * LEXIUM — patches.js
 * Carga al final de index.html, DESPUÉS de todos los demás scripts.
 * <script src="js/patches.js"></script>
 *
 * Resuelve:
 * 1. Al cerrar modal-detalle, la causa "desaparece" (sección causa-detail queda activa)
 * 2. Trámites: al abrir desde el hub-nav de causas, el nav desaparece
 * 3. Botón Guardar: añade tooltip informativo y estado "dirty"
 */

(function () {
    'use strict';

    // ─── 1. FIX: cerrarModal restaura la sección correcta ────────────────
    // El problema: viewCausa() llama tab('causa-detail') antes de abrir el modal.
    // Al cerrar, el usuario queda en la sección 'causa-detail' vacía.
    // Solución: sobrescribir cerrarModal para que, al cerrar 'modal-detalle',
    // navegue de vuelta a la sección de causas.

    const _cerrarModalOrig = window.cerrarModal;

    window.cerrarModal = function (id) {
        if (typeof _cerrarModalOrig === 'function') {
            _cerrarModalOrig(id);
        } else {
            // Fallback manual si cerrarModal no estaba definida
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('open');
                el.style.display = 'none';
            }
        }

        // Después de cerrar el modal de detalle, volver a la lista de causas
        if (id === 'modal-detalle') {
            // Pequeño delay para que la animación de cierre termine
            setTimeout(() => {
                const seccionCausas = document.getElementById('causas');
                const seccionDetalle = document.getElementById('detalle-causa');

                // Si la sección activa es el detalle vacío, volver a causas
                if (seccionDetalle && seccionDetalle.classList.contains('active')) {
                    // Activar causas
                    if (seccionCausas) {
                        document.querySelectorAll('section.tabs').forEach(s => s.classList.remove('active'));
                        seccionCausas.classList.add('active');
                    }
                }

                // También asegurar que la causa-list se renderice
                if (typeof renderCausas === 'function') {
                    renderCausas();
                }
            }, 80);
        }
    };


    // ─── 2. FIX: tab() — al ir a 'tramites', inyectar hub-nav si no existe ──
    // El módulo de trámites (15-tramites-admin.js) renderiza en #tramites-main
    // pero no tiene el hub-nav de navegación entre Causas/Docs/Trámites.

    const _tabOrig = window.tab;

    window.tab = function (nombre, btn) {
        // Llamar la función original de navegación
        if (typeof _tabOrig === 'function') {
            _tabOrig(nombre, btn);
        }

        // Post-process: inyectar nav en trámites si no existe
        if (nombre === 'tramites') {
            _inyectarTramitesNav();
        }
    };

    function _inyectarTramitesNav() {
        const section = document.getElementById('tramites');
        if (!section) return;

        // Ya tiene nav, no hacer nada
        if (section.querySelector('.tramites-hub-nav')) return;

        const nav = document.createElement('div');
        nav.className = 'hub-nav tramites-hub-nav';
        nav.style.marginBottom = '20px';
        nav.innerHTML = `
            <button class="hub-tab" onclick="tab('causas', this)">
                <i class="fas fa-gavel"></i> Causas
            </button>
            <button class="hub-tab" onclick="tab('archivos', this)">
                <i class="fas fa-folder-open"></i> Documentos
            </button>
            <button class="hub-tab active" id="hub-tab-tramites-injected">
                <i class="fas fa-building"></i> Trámites
            </button>
        `;

        // Insertar al inicio de la sección, antes de #tramites-main
        const main = section.querySelector('#tramites-main');
        if (main) {
            section.insertBefore(nav, main);
        } else {
            section.prepend(nav);
        }
    }


    // ─── 3. FIX: Botón Guardar — tooltip + estado visual ─────────────────
    document.addEventListener('DOMContentLoaded', function () {
        const btnGuardar = document.getElementById('btn-guardar-global');
        if (!btnGuardar) return;

        // Tooltip descriptivo
        btnGuardar.setAttribute('title', 'Guardar todos los cambios en el almacenamiento local (Ctrl+S)');

        // Asegurar que tenga icono
        if (!btnGuardar.querySelector('i')) {
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> <span>Guardar</span>';
        }

        // Atajo teclado Ctrl+S
        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                btnGuardar.click();
            }
        });

        // Intercept markAppDirty para mostrar estado visual "hay cambios sin guardar"
        const _markDirtyOrig = window.markAppDirty;
        window.markAppDirty = function () {
            if (typeof _markDirtyOrig === 'function') _markDirtyOrig();
            btnGuardar.classList.add('dirty');
            btnGuardar.setAttribute('title', '⚠️ Hay cambios sin guardar — clic para guardar (Ctrl+S)');
        };

        // Cuando se guarda, quitar el estado dirty
        const _guardarOrig = window.guardarCambiosGlobal;
        window.guardarCambiosGlobal = function () {
            if (typeof _guardarOrig === 'function') _guardarOrig();
            btnGuardar.classList.remove('dirty');
            btnGuardar.setAttribute('title', 'Todos los cambios guardados ✓');
            setTimeout(() => {
                btnGuardar.setAttribute('title', 'Guardar cambios (Ctrl+S)');
            }, 2500);
        };
    });


    // ─── 4. FIX: Prevenir que abrirDetalleCausa cambie la sección activa ──
    // El problema real: renderCausas() genera onclick="tab('causa-detail'); viewCausa(...)"
    // Necesitamos interceptar para que el modal se abra SIN cambiar la sección.

    // Esperamos a que abrirDetalleCausa esté definida
    function _parchearDetalleCausa() {
        if (typeof window.abrirDetalleCausa !== 'function') {
            setTimeout(_parchearDetalleCausa, 200);
            return;
        }

        const _abrirOrig = window.abrirDetalleCausa;

        window.abrirDetalleCausa = function (causaId) {
            // Guardar la sección activa ANTES de abrir el modal
            const seccionActiva = document.querySelector('section.tabs.active');
            const idActivo = seccionActiva ? seccionActiva.id : 'causas';

            // Llamar al original (que puede llamar abrirModal internamente)
            _abrirOrig(causaId);

            // Marcar la sección origen para restaurar al cerrar
            if (idActivo !== 'causa-detail' && idActivo !== 'detalle-causa') {
                window._lexiumSeccionAnterior = idActivo;
            }
        };

        // Actualizar cerrarModal para usar la sección anterior
        const _cerrarActual = window.cerrarModal;
        window.cerrarModal = function (id) {
            // Llamar al cerrarModal que ya fue parcheado arriba
            if (typeof _cerrarActual === 'function') {
                _cerrarActual(id);
            }

            if (id === 'modal-detalle' && window._lexiumSeccionAnterior) {
                setTimeout(() => {
                    const seccionTarget = document.getElementById(window._lexiumSeccionAnterior);
                    if (seccionTarget) {
                        document.querySelectorAll('section.tabs').forEach(s => s.classList.remove('active'));
                        seccionTarget.classList.add('active');
                    }
                    // Limpiar
                    window._lexiumSeccionAnterior = null;
                }, 60);
            }
        };

        // Aliases también
        window.viewCausa          = window.abrirDetalleCausa;
        window.verCausa           = window.abrirDetalleCausa;
        window.verDetalleCausa    = window.abrirDetalleCausa;
        window.openCausa          = window.abrirDetalleCausa;
        window.goCausa            = window.abrirDetalleCausa;
        window.detalleCausa       = window.abrirDetalleCausa;

        console.log('[LEXIUM patches.js] ✓ abrirDetalleCausa parcheada');
    }

    // También parchear viewCausa si existe antes que abrirDetalleCausa
    function _parchearViewCausa() {
        if (typeof window.viewCausa !== 'function') {
            setTimeout(_parchearViewCausa, 300);
            return;
        }
        _parchearDetalleCausa();
    }

    // Iniciar parcheado cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _parchearViewCausa);
    } else {
        setTimeout(_parchearViewCausa, 500);
    }


    // ─── 5. FIX: Botón cerrar fijo — siempre visible sobre el modal ─────
    // El modal es fullscreen — necesitamos un botón X fijo que siempre funcione
    function _inyectarBotonCerrar() {
        if (document.getElementById('modal-detalle-close-fixed')) return;

        const btn = document.createElement('button');
        btn.id = 'modal-detalle-close-fixed';
        btn.innerHTML = '<i class="fas fa-times"></i>';
        btn.title = 'Cerrar detalle de causa (Esc)';
        btn.style.display = 'none';
        btn.onclick = function () {
            if (typeof window.cerrarModal === 'function') {
                window.cerrarModal('modal-detalle');
            }
        };
        document.body.appendChild(btn);

        // Mostrar/ocultar según estado del modal
        const modal = document.getElementById('modal-detalle');
        if (modal) {
            const observer = new MutationObserver(() => {
                const isOpen = modal.classList.contains('open') ||
                               modal.style.display === 'flex' ||
                               modal.style.display === 'block';
                btn.style.display = isOpen ? 'flex' : 'none';
            });
            observer.observe(modal, { attributes: true, attributeFilter: ['class', 'style'] });
        }

        // También cerrar con tecla Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modal = document.getElementById('modal-detalle');
                if (modal && (modal.classList.contains('open') || modal.style.display === 'flex')) {
                    if (typeof window.cerrarModal === 'function') {
                        window.cerrarModal('modal-detalle');
                    }
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _inyectarBotonCerrar);
    } else {
        _inyectarBotonCerrar();
    }

    console.log('[LEXIUM patches.js] ✓ Cargado — fixes activos: modal-detalle, tramites-nav, btn-guardar, close-btn, escape-key');

})();
