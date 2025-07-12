
// Global variables
let currentUser = null;
let allOffers = [];
let conversations = {};
let currentChatId = null;
let selectedExchangeOption = null;
let currentOfferForMessage = null;
let allowMessages = true;
let blockedUsers = [];
let offerMessages = [];

// API Base URL
const API_BASE = window.location.origin;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('تم تحميل التطبيق');
    initializeApp();
});

// Initialize application
async function initializeApp() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('تم العثور على بيانات مستخدم محفوظة:', currentUser.name);
            
            // Check if user is banned
            if (await checkBanStatus()) {
                return;
            }
            
            showMainPage();
            await loadOffers();
            loadUserSettings();
        } catch (error) {
            console.error('خطأ في تحميل بيانات المستخدم:', error);
            localStorage.removeItem('currentUser');
            showLoginPage();
        }
    } else {
        showLoginPage();
    }
    
    // Initialize event listeners
    setupEventListeners();
    
    // Show security warning on first visit
    if (!localStorage.getItem('securityWarningShown')) {
        setTimeout(() => {
            showModal('securityWarningModal');
        }, 1000);
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Login form events
    const showSignupBtn = document.getElementById('showSignupBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const signupSubmitBtn = document.getElementById('signupSubmitBtn');
    
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showSignupForm();
        });
    }
    
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginForm();
        });
    }
    
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', handleLogin);
    }
    
    if (signupSubmitBtn) {
        signupSubmitBtn.addEventListener('click', handleSignup);
    }
    
    // Main page events
    const menuBtn = document.getElementById('menuBtn');
    const closeMenu = document.getElementById('closeMenu');
    const addOfferBtn = document.getElementById('addOfferBtn');
    const closeAddOffer = document.getElementById('closeAddOffer');
    
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            document.getElementById('sideMenu').classList.add('active');
        });
    }
    
    if (closeMenu) {
        closeMenu.addEventListener('click', () => {
            document.getElementById('sideMenu').classList.remove('active');
        });
    }
    
    if (addOfferBtn) {
        addOfferBtn.addEventListener('click', () => {
            showModal('addOfferModal');
        });
    }
    
    if (closeAddOffer) {
        closeAddOffer.addEventListener('click', () => {
            closeModal('addOfferModal');
        });
    }
    
    // Menu items events
    setupMenuEvents();
    
    // Offer form events
    setupOfferFormEvents();
    
    // Security warning events
    const agreeWarning = document.getElementById('agreeWarning');
    if (agreeWarning) {
        agreeWarning.addEventListener('click', () => {
            localStorage.setItem('securityWarningShown', 'true');
            closeModal('securityWarningModal');
        });
    }
    
    // Chat events
    setupChatEvents();
    
    // Profile events
    setupProfileEvents();
    
    // Admin events
    setupAdminEvents();
    
    // Updates button
    const updatesBtn = document.getElementById('updatesBtn');
    if (updatesBtn) {
        updatesBtn.addEventListener('click', () => {
            showModal('updatesModal');
        });
    }
}

// Setup menu events
function setupMenuEvents() {
    const menuItems = {
        'homeBtn': () => closeModal('sideMenu'),
        'messagesBtn': loadMessages,
        'mediatorsBtn': () => showModal('mediatorsModal'),
        'gameOffersBtn': () => showModal('gameSearchModal'),
        'editProfileBtn': () => showModal('editProfileModal'),
        'settingsBtn': () => showModal('settingsModal'),
        'supportBtn': () => showModal('supportModal'),
        'websiteIdeaBtn': () => showModal('websiteIdeaModal'),
        'discordBtn': () => window.open('https://discord.gg/your-discord-link', '_blank'),
        'marketBtn': () => showModal('marketModal')
    };
    
    Object.keys(menuItems).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', () => {
                document.getElementById('sideMenu').classList.remove('active');
                menuItems[id]();
            });
        }
    });
}

// Setup offer form events
function setupOfferFormEvents() {
    const currencyBtn = document.getElementById('currencyBtn');
    const otherBtn = document.getElementById('otherBtn');
    const submitOffer = document.getElementById('submitOffer');
    const offerImage = document.getElementById('offerImage');
    
    if (currencyBtn) {
        currencyBtn.addEventListener('click', () => {
            document.getElementById('currencyOptions').classList.remove('hidden');
            document.getElementById('accountInput').classList.add('hidden');
            currencyBtn.classList.add('active');
            otherBtn.classList.remove('active');
        });
    }
    
    if (otherBtn) {
        otherBtn.addEventListener('click', () => {
            document.getElementById('currencyOptions').classList.add('hidden');
            document.getElementById('priceInput').classList.add('hidden');
            document.getElementById('accountInput').classList.remove('hidden');
            otherBtn.classList.add('active');
            currencyBtn.classList.remove('active');
        });
    }
    
    if (submitOffer) {
        submitOffer.addEventListener('click', handleSubmitOffer);
    }
    
    if (offerImage) {
        offerImage.addEventListener('change', previewOfferImage);
    }
    
    // Currency selection
    const currencyBtns = document.querySelectorAll('.currency-btn');
    currencyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currencyBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            const currency = btn.dataset.currency;
            document.getElementById('selectedCurrency').textContent = currency;
            document.getElementById('priceInput').classList.remove('hidden');
        });
    });
}

