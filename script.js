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
let userOnlineStatus = {};
let typingUsers = {};
let typingTimeout = null;

// إنشاء معرف 10 أرقام للمستخدم
function generateUserId() {
    return Math.floor(1000000000 + Math.random() * 9000000000);
}

// التحقق من صلاحيات الأدمن بناءً على الآيدي
function isOwnerAdmin(userId) {
    return userId === 1020304050; // الآيدي الخاص بك
}

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
    console.log('📄 DOM تم تحميله بالكامل');

    // التأكد من تحميل جميع العناصر
    if (document.readyState === 'complete') {
        console.log('✅ الصفحة جاهزة تماماً');
        initializeApp();
        initializeAds();
        initializeMobileOptimizations();
    } else {
        // انتظار تحميل الصفحة بالكامل
        window.addEventListener('load', function() {
            console.log('✅ تم تحميل جميع الموارد');
            initializeApp();
            initializeAds();
            initializeMobileOptimizations();
        });
    }
});

// تأكيد إضافي للتحميل
window.addEventListener('load', function() {
    // التأكد من أن جميع الأزرار موجودة
    const loginBtn = document.getElementById('loginSubmitBtn');
    const signupBtn = document.getElementById('signupSubmitBtn');

    if (!loginBtn || !signupBtn) {
        console.error('❌ لم يتم العثور على أزرار تسجيل الدخول');
        // إعادة محاولة ربط الأحداث
        setTimeout(() => {
            setupEventListeners();
            console.log('🔄 إعادة محاولة ربط الأحداث');
        }, 500);
    } else {
        console.log('✅ جميع الأزرار موجودة وجاهزة');
    }
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
    console.log('🚀 بدء تهيئة التطبيق...');

    // تأخير لضمان تحميل DOM بالكامل
    setTimeout(() => {
        // Event listeners - يجب أن يكون أولاً
        setupEventListeners();
        console.log('✅ تم ربط الأحداث بنجاح');

        // Check if user is already logged in
        const savedUser = localStorage.getItem('gamesShopUser');
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                
                // التحقق من صحة بيانات المستخدم
                if (userData && userData.id && userData.name && userData.email) {
                    currentUser = userData;
                    showMainPage();
                    console.log('✅ تم تسجيل دخول المستخدم تلقائياً:', currentUser.name);
                } else {
                    console.log('⚠️ بيانات المستخدم غير مكتملة، إعادة توجيه لتسجيل الدخول');
                    localStorage.removeItem('gamesShopUser');
                    showLoginPage();
                }
            } catch (error) {
                console.error('خطأ في بيانات المستخدم المحفوظة:', error);
                localStorage.removeItem('gamesShopUser');
                showLoginPage();
            }
        } else {
            showLoginPage();
            console.log('📋 عرض صفحة تسجيل الدخول');
        }

        // Load data from localStorage
        loadOffersFromGlobalStorage();
        loadConversationsFromStorage();
        loadUserSettingsFromStorage();
        loadMembersFromStorage();

        // تتبع حالة المستخدم والكتابة
        setInterval(updateTypingStatus, 1000);

        console.log('✅ تم تهيئة التطبيق بالكامل');
    }, 100);
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
            let hasNewMessages = false;
            let conversationsUpdated = false;

            // دمج المحادثات من الخادم مع المحادثات المحلية
            Object.keys(serverConversations).forEach(chatId => {
                if (!conversations[chatId]) {
                    conversations[chatId] = [];
                    conversationsUpdated = true;
                }

                const beforeCount = conversations[chatId].length;

                // إضافة الرسائل الجديدة فقط
                serverConversations[chatId].forEach(serverMessage => {
                    const exists = conversations[chatId].some(localMessage => 
                        localMessage.timestamp === serverMessage.timestamp && 
                        localMessage.senderId === serverMessage.senderId &&
                        localMessage.text === serverMessage.text
                    );
                    if (!exists) {
                        conversations[chatId].push(serverMessage);
                        hasNewMessages = true;
                        conversationsUpdated = true;
                    }
                });

                // ترتيب الرسائل حسب الوقت
                if (conversationsUpdated) {
                    conversations[chatId].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                }

                // إذا كان هناك رسائل جديدة وكان المستخدم في هذه المحادثة، حدث العرض
                if (hasNewMessages && currentChatPartner && getChatId(currentUser.id, currentChatPartner.id) === chatId) {
                    loadChatMessages();
                }
            });

            if (conversationsUpdated) {
                saveConversationsToStorage();
                console.log('✅ تم تحديث المحادثات من الخادم');

                // تحديث قائمة المحادثات إذا كانت مفتوحة
                if (document.getElementById('messagesModal').classList.contains('active')) {
                    loadMessagesList();
                }

                // إظهار إشعار الرسائل الجديدة
                if (hasNewMessages) {
                    showMessageNotification();
                    updateMessageBadge();
                }
            }
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
    // Auth system - التأكد من وجود العناصر قبل ربط الأحداث
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const signupSubmitBtn = document.getElementById('signupSubmitBtn');
    const showSignupBtn = document.getElementById('showSignupBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const loginPassword = document.getElementById('loginPassword');
    const signupConfirmPassword = document.getElementById('signupConfirmPassword');

    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }

    if (signupSubmitBtn) {
        signupSubmitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleSignup();
        });
    }

    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showSignupForm();
        });
    }

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });
    }

    // Enter key listeners
    if (loginPassword) {
        loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
            }
        });
    }

    if (signupConfirmPassword) {
        signupConfirmPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSignup();
            }
        });
    }

    // إضافة مستمعات إضافية لجميع حقول النماذج
    const loginEmail = document.getElementById('loginEmail');
    if (loginEmail) {
        loginEmail.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
            }
        });
    }

    const signupEmail = document.getElementById('signupEmail');
    if (signupEmail) {
        signupEmail.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('signupName').focus();
            }
        });
    }

    const signupName = document.getElementById('signupName');
    if (signupName) {
        signupName.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('signupPassword').focus();
            }
        });
    }

    const signupPassword = document.getElementById('signupPassword');
    if (signupPassword) {
        signupPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('signupConfirmPassword').focus();
            }
        });
    }

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
    document.getElementById('websiteIdeaBtn').addEventListener('click', () => {
        closeSideMenu();
        showWebsiteIdeaModal();
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
    document.getElementById('chatInput').addEventListener('input', function() {
        startTyping();
    });
    document.getElementById('chatInput').addEventListener('focus', function() {
        updateUserOnlineStatus(currentUser.id, true);
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

    // Add event listener for send offer message buttons
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('message-btn') && e.target.textContent.includes('ارسال رساله📩')) {
            try {
                // Extract offer data from the clicked button's parent offer card
                const offerCard = e.target.closest('.offer-card');
                if (!offerCard) {
                    console.error('❌ لم يتم العثور على بطاقة العرض');
                    showNotification('خطأ في العثور على بيانات العرض', 'error');
                    return;
                }

                // البحث عن اسم المستخدم والمعرف من البيانات المخزنة في الزر
                const offerUserId = e.target.getAttribute('data-offer-user-id');
                const offerUserName = e.target.getAttribute('data-offer-user');
                const offerId = e.target.getAttribute('data-offer-id');

                if (offerUserId && offerUserName) {
                    // استخدام البيانات المخزنة في الزر مباشرة
                    showSendOfferMessageModal(offerId, offerUserName, parseInt(offerUserId));
                } else {
                    // البحث بالطريقة التقليدية كاحتياطي
                    const offerUserNameElement = offerCard.querySelector('.offer-username');
                    const offerGameElement = offerCard.querySelector('.offer-detail:nth-child(1)');
                    
                    if (!offerUserNameElement || !offerGameElement) {
                        console.error('❌ لم يتم العثور على عناصر بيانات العرض');
                        showNotification('خطأ في قراءة بيانات العرض', 'error');
                        return;
                    }

                    const offerUserNameText = offerUserNameElement.textContent.replace(' 👑', '');
                    const offerGameText = offerGameElement.textContent.split(':')[1];
                    
                    if (!offerGameText) {
                        console.error('❌ لم يتم العثور على اسم اللعبة');
                        showNotification('خطأ في قراءة اسم اللعبة', 'error');
                        return;
                    }

                    const gameText = offerGameText.trim();

                    // Find the offer in the offers array to get the user ID
                    const offer = offers.find(o => o.userName === offerUserNameText && o.game === gameText);
                    if (offer) {
                        showSendOfferMessageModal(offer.id, offer.userName, offer.userId);
                    } else {
                        console.error('❌ لم يتم العثور على العرض في المصفوفة');
                        // إنشاء مودال مبسط للإرسال
                        showQuickMessageModal(offerUserNameText, null);
                    }
                }
            } catch (error) {
                console.error('❌ خطأ في معالجة النقر على زر الرسالة:', error);
                showNotification('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
            }
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
        } else if (e.key === 'instantMessageUpdate' && e.newValue) {
            try {
                const update = JSON.parse(e.newValue);
                if (update && update.type === 'newMessage') {
                    // تحديث المحادثات فوراً
                    loadConversationsFromStorage();

                    // إذا كانت المحادثة مفتوحة، حدثها
                    if (currentChatPartner && document.getElementById('chatModal').classList.contains('active')) {
                        loadChatMessages();
                    }

                    // إذا كانت قائمة المحادثات مفتوحة، حدثها
                    if (document.getElementById('messagesModal').classList.contains('active')) {
                        loadMessagesList();
                    }

                    console.log('⚡ تم التحديث الفوري للرسائل');
                }
            } catch (error) {
                console.error('خطأ في التحديث الفوري:', error);
            }
        }
    });

    // فحص دوري للرسائل الجديدة مع التحديث الفوري
    setInterval(async () => {
        if (currentUser) {
            await loadConversationsFromServer(); // تحديث المحادثات من الخادم
            checkForNewMessages();

            // إذا كانت هناك محادثة مفتوحة، حدثها
            if (currentChatPartner && document.getElementById('chatModal').classList.contains('active')) {
                loadChatMessages();
            }

            // إذا كانت قائمة المحادثات مفتوحة، حدثها
            if (document.getElementById('messagesModal').classList.contains('active')) {
                loadMessagesList();
            }
        }
    }, 1000); // كل ثانية للتحديث السريع

    // Profile avatar tabs
    document.getElementById('defaultAvatarsTab').addEventListener('click', () => {
        document.getElementById('defaultAvatarsTab').classList.add('active');
        document.getElementById('customAvatarTab').classList.remove('active');
        document.getElementById('defaultAvatarsContainer').classList.remove('hidden');
        document.getElementById('customAvatarContainer').classList.add('hidden');
    });

    document.getElementById('customAvatarTab').addEventListener('click', () => {
        document.getElementById('customAvatarTab').classList.add('active');
        document.getElementById('defaultAvatarsTab').classList.remove('active');
        document.getElementById('customAvatarContainer').classList.remove('hidden');
        document.getElementById('defaultAvatarsContainer').classList.add('hidden');
    });

    // Custom avatar upload
    document.getElementById('customAvatarInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('customAvatarPreview');
                preview.innerHTML = `<img src="${e.target.result}" alt="صورة مخصصة" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #00bfff; box-shadow: 0 0 15px rgba(0, 191, 255, 0.5);">`;
                preview.classList.remove('hidden');

                // إزالة التحديد من الصور الافتراضية
                document.querySelectorAll('.avatar-option').forEach(avatar => {
                    avatar.classList.remove('selected');
                });

                selectedAvatar = e.target.result; // Set custom image as selected avatar
                console.log('📸 تم اختيار صورة مخصصة');
            };
            reader.readAsDataURL(file);
        }
    });

    // Support message button
    document.getElementById('supportMessageBtn').addEventListener('click', () => {
        closeSideMenu();
        closeModal('supportModal');
        // Contact admin (you can customize this)
        startChat('سيف (الدعم الفني)', 1752208985206); // Admin user ID
    });

    // Admin controls event listeners
    if (currentUser && currentUser.email === 'seifelpa2020@gmail.com') {
        const adminControls = document.getElementById('adminControls');
        const userRank = document.getElementById('userRank');

        if (adminControls) {
            adminControls.classList.remove('hidden');
        }

        if (userRank) {
            userRank.textContent = 'Admin';
            userRank.style.color = '#ffd700';
        }

        // VEX management
        document.getElementById('adminVexBtn').addEventListener('click', () => {
            document.getElementById('adminVexModal').classList.add('active');
        });

        document.getElementById('giveVexBtn').addEventListener('click', async () => {
            const userId = document.getElementById('vexUserId').value.trim();
            const amount = parseInt(document.getElementById('vexAmount').value);

            if (!userId || !amount || amount < 1) {
                showNotification('من فضلك أدخل آيدي صحيح ومقدار VEX صالح', 'error');
                return;
            }

            // Find user by ID
            const targetUser = registeredMembers.find(user => user.id.toString() === userId);
            if (!targetUser) {
                showNotification('لم يتم العثور على مستخدم بهذا الآيدي', 'error');
                return;
            }

            // Give VEX
            try {
                const currentVex = parseInt(localStorage.getItem(`vex_${targetUser.id}`) || '0');
                const newVex = currentVex + amount;
                localStorage.setItem(`vex_${targetUser.id}`, newVex.toString());

                showNotification(`تم إضافة ${amount} VEX إلى حساب ${targetUser.name} (ID: ${targetUser.id}) بنجاح ✅`);

                // Clear form
                document.getElementById('vexUserId').value = '';
                document.getElementById('vexAmount').value = '';
                document.getElementById('adminVexModal').classList.remove('active');

            } catch (error) {
                showNotification('حدث خطأ في إضافة VEX', 'error');
            }
        });

        // Ban management
        document.getElementById('adminBanBtn').addEventListener('click', () => {
            document.getElementById('adminBanModal').classList.add('active');
        });

        document.getElementById('banUserBtn').addEventListener('click', async () => {
            const userId = document.getElementById('banUserId').value.trim();
            const duration = parseInt(document.getElementById('banDuration').value);

            if (!userId || !duration || duration < 1) {
                showNotification('من فضلك أدخل آيدي المستخدم ومدة الطرد', 'error');
                return;
            }

            // Find user by ID
            const targetUser = registeredMembers.find(user => user.id.toString() === userId);
            if (!targetUser) {
                showNotification('لم يتم العثور على مستخدم بهذا الآيدي', 'error');
                return;
            }

            // Ban user
            try {
                const banEndTime = new Date(Date.now() + duration * 60 * 60 * 1000); // hours to milliseconds
                localStorage.setItem(`ban_${targetUser.id}`, banEndTime.toISOString());

                showNotification(`تم طرد ${targetUser.name} (ID: ${targetUser.id}) لمدة ${duration} ساعة ✅`);

                // Clear form
                document.getElementById('banUserId').value = '';
                document.getElementById('banDuration').value = '';
                document.getElementById('adminBanModal').classList.remove('active');

            } catch (error) {
                showNotification('حدث خطأ في طرد المستخدم', 'error');
            }
        });

        // Delete offer buttons for admin
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('admin-delete-btn')) {
                const offerId = parseInt(e.target.dataset.offerId);
                if (confirm('هل أنت متأكد من حذف هذا العرض؟')) {
                    deleteOffer(offerId);
                }
            }
        });
    }
}

