
// Global variables
let currentUser = null;
let offers = [];
let conversations = {};
let currentChatPartner = null;
let selectedAvatar = 1;
let userVexBalance = 0;
let userSettings = {
    allowMessages: true,
    blockedUsers: []
};
let registeredMembers = [];
let hasNewMessages = false;

// API Base URL
const API_BASE_URL = window.location.origin;

// Check if server is running
async function checkServerConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            const data = await response.json();
            console.log('🟢 اتصال الخادم نشط:', data);
            return true;
        }
    } catch (error) {
        console.log('🔴 خطأ في الاتصال بالخادم:', error);
        return false;
    }
    return false;
}

// مفتاح التخزين العالمي للعروض
const GLOBAL_OFFERS_KEY = 'globalGameShopOffers';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeAds();
    initializeMobileOptimizations();
});

// تحسينات للأجهزة المحمولة
function initializeMobileOptimizations() {
    // منع التكبير المزدوج على iOS
    document.addEventListener('touchstart', function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.classList.contains('action-btn') || 
            e.target.classList.contains('menu-btn') || e.target.classList.contains('submit-btn')) {
            e.target.style.transform = 'scale(0.95)';
        }
    });
    
    document.addEventListener('touchend', function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.classList.contains('action-btn') || 
            e.target.classList.contains('menu-btn') || e.target.classList.contains('submit-btn')) {
            setTimeout(() => {
                e.target.style.transform = 'scale(1)';
            }, 100);
        }
    });
    
    // تحسين النقر للأجهزة المحمولة
    const clickableElements = document.querySelectorAll('button, .action-btn, .menu-item, .auth-btn, .submit-btn');
    clickableElements.forEach(element => {
        element.style.cursor = 'pointer';
        element.style.touchAction = 'manipulation';
        
        // إضافة تأثير بصري عند اللمس
        element.addEventListener('touchstart', function() {
            this.style.opacity = '0.8';
        });
        
        element.addEventListener('touchend', function() {
            this.style.opacity = '1';
        });
    });
    
    // تحسين إدخال النصوص للأجهزة المحمولة
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            setTimeout(() => {
                this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });
    
    console.log('✅ تم تطبيق تحسينات الأجهزة المحمولة');
}

function initializeApp() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('gamesShopUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainPage();
    } else {
        showLoginPage();
    }

    // Load data from localStorage
    loadOffersFromGlobalStorage();
    loadConversationsFromStorage();
    loadUserSettingsFromStorage();
    loadMembersFromStorage();

    // Event listeners
    setupEventListeners();
}

// نظام العروض العالمي الجديد مع الخادم
async function loadOffersFromGlobalStorage() {
    try {
        // محاولة تحميل العروض من الخادم أولاً
        const response = await fetch(`${API_BASE_URL}/api/offers`);
        if (response.ok) {
            offers = await response.json();
            console.log('✅ تم تحميل العروض من الخادم:', offers.length);
        } else {
            throw new Error('Failed to fetch from server');
        }
    } catch (error) {
        console.log('⚠️ فشل تحميل من الخادم، محاولة تحميل من التخزين المحلي:', error);
        // في حالة فشل الخادم، استخدم التخزين المحلي
        const globalOffers = localStorage.getItem(GLOBAL_OFFERS_KEY);
        offers = globalOffers ? JSON.parse(globalOffers) : [];
    }

    // ترتيب العروض حسب التاريخ (الأحدث أولاً)
    offers.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
    });

    displayOffers();
    console.log('📋 إجمالي العروض المعروضة:', offers.length);
}

// تحميل المحادثات من الخادم
async function loadConversationsFromServer() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/conversations/${currentUser.id}`);
        if (response.ok) {
            const serverConversations = await response.json();
            // دمج المحادثات من الخادم مع المحادثات المحلية
            Object.keys(serverConversations).forEach(chatId => {
                if (!conversations[chatId]) {
                    conversations[chatId] = [];
                }
                // إضافة الرسائل الجديدة فقط
                serverConversations[chatId].forEach(serverMessage => {
                    const exists = conversations[chatId].some(localMessage => 
                        localMessage.timestamp === serverMessage.timestamp && 
                        localMessage.senderId === serverMessage.senderId
                    );
                    if (!exists) {
                        conversations[chatId].push(serverMessage);
                    }
                });
                // ترتيب الرسائل حسب الوقت
                conversations[chatId].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            });
            saveConversationsToStorage();
            console.log('✅ تم تحميل ودمج المحادثات من الخادم');
        }
    } catch (error) {
        console.log('⚠️ فشل تحميل المحادثات من الخادم:', error);
    }
}

// حفظ المحادثة في الخادم
async function saveConversationToServer(chatId, message) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatId: chatId,
                message: message,
                senderId: currentUser.id,
                recipientId: currentChatPartner.id
            })
        });

        if (response.ok) {
            console.log('✅ تم حفظ الرسالة في الخادم');
            return true;
        } else {
            throw new Error('Failed to save to server');
        }
    } catch (error) {
        console.log('⚠️ فشل حفظ الرسالة في الخادم:', error);
        return false;
    }
}

async function saveOfferToGlobalStorage(offer) {
    try {
        // إنشاء معرف فريد للعرض
        offer.id = Date.now() + Math.random();
        offer.likes = 0;
        offer.likedBy = [];
        offer.timestamp = new Date().toISOString();

        // محاولة حفظ في الخادم أولاً
        try {
            const response = await fetch(`${API_BASE_URL}/api/offers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(offer)
            });

            if (response.ok) {
                const result = await response.json();
                offers = result.offers || [offer];
                console.log('✅ تم حفظ العرض في الخادم:', offer);
            } else {
                throw new Error('Server save failed');
            }
        } catch (serverError) {
            console.log('⚠️ فشل حفظ في الخادم، حفظ محلي:', serverError);
            // في حالة فشل الخادم، احفظ محلياً
            const currentOffers = localStorage.getItem(GLOBAL_OFFERS_KEY);
            offers = currentOffers ? JSON.parse(currentOffers) : [];
            offers.unshift(offer);
            localStorage.setItem(GLOBAL_OFFERS_KEY, JSON.stringify(offers));
        }

        // عرض العروض المحدثة
        displayOffers();
        return offer;
    } catch (error) {
        console.error('خطأ في حفظ العرض:', error);
        return null;
    }
}