// Setup chat events
function setupChatEvents() {
    const sendMessage = document.getElementById('sendMessage');
    const chatInput = document.getElementById('chatInput');
    const sendImageBtn = document.getElementById('sendImageBtn');
    const chatImage = document.getElementById('chatImage');
    
    if (sendMessage) {
        sendMessage.addEventListener('click', handleSendMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSendMessage();
            }
        });
    }
    
    if (sendImageBtn) {
        sendImageBtn.addEventListener('click', () => {
            chatImage.click();
        });
    }
    
    if (chatImage) {
        chatImage.addEventListener('change', handleSendImage);
    }
}

// Setup profile events
function setupProfileEvents() {
    const saveProfile = document.getElementById('saveProfile');
    const defaultAvatarsTab = document.getElementById('defaultAvatarsTab');
    const customAvatarTab = document.getElementById('customAvatarTab');
    const customAvatarInput = document.getElementById('customAvatarInput');
    
    if (saveProfile) {
        saveProfile.addEventListener('click', handleSaveProfile);
    }
    
    if (defaultAvatarsTab) {
        defaultAvatarsTab.addEventListener('click', () => {
            defaultAvatarsTab.classList.add('active');
            customAvatarTab.classList.remove('active');
            document.getElementById('defaultAvatarsContainer').classList.remove('hidden');
            document.getElementById('customAvatarContainer').classList.add('hidden');
        });
    }
    
    if (customAvatarTab) {
        customAvatarTab.addEventListener('click', () => {
            customAvatarTab.classList.add('active');
            defaultAvatarsTab.classList.remove('active');
            document.getElementById('customAvatarContainer').classList.remove('hidden');
            document.getElementById('defaultAvatarsContainer').classList.add('hidden');
        });
    }
    
    if (customAvatarInput) {
        customAvatarInput.addEventListener('change', previewCustomAvatar);
    }
    
    // Avatar selection
    const avatarOptions = document.querySelectorAll('.avatar-option');
    avatarOptions.forEach(avatar => {
        avatar.addEventListener('click', () => {
            avatarOptions.forEach(a => a.classList.remove('selected'));
            avatar.classList.add('selected');
        });
    });
}

// Setup admin events
function setupAdminEvents() {
    const adminVexBtn = document.getElementById('adminVexBtn');
    const adminBanBtn = document.getElementById('adminBanBtn');
    const giveVexBtn = document.getElementById('giveVexBtn');
    const banUserBtn = document.getElementById('banUserBtn');
    
    if (adminVexBtn) {
        adminVexBtn.addEventListener('click', () => {
            showModal('adminVexModal');
        });
    }
    
    if (adminBanBtn) {
        adminBanBtn.addEventListener('click', () => {
            showModal('adminBanModal');
        });
    }
    
    if (giveVexBtn) {
        giveVexBtn.addEventListener('click', handleGiveVex);
    }
    
    if (banUserBtn) {
        banUserBtn.addEventListener('click', handleBanUser);
    }
}

// Show login page
function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('mainPage').classList.remove('active');
}

// Show main page
function showMainPage() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('mainPage').classList.add('active');
    
    if (currentUser) {
        updateUserDisplay();
        checkAdminStatus();
    }
}

// Show login form
function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('signupForm').classList.add('hidden');
}

// Show signup form
function showSignupForm() {
    document.getElementById('signupForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
}

// Handle login
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!email || !password) {
        alert('من فضلك املأ جميع الحقول');
        return;
    }
    
    showAuthLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                avatar: result.user.avatar || 1,
                vexBalance: 0,
                isVIP: false,
                isAdmin: email === 'seif@demon.com'
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Check ban status
            if (await checkBanStatus()) {
                return;
            }
            
            showMainPage();
            await loadOffers();
            loadUserSettings();
        } else {
            alert(result.error || 'خطأ في تسجيل الدخول');
        }
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        alert('خطأ في الاتصال بالخادم');
    } finally {
        showAuthLoading(false);
    }
}

// Handle signup
async function handleSignup() {
    const email = document.getElementById('signupEmail').value.trim();
    const name = document.getElementById('signupName').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const confirmPassword = document.getElementById('signupConfirmPassword').value.trim();
    
    if (!email || !name || !password || !confirmPassword) {
        alert('من فضلك املأ جميع الحقول');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('كلمات المرور غير متطابقة');
        return;
    }
    
    if (password.length < 6) {
        alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }
    
    if (name.length > 20) {
        alert('الاسم يجب أن يكون 20 حرف أو أقل');
        return;
    }
    
    showAuthLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, name, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول');
            showLoginForm();
            
            // Clear signup form
            document.getElementById('signupEmail').value = '';
            document.getElementById('signupName').value = '';
            document.getElementById('signupPassword').value = '';
            document.getElementById('signupConfirmPassword').value = '';
        } else {
            alert(result.error || 'خطأ في إنشاء الحساب');
        }
    } catch (error) {
        console.error('خطأ في إنشاء الحساب:', error);
        alert('خطأ في الاتصال بالخادم');
    } finally {
        showAuthLoading(false);
    }
}

