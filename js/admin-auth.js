// admin-auth.js - Admin Authentication

// ==================== CONFIGURATION ====================
const PB_URL = "https://itrain.services.hodessy.com";
const ADMIN_COLLECTION = "admin_users";
const ADMIN_SECRET_KEY = "ExclusiveAdmin2024!";

// Initialize PocketBase
const pb = new PocketBase(PB_URL);
window.pb = pb;

// Check if already logged in
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
    
    console.log("Form elements found:", {
        showSignup: !!showSignup,
        showLogin: !!showLogin,
        loginForm: !!loginForm,
        signupForm: !!signupForm
    });
    
    if (showSignup) {
        // Remove existing listeners to avoid duplicates
        const newShowSignup = showSignup.cloneNode(true);
        showSignup.parentNode.replaceChild(newShowSignup, showSignup);
        
        newShowSignup.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Show signup clicked");
            if (loginForm) loginForm.style.display = 'none';
            if (signupForm) signupForm.style.display = 'block';
        });
    } else {
        console.warn("Element with id 'show-signup' not found");
    }
    
    if (showLogin) {
        // Remove existing listeners to avoid duplicates
        const newShowLogin = showLogin.cloneNode(true);
        showLogin.parentNode.replaceChild(newShowLogin, showLogin);
        
        newShowLogin.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Show login clicked");
            if (signupForm) signupForm.style.display = 'none';
            if (loginForm) loginForm.style.display = 'block';
        });
    } else {
        console.warn("Element with id 'show-login' not found");
    }
}

function setupEventListeners() {
    // Login form submission
    const loginFormElement = document.getElementById('admin-login-form');
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin();
        });
    }
    
    // Signup form submission
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
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;
    errorDiv.classList.remove('show');
    
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
        showError(errorDiv, 'Invalid email or password');
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
    
    // Validate inputs
    if (!name || !email || !password || !confirmPassword || !secretKey) {
        showError(errorDiv, 'Please fill in all fields');
        return;
    }
    
    // Validate secret key
    if (secretKey !== ADMIN_SECRET_KEY) {
        showError(errorDiv, 'Invalid admin secret key');
        return;
    }
    
    // Validate password match
    if (password !== confirmPassword) {
        showError(errorDiv, 'Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showError(errorDiv, 'Password must be at least 6 characters');
        return;
    }
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;
    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');
    
    try {
        // Include all required fields including role and isAdmin
        const userData = {
            name: name,
            email: email,
            emailVisibility: true,
            password: password,
            passwordConfirm: confirmPassword,
            role: 'admin',
            isAdmin: true
        };
        
        console.log("Creating admin user:", { name, email });
        
        const user = await pb.collection(ADMIN_COLLECTION).create(userData);
        
        console.log("Admin user created:", user);
        
        successDiv.textContent = 'Account created successfully! Redirecting to login...';
        successDiv.classList.add('show');
        
        document.getElementById('admin-signup-form').reset();
        
        setTimeout(() => {
            document.getElementById('signup-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
            successDiv.classList.remove('show');
        }, 2000);
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Signup error:', error);
        
        let errorMessage = 'Signup failed. ';
        
        if (error.message && error.message.includes('unique')) {
            errorMessage = 'Email already exists. Please use a different email.';
        } else if (error.data && error.data.message) {
            errorMessage = error.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showError(errorDiv, errorMessage);
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
    }, 3000);
}

// Helper functions for dashboard
window.isAdminAuthenticated = () => {
    return sessionStorage.getItem('adminAuthenticated') === 'true';
};

window.getAdminInfo = () => {
    return {
        email: sessionStorage.getItem('adminEmail'),
        name: sessionStorage.getItem('adminName'),
        id: sessionStorage.getItem('adminId'),
        isAuthenticated: sessionStorage.getItem('adminAuthenticated') === 'true'
    };
};

window.adminLogout = () => {
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminEmail');
    sessionStorage.removeItem('adminName');
    sessionStorage.removeItem('adminId');
    window.location.href = 'index.html';
};

console.log("Admin auth script loaded");