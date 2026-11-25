/* ==========================================================================
   POOL MUEBLERÍA - APP.JS (CEREBRO CENTRAL + BASE DE DATOS PROVISIONAL)
   Nota para backend: Cuando la BD real esté lista, solo sustituyan el
   interior de las funciones dentro de `PoolDB` por peticiones fetch().
   ========================================================================== */

const CONFIG = {
    // Cambia este número por el WhatsApp real de Pool Mueblería (código de país + 10 dígitos)
    WHATSAPP_NUMBER: '524421234567',
    WHATSAPP_GROUP_URL: 'https://chat.whatsapp.com/HBnRJV4lIAAEBc0DG5GupZ?s=cl&p=i&iam=2',
    ANTICIPO_PORCENTAJE: 0.80
};

/* ==========================================================================
   1. BASE DE DATOS PROVISIONAL (localStorage)
   ========================================================================== */
const PRODUCTOS_INICIALES = [
    {
        id: 1,
        img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600",
        name: "Sofá Modular Oslo",
        desc: "Lino blanco • 3 Plazas",
        price: 12500,
        category: "Sofás",
        material: "Lino",
        color: "Blanco",
        availability: "Entrega inmediata"
    },
    {
        id: 2,
        img: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&q=80&w=600",
        name: "Sillón Nórdico",
        desc: "Terciopelo Café • 1 Plaza",
        price: 4200,
        category: "Sillones",
        material: "Terciopelo",
        color: "Café",
        availability: "Entrega inmediata"
    },
    {
        id: 3,
        img: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&q=80&w=600",
        name: "Sofá Cama Piel",
        desc: "Piel Sintética • 2 Plazas",
        price: 8700,
        category: "Sofás",
        material: "Piel Sintética",
        color: "Negro",
        availability: "Sobre pedido"
    },
    {
        id: 4,
        img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&q=80&w=600",
        name: "Sillón Velvet",
        desc: "Terciopelo Esmeralda • 1 Plaza",
        price: 5200,
        category: "Sillones",
        material: "Terciopelo",
        color: "Esmeralda",
        availability: "Entrega inmediata"
    },
    {
        id: 5,
        img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=600",
        name: "Sofá Seccional Gris",
        desc: "Tela Antiderrames • 4 Plazas",
        price: 15800,
        category: "Modulares",
        material: "Tela",
        color: "Gris",
        availability: "Sobre pedido"
    },
    {
        id: 6,
        img: "https://images.unsplash.com/photo-1550254478-ead40cc54513?auto=format&fit=crop&q=80&w=600",
        name: "Sofá Premium Cuero",
        desc: "Cuero Natural • 3 Plazas",
        price: 22000,
        category: "Sofás",
        material: "Cuero Natural",
        color: "Café",
        availability: "Sobre pedido"
    }
];

const FILTROS_INICIALES = {
    categories: [
        { label: "Sofás (3 y 4 Plazas)", value: "Sofás" },
        { label: "Sillones Individuales", value: "Sillones" },
        { label: "Salas Modulares (L)", value: "Modulares" },
        { label: "Mesas de Centro", value: "Mesas de Centro" }
    ],
    materials: [
        { label: "Lino Transpirable", value: "Lino" },
        { label: "Terciopelo Premium", value: "Terciopelo" },
        { label: "Piel Sintética", value: "Piel Sintética" },
        { label: "Cuero Natural", value: "Cuero Natural" },
        { label: "Madera de Roble", value: "Madera" }
    ],
    colors: [
        { label: "Blanco", value: "Blanco", hex: "#F5F5F7" },
        { label: "Gris", value: "Gris", hex: "#9CA3AF" },
        { label: "Esmeralda", value: "Esmeralda", hex: "#065F46" },
        { label: "Café", value: "Café", hex: "#3E2723" },
        { label: "Negro", value: "Negro", hex: "#1C1C1E" }
    ],
    availabilities: [
        { label: "Entrega inmediata", value: "Entrega inmediata" },
        { label: "Sobre pedido (Plan 80/20)", value: "Sobre pedido" }
    ]
};

const INICIO_INICIAL = {
    heroSlot1ProductId: 6, // Sofá Premium Cuero (arriba izquierda)
    heroSlot2: {
        title: "Hecho en Querétaro",
        subtitle: "Fabricación directa y artesanal.",
        btnText: "Conoce el taller",
        img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600"
    },
    heroSlot3: {
        title: "Transparencia Total.",
        subtitle: "Trabajamos bajo un modelo 80/20. Asegura tu pedido con el 80% de anticipo y liquida el resto el día que lo recibes en tu hogar.",
        btnText: "Ver políticas de pago",
        img: "" // Sin imagen de fondo por defecto
    },
    heroSlot4ProductId: 2, // Sillón Nórdico (abajo derecha)
    carouselProductIds: [4, 1, 2, 5, 3, 6] // Mínimo 6, máximo 10
};

const PoolDB = {
    obtenerProductos() {
        const guardados = localStorage.getItem('pool_productos');
        if (guardados === null) {
            localStorage.setItem('pool_productos', JSON.stringify(PRODUCTOS_INICIALES));
            return [...PRODUCTOS_INICIALES];
        }
        return JSON.parse(guardados);
    },

    guardarProductos(productos) {
        localStorage.setItem('pool_productos', JSON.stringify(productos));
    },

    restaurarProductosIniciales() {
        localStorage.setItem('pool_productos', JSON.stringify(PRODUCTOS_INICIALES));
        return [...PRODUCTOS_INICIALES];
    },

    obtenerFiltros() {
        const guardados = localStorage.getItem('pool_filtros');
        if (!guardados) {
            const copia = JSON.parse(JSON.stringify(FILTROS_INICIALES));
            localStorage.setItem('pool_filtros', JSON.stringify(copia));
            return copia;
        }
        return JSON.parse(guardados);
    },

    guardarFiltros(filtros) {
        localStorage.setItem('pool_filtros', JSON.stringify(filtros));
    },

    restaurarFiltrosIniciales() {
        const copia = JSON.parse(JSON.stringify(FILTROS_INICIALES));
        localStorage.setItem('pool_filtros', JSON.stringify(copia));
        return copia;
    },

    obtenerInicio() {
        const guardado = localStorage.getItem('pool_home_config');
        if (!guardado) {
            const copia = JSON.parse(JSON.stringify(INICIO_INICIAL));
            localStorage.setItem('pool_home_config', JSON.stringify(copia));
            return copia;
        }
        return JSON.parse(guardado);
    },

    guardarInicio(config) {
        localStorage.setItem('pool_home_config', JSON.stringify(config));
    },

    restaurarInicioOriginal() {
        const copia = JSON.parse(JSON.stringify(INICIO_INICIAL));
        localStorage.setItem('pool_home_config', JSON.stringify(copia));
        return copia;
    },

    obtenerCarrito() {
        return JSON.parse(localStorage.getItem('pool_cart')) || [];
    },

    guardarCarrito(carrito) {
        localStorage.setItem('pool_cart', JSON.stringify(carrito));
    },

    obtenerSesion() {
        return JSON.parse(localStorage.getItem('pool_session')) || null;
    },

    guardarSesion(sesion) {
        if (sesion) localStorage.setItem('pool_session', JSON.stringify(sesion));
        else localStorage.removeItem('pool_session');
    },

    obtenerPedidos() {
        return JSON.parse(localStorage.getItem('pool_orders')) || [];
    },

    guardarPedido(nuevoPedido) {
        const pedidos = this.obtenerPedidos();
        pedidos.unshift(nuevoPedido);
        localStorage.setItem('pool_orders', JSON.stringify(pedidos));
    }
};

/* ==========================================================================
   2. UTILIDADES GLOBALES
   ========================================================================== */
function formatMXN(amount) {
    return `$${Number(amount).toLocaleString('es-MX')} MXN`;
}

function normalizeText(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function escapeHTML(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isInventoryMode() {
    const params = new URLSearchParams(window.location.search);
    const sesion = PoolDB.obtenerSesion();
    return params.get('modo') === 'inventario' && sesion?.role === 'admin';
}

function isHomeEditMode() {
    const params = new URLSearchParams(window.location.search);
    const sesion = PoolDB.obtenerSesion();
    return params.get('modo') === 'editar-inicio' && sesion?.role === 'admin';
}

/* ==========================================================================
   3. MENÚS DESPLEGABLES DE LA BARRA DE NAVEGACIÓN (ANIMACIÓN ESTILO APPLE)
   ========================================================================== */
function openDropdown(element) {
    if (!element) return;
    element.classList.remove('hidden');
    // Fuerza un repaint para que CSS anime desde el estado comprimido
    void element.offsetWidth;
    element.classList.add('is-open');
}

function closeDropdown(element) {
    if (!element || element.classList.contains('hidden')) return;
    element.classList.remove('is-open');
    setTimeout(() => {
        if (!element.classList.contains('is-open')) {
            element.classList.add('hidden');
        }
    }, 260);
}

function toggleMenu(menuId) {
    const menus = ['search-dropdown', 'cart-dropdown', 'profile-dropdown', 'mobile-menu'];
    menus.forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;

        if (id === menuId) {
            if (element.classList.contains('is-open')) {
                closeDropdown(element);
            } else {
                openDropdown(element);
            }
        } else {
            closeDropdown(element);
        }
    });
}

document.addEventListener('click', (event) => {
    const header = document.querySelector('header');
    if (header && !header.contains(event.target)) {
        ['search-dropdown', 'cart-dropdown', 'profile-dropdown', 'mobile-menu'].forEach(id => {
            closeDropdown(document.getElementById(id));
        });
    }
});

/* ==========================================================================
   4. SESIÓN PERSISTENTE (USUARIO / ADMIN)
   ========================================================================== */
function syncAdminInventoryLink() {
    const adminMenu = document.getElementById('admin-menu-list');
    if (!adminMenu) return;

    const adminLinks = adminMenu.querySelectorAll('a');
    adminLinks.forEach(link => {
        if (normalizeText(link.textContent).includes('gestion de inventario')) {
            link.setAttribute('href', 'producto.html?modo=inventario');
        }
    });

    // Agrega acceso directo a "Editar página de inicio" en el panel de admin si no existe
    if (!adminMenu.querySelector('a[href="index.html?modo=editar-inicio"]')) {
        const li = document.createElement('li');
        li.innerHTML = `
            <a href="index.html?modo=editar-inicio" class="flex items-center gap-3 px-3 py-2 hover:bg-white/60 rounded-xl transition-colors">
                <svg class="w-4 h-4 text-pool-cafe" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
                Editar inicio
            </a>
        `;
        adminMenu.insertBefore(li, adminMenu.children[1] || null);
    }
}

function renderSessionUI() {
    syncAdminInventoryLink();

    const sesion = PoolDB.obtenerSesion();
    const loginForm = document.getElementById('login-form-nav');
    const loggedInMenu = document.getElementById('logged-in-menu');
    const sessionText = document.getElementById('session-text');
    const sessionIcon = document.getElementById('session-icon');
    const userGreeting = document.getElementById('user-greeting');
    const userMenuList = document.getElementById('user-menu-list');
    const adminMenuList = document.getElementById('admin-menu-list');

    if (!loginForm || !loggedInMenu) return;

    if (sesion) {
        loginForm.classList.add('hidden');
        loggedInMenu.classList.remove('hidden');
        if (sessionText) sessionText.classList.add('hidden');
        if (sessionIcon) sessionIcon.classList.remove('hidden');

        if (sesion.role === 'admin') {
            if (userGreeting) userGreeting.innerText = 'Panel de Control';
            if (adminMenuList) adminMenuList.classList.remove('hidden');
            if (userMenuList) userMenuList.classList.add('hidden');
        } else {
            if (userGreeting) userGreeting.innerText = `Hola, ${sesion.name}`;
            if (userMenuList) userMenuList.classList.remove('hidden');
            if (adminMenuList) adminMenuList.classList.add('hidden');
        }
    } else {
        loginForm.classList.remove('hidden');
        loggedInMenu.classList.add('hidden');
        if (sessionText) sessionText.classList.remove('hidden');
        if (sessionIcon) sessionIcon.classList.add('hidden');
    }
}

function handleNavLogin(e) {
    e.preventDefault();
    const user = document.getElementById('nav-username').value.trim();
    const pass = document.getElementById('nav-password').value.trim();
    const errorMsg = document.getElementById('nav-login-error');

    if (errorMsg) errorMsg.classList.add('hidden');

    if (user === '1234' && pass === '1234') {
        PoolDB.guardarSesion({ username: '1234', name: 'Usuario', role: 'user' });
        renderSessionUI();
        renderSidebarFilters();
        applyCatalogFilters();
        renderHomePage();
    } else if (user === 'admin' && pass === 'admin') {
        PoolDB.guardarSesion({ username: 'admin', name: 'Admin', role: 'admin' });
        renderSessionUI();
        renderSidebarFilters();
        applyCatalogFilters();
        renderHomePage();
    } else {
        if (errorMsg) errorMsg.classList.remove('hidden');
        else alert('Usuario o contraseña incorrectos. Usa "1234" o "admin".');
    }
}