function loadConversationsFromStorage() {
    if (!currentUser) return;

    try {
        const savedConversations = localStorage.getItem('gamesShopConversations');
        if (savedConversations) {
            conversations = JSON.parse(savedConversations);
        }
    } catch (error) {
        console.error('Error loading conversations from storage:', error);
    }
}

function saveConversationsToStorage() {
    try {
        localStorage.setItem('gamesShopConversations', JSON.stringify(conversations));
    } catch (error) {
        console.error('Error saving conversations to storage:', error);
    }
}

function loadMembersFromStorage() {
    try {
        const savedMembers = localStorage.getItem('gamesShopMembers');
        if (savedMembers) {
            registeredMembers = JSON.parse(savedMembers);
        }
    } catch (error) {
        console.error('Error loading members from storage:', error);
    }
}

function saveMembersToStorage() {
    try {
        localStorage.setItem('gamesShopMembers', JSON.stringify(registeredMembers));
    } catch (error) {
        console.error('Error saving members to storage:', error);
    }
}

function loadUserSettingsFromStorage() {
    if (!currentUser) return;

    try {
        const savedSettings = localStorage.getItem(`gamesShopSettings_${currentUser.id}`);
        if (savedSettings) {
            userSettings = JSON.parse(savedSettings);
        }
    } catch (error) {
        console.error('Error loading user settings from storage:', error);
    }
}

function saveUserSettingsToStorage() {
    if (!currentUser) return;

    try {
        localStorage.setItem(`gamesShopSettings_${currentUser.id}`, JSON.stringify(userSettings));
        return true;
    } catch (error) {
        console.error('Error saving user settings to storage:', error);
        return false;
    }
}

function setupEventListeners() {
    // Auth system
    document.getElementById('loginSubmitBtn').addEventListener('click', handleLogin);
    document.getElementById('signupSubmitBtn').addEventListener('click', handleSignup);
    document.getElementById('showSignupBtn').addEventListener('click', showSignupForm);
    document.getElementById('showLoginBtn').addEventListener('click', showLoginForm);
    
    // Enter key listeners
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('signupConfirmPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSignup();
    });

    // Menu
    document.getElementById('menuBtn').addEventListener('click', toggleSideMenu);
    document.getElementById('closeMenu').addEventListener('click', closeSideMenu);

    // Menu items
    document.getElementById('homeBtn').addEventListener('click', () => {
        closeSideMenu();
        showAllOffers();
    });
    document.getElementById('messagesBtn').addEventListener('click', () => {
        closeSideMenu();
        showMessagesModal();
        clearMessageNotification();
    });
    document.getElementById('mediatorsBtn').addEventListener('click', () => {
        closeSideMenu();
        showMediatorsModal();
    });
    document.getElementById('gameOffersBtn').addEventListener('click', () => {
        closeSideMenu();
        showGameSearchModal();
    });
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        closeSideMenu();
        showEditProfileModal();
    });
    document.getElementById('settingsBtn').addEventListener('click', () => {
        closeSideMenu();
        showSettingsModal();
    });
    document.getElementById('supportBtn').addEventListener('click', () => {
        closeSideMenu();
        showSupportModal();
    });
    document.getElementById('discordBtn').addEventListener('click', () => {
        closeSideMenu();
        joinDiscordServer();
    });
    
    document.getElementById('marketBtn').addEventListener('click', () => {
        closeSideMenu();
        showMarketModal();
    });

    // Updates button in header
    document.getElementById('updatesBtn').addEventListener('click', () => {
        showUpdatesModal();
    });

    // Add offer
    document.getElementById('addOfferBtn').addEventListener('click', showAddOfferModal);
    document.getElementById('closeAddOffer').addEventListener('click', closeAddOfferModal);

    // Payment options
    document.getElementById('currencyBtn').addEventListener('click', showCurrencyOptions);
    document.getElementById('otherBtn').addEventListener('click', showAccountInput);

    // Currency selection
    document.querySelectorAll('.currency-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectCurrency(this.dataset.currency);
        });
    });

    // Submit offer
    document.getElementById('submitOffer').addEventListener('click', submitOffer);

    // Game search
    document.getElementById('gameSearchInput').addEventListener('input', filterOffersByGame);

    // Profile editing
    document.getElementById('saveProfile').addEventListener('click', saveProfile);
    document.querySelectorAll('.avatar-option').forEach(avatar => {
        avatar.addEventListener('click', function() {
            selectAvatar(this.dataset.avatar);
        });
    });

    // Chat
    document.getElementById('sendMessage').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
    document.getElementById('sendImageBtn').addEventListener('click', () => {
        document.getElementById('chatImage').click();
    });
    document.getElementById('chatImage').addEventListener('change', sendImageMessage);

    // Image preview for offers
    document.getElementById('offerImage').addEventListener('change', previewOfferImage);

    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });

    // الاستماع لتغييرات التخزين المحلي لتحديث العروض فوراً
    window.addEventListener('storage', function(e) {
        if (e.key === GLOBAL_OFFERS_KEY) {
            loadOffersFromGlobalStorage();
        } else if (e.key === 'newMessageNotification' && e.newValue) {
            try {
                const notification = JSON.parse(e.newValue);
                if (notification && notification.recipientId === currentUser.id) {
                    showMessageNotification();
                    loadConversationsFromStorage();
                    loadMessagesList();
                    console.log('📩 تم استلام إشعار رسالة جديدة');
                }
            } catch (error) {
                console.error('خطأ في معالجة إشعار الرسالة:', error);
            }
        } else if (e.key === 'gamesShopConversations') {
            loadConversationsFromStorage();
            checkForNewMessages();
        }
    });
    
    // فحص دوري للرسائل الجديدة
    setInterval(() => {
        if (currentUser) {
            checkForNewMessages();
        }
    }, 1000); // كل ثانية
}

