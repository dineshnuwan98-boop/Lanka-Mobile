/* ==========================================================================
   FixFlow Javascript Engine - POS & Repair Ticket Shop Orchestrator
   ========================================================================== */

// 1. Core Default Configuration Datasets
const DEFAULT_SETTINGS = {
    shopName: "FixFlow Lanka Mobiles",
    phone: "+94 77 123 4567",
    email: "repairs@fixflowlanka.com",
    address: "123 Main Street, Kandy, Sri Lanka",
    taxRate: 8,
    currencySymbol: "Rs.",
    terms: "1. Warranty covers only physical parts replaced for 30 days.\n2. No warranty on water damage repairs or micro-soldered items.\n3. Devices left over 60 days from pickup notification will be sold to cover repair overhead costs.\n4. Screen replacement warranty is voided in case of mechanical physical cracks or liquid damage.",
    loginUsername: "admin",
    loginPassword: "admin123"
};

const DEFAULT_INVENTORY = [
    { sku: "SKU-IP13-SCR", name: "iPhone 13 Premium OLED Screen replacement part", category: "Part", stock: 8, cost: 18000, price: 29500 },
    { sku: "SKU-IP11-BAT", name: "iPhone 11 Battery replacement part (6-month warranty)", category: "Part", stock: 12, cost: 4500, price: 8900 },
    { sku: "SKU-S22-SCR", name: "Samsung Galaxy S22 Super AMOLED Display Assembly", category: "Part", stock: 3, cost: 28000, price: 42000 },
    { sku: "SKU-LPT-SSD", name: "Crucial 500GB NVMe M.2 Laptop SSD Upgrade Drive", category: "Part", stock: 15, cost: 9500, price: 16500 },
    { sku: "SKU-LPT-RAM", name: "Crucial 8GB DDR4 3200MHz Laptop RAM Module", category: "Part", stock: 20, cost: 5000, price: 8500 },
    { sku: "FEE-MOBILE-LBR", name: "Standard Mobile Repair Disassembly Labor Service", category: "Labor", stock: 999, cost: 0, price: 2500 },
    { sku: "FEE-LPT-OS", name: "Windows 11 OS Reinstallation & Data Backup Labor Service", category: "Labor", stock: 999, cost: 0, price: 5000 },
    { sku: "FEE-LPT-CLN", name: "Laptop Internal Heatsink Thermal Paste Cleaning Service", category: "Labor", stock: 999, cost: 500, price: 3500 },
    { sku: "ACC-IP14-CASE", name: "iPhone 14 Heavy-Duty Shockproof Protective Case", category: "Accessory", stock: 5, cost: 800, price: 1800 }
];

// 2. Global State Object
let AppState = {
    settings: { ...DEFAULT_SETTINGS },
    tickets: [],
    inventory: [...DEFAULT_INVENTORY],
    transactions: [],

    // Active UI states
    activeTab: "dashboard",
    viewMode: "kanban", // kanban or list
    cart: [],
    activeTicketId: null, // linked ticket for checkout
    billingCustomer: {
        name: "Walk-in Cash Client",
        phone: ""
    },

    // Active Intake Form Checklists (Pre-inspection)
    currentChecklist: {
        power: "untested",
        display: "untested",
        touch: "untested",
        charge: "untested",
        cameras: "untested",
        audio: "untested",
        wifi: "untested",
        liquid: "untested"
    }
};

// ==========================================================================
// 3. Application Setup & Startup Lifecycles
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    loadStateFromStorage();
    initClock();
    initNavigation();
    initIntakeFormChecklist();
    initEventHandlers();

    // Render initial data view screens
    renderDashboard();
    renderTicketsListAndBoard();
    renderInventory();
    renderSettingsForm();
    populatePOSSelectors();
    updateDashboardSummaryMetrics();

    // Auto-refresh Lucide icons
    lucide.createIcons();

    // Run session check - show login if not authenticated
    checkAuthSession();
});

// Sync data to browser local storage
function saveStateToStorage() {
    localStorage.setItem("fixflow_data_store", JSON.stringify({
        settings: AppState.settings,
        tickets: AppState.tickets,
        inventory: AppState.inventory,
        transactions: AppState.transactions
    }));
}

function loadStateFromStorage() {
    const raw = localStorage.getItem("fixflow_data_store");
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed.settings) AppState.settings = parsed.settings;
            if (parsed.tickets) AppState.tickets = parsed.tickets;
            if (parsed.inventory) AppState.inventory = parsed.inventory;
            if (parsed.transactions) AppState.transactions = parsed.transactions;
        } catch (e) {
            console.error("Failed to restore AppState from localstorage. Using defaults.", e);
        }
    }
}

// Clock updates
function initClock() {
    const dateEl = document.getElementById("live-date");
    const timeEl = document.getElementById("live-time");

    function tick() {
        const now = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', options);

        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        timeEl.textContent = `${hrs}:${mins}`;
    }

    tick();
    setInterval(tick, 30000); // refresh every 30 seconds
}

// Routing Tab switches
function initNavigation() {
    const navItems = document.querySelectorAll(".sidebar .nav-item");
    const tabContents = document.querySelectorAll(".content-container .tab-content");
    const pageTitleText = document.getElementById("page-title-text");
    const pageSubtitleText = document.getElementById("page-subtitle-text");

    const pageDetails = {
        "dashboard": { title: "Dashboard Overview", sub: "Real-time shop performance metrics and repair queues." },
        "new-ticket": { title: "Repair Intake Intake", sub: "Generate new liability tickets and pre-check devices." },
        "tickets": { title: "Repair Work Orders Board", sub: "Track statuses, updates, and schedule technician jobs." },
        "pos": { title: "Point of Sale Terminal", sub: "Add custom inventory, link outstanding intake tickets, and checkout." },
        "inventory": { title: "Inventory stock catalog", sub: "Manage parts supplies, accessories assets, and standard service costs." },
        "settings": { title: "Configuration Panel & Tools", sub: "Custom billing headers, database backups, and demo data sandboxes." }
    };

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.getAttribute("data-tab");
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    const navItems = document.querySelectorAll(".sidebar .nav-item");
    const tabContents = document.querySelectorAll(".content-container .tab-content");
    const pageTitleText = document.getElementById("page-title-text");
    const pageSubtitleText = document.getElementById("page-subtitle-text");
    const pageDetails = {
        "dashboard": { title: "Dashboard Overview", sub: "Real-time shop performance metrics and repair queues." },
        "new-ticket": { title: "Repair Intake Intake", sub: "Generate new liability tickets and pre-check devices." },
        "tickets": { title: "Repair Work Orders Board", sub: "Track statuses, updates, and schedule technician jobs." },
        "pos": { title: "Point of Sale Terminal", sub: "Add custom inventory, link outstanding intake tickets, and checkout." },
        "inventory": { title: "Inventory stock catalog", sub: "Manage parts supplies, accessories assets, and standard service costs." },
        "settings": { title: "Configuration Panel & Tools", sub: "Custom billing headers, database backups, and demo data sandboxes." }
    };

    AppState.activeTab = tabId;

    // Update navigation styles
    navItems.forEach(nav => {
        if (nav.getAttribute("data-tab") === tabId) {
            nav.classList.add("active");
        } else {
            nav.classList.remove("active");
        }
    });

    // Update tab visibility
    tabContents.forEach(tab => {
        if (tab.id === `tab-${tabId}`) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });

    // Update titles
    if (pageDetails[tabId]) {
        pageTitleText.textContent = pageDetails[tabId].title;
        pageSubtitleText.textContent = pageDetails[tabId].sub;
    }

    // Custom triggers per tab
    if (tabId === "dashboard") {
        renderDashboard();
        updateDashboardSummaryMetrics();
    } else if (tabId === "tickets") {
        renderTicketsListAndBoard();
    } else if (tabId === "pos") {
        populatePOSSelectors();
        renderPOSCart();
        renderPOSCatalog();
    } else if (tabId === "inventory") {
        renderInventory();
    }
}

// Global Toast display
function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toast-message");
    const toastIcon = document.getElementById("toast-icon");

    toastMsg.textContent = message;

    // Pick visual icon
    if (type === "success") {
        toastIcon.setAttribute("data-lucide", "check-circle-2");
        toast.style.borderColor = "var(--accent-teal)";
    } else if (type === "error") {
        toastIcon.setAttribute("data-lucide", "alert-circle");
        toast.style.borderColor = "var(--accent-rose)";
    } else {
        toastIcon.setAttribute("data-lucide", "info");
        toast.style.borderColor = "var(--accent-indigo)";
    }

    lucide.createIcons();
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 4000);
}

// ==========================================================================
// 4. Intake Pre-Inspection Checklist Controllers (Tri-State Inputs)
// ==========================================================================
function initIntakeFormChecklist() {
    const switches = document.querySelectorAll(".tri-state-switch");

    switches.forEach(sw => {
        const checkKey = sw.getAttribute("data-check");
        const buttons = sw.querySelectorAll(".tri-btn");

        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                const state = btn.getAttribute("data-state");

                // Clear active states on siblings
                buttons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                // Set state inside global state
                AppState.currentChecklist[checkKey] = state;
            });
        });
    });
}