// Show auth loading
function showAuthLoading(show) {
    const loading = document.getElementById('authLoading');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (show) {
        loading.classList.remove('hidden');
        loginForm.classList.add('hidden');
        signupForm.classList.add('hidden');
    } else {
        loading.classList.add('hidden');
        if (document.getElementById('loginForm').classList.contains('hidden')) {
            signupForm.classList.remove('hidden');
        } else {
            loginForm.classList.remove('hidden');
        }
    }
}

// Update user display
function updateUserDisplay() {
    if (!currentUser) return;
    
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userId = document.getElementById('userId');
    const userVexBalance = document.getElementById('userVexBalance');
    const userRank = document.getElementById('userRank');
    
    if (userAvatar) {
        if (currentUser.customAvatar) {
            userAvatar.src = currentUser.customAvatar;
        } else {
            userAvatar.src = `https://i.pravatar.cc/150?img=${currentUser.avatar || 1}`;
        }
    }
    
    if (userName) {
        userName.textContent = currentUser.name;
    }
    
    if (userId) {
        const paddedId = String(currentUser.id).padStart(10, '0');
        userId.textContent = `ID: ${paddedId}`;
    }
    
    if (userVexBalance) {
        userVexBalance.textContent = currentUser.vexBalance || 0;
    }
    
    if (userRank) {
        if (currentUser.isAdmin) {
            userRank.textContent = 'Admin';
            userRank.classList.add('admin');
        } else if (currentUser.isVIP) {
            userRank.textContent = 'VIP';
            userRank.classList.remove('admin');
        } else {
            userRank.textContent = 'Member';
            userRank.classList.remove('admin');
        }
    }
}

// Check admin status
function checkAdminStatus() {
    if (!currentUser) return;
    
    const adminControls = document.getElementById('adminControls');
    if (currentUser.isAdmin && adminControls) {
        adminControls.classList.remove('hidden');
    }
}

// Check ban status
async function checkBanStatus() {
    if (!currentUser) return false;
    
    const banData = localStorage.getItem(`ban_${currentUser.id}`);
    if (banData) {
        const ban = JSON.parse(banData);
        const now = new Date().getTime();
        
        if (now < ban.endTime) {
            showBanWarning(ban.endTime);
            return true;
        } else {
            localStorage.removeItem(`ban_${currentUser.id}`);
        }
    }
    
    return false;
}