// Auth functionality
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!email || !password) {
        showNotification('من فضلك املأ جميع الحقول', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                avatar: result.user.avatar
            };
            localStorage.setItem('gamesShopUser', JSON.stringify(currentUser));
            userVexBalance = 0;
            await showMainPage();
            showNotification('تم تسجيل الدخول بنجاح! 🎉');
        } else {
            showNotification(result.error, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleSignup() {
    const email = document.getElementById('signupEmail').value.trim();
    const name = document.getElementById('signupName').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const confirmPassword = document.getElementById('signupConfirmPassword').value.trim();
    
    // Validation
    if (!email || !name || !password || !confirmPassword) {
        showNotification('من فضلك املأ جميع الحقول', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('كلمتا المرور غير متطابقتين', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('من فضلك أدخل بريد إلكتروني صحيح', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, name, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                avatar: result.user.avatar
            };
            localStorage.setItem('gamesShopUser', JSON.stringify(currentUser));
            userVexBalance = 0;
            await showMainPage();
            showNotification('تم إنشاء الحساب بنجاح! 🎉');
        } else {
            showNotification(result.error, 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    } finally {
        showLoading(false);
    }
}

function showSignupForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
}

function showLoginForm() {
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

function showLoading(show) {
    const loading = document.getElementById('authLoading');
    const forms = document.querySelectorAll('.auth-form');
    
    if (show) {
        forms.forEach(form => form.classList.add('hidden'));
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
        // Show appropriate form based on current state
        const signupForm = document.getElementById('signupForm');
        const loginForm = document.getElementById('loginForm');
        
        if (signupForm.classList.contains('hidden')) {
            loginForm.classList.remove('hidden');
        } else {
            signupForm.classList.remove('hidden');
        }
    }
}

function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('mainPage').classList.remove('active');
}

async function showMainPage() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('mainPage').classList.add('active');

    // Update user info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userAvatar').src = `https://i.pravatar.cc/150?img=${currentUser.avatar}`;
    updateVexDisplay();

    // Register member
    registerMember();

    // Load all data from storage and server
    await loadOffersFromGlobalStorage();
    await loadConversationsFromServer(); // تحميل من الخادم أولاً
    loadConversationsFromStorage(); // ثم من التخزين المحلي
    loadUserSettingsFromStorage();
    loadMembersFromStorage();

    // Check for new messages immediately and periodically
    checkForNewMessages();
    setInterval(() => {
        if (currentUser) {
            checkForNewMessages();
            loadConversationsFromServer(); // تحديث المحادثات من الخادم
        }
    }, 1000); // فحص كل ثانية بدلاً من 3 ثوانٍ
    
    console.log('✅ تم تحميل الصفحة الرئيسية بنجاح');
}

// Side menu functionality
function toggleSideMenu() {
    document.getElementById('sideMenu').classList.toggle('active');
}

function closeSideMenu() {
    document.getElementById('sideMenu').classList.remove('active');
}

// Add offer functionality
function showAddOfferModal() {
    document.getElementById('addOfferModal').classList.add('active');
    resetAddOfferForm();
}

function closeAddOfferModal() {
    document.getElementById('addOfferModal').classList.remove('active');
}

function resetAddOfferForm() {
    document.getElementById('gameSelect').value = '';
    document.getElementById('offerText').value = '';
    document.getElementById('priceAmount').value = '';
    document.getElementById('accountDetails').value = '';
    document.getElementById('offerImage').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('currencyOptions').classList.add('hidden');
    document.getElementById('priceInput').classList.add('hidden');
    document.getElementById('accountInput').classList.add('hidden');
    document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.currency-btn').forEach(btn => btn.classList.remove('selected'));
}

function showCurrencyOptions() {
    document.getElementById('currencyOptions').classList.remove('hidden');
    document.getElementById('accountInput').classList.add('hidden');
    document.getElementById('currencyBtn').classList.add('active');
    document.getElementById('otherBtn').classList.remove('active');
}

function showAccountInput() {
    document.getElementById('accountInput').classList.remove('hidden');
    document.getElementById('currencyOptions').classList.add('hidden');
    document.getElementById('priceInput').classList.add('hidden');
    document.getElementById('otherBtn').classList.add('active');
    document.getElementById('currencyBtn').classList.remove('active');
}

function selectCurrency(currency) {
    document.querySelectorAll('.currency-btn').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    document.getElementById('selectedCurrency').textContent = currency;
    document.getElementById('priceInput').classList.remove('hidden');
    document.getElementById('currencyOptions').classList.add('hidden');
}

function previewOfferImage() {
    const fileInput = document.getElementById('offerImage');
    const preview = document.getElementById('imagePreview');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة">`;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        preview.innerHTML = '';
        preview.classList.add('hidden');
    }
}

function submitOffer() {
    const game = document.getElementById('gameSelect').value;
    const offerText = document.getElementById('offerText').value.trim();
    const priceAmount = document.getElementById('priceAmount').value;
    const selectedCurrency = document.getElementById('selectedCurrency').textContent;
    const accountDetails = document.getElementById('accountDetails').value.trim();
    const imageFile = document.getElementById('offerImage').files[0];

    if (!game || !offerText) {
        alert('من فضلك املأ جميع الحقول المطلوبة');
        return;
    }

    let requirement = '';
    if (selectedCurrency && priceAmount) {
        requirement = `${priceAmount} ${selectedCurrency}`;
    } else if (accountDetails) {
        requirement = accountDetails;
    } else {
        alert('من فضلك حدد المطلوب مقابل العرض');
        return;
    }

    // Process image if provided
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            submitOfferWithImage(game, offerText, requirement, e.target.result);
        };
        reader.readAsDataURL(imageFile);
    } else {
        submitOfferWithImage(game, offerText, requirement, null);
    }
}

function submitOfferWithImage(game, offerText, requirement, imageData) {
    // Show security warning before submitting
    showSecurityWarning(() => {
        const isVIP = checkVIPStatusLocal();

        const newOffer = {
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            game: game,
            offer: offerText,
            requirement: requirement,
            isVIP: isVIP,
            image: imageData
        };

        const savedOffer = saveOfferToGlobalStorage(newOffer);
        if (savedOffer) {
            closeAddOfferModal();
            showNotification('تم إضافة العرض بنجاح! 🎉 سيظهر لجميع المستخدمين فوراً');
        } else {
            alert('حدث خطأ في إضافة العرض');
        }
    });
}