// Auth functionality
async function handleLogin() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');

    if (!emailInput || !passwordInput) {
        showNotification('خطأ في النظام: لم يتم العثور على حقول الدخول', 'error');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // التحقق من وجود البيانات
    if (!email || !password) {
        showNotification('من فضلك املأ جميع الحقول', 'error');
        return;
    }

    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('من فضلك أدخل بريد إلكتروني صحيح', 'error');
        return;
    }

    // التحقق من طول كلمة المرور
    if (password.length < 6) {
        showNotification('كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل', 'error');
        return;
    }

    showLoading(true);

    try {
        // محاولة تسجيل الدخول مع الخادم أولاً
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success) {
                    currentUser = {
                        id: result.user.id,
                        name: result.user.name,
                        email: result.user.email,
                        avatar: result.user.avatar
                    };
                    localStorage.setItem('gamesShopUser', JSON.stringify(currentUser));
                    loadUserVexBalance();
                    await showMainPage();
                    showNotification('تم تسجيل الدخول بنجاح! 🎉');
                    return;
                } else {
                    showNotification(result.error || 'بيانات تسجيل الدخول غير صحيحة', 'error');
                    return;
                }
            }
        } catch (serverError) {
            console.log('Server login failed, trying local authentication:', serverError);
        }

        // في حالة فشل الخادم، استخدم التسجيل المحلي
        const savedUsers = JSON.parse(localStorage.getItem('gamesShopUsers') || '[]');

        // البحث عن المستخدم بالبريد الإلكتروني أولاً
        const userByEmail = savedUsers.find(u => u.email === email);

        if (!userByEmail) {
            showNotification('البريد الإلكتروني غير مسجل، يرجى إنشاء حساب جديد', 'error');
            return;
        }

        // التحقق من كلمة المرور
        if (userByEmail.password !== password) {
            showNotification('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى', 'error');
            return;
        }

        // تسجيل الدخول بنجاح
        currentUser = {
            id: userByEmail.id,
            name: userByEmail.name,
            email: userByEmail.email,
            avatar: userByEmail.avatar || 1
        };

        localStorage.setItem('gamesShopUser', JSON.stringify(currentUser));
        loadUserVexBalance();
        await showMainPage();
        showNotification('تم تسجيل الدخول بنجاح! 🎉');

    } catch (error) {
        console.error('Login error:', error);
        showNotification('حدث خطأ في تسجيل الدخول، يرجى المحاولة مرة أخرى', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleSignup() {
    const emailInput = document.getElementById('signupEmail');
    const nameInput = document.getElementById('signupName');
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('signupConfirmPassword');

    if (!emailInput || !nameInput || !passwordInput || !confirmPasswordInput) {
        showNotification('خطأ في النظام: لم يتم العثور على حقول التسجيل', 'error');
        return;
    }

    const email = emailInput.value.trim();
    const name = nameInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

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

    if (name.length < 2) {
        showNotification('الاسم يجب أن يحتوي على حرفين على الأقل', 'error');
        return;
    }

    showLoading(true);

    try {
        // محاولة التسجيل مع الخادم أولاً
        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, name, password })
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success) {
                    currentUser = {
                        id: result.user.id,
                        name: result.user.name,
                        email: result.user.email,
                        avatar: result.user.avatar
                    };
                    localStorage.setItem('gamesShopUser', JSON.stringify(currentUser));
                    
                    // تسجيل المستخدم في المصفوفة المحلية
                    const savedUsers = JSON.parse(localStorage.getItem('gamesShopUsers') || '[]');
                    if (!savedUsers.find(u => u.email === email)) {
                        savedUsers.push({
                            id: result.user.id,
                            name: result.user.name,
                            email: email,
                            password: password,
                            avatar: result.user.avatar,
                            createdAt: new Date().toISOString()
                        });
                        localStorage.setItem('gamesShopUsers', JSON.stringify(savedUsers));
                    }
                    
                    loadUserVexBalance();
                    await showMainPage();
                    showNotification('تم إنشاء الحساب بنجاح! 🎉');
                    return;
                } else {
                    showNotification(result.error, 'error');
                    return;
                }
            }
        } catch (serverError) {
            console.log('Server registration failed, trying local registration:', serverError);
        }

        // في حالة فشل الخادم، استخدم التسجيل المحلي
        const savedUsers = JSON.parse(localStorage.getItem('gamesShopUsers') || '[]');

        // تحقق من وجود المستخدم
        if (savedUsers.find(u => u.email === email)) {
            showNotification('البريد الإلكتروني مستخدم بالفعل', 'error');
            return;
        }

        // إنشاء مستخدم جديد مع معرف 10 أرقام
        const newUserId = email === 'seifelpa2020@gmail.com' ? 1020304050 : generateUserId();
        const newUser = {
            id: newUserId,
            name: name,
            email: email,
            password: password,
            avatar: Math.floor(Math.random() * 6) + 1,
            createdAt: new Date().toISOString()
        };

        savedUsers.push(newUser);
        localStorage.setItem('gamesShopUsers', JSON.stringify(savedUsers));

        currentUser = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            avatar: newUser.avatar
        };
        localStorage.setItem('gamesShopUser', JSON.stringify(currentUser));
        loadUserVexBalance();
        await showMainPage();
        showNotification('تم إنشاء الحساب بنجاح! 🎉');

    } catch (error) {
        console.error('Registration error:', error);
        showNotification('خطأ في إنشاء الحساب', 'error');
    } finally {
        showLoading(false);
    }
}