// Show ban warning
function showBanWarning(endTime) {
    const banEndTime = document.getElementById('banEndTime');
    const banTimeRemaining = document.getElementById('banTimeRemaining');
    const closeBanWarning = document.getElementById('closeBanWarning');
    
    if (banEndTime) {
        banEndTime.textContent = new Date(endTime).toLocaleString('ar-EG');
    }
    
    const updateTimer = () => {
        const now = new Date().getTime();
        const remaining = endTime - now;
        
        if (remaining <= 0) {
            localStorage.removeItem(`ban_${currentUser.id}`);
            closeModal('banWarningModal');
            location.reload();
            return;
        }
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        if (banTimeRemaining) {
            banTimeRemaining.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    };
    
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    
    if (closeBanWarning) {
        closeBanWarning.addEventListener('click', () => {
            clearInterval(timer);
            logout();
        });
    }
    
    showModal('banWarningModal');
}

// Load offers
async function loadOffers() {
    try {
        const response = await fetch(`${API_BASE}/api/offers`);
        const offers = await response.json();
        
        allOffers = offers;
        displayOffers(offers);
    } catch (error) {
        console.error('خطأ في تحميل العروض:', error);
    }
}

// Display offers
function displayOffers(offers) {
    const container = document.getElementById('offersContainer');
    if (!container) return;
    
    if (!offers || offers.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #00bfff; padding: 2rem;">لا توجد عروض متاحة حالياً</p>';
        return;
    }
    
    container.innerHTML = offers.map(offer => createOfferHTML(offer)).join('');
    
    // Add event listeners to offer buttons
    addOfferEventListeners();
}

// Create offer HTML
function createOfferHTML(offer) {
    const isLiked = offer.likedBy && offer.likedBy.includes(currentUser.id);
    const isOwner = offer.userId === currentUser.id;
    const vipClass = offer.isVIP ? 'vip-offer' : '';
    
    return `
        <div class="offer-card ${vipClass}" data-offer-id="${offer.id}">
            <div class="offer-header">
                <img src="${offer.customAvatar || `https://i.pravatar.cc/150?img=${offer.userAvatar || 1}`}" 
                     alt="avatar" class="offer-avatar">
                <div class="offer-user-info">
                    <span class="offer-username">${offer.userName}</span>
                    ${offer.isVIP ? '<span class="vip-badge-small">VIP👑</span>' : ''}
                </div>
            </div>
            <div class="offer-content">
                <h3>${offer.game}</h3>
                ${offer.image ? `<img src="${offer.image}" alt="صورة العرض" class="offer-image" onclick="showImageModal('${offer.image}')">` : ''}
                <div class="offer-details">
                    <div class="offer-detail">
                        <strong>العرض:</strong> ${offer.offer}
                    </div>
                    <div class="offer-detail">
                        <strong>المطلوب:</strong> ${offer.requirement}
                    </div>
                </div>
                <div class="offer-actions">
                    ${!isOwner ? `<button class="action-btn message-btn" onclick="showSendOfferMessage(${offer.id})">ارسال رساله📩</button>` : ''}
                    <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${offer.id})">
                        ❤️ <span class="like-count">${offer.likes || 0}</span>
                    </button>
                    ${isOwner || currentUser.isAdmin ? `<button class="action-btn delete-btn ${currentUser.isAdmin ? 'admin-delete-btn' : ''}" onclick="deleteOffer(${offer.id})">حذف🗑️</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Add offer event listeners
function addOfferEventListeners() {
    // This function can be used to add additional event listeners to offers if needed
}

// Handle submit offer
async function handleSubmitOffer() {
    const game = document.getElementById('gameSelect').value;
    const offerText = document.getElementById('offerText').value.trim();
    const priceAmount = document.getElementById('priceAmount').value;
    const selectedCurrency = document.getElementById('selectedCurrency').textContent;
    const accountDetails = document.getElementById('accountDetails').value.trim();
    const offerImageFile = document.getElementById('offerImage').files[0];
    
    if (!game) {
        alert('يرجى اختيار لعبة');
        return;
    }
    
    if (!offerText) {
        alert('يرجى كتابة العرض');
        return;
    }
    
    const currencyBtn = document.getElementById('currencyBtn');
    const otherBtn = document.getElementById('otherBtn');
    
    let requirement = '';
    
    if (currencyBtn.classList.contains('active')) {
        if (!priceAmount || !selectedCurrency) {
            alert('يرجى تحديد السعر والعملة');
            return;
        }
        requirement = `${priceAmount} ${selectedCurrency}`;
    } else if (otherBtn.classList.contains('active')) {
        if (!accountDetails) {
            alert('يرجى كتابة بيانات الحساب المطلوب');
            return;
        }
        requirement = accountDetails;
    } else {
        alert('يرجى اختيار طريقة الدفع');
        return;
    }
    
    let imageData = null;
    if (offerImageFile) {
        imageData = await convertFileToBase64(offerImageFile);
    }
    
    const offerData = {
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        customAvatar: currentUser.customAvatar,
        game: game,
        offer: offerText,
        requirement: requirement,
        isVIP: currentUser.isVIP || false,
        image: imageData
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/offers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(offerData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('تم إضافة العرض بنجاح!');
            closeModal('addOfferModal');
            clearOfferForm();
            await loadOffers();
        } else {
            alert('خطأ في إضافة العرض');
        }
    } catch (error) {
        console.error('خطأ في إضافة العرض:', error);
        alert('خطأ في الاتصال بالخادم');
    }
}

// Clear offer form
function clearOfferForm() {
    document.getElementById('gameSelect').value = '';
    document.getElementById('offerText').value = '';
    document.getElementById('priceAmount').value = '';
    document.getElementById('accountDetails').value = '';
    document.getElementById('offerImage').value = '';
    document.getElementById('selectedCurrency').textContent = '';
    document.getElementById('currencyOptions').classList.add('hidden');
    document.getElementById('priceInput').classList.add('hidden');
    document.getElementById('accountInput').classList.add('hidden');
    document.getElementById('imagePreview').classList.add('hidden');
    
    // Reset buttons
    document.getElementById('currencyBtn').classList.remove('active');
    document.getElementById('otherBtn').classList.remove('active');
    document.querySelectorAll('.currency-btn').forEach(btn => btn.classList.remove('selected'));
}

// Preview offer image
async function previewOfferImage() {
    const fileInput = document.getElementById('offerImage');
    const preview = document.getElementById('imagePreview');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)');
            fileInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة">`;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Convert file to base64
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Toggle like
async function toggleLike(offerId) {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/offers/${offerId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update the offer in local array
            const offerIndex = allOffers.findIndex(o => o.id === offerId);
            if (offerIndex !== -1) {
                allOffers[offerIndex] = result.offer;
                displayOffers(allOffers);
            }
        }
    } catch (error) {
        console.error('خطأ في تبديل الإعجاب:', error);
    }
}

// Delete offer
async function deleteOffer(offerId) {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/offers/${offerId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('تم حذف العرض بنجاح');
            await loadOffers();
        } else {
            alert('خطأ في حذف العرض');
        }
    } catch (error) {
        console.error('خطأ في حذف العرض:', error);
        alert('خطأ في الاتصال بالخادم');
    }
}