function checkVIPStatusLocal() {
    const vipStatus = localStorage.getItem(`vip_${currentUser.id}`);
    return vipStatus === 'true';
}

// Offers display
function displayOffers(filteredOffers = null) {
    const container = document.getElementById('offersContainer');
    const offersToShow = filteredOffers || offers;

    // Sort offers by timestamp (newest first)
    const sortedOffers = [...offersToShow].sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
    });

    container.innerHTML = '';

    if (sortedOffers.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #00bfff; font-size: 1.5rem; grid-column: 1/-1;">😔 لا توجد عروض حالياً</div>';
        return;
    }

    sortedOffers.forEach(offer => {
        const offerCard = createOfferCard(offer);
        container.appendChild(offerCard);
    });

    console.log('تم عرض العروض العالمية:', sortedOffers.length);
}

function createOfferCard(offer) {
    const card = document.createElement('div');
    card.className = `offer-card ${offer.isVIP ? 'vip-offer' : ''}`;

    const isOwner = offer.userId === currentUser.id;
    const hasLiked = offer.likedBy && offer.likedBy.includes(currentUser.id);

    card.innerHTML = `
        <div class="offer-header">
            <img src="https://i.pravatar.cc/150?img=${offer.userAvatar}" alt="${offer.userName}" class="offer-avatar">
            <span class="offer-username">${offer.userName}${offer.isVIP ? ' 👑' : ''}</span>
            <span class="like-count">❤️ ${offer.likes || 0}</span>
            ${offer.isVIP ? '<span class="vip-badge-small">VIP</span>' : ''}
        </div>
        <div class="offer-content">
            <h3>العرض📋</h3>
            ${offer.image ? `<img src="${offer.image}" alt="صورة العرض" class="offer-image" onclick="showImageModal('${offer.image}')">` : ''}
            <div class="offer-details">
                <div class="offer-detail">
                    <strong>اسم اللعبه 🕹️:</strong> ${offer.game}
                </div>
                <div class="offer-detail">
                    <strong>العرض 📋:</strong> ${offer.offer}
                </div>
                <div class="offer-detail">
                    <strong>المطلوب☝️:</strong> ${offer.requirement}
                </div>
            </div>
            <div class="offer-actions">
                <button class="action-btn message-btn" onclick="startChat('${offer.userName}', ${offer.userId})">
                    مراسله الشخص💬
                </button>
                <button class="action-btn like-btn ${hasLiked ? 'liked' : ''}" onclick="toggleLike(${offer.id})">
                    ${hasLiked ? 'الغاء اعجاب💔' : 'لايك👍'}
                </button>
                ${isOwner ? `<button class="action-btn delete-btn" onclick="deleteOffer(${offer.id})">حــــذف🗑️</button>` : ''}
            </div>
        </div>
    `;

    return card;
}

async function toggleLike(offerId) {
    try {
        // محاولة تحديث الإعجاب في الخادم أولاً
        try {
            const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: currentUser.id })
            });

            if (response.ok) {
                const result = await response.json();
                // تحديث العرض في القائمة المحلية
                const offerIndex = offers.findIndex(o => o.id === offerId);
                if (offerIndex !== -1) {
                    offers[offerIndex] = result.offer;
                }
                console.log('✅ تم تحديث الإعجاب في الخادم');
            } else {
                throw new Error('Server like failed');
            }
        } catch (serverError) {
            console.log('⚠️ فشل تحديث الإعجاب في الخادم، تحديث محلي:', serverError);
            // في حالة فشل الخادم، حدث محلياً
            const offerIndex = offers.findIndex(o => o.id === offerId);
            if (offerIndex !== -1) {
                const offer = offers[offerIndex];

                if (!offer.likedBy) offer.likedBy = [];
                if (!offer.likes) offer.likes = 0;

                const userIndex = offer.likedBy.indexOf(currentUser.id);
                if (userIndex > -1) {
                    offer.likedBy.splice(userIndex, 1);
                    offer.likes = Math.max(0, offer.likes - 1);
                } else {
                    offer.likedBy.push(currentUser.id);
                    offer.likes = (offer.likes || 0) + 1;
                }

                offers[offerIndex] = offer;
                localStorage.setItem(GLOBAL_OFFERS_KEY, JSON.stringify(offers));
            }
        }

        displayOffers();
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

async function deleteOffer(offerId) {
    if (confirm('هل أنت متأكد من حذف هذا العرض؟')) {
        try {
            // محاولة حذف من الخادم أولاً
            try {
                const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    const result = await response.json();
                    offers = result.offers || [];
                    console.log('✅ تم حذف العرض من الخادم');
                } else {
                    throw new Error('Server delete failed');
                }
            } catch (serverError) {
                console.log('⚠️ فشل حذف من الخادم، حذف محلي:', serverError);
                // في حالة فشل الخادم، احذف محلياً
                offers = offers.filter(offer => offer.id !== offerId);
                localStorage.setItem(GLOBAL_OFFERS_KEY, JSON.stringify(offers));
            }

            displayOffers();
            showNotification('تم حذف العرض بنجاح 🗑️');
        } catch (error) {
            console.error('Error deleting offer:', error);
            alert('حدث خطأ في حذف العرض');
        }
    }
}

function showAllOffers() {
    loadOffersFromGlobalStorage();
}

// تحديث تلقائي للعروض كل 30 ثانية
setInterval(async () => {
    if (currentUser) {
        await loadOffersFromGlobalStorage();
        console.log('🔄 تم تحديث العروض تلقائياً');
    }
}, 30000);

// Chat functionality
function startChat(partnerName, partnerId) {
    // التحقق من الحظر
    if (userSettings.blockedUsers.includes(partnerId)) {
        showNotification('لا يمكنك مراسلة هذا المستخدم - محظور 🚫');
        return;
    }

    // التحقق من إعدادات السماح بالمراسلات
    if (!userSettings.allowMessages) {
        showNotification('المراسلات معطلة في الإعدادات 🚫');
        return;
    }

    currentChatPartner = { name: partnerName, id: parseInt(partnerId) };
    document.getElementById('chatTitle').textContent = `مراسلة ${partnerName}`;
    document.getElementById('chatModal').classList.add('active');
    
    // تحديث المحادثات وعرض الرسائل فوراً
    loadConversationsFromStorage();
    loadChatMessages();
    
    console.log(`💬 بدء محادثة مع ${partnerName} (ID: ${partnerId})`);
    
    // تحديث المحادثات من الخادم في الخلفية
    setTimeout(async () => {
        await loadConversationsFromServer();
        loadChatMessages();
    }, 500);
}

