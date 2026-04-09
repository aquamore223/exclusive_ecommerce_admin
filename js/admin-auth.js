// admin-auth.js - Admin Authentication (for index.html login page)

// ==================== CONFIGURATION ====================
const PB_URL = "https://itrain.services.hodessy.com";
const ADMIN_COLLECTION = "admin_users";
const ADMIN_SECRET_KEY = "ExclusiveAdmin2024!";

// Initialize PocketBase globally for login page
let pb = null;

try {
    pb = new PocketBase(PB_URL);
    window.pb = pb; // Make it globally available
    console.log("✅ PocketBase initialized for login");
} catch (error) {
    console.error("❌ Failed to initialize PocketBase:", error);
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin auth page loaded");
    checkExistingSession();
    setupEventListeners();
    setupFormToggles();
});

function checkExistingSession() {
    const isLoggedIn = sessionStorage.getItem('adminAuthenticated');
    if (isLoggedIn === 'true') {
        window.location.href = 'admin-dashboard.html';
    }
}

function setupFormToggles() {
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (showSignup) {
        const newShowSignup = showSignup.cloneNode(true);
        showSignup.parentNode.replaceChild(newShowSignup, showSignup);
        newShowSignup.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginForm) loginForm.style.display = 'none';
            if (signupForm) signupForm.style.display = 'block';
        });
    }
    
    if (showLogin) {
        const newShowLogin = showLogin.cloneNode(true);
        showLogin.parentNode.replaceChild(newShowLogin, showLogin);
        newShowLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (signupForm) signupForm.style.display = 'none';
            if (loginForm) loginForm.style.display = 'block';
        });
    }
}

function setupEventListeners() {
    const loginFormElement = document.getElementById('admin-login-form');
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin();
        });
    }
    
    const signupFormElement = document.getElementById('admin-signup-form');
    if (signupFormElement) {
        signupFormElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSignup();
        });
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const submitBtn = document.querySelector('#admin-login-form button');
    
    if (!email || !password) {
        showError(errorDiv, 'Please fill in all fields');
        return;
    }
    
    if (!pb) {
        showError(errorDiv, 'System initializing. Please refresh and try again.');
        return;
    }
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;
    if (errorDiv) errorDiv.classList.remove('show');
    
    try {
        const authData = await pb.collection(ADMIN_COLLECTION).authWithPassword(email, password);
        
        if (authData && authData.record) {
            sessionStorage.setItem('adminAuthenticated', 'true');
            sessionStorage.setItem('adminEmail', email);
            sessionStorage.setItem('adminName', authData.record.name || email.split('@')[0]);
            sessionStorage.setItem('adminId', authData.record.id);
            
            window.location.href = 'admin-dashboard.html';
        }
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Invalid email or password';
        if (error.message && error.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to server. Please check your connection.';
        }
        showError(errorDiv, errorMessage);
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleSignup() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const secretKey = document.getElementById('signup-secret-key').value;
    const errorDiv = document.getElementById('signup-error');
    const successDiv = document.getElementById('signup-success');
    const submitBtn = document.querySelector('#admin-signup-form button');
    
    if (!name || !email || !password || !confirmPassword || !secretKey) {
        showError(errorDiv, 'Please fill in all fields');
        return;
    }
    
    if (secretKey !== ADMIN_SECRET_KEY) {
        showError(errorDiv, 'Invalid admin secret key');
        return;
    }
    
    if (password !== confirmPassword) {
        showError(errorDiv, 'Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showError(errorDiv, 'Password must be at least 6 characters');
        return;
    }
    
    if (!pb) {
        showError(errorDiv, 'System initializing. Please refresh and try again.');
        return;
    }
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;
    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');
    
    try {
        const userData = {
            name: name,
            email: email,
            emailVisibility: true,
            password: password,
            passwordConfirm: confirmPassword,
            role: 'admin',
            isAdmin: true
        };
        
        await pb.collection(ADMIN_COLLECTION).create(userData);
        
        successDiv.textContent = 'Account created successfully! Redirecting to login...';
        successDiv.classList.add('show');
        
        document.getElementById('admin-signup-form').reset();
        
        setTimeout(() => {
            document.getElementById('signup-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
            successDiv.classList.remove('show');
        }, 2000);
        
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Signup failed. ';
        if (error.message && error.message.includes('unique')) {
            errorMessage = 'Email already exists. Please use a different email.';
        } else {
            errorMessage += error.message;
        }
        showError(errorDiv, errorMessage);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
    }, 3000);
}

window.adminLogout = () => {
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminEmail');
    sessionStorage.removeItem('adminName');
    sessionStorage.removeItem('adminId');
    if (pb && pb.authStore) pb.authStore.clear();
    window.location.href = 'index.html';
};

console.log("Admin auth script loaded");