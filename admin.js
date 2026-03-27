// admin.js - PocketBase Admin Panel with Cloudinary Integration

// ==================== CONFIGURATION ====================
const PB_URL = "https://itrain.services.hodessy.com";
const COLLECTION_NAME = "exclusive_ecommerce";

const CLOUDINARY_CLOUD_NAME = "dmi2ddzrb";
const CLOUDINARY_UPLOAD_PRESET = "ecommerce_products";

// ==================== INITIALIZATION ====================
let pb = null;
let currentPage = 1;
let productsPerPage = 10;
let allProducts = [];
let filteredProducts = [];
let uploadedImages = [];
let colorImages = new Map();

// Initialize PocketBase
try {
    pb = new PocketBase(PB_URL);
    window.pb = pb;
    console.log("✅ PocketBase initialized with URL:", PB_URL);
} catch (error) {
    console.error("❌ Failed to initialize PocketBase:", error);
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Admin page loaded");
    await checkConnection();
    await loadProducts();
    setupEventListeners();
    updateStats();
    setupNavigation();
    setupTagTypeListener();
    setupCloudinaryUpload();
    setupColorsManager();
    setupCancelButton();
    setupSliderManagement(); // Initialize slider management
});

// ==================== CLOUDINARY UPLOAD ====================
function setupCloudinaryUpload() {
    const uploadBtn = document.getElementById('upload-images-btn');
    if (!uploadBtn) return;
    
    uploadBtn.addEventListener('click', () => {
        const widget = cloudinary.createUploadWidget(
            {
                cloudName: CLOUDINARY_CLOUD_NAME,
                uploadPreset: CLOUDINARY_UPLOAD_PRESET,
                multiple: true,
                maxFiles: 10,
                folder: 'ecommerce_products',
                sources: ['local', 'url', 'camera', 'google_drive'],
                styles: {
                    palette: {
                        window: "#FFFFFF",
                        sourceBg: "#F4F4F4",
                        windowBorder: "#EBEBEB",
                        tabIcon: "#db4444",
                        inactiveTabIcon: "#555",
                        menuIcons: "#db4444",
                        link: "#db4444",
                        action: "#FF620C",
                        inProgress: "#0078FF",
                        complete: "#20B832",
                        error: "#EA2727",
                        textDark: "#000000",
                        textLight: "#FFFFFF"
                    }
                }
            },
            (error, result) => {
                if (error) {
                    console.error("Upload error:", error);
                    showNotification('Upload failed: ' + error.message, 'error');
                    return;
                }
                
                if (result && result.event === "success") {
                    const imageUrl = result.info.secure_url;
                    uploadedImages.push(imageUrl);
                    updateImagePreview();
                    updateImageField();
                    showNotification('Image uploaded successfully!', 'success');
                }
            }
        );
        widget.open();
    });
}

function updateImagePreview() {
    const previewContainer = document.getElementById('image-preview-container');
    if (!previewContainer) return;
    
    if (uploadedImages.length === 0) {
        previewContainer.innerHTML = '<div class="image-placeholder">No images uploaded yet</div>';
        return;
    }
    
    previewContainer.innerHTML = uploadedImages.map((url, index) => `
        <div class="image-preview-item">
            <img src="${url}" alt="Product image ${index + 1}">
            <button type="button" class="remove-image" data-index="${index}">×</button>
            ${index === 0 ? '<span class="main-badge">Main Image</span>' : ''}
        </div>
    `).join('');
    
    document.querySelectorAll('.remove-image').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const index = parseInt(btn.dataset.index);
            uploadedImages.splice(index, 1);
            updateImagePreview();
            updateImageField();
        });
    });
}

function updateImageField() {
    const imageField = document.getElementById('product-images-json');
    if (imageField) {
        imageField.value = JSON.stringify(uploadedImages);
    }
}

function loadProductImages(imagesArray) {
    uploadedImages = imagesArray || [];
    updateImagePreview();
    updateImageField();
}

// ==================== COLORS MANAGER ====================
function setupColorsManager() {
    const addColorBtn = document.getElementById('add-color-btn');
    if (!addColorBtn) return;
    
    addColorBtn.addEventListener('click', () => {
        addColorRow();
    });
}