function loadChatMessages() {
    if (!currentChatPartner) return;

    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    console.log('🔄 تحميل رسائل المحادثة:', chatId);
    
    // تحديث المحادثات من التخزين المحلي
    loadConversationsFromStorage();
    
    // التأكد من وجود المحادثة
    if (!conversations[chatId]) {
        conversations[chatId] = [];
        console.log('📝 إنشاء محادثة جديدة:', chatId);
    }
    
    const messages = conversations[chatId] || [];
    const container = document.getElementById('chatMessages');

    if (!container) {
        console.log('❌ لم يتم العثور على حاوي الرسائل');
        return;
    }

    container.innerHTML = '';
    console.log('💬 عدد الرسائل للعرض:', messages.length);

    if (messages.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #00bfff; padding: 2rem;">ابدأ المحادثة! 💬</div>';
        return;
    }

    // ترتيب الرسائل حسب الوقت
    const sortedMessages = messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    sortedMessages.forEach((message, index) => {
        if (!message.text && !message.image) {
            console.log('⚠️ رسالة فارغة تم تجاهلها:', index);
            return;
        }

        const messageDiv = document.createElement('div');
        const isSent = message.senderId === currentUser.id;
        messageDiv.className = `chat-message ${isSent ? 'sent' : 'received'}`;

        const messageTime = message.timestamp ? new Date(message.timestamp).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        }) : '';

        let messageContent = '';
        if (message.type === 'image' && message.image) {
            messageContent = `<img src="${message.image}" alt="صورة" class="chat-message-image" onclick="showImageModal('${message.image}')">`;
        } else if (message.text) {
            messageContent = `<div class="message-text">${message.text}</div>`;
        }

        messageDiv.innerHTML = `
            ${messageContent}
            ${messageTime ? `<small class="message-time">${messageTime}</small>` : ''}
        `;
        container.appendChild(messageDiv);
        console.log(`📨 تم عرض رسالة ${index + 1}: "${message.text || 'صورة'}" من`, isSent ? 'أنت' : message.senderName || 'المستخدم الآخر');
    });

    container.scrollTop = container.scrollHeight;
    console.log('✅ تم تحميل جميع الرسائل بنجاح');
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();

    if (!text || !currentChatPartner) {
        console.log('⚠️ لا يوجد نص أو مستخدم للمراسلة');
        return;
    }

    const chatId = getChatId(currentUser.id, currentChatPartner.id);

    const message = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        text: text,
        timestamp: new Date().toISOString(),
        type: 'text'
    };

    // التأكد من وجود المحادثة
    if (!conversations[chatId]) {
        conversations[chatId] = [];
    }

    // إضافة الرسالة
    conversations[chatId].push(message);
    
    // حفظ فوراً
    saveConversationsToStorage();
    
    // عرض الرسالة فوراً
    loadChatMessages();
    
    // مسح المدخل
    input.value = '';
    
    // حفظ في الخادم
    const serverSaved = await saveConversationToServer(chatId, message);
    
    // إرسال إشعار للمستخدم الآخر
    await notifyNewMessage(currentChatPartner.id);
    
    // إشعار نجاح
    showNotification(`تم إرسال الرسالة إلى ${currentChatPartner.name} 📩`);
    console.log(`📩 تم إرسال رسالة إلى ${currentChatPartner.name}: "${text}"`);
    
    // تحديث قائمة المحادثات
    loadMessagesList();
}

async function sendImageMessage() {
    const imageFile = document.getElementById('chatImage').files[0];
    
    if (!imageFile || !currentChatPartner) {
        console.log('⚠️ لا يوجد صورة أو مستخدم للمراسلة');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const chatId = getChatId(currentUser.id, currentChatPartner.id);

        const message = {
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            image: e.target.result,
            text: '📸 صورة',
            timestamp: new Date().toISOString(),
            type: 'image'
        };

        // التأكد من وجود المحادثة
        if (!conversations[chatId]) {
            conversations[chatId] = [];
        }

        // إضافة الرسالة
        conversations[chatId].push(message);
        
        // حفظ فوراً
        saveConversationsToStorage();
        
        // عرض الرسالة فوراً
        loadChatMessages();
        
        // مسح اختيار الملف
        document.getElementById('chatImage').value = '';
        
        // حفظ في الخادم
        const serverSaved = await saveConversationToServer(chatId, message);
        
        // إرسال إشعار للمستخدم الآخر
        await notifyNewMessage(currentChatPartner.id);
        
        // إشعار نجاح
        showNotification(`تم إرسال صورة إلى ${currentChatPartner.name} 📸`);
        console.log(`📸 تم إرسال صورة إلى ${currentChatPartner.name}`);
        
        // تحديث قائمة المحادثات
        loadMessagesList();
    };
    reader.readAsDataURL(imageFile);
}