function showSignupForm() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loading = document.getElementById('authLoading');

    loading.classList.add('hidden');
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');

    // Clear any error messages or input values
    clearFormInputs();
}

function showLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loading = document.getElementById('authLoading');

    loading.classList.add('hidden');
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');

    // Clear any error messages or input values
    clearFormInputs();
}

function clearFormInputs() {
    // Clear login form
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';

    // Clear signup form
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupName').value = '';
    document.getElementById('signupPassword').value = '';
    document.getElementById('signupConfirmPassword').value = '';
}

function showLoading(show) {
    const loading = document.getElementById('authLoading');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (show) {
        loginForm.classList.add('hidden');
        signupForm.classList.add('hidden');
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
        // Show appropriate form based on which was visible before loading
        // Check which form should be shown based on the current state
        const wasSignupVisible = !signupForm.classList.contains('hidden') || 
                                (loginForm.classList.contains('hidden') && signupForm.classList.contains('hidden'));

        if (wasSignupVisible) {
            signupForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        } else {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        }
    }
}

function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('mainPage').classList.remove('active');
}

async function showMainPage() {
    // التأكد من وجود المستخدم
    if (!currentUser) {
        console.error('❌ لا يوجد مستخدم مسجل دخول');
        showLoginPage();
        return;
    }

    // إخفاء صفحة تسجيل الدخول وعرض الصفحة الرئيسية
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('mainPage').classList.add('active');

    // Update user info
    document.getElementById('userName').textContent = currentUser.name;

    // عرض الصورة الصحيحة (مخصصة أو افتراضية)
    if (currentUser.avatar === 'custom' && currentUser.customAvatar) {
        document.getElementById('userAvatar').src = currentUser.customAvatar;
    } else {
        document.getElementById('userAvatar').src = `https://i.pravatar.cc/150?img=${currentUser.avatar}`;
    }

    // عرض الآيدي تحت الاسم
    const userIdElement = document.getElementById('userId');
    if (userIdElement) {
        userIdElement.textContent = `ID: ${currentUser.id}`;
    }

    // تحديث رصيد Vex
    if (typeof loadUserVexBalance === 'function') {
        loadUserVexBalance();
    } else {
        updateVexDisplay();
    }

    // تحديد صلاحيات المستخدم التلقائية
    setUserPermissions();

    // Register member
    registerMember();

    // Load all data from storage and server
    try {
        await loadOffersFromGlobalStorage();
        await loadConversationsFromServer(); // تحميل من الخادم أولاً
        loadConversationsFromStorage(); // ثم من التخزين المحلي
        loadUserSettingsFromStorage();
        loadMembersFromStorage();
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
    }

    // Check for new messages immediately and periodically
    checkForNewMessages();
    
    // إعداد فحص دوري للرسائل الجديدة (إذا لم يكن موجود بالفعل)
    if (!window.messageCheckInterval) {
        window.messageCheckInterval = setInterval(() => {
            if (currentUser) {
                checkForNewMessages();
                if (typeof loadConversationsFromServer === 'function') {
                    loadConversationsFromServer(); // تحديث المحادثات من الخادم
                }
            }
        }, 3000); // فحص كل 3 ثوان
    }

    console.log('✅ تم تحميل الصفحة الرئيسية بنجاح للمستخدم:', currentUser.name);
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

    // إضافة أزرار الأدمن إذا كان المستخدم أدمن
    if (currentUser && currentUser.role === 'admin') {
        addAdminDeleteButtons();
    }

    console.log('تم عرض العروض العالمية:', sortedOffers.length);
}