function resetIntakeFormChecklist() {
    AppState.currentChecklist = {
        power: "untested",
        display: "untested",
        touch: "untested",
        charge: "untested",
        cameras: "untested",
        audio: "untested",
        wifi: "untested",
        liquid: "untested"
    };

    const switches = document.querySelectorAll(".tri-state-switch");
    switches.forEach(sw => {
        const buttons = sw.querySelectorAll(".tri-btn");
        buttons.forEach(btn => {
            if (btn.getAttribute("data-state") === "untested") {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    });

    // Clear accessory checkboxes
    const accessoryBoxes = document.querySelectorAll('input[name="accessories"]');
    accessoryBoxes.forEach(box => box.checked = false);
}

function setFormChecklistState(checklist) {
    AppState.currentChecklist = { ...checklist };

    const switches = document.querySelectorAll(".tri-state-switch");
    switches.forEach(sw => {
        const checkKey = sw.getAttribute("data-check");
        const val = checklist[checkKey] || "untested";
        const buttons = sw.querySelectorAll(".tri-btn");

        buttons.forEach(btn => {
            if (btn.getAttribute("data-state") === val) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    });
}

// ==========================================================================
// 5. Database Backend & Event Subscriptions
// ==========================================================================
function initEventHandlers() {
    // Demo loaders
    document.getElementById("btn-load-demo-header").addEventListener("click", injectDemoData);
    document.getElementById("btn-load-demo-settings").addEventListener("click", injectDemoData);

    // New Ticket saves
    document.getElementById("new-ticket-form").addEventListener("submit", handleSaveTicket);
    document.getElementById("btn-cancel-edit").addEventListener("click", cancelEditMode);

    // Dashboard actions switches
    document.getElementById("btn-view-all-tickets").addEventListener("click", () => switchTab("tickets"));
    document.getElementById("action-new-ticket").addEventListener("click", () => {
        cancelEditMode();
        switchTab("new-ticket");
    });
    document.getElementById("action-pos-checkout").addEventListener("click", () => switchTab("pos"));
    document.getElementById("action-add-part").addEventListener("click", () => {
        openInventoryModal();
    });

    // Ticket view toggles
    document.getElementById("view-toggle-kanban").addEventListener("click", () => setTicketView("kanban"));
    document.getElementById("view-toggle-list").addEventListener("click", () => setTicketView("list"));
    document.getElementById("ticket-search").addEventListener("input", renderTicketsListAndBoard);
    document.getElementById("filter-ticket-status").addEventListener("change", renderTicketsListAndBoard);
    document.getElementById("filter-ticket-device").addEventListener("change", renderTicketsListAndBoard);

    // POS triggers
    document.getElementById("btn-pos-load-ticket").addEventListener("click", handlePOSLoadTicket);
    document.getElementById("btn-clear-cart").addEventListener("click", clearPOSCart);
    document.getElementById("pos-custom-item-form").addEventListener("submit", handlePOSAddCustomItem);
    document.getElementById("pos-catalog-search").addEventListener("input", renderPOSCatalog);

    // Discount calculations key listeners
    document.getElementById("pos-discount-value").addEventListener("input", calculatePOSBill);
    document.getElementById("pos-discount-type").addEventListener("change", calculatePOSBill);
    document.getElementById("pos-amount-tendered").addEventListener("input", calculatePOSChangeDue);

    // Payment method radios change click
    document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
        radio.addEventListener("change", (e) => {
            document.querySelectorAll(".pay-method-btn").forEach(btn => btn.classList.remove("active"));
            e.target.closest(".pay-method-btn").classList.add("active");

            const method = e.target.value;
            const tenderFields = document.getElementById("cash-calculation-fields");
            if (method === "Cash") {
                tenderFields.classList.remove("hidden");
            } else {
                tenderFields.classList.add("hidden");
            }
        });
    });

    // Complete POS Receipt button click
    document.getElementById("btn-complete-checkout").addEventListener("click", handlePOSCheckoutComplete);

    // POS Direct Client Search triggers
    document.getElementById("pos-customer-search-input").addEventListener("input", handlePOSCustomerSearchInput);
    document.getElementById("pos-customer-search-input").addEventListener("focus", handlePOSCustomerSearchInput);

    // Click outside customer dropdown logic
    document.addEventListener("click", (e) => {
        if (!e.target.closest("#pos-direct-customer-area")) {
            document.getElementById("customer-suggestions").classList.add("hidden");
        }
        // Click outside ticket kanban action overlay menus to close
        if (!e.target.closest(".kanban-card")) {
            document.querySelectorAll(".card-menu-dropdown").forEach(d => d.classList.add("hidden"));
        }
    });

    // Inventory manager actions
    document.getElementById("inventory-search").addEventListener("input", renderInventory);
    document.getElementById("btn-open-add-inventory-modal").addEventListener("click", () => openInventoryModal());
    document.getElementById("btn-close-inventory-modal").addEventListener("click", closeInventoryModal);
    document.getElementById("btn-cancel-inventory-modal").addEventListener("click", closeInventoryModal);
    document.getElementById("inventory-item-form").addEventListener("submit", handleSaveInventoryItem);

    // Settings configuration save
    document.getElementById("settings-shop-form").addEventListener("submit", handleSaveShopSettings);

    // Settings security credentials save
    document.getElementById("settings-security-form").addEventListener("submit", handleSaveSecuritySettings);

    // Settings security password show/hide toggle
    document.getElementById("btn-toggle-security-password").addEventListener("click", () => {
        const pwInput = document.getElementById("settings-security-password");
        const icon = document.getElementById("security-password-toggle-icon");
        if (pwInput.type === "password") {
            pwInput.type = "text";
            icon.setAttribute("data-lucide", "eye-off");
        } else {
            pwInput.type = "password";
            icon.setAttribute("data-lucide", "eye");
        }
        lucide.createIcons();
    });

    // Settings db control buttons
    document.getElementById("btn-export-database").addEventListener("click", handleExportBackupFile);
    document.getElementById("btn-import-trigger-file").addEventListener("click", () => {
        document.getElementById("import-database-file").click();
    });
    document.getElementById("import-database-file").addEventListener("change", handleImportBackupFile);
    document.getElementById("btn-wipe-database").addEventListener("click", handleWipeDatabase);

    // Modal invoice receipt prints triggers
    document.getElementById("btn-close-invoice-modal").addEventListener("click", closeInvoiceModal);
    document.getElementById("btn-dismiss-invoice-modal").addEventListener("click", closeInvoiceModal);
    document.getElementById("btn-print-invoice").addEventListener("click", () => triggerReceiptPrint("thermal"));
    document.getElementById("btn-print-letter-invoice").addEventListener("click", () => triggerReceiptPrint("a4"));

    // Quick Add POS Cart subtab switches
    document.getElementById("subtab-inventory").addEventListener("click", () => setPOSSubtab("inventory"));
    document.getElementById("subtab-custom").addEventListener("click", () => setPOSSubtab("custom"));

    // Login form submission handler
    document.getElementById("login-form").addEventListener("submit", handleLogin);

    // Login password show/hide toggle
    document.getElementById("btn-toggle-password").addEventListener("click", () => {
        const pwInput = document.getElementById("login-password");
        const icon = document.getElementById("password-toggle-icon");
        if (pwInput.type === "password") {
            pwInput.type = "text";
            icon.setAttribute("data-lucide", "eye-off");
        } else {
            pwInput.type = "password";
            icon.setAttribute("data-lucide", "eye");
        }
        lucide.createIcons();
    });

    // Logout button handler
    document.getElementById("btn-logout").addEventListener("click", handleLogout);
}

function setPOSSubtab(subtab) {
    document.getElementById("subtab-inventory").classList.remove("active");
    document.getElementById("subtab-custom").classList.remove("active");
    document.getElementById("pos-subtab-inventory-content").classList.remove("active");
    document.getElementById("pos-subtab-custom-content").classList.remove("active");

    document.getElementById(`subtab-${subtab}`).classList.add("active");
    document.getElementById(`pos-subtab-${subtab}-content`).classList.add("active");
}

function setTicketView(mode) {
    AppState.viewMode = mode;
    document.getElementById("view-toggle-kanban").classList.remove("active");
    document.getElementById("view-toggle-list").classList.remove("active");
    document.getElementById(`view-toggle-${mode}`).classList.add("active");

    const kanbanView = document.getElementById("tickets-kanban-view");
    const listView = document.getElementById("tickets-list-view");

    if (mode === "kanban") {
        kanbanView.classList.remove("hidden");
        listView.classList.add("hidden");
    } else {
        kanbanView.classList.add("hidden");
        listView.classList.remove("hidden");
    }
    renderTicketsListAndBoard();
}

// ==========================================================================
// 6. Intake Ticket Logic Implementation
// ==========================================================================
function handleSaveTicket(e) {
    e.preventDefault();

    const editId = document.getElementById("ticket-edit-id").value;

    // Read accessory list checkboxes
    const accessories = [];
    document.querySelectorAll('input[name="accessories"]:checked').forEach(c => {
        accessories.push(c.value);
    });

    // Read core intake details
    const ticketData = {
        id: editId || `T-${1000 + AppState.tickets.length + 1}`,
        customer: {
            name: document.getElementById("cust-name").value,
            phone: document.getElementById("cust-phone").value,
            email: document.getElementById("cust-email").value,
            address: document.getElementById("cust-address").value
        },
        device: {
            type: document.getElementById("device-type").value,
            brand: document.getElementById("device-brand").value,
            model: document.getElementById("device-model").value,
            serial: document.getElementById("device-serial").value,
            passcode: document.getElementById("device-passcode").value
        },
        checklist: { ...AppState.currentChecklist },
        accessories: accessories,
        issue: document.getElementById("ticket-issue").value,
        tech: document.getElementById("ticket-tech").value,
        status: document.getElementById("ticket-status").value,
        estimatedCost: parseFloat(document.getElementById("ticket-est-cost").value || 0),
        depositPaid: parseFloat(document.getElementById("ticket-deposit").value || 0),
        dueDate: document.getElementById("ticket-due-date").value,
        dateCreated: editId ? (AppState.tickets.find(t => t.id === editId)?.dateCreated || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0]
    };

    if (editId) {
        // Edit mode save
        const index = AppState.tickets.findIndex(t => t.id === editId);
        if (index !== -1) {
            AppState.tickets[index] = ticketData;
            showToast(`Repair Ticket ${editId} updated successfully!`, "success");
        }
    } else {
        // New intake save
        AppState.tickets.unshift(ticketData);
        showToast(`Intake Ticket ${ticketData.id} created successfully!`, "success");
    }

    saveStateToStorage();
    cancelEditMode();
    switchTab("tickets");
}

function startEditTicket(ticketId) {
    const ticket = AppState.tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    // Route to New Ticket form
    switchTab("new-ticket");

    // Customize title for Editing
    document.getElementById("page-title-text").textContent = `Editing Ticket ${ticket.id}`;

    // Set fields
    document.getElementById("ticket-edit-id").value = ticket.id;
    document.getElementById("cust-name").value = ticket.customer.name;
    document.getElementById("cust-phone").value = ticket.customer.phone;
    document.getElementById("cust-email").value = ticket.customer.email;
    document.getElementById("cust-address").value = ticket.customer.address;

    document.getElementById("device-type").value = ticket.device.type;
    document.getElementById("device-brand").value = ticket.device.brand;
    document.getElementById("device-model").value = ticket.device.model;
    document.getElementById("device-serial").value = ticket.device.serial;
    document.getElementById("device-passcode").value = ticket.device.passcode;

    document.getElementById("ticket-issue").value = ticket.issue;
    document.getElementById("ticket-tech").value = ticket.tech;
    document.getElementById("ticket-status").value = ticket.status;
    document.getElementById("ticket-est-cost").value = ticket.estimatedCost;
    document.getElementById("ticket-deposit").value = ticket.depositPaid;
    document.getElementById("ticket-due-date").value = ticket.dueDate;

    // Populate tri-state pre-check checklist
    setFormChecklistState(ticket.checklist);

    // Populate accessory checkboxes
    const accessories = ticket.accessories || [];
    document.querySelectorAll('input[name="accessories"]').forEach(box => {
        box.checked = accessories.includes(box.value);
    });

    // Toggle buttons visual state
    document.getElementById("btn-cancel-edit").classList.remove("hidden");
    document.getElementById("btn-save-ticket").querySelector("span").textContent = `Update Ticket Details`;
}

function cancelEditMode() {
    document.getElementById("new-ticket-form").reset();
    document.getElementById("ticket-edit-id").value = "";
    document.getElementById("btn-cancel-edit").classList.add("hidden");
    document.getElementById("btn-save-ticket").querySelector("span").textContent = `Save Intake Ticket`;
    resetIntakeFormChecklist();
}

function handleUpdateTicketStatus(ticketId, newStatus) {
    const ticket = AppState.tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    ticket.status = newStatus;
    saveStateToStorage();
    showToast(`Ticket ${ticketId} status updated to ${newStatus}!`, "success");
    renderTicketsListAndBoard();
    updateDashboardSummaryMetrics();
}

function deleteTicket(ticketId) {
    if (confirm(`Caution! Are you sure you want to permanently delete Repair Ticket ${ticketId}?`)) {
        AppState.tickets = AppState.tickets.filter(t => t.id !== ticketId);
        saveStateToStorage();
        showToast(`Ticket ${ticketId} deleted successfully.`, "info");
        renderTicketsListAndBoard();
        updateDashboardSummaryMetrics();
    }
}

// ==========================================================================
// 7. Interactive Rendering Engines (Dashboard, Kanban, Lists)
// ==========================================================================
function updateDashboardSummaryMetrics() {
    const sym = AppState.settings.currencySymbol || "Rs.";

    // Filter active repairs (Received, Inspection, In Progress, Awaiting Parts)
    const activeStates = ["Received", "Inspection", "In Progress", "Awaiting Parts"];
    const activeCount = AppState.tickets.filter(t => activeStates.includes(t.status)).length;

    // Ready for pickup count
    const readyCount = AppState.tickets.filter(t => t.status === "Ready").length;

    // Low stock catalog items
    const lowStockCount = AppState.inventory.filter(item => item.category !== "Labor" && item.stock <= 3).length;

    // Revenue calculations (Transactions completed today)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRevenue = AppState.transactions
        .filter(tx => tx.date.split('T')[0] === todayStr)
        .reduce((sum, tx) => sum + tx.grandTotal, 0);

    document.getElementById("stat-active-repairs").textContent = activeCount;
    document.getElementById("stat-ready-pickup").textContent = readyCount;
    document.getElementById("stat-low-stock").textContent = lowStockCount;
    document.getElementById("stat-revenue-today").textContent = `${sym} ${todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Gauge progress slider
    const maxCapacity = 15;
    const loadPct = Math.min(100, Math.round((activeCount / maxCapacity) * 100));
    document.getElementById("dashboard-load-bar").style.width = `${loadPct}%`;
    document.getElementById("dashboard-load-text").textContent = `${activeCount} Active / ${maxCapacity} Max capacity`;
    document.getElementById("dashboard-load-pct").textContent = `${loadPct}%`;
}

function renderDashboard() {
    const tableBody = document.getElementById("dashboard-repairs-table");
    const activeStates = ["Received", "Inspection", "In Progress", "Awaiting Parts"];
    const criticalTickets = AppState.tickets
        .filter(t => activeStates.includes(t.status))
        // sort by due date ascending
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5); // display top 5 most urgent

    const sym = AppState.settings.currencySymbol || "Rs.";

    if (criticalTickets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No active workshop repairs. Have a nice day!</td></tr>`;
        return;
    }

    tableBody.innerHTML = criticalTickets.map(t => {
        const isOverdue = new Date(t.dueDate) < new Date() && t.status !== "Ready";
        const dueDateClass = isOverdue ? "text-red font-bold" : "";
        return `
            <tr>
                <td><strong>${t.id}</strong></td>
                <td>
                    <span class="block-font font-bold">${t.customer.name}</span>
                    <span class="text-dimmed block-font" style="font-size:0.75rem;">${t.customer.phone}</span>
                </td>
                <td><strong>${t.device.brand}</strong> ${t.device.model}</td>
                <td class="text-muted"><div class="text-ellipsis" style="max-width:180px;">${t.issue}</div></td>
                <td class="${dueDateClass}">${t.dueDate}</td>
                <td><strong>${sym} ${t.estimatedCost.toLocaleString()}</strong></td>
                <td><span class="status-badge ${t.status.toLowerCase().replace(' ', '-')}">${t.status}</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="startEditTicket('${t.id}')" style="padding:6px 10px; font-size:0.75rem;">
                        <i data-lucide="edit-3" style="width:12px; height:12px;"></i> Edit
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    lucide.createIcons();
}

function renderTicketsListAndBoard() {
    const search = document.getElementById("ticket-search").value.toLowerCase();
    const statFilter = document.getElementById("filter-ticket-status").value;
    const deviceFilter = document.getElementById("filter-ticket-device").value;

    // Master filter tickets
    const filtered = AppState.tickets.filter(t => {
        const matchesSearch = t.id.toLowerCase().includes(search) ||
            t.customer.name.toLowerCase().includes(search) ||
            t.customer.phone.includes(search) ||
            t.device.model.toLowerCase().includes(search);

        const matchesStatus = statFilter === "All" || t.status === statFilter;
        const matchesDevice = deviceFilter === "All" || t.device.type === deviceFilter;

        return matchesSearch && matchesStatus && matchesDevice;
    });

    if (AppState.viewMode === "kanban") {
        renderKanbanColumns(filtered);
    } else {
        renderListTable(filtered);
    }
}

function renderKanbanColumns(ticketsList) {
    const columns = ["Received", "Inspection", "In Progress", "Awaiting Parts", "Ready"];
    const sym = AppState.settings.currencySymbol || "Rs.";

    // Clear and prepare containers
    columns.forEach(col => {
        const key = col.toLowerCase().replace(" ", "");
        const container = document.getElementById(`kanban-col-${key}`);
        container.innerHTML = "";

        // Filter tickets in status
        const colTickets = ticketsList.filter(t => t.status === col);
        document.getElementById(`count-kanban-${key}`).textContent = colTickets.length;

        if (colTickets.length === 0) {
            container.innerHTML = `<div class="text-center text-muted py-4" style="font-size:0.72rem;">No items</div>`;
            return;
        }

        colTickets.forEach(t => {
            const isOverdue = new Date(t.dueDate) < new Date() && t.status !== "Ready";
            const dueClass = isOverdue ? "overdue" : "";
            const dueText = isOverdue ? "Overdue!" : `Due: ${t.dueDate}`;

            const card = document.createElement("div");
            card.className = "kanban-card";
            card.innerHTML = `
                <div class="kanban-card-header">
                    <span class="card-id">${t.id}</span>
                    <span class="card-due-indicator ${dueClass}">
                        <i data-lucide="clock" style="width:10px; height:10px;"></i>
                        <span>${dueText}</span>
                    </span>
                </div>
                <h5>${t.device.brand} ${t.device.model}</h5>
                <p class="card-cust">${t.customer.name}</p>
                <p class="card-issue">${t.issue}</p>
                <div class="kanban-card-footer">
                    <span class="card-cost">${sym} ${t.estimatedCost.toLocaleString()}</span>
                    <button class="card-actions-trigger" onclick="toggleKanbanCardMenu(event, '${t.id}')">
                        <i data-lucide="more-vertical"></i>
                    </button>
                </div>
                
                <!-- DROPDOWN MENU INTERACTIVE OVERLAY -->
                <div class="card-menu-dropdown hidden" id="menu-${t.id}">
                    <button class="card-menu-item" onclick="startEditTicket('${t.id}')">
                        <i data-lucide="edit-2"></i> Edit Repair
                    </button>
                    <button class="card-menu-item" onclick="handleLoadTicketToPOSDirect('${t.id}')">
                        <i data-lucide="shopping-cart"></i> POS Cashout
                    </button>
                    
                    <div style="height:1px; background:rgba(255,255,255,0.06); margin:3px 0;"></div>
                    
                    ${col !== 'Received' ? `<button class="card-menu-item" onclick="handleUpdateTicketStatus('${t.id}', '${columns[columns.indexOf(col) - 1]}')"><i data-lucide="arrow-left"></i> Move Back</button>` : ''}
                    ${col !== 'Ready' ? `<button class="card-menu-item" onclick="handleUpdateTicketStatus('${t.id}', '${columns[columns.indexOf(col) + 1]}')"><i data-lucide="arrow-right"></i> Move Next</button>` : ''}
                    
                    ${col === 'Ready' ? `<button class="card-menu-item" onclick="handleUpdateTicketStatus('${t.id}', 'Collected')"><i data-lucide="check"></i> Handover/Collect</button>` : ''}
                    
                    <div style="height:1px; background:rgba(255,255,255,0.06); margin:3px 0;"></div>
                    <button class="card-menu-item text-red" onclick="deleteTicket('${t.id}')">
                        <i data-lucide="trash-2"></i> Delete
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    });

    lucide.createIcons();
}

function toggleKanbanCardMenu(e, ticketId) {
    e.stopPropagation();

    // Close other dropdowns
    document.querySelectorAll(".card-menu-dropdown").forEach(d => {
        if (d.id !== `menu-${ticketId}`) d.classList.add("hidden");
    });

    const dropdown = document.getElementById(`menu-${ticketId}`);
    dropdown.classList.toggle("hidden");
}

function renderListTable(ticketsList) {
    const tbody = document.getElementById("tickets-list-table-body");
    const sym = AppState.settings.currencySymbol || "Rs.";

    if (ticketsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No matching repair tickets cataloged.</td></tr>`;
        return;
    }

    tbody.innerHTML = ticketsList.map(t => {
        return `
            <tr>
                <td><strong>${t.id}</strong></td>
                <td>
                    <span class="block-font font-bold">${t.customer.name}</span>
                    <span class="text-dimmed block-font" style="font-size:0.75rem;">${t.customer.phone}</span>
                </td>
                <td>
                    <span class="block-font font-bold"><strong>${t.device.brand}</strong> ${t.device.model}</span>
                    <span class="text-dimmed block-font" style="font-size:0.75rem;">S/N: ${t.device.serial || "None"}</span>
                </td>
                <td><span class="text-muted">${t.tech}</span></td>
                <td>${t.dueDate}</td>
                <td>
                    <span class="block-font">Est: <strong>${sym} ${t.estimatedCost.toLocaleString()}</strong></span>
                    <span class="text-muted block-font" style="font-size:0.75rem;">Deposit: ${sym} ${t.depositPaid.toLocaleString()}</span>
                </td>
                <td><span class="status-badge ${t.status.toLowerCase().replace(' ', '-')}">${t.status}</span></td>
                <td class="text-right">
                    <div style="display:inline-flex; gap:6px;">
                        <button class="btn btn-secondary" onclick="startEditTicket('${t.id}')" style="padding:6px 10px; font-size:0.75rem;">Edit</button>
                        <button class="btn btn-secondary" onclick="handleLoadTicketToPOSDirect('${t.id}')" style="padding:6px 10px; font-size:0.75rem;">Checkout</button>
                        <button class="btn btn-danger" onclick="deleteTicket('${t.id}')" style="padding:6px 10px; font-size:0.75rem;"><i data-lucide="trash-2" style="width:10px; height:10px;"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    lucide.createIcons();
}

// ==========================================================================
// 8. POS / Checkout Interface Logic
// ==========================================================================
function populatePOSSelectors() {
    const selector = document.getElementById("pos-ticket-selector");
    const activeStates = ["Received", "Inspection", "In Progress", "Awaiting Parts", "Ready"];

    // Filter tickets that are not collected/closed yet
    const outstanding = AppState.tickets.filter(t => activeStates.includes(t.status));

    let html = `<option value="">-- Direct Sales Checkout (No Ticket Linked) --</option>`;
    outstanding.forEach(t => {
        html += `<option value="${t.id}" ${AppState.activeTicketId === t.id ? "selected" : ""}>[${t.id}] ${t.customer.name} - ${t.device.brand} ${t.device.model} (Est: ${t.estimatedCost})</option>`;
    });

    selector.innerHTML = html;

    // Toggle active ticket details banner
    const banner = document.getElementById("linked-ticket-details");
    if (AppState.activeTicketId) {
        const ticket = AppState.tickets.find(t => t.id === AppState.activeTicketId);
        if (ticket) {
            banner.innerHTML = `
                <span>Linked Job: <strong>${ticket.id} (${ticket.device.brand} ${ticket.device.model})</strong>. Deposit of <strong>${AppState.settings.currencySymbol} ${ticket.depositPaid}</strong> will be deducted dynamically.</span>
                <button class="btn-remove-item" onclick="unlinkPOSTicket()" type="button"><i data-lucide="x"></i></button>
            `;
            banner.classList.remove("hidden");

            // Set billing customer to ticket customer
            AppState.billingCustomer = {
                name: ticket.customer.name,
                phone: ticket.customer.phone
            };
            document.getElementById("billing-customer-badge").innerHTML = `<span>Billing Customer: <strong>${ticket.customer.name} (${ticket.customer.phone})</strong></span>`;
            document.getElementById("pos-direct-customer-area").classList.add("hidden");
        }
    } else {
        banner.classList.add("hidden");
        document.getElementById("pos-direct-customer-area").classList.remove("hidden");
    }

    lucide.createIcons();
}

function handlePOSLoadTicket() {
    const ticketId = document.getElementById("pos-ticket-selector").value;
    if (!ticketId) {
        unlinkPOSTicket();
        return;
    }

    const ticket = AppState.tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    AppState.activeTicketId = ticket.id;

    // Auto-create standard cart line item for the repair service
    AppState.cart = [
        {
            sku: "LBR-REPAIR",
            name: `Technical Repair Labor: ${ticket.issue}`,
            price: ticket.estimatedCost,
            qty: 1
        }
    ];

    // Pre-fill fields
    document.getElementById("pos-discount-value").value = "0";

    showToast(`Linked repair ticket ${ticket.id} and added estimated charge to receipt!`, "success");
    populatePOSSelectors();
    renderPOSCart();
}

function handleLoadTicketToPOSDirect(ticketId) {
    AppState.activeTicketId = ticketId;
    const ticket = AppState.tickets.find(t => t.id === ticketId);
    if (ticket) {
        AppState.cart = [
            {
                sku: "LBR-REPAIR",
                name: `Technical Repair Labor: ${ticket.issue}`,
                price: ticket.estimatedCost,
                qty: 1
            }
        ];
    }
    switchTab("pos");
}

function unlinkPOSTicket() {
    AppState.activeTicketId = null;
    AppState.cart = [];
    AppState.billingCustomer = { name: "Walk-in Cash Client", phone: "" };
    document.getElementById("billing-customer-badge").innerHTML = `<span>Billing: <strong>Walk-in Cash Client</strong></span>`;
    document.getElementById("pos-customer-search-input").value = "";

    populatePOSSelectors();
    renderPOSCart();
    showToast("Unlinked repair ticket. Cart has been reset.", "info");
}

function renderPOSCart() {
    const container = document.getElementById("pos-cart-items-container");
    const sym = AppState.settings.currencySymbol || "Rs.";

    if (AppState.cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty-placeholder">
                <i data-lucide="shopping-cart"></i>
                <p>No billing items added yet.</p>
                <p class="sub-placeholder">Search stock catalog or add custom parts below.</p>
            </div>
        `;
        lucide.createIcons();
        calculatePOSBill();
        return;
    }

    container.innerHTML = AppState.cart.map((item, idx) => {
        const itemTotal = item.price * item.qty;
        return `
            <div class="pos-cart-row">
                <div>
                    <span class="cart-item-name">${item.name}</span>
                    <span class="cart-item-sku">${item.sku}</span>
                </div>
                <div class="cart-item-price-unit">${sym} ${item.price.toLocaleString()}</div>
                <div>
                    <div class="cart-qty-spinner">
                        <button class="spinner-btn" onclick="updateCartItemQty(${idx}, -1)">-</button>
                        <span class="cart-qty-val">${item.qty}</span>
                        <button class="spinner-btn" onclick="updateCartItemQty(${idx}, 1)">+</button>
                    </div>
                </div>
                <div class="cart-item-price-total font-bold">${sym} ${itemTotal.toLocaleString()}</div>
                <div>
                    <button class="btn-remove-item" onclick="removeCartItem(${idx})">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    }).join("");

    lucide.createIcons();
    calculatePOSBill();
}

function updateCartItemQty(index, change) {
    const item = AppState.cart[index];
    if (!item) return;

    item.qty += change;

    // Remove item if qty becomes zero or less
    if (item.qty <= 0) {
        AppState.cart.splice(index, 1);
    }

    renderPOSCart();
}

function removeCartItem(index) {
    AppState.cart.splice(index, 1);
    renderPOSCart();
}

function clearPOSCart() {
    AppState.cart = [];
    renderPOSCart();
    showToast("Cart cleared.", "info");
}

function renderPOSCatalog() {
    const grid = document.getElementById("pos-catalog-grid");
    const search = document.getElementById("pos-catalog-search").value.toLowerCase();
    const sym = AppState.settings.currencySymbol || "Rs.";

    // Filter active inventory
    const filtered = AppState.inventory.filter(item => {
        const nameMatches = item.name.toLowerCase().includes(search);
        const skuMatches = item.sku.toLowerCase().includes(search);
        return nameMatches || skuMatches;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="text-center text-muted col-12 py-3" style="font-size:0.75rem;">No items found.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(item => {
        const isOutOfStock = item.category !== "Labor" && item.stock <= 0;
        const disabledClass = isOutOfStock ? "opacity-50 pointer-events-none" : "";
        const stockLabel = item.category === "Labor" ? "Service" : `Stock: ${item.stock}`;

        return `
            <div class="quick-catalog-card ${disabledClass}" onclick="addInventoryToCart('${item.sku}')">
                <span class="quick-cat-name">${item.name}</span>
                <span class="quick-cat-price" style="display:block; font-size:0.68rem; color:var(--accent-teal); margin-top:2px;">${stockLabel}</span>
                <span class="quick-cat-price">${sym} ${item.price.toLocaleString()}</span>
            </div>
        `;
    }).join("");
}

function addInventoryToCart(sku) {
    const invItem = AppState.inventory.find(i => i.sku === sku);
    if (!invItem) return;

    // Check stock bounds
    if (invItem.category !== "Labor" && invItem.stock <= 0) {
        showToast(`Item ${invItem.name} is currently out of stock!`, "error");
        return;
    }

    // Verify if item already in cart
    const existing = AppState.cart.find(item => item.sku === sku);
    if (existing) {
        // Verify we don't exceed stock levels
        if (invItem.category !== "Labor" && existing.qty >= invItem.stock) {
            showToast(`Cannot add more. Reached max available stock for ${invItem.name}.`, "error");
            return;
        }
        existing.qty += 1;
    } else {
        AppState.cart.push({
            sku: invItem.sku,
            name: invItem.name,
            price: invItem.price,
            qty: 1
        });
    }

    renderPOSCart();
    showToast(`Added ${invItem.name} to cart.`, "success");
}

function handlePOSAddCustomItem(e) {
    e.preventDefault();

    const desc = document.getElementById("pos-custom-name").value;
    const price = parseFloat(document.getElementById("pos-custom-price").value || 0);

    AppState.cart.push({
        sku: "FEE-CUSTOM",
        name: desc,
        price: price,
        qty: 1
    });

    document.getElementById("pos-custom-item-form").reset();
    renderPOSCart();
    showToast("Added custom item to billing receipt.", "success");
}

// POS invoice customer search mechanics
function handlePOSCustomerSearchInput(e) {
    const val = e.target.value.toLowerCase();
    const dropdown = document.getElementById("customer-suggestions");

    if (val.length === 0) {
        // Collect unique past customers from tickets list
        const customers = [];
        const seen = new Set();

        AppState.tickets.forEach(t => {
            if (!seen.has(t.customer.phone)) {
                seen.add(t.customer.phone);
                customers.push(t.customer);
            }
        });

        renderCustomerSuggestions(customers.slice(0, 5));
        return;
    }

    // Filter based on search criteria
    const unique = [];
    const seen = new Set();

    AppState.tickets.forEach(t => {
        if (!seen.has(t.customer.phone)) {
            const matches = t.customer.name.toLowerCase().includes(val) || t.customer.phone.includes(val);
            if (matches) {
                seen.add(t.customer.phone);
                unique.push(t.customer);
            }
        }
    });

    renderCustomerSuggestions(unique.slice(0, 5));
}

function renderCustomerSuggestions(list) {
    const dropdown = document.getElementById("customer-suggestions");
    if (list.length === 0) {
        dropdown.innerHTML = `<li>No matching customers. Press Enter to use literal value</li>`;
        dropdown.classList.remove("hidden");
        return;
    }

    dropdown.innerHTML = list.map(c => `
        <li onclick="selectPOSCustomer('${c.name}', '${c.phone}')"><strong>${c.name}</strong> (${c.phone})</li>
    `).join("");
    dropdown.classList.remove("hidden");
}

function selectPOSCustomer(name, phone) {
    AppState.billingCustomer = { name, phone };
    document.getElementById("pos-customer-search-input").value = name;
    document.getElementById("customer-suggestions").classList.add("hidden");

    document.getElementById("billing-customer-badge").innerHTML = `<span>Billing: <strong>${name} (${phone})</strong></span>`;
}

// Financial math orchestrator
let CalculatedPOSBill = {
    subtotal: 0,
    tax: 0,
    discount: 0,
    depositDeducted: 0,
    grandTotal: 0
};

function calculatePOSBill() {
    const sym = AppState.settings.currencySymbol || "Rs.";
    const taxRate = parseFloat(AppState.settings.taxRate || 0);
    document.getElementById("pos-tax-percentage-label").textContent = taxRate;

    const subtotal = AppState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    // Calculate discounts
    const discVal = parseFloat(document.getElementById("pos-discount-value").value || 0);
    const discType = document.getElementById("pos-discount-type").value;
    let discount = 0;

    if (discType === "pct") {
        discount = subtotal * (discVal / 100);
    } else {
        discount = discVal;
    }

    // Prevent discount from exceeding subtotal
    discount = Math.min(subtotal, discount);

    // Tax computation
    const taxable = Math.max(0, subtotal - discount);
    const tax = taxable * (taxRate / 100);

    let grandTotal = taxable + tax;

    // Deduct ticket deposit if outstanding repair job linked
    let deposit = 0;
    const depositRow = document.getElementById("pos-deposit-discount-row");

    if (AppState.activeTicketId) {
        const ticket = AppState.tickets.find(t => t.id === AppState.activeTicketId);
        if (ticket) {
            deposit = ticket.depositPaid || 0;
            // Prevent deposit deduction from reducing grand total below zero
            deposit = Math.min(grandTotal, deposit);

            document.getElementById("pos-calc-deposit").textContent = `-${sym} ${deposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
            depositRow.classList.remove("hidden");
        }
    } else {
        depositRow.classList.add("hidden");
    }

    grandTotal = Math.max(0, grandTotal - deposit);

    // Save calculations to local scope
    CalculatedPOSBill = {
        subtotal,
        tax,
        discount,
        depositDeducted: deposit,
        grandTotal
    };

    // Populate outputs
    document.getElementById("pos-calc-subtotal").textContent = `${sym} ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    document.getElementById("pos-calc-tax").textContent = `${sym} ${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    document.getElementById("pos-calc-discount").textContent = `-${sym} ${discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    document.getElementById("pos-calc-grandtotal").textContent = `${sym} ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    // Re-trigger cash math
    calculatePOSChangeDue();
}

function calculatePOSChangeDue() {
    const sym = AppState.settings.currencySymbol || "Rs.";
    const activeMethod = document.querySelector('input[name="payment_method"]:checked').value;

    if (activeMethod !== "Cash") {
        return;
    }

    const amountTendered = parseFloat(document.getElementById("pos-amount-tendered").value || 0);
    const change = Math.max(0, amountTendered - CalculatedPOSBill.grandTotal);

    document.getElementById("pos-change-returned").textContent = `${sym} ${change.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function handlePOSCheckoutComplete() {
    if (AppState.cart.length === 0) {
        showToast("Cannot checkout an empty billing cart!", "error");
        return;
    }

    // Read selections
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
    const amountTendered = parseFloat(document.getElementById("pos-amount-tendered").value || 0);

    if (paymentMethod === "Cash" && amountTendered < CalculatedPOSBill.grandTotal) {
        showToast("Tendered cash is less than the grand total amount!", "error");
        return;
    }

    // Compile POS Receipt transaction data
    const transaction = {
        id: `TX-${20000 + AppState.transactions.length + 1}`,
        date: new Date().toISOString(),
        customer: { ...AppState.billingCustomer },
        ticketId: AppState.activeTicketId,
        items: [...AppState.cart],
        subtotal: CalculatedPOSBill.subtotal,
        tax: CalculatedPOSBill.tax,
        discount: CalculatedPOSBill.discount,
        depositDeducted: CalculatedPOSBill.depositDeducted,
        grandTotal: CalculatedPOSBill.grandTotal,
        paymentMethod: paymentMethod,
        amountTendered: paymentMethod === "Cash" ? amountTendered : CalculatedPOSBill.grandTotal,
        changeGiven: paymentMethod === "Cash" ? Math.max(0, amountTendered - CalculatedPOSBill.grandTotal) : 0
    };

    // Deduct inventory count for parts used
    AppState.cart.forEach(cartItem => {
        const invItem = AppState.inventory.find(i => i.sku === cartItem.sku);
        if (invItem && invItem.category !== "Labor") {
            invItem.stock = Math.max(0, invItem.stock - cartItem.qty);
        }
    });

    // Update ticket status to Collected/Closed if ticket linked
    if (AppState.activeTicketId) {
        const ticket = AppState.tickets.find(t => t.id === AppState.activeTicketId);
        if (ticket) {
            ticket.status = "Collected";
        }
    }

    // Log Transaction inside states
    AppState.transactions.unshift(transaction);
    saveStateToStorage();

    showToast(`Transaction ${transaction.id} processed successfully!`, "success");

    // Open Beautiful print layout receipt template modal
    openInvoiceModal(transaction);

    // Reset cart states
    AppState.cart = [];
    AppState.activeTicketId = null;
    AppState.billingCustomer = { name: "Walk-in Cash Client", phone: "" };
    document.getElementById("pos-customer-search-input").value = "";
    document.getElementById("pos-discount-value").value = "";
    document.getElementById("pos-amount-tendered").value = "";

    // Update screens
    populatePOSSelectors();
    renderPOSCart();
    renderInventory();
    updateDashboardSummaryMetrics();
}

// ==========================================================================
// 9. Modal Window Controller & Printing Generators
// ==========================================================================
function openInvoiceModal(transaction) {
    const backdrop = document.getElementById("invoice-modal");
    const container = document.getElementById("invoice-print-container");

    // Build receipt layout template inside modal dynamically
    container.innerHTML = generateReceiptHTML(transaction);
    backdrop.classList.remove("hidden");
}

function closeInvoiceModal() {
    document.getElementById("invoice-modal").classList.add("hidden");
}

function generateReceiptHTML(tx) {
    const sym = AppState.settings.currencySymbol || "Rs.";
    const shop = AppState.settings;

    const dateFormatted = new Date(tx.date).toLocaleString();

    // Items markup
    const thermalItemsHtml = tx.items.map(item => `
        <div class="thermal-item-row">
            <span class="thermal-item-desc">${item.qty}x ${item.name}</span>
            <span>${sym} ${(item.price * item.qty).toLocaleString()}</span>
        </div>
    `).join("");

    const a4ItemsHtml = tx.items.map((item, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td><strong>${item.name}</strong><br><span style="font-size:0.7rem; color:#777;">Code: ${item.sku}</span></td>
            <td>${item.qty}</td>
            <td>${sym} ${item.price.toLocaleString()}</td>
            <td><strong>${sym} ${(item.price * item.qty).toLocaleString()}</strong></td>
        </tr>
    `).join("");

    // Generate both representations inside a toggle container or side-by-side
    return `
        <!-- THERMAL RECEIPT (Default compact print layout) -->
        <div class="receipt-layout-thermal hide-on-print-a4" id="receipt-thermal">
            <div class="receipt-header-thermal">
                <h2>${shop.shopName}</h2>
                <p>${shop.address}</p>
                <p>Tel: ${shop.phone}</p>
            </div>
            <div class="receipt-meta-thermal">
                <div><strong>RECEIPT ID:</strong> ${tx.id}</div>
                <div><strong>DATE:</strong> ${dateFormatted}</div>
                <div><strong>CLIENT:</strong> ${tx.customer.name}</div>
                ${tx.customer.phone ? `<div><strong>PHONE:</strong> ${tx.customer.phone}</div>` : ""}
                ${tx.ticketId ? `<div><strong>REPAIR ID:</strong> ${tx.ticketId}</div>` : ""}
            </div>
            <div class="receipt-items-thermal">
                ${thermalItemsHtml}
            </div>
            <div class="receipt-math-thermal">
                <div class="math-row">
                    <span>Subtotal:</span>
                    <span>${sym} ${tx.subtotal.toLocaleString()}</span>
                </div>
                ${tx.discount > 0 ? `<div class="math-row"><span>Discount:</span><span>-${sym} ${tx.discount.toLocaleString()}</span></div>` : ""}
                <div class="math-row">
                    <span>Tax (${shop.taxRate}%):</span>
                    <span>${sym} ${tx.tax.toLocaleString()}</span>
                </div>
                ${tx.depositDeducted > 0 ? `<div class="math-row"><span>Deposit Applied:</span><span>-${sym} ${tx.depositDeducted.toLocaleString()}</span></div>` : ""}
                <div class="math-row grand">
                    <span>TOTAL AMOUNT DUE:</span>
                    <span>${sym} ${tx.grandTotal.toLocaleString()}</span>
                </div>
                <div class="math-row" style="margin-top:6px; font-size:0.75rem;">
                    <span>Method:</span>
                    <span>${tx.paymentMethod}</span>
                </div>
                ${tx.paymentMethod === 'Cash' ? `
                    <div class="math-row" style="font-size:0.75rem;">
                        <span>Paid Tendered:</span>
                        <span>${sym} ${tx.amountTendered.toLocaleString()}</span>
                    </div>
                    <div class="math-row" style="font-size:0.75rem;">
                        <span>Change Returned:</span>
                        <span>${sym} ${tx.changeGiven.toLocaleString()}</span>
                    </div>
                ` : ""}
            </div>
            <div class="receipt-footer-thermal">
                <p>Thank you for choosing Lanka Mobiles!</p>
                <p>Visit again for fast diagnostic fixes.</p>
            </div>
        </div>

        <!-- PROFESSIONAL A4 LETTER INVOICE (Optional alternate print layout) -->
        <div class="receipt-layout-a4 hidden hide-on-print-thermal" id="receipt-a4">
            <div class="receipt-header-a4">
                <div class="shop-credentials-a4">
                    <h2>${shop.shopName}</h2>
                    <p>${shop.address}</p>
                    <p>Phone: ${shop.phone} | Email: ${shop.email}</p>
                </div>
                <div class="invoice-title-a4">
                    <h3>TAX INVOICE</h3>
                    <p><strong>Invoice No:</strong> ${tx.id}</p>
                    <p><strong>Date:</strong> ${new Date(tx.date).toLocaleDateString()}</p>
                </div>
            </div>
            
            <div class="receipt-addresses-a4">
                <div class="address-block-a4">
                    <h4>Billed To (Customer)</h4>
                    <p><strong>Name:</strong> ${tx.customer.name}</p>
                    ${tx.customer.phone ? `<p><strong>Phone:</strong> ${tx.customer.phone}</p>` : ""}
                    ${tx.customer.email ? `<p><strong>Email:</strong> ${tx.customer.email}</p>` : ""}
                </div>
                <div class="address-block-a4" style="text-align:right;">
                    <h4>Repair Job Summary</h4>
                    ${tx.ticketId ? `
                        <p><strong>Repair Ticket:</strong> ${tx.ticketId}</p>
                        <p><strong>Intake Date:</strong> ${dateFormatted.split(',')[0]}</p>
                        <p><strong>Outstanding Balance Paid</strong></p>
                    ` : `
                        <p><strong>Direct POS counter sales</strong></p>
                        <p>Walk-in checkout</p>
                    `}
                </div>
            </div>

            <div class="receipt-items-a4">
                <table>
                    <thead>
                        <tr>
                            <th style="width:8%;">#</th>
                            <th style="width:52%;">Item & Labor Description</th>
                            <th style="width:10%;">Qty</th>
                            <th style="width:15%;">Unit Cost</th>
                            <th style="width:15%;">Total Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${a4ItemsHtml}
                    </tbody>
                </table>
            </div>

            <div class="receipt-math-a4">
                <div class="receipt-math-a4-box">
                    <div class="math-row-a4">
                        <span>Subtotal Value:</span>
                        <span>${sym} ${tx.subtotal.toLocaleString()}</span>
                    </div>
                    ${tx.discount > 0 ? `<div class="math-row-a4"><span>Discount Deducted:</span><span>-${sym} ${tx.discount.toLocaleString()}</span></div>` : ""}
                    <div class="math-row-a4">
                        <span>Sales Tax (${shop.taxRate}%):</span>
                        <span>${sym} ${tx.tax.toLocaleString()}</span>
                    </div>
                    ${tx.depositDeducted > 0 ? `<div class="math-row-a4"><span>Deposit Advance Paid:</span><span>-${sym} ${tx.depositDeducted.toLocaleString()}</span></div>` : ""}
                    <div class="math-row-a4 grand">
                        <span>Grand Total Balance:</span>
                        <span>${sym} ${tx.grandTotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div class="receipt-footer-a4">
                <div style="font-size:0.75rem; text-align:left; color:#555; margin-bottom:20px; white-space:pre-line;">
                    <strong>Warranty Policies & Repair Terms:</strong><br>${shop.terms}
                </div>
                <p>This is a computer-generated tax transaction invoice document.</p>
                <p><strong>Thank you for your business!</strong></p>
            </div>
        </div>
    `;
}

function triggerReceiptPrint(format) {
    const thermal = document.getElementById("receipt-thermal");
    const a4 = document.getElementById("receipt-a4");

    if (format === "thermal") {
        thermal.classList.remove("hidden");
        a4.classList.add("hidden");

        // Add specialized custom print tags
        document.body.classList.remove("print-a4-mode");
        document.body.classList.add("print-thermal-mode");
    } else {
        thermal.classList.add("hidden");
        a4.classList.remove("hidden");

        document.body.classList.remove("print-thermal-mode");
        document.body.classList.add("print-a4-mode");
    }

    // Trigger OS core print layout sheet
    setTimeout(() => {
        window.print();
    }, 250);
}

// ==========================================================================
// 10. Inventory stock details management mechanics
// ==========================================================================
function renderInventory() {
    const search = document.getElementById("inventory-search").value.toLowerCase();
    const tbody = document.getElementById("inventory-table-body");
    const sym = AppState.settings.currencySymbol || "Rs.";

    const filtered = AppState.inventory.filter(item => {
        return item.name.toLowerCase().includes(search) ||
            item.sku.toLowerCase().includes(search) ||
            item.category.toLowerCase().includes(search);
    });

    // Update header stats
    document.getElementById("inv-total-skus").textContent = AppState.inventory.length;
    const outStockCount = AppState.inventory.filter(item => item.category !== "Labor" && item.stock <= 0).length;
    document.getElementById("inv-out-of-stock").textContent = outStockCount;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No matching inventory items.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((item, idx) => {
        const isLabor = item.category === "Labor";
        const isLow = !isLabor && item.stock <= 3;
        const isOut = !isLabor && item.stock <= 0;

        let stockBadge = "";
        if (isLabor) {
            stockBadge = `<span class="status-badge ready">Service Fee</span>`;
        } else if (isOut) {
            stockBadge = `<span class="status-badge received">Out of stock</span>`;
        } else if (isLow) {
            stockBadge = `<span class="status-badge awaiting-parts">Low Stock: ${item.stock}</span>`;
        } else {
            stockBadge = `<span class="status-badge ready">In Stock: ${item.stock}</span>`;
        }

        return `
            <tr>
                <td><strong>${item.sku}</strong></td>
                <td><strong>${item.name}</strong></td>
                <td><span class="text-muted">${item.category}</span></td>
                <td>${stockBadge}</td>
                <td>${sym} ${item.cost.toLocaleString()}</td>
                <td><strong>${sym} ${item.price.toLocaleString()}</strong></td>
                <td>
                    <div style="display:inline-flex; gap:6px;">
                        <button class="btn btn-secondary" onclick="openInventoryModal(${idx})" style="padding:6px 10px; font-size:0.75rem;">Edit</button>
                        <button class="btn btn-danger" onclick="deleteInventoryItem(${idx})" style="padding:6px 10px; font-size:0.75rem;"><i data-lucide="trash-2" style="width:10px; height:10px;"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    lucide.createIcons();
}

function openInventoryModal(index = null) {
    const modal = document.getElementById("inventory-modal");
    const title = document.getElementById("inventory-modal-title");
    const form = document.getElementById("inventory-item-form");

    form.reset();

    if (index !== null) {
        // Edit item mode
        const item = AppState.inventory[index];
        title.textContent = "Edit Inventory Item";
        document.getElementById("inventory-edit-index").value = index;

        document.getElementById("inv-name").value = item.name;
        document.getElementById("inv-sku").value = item.sku;
        document.getElementById("inv-sku").readOnly = true; // SKU immutable
        document.getElementById("inv-category").value = item.category;
        document.getElementById("inv-stock").value = item.stock;
        document.getElementById("inv-cost").value = item.cost;
        document.getElementById("inv-price").value = item.price;
    } else {
        // New item mode
        title.textContent = "Create Stock Inventory Item";
        document.getElementById("inventory-edit-index").value = "";
        document.getElementById("inv-sku").readOnly = false;

        // Auto generate sku code
        document.getElementById("inv-sku").value = `SKU-${1000 + AppState.inventory.length + 1}`;
    }

    modal.classList.remove("hidden");
}

function closeInventoryModal() {
    document.getElementById("inventory-modal").classList.add("hidden");
}

function handleSaveInventoryItem(e) {
    e.preventDefault();

    const indexStr = document.getElementById("inventory-edit-index").value;
    const sku = document.getElementById("inv-sku").value;

    const itemData = {
        sku: sku,
        name: document.getElementById("inv-name").value,
        category: document.getElementById("inv-category").value,
        stock: parseInt(document.getElementById("inv-stock").value || 0),
        cost: parseFloat(document.getElementById("inv-cost").value || 0),
        price: parseFloat(document.getElementById("inv-price").value || 0)
    };

    if (indexStr !== "") {
        // Edit mode save
        const idx = parseInt(indexStr);
        AppState.inventory[idx] = itemData;
        showToast("Inventory item updated successfully!", "success");
    } else {
        // Double check sku code uniqueness
        if (AppState.inventory.some(item => item.sku === sku)) {
            showToast(`SKU code ${sku} already cataloged in database!`, "error");
            return;
        }
        AppState.inventory.unshift(itemData);
        showToast("New stock item registered successfully!", "success");
    }

    saveStateToStorage();
    closeInventoryModal();
    renderInventory();
}

function deleteInventoryItem(index) {
    const item = AppState.inventory[index];
    if (!item) return;

    if (confirm(`Warning! Are you sure you want to delete ${item.name} from the catalog inventory?`)) {
        AppState.inventory.splice(index, 1);
        saveStateToStorage();
        showToast("Catalog item removed.", "info");
        renderInventory();
    }
}

// ==========================================================================
// 11. Company configurations forms handler
// ==========================================================================
function renderSettingsForm() {
    const shop = AppState.settings;

    document.getElementById("settings-shop-name").value = shop.shopName;
    document.getElementById("settings-shop-phone").value = shop.phone;
    document.getElementById("settings-shop-email").value = shop.email;
    document.getElementById("settings-shop-address").value = shop.address;
    document.getElementById("settings-shop-tax").value = shop.taxRate;
    document.getElementById("settings-shop-currency").value = shop.currencySymbol;
    document.getElementById("settings-shop-terms").value = shop.terms;

    // Populate security credentials
    document.getElementById("settings-security-username").value = shop.loginUsername || "admin";
    document.getElementById("settings-security-password").value = shop.loginPassword || "admin123";

    // Profile tags update
    document.querySelector(".sidebar .brand-name").textContent = shop.shopName;
}

function handleSaveShopSettings(e) {
    e.preventDefault();

    AppState.settings = {
        shopName: document.getElementById("settings-shop-name").value,
        phone: document.getElementById("settings-shop-phone").value,
        email: document.getElementById("settings-shop-email").value,
        address: document.getElementById("settings-shop-address").value,
        taxRate: parseFloat(document.getElementById("settings-shop-tax").value || 0),
        currencySymbol: document.getElementById("settings-shop-currency").value,
        terms: document.getElementById("settings-shop-terms").value,
        // Preserve authentication credentials across shop settings saves
        loginUsername: AppState.settings.loginUsername || DEFAULT_SETTINGS.loginUsername,
        loginPassword: AppState.settings.loginPassword || DEFAULT_SETTINGS.loginPassword
    };

    saveStateToStorage();
    renderSettingsForm();
    showToast("Business profile updated successfully!", "success");
}

function handleSaveSecuritySettings(e) {
    e.preventDefault();

    const newUsername = document.getElementById("settings-security-username").value.trim();
    const newPassword = document.getElementById("settings-security-password").value.trim();

    if (!newUsername || !newPassword) {
        showToast("Username and password cannot be empty.", "error");
        return;
    }

    AppState.settings.loginUsername = newUsername;
    AppState.settings.loginPassword = newPassword;

    saveStateToStorage();
    showToast("Portal credentials updated successfully! Use new login next time.", "success");
}

// ==========================================================================
// 12. Backup files operations (JSON imports & exports)
// ==========================================================================
function handleExportBackupFile() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);

    const shopClean = AppState.settings.shopName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().split('T')[0];

    dlAnchorElem.setAttribute("download", `fixflow_db_${shopClean}_${date}.json`);
    dlAnchorElem.click();

    showToast("Offline JSON database downloaded successfully!", "success");
}

function handleImportBackupFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
        try {
            const parsed = JSON.parse(evt.target.result);

            // Check essential keys
            if (parsed.settings && parsed.tickets && parsed.inventory && parsed.transactions) {
                AppState.settings = parsed.settings;
                AppState.tickets = parsed.tickets;
                AppState.inventory = parsed.inventory;
                AppState.transactions = parsed.transactions;

                saveStateToStorage();

                // Refresh UI views
                renderSettingsForm();
                renderDashboard();
                updateDashboardSummaryMetrics();
                renderInventory();

                showToast("System database restored successfully from JSON backup!", "success");
            } else {
                showToast("Invalid backup structure. Missing schema databases.", "error");
            }
        } catch (err) {
            showToast("Failed to parse file. Ensure it is a valid JSON database file.", "error");
        }
    };
    reader.readAsText(file);
}

function handleWipeDatabase() {
    if (confirm("CRITICAL WARNING! This will permanently erase all customers, transactions, inventory edits, and reset the dashboard. Are you absolutely sure?")) {
        // Preserve login credentials before wiping
        const savedUsername = AppState.settings.loginUsername || DEFAULT_SETTINGS.loginUsername;
        const savedPassword = AppState.settings.loginPassword || DEFAULT_SETTINGS.loginPassword;

        localStorage.removeItem("fixflow_data_store");

        // Reset state object - keep security credentials intact
        AppState = {
            settings: {
                ...DEFAULT_SETTINGS,
                loginUsername: savedUsername,
                loginPassword: savedPassword
            },
            tickets: [],
            inventory: [...DEFAULT_INVENTORY],
            transactions: [],
            activeTab: "dashboard",
            viewMode: "kanban",
            cart: [],
            activeTicketId: null,
            billingCustomer: { name: "Walk-in Cash Client", phone: "" },
            currentChecklist: {
                power: "untested", display: "untested", touch: "untested", charge: "untested",
                cameras: "untested", audio: "untested", wifi: "untested", liquid: "untested"
            }
        };

        saveStateToStorage();

        // Sync and refresh
        renderSettingsForm();
        renderDashboard();
        updateDashboardSummaryMetrics();
        renderInventory();

        showToast("Database wiped. Factory presets loaded.", "info");
    }
}

// ==========================================================================
// 13. Preload Demo Data Sandbox Engine
// ==========================================================================
function injectDemoData() {
    const demoCompany = {
        shopName: "Lanka Mobiles & Repairs",
        phone: "+94 81 223 4455",
        email: "fix@lankamobiles.com",
        address: "No. 45 Temple Street, Kandy",
        taxRate: 10,
        currencySymbol: "Rs.",
        terms: "1. Warranty covers only parts replaced for 45 days from handover.\n2. Invoices must be submitted at checkout for warranty verification.\n3. Deposit advance is strictly non-refundable."
    };

    const today = new Date();
    const formatDate = (daysOffset) => {
        const d = new Date(today);
        d.setDate(today.getDate() + daysOffset);
        return d.toISOString().split('T')[0];
    };

    const demoTickets = [
        {
            id: "T-1001",
            customer: {
                name: "Ranuka Perera",
                phone: "0771234567",
                email: "ranuka@gmail.com",
                address: "Peradeniya Rd, Kandy"
            },
            device: {
                type: "Mobile",
                brand: "Apple",
                model: "iPhone 13",
                serial: "IMEI-883920199482910",
                passcode: "8899"
            },
            checklist: {
                power: "ok", display: "bad", touch: "bad", charge: "ok",
                cameras: "ok", audio: "ok", wifi: "ok", liquid: "ok"
            },
            accessories: ["Charger", "Case"],
            issue: "Cracked display glass, touch input completely dead. Needs premium screen replacement.",
            tech: "Main Tech",
            status: "Ready",
            estimatedCost: 29500,
            depositPaid: 5000,
            dueDate: formatDate(-1), // Due yesterday, ready for pickup
            dateCreated: formatDate(-3)
        },
        {
            id: "T-1002",
            customer: {
                name: "Dilini Senanayake",
                phone: "0719876543",
                email: "dilini@yahoo.com",
                address: "Nuwara Eliya"
            },
            device: {
                type: "Laptop",
                brand: "Asus",
                model: "ZenBook Flip UX360",
                serial: "ASUS-ZB-773921094",
                passcode: "Pattern 'U'"
            },
            checklist: {
                power: "bad", display: "ok", touch: "untested", charge: "bad",
                cameras: "ok", audio: "untested", wifi: "untested", liquid: "untested"
            },
            accessories: ["Charger"],
            issue: "Not turning on, battery swelling up and charging port pin feels broken.",
            tech: "Sarah Micro-Solderer",
            status: "In Progress",
            estimatedCost: 18500,
            depositPaid: 3000,
            dueDate: formatDate(2), // due in 2 days
            dateCreated: formatDate(-1)
        },
        {
            id: "T-1003",
            customer: {
                name: "Kasun Jayawardena",
                phone: "0725556677",
                email: "kasun@outlook.com",
                address: "Katugastota, Kandy"
            },
            device: {
                type: "Desktop",
                brand: "Custom PC",
                model: "Ryzen 5 Workstation",
                serial: "N/A",
                passcode: "12345"
            },
            checklist: {
                power: "ok", display: "ok", touch: "untested", charge: "ok",
                cameras: "untested", audio: "ok", wifi: "ok", liquid: "ok"
            },
            accessories: [],
            issue: "Overheating and shutting down during rendering work. Needs full thermal paste cleaning service.",
            tech: "John Repairer",
            status: "Inspection",
            estimatedCost: 3500,
            depositPaid: 0,
            dueDate: formatDate(1),
            dateCreated: formatDate(0)
        },
        {
            id: "T-1004",
            customer: {
                name: "Fathima Rizna",
                phone: "0763322110",
                email: "rizna@gmail.com",
                address: "Akurana"
            },
            device: {
                type: "Tablet",
                brand: "Apple",
                model: "iPad Air 4th Gen",
                serial: "GG998822001",
                passcode: "None provided"
            },
            checklist: {
                power: "ok", display: "ok", touch: "ok", charge: "ok",
                cameras: "ok", audio: "ok", wifi: "bad", liquid: "ok"
            },
            accessories: ["Stylus Pen"],
            issue: "Wi-Fi option greyed out in settings. Suspected antenna chip issue. Awaiting parts from supplier.",
            tech: "Sarah Micro-Solderer",
            status: "Awaiting Parts",
            estimatedCost: 12000,
            depositPaid: 2000,
            dueDate: formatDate(5),
            dateCreated: formatDate(-4)
        }
    ];

    // Historical completed transactions for analytics
    const demoTransactions = [
        {
            id: "TX-20001",
            date: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago today
            customer: {
                name: "Harsha De Silva",
                phone: "0778889999"
            },
            ticketId: null,
            items: [
                { sku: "ACC-IP14-CASE", name: "iPhone 14 Heavy-Duty Case", price: 1800, qty: 1 },
                { sku: "SKU-IP11-BAT", name: "iPhone 11 Battery Part Upgrade", price: 8900, qty: 1 },
                { sku: "FEE-MOBILE-LBR", name: "Mobile Repair Disassembly Labor Service", price: 2500, qty: 1 }
            ],
            subtotal: 13200,
            tax: 1320,
            discount: 1000, // Flat Rs.1000 discount
            depositDeducted: 0,
            grandTotal: 13520,
            paymentMethod: "Card",
            amountTendered: 13520,
            changeGiven: 0
        },
        {
            id: "TX-20002",
            date: new Date(today.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago today
            customer: {
                name: "Ranuka Perera",
                phone: "0771234567"
            },
            ticketId: "T-1001",
            items: [
                { sku: "LBR-REPAIR", name: "Technical Repair Labor: Screen replacement", price: 29500, qty: 1 }
            ],
            subtotal: 29500,
            tax: 2950,
            discount: 0,
            depositDeducted: 5000, // deposit paid back
            grandTotal: 27450,
            paymentMethod: "Cash",
            amountTendered: 30000,
            changeGiven: 2550
        }
    ];

    // Load mock elements to state - preserve existing login credentials
    AppState.settings = {
        ...demoCompany,
        loginUsername: AppState.settings.loginUsername || DEFAULT_SETTINGS.loginUsername,
        loginPassword: AppState.settings.loginPassword || DEFAULT_SETTINGS.loginPassword
    };
    AppState.tickets = demoTickets;
    AppState.transactions = demoTransactions;
    AppState.inventory = [...DEFAULT_INVENTORY];

    // Set low stock items for visual feedback
    AppState.inventory.find(i => i.sku === "SKU-S22-SCR").stock = 1;
    AppState.inventory.find(i => i.sku === "ACC-IP14-CASE").stock = 0;

    saveStateToStorage();

    // Rerender active views
    renderSettingsForm();
    renderDashboard();
    updateDashboardSummaryMetrics();
    renderInventory();
    renderTicketsListAndBoard();
    populatePOSSelectors();

    showToast("Sandbox demo database injected successfully! Have fun testing.", "success");

    // Switch to Dashboard
    switchTab("dashboard");
}

// ==========================================================================
// 14. Staff Authentication & Session Management
// ==========================================================================

/**
 * Checks if the staff is authenticated for the current browser session.
 * Shows login screen if not authenticated.
 */
function checkAuthSession() {
    const isAuthenticated = sessionStorage.getItem("fixflow_authenticated") === "true";
    if (isAuthenticated) {
        hideLoginScreen();
    } else {
        showLoginScreen();
    }
}

/**
 * Shows the full-screen login overlay.
 */
function showLoginScreen() {
    const screen = document.getElementById("login-screen");
    screen.classList.remove("hidden");
    // Reset form fields
    document.getElementById("login-form").reset();
    document.getElementById("login-error-message").classList.add("hidden");
    // Reset password type
    const pwInput = document.getElementById("login-password");
    pwInput.type = "password";
    document.getElementById("password-toggle-icon").setAttribute("data-lucide", "eye");
    lucide.createIcons();
    // Focus on username
    setTimeout(() => {
        document.getElementById("login-username").focus();
    }, 100);
}

/**
 * Hides the full-screen login overlay (grants access to dashboard).
 */
function hideLoginScreen() {
    const screen = document.getElementById("login-screen");
    screen.classList.add("hidden");
}

/**
 * Handles the login form submission - validates credentials.
 */
function handleLogin(e) {
    e.preventDefault();

    const enteredUsername = document.getElementById("login-username").value.trim();
    const enteredPassword = document.getElementById("login-password").value;

    const correctUsername = AppState.settings.loginUsername || DEFAULT_SETTINGS.loginUsername;
    const correctPassword = AppState.settings.loginPassword || DEFAULT_SETTINGS.loginPassword;

    if (enteredUsername === correctUsername && enteredPassword === correctPassword) {
        // Successful login — mark session as authenticated
        sessionStorage.setItem("fixflow_authenticated", "true");

        // Update the sidebar username display
        document.getElementById("current-user-name").textContent = enteredUsername;

        // Hide the login screen with animation
        hideLoginScreen();

        showToast(`Welcome back, ${enteredUsername}! Access granted.`, "success");
    } else {
        // Failed login — show error banner with shake animation
        const errorEl = document.getElementById("login-error-message");
        const errorText = document.getElementById("login-error-text");
        errorText.textContent = "Invalid username or password. Please try again.";

        // Force re-animation by removing then re-adding the class
        errorEl.classList.remove("hidden");
        errorEl.style.animation = "none";
        errorEl.offsetHeight; // Trigger reflow
        errorEl.style.animation = "shake 0.4s ease-in-out";

        // Clear the password field
        document.getElementById("login-password").value = "";
        document.getElementById("login-password").focus();
    }
}

/**
 * Handles the logout action - clears session and shows login screen.
 */
function handleLogout() {
    if (confirm("Are you sure you want to log out of FixFlow POS?")) {
        sessionStorage.removeItem("fixflow_authenticated");
        showToast("Logged out successfully. See you soon!", "info");
        setTimeout(() => {
            showLoginScreen();
        }, 800);
    }
}