// Show send offer message modal
function showSendOfferMessage(offerId) {
    const offer = allOffers.find(o => o.id === offerId);
    if (!offer) return;
    
    currentOfferForMessage = offer;
    showModal('sendOfferMessageModal');
}

// Select exchange option
function selectExchangeOption(option) {
    selectedExchangeOption = option;
    
    // Update button states
    document.querySelectorAll('.exchange-option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.querySelector(`[data-option="${option}"]`).classList.add('selected');
    
    // Show/hide additional inputs
    const additionalThingsInput = document.getElementById('additionalThingsInput');
    const contactDetailsInput = document.getElementById('contactDetailsInput');
    
    additionalThingsInput.classList.add('hidden');
    contactDetailsInput.classList.add('hidden');
    
    if (option === 'offer_plus') {
        additionalThingsInput.classList.remove('hidden');
    } else if (option === 'negotiate') {
        contactDetailsInput.classList.remove('hidden');
    }
}

// Preview send offer image
function previewSendOfferImage() {
    const fileInput = document.getElementById('sendOfferImage');
    const preview = document.getElementById('sendOfferImagePreview');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        if (file.size > 5 * 1024 * 1024) {
            alert('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)');
            fileInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة">`;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Send offer message
async function sendOfferMessage() {
    if (!currentUser || !currentOfferForMessage) return;
    
    const offerDescription = document.getElementById('offerDescription').value.trim();
    
    if (!offerDescription) {
        alert('يرجى كتابة عرضك');
        return;
    }
    
    if (!selectedExchangeOption) {
        alert('يرجى اختيار المقابل');
        return;
    }
    
    let exchangeDetails = '';
    let contactInfo = '';
    
    if (selectedExchangeOption === 'offer_plus') {
        const additionalThings = document.getElementById('additionalThings').value.trim();
        if (!additionalThings) {
            alert('يرجى كتابة الأشياء الإضافية');
            return;
        }
        exchangeDetails = additionalThings;
    } else if (selectedExchangeOption === 'negotiate') {
        const contactDetails = document.getElementById('contactDetails').value.trim();
        if (!contactDetails) {
            alert('يرجى كتابة بيانات التواصل');
            return;
        }
        contactInfo = contactDetails;
    }
    
    let imageData = null;
    const sendOfferImageFile = document.getElementById('sendOfferImage').files[0];
    if (sendOfferImageFile) {
        imageData = await convertFileToBase64(sendOfferImageFile);
    }
    
    const messageData = {
        id: Date.now(),
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.customAvatar || `https://i.pravatar.cc/150?img=${currentUser.avatar}`,
        recipientId: currentOfferForMessage.userId,
        recipientName: currentOfferForMessage.userName,
        originalOffer: {
            game: currentOfferForMessage.game,
            offer: currentOfferForMessage.offer,
            requirement: currentOfferForMessage.requirement,
            image: currentOfferForMessage.image
        },
        offerDescription: offerDescription,
        exchangeOption: selectedExchangeOption,
        exchangeDetails: exchangeDetails,
        contactInfo: contactInfo,
        image: imageData,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/offer-messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('تم إرسال الرسالة بنجاح!');
            closeModal('sendOfferMessageModal');
            clearSendOfferForm();
        } else {
            alert('خطأ في إرسال الرسالة');
        }
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        alert('خطأ في الاتصال بالخادم');
    }
}

// Clear send offer form
function clearSendOfferForm() {
    document.getElementById('offerDescription').value = '';
    document.getElementById('additionalThings').value = '';
    document.getElementById('contactDetails').value = '';
    document.getElementById('sendOfferImage').value = '';
    document.getElementById('sendOfferImagePreview').classList.add('hidden');
    
    // Reset exchange options
    document.querySelectorAll('.exchange-option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.getElementById('additionalThingsInput').classList.add('hidden');
    document.getElementById('contactDetailsInput').classList.add('hidden');
    
    selectedExchangeOption = null;
    currentOfferForMessage = null;
}

// Load messages
async function loadMessages() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/offer-messages/${currentUser.id}`);
        const messages = await response.json();
        
        offerMessages = messages;
        displayOfferMessages(messages);
        showModal('messagesModal');
        
        // Update notification badge
        updateMessageNotification();
    } catch (error) {
        console.error('خطأ في تحميل الرسائل:', error);
    }
}

// Display offer messages
function displayOfferMessages(messages) {
    const container = document.getElementById('offerMessagesList');
    if (!container) return;
    
    if (!messages || messages.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #00bfff; padding: 2rem;">لا توجد رسائل عروض حالياً</p>';
        return;
    }
    
    container.innerHTML = messages.map(message => createOfferMessageHTML(message)).join('');
}

// Create offer message HTML
function createOfferMessageHTML(message) {
    return `
        <div class="offer-message-item">
            <div class="offer-message-header">
                <img src="${message.senderAvatar}" alt="avatar" class="offer-message-avatar">
                <div class="offer-message-info">
                    <div class="offer-message-sender">${message.senderName}</div>
                    <div class="offer-message-time">${new Date(message.timestamp).toLocaleString('ar-EG')}</div>
                </div>
            </div>
            <div class="offer-message-content">
                <div class="offer-message-description">
                    <strong>العرض الأصلي:</strong> ${message.originalOffer.game} - ${message.originalOffer.offer}<br>
                    <strong>المطلوب:</strong> ${message.originalOffer.requirement}
                </div>
                ${message.originalOffer.image ? `<img src="${message.originalOffer.image}" alt="صورة العرض" class="offer-message-image" onclick="showImageModal('${message.originalOffer.image}')">` : ''}
                <div class="offer-message-exchange">
                    <strong>عرض المرسل:</strong> ${message.offerDescription}
                </div>
                ${message.exchangeDetails ? `<div class="offer-message-details"><strong>تفاصيل إضافية:</strong> ${message.exchangeDetails}</div>` : ''}
                ${message.contactInfo ? `<div class="offer-message-contact"><strong>بيانات التواصل:</strong> ${message.contactInfo}</div>` : ''}
                ${message.image ? `<img src="${message.image}" alt="صورة الرسالة" class="offer-message-image" onclick="showImageModal('${message.image}')">` : ''}
            </div>
            <div class="offer-message-actions">
                <button class="offer-message-btn reject-btn" onclick="rejectOfferMessage('${message.id}')">رفض❌</button>
                <button class="offer-message-btn accept-btn" onclick="showAcceptOfferModal('${message.id}')">قبول✅</button>
            </div>
        </div>
    `;
}

// Show accept offer modal
function showAcceptOfferModal(messageId) {
    currentOfferMessageId = messageId;
    showModal('acceptOfferModal');
}

// Accept offer message
async function acceptOfferMessage() {
    const contactInfo = document.getElementById('acceptContactInfo').value.trim();
    
    if (!contactInfo) {
        alert('يرجى إدخال بيانات التواصل');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/offer-messages/${currentOfferMessageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'accepted',
                response: contactInfo
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('تم قبول العرض بنجاح!');
            closeModal('acceptOfferModal');
            document.getElementById('acceptContactInfo').value = '';
            await loadMessages();
        } else {
            alert('خطأ في قبول العرض');
        }
    } catch (error) {
        console.error('خطأ في قبول العرض:', error);
        alert('خطأ في الاتصال بالخادم');
    }
}

// Reject offer message
async function rejectOfferMessage(messageId) {
    if (!confirm('هل أنت متأكد من رفض هذا العرض؟')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/offer-messages/${messageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'rejected'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('تم رفض العرض');
            await loadMessages();
        } else {
            alert('خطأ في رفض العرض');
        }
    } catch (error) {
        console.error('خطأ في رفض العرض:', error);
        alert('خطأ في الاتصال بالخادم');
    }
}

// Update message notification
function updateMessageNotification() {
    const notification = document.getElementById('messageNotification');
    if (!notification) return;
    
    if (offerMessages && offerMessages.length > 0) {
        notification.classList.remove('hidden');
    } else {
        notification.classList.add('hidden');
    }
}

// Handle send message
async function handleSendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || !currentChatId || !currentUser) return;
    
    const messageData = {
        id: Date.now(),
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.customAvatar || `https://i.pravatar.cc/150?img=${currentUser.avatar}`,
        text: message,
        timestamp: new Date().toISOString(),
        type: 'text'
    };
    
    try {
        await saveMessage(messageData);
        input.value = '';
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
    }
}

// Handle send image
async function handleSendImage() {
    const fileInput = document.getElementById('chatImage');
    const file = fileInput.files[0];
    
    if (!file || !currentChatId || !currentUser) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)');
        return;
    }
    
    const imageData = await convertFileToBase64(file);
    
    const messageData = {
        id: Date.now(),
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.customAvatar || `https://i.pravatar.cc/150?img=${currentUser.avatar}`,
        image: imageData,
        timestamp: new Date().toISOString(),
        type: 'image'
    };
    
    try {
        await saveMessage(messageData);
        fileInput.value = '';
    } catch (error) {
        console.error('خطأ في إرسال الصورة:', error);
    }
}