function createOfferCard(offer) {
    const card = document.createElement('div');
    card.className = `offer-card ${offer.isVIP ? 'vip-offer' : ''}`;

    const isOwner = offer.userId === currentUser.id;
    const hasLiked = offer.likedBy && offer.likedBy.includes(currentUser.id);
    const isAdmin = currentUser && isOwnerAdmin(currentUser.id);

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
                <button class="action-btn message-btn" 
                        data-offer-id="${offer.id}" 
                        data-offer-user="${offer.userName}" 
                        data-offer-user-id="${offer.userId}"
                        data-offer-game="${offer.game}"
                        title="إرسال رسالة لصاحب العرض">
                    ارسال رساله📩
                </button>
                <button class="action-btn like-btn ${hasLiked ? 'liked' : ''}" onclick="toggleLike(${offer.id})">${hasLiked ? 'الغاء اعجاب💔' : 'لايك👍'}
                </button>
                ${isOwner ? `<button class="action-btn delete-btn" onclick="deleteOffer(${offer.id})">حــــذف🗑️</button>` : ''}
                ${isAdmin && !isOwner ? `<button class="action-btn admin-delete-btn" onclick="adminDeleteOffer(${offer.id})">حذف إداري⚡</button>` : ''}
            </div>
        </div>
    `;

    return card;
}

// وظيفة الحذف الإداري
function adminDeleteOffer(offerId) {
    if (confirm('هل أنت متأكد من حذف هذا العرض كأدمن؟')) {
        deleteOffer(offerId);
        showNotification('تم حذف العرض بصلاحيات الأدمن ⚡', 'success');
    }
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

// دالة مزامنة المحادثات مع الخادم
async function syncConversationsWithServer() {
    if (!currentUser) return;

    try {
        // تحديث المحادثات من الخادم
        await loadConversationsFromServer();

        // إرسال المحادثات المحلية للخادم
        const localConversations = JSON.parse(localStorage.getItem('gamesShopConversations') || '{}');

        for (const chatId in localConversations) {
            if (chatId.includes(currentUser.id.toString())) {
                const messages = localConversations[chatId];
                for (const message of messages) {
                    if (message.senderId === currentUser.id) {
                        await saveConversationToServer(chatId, message);
                    }
                }
            }
        }

        console.log('🔄 تم مزامنة المحادثات مع الخادم');
    } catch (error) {
        console.error('خطأ في مزامنة المحادثات:', error);
    }
}

// دالة تحديث الرسائل الفورية للطرفين
async function syncMessagesForBothUsers(chatId, message) {
    try {
        // حفظ الرسالة في الخادم
        await saveConversationToServer(chatId, message);

        // إرسال إشعار فوري للطرف الآخر
        const userIds = chatId.split('-').map(id => parseInt(id));
        const otherUserId = userIds.find(id => id !== currentUser.id);

        if (otherUserId) {
            await notifyNewMessage(otherUserId);

            // تحديث فوري للمحادثات
            await loadConversationsFromServer();

            // إرسال إشعار عبر localStorage للتحديث الفوري
            const instantUpdate = {
                type: 'newMessage',
                chatId: chatId,
                message: message,
                timestamp: new Date().toISOString()
            };

            localStorage.setItem('instantMessageUpdate', JSON.stringify(instantUpdate));

            // إزالة الإشعار بعد ثانية
            setTimeout(() => {
                localStorage.removeItem('instantMessageUpdate');
            }, 1000);
        }

        console.log('📨 تم مزامنة الرسالة للطرفين');
    } catch (error) {
        console.error('خطأ في مزامنة الرسالة:', error);
    }
}

// تحديث تلقائي للعروض كل 30 ثانية
setInterval(async () => {
    if (currentUser) {
        await loadOffersFromGlobalStorage();
        console.log('🔄 تم تحديث العروض تلقائياً');
    }
}, 30000);

// Send Offer Message System
function showSendOfferMessageModal(offerId, offerOwnerName, offerOwnerId) {
    // التحقق من وجود المودال
    const modal = document.getElementById('sendOfferMessageModal');
    if (!modal) {
        console.error('❌ لم يتم العثور على مودال إرسال الرسالة');
        // إنشاء مودال مؤقت للإرسال المباشر
        showQuickMessageModal(offerOwnerName, offerOwnerId);
        return;
    }

    // حفظ معلومات العرض المحدد
    window.selectedOffer = {
        id: offerId,
        ownerName: offerOwnerName,
        ownerId: offerOwnerId
    };

    // إعادة تعيين النموذج
    resetSendOfferMessageForm();

    // عرض المودال
    modal.classList.add('active');

    console.log('📩 تم فتح نافذة إرسال رسالة العرض لـ:', offerOwnerName);
}

function showQuickMessageModal(offerOwnerName, offerOwnerId) {
    // إنشاء مودال مبسط للإرسال المباشر
    const quickModal = document.createElement('div');
    quickModal.className = 'modal active';
    quickModal.id = 'quickMessageModal';
    
    quickModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>إرسال رسالة إلى ${offerOwnerName}</h3>
                <button class="close-modal" onclick="closeQuickMessageModal()">×</button>
            </div>
            <div class="modal-body">
                <textarea id="quickMessageText" placeholder="اكتب رسالتك هنا..." style="width: 100%; height: 100px; padding: 10px; border: 2px solid #00bfff; border-radius: 8px; background: rgba(255,255,255,0.1); color: white; resize: vertical;"></textarea>
                <div style="margin-top: 1rem; text-align: center;">
                    <button onclick="sendQuickMessage('${offerOwnerName}', ${offerOwnerId})" class="action-btn" style="background: linear-gradient(45deg, #00ff80, #00cc66); padding: 0.8rem 2rem;">إرسال الرسالة 📩</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(quickModal);
}

function closeQuickMessageModal() {
    const modal = document.getElementById('quickMessageModal');
    if (modal) {
        modal.remove();
    }
}

function sendQuickMessage(offerOwnerName, offerOwnerId) {
    const messageText = document.getElementById('quickMessageText');
    if (!messageText || !messageText.value.trim()) {
        showNotification('يرجى كتابة رسالة', 'error');
        return;
    }
    
    // بدء المحادثة مباشرة
    startChat(offerOwnerName, offerOwnerId);
    
    // إغلاق المودال
    closeQuickMessageModal();
    
    // إضافة النص إلى حقل الإدخال في المحادثة
    setTimeout(() => {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = messageText.value.trim();
            chatInput.focus();
        }
    }, 500);
}

function resetSendOfferMessageForm() {
    // التحقق من وجود العناصر قبل التعديل عليها
    const elements = {
        offerDescription: document.getElementById('offerDescription'),
        offerExchangeOptions: document.getElementById('offerExchangeOptions'),
        additionalThingsInput: document.getElementById('additionalThingsInput'),
        contactDetailsInput: document.getElementById('contactDetailsInput'),
        sendOfferImage: document.getElementById('sendOfferImage'),
        sendOfferImagePreview: document.getElementById('sendOfferImagePreview')
    };

    // إعادة تعيين الحقول الموجودة فقط
    if (elements.offerDescription) elements.offerDescription.value = '';
    if (elements.offerExchangeOptions) elements.offerExchangeOptions.classList.add('hidden');
    if (elements.additionalThingsInput) elements.additionalThingsInput.classList.add('hidden');
    if (elements.contactDetailsInput) elements.contactDetailsInput.classList.add('hidden');
    if (elements.sendOfferImage) elements.sendOfferImage.value = '';
    
    if (elements.sendOfferImagePreview) {
        elements.sendOfferImagePreview.innerHTML = '';
        elements.sendOfferImagePreview.classList.add('hidden');
    }

    // إزالة التحديد من الأزرار إذا كانت موجودة
    const exchangeButtons = document.querySelectorAll('.exchange-option-btn');
    if (exchangeButtons.length > 0) {
        exchangeButtons.forEach(btn => {
            if (btn.classList) {
                btn.classList.remove('selected');
            }
        });
    }
}

function selectExchangeOption(option) {
    // إزالة التحديد من جميع الأزرار
    document.querySelectorAll('.exchange-option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // العثور على الزر المضغوط وتحديده
    const targetBtn = document.querySelector(`[data-option="${option}"]`);
    if (targetBtn) {
        targetBtn.classList.add('selected');
    }

    // إخفاء جميع الحقول الإضافية
    document.getElementById('additionalThingsInput').classList.add('hidden');
    document.getElementById('contactDetailsInput').classList.add('hidden');

    // عرض الحقل المناسب حسب الاختيار
    if (option === 'offer_plus') {
        document.getElementById('additionalThingsInput').classList.remove('hidden');
        console.log('🔄 تم تفعيل خيار العرض + أشياء إضافية');
    } else if (option === 'negotiate') {
        document.getElementById('contactDetailsInput').classList.remove('hidden');
        console.log('🔄 تم تفعيل خيار التفاوض');
    }

    console.log('✅ تم اختيار نوع المقابل:', option);
}

function previewSendOfferImage() {
    const fileInput = document.getElementById('sendOfferImage');
    const preview = document.getElementById('sendOfferImagePreview');

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        preview.innerHTML = '';
        preview.classList.add('hidden');
    }
}

async function sendOfferMessage() {
    if (!window.selectedOffer) {
        showNotification('خطأ: لم يتم تحديد العرض المراد الرد عليه', 'error');
        return;
    }

    const offerDescription = document.getElementById('offerDescription').value.trim();
    const selectedOption = document.querySelector('.exchange-option-btn.selected');

    // التحقق من الحقول المطلوبة
    if (!offerDescription) {
        showNotification('يرجى كتابة عرضك', 'error');
        return;
    }

    if (!selectedOption) {
        showNotification('يرجى اختيار نوع المقابل', 'error');
        return;
    }

    const exchangeType = selectedOption.dataset.option;
    let exchangeDetails = '';
    let contactInfo = '';

    if (exchangeType === 'offer_plus') {
        const additionalThings = document.getElementById('additionalThings').value.trim();
        if (!additionalThings) {
            showNotification('يرجى كتابة الأشياء الإضافية المطلوبة', 'error');
            return;
        }
        exchangeDetails = additionalThings;
    } else if (exchangeType === 'negotiate') {
        contactInfo = document.getElementById('contactDetails').value.trim();
        if (!contactInfo) {
            showNotification('يرجى وضع معلومات التواصل (ديسكورد/واتساب/انستجرام/فيسبوك)', 'error');
            return;
        }
    }

    // معلومات الصورة إن وجدت
    const imageFile = document.getElementById('sendOfferImage').files[0];
    let imageData = null;

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imageData = e.target.result;
            sendOfferMessageData();
        };
        reader.readAsDataURL(imageFile);
    } else {
        sendOfferMessageData();
    }

    function sendOfferMessageData() {
        const exchangeTypeText = {
            'offer_only': 'عرضك فقط📋',
            'offer_plus': 'عرضك و المزيد من الأشياء📃',
            'negotiate': 'نتفق على شيء💬'
        };

        const offerMessage = {
            type: 'offer_message',
            id: Date.now() + Math.random(),
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            recipientId: window.selectedOffer.ownerId,
            recipientName: window.selectedOffer.ownerName,
            offerId: window.selectedOffer.id,
            offerDescription: offerDescription,
            exchangeType: exchangeType,
            exchangeTypeText: exchangeTypeText[exchangeType],
            exchangeDetails: exchangeDetails,
            contactInfo: contactInfo,
            image: imageData,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        // حفظ الرسالة في التخزين المحلي
        const offerMessages = JSON.parse(localStorage.getItem('offerMessages') || '[]');
        offerMessages.push(offerMessage);
        localStorage.setItem('offerMessages', JSON.stringify(offerMessages));

        // إرسال الرسالة كرسالة عادية أيضاً
        const chatId = getChatId(currentUser.id, window.selectedOffer.ownerId);
        if (!conversations[chatId]) {
            conversations[chatId] = [];
        }

        const chatMessage = {
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            text: `📩 رسالة عرض جديدة:\n\n${offerDescription}\n\nالمقابل: ${exchangeTypeText[exchangeType]}${exchangeDetails ? '\nالأشياء الإضافية: ' + exchangeDetails : ''}${contactInfo ? '\nمعلومات التواصل: ' + contactInfo : ''}`,
            timestamp: new Date().toISOString(),
            type: 'offer_message',
            offerMessageId: offerMessage.id
        };

        conversations[chatId].push(chatMessage);
        saveConversationsToStorage();

        // حفظ في الخادم
        saveConversationToServer(chatId, chatMessage);
        notifyNewMessage(window.selectedOffer.ownerId);

        // إغلاق المودال وإظهار رسالة نجاح
        document.getElementById('sendOfferMessageModal').classList.remove('active');
        showNotification('تم إرسال الرسالة بنجاح! 📩');

        console.log('✅ تم إرسال رسالة العرض:', offerMessage);
    }
}

function loadOfferMessages() {
    const offerMessages = JSON.parse(localStorage.getItem('offerMessages') || '[]');
    const userMessages = offerMessages.filter(msg => 
        msg.recipientId === currentUser.id && msg.status === 'pending'
    );

    const container = document.getElementById('offerMessagesList');
    container.innerHTML = '';

    if (userMessages.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #00bfff; padding: 2rem;">لا توجد رسائل عروض جديدة</div>';
        return;
    }

    userMessages.forEach(message => {
        const messageItem = document.createElement('div');
        messageItem.className = 'offer-message-item';
        messageItem.innerHTML = `
            <div class="offer-message-header">
                <img src="https://i.pravatar.cc/150?img=${message.senderAvatar}" alt="${message.senderName}" class="offer-message-avatar">
                <div class="offer-message-info">
                    <div class="offer-message-sender">${message.senderName}</div>
                    <div class="offer-message-time">${new Date(message.timestamp).toLocaleString('ar-EG')}</div>
                </div>
            </div>
            <div class="offer-message-content">
                <div class="offer-message-description"><strong>العرض:</strong> ${message.offerDescription}</div>
                <div class="offer-message-exchange"><strong>المقابل:</strong> ${message.exchangeTypeText}</div>
                ${message.exchangeDetails ? `<div class="offer-message-details"><strong>الأشياء الإضافية:</strong> ${message.exchangeDetails}</div>` : ''}
                ${message.contactInfo ? `<div class="offer-message-contact"><strong>معلومات التواصل:</strong> ${message.contactInfo}</div>` : ''}
                ${message.image ? `<img src="${message.image}" alt="صورة العرض" class="offer-message-image" onclick="showImageModal('${message.image}')">` : ''}
            </div>
            <div class="offer-message-actions">
                <button class="offer-message-btn reject-btn" onclick="rejectOfferMessage('${message.id}')">رفض🚫</button>
                <button class="offer-message-btn accept-btn" onclick="showAcceptOfferModal('${message.id}')">قبول✅</button>
            </div>
        `;
        container.appendChild(messageItem);
    });
}

function rejectOfferMessage(messageId) {
    if (!confirm('هل أنت متأكد من رفض هذا العرض؟')) {
        return;
    }

    const offerMessages = JSON.parse(localStorage.getItem('offerMessages') || '[]');
    const messageIndex = offerMessages.findIndex(msg => msg.id == messageId);

    if (messageIndex !== -1) {
        const message = offerMessages[messageIndex];

        // تحديث حالة الرسالة
        offerMessages[messageIndex].status = 'rejected';
        localStorage.setItem('offerMessages', JSON.stringify(offerMessages));

        // إرسال رسالة رفض للمرسل
        const chatId = getChatId(currentUser.id, message.senderId);
        if (!conversations[chatId]) {
            conversations[chatId] = [];
        }

        const rejectMessage = {
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            text: `❌ تم رفض عرضك: "${message.offerDescription}"`,
            timestamp: new Date().toISOString(),
            type: 'rejection'
        };

        conversations[chatId].push(rejectMessage);
        saveConversationsToStorage();
        saveConversationToServer(chatId, rejectMessage);
        notifyNewMessage(message.senderId);

        showNotification('تم رفض العرض وإرسال إشعار للمرسل');
        loadOfferMessages();
    }
}

function showAcceptOfferModal(messageId) {
    window.currentAcceptMessageId = messageId;
    document.getElementById('acceptContactInfo').value = '';
    document.getElementById('acceptOfferModal').classList.add('active');
}

function acceptOfferMessage() {
    const contactInfo = document.getElementById('acceptContactInfo').value.trim();

    if (!contactInfo) {
        showNotification('يرجى وضع معلومات التواصل (حساب أو رقم هاتف)', 'error');
        return;
    }

    const offerMessages = JSON.parse(localStorage.getItem('offerMessages') || '[]');
    const messageIndex = offerMessages.findIndex(msg => msg.id == window.currentAcceptMessageId);

    if (messageIndex !== -1) {
        const message = offerMessages[messageIndex];

        // تحديث حالة الرسالة
        offerMessages[messageIndex].status = 'accepted';
        localStorage.setItem('offerMessages', JSON.stringify(offerMessages));

        // إرسال رسالة قبول للمرسل
        const chatId = getChatId(currentUser.id, message.senderId);
        if (!conversations[chatId]) {
            conversations[chatId] = [];
        }

        const acceptMessage = {
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            text: `✅ تم قبول عرضك: "${message.offerDescription}"\n\nمعلومات التواصل: ${contactInfo}`,
            timestamp: new Date().toISOString(),
            type: 'acceptance'
        };

        conversations[chatId].push(acceptMessage);
        saveConversationsToStorage();
        saveConversationToServer(chatId, acceptMessage);
        notifyNewMessage(message.senderId);

        document.getElementById('acceptOfferModal').classList.remove('active');
        showNotification('تم قبول العرض وإرسال معلومات التواصل للمرسل');
        loadOfferMessages();
    }
}

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

    // تحديث عنوان المحادثة مع حالة المستخدم
    updateChatTitle();

    document.getElementById('chatModal').classList.add('active');

    // تحديث المحادثات وعرض الرسائل فوراً
    loadConversationsFromStorage();
    loadChatMessages();

    // تحديث حالة المستخدم كمتصل
    updateUserOnlineStatus(currentUser.id, true);

    console.log(`💬 بدء محادثة مع ${partnerName} (ID: ${partnerId})`);

    // تحديث فوري من الخادم
    loadConversationsFromServer().then(() => {
        loadChatMessages();
        // تحديث قائمة المحادثات إذا كانت مفتوحة
        if (document.getElementById('messagesModal').classList.contains('active')) {
            loadMessagesList();
        }
    });

    // إعداد تحديث دوري سريع للمحادثة المفتوحة
    if (window.chatUpdateInterval) {
        clearInterval(window.chatUpdateInterval);
    }

    window.chatUpdateInterval = setInterval(async () => {
        if (currentChatPartner && document.getElementById('chatModal').classList.contains('active')) {
            await loadConversationsFromServer();
            loadChatMessages();
        } else {
            clearInterval(window.chatUpdateInterval);
        }
    }, 1000); // تحديث كل ثانية للمحادثة المفتوحة

}

function updateChatTitle() {
    if (!currentChatPartner) return;

    const isOnline = userOnlineStatus[currentChatPartner.id] || false;
    const isTyping = typingUsers[currentChatPartner.id] || false;

    let statusText = '';
    if (isTyping) {
        statusText = ' (Typing...)';
    } else if (isOnline) {
        statusText = ' (متصل الآن)';
    } else {
        statusText = ' (غير متصل)';
    }

    document.getElementById('chatTitle').textContent = `مراسلة ${currentChatPartner.name}${statusText}`;
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

        // إنشاء حاوي للرسالة
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `message-wrapper ${isSent ? 'sent-wrapper' : 'received-wrapper'}`;

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

        // إضافة اسم المرسل للرسائل الواردة
        const senderName = isSent ? '' : `<div class="sender-name">${message.senderName || currentChatPartner.name}</div>`;

        messageDiv.innerHTML = `
            ${senderName}
            ${messageContent}
            ${messageTime ? `<small class="message-time">${messageTime}</small>` : ''}
        `;

        messageWrapper.appendChild(messageDiv);
        container.appendChild(messageWrapper);
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

    // إيقاف تتبع الكتابة
    stopTyping();

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

    // إضافة الرسالة محلياً أولاً
    conversations[chatId].push(message);
    saveConversationsToStorage();

    // عرض الرسالة فوراً للمرسل
    loadChatMessages();

    // مسح المدخل
    input.value = '';

    // إظهار إشعار الإرسال مع نور أبيض
    showMessageSentNotification();

    // حفظ في الخادم والإشعار
    try {
        const serverSaved = await saveConversationToServer(chatId, message);
        await notifyNewMessage(currentChatPartner.id);

        // إشعار نجاح
        console.log(`📩 تم إرسال رسالة إلى ${currentChatPartner.name}: "${text}"`);

        // تحديث فوري للمحادثات على الخادم
        setTimeout(async () => {
            await loadConversationsFromServer();
            if (document.getElementById('messagesModal').classList.contains('active')) {
                loadMessagesList();
            }
        }, 100);

        // تحديث إضافي للتأكد من وصول الرسالة
        setTimeout(async () => {
            await syncConversationsWithServer();
        }, 1000);

    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        showNotification('حدث خطأ في إرسال الرسالة', 'error');
    }
}

// إشعار إرسال الرسالة مع نور أبيض
function showMessageSentNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(45deg, #00bfff, #ffffff);
        color: #000;
        padding: 1rem 2rem;
        border-radius: 50px;
        font-size: 1.1rem;
        font-weight: bold;
        box-shadow: 0 0 30px rgba(255, 255, 255, 0.8), 0 0 60px rgba(0, 191, 255, 0.6);
        z-index: 10000;
        animation: messageGlow 0.6s ease;
        border: 2px solid rgba(255, 255, 255, 0.9);
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-paper-plane" style="color: #007bff;"></i>
            <span>تم الإرسال ✅</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 1500);
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

async function notifyNewMessage(recipientId) {
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

        // إشعار فوري في الخادم أيضاً
        try {
            await fetch(`${API_BASE_URL}/api/notify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(notification)
            });
        } catch (serverError) {
            console.log('⚠️ فشل إرسال الإشعار للخادم:', serverError);
        }

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