function handleLogout() {
    PoolDB.guardarSesion(null);
    const userField = document.getElementById('nav-username');
    const passField = document.getElementById('nav-password');
    const errorMsg = document.getElementById('nav-login-error');
    if (userField) userField.value = '';
    if (passField) passField.value = '';
    if (errorMsg) errorMsg.classList.add('hidden');
    renderSessionUI();

    const params = new URLSearchParams(window.location.search);
    if (params.get('modo') === 'inventario') {
        window.location.href = 'producto.html';
    } else if (params.get('modo') === 'editar-inicio') {
        window.location.href = 'index.html';
    } else {
        renderSidebarFilters();
        applyCatalogFilters();
        renderHomePage();
    }
}

/* ==========================================================================
   5. CARRITO PERSISTENTE + CONFIRMACIÓN + PDF ESTILO AMAZON + WHATSAPP
   ========================================================================== */
function renderCart() {
    const cart = PoolDB.obtenerCarrito();
    const listEl = document.getElementById('cart-items-list');
    const emptyEl = document.getElementById('cart-empty-state');
    const summaryEl = document.getElementById('cart-summary');
    const countLabel = document.getElementById('cart-count-label');
    const badge = document.getElementById('cart-badge');
    const totalEl = document.getElementById('cart-total-price');
    const advanceEl = document.getElementById('cart-advance-price');

    if (!listEl || !emptyEl || !summaryEl) return;

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

    if (countLabel) countLabel.innerText = `${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'}`;
    if (badge) {
        badge.innerText = totalItems;
        badge.classList.toggle('hidden', totalItems === 0);
    }

    if (cart.length === 0) {
        emptyEl.classList.remove('hidden');
        listEl.classList.add('hidden');
        summaryEl.classList.add('hidden');
        listEl.innerHTML = '';
        return;
    }

    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');
    summaryEl.classList.remove('hidden');

    let grandTotal = 0;

    listEl.innerHTML = cart.map(item => {
        const lineTotal = item.unitPrice * item.qty;
        grandTotal += lineTotal;

        const customText = item.customSummary
            ? `<p class="text-[11px] text-gray-500 leading-tight">${escapeHTML(item.customSummary)}</p>`
            : '';

        return `
            <li class="flex items-center gap-3 bg-white/80 p-3 rounded-2xl border border-gray-200/80 shadow-sm">
                <img src="${item.img}" alt="${escapeHTML(item.title)}" class="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-100">
                <div class="flex-1 min-w-0 text-left">
                    <p class="font-semibold text-xs text-pool-dark truncate">${escapeHTML(item.title)}</p>
                    <p class="text-[11px] text-gray-500 leading-tight mt-0.5">${escapeHTML(item.size)}</p>
                    <p class="text-[11px] text-gray-500 leading-tight">${escapeHTML(item.material)}</p>
                    ${customText}
                    <div class="flex items-center justify-between mt-2">
                        <span class="text-xs font-semibold text-pool-cafe">${formatMXN(lineTotal)}</span>
                        <div class="flex items-center gap-1.5">
                            <button onclick="event.stopPropagation(); updateCartQty(${item.id}, -1)" class="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold flex items-center justify-center cursor-pointer">-</button>
                            <span class="text-xs font-medium w-4 text-center">${item.qty}</span>
                            <button onclick="event.stopPropagation(); updateCartQty(${item.id}, 1)" class="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold flex items-center justify-center cursor-pointer">+</button>
                        </div>
                    </div>
                </div>
                <button onclick="event.stopPropagation(); removeFromCart(${item.id})" title="Eliminar" class="text-gray-400 hover:text-red-500 text-xs font-bold self-start p-1 cursor-pointer">✕</button>
            </li>
        `;
    }).join('');

    if (totalEl) totalEl.innerText = formatMXN(grandTotal);
    if (advanceEl) advanceEl.innerText = formatMXN(Math.round(grandTotal * CONFIG.ANTICIPO_PORCENTAJE));
}

function updateCartQty(id, delta) {
    let cart = PoolDB.obtenerCarrito();
    const item = cart.find(p => p.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(p => p.id !== id);
    }
    PoolDB.guardarCarrito(cart);
    renderCart();
}

function removeFromCart(id) {
    let cart = PoolDB.obtenerCarrito().filter(p => p.id !== id);
    PoolDB.guardarCarrito(cart);
    renderCart();
}

function loadHtml2PdfLibrary() {
    return new Promise((resolve, reject) => {
        if (window.html2pdf) {
            resolve(window.html2pdf);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => resolve(window.html2pdf);
        script.onerror = () => reject(new Error('No se pudo cargar la librería de PDF.'));
        document.head.appendChild(script);
    });
}

function formatAmazonPrice(amount) {
    return `$${Number(amount).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function ensureCheckoutConfirmModal() {
    if (document.getElementById('checkout-confirm-modal')) return;

    const modalHTML = `
        <div id="checkout-confirm-modal" class="hidden fixed inset-0 z-[130] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div class="bg-white/95 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-2xl max-w-md w-full p-7 text-center">
                <!-- PASO 1: ADVERTENCIA Y CONFIRMACIÓN -->
                <div id="checkout-step-confirm">
                    <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 text-pool-cafe flex items-center justify-center">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-pool-dark mb-2">Confirmar y descargar pedido</h3>
                    <p class="text-sm text-gray-600 leading-relaxed mb-3">
                        Al confirmar, se descargará automáticamente un archivo <strong>PDF</strong> con el resumen completo de tu pedido.
                    </p>
                    <div class="bg-[#F5F5F7] rounded-2xl p-3.5 text-xs text-gray-600 text-left mb-6 border border-gray-200/70">
                        <p class="font-semibold text-pool-dark mb-1">¿Qué debes hacer después?</p>
                        <p>Una vez descargado el archivo, se abrirá el chat de WhatsApp. <strong>Deberás adjuntar y enviar el PDF manualmente</strong> en el chat para que podamos procesar tu pedido.</p>
                    </div>
                    <div class="flex gap-3">
                        <button type="button" onclick="closeCheckoutConfirmModal()" class="flex-1 py-2.5 px-4 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer">
                            Cancelar
                        </button>
                        <button type="button" id="btn-confirm-download-pdf" onclick="confirmDownloadAndOpenWhatsApp()" class="flex-1 py-2.5 px-4 rounded-full bg-pool-cafe text-white text-sm font-semibold hover:opacity-90 transition shadow-md cursor-pointer">
                            Confirmar
                        </button>
                    </div>
                </div>

                <!-- PASO 2: DESCARGA LISTA + BOTÓN DE RESPALDO PARA WHATSAPP -->
                <div id="checkout-step-done" class="hidden">
                    <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-pool-dark mb-2">¡PDF descargado!</h3>
                    <p class="text-sm text-gray-600 leading-relaxed mb-6">
                        Tu archivo <strong class="text-pool-dark">Resumen_Pedido_Pool.pdf</strong> ya está en tu dispositivo. Abre WhatsApp y <strong>adjúntalo manualmente</strong> en el grupo.
                    </p>
                    <div class="flex flex-col gap-2.5">
                        <a id="checkout-whatsapp-link" href="#" target="_blank" rel="noopener noreferrer" class="w-full py-2.5 px-4 rounded-full bg-[#25D366] text-white text-sm font-semibold hover:opacity-90 transition shadow-md">
                            Abrir grupo de WhatsApp
                        </a>
                        <button type="button" onclick="closeCheckoutConfirmModal()" class="w-full py-2 px-4 rounded-full border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function checkoutCart() {
    const cart = PoolDB.obtenerCarrito();
    if (cart.length === 0) return;

    ensureCheckoutConfirmModal();

    const stepConfirm = document.getElementById('checkout-step-confirm');
    const stepDone = document.getElementById('checkout-step-done');
    const confirmBtn = document.getElementById('btn-confirm-download-pdf');

    if (stepConfirm) stepConfirm.classList.remove('hidden');
    if (stepDone) stepDone.classList.add('hidden');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirmar';
    }

    document.getElementById('checkout-confirm-modal')?.classList.remove('hidden');
}

function closeCheckoutConfirmModal() {
    document.getElementById('checkout-confirm-modal')?.classList.add('hidden');
}