// Save message
async function saveMessage(messageData) {
    if (!conversations[currentChatId]) {
        conversations[currentChatId] = [];
    }
    
    conversations[currentChatId].push(messageData);
    
    try {
        const response = await fetch(`${API_BASE}/api/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chatId: currentChatId,
                message: messageData,
                senderId: currentUser.id,
                recipientId: getRecipientIdFromChatId(currentChatId)
            })
        });
        
        displayChatMessages();
        
        // Send notification
        await fetch(`${API_BASE}/api/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipientId: getRecipientIdFromChatId(currentChatId),
                senderName: currentUser.name,
                message: messageData.text || 'صورة'
            })
        });
    } catch (error) {
        console.error('خطأ في حفظ الرسالة:', error);
    }
}

// Display chat messages
function displayChatMessages() {
    const container = document.getElementById('chatMessages');
    if (!container || !currentChatId) return;
    
    const messages = conversations[currentChatId] || [];
    
    if (messages.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #00bfff; padding: 2rem;">ابدأ المحادثة</p>';
        return;
    }
    
    container.innerHTML = messages.map(message => createChatMessageHTML(message)).join('');
    container.scrollTop = container.scrollHeight;
}

// Create chat message HTML
function createChatMessageHTML(message) {
    const isOwn = message.senderId === currentUser.id;
    const messageClass = isOwn ? 'sent' : 'received';
    const wrapperClass = isOwn ? 'sent-wrapper' : 'received-wrapper';
    
    let content = '';
    if (message.type === 'image') {
        content = `<img src="${message.image}" alt="صورة" class="chat-message-image" onclick="showImageModal('${message.image}')">`;
    } else {
        content = `<div class="message-text">${message.text}</div>`;
    }
    
    return `
        <div class="message-wrapper ${wrapperClass}">
            <div class="chat-message ${messageClass}">
                ${!isOwn ? `<div class="sender-name">${message.senderName}</div>` : ''}
                ${content}
                <div class="message-time">${new Date(message.timestamp).toLocaleString('ar-EG')}</div>
            </div>
        </div>
    `;
}