// تحديث حالة المستخدم (متصل/غير متصل)
function updateUserOnlineStatus(userId, isOnline) {
    userOnlineStatus[userId] = isOnline;
    localStorage.setItem('userOnlineStatus', JSON.stringify(userOnlineStatus));

    // تحديث عنوان المحادثة إذا كان المستخدم في محادثة
    if (currentChatPartner && currentChatPartner.id === userId) {
        updateChatTitle();
    }
}

// تتبع الكتابة
function startTyping() {
    if (!currentChatPartner) return;

    typingUsers[currentUser.id] = true;
    localStorage.setItem('typingUsers', JSON.stringify(typingUsers));

    // إيقاف تتبع الكتابة بعد 3 ثوانٍ
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }

    typingTimeout = setTimeout(() => {
        stopTyping();
    }, 3000);
}

function stopTyping() {
    if (!currentChatPartner) return;

    typingUsers[currentUser.id] = false;
    localStorage.setItem('typingUsers', JSON.stringify(typingUsers));

    if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
    }
}

// تحديث حالة الكتابة للمستخدم الآخر
function updateTypingStatus() {
    const savedTypingUsers = JSON.parse(localStorage.getItem('typingUsers') || '{}');

    Object.keys(savedTypingUsers).forEach(userId => {
        if (userId !== currentUser.id.toString()) {
            typingUsers[parseInt(userId)] = savedTypingUsers[userId];
        }
    });

    // تحديث عنوان المحادثة
    if (currentChatPartner) {
        updateChatTitle();
    }
}