function showImageModal(imageSrc) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <img src="${imageSrc}" alt="صورة مكبرة">
        <span class="image-modal-close">&times;</span>
    `;
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal || e.target.className === 'image-modal-close') {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

function notifyNewMessage(recipientId) {
    try {
        const notification = {
            recipientId: recipientId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            timestamp: new Date().toISOString(),
            id: Date.now() + Math.random()
        };
        
        // تحديث الإشعار الفوري
        localStorage.setItem('newMessageNotification', JSON.stringify(notification));
        
        // حفظ الإشعارات بشكل دائم
        const existingNotifications = JSON.parse(localStorage.getItem('messageNotifications') || '[]');
        existingNotifications.push(notification);
        
        // الاحتفاظ بآخر 100 إشعار فقط
        if (existingNotifications.length > 100) {
            existingNotifications.splice(0, existingNotifications.length - 100);
        }
        
        localStorage.setItem('messageNotifications', JSON.stringify(existingNotifications));
        
        // تحديث إشعار المراسلات فوراً للمرسل
        updateMessageBadge();
        
        // إزالة الإشعار الفوري بعد ثانية واحدة
        setTimeout(() => {
            localStorage.removeItem('newMessageNotification');
        }, 1000);
        
        console.log(`📩 تم إرسال إشعار رسالة جديدة إلى المستخدم ${recipientId}`);
    } catch (error) {
        console.error('خطأ في إرسال إشعار الرسالة:', error);
    }
}

function getChatId(userId1, userId2) {
    return [userId1, userId2].sort().join('-');
}

// Messages modal
function showMessagesModal() {
    document.getElementById('messagesModal').classList.add('active');
    loadMessagesList();
}

function loadMessagesList() {
    const container = document.getElementById('messagesList');
    const userChats = Object.keys(conversations).filter(chatId => 
        chatId.includes(currentUser.id.toString())
    );

    container.innerHTML = '';

    const activeChats = userChats.filter(chatId => {
        const messages = conversations[chatId];
        return messages && messages.length > 0;
    });

    if (activeChats.length === 0) {
        container.innerHTML = '<div class="no-conversations"><i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i><p>لا توجد محادثات حالياً</p><p style="opacity: 0.7; font-size: 0.9rem;">ابدأ محادثة من خلال الضغط على "مراسلة الشخص" في أي عرض</p></div>';
        return;
    }

    // ترتيب المحادثات حسب آخر رسالة
    activeChats.sort((a, b) => {
        const messagesA = conversations[a];
        const messagesB = conversations[b];
        const lastMessageA = messagesA[messagesA.length - 1];
        const lastMessageB = messagesB[messagesB.length - 1];
        return new Date(lastMessageB.timestamp) - new Date(lastMessageA.timestamp);
    });

    activeChats.forEach(chatId => {
        const messages = conversations[chatId];
        const lastMessage = messages[messages.length - 1];
        const otherUserId = chatId.split('-').find(id => id !== currentUser.id.toString());

        let otherUserName = 'مستخدم غير معروف';
        let otherUserAvatar = 1;

        const offer = offers.find(o => o.userId == otherUserId);
        if (offer) {
            otherUserName = offer.userName;
            otherUserAvatar = offer.userAvatar;
        } else {
            const userMessage = messages.find(m => m.senderId != currentUser.id);
            if (userMessage && userMessage.senderName) {
                otherUserName = userMessage.senderName;
                otherUserAvatar = userMessage.senderAvatar || 1;
            }
        }

        // تحديد ما إذا كانت الرسالة جديدة
        const isNewMessage = lastMessage.senderId !== currentUser.id;
        const messageText = lastMessage.text || '📸 صورة';

        const messageItem = document.createElement('div');
        messageItem.className = `conversation-item ${isNewMessage ? 'new-message' : ''}`;
        messageItem.innerHTML = `
            <div class="conversation-header">
                <img src="https://i.pravatar.cc/150?img=${otherUserAvatar}" alt="${otherUserName}" class="conversation-avatar">
                <div class="conversation-info">
                    <div class="conversation-name">${otherUserName}</div>
                    <div class="conversation-last-message">${messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText}</div>
                    <small class="conversation-time">${new Date(lastMessage.timestamp).toLocaleString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit'
                    })}</small>
                </div>
                <div class="conversation-indicator">
                    ${isNewMessage ? '<span class="new-message-dot">●</span>' : ''}
                    <i class="fas fa-chevron-left"></i>
                </div>
            </div>
        `;
        messageItem.addEventListener('click', () => {
            closeModal('messagesModal');
            startChat(otherUserName, parseInt(otherUserId));
        });

        container.appendChild(messageItem);
    });
}

// Other modals
function showMediatorsModal() {
    document.getElementById('mediatorsModal').classList.add('active');
}

function showGameSearchModal() {
    document.getElementById('gameSearchModal').classList.add('active');
    document.getElementById('gameSearchInput').value = '';
    document.getElementById('filteredOffers').innerHTML = '';
}

function filterOffersByGame() {
    const searchTerm = document.getElementById('gameSearchInput').value.toLowerCase();
    const container = document.getElementById('filteredOffers');

    if (!searchTerm) {
        container.innerHTML = '';
        return;
    }

    const filteredOffers = offers.filter(offer => 
        offer.game.toLowerCase().includes(searchTerm)
    );

    container.innerHTML = '';

    if (filteredOffers.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #00bfff;">لا توجد عروض لهذه اللعبة</div>';
        return;
    }

    filteredOffers.forEach(offer => {
        const offerCard = createOfferCard(offer);
        container.appendChild(offerCard);
    });
}

function showEditProfileModal() {
    document.getElementById('editProfileModal').classList.add('active');
    document.getElementById('editNameInput').value = currentUser.name;

    document.querySelectorAll('.avatar-option').forEach(avatar => {
        avatar.classList.remove('selected');
        if (avatar.dataset.avatar == currentUser.avatar) {
            avatar.classList.add('selected');
        }
    });
}

function selectAvatar(avatarId) {
    document.querySelectorAll('.avatar-option').forEach(avatar => {
        avatar.classList.remove('selected');
    });
    event.target.classList.add('selected');
    selectedAvatar = parseInt(avatarId);
}

async function saveProfile() {
    const newName = document.getElementById('editNameInput').value.trim();
    if (!newName) {
        alert('من فضلك ادخل اسم صحيح');
        return;
    }

    currentUser.name = newName;
    currentUser.avatar = selectedAvatar;

    localStorage.setItem('gamesShopUser', JSON.stringify(currentUser));

    // Update display
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userAvatar').src = `https://i.pravatar.cc/150?img=${currentUser.avatar}`;
    updateVexDisplay();

    closeModal('editProfileModal');
    showNotification('تم حفظ الاعدادات بنجاح! ✅');
}

// Utility functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Settings functionality
function showSettingsModal() {
    document.getElementById('settingsModal').classList.add('active');
    updateSettingsDisplay();
}

function updateSettingsDisplay() {
    const allowMessagesToggle = document.getElementById('allowMessagesToggle');
    allowMessagesToggle.textContent = userSettings.allowMessages ? 'ON' : 'OFF';
    allowMessagesToggle.className = `toggle-btn ${userSettings.allowMessages ? 'on' : 'off'}`;
}