function addColorRow(colorName = '', colorImageUrl = '') {
    const colorsContainer = document.getElementById('colors-container');
    if (!colorsContainer) return;
    
    const rowId = 'color-row-' + Date.now();
    const row = document.createElement('div');
    row.className = 'color-row';
    row.id = rowId;
    
    row.innerHTML = `
        <div class="color-name-input">
            <input type="text" class="color-name" placeholder="Color name (e.g., Red, Blue, Black)" value="${escapeHtml(colorName)}">
        </div>
        <div class="color-image-upload">
            <div class="color-image-preview">
                ${colorImageUrl ? `<img src="${colorImageUrl}" alt="Color preview">` : '<div class="image-placeholder-small">No image</div>'}
            </div>
            <button type="button" class="upload-color-btn" data-row="${rowId}">
                <i class="fas fa-cloud-upload-alt"></i> Upload Image
            </button>
            <input type="hidden" class="color-image-url" value="${colorImageUrl}">
            <button type="button" class="remove-color-btn" data-row="${rowId}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    colorsContainer.appendChild(row);
    
    const uploadBtn = row.querySelector('.upload-color-btn');
    uploadBtn.addEventListener('click', () => {
        uploadColorImage(rowId);
    });
    
    const removeBtn = row.querySelector('.remove-color-btn');
    removeBtn.addEventListener('click', () => {
        row.remove();
        colorImages.delete(rowId);
    });
    
    if (colorImageUrl) {
        colorImages.set(rowId, colorImageUrl);
    }
}

function uploadColorImage(rowId) {
    const widget = cloudinary.createUploadWidget(
        {
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            multiple: false,
            folder: 'ecommerce_colors',
            styles: {
                palette: {
                    window: "#FFFFFF",
                    sourceBg: "#F4F4F4",
                    windowBorder: "#EBEBEB",
                    tabIcon: "#db4444",
                    inactiveTabIcon: "#555",
                    menuIcons: "#db4444",
                    link: "#db4444",
                    action: "#FF620C",
                    inProgress: "#0078FF",
                    complete: "#20B832",
                    error: "#EA2727"
                }
            }
        },
        (error, result) => {
            if (error) {
                console.error("Upload error:", error);
                showNotification('Upload failed: ' + error.message, 'error');
                return;
            }
            
            if (result && result.event === "success") {
                const imageUrl = result.info.secure_url;
                colorImages.set(rowId, imageUrl);
                
                const row = document.getElementById(rowId);
                if (row) {
                    const preview = row.querySelector('.color-image-preview');
                    const hiddenInput = row.querySelector('.color-image-url');
                    preview.innerHTML = `<img src="${imageUrl}" alt="Color preview">`;
                    hiddenInput.value = imageUrl;
                }
                showNotification('Color image uploaded successfully!', 'success');
            }
        }
    );
    widget.open();
}

function getColorsData() {
    const colors = [];
    const rows = document.querySelectorAll('.color-row');
    
    rows.forEach(row => {
        const colorName = row.querySelector('.color-name')?.value.trim();
        const colorImageUrl = row.querySelector('.color-image-url')?.value;
        
        if (colorName && colorImageUrl) {
            colors.push({
                name: colorName.toLowerCase(),
                code: getColorCode(colorName),
                img: colorImageUrl
            });
        }
    });
    
    return colors;
}

function getColorCode(colorName) {
    const colorMap = {
        'red': '#ff0000', 'blue': '#0000ff', 'green': '#00ff00', 'black': '#000000',
        'white': '#ffffff', 'yellow': '#ffff00', 'purple': '#800080', 'pink': '#ff69b4',
        'orange': '#ffa500', 'gray': '#808080', 'grey': '#808080', 'brown': '#8b4513',
        'navy': '#000080', 'teal': '#008080', 'gold': '#ffd700', 'silver': '#c0c0c0'
    };
    return colorMap[colorName.toLowerCase()] || '#cccccc';
}

function loadColorsData(colorsArray) {
    const colorsContainer = document.getElementById('colors-container');
    if (colorsContainer) {
        colorsContainer.innerHTML = '';
    }
    colorImages.clear();
    
    if (colorsArray && colorsArray.length > 0) {
        colorsArray.forEach(color => {
            addColorRow(color.name, color.img);
        });
    }
}

// ==================== CONNECTION CHECK ====================
async function checkConnection() {
    try {
        const response = await fetch(`${PB_URL}/api/health`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        console.log("✅ PocketBase connection successful");
        return true;
    } catch (error) {
        console.error("❌ PocketBase connection failed:", error);
        return false;
    }
}

// ==================== LOAD PRODUCTS ====================
async function loadProducts() {
    try {
        if (!pb) throw new Error("PocketBase not initialized");
        
        console.log("Loading products from PocketBase...");
        
        const products = await Promise.race([
            pb.collection(COLLECTION_NAME).getFullList({ sort: '-created', $autoCancel: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 10000))
        ]);
        
        console.log("✅ Products loaded successfully:", products.length);
        allProducts = products.map(p => formatProduct(p));
        filteredProducts = [...allProducts];
        
        renderProductsTable();
        
    } catch (error) {
        console.error("Error loading products:", error);
        const productsList = document.getElementById('products-list');
        if (productsList) {
            productsList.innerHTML = `§<td colspan="9" style="text-align: center; padding: 40px; color: #f44336;">Error: ${error.message}<br><button onclick="location.reload()" class="btn-primary" style="margin-top: 20px;">Retry</button>§</tr>`;
        }
    }
}

function formatProduct(p) {
    let imageUrl = '/images/placeholder.jpg';
    if (p.image) {
        if (typeof p.image === 'string' && p.image.startsWith('http')) {
            imageUrl = p.image;
        }
    }
    
    let additionalImages = [];
    if (p.additional_images) {
        if (Array.isArray(p.additional_images)) {
            additionalImages = p.additional_images;
        } else if (typeof p.additional_images === 'string') {
            try {
                additionalImages = JSON.parse(p.additional_images);
            } catch(e) { additionalImages = []; }
        }
    }
    
    let colors = [];
    if (p.colors) {
        if (Array.isArray(p.colors)) {
            colors = p.colors;
        } else if (typeof p.colors === 'string') {
            try {
                colors = JSON.parse(p.colors);
            } catch(e) { colors = []; }
        }
    }
    
    let sizes = [];
    if (p.sizes) {
        if (Array.isArray(p.sizes)) {
            sizes = p.sizes;
        } else if (typeof p.sizes === 'string') {
            sizes = p.sizes.split(',').map(s => s.trim()).filter(s => s);
        }
    }
    
    let tag = '';
    if (p.flashSale) tag = 'flash';
    else if (p.bestselling) tag = 'best';
    else if (p.newArrival) tag = 'new';
    
    return {
        id: p.id,
        name: p.name || 'Unnamed Product',
        price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
        oldPrice: p.oldPrice,
        category: p.category || 'Uncategorized',
        img: imageUrl,
        additionalImages: additionalImages,
        rating: p.rating || 4,
        reviews: p.reviews || 0,
        stock: p.stock !== false,
        tag: tag,
        description: p.description || '',
        colors: colors,
        sizes: sizes,
        discount: p.discount || 10
    };
}

// ==================== RENDER PRODUCTS TABLE ====================
function renderProductsTable() {
    const tbody = document.getElementById('products-list');
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    const pageProducts = filteredProducts.slice(start, end);
    
    if (!tbody) return;
    
    if (pageProducts.length === 0 && filteredProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 60px;"><i class="fas fa-box-open" style="font-size: 48px; color: #ccc;"></i><p>No products found. Create your first product!</p><button onclick="document.getElementById('add-product-btn')?.click()" class="btn-primary">Add Product</button></td></tr>`;
        return;
    }
    
    tbody.innerHTML = pageProducts.map(product => `
        <tr>
            <td><input type="checkbox" class="product-checkbox" data-id="${product.id}"></td>
            <td><img src="${product.img}" alt="${product.name}" class="product-thumb" onerror="this.src='/images/placeholder.jpg'"></td>
            <td><strong>${escapeHtml(product.name)}</strong></td>
            <td>${escapeHtml(product.category)}</td>
            <td><span style="color: var(--primary); font-weight: 600;">$${product.price.toFixed(2)}</span>${product.oldPrice ? `<span style="text-decoration: line-through; color: #999; margin-left: 8px;">$${product.oldPrice.toFixed(2)}</span>` : ''}</td>
            <td><span style="color: ${product.stock ? '#4CAF50' : '#f44336'}">${product.stock ? 'In Stock' : 'Out of Stock'}</span></td>
            <td>${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))} (${product.reviews})</td>
            <td>${getStatusBadge(product.tag)}</td>
            <td class="action-buttons"><button class="action-btn edit-btn" onclick="editProduct('${product.id}')"><i class="fas fa-edit"></i> Edit</button><button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')"><i class="fas fa-trash"></i> Delete</button></td>
        </tr>
    `).join('');
    
    renderPagination();
}