// Messages modal
function showMessagesModal() {
    document.getElementById('messagesModal').classList.add('active');

    // عرض تبويب المحادثات افتراضياً
    showMessagesTab('conversations');

    loadMessagesList();
    loadOfferMessages();

    // تحديث المحادثات من الخادم عند فتح قائمة المراسلات
    loadConversationsFromServer().then(() => {
        loadMessagesList();
    });

    // إعداد تحديث دوري لقائمة المحادثات
    if (window.messagesUpdateInterval) {
        clearInterval(window.messagesUpdateInterval);
    }

    window.messagesUpdateInterval = setInterval(async () => {
        if (document.getElementById('messagesModal').classList.contains('active')) {
            await loadConversationsFromServer();
            loadMessagesList();
            loadOfferMessages();
        } else {
            clearInterval(window.messagesUpdateInterval);
        }
    }, 3000); // تحديث كل 3 ثوان لقائمة المحادثات
}

function showMessagesTab(tabName) {
    // إخفاء جميع التبويبات
    document.getElementById('messagesTabContent').classList.add('hidden');
    document.getElementById('offerMessagesTabContent').classList.add('hidden');

    // إزالة التحديد من جميع الأزرار
    document.getElementById('messagesTabBtn').classList.remove('active');
    document.getElementById('offerMessagesTabBtn').classList.remove('active');

    // عرض التبويب المحدد
    if (tabName === 'conversations') {
        document.getElementById('messagesTabContent').classList.remove('hidden');
        document.getElementById('messagesTabBtn').classList.add('active');
    } else if (tabName === 'offers') {
        document.getElementById('offerMessagesTabContent').classList.remove('hidden');
        document.getElementById('offerMessagesTabBtn').classList.add('active');
        loadOfferMessages();
    }
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

    // إعادة تعيين النموذج
    document.querySelectorAll('.avatar-option').forEach(avatar => {
        avatar.classList.remove('selected');
    });

    const customPreview = document.getElementById('customAvatarPreview');
    customPreview.classList.add('hidden');
    customPreview.innerHTML = '';

    // إذا كان المستخدم يستخدم صورة مخصصة
    if (currentUser.avatar === 'custom' && currentUser.customAvatar) {
        // تفعيل تبويب الصورة المخصصة
        document.getElementById('customAvatarTab').classList.add('active');
        document.getElementById('defaultAvatarsTab').classList.remove('active');
        document.getElementById('customAvatarContainer').classList.remove('hidden');
        document.getElementById('defaultAvatarsContainer').classList.add('hidden');

        // عرض الصورة المخصصة
        customPreview.innerHTML = `<img src="${currentUser.customAvatar}" alt="صورة مخصصة" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #00bfff; box-shadow: 0 0 15px rgba(0, 191, 255, 0.5);">`;
        customPreview.classList.remove('hidden');

        selectedAvatar = currentUser.customAvatar;
    } else {
        // تفعيل تبويب الصور الافتراضية
        document.getElementById('defaultAvatarsTab').classList.add('active');
        document.getElementById('customAvatarTab').classList.remove('active');
        document.getElementById('defaultAvatarsContainer').classList.remove('hidden');
        document.getElementById('customAvatarContainer').classList.add('hidden');

        // تحديد الصورة الافتراضية
        document.querySelectorAll('.avatar-option').forEach(avatar => {
            if (avatar.dataset.avatar == currentUser.avatar) {
                avatar.classList.add('selected');
            }
        });

        selectedAvatar = currentUser.avatar;
    }
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

    // إذا كانت الصورة مخصصة (string يحتوي على data:image)
    if (typeof selectedAvatar === 'string' && selectedAvatar.startsWith('data:image')) {
        currentUser.customAvatar = selectedAvatar;
        currentUser.avatar = 'custom';
    } else {
        // إذا كانت صورة افتراضية، احذف الصورة المخصصة
        delete currentUser.customAvatar;
    }

    localStorage.setItem('gamesShopUser', JSON.stringify(currentUser));

    // Update display
    document.getElementById('userName').textContent = currentUser.name;

    // عرض الصورة الصحيحة في البروفايل
    if (currentUser.avatar === 'custom' && currentUser.customAvatar) {
        document.getElementById('userAvatar').src = currentUser.customAvatar;
    } else {
        document.getElementById('userAvatar').src = `https://i.pravatar.cc/150?img=${currentUser.avatar}`;
    }

    updateVexDisplay();

    closeModal('editProfileModal');
    showNotification('تم حفظ الاعدادات بنجاح! ✅');

    console.log('✅ تم حفظ البروفايل:', {
        name: currentUser.name,
        avatar: currentUser.avatar,
        hasCustomAvatar: !!currentUser.customAvatar
    });
}