async function toggleMessageSettings() {
    userSettings.allowMessages = !userSettings.allowMessages;
    saveUserSettingsToStorage();
    updateSettingsDisplay();
    showNotification(userSettings.allowMessages ? 'تم تفعيل المراسلات ✅' : 'تم إيقاف المراسلات 🚫');
}

function showBlockListModal() {
    document.getElementById('blockListModal').classList.add('active');
    loadBlockList();
}

function loadBlockList() {
    const container = document.getElementById('blockList');
    const userChats = Object.keys(conversations).filter(chatId => 
        chatId.includes(currentUser.id.toString())
    );

    container.innerHTML = '';

    const activeChats = userChats.filter(chatId => {
        const messages = conversations[chatId];
        return messages && messages.length > 0;
    });

    if (activeChats.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #00bfff; padding: 2rem;">لا يوجد أشخاص للحظر</div>';
        return;
    }

    activeChats.forEach(chatId => {
        const messages = conversations[chatId];
        const otherUserId = parseInt(chatId.split('-').find(id => id !== currentUser.id.toString()));

        let otherUserName = 'مستخدم غير معروف';
        let otherUserAvatar = 1;

        const offer = offers.find(o => o.userId == otherUserId);
        if (offer) {
            otherUserName = offer.userName;
            otherUserAvatar = offer.userAvatar;
        } else {
            const userMessage = messages.find(m => m.senderId != currentUser.id);
            if (userMessage && userMessage.senderName) {
                otherUserName = userMessage.senderName;
                otherUserAvatar = userMessage.senderAvatar || 1;
            }
        }

        const isBlocked = userSettings.blockedUsers.includes(otherUserId);

        const userItem = document.createElement('div');
        userItem.className = 'block-user-item';
        userItem.innerHTML = `
            <div class="block-user-info">
                <img src="https://i.pravatar.cc/150?img=${otherUserAvatar}" alt="${otherUserName}" class="block-user-avatar">
                <span class="block-user-name">${otherUserName}</span>
            </div>
            <button class="block-btn ${isBlocked ? 'unblock' : 'block'}" onclick="${isBlocked ? 'unblockUser' : 'blockUser'}(${otherUserId}, '${otherUserName}')">
                ${isBlocked ? 'إلغاء الحظر' : 'حظر🚫'}
            </button>
        `;

        container.appendChild(userItem);
    });
}

async function blockUser(userId, userName) {
    if (confirm(`هل أنت متأكد من حظر ${userName}؟`)) {
        userSettings.blockedUsers.push(userId);
        saveUserSettingsToStorage();
        loadBlockList();
        showNotification(`تم حظر ${userName} بنجاح 🚫`);
    }
}

async function unblockUser(userId, userName) {
    if (confirm(`هل أنت متأكد من إلغاء حظر ${userName}؟`)) {
        userSettings.blockedUsers = userSettings.blockedUsers.filter(id => id !== userId);
        saveUserSettingsToStorage();
        loadBlockList();
        showNotification(`تم إلغاء حظر ${userName} ✅`);
    }
}

// Support modal
function showSupportModal() {
    document.getElementById('supportModal').classList.add('active');
}

// Updates modal
function showUpdatesModal() {
    document.getElementById('updatesModal').classList.add('active');
}

// Market modal
function showMarketModal() {
    document.getElementById('marketModal').classList.add('active');
}

// VIP purchase
async function buyVIP() {
    const vipPrice = 10000;

    if (userVexBalance < vipPrice) {
        showInsufficientVexModal();
        return;
    }

    if (confirm(`هل تريد شراء VIP مقابل ${vipPrice} Vex؟`)) {
        userVexBalance -= vipPrice;
        updateVexDisplay();
        localStorage.setItem(`vip_${currentUser.id}`, 'true');
        showNotification('تم شراء VIP بنجاح! 👑');

        const vipStatus = localStorage.getItem(`vip_${currentUser.id}`);
        checkVIPStatusLocal();
    }
}

function showInsufficientVexModal() {
    const balanceModal = document.createElement('div');
    balanceModal.className = 'modal active';
    balanceModal.id = 'balanceModal';

    balanceModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>رصيد Vex غير كافي 💰</h3>
                <button class="close-modal" onclick="closeBalanceModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="balance-warning">
                    <div class="vex-icon" style="font-size: 3rem; margin-bottom: 1rem;">Vex</div>
                    <h4>عذراً، رصيدك من Vex غير كافي لإتمام هذه العملية</h4>
                    <p>سعر VIP: 10,000 Vex</p>
                    <p>رصيدك الحالي: ${userVexBalance} Vex</p>
                    <p>يمكنك الحصول على المزيد من Vex من خلال الأنشطة في الموقع</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(balanceModal);
}

function updateVexDisplay() {
    const vexElement = document.getElementById('userVexBalance');
    if (vexElement) {
        vexElement.textContent = userVexBalance.toLocaleString();
    }
}

function joinDiscordServer() {
    window.open('https://discord.gg/4yWU9JGt', '_blank');
    showNotification('تم فتح رابط سيرفر الديسكورد! 🟦');
}