function getStatusBadge(tag) {
    switch(tag) {
        case 'flash': return '<span class="status-badge status-flash"><i class="fas fa-bolt"></i> Flash Sale</span>';
        case 'best': return '<span class="status-badge status-best"><i class="fas fa-fire"></i> Best Selling</span>';
        case 'new': return '<span class="status-badge status-new"><i class="fas fa-star"></i> New Arrival</span>';
        default: return '<span class="status-badge">—</span>';
    }
}

// ==================== PAGINATION ====================
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const pageNumbers = document.getElementById('page-numbers');
    if (!pageNumbers) return;
    
    if (totalPages <= 1) { pageNumbers.innerHTML = ''; return; }
    
    let pagesHtml = '';
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        pagesHtml += `<div class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</div>`;
    }
    
    pageNumbers.innerHTML = pagesHtml;
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

function goToPage(page) { currentPage = page; renderProductsTable(); }

function filterProducts() {
    const searchTerm = document.getElementById('search-products')?.value.toLowerCase() || '';
    const category = document.getElementById('filter-category')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    
    filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !category || product.category === category;
        const matchesStatus = !status || product.tag === status;
        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    currentPage = 1;
    renderProductsTable();
    updateStats();
}

// ==================== SETUP LISTENERS ====================
function setupTagTypeListener() {
    const tagTypeSelect = document.getElementById('product-tag-type');
    if (tagTypeSelect) {
        tagTypeSelect.addEventListener('change', function() {
            const discountField = document.getElementById('discount-field');
            if (discountField) discountField.style.display = this.value === 'flash' ? 'flex' : 'none';
        });
    }
}

// ==================== SAVE PRODUCT ====================
async function saveProduct() {
    if (!pb) {
        showNotification("PocketBase not connected", "error");
        return;
    }
    
    const id = document.getElementById('product-id').value;
    const tagType = document.getElementById('product-tag-type')?.value || 'none';
    const discount = parseInt(document.getElementById('product-discount')?.value) || 10;
    
    let mainImage = '';
    let additionalImages = [];
    
    if (uploadedImages.length > 0) {
        mainImage = uploadedImages[0];
        additionalImages = uploadedImages.slice(1);
    }
    
    const colors = getColorsData();
    
    const sizesInput = document.getElementById('product-sizes')?.value || '';
    let sizes = [];
    if (sizesInput.trim()) {
        sizes = sizesInput.split(',').map(s => s.trim()).filter(s => s);
    }
    
    const productData = {
        name: document.getElementById('product-name')?.value || '',
        price: parseFloat(document.getElementById('product-price')?.value) || 0,
        oldPrice: parseFloat(document.getElementById('product-oldprice')?.value) || null,
        category: document.getElementById('product-category')?.value || '',
        image: mainImage,
        additional_images: additionalImages,
        rating: parseFloat(document.getElementById('product-rating')?.value) || 4,
        reviews: parseInt(document.getElementById('product-reviews')?.value) || 0,
        stock: document.getElementById('product-stock')?.value === 'true',
        description: document.getElementById('product-description')?.value || '',
        colors: colors,
        sizes: sizes,
        discount: discount,
        flashSale: tagType === 'flash',
        bestselling: tagType === 'best',
        newArrival: tagType === 'new'
    };
    
    try {
        if (id) {
            await pb.collection(COLLECTION_NAME).update(id, productData);
            showNotification('Product updated successfully!', 'success');
        } else {
            await pb.collection(COLLECTION_NAME).create(productData);
            showNotification('Product added successfully!', 'success');
        }
        
        resetForm();
        
        const modal = document.getElementById('product-modal');
        if (modal) modal.classList.remove('active');
        await loadProducts();
        updateStats();
        
    } catch (error) {
        console.error("Error saving product:", error);
        showNotification('Error saving product: ' + error.message, 'error');
    }
}