// Utility functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');

    // إيقاف فترات التحديث عند إغلاق المودالات
    if (modalId === 'messagesModal' && window.messagesUpdateInterval) {
        clearInterval(window.messagesUpdateInterval);
    }
    if (modalId === 'chatModal' && window.chatUpdateInterval) {
        clearInterval(window.chatUpdateInterval);
    }
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

// Website idea modal
function showWebsiteIdeaModal() {
    document.getElementById('websiteIdeaModal').classList.add('active');
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

// تحديد صلاحيات المستخدم التلقائياً
function setUserPermissions() {
    // التحقق من الآيدي المحدد للأدمن
    if (isOwnerAdmin(currentUser.id)) {
        // إعطاء صلاحيات أدمن للمالك تلقائياً
        currentUser.role = 'admin';
        currentUser.isOwner = true;
        localStorage.setItem('gamesShopUser', JSON.stringify(currentUser));

        // إظهار أدوات الإدارة
        showAdminControls();

        // تحديث رتبة المستخدم في الواجهة
        const userRank = document.getElementById('userRank');
        if (userRank) {
            userRank.textContent = 'Owner/Admin';
            userRank.classList.add('admin');
            userRank.style.color = '#ffd700';
            userRank.style.fontWeight = 'bold';
        }

        console.log('🔑 تم منح صلاحيات الأدمن للمالك:', currentUser.name);
        showNotification('مرحباً أيها المالك! تم منحك صلاحيات الأدمن 👑', 'success');
    } else {
        // جميع المستخدمين الآخرين يحصلون على رتبة عضو
        currentUser.role = 'member';
        currentUser.isOwner = false;
        localStorage.setItem('gamesShopUser', JSON.stringify(currentUser));

        const userRank = document.getElementById('userRank');
        if (userRank) {
            userRank.textContent = 'Member';
            userRank.style.color = '#00bfff';
        }

        console.log('👤 تم تسجيل المستخدم كعضو:', currentUser.name);
    }
}

// إظهار أدوات التحكم للأدمن
function showAdminControls() {
    const adminControls = document.getElementById('adminControls');
    if (adminControls) {
        adminControls.classList.remove('hidden');
    }

    // إضافة أزرار حذف للعروض في الواجهة
    addAdminDeleteButtons();
}

// إضافة أزرار حذف العروض للأدمن
function addAdminDeleteButtons() {
    setTimeout(() => {
        const offers = document.querySelectorAll('.offer-card');
        offers.forEach(offerCard => {
            const offerActions = offerCard.querySelector('.offer-actions');
            if (offerActions && !offerActions.querySelector('.admin-delete-btn')) {
                const offerId = extractOfferIdFromCard(offerCard);
                if (offerId) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'action-btn admin-delete-btn';
                    deleteBtn.textContent = 'حذف إداري 🗑️';
                    deleteBtn.dataset.offerId = offerId;
                    deleteBtn.onclick = () => {
                        if (confirm('هل أنت متأكد من حذف هذا العرض كأدمن؟')) {
                            deleteOffer(offerId);
                        }
                    };
                    offerActions.appendChild(deleteBtn);
                }
            }
        });
    }, 1000);
}