function closeBalanceModal() {
    const modal = document.getElementById('balanceModal');
    if (modal) {
        modal.remove();
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    const isError = type === 'error';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, ${isError ? '#ff4757, #c44569' : '#00ff80, #00cc66'});
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: bold;
        box-shadow: 0 5px 15px rgba(${isError ? '255, 71, 87' : '0, 255, 128'}, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${isError ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Member management
function registerMember() {
    if (!currentUser) return;
    
    const existingMember = registeredMembers.find(member => member.id === currentUser.id);
    if (!existingMember) {
        registeredMembers.push({
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            joinDate: new Date().toISOString(),
            isOnline: true
        });
        saveMembersToStorage();
    } else {
        existingMember.isOnline = true;
        existingMember.name = currentUser.name;
        existingMember.avatar = currentUser.avatar;
        saveMembersToStorage();
    }
}

function showMembersModal() {
    document.getElementById('membersModal').classList.add('active');
    loadMembersList();
}

function loadMembersList() {
    const container = document.getElementById('membersList');
    container.innerHTML = '';

    if (registeredMembers.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #00bfff; padding: 2rem;">لا يوجد أعضاء مسجلين حالياً</div>';
        return;
    }

    registeredMembers.forEach(member => {
        const memberItem = document.createElement('div');
        memberItem.className = 'member-item';
        memberItem.innerHTML = `
            <div class="member-info">
                <img src="https://i.pravatar.cc/150?img=${member.avatar}" alt="${member.name}" class="member-avatar">
                <div class="member-details">
                    <div class="member-name">${member.name}</div>
                    <div class="member-status ${member.isOnline ? 'online' : 'offline'}">
                        ${member.isOnline ? 'متصل الآن' : 'غير متصل'}
                    </div>
                </div>
            </div>
            <button class="member-message-btn" onclick="startChat('${member.name}', ${member.id})">
                مراسلة 💬
            </button>
        `;
        container.appendChild(memberItem);
    });
}

function showSecurityWarning(callback) {
    document.getElementById('securityWarningModal').classList.add('active');
    
    document.getElementById('agreeWarning').onclick = function() {
        document.getElementById('securityWarningModal').classList.remove('active');
        if (callback) callback();
    };
}

function checkForNewMessages() {
    if (!currentUser) return;
    
    const userChats = Object.keys(conversations).filter(chatId => 
        chatId.includes(currentUser.id.toString())
    );

    let hasNew = false;
    let unreadCount = 0;
    
    userChats.forEach(chatId => {
        const messages = conversations[chatId];
        if (messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.senderId !== currentUser.id) {
                const messageTime = new Date(lastMessage.timestamp);
                const now = new Date();
                if (now - messageTime < 1800000) { // رسالة جديدة خلال آخر 30 دقيقة
                    hasNew = true;
                    unreadCount++;
                }
            }
        }
    });

    // Also check for stored notifications
    const notifications = JSON.parse(localStorage.getItem('messageNotifications') || '[]');
    const recentNotifications = notifications.filter(notif => {
        const notifTime = new Date(notif.timestamp);
        const now = new Date();
        return notif.recipientId === currentUser.id && (now - notifTime < 1800000);
    });

    if (hasNew || recentNotifications.length > 0) {
        showMessageNotification(Math.max(unreadCount, recentNotifications.length));
        hasNewMessages = true;
        console.log('🔔 تم اكتشاف رسائل جديدة:', Math.max(unreadCount, recentNotifications.length));
    }
}

function showMessageNotification(count = 1) {
    const badge = document.getElementById('messageNotification');
    if (badge) {
        badge.classList.remove('hidden');
        badge.textContent = count > 9 ? '9+' : count.toString();
        badge.style.background = '#ff4757';
        badge.style.animation = 'pulse 1s infinite';
    }
}

function clearMessageNotification() {
    const badge = document.getElementById('messageNotification');
    if (badge) {
        badge.classList.add('hidden');
        badge.style.animation = 'none';
    }
    hasNewMessages = false;
}

function updateMessageBadge() {
    checkForNewMessages();
}

// AdSense initialization
function initializeAds() {
    // Initialize all AdSense ads on the page
    const adsenseElements = document.querySelectorAll('.adsbygoogle');
    
    adsenseElements.forEach((ad, index) => {
        try {
            if (window.adsbygoogle && !ad.hasAttribute('data-adsbygoogle-status')) {
                setTimeout(() => {
                    (adsbygoogle = window.adsbygoogle || []).push({});
                    console.log(`✅ تم تحميل الإعلان ${index + 1}`);
                }, index * 500); // تأخير بسيط بين الإعلانات
            }
        } catch (e) {
            console.log(`⚠️ خطأ في تحميل الإعلان ${index + 1}:`, e);
        }
    });
    
    // إعادة تحميل الإعلانات كل 5 دقائق (300000 ميلي ثانية)
    setInterval(() => {
        refreshAds();
        showWelcomeAd(); // إظهار إعلان ترحيبي كل 5 دقائق
    }, 300000);
    
    // إظهار إعلان ترحيبي عند دخول الموقع
    setTimeout(() => {
        showWelcomeAd();
    }, 3000);
}

function refreshAds() {
    try {
        const adsenseElements = document.querySelectorAll('.adsbygoogle');
        adsenseElements.forEach((ad, index) => {
            if (!ad.hasAttribute('data-adsbygoogle-status')) {
                setTimeout(() => {
                    (adsbygoogle = window.adsbygoogle || []).push({});
                }, index * 100);
            }
        });
        console.log('🔄 تم تحديث الإعلانات');
    } catch (e) {
        console.log('خطأ في تحديث الإعلانات:', e);
    }
}

// إظهار إعلان ترحيبي
function showWelcomeAd() {
    const adModal = document.createElement('div');
    adModal.className = 'ad-modal';
    adModal.innerHTML = `
        <div class="ad-modal-content">
            <div class="ad-header">
                <h3>🎮 مرحباً بك في GAMES SHOP</h3>
                <button class="close-ad-modal" onclick="closeAdModal()">×</button>
            </div>
            <div class="ad-body">
                <!-- Google AdSense Ad -->
                <ins class="adsbygoogle welcome-ad"
                     style="display:block; width:300px; height:250px;"
                     data-ad-client="ca-pub-1404937854433871"
                     data-ad-slot="1234567890"
                     data-ad-format="auto"></ins>
                <div class="ad-message">
                    <p>💫 استمتع بأفضل عروض الألعاب</p>
                    <p>🎯 تواصل مع اللاعبين بسهولة</p>
                    <p>⭐ تسوق بأمان مع الوسطاء</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(adModal);
    
    // تحميل الإعلان
    try {
        (adsbygoogle = window.adsbygoogle || []).push({});
        console.log('📢 تم عرض الإعلان الترحيبي');
    } catch (e) {
        console.log('خطأ في تحميل الإعلان الترحيبي:', e);
    }
    
    // إغلاق الإعلان تلقائياً بعد 10 ثوانٍ
    setTimeout(() => {
        closeAdModal();
    }, 10000);
}

function closeAdModal() {
    const adModal = document.querySelector('.ad-modal');
    if (adModal) {
        adModal.remove();
    }
}