// ==================== EDIT PRODUCT ====================
async function editProduct(id) {
    if (!pb) {
        showNotification("PocketBase not connected", "error");
        return;
    }
    
    try {
        const product = await pb.collection(COLLECTION_NAME).getOne(id);
        
        document.getElementById('modal-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-price').value = product.price || 0;
        document.getElementById('product-oldprice').value = product.oldPrice || '';
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-rating').value = product.rating || 4;
        document.getElementById('product-reviews').value = product.reviews || 0;
        document.getElementById('product-stock').value = product.stock !== false;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-discount').value = product.discount || 10;
        
        const images = [];
        if (product.image) images.push(product.image);
        if (product.additional_images && product.additional_images.length > 0) {
            images.push(...product.additional_images);
        }
        loadProductImages(images);
        
        if (product.colors && product.colors.length > 0) {
            loadColorsData(product.colors);
        } else {
            loadColorsData([]);
        }
        
        if (product.sizes && product.sizes.length > 0) {
            document.getElementById('product-sizes').value = product.sizes.join(', ');
        } else {
            document.getElementById('product-sizes').value = '';
        }
        
        let tag = 'none';
        if (product.flashSale) tag = 'flash';
        else if (product.bestselling) tag = 'best';
        else if (product.newArrival) tag = 'new';
        document.getElementById('product-tag-type').value = tag;
        
        const discountField = document.getElementById('discount-field');
        if (discountField) discountField.style.display = tag === 'flash' ? 'flex' : 'none';
        
        const modal = document.getElementById('product-modal');
        if (modal) modal.classList.add('active');
        
    } catch (error) {
        console.error("Error loading product for edit:", error);
        showNotification('Error loading product', 'error');
    }
}

// ==================== DELETE PRODUCT ====================
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    if (!pb) { showNotification("PocketBase not connected", "error"); return; }
    
    try {
        await pb.collection(COLLECTION_NAME).delete(id);
        showNotification('Product deleted successfully!', 'success');
        await loadProducts();
        updateStats();
    } catch (error) {
        console.error("Error deleting product:", error);
        showNotification('Error deleting product: ' + error.message, 'error');
    }
}

// ==================== UPDATE STATS ====================
function updateStats() {
    document.getElementById('total-products').textContent = allProducts.length;
    const categories = new Set(allProducts.map(p => p.category));
    document.getElementById('total-categories').textContent = categories.size;
    const totalValue = allProducts.reduce((sum, p) => sum + p.price, 0);
    document.getElementById('total-value').textContent = `$${totalValue.toFixed(2)}`;
    const bestSellers = allProducts.filter(p => p.tag === 'best').length;
    document.getElementById('best-sellers').textContent = bestSellers;
}

// ==================== UTILITIES ====================
function resetForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    uploadedImages = [];
    updateImagePreview();
    updateImageField();
    loadColorsData([]);
    
    const tagType = document.getElementById('product-tag-type');
    if (tagType) tagType.value = 'none';
    
    const discountField = document.getElementById('discount-field');
    if (discountField) discountField.style.display = 'none';
}