// Get recipient ID from chat ID
function getRecipientIdFromChatId(chatId) {
    const parts = chatId.split('_');
    const userId1 = parseInt(parts[1]);
    const userId2 = parseInt(parts[2]);
    
    return userId1 === currentUser.id ? userId2 : userId1;
}

// Start chat with user
function startChatWithUser(userId, userName) {
    if (!currentUser || userId === currentUser.id) return;
    
    currentChatId = `chat_${Math.min(currentUser.id, userId)}_${Math.max(currentUser.id, userId)}`;
    
    document.getElementById('chatTitle').textContent = `مراسلة ${userName}`;
    displayChatMessages();
    showModal('chatModal');
}

// Show image modal
function showImageModal(imageSrc) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <img src="${imageSrc}" alt="صورة مكبرة">
        <span class="image-modal-close" onclick="this.parentElement.remove()">×</span>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Handle save profile
async function handleSaveProfile() {
    const newName = document.getElementById('editNameInput').value.trim();
    
    if (!newName) {
        alert('يرجى إدخال الاسم');
        return;
    }
    
    if (newName.length > 20) {
        alert('الاسم يجب أن يكون 20 حرف أو أقل');
        return;
    }
    
    let newAvatar = currentUser.avatar;
    let customAvatar = null;
    
    // Check if custom avatar is selected
    const customAvatarInput = document.getElementById('customAvatarInput');
    if (customAvatarInput.files && customAvatarInput.files[0]) {
        customAvatar = await convertFileToBase64(customAvatarInput.files[0]);
    } else {
        // Check selected default avatar
        const selectedAvatar = document.querySelector('.avatar-option.selected');
        if (selectedAvatar) {
            newAvatar = selectedAvatar.dataset.avatar;
        }
    }
    
    // Update current user
    currentUser.name = newName;
    currentUser.avatar = newAvatar;
    if (customAvatar) {
        currentUser.customAvatar = customAvatar;
    }
    
    // Save to localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Update display
    updateUserDisplay();
    
    alert('تم تحديث الحساب بنجاح');
    closeModal('editProfileModal');
}