function buildOrderPdfHTML(cart, total) {
    const fechaFormateada = new Date().toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const sesion = PoolDB.obtenerSesion();
    const clienteLabel = sesion ? `Cliente: ${sesion.username || sesion.name}` : 'Cliente Invitado';

    const itemsHTML = cart.map((item, idx) => {
        const lineTotal = item.unitPrice * item.qty;
        const borderTop = idx > 0 ? 'border-top: 1px solid #e7e7e7; padding-top: 14px; margin-top: 14px;' : '';
        const customLine = item.customSummary
            ? `<div style="font-size: 12px; color: #565959; margin-top: 2px;">Extras: ${item.customSummary}</div>`
            : '';

        return `
            <div style="display: flex; gap: 16px; align-items: flex-start; ${borderTop}">
                <img src="${item.img}" crossorigin="anonymous" alt="${item.title}"
                     style="width: 88px; height: 88px; object-fit: cover; border-radius: 6px; border: 1px solid #e7e7e7; flex-shrink: 0;">
                <div style="flex: 1;">
                    <div style="font-size: 14px; font-weight: 600; color: #007185; line-height: 1.35;">
                        ${item.title}
                    </div>
                    <div style="font-size: 12px; color: #565959; margin-top: 4px;">
                        Tamaño: ${item.size}
                    </div>
                    <div style="font-size: 12px; color: #565959; margin-top: 2px;">
                        Acabado: ${item.material}
                    </div>
                    ${customLine}
                    <div style="font-size: 12px; color: #565959; margin-top: 2px;">
                        Cantidad: ${item.qty}
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: #0f1111; margin-top: 6px;">
                        ${formatAmazonPrice(lineTotal)}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #0f1111; padding: 28px 32px; background: #ffffff; width: 720px; box-sizing: border-box;">
            <h1 style="font-size: 26px; font-weight: 400; margin: 0 0 6px 0; color: #0f1111;">
                Resumen del pedido
            </h1>
            <div style="font-size: 13px; color: #0f1111; margin-bottom: 16px;">
                Pedido realizado el ${fechaFormateada} &nbsp;|&nbsp; ${clienteLabel}
            </div>

            <!-- CUADRO SUPERIOR: SOLO RESUMEN DEL PEDIDO -->
            <div style="border: 1px solid #d5d9d9; border-radius: 8px; padding: 16px 20px; margin-bottom: 18px;">
                <div style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #0f1111;">
                    Resumen del pedido
                </div>
                <table style="width: 100%; max-width: 340px; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="padding: 3px 0; color: #0f1111;">Productos:</td>
                        <td style="padding: 3px 0; text-align: right; color: #0f1111;">${formatAmazonPrice(total)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 3px 0; color: #0f1111;">Envío:</td>
                        <td style="padding: 3px 0; text-align: right; color: #0f1111;">$0.00</td>
                    </tr>
                    <tr>
                        <td style="padding: 3px 0; color: #0f1111;">Subtotal:</td>
                        <td style="padding: 3px 0; text-align: right; color: #0f1111;">${formatAmazonPrice(total)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0 0 0; font-weight: 700; color: #0f1111;">Total (IVA incluido, en caso de ser aplicable):</td>
                        <td style="padding: 6px 0 0 0; text-align: right; font-weight: 700; color: #0f1111; vertical-align: top;">${formatAmazonPrice(total)}</td>
                    </tr>
                </table>
            </div>

            <!-- CUADRO INFERIOR: LISTA DE PRODUCTOS -->
            <div style="border: 1px solid #d5d9d9; border-radius: 8px; padding: 18px 20px;">
                <div style="font-size: 16px; font-weight: 700; margin-bottom: 14px; color: #0f1111;">
                    Artículos incluidos en tu pedido
                </div>
                ${itemsHTML}
            </div>

            <div style="text-align: center; font-size: 11px; color: #565959; margin-top: 28px;">
                © 2026 Pool Mueblería
            </div>
        </div>
    `;
}

async function confirmDownloadAndOpenWhatsApp() {
    const cart = PoolDB.obtenerCarrito();
    if (cart.length === 0) return;

    const confirmBtn = document.getElementById('btn-confirm-download-pdf');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Generando PDF...';
    }

    const total = cart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
    const anticipo = Math.round(total * CONFIG.ANTICIPO_PORCENTAJE);
    const restante = total - anticipo;
    const sesion = PoolDB.obtenerSesion();

    const pedido = {
        id: 'POOL-' + Date.now().toString().slice(-6),
        fecha: new Date().toLocaleDateString('es-MX'),
        cliente: sesion ? sesion.name : 'Cliente Invitado',
        items: cart,
        total,
        anticipo,
        restante,
        estatus: 'Pendiente de anticipo (80%)'
    };
    PoolDB.guardarPedido(pedido);

    try {
        await loadHtml2PdfLibrary();

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.innerHTML = buildOrderPdfHTML(cart, total);
        document.body.appendChild(container);

        const pdfOptions = {
            margin: 10,
            filename: 'Resumen_Pedido_Pool.pdf',
            image: { type: 'jpeg', quality: 0.96 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await window.html2pdf().set(pdfOptions).from(container.firstElementChild).save();
        document.body.removeChild(container);

        const targetUrl = (CONFIG.WHATSAPP_GROUP_URL && !CONFIG.WHATSAPP_GROUP_URL.includes('PEGA_AQUI'))
            ? CONFIG.WHATSAPP_GROUP_URL
            : `https://wa.me/${CONFIG.WHATSAPP_NUMBER}`;

        const waLink = document.getElementById('checkout-whatsapp-link');
        if (waLink) waLink.href = targetUrl;

        document.getElementById('checkout-step-confirm')?.classList.add('hidden');
        document.getElementById('checkout-step-done')?.classList.remove('hidden');

        window.open(targetUrl, '_blank');
    } catch (err) {
        console.error('Error al generar el PDF:', err);
        alert('Ocurrió un problema al generar el PDF. Verifica tu conexión a internet e intenta de nuevo.');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirmar';
        }
    }
}

/* ==========================================================================
   6. MODAL DE COMPRA Y PERSONALIZACIÓN (CON SOPORTE PARA APARTADOS EXTRA)
   ========================================================================== */
let currentProduct = {
    img: '',
    title: '',
    basePrice: 0,
    size: '3 Plazas (Estándar)',
    sizeExtra: 0,
    material: 'Lino Blanco',
    materialExtra: 0,
    customSelections: {}
};

function renderCustomSectionsInPurchaseModal(productObj) {
    const materialContainer = document.getElementById('material-options');
    if (!materialContainer) return;

    const oldWrapper = document.getElementById('purchase-custom-sections');
    if (oldWrapper) oldWrapper.remove();

    const sections = productObj?.customSections || [];
    if (sections.length === 0) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'purchase-custom-sections';

    sections.forEach((sec, secIndex) => {
        if (!sec.options || sec.options.length === 0) return;
        const firstOpt = sec.options[0];
        currentProduct.customSelections[sec.title] = {
            label: firstOpt.label,
            extra: Number(firstOpt.extra) || 0
        };

        const optionsHTML = sec.options.map((opt, optIdx) => {
            const extraNum = Number(opt.extra) || 0;
            const extraLabel = extraNum > 0 ? `+ $${extraNum.toLocaleString('es-MX')}` : 'Incluido';
            return `
                <div class="modal-option ${optIdx === 0 ? 'active' : ''}"
                     data-custom-title="${escapeHTML(sec.title)}"
                     data-label="${escapeHTML(opt.label)}"
                     data-extra="${extraNum}"
                     onclick="selectCustomPurchaseOption(this)">
                    <div class="flex justify-between items-center">
                        <h4 class="font-semibold text-pool-dark">${escapeHTML(opt.label)}</h4>
                        <span class="text-sm font-medium ${optIdx === 0 ? 'text-pool-dark' : 'text-gray-500'}">${extraLabel}</span>
                    </div>
                </div>
            `;
        }).join('');

        wrapper.innerHTML += `
            <div class="mb-10" id="custom-sec-${secIndex}">
                <h3 class="text-lg font-semibold mb-4 text-pool-dark">${escapeHTML(sec.title)}</h3>
                <div class="space-y-4">
                    ${optionsHTML}
                </div>
            </div>
        `;
    });

    materialContainer.insertAdjacentElement('afterend', wrapper);
}

function selectCustomPurchaseOption(clickedElement) {
    const siblings = clickedElement.parentElement.children;
    for (let sibling of siblings) {
        sibling.classList.remove('active');
    }
    clickedElement.classList.add('active');

    const secTitle = clickedElement.dataset.customTitle;
    const label = clickedElement.dataset.label;
    const extra = Number(clickedElement.dataset.extra) || 0;

    currentProduct.customSelections[secTitle] = { label, extra };
    updateModalTotal();
}

function openPurchaseModal(imgSrc, title, price) {
    const modal = document.getElementById('purchase-modal');
    const backdrop = document.getElementById('purchase-backdrop');
    const content = document.getElementById('purchase-content');
    if (!modal) return;

    const numericPrice = parseFloat(String(price).replace(/[^0-9.]/g, '')) || 0;
    const productObj = PoolDB.obtenerProductos().find(p => p.name === title) || null;

    currentProduct = {
        img: imgSrc,
        title: title,
        basePrice: numericPrice,
        size: '3 Plazas (Estándar)',
        sizeExtra: 0,
        material: 'Lino Blanco',
        materialExtra: 0,
        customSelections: {}
    };

    resetModalOptions('#size-options');
    resetModalOptions('#material-options');
    renderCustomSectionsInPurchaseModal(productObj);

    const imgEl = document.getElementById('modal-image');
    const titleEl = document.getElementById('modal-title');
    const priceEl = document.getElementById('modal-price');

    if (imgEl) imgEl.src = currentProduct.img;
    if (titleEl) titleEl.innerText = currentProduct.title;
    if (priceEl) priceEl.innerText = `Desde ${formatMXN(currentProduct.basePrice)}`;

    updateModalTotal();

    modal.classList.remove('hidden');
    setTimeout(() => {
        if (backdrop) backdrop.classList.remove('opacity-0');
        if (content) {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }
    }, 10);
    document.body.style.overflow = 'hidden';
}

function resetModalOptions(selector) {
    const options = document.querySelectorAll(`${selector} .modal-option`);
    options.forEach((opt, index) => opt.classList.toggle('active', index === 0));
}

function closePurchaseModal() {
    const modal = document.getElementById('purchase-modal');
    const backdrop = document.getElementById('purchase-backdrop');
    const content = document.getElementById('purchase-content');
    if (!modal) return;

    if (backdrop) backdrop.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
    document.body.style.overflow = 'auto';
}

function selectOption(clickedElement, category) {
    const siblings = clickedElement.parentElement.children;
    for (let sibling of siblings) {
        sibling.classList.remove('active');
    }
    clickedElement.classList.add('active');

    const label = clickedElement.dataset.label;
    const extra = Number(clickedElement.dataset.extra) || 0;

    if (category === 'size') {
        currentProduct.size = label;
        currentProduct.sizeExtra = extra;
    } else if (category === 'material') {
        currentProduct.material = label;
        currentProduct.materialExtra = extra;
    }

    updateModalTotal();
}

function getCurrentFinalPrice() {
    const customExtras = Object.values(currentProduct.customSelections || {})
        .reduce((sum, item) => sum + (Number(item.extra) || 0), 0);
    return currentProduct.basePrice + currentProduct.sizeExtra + currentProduct.materialExtra + customExtras;
}

function updateModalTotal() {
    const finalPrice = getCurrentFinalPrice();
    const advance = Math.round(finalPrice * CONFIG.ANTICIPO_PORCENTAJE);
    const totalEl = document.getElementById('modal-total');
    const advanceEl = document.getElementById('modal-advance');
    if (totalEl) totalEl.innerText = `Total: ${formatMXN(finalPrice)}`;
    if (advanceEl) advanceEl.innerText = `Anticipo 80%: ${formatMXN(advance)} (20% contra entrega)`;
}

function confirmAddToCart() {
    const finalPrice = getCurrentFinalPrice();
    const cart = PoolDB.obtenerCarrito();
    const customSummary = Object.entries(currentProduct.customSelections || {})
        .map(([k, v]) => `${k}: ${v.label}`)
        .join(' • ');

    const existingItem = cart.find(item =>
        item.title === currentProduct.title &&
        item.size === currentProduct.size &&
        item.material === currentProduct.material &&
        (item.customSummary || '') === customSummary
    );

    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({
            id: Date.now(),
            img: currentProduct.img,
            title: currentProduct.title,
            size: currentProduct.size,
            material: currentProduct.material,
            customSummary,
            unitPrice: finalPrice,
            qty: 1
        });
    }

    PoolDB.guardarCarrito(cart);
    renderCart();
    closePurchaseModal();
    openDropdown(document.getElementById('cart-dropdown'));
}

function buyNow() {
    confirmAddToCart();
}

/* ==========================================================================
   7. PÁGINA DE INICIO DINÁMICA Y EDITOR VISUAL (INDEX.HTML)
   ========================================================================== */
let carouselAutoScrollInterval = null;
let homePickerTarget = null; // { type: 'heroSlot1' | 'heroSlot4' | 'carouselSwap' | 'carouselAdd', index?: number }
let homeBannerTarget = null; // 'heroSlot2' | 'heroSlot3'
let homeBannerUploadedImg = '';

function getPencilIconSVG() {
    return `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
        </svg>
    `;
}

function resolveProductById(products, id, fallbackIndex = 0) {
    return products.find(p => p.id === id) || products[fallbackIndex % products.length] || PRODUCTOS_INICIALES[0];
}

function renderHomeEditToolbar() {
    const heroGrid = document.querySelector('.hero-grid');
    if (!heroGrid) return;

    const existingBar = document.getElementById('home-edit-toolbar');
    if (existingBar) existingBar.remove();

    if (!isHomeEditMode()) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'home-edit-toolbar';
    toolbar.className = 'mb-8 bg-white/85 backdrop-blur-xl border border-white/60 shadow-sm rounded-3xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4';
    toolbar.innerHTML = `
        <div class="text-center sm:text-left">
            <p class="text-[11px] font-bold uppercase tracking-widest text-pool-cafe">Modo edición de inicio</p>
            <p class="text-xs text-gray-500 mt-0.5">Usa el ícono de lápiz para cambiar productos o textos, y "+" / "-" en el carrusel (mínimo 6, máximo 10).</p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2.5">
            <button type="button" onclick="restoreHomeOriginal()" class="px-4 py-2 rounded-full border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer">
                Restaurar inicio original
            </button>
            <a href="producto.html?modo=inventario" class="px-4 py-2 rounded-full border border-pool-cafe text-pool-cafe text-xs font-semibold hover:bg-gray-50 transition">
                Volver a inventario
            </a>
            <a href="index.html" class="px-4 py-2 rounded-full bg-pool-cafe text-white text-xs font-semibold hover:opacity-90 transition shadow-sm">
                Listo
            </a>
        </div>
    `;
    heroGrid.parentElement.insertBefore(toolbar, heroGrid);
}

function renderHomePage() {
    const heroGrid = document.querySelector('.hero-grid');
    const carousel = document.getElementById('carousel');
    if (!heroGrid || !carousel) return;

    const editMode = isHomeEditMode();
    const config = PoolDB.obtenerInicio();
    const products = PoolDB.obtenerProductos();

    renderHomeEditToolbar();

    if (editMode) {
        ensureHomeProductPickerModal();
        ensureHomeBannerEditModal();
    }

    // 1. RENDERIZAR LOS 4 CUADROS DEL BENTO BOX
    const p1 = resolveProductById(products, config.heroSlot1ProductId, 5);
    const p4 = resolveProductById(products, config.heroSlot4ProductId, 1);
    const s2 = config.heroSlot2;
    const s3 = config.heroSlot3;

    const p1Price = Number(p1.price).toLocaleString('es-MX');
    const p1SafeName = String(p1.name).replace(/'/g, "\\'");
    const p4Price = Number(p4.price).toLocaleString('es-MX');
    const p4SafeName = String(p4.name).replace(/'/g, "\\'");

    const slot2HasImg = Boolean(s2.img && s2.img.trim() !== '');
    const slot3HasImg = Boolean(s3.img && s3.img.trim() !== '');

    heroGrid.innerHTML = `
        <!-- CUADRO 1: Producto destacado (arriba izquierda) -->
        <div class="relative bg-pool-cafe text-white h-[500px] md:h-[550px] rounded-[2rem] overflow-hidden flex flex-col items-center text-center pt-14 px-6 hover:shadow-lg transition duration-500 group cursor-pointer"
             onclick="${editMode ? "openHomeProductPicker('heroSlot1')" : `openPurchaseModal('${p1.img}', '${p1SafeName}', '${p1Price}')`}">
            ${editMode ? `<button type="button" onclick="event.stopPropagation(); openHomeProductPicker('heroSlot1')" class="admin-edit-badge" title="Cambiar producto">${getPencilIconSVG()}</button>` : ''}
            <h2 class="text-3xl md:text-4xl font-semibold mb-2 tracking-tight z-10">${escapeHTML(p1.name)}</h2>
            <p class="text-base text-gray-300 mb-6 font-light z-10">${escapeHTML(p1.desc)}</p>
            <div class="flex space-x-3 z-10">
                <button type="button" class="bg-white text-pool-cafe px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition cursor-pointer">Comprar</button>
                <button type="button" class="border border-white text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition cursor-pointer">Agregar al carrito</button>
            </div>
            <img src="${p1.img}" alt="${escapeHTML(p1.name)}" class="absolute bottom-0 w-full object-cover h-[55%] transform transition duration-500 group-hover:scale-105 origin-bottom">
        </div>

        <!-- CUADRO 2: Banner editable (arriba derecha) -->
        <div class="relative bg-gray-900 text-white h-[500px] md:h-[550px] rounded-[2rem] overflow-hidden flex flex-col justify-start items-center text-center pt-14 px-6 hover:shadow-lg transition duration-500 group">
            ${editMode ? `<button type="button" onclick="event.stopPropagation(); openHomeBannerEditor('heroSlot2')" class="admin-edit-badge" title="Editar texto e imagen">${getPencilIconSVG()}</button>` : ''}
            ${slot2HasImg ? `<img src="${s2.img}" alt="${escapeHTML(s2.title)}" class="absolute inset-0 w-full h-full object-cover opacity-60 transform transition duration-500 group-hover:scale-105">` : ''}
            <div class="relative z-10">
                <h2 class="text-3xl md:text-4xl font-semibold mb-2 tracking-tight">${escapeHTML(s2.title)}</h2>
                <p class="text-base text-gray-200 mb-6 font-light max-w-md">${escapeHTML(s2.subtitle)}</p>
                <a href="ayuda.html" class="inline-block bg-white text-black px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition">${escapeHTML(s2.btnText || 'Conoce el taller')}</a>
            </div>
        </div>

        <!-- CUADRO 3: Banner editable con fondo opcional (abajo izquierda) -->
        <div class="relative ${slot3HasImg ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-pool-dark'} h-[500px] md:h-[550px] rounded-[2rem] overflow-hidden flex flex-col justify-center items-center text-center px-10 hover:shadow-lg transition duration-500 group">
            ${editMode ? `<button type="button" onclick="event.stopPropagation(); openHomeBannerEditor('heroSlot3')" class="admin-edit-badge" title="Editar texto e imagen de fondo">${getPencilIconSVG()}</button>` : ''}
            ${slot3HasImg ? `<img src="${s3.img}" alt="${escapeHTML(s3.title)}" class="absolute inset-0 w-full h-full object-cover opacity-55 transform transition duration-500 group-hover:scale-105">` : ''}
            <div class="relative z-10 flex flex-col items-center">
                ${!slot3HasImg ? `
                    <div class="mb-6 bg-gray-50 p-4 rounded-full transform transition duration-500 group-hover:scale-110">
                        <svg class="w-10 h-10 text-pool-cafe" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"></path></svg>
                    </div>
                ` : ''}
                <h2 class="text-3xl md:text-4xl font-semibold mb-3 tracking-tight">${escapeHTML(s3.title)}</h2>
                <p class="text-base ${slot3HasImg ? 'text-gray-200' : 'text-gray-500'} mb-8 max-w-md font-light">${escapeHTML(s3.subtitle)}</p>
                <a href="ayuda.html" class="${slot3HasImg ? 'bg-white text-black hover:bg-gray-200' : 'bg-pool-cafe text-white hover:opacity-90'} px-6 py-2.5 rounded-full text-sm font-medium transition">${escapeHTML(s3.btnText || 'Ver políticas de pago')}</a>
            </div>
        </div>

        <!-- CUADRO 4: Producto destacado (abajo derecha) -->
        <div class="relative bg-pool-bg border border-gray-100 text-pool-dark h-[500px] md:h-[550px] rounded-[2rem] overflow-hidden flex flex-col items-center text-center pt-14 px-6 hover:shadow-lg transition duration-500 group cursor-pointer"
             onclick="${editMode ? "openHomeProductPicker('heroSlot4')" : `openPurchaseModal('${p4.img}', '${p4SafeName}', '${p4Price}')`}">
            ${editMode ? `<button type="button" onclick="event.stopPropagation(); openHomeProductPicker('heroSlot4')" class="admin-edit-badge" title="Cambiar producto">${getPencilIconSVG()}</button>` : ''}
            <h2 class="text-3xl md:text-4xl font-semibold mb-2 tracking-tight z-10">${escapeHTML(p4.name)}</h2>
            <p class="text-base text-gray-500 mb-6 font-light z-10">${escapeHTML(p4.desc)}</p>
            <div class="flex space-x-3 z-10">
                <button type="button" class="bg-pool-cafe text-white px-5 py-2 rounded-full text-sm font-medium hover:opacity-90 transition cursor-pointer">Comprar</button>
                <button type="button" class="border border-pool-cafe text-pool-cafe px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-50 transition cursor-pointer">Agregar al carrito</button>
            </div>
            <img src="${p4.img}" alt="${escapeHTML(p4.name)}" class="absolute bottom-0 w-full object-cover h-[55%] transform transition duration-500 group-hover:scale-105 origin-bottom">
        </div>
    `;

    // 2. RENDERIZAR CARRUSEL ("Más para tu hogar")
    const carouselIds = Array.isArray(config.carouselProductIds) && config.carouselProductIds.length > 0
        ? config.carouselProductIds
        : INICIO_INICIAL.carouselProductIds;

    const canDeleteFromCarousel = carouselIds.length > 6;
    const canAddToCarousel = carouselIds.length < 10;

    let carouselHTML = carouselIds.map((prodId, idx) => {
        const p = resolveProductById(products, prodId, idx);
        const formattedPrice = Number(p.price).toLocaleString('es-MX');
        const safeName = String(p.name).replace(/'/g, "\\'");

        const editControls = editMode ? `
            <button type="button"
                    onclick="event.stopPropagation(); removeCarouselProduct(${idx})"
                    class="admin-delete-badge ${canDeleteFromCarousel ? '' : 'is-disabled'}"
                    title="${canDeleteFromCarousel ? 'Quitar del carrusel' : 'Mínimo 6 productos en el carrusel'}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
                </svg>
            </button>
            <button type="button"
                    onclick="event.stopPropagation(); openHomeProductPicker('carouselSwap', ${idx})"
                    class="admin-edit-badge"
                    title="Intercambiar producto">
                ${getPencilIconSVG()}
            </button>
        ` : '';

        return `
            <div class="product-card-pop snap-start flex-none w-80 bg-pool-card rounded-[2rem] p-5 shadow-sm border border-gray-100 flex flex-col text-center relative">
                ${editControls}
                <div class="product-img-box">
                    <div class="product-img-slot"></div>
                    <div class="product-img-float">
                        <img src="${p.img}" alt="${escapeHTML(p.name)}">
                    </div>
                </div>
                <div class="relative z-0 flex flex-col flex-grow">
                    <h3 class="font-semibold text-base">${escapeHTML(p.name)}</h3>
                    <p class="text-sm text-gray-500 mt-1">${escapeHTML(p.desc)}</p>
                    <p class="text-base font-medium mt-3 mb-5">MXN ${formattedPrice}</p>
                    <div class="mt-auto flex space-x-3">
                        <button onclick="openPurchaseModal('${p.img}', '${safeName}', '${formattedPrice}')" class="bg-pool-cafe text-white text-xs px-4 py-2 rounded-full flex-1 hover:opacity-90 transition cursor-pointer">Comprar</button>
                        <button onclick="openPurchaseModal('${p.img}', '${safeName}', '${formattedPrice}')" class="text-pool-cafe border border-pool-cafe text-xs px-4 py-2 rounded-full flex-1 hover:bg-gray-50 transition cursor-pointer">Agregar al carrito</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Tarjeta vacía "+" al final del carrusel (hasta máximo 10)
    if (editMode && canAddToCarousel) {
        carouselHTML += `
            <button type="button"
                    onclick="openHomeProductPicker('carouselAdd')"
                    class="admin-add-card admin-carousel-add-card snap-start"
                    title="Agregar producto existente al carrusel (${carouselIds.length}/10)">
                <div class="flex flex-col items-center gap-3">
                    <span class="admin-add-bubble">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.75" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </span>
                    <span class="text-xs font-medium text-gray-400">${carouselIds.length} / 10 productos</span>
                </div>
            </button>
        `;
    }

    carousel.innerHTML = carouselHTML;
}

function removeCarouselProduct(index) {
    const config = PoolDB.obtenerInicio();
    if (config.carouselProductIds.length <= 6) {
        alert('El carrusel debe conservar al menos 6 productos.');
        return;
    }
    config.carouselProductIds.splice(index, 1);
    PoolDB.guardarInicio(config);
    renderHomePage();
}

function restoreHomeOriginal() {
    PoolDB.restaurarInicioOriginal();
    renderHomePage();
}

function ensureHomeProductPickerModal() {
    if (document.getElementById('home-product-picker-modal')) return;

    const modalHTML = `
        <div id="home-product-picker-modal" class="hidden fixed inset-0 z-[130] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div class="bg-white/95 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
                <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div>
                        <h3 id="home-picker-title" class="text-lg font-semibold text-pool-dark">Seleccionar producto</h3>
                        <p class="text-xs text-gray-500 mt-0.5">Elige un mueble existente de tu base de datos.</p>
                    </div>
                    <button type="button" onclick="closeHomeProductPicker()" class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer">✕</button>
                </div>
                <div id="home-picker-grid" class="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function openHomeProductPicker(type, index = null) {
    ensureHomeProductPickerModal();
    homePickerTarget = { type, index };

    const titleEl = document.getElementById('home-picker-title');
    const gridEl = document.getElementById('home-picker-grid');
    const products = PoolDB.obtenerProductos();

    if (titleEl) {
        titleEl.textContent = type === 'carouselAdd'
            ? 'Agregar producto al carrusel'
            : 'Intercambiar producto';
    }

    if (gridEl) {
        if (products.length === 0) {
            gridEl.innerHTML = `<p class="col-span-full text-sm text-gray-500 text-center py-8">No hay productos en tu inventario. Agrega uno primero en Gestión de inventario.</p>`;
        } else {
            gridEl.innerHTML = products.map(p => `
                <button type="button" onclick="selectHomeProduct(${p.id})" class="flex items-center gap-3.5 p-3 rounded-2xl border border-gray-200 hover:border-pool-cafe hover:bg-[#F5F5F7]/60 transition text-left cursor-pointer">
                    <img src="${p.img}" alt="${escapeHTML(p.name)}" class="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-gray-100">
                    <div class="min-w-0">
                        <p class="font-semibold text-sm text-pool-dark truncate">${escapeHTML(p.name)}</p>
                        <p class="text-xs text-gray-500 truncate">${escapeHTML(p.desc)}</p>
                        <p class="text-xs font-semibold text-pool-cafe mt-1">${formatMXN(p.price)}</p>
                    </div>
                </button>
            `).join('');
        }
    }

    document.getElementById('home-product-picker-modal')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeHomeProductPicker() {
    homePickerTarget = null;
    document.getElementById('home-product-picker-modal')?.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function selectHomeProduct(productId) {
    if (!homePickerTarget) return;
    const config = PoolDB.obtenerInicio();

    if (homePickerTarget.type === 'heroSlot1') {
        config.heroSlot1ProductId = productId;
    } else if (homePickerTarget.type === 'heroSlot4') {
        config.heroSlot4ProductId = productId;
    } else if (homePickerTarget.type === 'carouselSwap') {
        config.carouselProductIds[homePickerTarget.index] = productId;
    } else if (homePickerTarget.type === 'carouselAdd') {
        if (config.carouselProductIds.length < 10) {
            config.carouselProductIds.push(productId);
        }
    }

    PoolDB.guardarInicio(config);
    closeHomeProductPicker();
    renderHomePage();
}

function ensureHomeBannerEditModal() {
    if (document.getElementById('home-banner-edit-modal')) return;

    const modalHTML = `
        <div id="home-banner-edit-modal" class="hidden fixed inset-0 z-[130] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div class="bg-white/95 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-2xl max-w-md w-full p-6 md:p-8 text-left">
                <div class="flex items-center justify-between mb-5">
                    <h3 class="text-lg font-semibold text-pool-dark">Editar cuadro</h3>
                    <button type="button" onclick="closeHomeBannerEditor()" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer">✕</button>
                </div>

                <form onsubmit="saveHomeBannerEditor(event)" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-pool-dark mb-1.5">Título</label>
                        <input type="text" id="home-banner-title" required class="w-full bg-[#F5F5F7]/70 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-pool-cafe">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-pool-dark mb-1.5">Descripción / Texto</label>
                        <textarea id="home-banner-subtitle" rows="3" required class="w-full bg-[#F5F5F7]/70 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-pool-cafe"></textarea>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-pool-dark mb-1.5">Texto del botón</label>
                        <input type="text" id="home-banner-btn" required class="w-full bg-[#F5F5F7]/70 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-pool-cafe">
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-1.5">
                            <label class="block text-xs font-semibold text-pool-dark">Imagen de fondo (opcional)</label>
                            <button type="button" onclick="clearHomeBannerImage()" class="text-[11px] font-medium text-red-500 hover:underline cursor-pointer">Quitar imagen</button>
                        </div>
                        <input type="file" id="home-banner-file" accept="image/*" onchange="handleHomeBannerFileUpload(this)" class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 cursor-pointer mb-2">
                        <input type="url" id="home-banner-url" placeholder="O pega un enlace de imagen..." class="w-full bg-[#F5F5F7]/70 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:border-pool-cafe">
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button type="button" onclick="closeHomeBannerEditor()" class="flex-1 py-2.5 px-4 rounded-full border border-pool-cafe text-pool-cafe text-sm font-semibold hover:bg-gray-50 transition cursor-pointer">
                            Cancelar
                        </button>
                        <button type="submit" style="border-radius: 9999px; width: auto; padding: 10px 20px;" class="flex-1 bg-pool-cafe text-white text-sm font-semibold hover:opacity-90 transition shadow-md cursor-pointer">
                            Guardar cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function openHomeBannerEditor(slotKey) {
    ensureHomeBannerEditModal();
    homeBannerTarget = slotKey;
    homeBannerUploadedImg = '';

    const config = PoolDB.obtenerInicio();
    const data = config[slotKey];

    document.getElementById('home-banner-title').value = data.title || '';
    document.getElementById('home-banner-subtitle').value = data.subtitle || '';
    document.getElementById('home-banner-btn').value = data.btnText || '';
    document.getElementById('home-banner-url').value = data.img && !data.img.startsWith('data:') ? data.img : '';
    document.getElementById('home-banner-file').value = '';
    if (data.img && data.img.startsWith('data:')) {
        homeBannerUploadedImg = data.img;
    }

    document.getElementById('home-banner-edit-modal')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeHomeBannerEditor() {
    homeBannerTarget = null;
    homeBannerUploadedImg = '';
    document.getElementById('home-banner-edit-modal')?.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function clearHomeBannerImage() {
    homeBannerUploadedImg = '';
    const urlInput = document.getElementById('home-banner-url');
    const fileInput = document.getElementById('home-banner-file');
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';
}

function handleHomeBannerFileUpload(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const maxWidth = 800;
            const scale = img.width > maxWidth ? maxWidth / img.width : 1;
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            homeBannerUploadedImg = canvas.toDataURL('image/jpeg', 0.8);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function saveHomeBannerEditor(e) {
    e.preventDefault();
    if (!homeBannerTarget) return;

    const config = PoolDB.obtenerInicio();
    const urlVal = document.getElementById('home-banner-url').value.trim();

    config[homeBannerTarget] = {
        title: document.getElementById('home-banner-title').value.trim(),
        subtitle: document.getElementById('home-banner-subtitle').value.trim(),
        btnText: document.getElementById('home-banner-btn').value.trim(),
        img: homeBannerUploadedImg || urlVal || ''
    };

    PoolDB.guardarInicio(config);
    closeHomeBannerEditor();
    renderHomePage();
}

function initCarousel() {
    const carousel = document.getElementById('carousel');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    if (!carousel || !btnLeft || !btnRight) return;

    const scrollAmount = 344;

    function startAutoScroll() {
        if (isHomeEditMode()) return; // En modo edición no se mueve solo
        clearInterval(carouselAutoScrollInterval);
        carouselAutoScrollInterval = setInterval(() => {
            if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 5) {
                carousel.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }, 3000);
    }

    function stopAutoScroll() {
        clearInterval(carouselAutoScrollInterval);
    }

    function manualScroll(direction) {
        stopAutoScroll();
        if (direction === 'prev') {
            carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 5) {
                carousel.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }
        startAutoScroll();
    }

    btnLeft.addEventListener('click', () => manualScroll('prev'));
    btnRight.addEventListener('click', () => manualScroll('next'));
    carousel.addEventListener('mouseenter', stopAutoScroll);
    carousel.addEventListener('mouseleave', startAutoScroll);
    carousel.addEventListener('touchstart', stopAutoScroll);
    carousel.addEventListener('touchend', startAutoScroll);
    startAutoScroll();
}

/* ==========================================================================
   8. GESTIÓN DE INVENTARIO (ELIMINAR "-" Y AGREGAR "+" ESTILO APPLE)
   ========================================================================== */
let productIdToDelete = null;
let newProductImages = [];
let activeNewProductImgIndex = 0;

function ensureDeleteModal() {
    if (document.getElementById('delete-confirm-modal')) return;

    const modalHTML = `
        <div id="delete-confirm-modal" class="hidden fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div class="bg-white/95 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-2xl max-w-sm w-full p-6 text-center">
                <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-pool-dark mb-2">¿Eliminar producto?</h3>
                <p class="text-sm text-gray-500 mb-6">
                    Estás a punto de quitar <strong id="delete-product-name" class="text-pool-dark"></strong> del inventario. Esta acción no se puede deshacer.
                </p>
                <div class="flex gap-3">
                    <button type="button" onclick="closeDeleteModal()" class="flex-1 py-2.5 px-4 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer">
                        Cancelar
                    </button>
                    <button type="button" onclick="confirmDeleteProduct()" class="flex-1 py-2.5 px-4 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition cursor-pointer">
                        Sí, eliminar
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function openDeleteModal(id, name) {
    ensureDeleteModal();
    productIdToDelete = id;
    const nameEl = document.getElementById('delete-product-name');
    const modal = document.getElementById('delete-confirm-modal');
    if (nameEl) nameEl.textContent = name;
    if (modal) modal.classList.remove('hidden');
}

function closeDeleteModal() {
    productIdToDelete = null;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) modal.classList.add('hidden');
}

function confirmDeleteProduct() {
    if (productIdToDelete === null) return;
    const updated = PoolDB.obtenerProductos().filter(p => p.id !== productIdToDelete);
    PoolDB.guardarProductos(updated);
    closeDeleteModal();
    applyCatalogFilters();
}

function restoreDefaultInventory() {
    PoolDB.restaurarProductosIniciales();
    applyCatalogFilters();
}

function renderAddProductCard() {
    return `
        <button type="button"
                onclick="openAddProductModal()"
                class="admin-add-card"
                title="Agregar nuevo producto"
                aria-label="Agregar nuevo producto al inventario">
            <span class="admin-add-bubble">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.75" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            </span>
        </button>
    `;
}

function syncAddModalSelects() {
    const filtros = PoolDB.obtenerFiltros();

    const fillSelect = (selectId, items) => {
        const el = document.getElementById(selectId);
        if (!el) return;
        const optsHTML = [
            `<option value="">Sin especificar (no mostrar)</option>`,
            ...items.map((item, idx) => `<option value="${escapeHTML(item.value)}" ${idx === 0 ? 'selected' : ''}>${escapeHTML(item.label)}</option>`),
            `<option value="__otro__">Otro (especificar...)</option>`
        ].join('');
        el.innerHTML = optsHTML;
    };

    fillSelect('new-prod-category', filtros.categories);
    fillSelect('new-prod-material', filtros.materials);
    fillSelect('new-prod-color', filtros.colors);
    fillSelect('new-prod-availability', filtros.availabilities);
}

function ensureAddProductModal() {
    if (document.getElementById('add-product-modal')) {
        syncAddModalSelects();
        return;
    }

    const modalHTML = `
        <div id="add-product-modal" class="fixed inset-0 z-[120] flex items-center justify-center hidden">
            <div class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity opacity-0" id="add-product-backdrop" onclick="closeAddProductModal()"></div>

            <div class="relative w-[95vw] md:w-[90vw] max-w-5xl h-[90vh] md:h-[82vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row transform scale-95 transition-all duration-300 opacity-0" id="add-product-content">

                <button type="button" onclick="closeAddProductModal()" class="absolute top-6 right-6 z-50 bg-white/80 hover:bg-gray-100 text-gray-600 p-2.5 rounded-full transition shadow-sm focus:outline-none backdrop-blur-md cursor-pointer">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                <!-- COLUMNA IZQUIERDA: Galería de múltiples imágenes -->
                <div class="w-full md:w-1/2 h-[38%] md:h-full relative flex-shrink-0 bg-[#F5F5F7] flex flex-col justify-between overflow-hidden">
                    <div id="add-img-main-empty" onclick="document.getElementById('new-prod-files').click()" class="absolute inset-0 flex flex-col items-center justify-center text-center p-8 cursor-pointer hover:bg-gray-200/40 transition">
                        <div class="w-16 h-16 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-pool-cafe mb-4">
                            <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                        </div>
                        <p class="text-base font-semibold text-pool-dark">Subir fotos del mueble</p>
                        <p class="text-xs text-gray-500 mt-1 max-w-xs">Puedes seleccionar varias imágenes a la vez. La primera será la portada en el catálogo.</p>
                    </div>

                    <img id="add-img-main-preview" src="" alt="Vista previa" class="hidden absolute inset-0 w-full h-full object-cover">

                    <input type="file" id="new-prod-files" accept="image/*" multiple class="hidden" onchange="handleMultipleImagesUpload(this)">

                    <!-- Barra inferior flotante de miniaturas -->
                    <div class="relative z-20 mt-auto p-4">
                        <div class="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-2.5 shadow-lg flex items-center gap-2 overflow-x-auto no-scrollbar">
                            <div id="add-img-thumbs" class="flex items-center gap-2"></div>
                            <button type="button" onclick="document.getElementById('new-prod-files').click()" title="Agregar más fotos" class="w-12 h-12 rounded-xl border-2 border-dashed border-gray-300 hover:border-pool-cafe text-gray-500 hover:text-pool-cafe flex items-center justify-center flex-shrink-0 transition cursor-pointer bg-white/60">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                            </button>
                            <div class="flex items-center gap-1.5 ml-auto pl-2 border-l border-gray-300/60 flex-shrink-0">
                                <input type="url" id="new-prod-url-input" placeholder="O pega URL..." class="w-28 sm:w-36 bg-white/80 border border-gray-300 rounded-xl px-2.5 py-1.5 text-[11px] outline-none focus:border-pool-cafe">
                                <button type="button" onclick="addProductImageByUrl()" class="bg-pool-dark text-white text-[11px] font-medium px-2.5 py-1.5 rounded-xl hover:opacity-90 transition cursor-pointer">+</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- COLUMNA DERECHA: Formulario con scroll + Barra fija inferior -->
                <form id="add-product-form" onsubmit="handleAddProductSubmit(event)" class="w-full md:w-1/2 h-[62%] md:h-full bg-white flex flex-col relative">
                    <div class="flex-1 overflow-y-auto p-8 md:p-10 no-scrollbar pb-6 space-y-6 text-left">
                        <div>
                            <p class="text-xs text-pool-cafe font-bold tracking-widest uppercase mb-1.5">Inventario</p>
                            <h2 class="text-3xl font-semibold tracking-tight text-pool-dark">Nuevo producto</h2>
                            <p class="text-sm text-gray-500 font-light mt-1">Configura las características y fotos del mueble.</p>
                        </div>

                        <!-- Nombre y Precio -->
                        <div class="space-y-4">
                            <div>
                                <label for="new-prod-name" class="block text-xs font-semibold text-pool-dark mb-1.5">Nombre del mueble</label>
                                <input type="text" id="new-prod-name" required placeholder="Ej. Sofá Modular Roma" class="w-full bg-[#F5F5F7]/70 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-pool-cafe transition">
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label for="new-prod-desc" class="block text-xs font-semibold text-pool-dark mb-1.5">Descripción corta</label>
                                    <input type="text" id="new-prod-desc" required placeholder="Ej. Lino beige • 3 Plazas" class="w-full bg-[#F5F5F7]/70 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-pool-cafe transition">
                                </div>
                                <div>
                                    <label for="new-prod-price" class="block text-xs font-semibold text-pool-dark mb-1.5">Precio base (MXN)</label>
                                    <input type="number" id="new-prod-price" required min="100" step="50" placeholder="Ej. 12500" oninput="updateAddModalPricePreview(this.value)" class="w-full bg-[#F5F5F7]/70 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-pool-cafe transition">
                                </div>
                            </div>
                        </div>

                        <!-- Categoría -->
                        <div>
                            <label for="new-prod-category" class="block text-xs font-semibold text-pool-dark mb-1.5">Categoría</label>
                            <select id="new-prod-category" onchange="toggleOtherInput(this, 'new-prod-category-other')" class="w-full bg-[#F5F5F7]/70 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-pool-cafe transition cursor-pointer"></select>
                            <input type="text" id="new-prod-category-other" placeholder="Escribe la nueva categoría..." class="hidden mt-2.5 w-full bg-white border border-pool-cafe/50 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pool-cafe transition">
                        </div>

                        <!-- Material -->
                        <div>
                            <label for="new-prod-material" class="block text-xs font-semibold text-pool-dark mb-1.5">Material</label>
                            <select id="new-prod-material" onchange="toggleOtherInput(this, 'new-prod-material-other')" class="w-full bg-[#F5F5F7]/70 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-pool-cafe transition cursor-pointer"></select>
                            <input type="text" id="new-prod-material-other" placeholder="Escribe el nuevo material..." class="hidden mt-2.5 w-full bg-white border border-pool-cafe/50 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pool-cafe transition">
                        </div>

                        <!-- Color y Disponibilidad -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="new-prod-color" class="block text-xs font-semibold text-pool-dark mb-1.5">Color principal</label>
                                <select id="new-prod-color" onchange="toggleOtherInput(this, 'new-prod-color-other')" class="w-full bg-[#F5F5F7]/70 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-pool-cafe transition cursor-pointer"></select>
                                <input type="text" id="new-prod-color-other" placeholder="Escribe el color..." class="hidden mt-2.5 w-full bg-white border border-pool-cafe/50 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pool-cafe transition">
                            </div>

                            <div>
                                <label for="new-prod-availability" class="block text-xs font-semibold text-pool-dark mb-1.5">Disponibilidad</label>
                                <select id="new-prod-availability" onchange="toggleOtherInput(this, 'new-prod-availability-other')" class="w-full bg-[#F5F5F7]/70 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-pool-cafe transition cursor-pointer"></select>
                                <input type="text" id="new-prod-availability-other" placeholder="Ej. 10 días hábiles..." class="hidden mt-2.5 w-full bg-white border border-pool-cafe/50 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-pool-cafe transition">
                            </div>
                        </div>

                        <!-- APARTADOS PERSONALIZADOS (CREAR Y ELIMINAR) -->
                        <div class="pt-4 border-t border-gray-100">
                            <div class="flex items-center justify-between mb-3">
                                <div>
                                    <h3 class="text-sm font-semibold text-pool-dark">Apartados personalizados</h3>
                                    <p class="text-[11px] text-gray-500 font-light">Agrega menús extra para que el cliente elija al comprar (ej. Patas, Cojines).</p>
                                </div>
                                <button type="button" onclick="addCustomSectionBlock()" class="px-3.5 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-gray-200 text-pool-cafe text-xs font-semibold transition cursor-pointer flex-shrink-0">
                                    + Agregar apartado
                                </button>
                            </div>
                            <div id="custom-sections-builder" class="space-y-4"></div>
                        </div>
                    </div>

                    <!-- BARRA INFERIOR FIJA (Botones tipo cápsula) -->
                    <div class="w-full border-t border-gray-100 p-6 md:px-10 bg-white/95 backdrop-blur-md flex-shrink-0 z-20">
                        <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div class="w-full sm:w-auto text-left">
                                <p id="add-modal-price-preview" class="text-xl font-semibold tracking-tight text-pool-dark">Precio: $0 MXN</p>
                                <p id="add-modal-advance-preview" class="text-xs text-gray-500 mt-1">Anticipo 80%: $0 MXN</p>
                            </div>
                            <div class="w-full sm:w-auto flex flex-col xl:flex-row gap-3">
                                <button type="button" onclick="closeAddProductModal()" class="w-full xl:w-auto bg-white text-pool-cafe px-6 py-3 rounded-full text-sm font-semibold border-[1.5px] border-pool-cafe hover:bg-gray-50 transition focus:outline-none cursor-pointer">
                                    Cancelar
                                </button>
                                <button type="submit" style="border-radius: 9999px; width: auto; padding: 12px 24px;" class="w-full xl:w-auto bg-pool-cafe text-white text-sm font-semibold hover:opacity-90 transition shadow-md focus:outline-none cursor-pointer">
                                    Guardar producto
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    syncAddModalSelects();
}

function addCustomSectionBlock() {
    const container = document.getElementById('custom-sections-builder');
    if (!container) return;

    const sectionId = 'custom-block-' + Date.now();
    const blockHTML = `
        <div id="${sectionId}" class="custom-section-block bg-[#F5F5F7]/75 border border-gray-200/80 rounded-2xl p-4 space-y-3">
            <div class="flex items-center gap-2">
                <input type="text" class="custom-sec-title flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-pool-dark outline-none focus:border-pool-cafe" placeholder="Nombre del apartado (ej. Tipo de patas)" required>
                <button type="button" onclick="document.getElementById('${sectionId}').remove()" title="Eliminar apartado" class="w-8 h-8 rounded-full bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 border border-gray-200 flex items-center justify-center transition cursor-pointer flex-shrink-0">
                    ✕
                </button>
            </div>
            <div class="custom-sec-options space-y-2">
                ${getCustomOptionRowHTML()}
            </div>
            <button type="button" onclick="addCustomOptionRow('${sectionId}')" class="text-[11px] font-semibold text-pool-cafe hover:underline cursor-pointer">
                + Agregar otra opción
            </button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', blockHTML);
}

function getCustomOptionRowHTML() {
    return `
        <div class="custom-opt-row flex items-center gap-2">
            <input type="text" class="custom-opt-label flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-pool-cafe" placeholder="Opción (ej. Madera de roble)" required>
            <input type="number" class="custom-opt-extra w-24 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-pool-cafe" placeholder="+$ Extra" min="0" step="50" value="0">
            <button type="button" onclick="this.closest('.custom-opt-row').remove()" title="Quitar opción" class="text-gray-400 hover:text-red-500 text-xs font-bold px-1.5 cursor-pointer">✕</button>
        </div>
    `;
}

function addCustomOptionRow(sectionId) {
    const block = document.getElementById(sectionId);
    const optionsContainer = block?.querySelector('.custom-sec-options');
    if (optionsContainer) {
        optionsContainer.insertAdjacentHTML('beforeend', getCustomOptionRowHTML());
    }
}

function collectCustomSectionsFromForm() {
    const blocks = document.querySelectorAll('#custom-sections-builder .custom-section-block');
    const sections = [];

    blocks.forEach(block => {
        const title = block.querySelector('.custom-sec-title')?.value.trim();
        if (!title) return;

        const options = [];
        block.querySelectorAll('.custom-opt-row').forEach(row => {
            const label = row.querySelector('.custom-opt-label')?.value.trim();
            const extra = Number(row.querySelector('.custom-opt-extra')?.value) || 0;
            if (label) options.push({ label, extra });
        });

        if (options.length > 0) {
            sections.push({ title, options });
        }
    });

    return sections;
}

function toggleOtherInput(selectEl, otherInputId) {
    const otherInput = document.getElementById(otherInputId);
    if (!otherInput) return;
    if (selectEl.value === '__otro__') {
        otherInput.classList.remove('hidden');
        otherInput.required = true;
        otherInput.focus();
    } else {
        otherInput.classList.add('hidden');
        otherInput.required = false;
        otherInput.value = '';
    }
}

function updateAddModalPricePreview(val) {
    const num = Number(val) || 0;
    const priceEl = document.getElementById('add-modal-price-preview');
    const advEl = document.getElementById('add-modal-advance-preview');
    if (priceEl) priceEl.textContent = `Precio: ${formatMXN(num)}`;
    if (advEl) advEl.textContent = `Anticipo 80%: ${formatMXN(Math.round(num * CONFIG.ANTICIPO_PORCENTAJE))}`;
}

function renderNewProductGallery() {
    const emptyState = document.getElementById('add-img-main-empty');
    const mainPreview = document.getElementById('add-img-main-preview');
    const thumbsContainer = document.getElementById('add-img-thumbs');
    if (!thumbsContainer || !mainPreview || !emptyState) return;

    if (newProductImages.length === 0) {
        emptyState.classList.remove('hidden');
        mainPreview.classList.add('hidden');
        mainPreview.src = '';
        thumbsContainer.innerHTML = '';
        activeNewProductImgIndex = 0;
        return;
    }

    if (activeNewProductImgIndex >= newProductImages.length) {
        activeNewProductImgIndex = newProductImages.length - 1;
    }

    emptyState.classList.add('hidden');
    mainPreview.classList.remove('hidden');
    mainPreview.src = newProductImages[activeNewProductImgIndex];

    thumbsContainer.innerHTML = newProductImages.map((src, idx) => {
        const isActive = idx === activeNewProductImgIndex;
        return `
            <div class="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 transition ${isActive ? 'border-pool-cafe scale-105' : 'border-transparent opacity-80 hover:opacity-100'}" onclick="selectNewProductImage(${idx})">
                <img src="${src}" alt="Foto ${idx + 1}" class="w-full h-full object-cover">
                <button type="button" onclick="event.stopPropagation(); removeNewProductImage(${idx})" title="Quitar foto" class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/65 hover:bg-red-600 text-white text-[9px] flex items-center justify-center cursor-pointer">✕</button>
            </div>
        `;
    }).join('');
}

function selectNewProductImage(idx) {
    activeNewProductImgIndex = idx;
    renderNewProductGallery();
}

function removeNewProductImage(idx) {
    newProductImages.splice(idx, 1);
    if (activeNewProductImgIndex >= newProductImages.length) {
        activeNewProductImgIndex = Math.max(0, newProductImages.length - 1);
    }
    renderNewProductGallery();
}

function handleMultipleImagesUpload(input) {
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxWidth = 600;
                const scale = img.width > maxWidth ? maxWidth / img.width : 1;
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                newProductImages.push(canvas.toDataURL('image/jpeg', 0.8));
                activeNewProductImgIndex = newProductImages.length - 1;
                renderNewProductGallery();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    input.value = '';
}

function addProductImageByUrl() {
    const urlInput = document.getElementById('new-prod-url-input');
    if (!urlInput) return;
    const url = urlInput.value.trim();
    if (!url) return;
    newProductImages.push(url);
    activeNewProductImgIndex = newProductImages.length - 1;
    urlInput.value = '';
    renderNewProductGallery();
}

function openAddProductModal() {
    ensureAddProductModal();
    syncAddModalSelects();
    newProductImages = [];
    activeNewProductImgIndex = 0;

    const form = document.getElementById('add-product-form');
    if (form) form.reset();

    const customBuilder = document.getElementById('custom-sections-builder');
    if (customBuilder) customBuilder.innerHTML = '';

    ['new-prod-category-other', 'new-prod-material-other', 'new-prod-color-other', 'new-prod-availability-other'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            el.required = false;
            el.value = '';
        }
    });

    updateAddModalPricePreview(0);
    renderNewProductGallery();

    const modal = document.getElementById('add-product-modal');
    const backdrop = document.getElementById('add-product-backdrop');
    const content = document.getElementById('add-product-content');
    if (!modal) return;

    modal.classList.remove('hidden');
    setTimeout(() => {
        if (backdrop) backdrop.classList.remove('opacity-0');
        if (content) {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }
    }, 10);
    document.body.style.overflow = 'hidden';
}

function closeAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    const backdrop = document.getElementById('add-product-backdrop');
    const content = document.getElementById('add-product-content');
    if (!modal) return;

    if (backdrop) backdrop.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
    document.body.style.overflow = 'auto';
}

function getSelectOrOtherValue(selectId, otherInputId) {
    const select = document.getElementById(selectId);
    const other = document.getElementById(otherInputId);
    if (!select) return '';
    if (select.value === '__otro__') {
        return other ? other.value.trim() : '';
    }
    return select.value;
}

function handleAddProductSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('new-prod-name').value.trim();
    const desc = document.getElementById('new-prod-desc').value.trim();
    const price = Number(document.getElementById('new-prod-price').value) || 0;
    const category = getSelectOrOtherValue('new-prod-category', 'new-prod-category-other');
    const material = getSelectOrOtherValue('new-prod-material', 'new-prod-material-other');
    const color = getSelectOrOtherValue('new-prod-color', 'new-prod-color-other');
    const availability = getSelectOrOtherValue('new-prod-availability', 'new-prod-availability-other');
    const customSections = collectCustomSectionsFromForm();

    const fallbackImg = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600";
    const imagesList = newProductImages.length > 0 ? [...newProductImages] : [fallbackImg];

    const productos = PoolDB.obtenerProductos();
    productos.push({
        id: Date.now(),
        img: imagesList[0],
        images: imagesList,
        name,
        desc,
        price,
        category,
        material,
        color,
        availability,
        customSections
    });

    PoolDB.guardarProductos(productos);
    closeAddProductModal();
    applyCatalogFilters();
}

/* ==========================================================================
   9. FILTROS DINÁMICOS Y EDITABLES EN MODO INVENTARIO (PÍLDORA LATERAL)
   ========================================================================== */
const catalogFilterState = {
    categories: [],
    materials: [],
    colors: [],
    availabilities: [],
    maxPrice: 30000,
    searchQuery: ''
};

function renderSidebarFilters() {
    const sidebarBox = document.querySelector('aside > div');
    if (!sidebarBox) return;

    const filtros = PoolDB.obtenerFiltros();
    const editMode = isInventoryMode();

    const renderCheckboxList = (sectionKey, items, activeArray, includeAllOption = false) => {
        let html = '';

        if (includeAllOption) {
            const isAllChecked = activeArray.length === 0;
            html += `
                <label class="flex items-center space-x-3 cursor-pointer group p-1.5 rounded-lg hover:bg-gray-50 transition">
                    <input type="checkbox" class="w-4 h-4 accent-pool-cafe rounded border-gray-300" ${isAllChecked ? 'checked' : ''} onchange="toggleAllCategoriesFilter(this.checked)">
                    <span class="text-sm font-medium text-pool-dark group-hover:text-black transition">Todos los productos</span>
                </label>
            `;
        }

        html += items.map((item, idx) => {
            const normVal = normalizeText(item.value);
            const isChecked = activeArray.includes(normVal);
            const deleteBtn = editMode ? `
                <button type="button" onclick="removeFilterOption('${sectionKey}', ${idx})" title="Quitar filtro" class="w-5 h-5 rounded-full bg-gray-100 hover:bg-red-500 hover:text-white text-gray-500 text-[10px] font-bold flex items-center justify-center transition cursor-pointer flex-shrink-0">
                    ✕
                </button>
            ` : '';

            return `
                <div class="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition">
                    <label class="flex items-center space-x-3 cursor-pointer group flex-1 min-w-0">
                        <input type="checkbox" class="w-4 h-4 accent-pool-cafe rounded border-gray-300 flex-shrink-0" ${isChecked ? 'checked' : ''} onchange="toggleFilterCheckbox('${sectionKey}', '${escapeHTML(item.value)}', this.checked)">
                        <span class="text-sm ${isChecked ? 'font-medium text-pool-dark' : 'text-gray-500'} group-hover:text-black transition truncate">${escapeHTML(item.label)}</span>
                    </label>
                    ${deleteBtn}
                </div>
            `;
        }).join('');

        if (editMode) {
            html += `
                <div class="mt-2 pt-1">
                    <button type="button" onclick="toggleInlineFilterForm('${sectionKey}')" class="text-[11px] font-semibold text-pool-cafe hover:underline cursor-pointer px-1.5">
                        + Agregar opción
                    </button>
                    <div id="add-filter-form-${sectionKey}" class="hidden mt-2 flex items-center gap-1.5 px-1">
                        <input type="text" id="add-filter-input-${sectionKey}" placeholder="Nueva opción..." onkeydown="if(event.key==='Enter'){event.preventDefault();addFilterOption('${sectionKey}');}" class="flex-1 min-w-0 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-pool-cafe">
                        <button type="button" onclick="addFilterOption('${sectionKey}')" class="bg-pool-cafe text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl hover:opacity-90 transition cursor-pointer">+</button>
                    </div>
                </div>
            `;
        }

        return html;
    };

    const colorsHTML = filtros.colors.map((c, idx) => {
        const normVal = normalizeText(c.value);
        const isSelected = catalogFilterState.colors.includes(normVal);
        const ringClass = isSelected ? 'ring-2 ring-offset-2 ring-pool-cafe scale-110' : '';
        const deleteBadge = editMode ? `
            <button type="button" onclick="event.stopPropagation(); removeFilterOption('colors', ${idx})" title="Eliminar color ${escapeHTML(c.label)}" class="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-gray-500/90 hover:bg-red-600 text-white text-[10px] leading-none font-bold flex items-center justify-center shadow cursor-pointer transition">
                −
            </button>
        ` : '';

        return `
            <div class="relative inline-flex">
                <button type="button"
                        onclick="toggleColorFilter('${escapeHTML(c.value)}')"
                        style="background-color: ${escapeHTML(c.hex)};"
                        class="w-8 h-8 rounded-full border border-gray-300 shadow-inner transition hover:scale-110 cursor-pointer ${ringClass}"
                        title="${escapeHTML(c.label)}"></button>
                ${deleteBadge}
            </div>
        `;
    }).join('');

    const addColorBtnHTML = editMode ? `
        <button type="button" onclick="toggleInlineFilterForm('colors')" title="Agregar nuevo color" class="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 hover:border-pool-cafe text-gray-500 hover:text-pool-cafe flex items-center justify-center text-sm font-bold transition cursor-pointer bg-white/70">
            +
        </button>
    ` : '';

    const addColorFormHTML = editMode ? `
        <div id="add-filter-form-colors" class="hidden mt-3 p-2.5 bg-white/90 border border-gray-200 rounded-2xl space-y-2">
            <div class="flex items-center gap-2">
                <input type="color" id="add-color-hex" value="#C27D52" title="Elige el tono" class="w-8 h-8 rounded-full border border-gray-300 cursor-pointer bg-transparent p-0.5 flex-shrink-0">
                <input type="text" id="add-color-name" placeholder="Nombre (ej. Terracota)" onkeydown="if(event.key==='Enter'){event.preventDefault();addColorFilterOption();}" class="flex-1 min-w-0 bg-[#F5F5F7]/70 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:bg-white focus:border-pool-cafe">
            </div>
            <button type="button" onclick="addColorFilterOption()" class="w-full bg-pool-cafe text-white text-[11px] font-semibold py-1.5 rounded-full hover:opacity-90 transition cursor-pointer">
                Agregar color
            </button>
        </div>
    ` : '';

    const restoreFiltersBtn = editMode ? `
        <button type="button" onclick="restoreDefaultFilters()" class="text-[10px] font-medium text-gray-400 hover:text-pool-cafe uppercase tracking-wider transition cursor-pointer">
            Restaurar
        </button>
    ` : '';

    sidebarBox.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-2xl font-semibold tracking-tight text-pool-dark">Filtros</h1>
                ${editMode ? '<p class="text-[10px] text-pool-cafe font-semibold uppercase tracking-wider mt-0.5">Modo edición</p>' : ''}
            </div>
            <div class="flex items-center gap-3">
                ${restoreFiltersBtn}
                <button type="button" onclick="resetCatalogFilters()" class="text-[11px] font-medium text-pool-cafe hover:text-black uppercase tracking-wider transition cursor-pointer">Limpiar</button>
            </div>
        </div>

        <!-- Categoría -->
        <div class="mb-8">
            <h3 class="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest">Categoría</h3>
            <div class="space-y-1.5">
                ${renderCheckboxList('categories', filtros.categories, catalogFilterState.categories, true)}
            </div>
        </div>

        <!-- Material -->
        <div class="border-t border-gray-100 pt-6 mb-8">
            <h3 class="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest">Material</h3>
            <div class="space-y-1.5">
                ${renderCheckboxList('materials', filtros.materials, catalogFilterState.materials, false)}
            </div>
        </div>

        <!-- Color -->
        <div class="border-t border-gray-100 pt-6 mb-8">
            <h3 class="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest">Color</h3>
            <div class="flex flex-wrap items-center gap-3 px-1.5">
                ${colorsHTML}
                ${addColorBtnHTML}
            </div>
            ${addColorFormHTML}
        </div>

        <!-- Disponibilidad -->
        <div class="border-t border-gray-100 pt-6 mb-8">
            <h3 class="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest">Disponibilidad</h3>
            <div class="space-y-1.5">
                ${renderCheckboxList('availabilities', filtros.availabilities, catalogFilterState.availabilities, false)}
            </div>
        </div>

        <!-- Precio -->
        <div class="border-t border-gray-100 pt-6">
            <div class="flex justify-between items-center mb-4 px-1.5">
                <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Precio Máximo</h3>
                <span id="price-display" class="text-xs text-pool-dark font-semibold bg-gray-100 px-2 py-1 rounded-md">Hasta $${catalogFilterState.maxPrice.toLocaleString('es-MX')}</span>
            </div>
            <div class="px-1.5">
                <input type="range" min="2000" max="30000" step="100" value="${catalogFilterState.maxPrice}" class="w-full accent-pool-cafe cursor-pointer" oninput="updatePrice(this.value)">
                <div class="flex justify-between text-[10px] text-gray-400 mt-2 font-medium">
                    <span>$2,000</span>
                    <span>$30,000+</span>
                </div>
            </div>
        </div>
    `;
}

function toggleInlineFilterForm(sectionKey) {
    const formEl = document.getElementById(`add-filter-form-${sectionKey}`);
    if (!formEl) return;
    formEl.classList.toggle('hidden');
    if (!formEl.classList.contains('hidden')) {
        const input = formEl.querySelector('input[type="text"]');
        if (input) input.focus();
    }
}

function addFilterOption(sectionKey) {
    const input = document.getElementById(`add-filter-input-${sectionKey}`);
    if (!input) return;
    const label = input.value.trim();
    if (!label) return;

    const filtros = PoolDB.obtenerFiltros();
    if (!filtros[sectionKey]) return;

    filtros[sectionKey].push({ label, value: label });
    PoolDB.guardarFiltros(filtros);

    renderSidebarFilters();
    syncAddModalSelects();
}

function addColorFilterOption() {
    const nameInput = document.getElementById('add-color-name');
    const hexInput = document.getElementById('add-color-hex');
    if (!nameInput || !hexInput) return;

    const label = nameInput.value.trim();
    const hex = hexInput.value || '#3E2723';
    if (!label) {
        nameInput.focus();
        return;
    }

    const filtros = PoolDB.obtenerFiltros();
    filtros.colors.push({ label, value: label, hex });
    PoolDB.guardarFiltros(filtros);

    renderSidebarFilters();
    syncAddModalSelects();
}

function removeFilterOption(sectionKey, idx) {
    const filtros = PoolDB.obtenerFiltros();
    if (!filtros[sectionKey] || !filtros[sectionKey][idx]) return;

    const removed = filtros[sectionKey].splice(idx, 1)[0];
    PoolDB.guardarFiltros(filtros);

    const normRemoved = normalizeText(removed.value);
    if (Array.isArray(catalogFilterState[sectionKey])) {
        catalogFilterState[sectionKey] = catalogFilterState[sectionKey].filter(v => v !== normRemoved);
    }

    renderSidebarFilters();
    syncAddModalSelects();
    applyCatalogFilters();
}

function restoreDefaultFilters() {
    PoolDB.restaurarFiltrosIniciales();
    resetCatalogFilters();
    syncAddModalSelects();
}

function toggleAllCategoriesFilter(checked) {
    if (checked) {
        catalogFilterState.categories = [];
    }
    renderSidebarFilters();
    applyCatalogFilters();
}

function toggleFilterCheckbox(sectionKey, value, checked) {
    const normVal = normalizeText(value);
    const list = catalogFilterState[sectionKey];
    if (!Array.isArray(list)) return;

    if (checked) {
        if (!list.includes(normVal)) list.push(normVal);
    } else {
        catalogFilterState[sectionKey] = list.filter(v => v !== normVal);
    }

    renderSidebarFilters();
    applyCatalogFilters();
}

function toggleColorFilter(value) {
    const normVal = normalizeText(value);
    if (catalogFilterState.colors.includes(normVal)) {
        catalogFilterState.colors = catalogFilterState.colors.filter(c => c !== normVal);
    } else {
        catalogFilterState.colors.push(normVal);
    }
    renderSidebarFilters();
    applyCatalogFilters();
}

function renderProductCard(p) {
    const formattedPrice = Number(p.price).toLocaleString('es-MX');
    const safeName = String(p.name).replace(/'/g, "\\'");

    const deleteBubbleHTML = isInventoryMode() ? `
        <button type="button"
                onclick="event.stopPropagation(); openDeleteModal(${p.id}, '${safeName}')"
                class="admin-delete-badge"
                title="Eliminar ${escapeHTML(p.name)}"
                aria-label="Eliminar ${escapeHTML(p.name)}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
            </svg>
        </button>
    ` : '';

    return `
        <div class="product-card-pop relative w-full bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 flex flex-col text-center">
            ${deleteBubbleHTML}
            <div class="product-img-box">
                <div class="product-img-slot"></div>
                <div class="product-img-float">
                    <img src="${p.img}" alt="${escapeHTML(p.name)}">
                </div>
            </div>
            <div class="relative z-0 flex flex-col flex-grow">
                <h3 class="font-semibold text-sm tracking-tight">${escapeHTML(p.name)}</h3>
                <p class="text-xs text-gray-500 mt-1 font-light">${escapeHTML(p.desc)}</p>
                <p class="text-sm font-medium mt-3 mb-5">MXN ${formattedPrice}</p>
                <div class="mt-auto flex space-x-2">
                    <button onclick="openPurchaseModal('${p.img}', '${safeName}', '${formattedPrice}')" class="bg-pool-cafe text-white text-[11px] px-3 py-2 rounded-full flex-1 hover:opacity-90 transition cursor-pointer">Comprar</button>
                    <button onclick="openPurchaseModal('${p.img}', '${safeName}', '${formattedPrice}')" class="text-pool-cafe border border-pool-cafe text-[11px] px-3 py-2 rounded-full flex-1 hover:bg-gray-50 transition cursor-pointer">Agregar al carrito</button>
                </div>
            </div>
        </div>
    `;
}

function hasActiveFilters() {
    return (
        catalogFilterState.categories.length > 0 ||
        catalogFilterState.materials.length > 0 ||
        catalogFilterState.colors.length > 0 ||
        catalogFilterState.availabilities.length > 0 ||
        catalogFilterState.maxPrice < 30000 ||
        catalogFilterState.searchQuery.trim() !== ''
    );
}

function renderInventoryHeaderAction(headerBlock) {
    if (!headerBlock) return;
    const existingBtn = document.getElementById('inventory-edit-home-btn');
    if (existingBtn) existingBtn.remove();

    if (!isInventoryMode()) return;

    const btn = document.createElement('a');
    btn.id = 'inventory-edit-home-btn';
    btn.href = 'index.html?modo=editar-inicio';
    btn.className = 'inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-white border border-gray-200 hover:border-pool-cafe text-xs font-semibold text-pool-cafe shadow-sm transition';
    btn.innerHTML = `${getPencilIconSVG()}<span>Editar página de inicio</span>`;
    headerBlock.appendChild(btn);
}

function applyCatalogFilters() {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    const baseProducts = PoolDB.obtenerProductos();
    const defaultCount = Number(productGrid.dataset.count) || 28;
    const headerBlock = productGrid.parentElement?.querySelector('main > div > div:first-child');
    const titleEl = headerBlock?.querySelector('h2');
    const subtitle = headerBlock?.querySelector('p');

    if (isInventoryMode()) {
        ensureDeleteModal();
        ensureAddProductModal();
        if (titleEl) titleEl.textContent = 'Gestión de Inventario';
    } else if (titleEl) {
        titleEl.textContent = 'Muebles';
    }
    renderInventoryHeaderAction(headerBlock);

    if (baseProducts.length === 0) {
        if (isInventoryMode()) {
            productGrid.innerHTML = renderAddProductCard() + `
                <div class="col-span-full bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 text-center shadow-sm">
                    <p class="text-sm text-gray-500 font-light mb-4">Tu inventario está vacío. Usa el botón "+" para agregar un producto o restaura el catálogo inicial.</p>
                    <button onclick="restoreDefaultInventory()" class="bg-pool-cafe text-white px-6 py-2.5 rounded-full text-xs font-semibold hover:opacity-90 transition cursor-pointer">
                        Restaurar catálogo inicial
                    </button>
                </div>
            `;
        } else {
            productGrid.innerHTML = `
                <div class="col-span-full bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] p-12 text-center shadow-sm">
                    <p class="text-lg font-semibold text-pool-dark mb-2">No hay productos disponibles</p>
                    <p class="text-sm text-gray-500 font-light">Vuelve pronto para ver nuestra nueva colección.</p>
                </div>
            `;
        }
        if (subtitle) subtitle.textContent = '0 productos en inventario.';
        return;
    }

    if (!hasActiveFilters()) {
        if (isInventoryMode()) {
            productGrid.innerHTML = baseProducts.map(renderProductCard).join('') + renderAddProductCard();
            if (subtitle) {
                subtitle.textContent = `Modo edición activo • ${baseProducts.length} ${baseProducts.length === 1 ? 'producto' : 'productos'} en inventario. Edita productos o filtros directamente.`;
            }
            return;
        }

        let html = '';
        for (let i = 0; i < defaultCount; i++) {
            html += renderProductCard(baseProducts[i % baseProducts.length]);
        }
        productGrid.innerHTML = html;
        if (subtitle) {
            subtitle.textContent = defaultCount === 8
                ? 'Diseño exclusivo a medida. Resultados 29 a 36.'
                : 'Diseño exclusivo a medida. Resultados 1 a 28.';
        }
        return;
    }

    const filtered = baseProducts.filter(p => {
        const pCat = normalizeText(p.category);
        const pMat = normalizeText(p.material);
        const pCol = normalizeText(p.color);
        const pAvail = normalizeText(p.availability);
        const pText = normalizeText(`${p.name} ${p.desc} ${p.category} ${p.material} ${p.color}`);

        if (catalogFilterState.categories.length > 0) {
            const matchCat = catalogFilterState.categories.some(c => pCat.includes(c) || (c.includes(pCat) && pCat !== ''));
            if (!matchCat) return false;
        }

        if (catalogFilterState.materials.length > 0) {
            const matchMat = catalogFilterState.materials.some(m => pMat.includes(m) || (m.includes(pMat) && pMat !== ''));
            if (!matchMat) return false;
        }

        if (catalogFilterState.colors.length > 0) {
            const matchCol = catalogFilterState.colors.some(col => pCol.includes(col) || (col.includes(pCol) && pCol !== ''));
            if (!matchCol) return false;
        }

        if (catalogFilterState.availabilities.length > 0) {
            const matchAvail = catalogFilterState.availabilities.some(a => pAvail.includes(a) || (a.includes(pAvail) && pAvail !== ''));
            if (!matchAvail) return false;
        }

        if (Number(p.price) > catalogFilterState.maxPrice) {
            return false;
        }

        if (catalogFilterState.searchQuery.trim() !== '') {
            if (!pText.includes(normalizeText(catalogFilterState.searchQuery))) return false;
        }

        return true;
    });

    if (subtitle) {
        subtitle.textContent = filtered.length === 1
            ? 'Mostrando 1 resultado con tus filtros.'
            : `Mostrando ${filtered.length} resultados con tus filtros.`;
    }

    if (filtered.length === 0) {
        productGrid.innerHTML = `
            <div class="col-span-full bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] p-12 text-center shadow-sm">
                <p class="text-lg font-semibold text-pool-dark mb-2">No encontramos muebles con esos filtros</p>
                <p class="text-sm text-gray-500 font-light mb-6">Prueba ajustando el rango de precio o seleccionando otros materiales.</p>
                <button onclick="resetCatalogFilters()" class="bg-pool-cafe text-white px-6 py-2.5 rounded-full text-xs font-semibold hover:opacity-90 transition cursor-pointer">
                    Limpiar filtros
                </button>
            </div>
        `;
        return;
    }

    productGrid.innerHTML = filtered.map(renderProductCard).join('') + (isInventoryMode() ? renderAddProductCard() : '');
}

function resetCatalogFilters() {
    catalogFilterState.categories = [];
    catalogFilterState.materials = [];
    catalogFilterState.colors = [];
    catalogFilterState.availabilities = [];
    catalogFilterState.maxPrice = 30000;
    catalogFilterState.searchQuery = '';

    const searchInput = document.querySelector('#search-dropdown input[type="text"]');
    if (searchInput) searchInput.value = '';

    renderSidebarFilters();
    applyCatalogFilters();
}

function initCatalog() {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    const params = new URLSearchParams(window.location.search);
    const queryFromURL = params.get('q');
    if (queryFromURL) {
        catalogFilterState.searchQuery = queryFromURL;
        const searchInput = document.querySelector('#search-dropdown input[type="text"]');
        if (searchInput) searchInput.value = queryFromURL;
    }

    renderSidebarFilters();
    applyCatalogFilters();
}

function updatePrice(value) {
    const numVal = Number(value);
    const priceDisplay = document.getElementById('price-display');
    if (priceDisplay) {
        priceDisplay.textContent = `Hasta $${numVal.toLocaleString('es-MX')}`;
    }
    catalogFilterState.maxPrice = numVal;
    applyCatalogFilters();
}

/* ==========================================================================
   10. BUSCADOR GLOBAL DE LA BARRA DE NAVEGACIÓN (LUPA)
   ========================================================================== */
function initSearchBar() {
    const searchInput = document.querySelector('#search-dropdown input[type="text"]');
    if (!searchInput) return;

    const isCatalogPage = Boolean(document.getElementById('product-grid'));

    searchInput.addEventListener('input', (e) => {
        if (isCatalogPage) {
            catalogFilterState.searchQuery = e.target.value;
            applyCatalogFilters();
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (isCatalogPage) {
                catalogFilterState.searchQuery = query;
                applyCatalogFilters();
                document.getElementById('search-dropdown')?.classList.add('hidden');
            } else if (query) {
                window.location.href = `producto.html?q=${encodeURIComponent(query)}`;
            }
        }
    });
}

/* ==========================================================================
   11. VALIDACIONES DE REGISTRO (REGISTRO.HTML)
   ========================================================================== */
function validarPasswords() {
    const pass = document.getElementById('reg-password');
    const confPass = document.getElementById('reg-confirm-password');
    if (!pass || !confPass) return;

    if (pass.value !== confPass.value) {
        confPass.setCustomValidity('Las contraseñas no coinciden');
    } else {
        confPass.setCustomValidity('');
    }
}

function formatearFecha(input) {
    let valor = input.value.replace(/\D/g, '');
    let nuevoValor = '';
    if (valor.length > 0) nuevoValor += valor.substring(0, 2);
    if (valor.length > 2) nuevoValor += '/' + valor.substring(2, 4);
    if (valor.length > 4) nuevoValor += '/' + valor.substring(4, 8);
    input.value = nuevoValor;
    validarMayoriaEdad(input);
}

function validarMayoriaEdad(inputFecha) {
    if (!inputFecha.value) {
        inputFecha.setCustomValidity('');
        return;
    }

    const regexFecha = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = inputFecha.value.match(regexFecha);
    if (!match) {
        inputFecha.setCustomValidity('Formato inválido (dd/mm/aaaa)');
        return;
    }

    const dia = parseInt(match[1], 10);
    const mes = parseInt(match[2], 10) - 1;
    const anio = parseInt(match[3], 10);
    const fechaSeleccionada = new Date(anio, mes, dia);

    if (fechaSeleccionada.getFullYear() !== anio || fechaSeleccionada.getMonth() !== mes || fechaSeleccionada.getDate() !== dia) {
        inputFecha.setCustomValidity('Fecha inexistente');
        return;
    }

    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaSeleccionada.getFullYear();
    const diferenciaMes = hoy.getMonth() - fechaSeleccionada.getMonth();
    if (diferenciaMes < 0 || (diferenciaMes === 0 && hoy.getDate() < fechaSeleccionada.getDate())) {
        edad--;
    }

    if (edad < 18) {
        inputFecha.setCustomValidity('Debes ser mayor de 18 años');
    } else {
        inputFecha.setCustomValidity('');
    }
}

/* ==========================================================================
   12. MENÚ MÓVIL LIQUID GLASS (INYECCIÓN AUTOMÁTICA EN TODAS LAS PÁGINAS)
   ========================================================================== */
function initMobileMenu() {
    const iconsContainer = document.querySelector('header.nav-glass .flex.items-center.space-x-5');
    if (!iconsContainer || document.getElementById('mobile-menu')) return;

    const sessionText = document.getElementById('session-text');
    if (sessionText) {
        sessionText.innerHTML = `
            <span class="hidden md:inline">Iniciar / Crear sesión</span>
            <span class="md:hidden text-xs">Ingresar</span>
        `;
    }

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = [
        { href: 'index.html', label: 'Inicio' },
        { href: 'producto.html', label: 'Productos' },
        { href: 'contacto.html', label: 'Contáctanos' },
        { href: 'ayuda.html', label: 'Ayuda' }
    ];

    const linksHTML = links.map(link => {
        const isActive = currentPage === link.href || (currentPage === 'producto2.html' && link.href === 'producto.html');
        const activeClasses = isActive
            ? 'bg-white/75 text-pool-cafe font-semibold shadow-sm'
            : 'text-pool-dark hover:bg-white/60 font-normal';
        return `
            <li>
                <a href="${link.href}" class="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-colors ${activeClasses}">
                    <span>${link.label}</span>
                    <span class="text-xs text-gray-400">→</span>
                </a>
            </li>
        `;
    }).join('');

    const mobileWrapper = document.createElement('div');
    mobileWrapper.className = 'relative flex items-center md:hidden';
    mobileWrapper.innerHTML = `
        <button onclick="toggleMenu('mobile-menu')" title="Menú" aria-label="Abrir menú" class="text-gray-700 hover:text-black transition-colors focus:outline-none cursor-pointer p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"></path>
            </svg>
        </button>

        <div id="mobile-menu" class="hidden absolute right-0 top-full mt-6 w-64 bg-white/85 backdrop-blur-2xl border border-white/50 rounded-[2rem] shadow-2xl p-5 text-pool-dark transition-all origin-top-right z-50">
            <div class="absolute -top-2 right-3 w-4 h-4 bg-white/85 backdrop-blur-2xl border-t border-l border-white/50 transform rotate-45"></div>
            <div class="relative z-10">
                <p class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-3 mb-2">Navegación</p>
                <ul class="space-y-1">
                    ${linksHTML}
                </ul>
            </div>
        </div>
    `;

    iconsContainer.appendChild(mobileWrapper);
}

/* ==========================================================================
   13. INICIALIZACIÓN AUTOMÁTICA EN TODAS LAS PÁGINAS
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    renderSessionUI();
    renderCart();
    renderHomePage();
    initCarousel();
    initCatalog();
    initSearchBar();
});