function setupCancelButton() {
    const cancelBtn = document.getElementById('cancel-modal');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const modal = document.getElementById('product-modal');
            if (modal) modal.classList.remove('active');
            resetForm();
        });
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white; padding: 12px 24px; border-radius: 8px; z-index: 9999;
        animation: slideIn 0.3s ease; display: flex; align-items: center; gap: 12px;
    `;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.animation = 'slideOut 0.3s ease'; setTimeout(() => notification.remove(), 300); }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    const modal = document.getElementById('product-modal');
    const addBtn = document.getElementById('add-product-btn');
    const closeModal = document.querySelector('.close-modal');
    
    if (addBtn) {
        addBtn.onclick = () => {
            resetForm();
            if (modal) modal.classList.add('active');
        };
    }
    
    if (closeModal) closeModal.onclick = () => modal.classList.remove('active');
    if (modal) modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
    
    const productForm = document.getElementById('product-form');
    if (productForm) productForm.onsubmit = async (e) => { e.preventDefault(); await saveProduct(); };
    
    const searchInput = document.getElementById('search-products');
    if (searchInput) searchInput.oninput = filterProducts;
    
    const filterCategory = document.getElementById('filter-category');
    if (filterCategory) filterCategory.onchange = filterProducts;
    
    const filterStatus = document.getElementById('filter-status');
    if (filterStatus) filterStatus.onchange = filterProducts;
    
    const selectAll = document.getElementById('select-all');
    if (selectAll) selectAll.onchange = (e) => document.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = e.target.checked);
    
    const prevPage = document.getElementById('prev-page');
    if (prevPage) prevPage.onclick = () => { if (currentPage > 1) goToPage(currentPage - 1); };
    
    const nextPage = document.getElementById('next-page');
    if (nextPage) nextPage.onclick = () => { const totalPages = Math.ceil(filteredProducts.length / productsPerPage); if (currentPage < totalPages) goToPage(currentPage + 1); };
}

// ==================== NAVIGATION ====================
function setupNavigation() {
    // First, hide all sections
    const allSections = document.querySelectorAll('.content-section');
    allSections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Show products section by default
    const productsSection = document.getElementById('products-section');
    if (productsSection) {
        productsSection.classList.add('active');
        productsSection.style.display = 'block';
    }
    
    // Set up navigation click handlers
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.content-section').forEach(sectionEl => {
                sectionEl.classList.remove('active');
                sectionEl.style.display = 'none';
            });
            
            const activeSection = document.getElementById(`${section}-section`);
            if (activeSection) {
                activeSection.classList.add('active');
                activeSection.style.display = 'block';
                console.log(`Showing section: ${section}-section`);
            }
        });
    });
}

// ==================== SLIDER MANAGEMENT WITH CLOUDINARY UPLOAD ====================

let slides = [];
let categories = [];

// Initialize slider management
async function setupSliderManagement() {
    const addSlideBtn = document.getElementById('add-slide-btn');
    if (addSlideBtn) {
        addSlideBtn.addEventListener('click', () => {
            openSlideModal();
        });
    }
    await loadCategories();
    await loadSlides();
}

// Load categories from products
async function loadCategories() {
    try {
        const products = await pb.collection("exclusive_ecommerce").getFullList({
            sort: 'category',
            $autoCancel: false
        });
        
        const uniqueCategories = [...new Set(products.map(p => p.category).filter(c => c))];
        categories = uniqueCategories.map(cat => ({
            name: cat,
            value: cat.toLowerCase()
        }));
        
        console.log("Loaded categories:", categories);
        
    } catch (error) {
        console.error("Error loading categories:", error);
        categories = [
            { name: "Phones", value: "phones" },
            { name: "Computers", value: "computers" },
            { name: "SmartWatch", value: "smartwatch" },
            { name: "Headphones", value: "headphones" },
            { name: "Gaming", value: "gaming" },
            { name: "Cameras", value: "cameras" },
            { name: "Fashion", value: "fashion" },
            { name: "Furniture", value: "furniture" }
        ];
    }
}

// Upload slide image to Cloudinary
function uploadSlideImageToCloudinary(type) {
    console.log("Opening Cloudinary upload for:", type);
    
    const widget = cloudinary.createUploadWidget(
        {
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            multiple: false,
            folder: type === 'image' ? 'ecommerce_slides' : 'ecommerce_logos',
            sources: ['local', 'url', 'camera', 'google_drive'],
            styles: {
                palette: {
                    window: "#FFFFFF",
                    sourceBg: "#F4F4F4",
                    windowBorder: "#EBEBEB",
                    tabIcon: "#db4444",
                    inactiveTabIcon: "#555",
                    menuIcons: "#db4444",
                    link: "#db4444",
                    action: "#FF620C",
                    inProgress: "#0078FF",
                    complete: "#20B832",
                    error: "#EA2727"
                }
            }
        },
        (error, result) => {
            if (error) {
                console.error("Upload error:", error);
                showNotification('Upload failed: ' + error.message, 'error');
                return;
            }
            
            if (result && result.event === "success") {
                const imageUrl = result.info.secure_url;
                console.log("Upload successful:", imageUrl);
                
                if (type === 'image') {
                    const previewContainer = document.getElementById('slide-image-preview');
                    if (previewContainer) {
                        previewContainer.innerHTML = `
                            <div class="image-preview-item">
                                <img src="${imageUrl}" alt="Slide image">
                                <button type="button" class="remove-slide-image" data-type="image">×</button>
                            </div>
                        `;
                        document.getElementById('slide-image-url').value = imageUrl;
                        
                        // Add remove button handler
                        const removeBtn = previewContainer.querySelector('.remove-slide-image');
                        if (removeBtn) {
                            removeBtn.addEventListener('click', () => {
                                previewContainer.innerHTML = '<div class="image-placeholder">No image uploaded</div>';
                                document.getElementById('slide-image-url').value = '';
                            });
                        }
                    }
                } else {
                    const previewContainer = document.getElementById('slide-logo-preview');
                    if (previewContainer) {
                        previewContainer.innerHTML = `
                            <div class="image-preview-item">
                                <img src="${imageUrl}" alt="Logo">
                                <button type="button" class="remove-slide-image" data-type="logo">×</button>
                            </div>
                        `;
                        document.getElementById('slide-logo-url').value = imageUrl;
                        
                        // Add remove button handler
                        const removeBtn = previewContainer.querySelector('.remove-slide-image');
                        if (removeBtn) {
                            removeBtn.addEventListener('click', () => {
                                previewContainer.innerHTML = '<div class="image-placeholder">No logo uploaded</div>';
                                document.getElementById('slide-logo-url').value = '';
                            });
                        }
                    }
                }
                
                showNotification('Image uploaded successfully!', 'success');
            }
        }
    );
    widget.open();
}

// Open modal for adding/editing slide
function openSlideModal(slide = null) {
    // Create modal if it doesn't exist
    let slideModal = document.getElementById('slide-modal');
    
    if (!slideModal) {
        slideModal = document.createElement('div');
        slideModal.id = 'slide-modal';
        slideModal.className = 'modal';
        slideModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="slide-modal-title">Add New Slide</h3>
                    <button class="close-slide-modal">&times;</button>
                </div>
                <form id="slide-form">
                    <input type="hidden" id="slide-id">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Title *</label>
                            <input type="text" id="slide-title" placeholder="Slide title" required>
                        </div>
                        <div class="form-group">
                            <label>Subtitle</label>
                            <input type="text" id="slide-subtitle" placeholder="Slide subtitle">
                        </div>
                    </div>
                    
                    <div class="form-group full-width">
                        <label>Description</label>
                        <textarea id="slide-description" rows="3" placeholder="Slide description..."></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Button Text</label>
                            <input type="text" id="slide-button-text" placeholder="Shop Now" value="Shop Now">
                        </div>
                        <div class="form-group">
                            <label>Link to Category</label>
                            <select id="slide-category" required>
                                <option value="">Select Category</option>
                                ${categories.map(cat => `<option value="${cat.value}">${cat.name}</option>`).join('')}
                            </select>
                            <small>When clicked, users will be taken to this category page</small>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Order</label>
                            <input type="number" id="slide-order" value="0" min="0">
                        </div>
                        <div class="form-group">
                            <label>Active</label>
                            <select id="slide-active">
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Background Color</label>
                            <input type="color" id="slide-bg-color" value="#000000">
                        </div>
                    </div>
                    
                    <div class="form-group full-width">
                        <label>Main Image</label>
                        <div class="image-upload-area">
                            <button type="button" id="upload-slide-image-btn" class="btn-primary">
                                <i class="fas fa-cloud-upload-alt"></i> Upload Slide Image
                            </button>
                            <div id="slide-image-preview" class="image-preview-grid">
                                <div class="image-placeholder">No image uploaded</div>
                            </div>
                            <input type="hidden" id="slide-image-url">
                            <small>Upload image to Cloudinary (will be auto-optimized)</small>
                        </div>
                    </div>
                    
                    <div class="form-group full-width">
                        <label>Logo Image (Optional)</label>
                        <div class="image-upload-area">
                            <button type="button" id="upload-slide-logo-btn" class="btn-secondary">
                                <i class="fas fa-cloud-upload-alt"></i> Upload Logo
                            </button>
                            <div id="slide-logo-preview" class="image-preview-grid">
                                <div class="image-placeholder">No logo uploaded</div>
                            </div>
                            <input type="hidden" id="slide-logo-url">
                            <small>Upload logo to Cloudinary (optional)</small>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" id="cancel-slide-modal">Cancel</button>
                        <button type="submit" class="btn-primary">Save Slide</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(slideModal);
        
        // Setup close buttons
        const closeBtn = slideModal.querySelector('.close-slide-modal');
        const cancelBtn = slideModal.querySelector('#cancel-slide-modal');
        
        closeBtn.onclick = () => {
            slideModal.classList.remove('active');
        };
        
        cancelBtn.onclick = () => {
            slideModal.classList.remove('active');
        };
        
        slideModal.onclick = (e) => {
            if (e.target === slideModal) {
                slideModal.classList.remove('active');
            }
        };
        
        // Setup form submission
        const slideForm = slideModal.querySelector('#slide-form');
        slideForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveSlide();
        });
    }
    
    // Always update categories dropdown
    const categorySelect = document.getElementById('slide-category');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Select Category</option>' + 
            categories.map(cat => `<option value="${cat.value}">${cat.name}</option>`).join('');
    }
    
    // Setup upload buttons - CRITICAL: Re-attach listeners every time modal opens
    const uploadImageBtn = document.getElementById('upload-slide-image-btn');
    const uploadLogoBtn = document.getElementById('upload-slide-logo-btn');
    
    if (uploadImageBtn) {
        // Remove existing listeners by cloning and replacing
        const newUploadImageBtn = uploadImageBtn.cloneNode(true);
        uploadImageBtn.parentNode.replaceChild(newUploadImageBtn, uploadImageBtn);
        newUploadImageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Upload image button clicked");
            uploadSlideImageToCloudinary('image');
        });
    }
    
    if (uploadLogoBtn) {
        // Remove existing listeners by cloning and replacing
        const newUploadLogoBtn = uploadLogoBtn.cloneNode(true);
        uploadLogoBtn.parentNode.replaceChild(newUploadLogoBtn, uploadLogoBtn);
        newUploadLogoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Upload logo button clicked");
            uploadSlideImageToCloudinary('logo');
        });
    }
    
    // Populate form if editing
    if (slide) {
        document.getElementById('slide-id').value = slide.id;
        document.getElementById('slide-title').value = slide.title;
        document.getElementById('slide-subtitle').value = slide.subtitle;
        document.getElementById('slide-description').value = slide.description || '';
        document.getElementById('slide-button-text').value = slide.buttonText;
        document.getElementById('slide-category').value = slide.category || '';
        document.getElementById('slide-order').value = slide.order;
        document.getElementById('slide-active').value = slide.active ? 'true' : 'false';
        document.getElementById('slide-bg-color').value = slide.bgColor;
        
        // Show existing images
        const imagePreview = document.getElementById('slide-image-preview');
        const logoPreview = document.getElementById('slide-logo-preview');
        
        if (imagePreview) {
            if (slide.image && slide.image !== '/images/placeholder.jpg') {
                imagePreview.innerHTML = `<div class="image-preview-item"><img src="${slide.image}"><button type="button" class="remove-slide-image" data-type="image">×</button></div>`;
                document.getElementById('slide-image-url').value = slide.image;
                
                // Add remove handler
                const removeBtn = imagePreview.querySelector('.remove-slide-image');
                if (removeBtn) {
                    removeBtn.addEventListener('click', () => {
                        imagePreview.innerHTML = '<div class="image-placeholder">No image uploaded</div>';
                        document.getElementById('slide-image-url').value = '';
                    });
                }
            } else {
                imagePreview.innerHTML = '<div class="image-placeholder">No image uploaded</div>';
            }
        }
        
        if (logoPreview) {
            if (slide.logo) {
                logoPreview.innerHTML = `<div class="image-preview-item"><img src="${slide.logo}"><button type="button" class="remove-slide-image" data-type="logo">×</button></div>`;
                document.getElementById('slide-logo-url').value = slide.logo;
                
                // Add remove handler
                const removeBtn = logoPreview.querySelector('.remove-slide-image');
                if (removeBtn) {
                    removeBtn.addEventListener('click', () => {
                        logoPreview.innerHTML = '<div class="image-placeholder">No logo uploaded</div>';
                        document.getElementById('slide-logo-url').value = '';
                    });
                }
            } else {
                logoPreview.innerHTML = '<div class="image-placeholder">No logo uploaded</div>';
            }
        }
        
        document.getElementById('slide-modal-title').textContent = 'Edit Slide';
    } else {
        // Reset form
        document.getElementById('slide-form').reset();
        document.getElementById('slide-id').value = '';
        document.getElementById('slide-title').value = '';
        document.getElementById('slide-subtitle').value = '';
        document.getElementById('slide-description').value = '';
        document.getElementById('slide-button-text').value = 'Shop Now';
        document.getElementById('slide-category').value = '';
        document.getElementById('slide-order').value = slides.length + 1;
        document.getElementById('slide-active').value = 'true';
        document.getElementById('slide-bg-color').value = '#000000';
        
        const imagePreview = document.getElementById('slide-image-preview');
        if (imagePreview) imagePreview.innerHTML = '<div class="image-placeholder">No image uploaded</div>';
        
        const logoPreview = document.getElementById('slide-logo-preview');
        if (logoPreview) logoPreview.innerHTML = '<div class="image-placeholder">No logo uploaded</div>';
        
        document.getElementById('slide-image-url').value = '';
        document.getElementById('slide-logo-url').value = '';
        document.getElementById('slide-modal-title').textContent = 'Add New Slide';
    }
    
    slideModal.classList.add('active');
}

// Save slide
async function saveSlide() {
    const id = document.getElementById('slide-id').value;
    const imageUrl = document.getElementById('slide-image-url').value.trim();
    const logoUrl = document.getElementById('slide-logo-url').value.trim();
    const categoryValue = document.getElementById('slide-category').value;
    
    // Build the button link based on selected category
    const buttonLink = categoryValue ? `/product-category.html?category=${encodeURIComponent(categoryValue)}` : '#';
    
    const slideData = {
        title: document.getElementById('slide-title').value.trim(),
        subtitle: document.getElementById('slide-subtitle').value.trim(),
        description: document.getElementById('slide-description').value.trim(),
        button_text: document.getElementById('slide-button-text').value.trim(),
        button_link: buttonLink,
        category: categoryValue,
        order: parseInt(document.getElementById('slide-order').value) || 0,
        active: document.getElementById('slide-active').value === 'true',
        bg_color: document.getElementById('slide-bg-color').value,
        image: imageUrl,
        logo: logoUrl
    };
    
    // Validate
    if (!slideData.title) {
        showNotification('Title is required', 'error');
        return;
    }
    
    if (!slideData.image) {
        showNotification('Please upload a slide image', 'error');
        return;
    }
    
    if (!slideData.category) {
        showNotification('Please select a category', 'error');
        return;
    }
    
    console.log("Saving slide data:", slideData);
    
    try {
        let result;
        if (id) {
            result = await pb.collection("slider_slides").update(id, slideData);
            showNotification('Slide updated successfully!', 'success');
        } else {
            result = await pb.collection("slider_slides").create(slideData);
            showNotification('Slide added successfully!', 'success');
        }
        
        console.log("Save result:", result);
        
        const modal = document.getElementById('slide-modal');
        if (modal) modal.classList.remove('active');
        await loadSlides();
        
    } catch (error) {
        console.error("Error saving slide:", error);
        
        if (error.data && error.data.data) {
            const fieldErrors = Object.entries(error.data.data)
                .map(([field, err]) => `${field}: ${err.message}`)
                .join('\n');
            showNotification(`Error: ${fieldErrors}`, 'error');
        } else {
            showNotification('Error saving slide: ' + error.message, 'error');
        }
    }
}

// Delete slide
async function deleteSlide(id) {
    try {
        await pb.collection("slider_slides").delete(id);
        showNotification('Slide deleted successfully!', 'success');
        await loadSlides();
    } catch (error) {
        console.error("Error deleting slide:", error);
        showNotification('Error deleting slide: ' + error.message, 'error');
    }
}

// Update slide active status
async function updateSlideActive(id, isActive) {
    try {
        await pb.collection("slider_slides").update(id, { active: isActive });
        showNotification(`Slide ${isActive ? 'activated' : 'deactivated'}!`, 'success');
    } catch (error) {
        console.error("Error updating slide status:", error);
        await loadSlides();
    }
}

// Format slide data
function formatSlide(slide) {
    return {
        id: slide.id,
        title: slide.title || "",
        subtitle: slide.subtitle || "",
        description: slide.description || "",
        image: slide.image || '/images/placeholder.jpg',
        logo: slide.logo || '',
        buttonText: slide.button_text || "Shop Now",
        buttonLink: slide.button_link || "#",
        category: slide.category || "",
        order: slide.order || 0,
        active: slide.active !== false,
        bgColor: slide.bg_color || "#000"
    };
}

// Load slides from PocketBase
async function loadSlides() {
    const slidesList = document.getElementById('slides-list');
    if (!slidesList) return;
    
    try {
        if (!pb) {
            slidesList.innerHTML = '<div class="slides-empty">PocketBase not connected</div>';
            return;
        }
        
        const result = await pb.collection("slider_slides").getFullList({
            sort: 'order',
            $autoCancel: false
        });
        
        slides = result.map(s => formatSlide(s));
        renderSlidesList();
        
    } catch (error) {
        console.error("Error loading slides:", error);
        slidesList.innerHTML = `<div class="slides-empty">Error loading slides: ${error.message}</div>`;
    }
}

// Render slides list
function renderSlidesList() {
    const slidesList = document.getElementById('slides-list');
    if (!slidesList) return;
    
    if (slides.length === 0) {
        slidesList.innerHTML = `
            <div class="slides-empty">
                <i class="fas fa-images" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <p>No slides yet. Click "Add New Slide" to create your first slide.</p>
            </div>
        `;
        return;
    }
    
    slidesList.innerHTML = `
        <div class="slides-table-container">
            <table class="slides-table">
                <thead>
                    <tr>
                        <th style="width: 60px;">Order</th>
                        <th style="width: 80px;">Image</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th style="width: 80px;">Active</th>
                        <th style="width: 120px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${slides.map(slide => `
                        <tr data-id="${slide.id}">
                            <td>
                                <input type="number" class="slide-order" value="${slide.order}" min="0" step="1" style="width: 60px; padding: 4px;">
                            </td>
                            <td>
                                <img src="${slide.image}" alt="${slide.title}" class="slide-thumb" onerror="this.src='/images/placeholder.jpg'">
                            </td>
                            <td><strong>${escapeHtml(slide.title)}</strong></td>
                            <td>${escapeHtml(slide.category) || '—'}</td>
                            <td>
                                <label class="switch">
                                    <input type="checkbox" class="slide-active" ${slide.active ? 'checked' : ''}>
                                    <span class="slider round"></span>
                                </label>
                            </td>
                            <td class="action-buttons">
                                <button class="action-btn edit-slide-btn" data-id="${slide.id}">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="action-btn delete-slide-btn" data-id="${slide.id}">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="slides-actions">
            <button id="save-slide-orders" class="btn-primary">
                <i class="fas fa-save"></i> Save Order
            </button>
        </div>
    `;
    
    // Add event listeners for edit buttons
    document.querySelectorAll('.edit-slide-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const slide = slides.find(s => s.id === id);
            if (slide) openSlideModal(slide);
        });
    });
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-slide-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (confirm('Are you sure you want to delete this slide?')) {
                await deleteSlide(id);
            }
        });
    });
    
    // Add event listeners for active toggle
    document.querySelectorAll('.slide-active').forEach((checkbox, index) => {
        checkbox.addEventListener('change', async () => {
            const slide = slides[index];
            if (slide) {
                await updateSlideActive(slide.id, checkbox.checked);
            }
        });
    });
    
    // Add event listener for save orders button
    const saveOrdersBtn = document.getElementById('save-slide-orders');
    if (saveOrdersBtn) {
        saveOrdersBtn.addEventListener('click', async () => {
            const orderInputs = document.querySelectorAll('.slide-order');
            const updates = [];
            
            orderInputs.forEach((input, index) => {
                const slide = slides[index];
                const newOrder = parseInt(input.value);
                if (slide && newOrder !== slide.order) {
                    updates.push({
                        id: slide.id,
                        order: newOrder
                    });
                }
            });
            
            if (updates.length === 0) {
                showNotification('No changes to save', 'info');
                return;
            }
            
            try {
                for (const update of updates) {
                    await pb.collection("slider_slides").update(update.id, { order: update.order });
                }
                await loadSlides();
                showNotification('Slide orders updated!', 'success');
            } catch (error) {
                console.error("Error updating orders:", error);
                showNotification('Error updating orders', 'error');
            }
        });
    }
}

// ==================== MOBILE MENU ====================
function setupMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (!menuToggle) return;
    
    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    menuToggle.addEventListener('click', () => {
        if (sidebar.classList.contains('active')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });
    
    overlay.addEventListener('click', closeSidebar);
    
    // Close sidebar when a nav item is clicked (on mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    });
    
    // Close sidebar on window resize if screen becomes larger
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            closeSidebar();
        }
    });
}

// Call this in your DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    // ... rest of your initialization
});

console.log("✅ Admin.js loaded with Cloudinary integration");
console.log("Connected to:", PB_URL);
console.log("Collection:", COLLECTION_NAME);