// Preview custom avatar
function previewCustomAvatar() {
    const fileInput = document.getElementById('customAvatarInput');
    const preview = document.getElementById('customAvatarPreview');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        if (file.size > 2 * 1024 * 1024) {
            alert('حجم الصورة كبير جداً (الحد الأقصى 2 ميجابايت)');
            fileInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة">`;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Load user settings
function loadUserSettings() {
    const settings = localStorage.getItem(`settings_${currentUser.id}`);
    if (settings) {
        const userSettings = JSON.parse(settings);
        allowMessages = userSettings.allowMessages !== false;
        blockedUsers = userSettings.blockedUsers || [];
        
        updateSettingsDisplay();
    }
}

// Update settings display
function updateSettingsDisplay() {
    const toggle = document.getElementById('allowMessagesToggle');
    if (toggle) {
        toggle.textContent = allowMessages ? 'ON' : 'OFF';
        toggle.className = `toggle-btn ${allowMessages ? 'on' : 'off'}`;
    }
}

// Toggle message settings
function toggleMessageSettings() {
    allowMessages = !allowMessages;
    saveUserSettings();
    updateSettingsDisplay();
}

// Save user settings
function saveUserSettings() {
    const settings = {
        allowMessages: allowMessages,
        blockedUsers: blockedUsers
    };
    
    localStorage.setItem(`settings_${currentUser.id}`, JSON.stringify(settings));
}

// Show block list modal
function showBlockListModal() {
    displayBlockList();
    showModal('blockListModal');
}

// Display block list
function displayBlockList() {
    const container = document.getElementById('blockList');
    if (!container) return;
    
    if (blockedUsers.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #00bfff; padding: 2rem;">لا توجد مستخدمين محظورين</p>';
        return;
    }
    
    container.innerHTML = blockedUsers.map(user => `
        <div class="block-user-item">
            <div class="block-user-info">
                <img src="${user.avatar}" alt="avatar" class="block-user-avatar">
                <span class="block-user-name">${user.name}</span>
            </div>
            <button class="block-btn unblock" onclick="unblockUser(${user.id})">إلغاء الحظر</button>
        </div>
    `).join('');
}

// Block user
function blockUser(userId, userName, userAvatar) {
    if (blockedUsers.find(u => u.id === userId)) return;
    
    blockedUsers.push({
        id: userId,
        name: userName,
        avatar: userAvatar
    });
    
    saveUserSettings();
    alert(`تم حظر ${userName}`);
}

// Unblock user
function unblockUser(userId) {
    blockedUsers = blockedUsers.filter(u => u.id !== userId);
    saveUserSettings();
    displayBlockList();
    alert('تم إلغاء الحظر');
}

// Handle give VEX (admin only)
async function handleGiveVex() {
    if (!currentUser.isAdmin) return;
    
    const userId = document.getElementById('vexUserId').value.trim();
    const amount = parseInt(document.getElementById('vexAmount').value);
    
    if (!userId || !amount || amount <= 0) {
        alert('يرجى إدخال البيانات الصحيحة');
        return;
    }
    
    if (userId.length !== 10) {
        alert('الآيدي يجب أن يكون 10 أرقام');
        return;
    }
    
    // Simulate giving VEX (in real app, this would update server)
    alert(`تم إضافة ${amount} VEX للمستخدم ${userId}`);
    
    document.getElementById('vexUserId').value = '';
    document.getElementById('vexAmount').value = '';
    closeModal('adminVexModal');
}

// Handle ban user (admin only)
async function handleBanUser() {
    if (!currentUser.isAdmin) return;
    
    const userId = document.getElementById('banUserId').value.trim();
    const duration = parseInt(document.getElementById('banDuration').value);
    
    if (!userId || !duration || duration <= 0) {
        alert('يرجى إدخال البيانات الصحيحة');
        return;
    }
    
    if (userId.length !== 10) {
        alert('الآيدي يجب أن يكون 10 أرقام');
        return;
    }
    
    const banEndTime = new Date().getTime() + (duration * 60 * 60 * 1000);
    localStorage.setItem(`ban_${userId}`, JSON.stringify({
        endTime: banEndTime,
        duration: duration
    }));
    
    alert(`تم طرد المستخدم ${userId} لمدة ${duration} ساعة`);
    
    document.getElementById('banUserId').value = '';
    document.getElementById('banDuration').value = '';
    closeModal('adminBanModal');
}

// Buy VIP
async function buyVIP() {
    if (!currentUser) return;
    
    if (currentUser.vexBalance < 10000) {
        alert('رصيد VEX غير كافي. تحتاج إلى 10,000 VEX');
        return;
    }
    
    if (confirm('هل تريد شراء VIP مقابل 10,000 VEX؟')) {
        currentUser.vexBalance -= 10000;
        currentUser.isVIP = true;
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserDisplay();
        
        alert('تم شراء VIP بنجاح!');
        closeModal('marketModal');
    }
}

// Show modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    
    // Clear forms when closing modals
    if (modalId === 'sendOfferMessageModal') {
        clearSendOfferForm();
    }
}

// Logout
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    allOffers = [];
    conversations = {};
    offerMessages = [];
    showLoginPage();
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        e.target.style.display = 'none';
    }
});

// Close side menu when clicking outside
document.addEventListener('click', (e) => {
    const sideMenu = document.getElementById('sideMenu');
    const menuBtn = document.getElementById('menuBtn');
    
    if (sideMenu && !sideMenu.contains(e.target) && !menuBtn.contains(e.target)) {
        sideMenu.classList.remove('active');
    }
});

// Auto-update offers every 30 seconds
setInterval(async () => {
    if (currentUser && document.getElementById('mainPage').classList.contains('active')) {
        await loadOffers();
    }
}, 30000);

// Auto-check for new messages every 10 seconds
setInterval(async () => {
    if (currentUser) {
        try {
            const response = await fetch(`${API_BASE}/api/offer-messages/${currentUser.id}`);
            const messages = await response.json();
            
            if (messages.length !== offerMessages.length) {
                offerMessages = messages;
                updateMessageNotification();
            }
        } catch (error) {
            // Silently handle error
        }
    }
}, 10000);

console.log('✅ تم تحميل جميع وظائف الموقع بنجاح');