// استخراج معرف العرض من بطاقة العرض
function extractOfferIdFromCard(offerCard) {
    const deleteBtn = offerCard.querySelector('[onclick*="deleteOffer"]');
    if (deleteBtn && deleteBtn.onclick) {
        const onclickStr = deleteBtn.onclick.toString();
        const match = onclickStr.match(/deleteOffer\((\d+(?:\.\d+)?)\)/);
        return match ? parseFloat(match[1]) : null;
    }
    return null;
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

// Load user's Vex balance
async function loadUserVexBalance() {
    if (!currentUser) {
        console.log('⚠️ لا يوجد مستخدم لتحميل رصيد Vex');
        return;
    }

    try {
        // محاولة تحميل من الخادم أولاً
        try {
            const response = await fetch(`${API_BASE_URL}/api/vex/${currentUser.id}`);
            if (response.ok) {
                const data = await response.json();
                userVexBalance = data.vexBalance || 0;
                updateVexDisplay();
                console.log(`✅ تم تحميل رصيد Vex من الخادم: ${userVexBalance}`);
                return;
            }
        } catch (serverError) {
            console.log('⚠️ فشل تحميل رصيد Vex من الخادم:', serverError);
        }

        // في حالة فشل الخادم، استخدم التخزين المحلي
        const savedVex = localStorage.getItem(`vex_${currentUser.id}`);
        userVexBalance = savedVex ? parseInt(savedVex) : 0;
        updateVexDisplay();
        console.log(`✅ تم تحميل رصيد Vex من التخزين المحلي: ${userVexBalance}`);

    } catch (error) {
        console.error('خطأ في تحميل رصيد Vex:', error);
        userVexBalance = 0;
        updateVexDisplay();
    }
}