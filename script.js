
// Global variables
let currentUser = null;
let offers = [];
let conversations = {};
let currentChatPartner = null;
let selectedAvatar = 1;
let userVexBalance = 0; // Starting balance
let userSettings = {
    allowMessages: true,
    blockedUsers: []
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeAds();
});

function initializeApp() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('gamesShopUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainPage();
    } else {
        showLoginPage();
    }
    
    // Load saved data
    loadOffers();
    loadConversations();
    loadUserSettings();
    loadVexBalance();
    
    // Event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Login
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('usernameInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
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
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// Login functionality
function handleLogin() {
    const username = document.getElementById('usernameInput').value.trim();
    if (username.length > 0) {
        currentUser = {
            name: username,
            avatar: selectedAvatar,
            id: Date.now()
        };
        localStorage.setItem('gamesShopUser', JSON.stringify(currentUser));
        showMainPage();
    } else {
        alert('من فضلك ادخل اسمك');
    }
}

function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('mainPage').classList.remove('active');
}

function showMainPage() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('mainPage').classList.add('active');
    
    // Update user info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userAvatar').src = `https://i.pravatar.cc/150?img=${currentUser.avatar}`;
    updateVexDisplay();
    
    // Display offers
    displayOffers();
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

function submitOffer() {
    const game = document.getElementById('gameSelect').value;
    const offerText = document.getElementById('offerText').value.trim();
    const priceAmount = document.getElementById('priceAmount').value;
    const selectedCurrency = document.getElementById('selectedCurrency').textContent;
    const accountDetails = document.getElementById('accountDetails').value.trim();
    
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
    
    const newOffer = {
        id: Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        game: game,
        offer: offerText,
        requirement: requirement,
        likes: 0,
        likedBy: [],
        timestamp: new Date().toISOString()
    };
    
    offers.unshift(newOffer);
    saveOffers();
    displayOffers();
    closeAddOfferModal();
    
    // Show success message
    showNotification('تم إضافة العرض بنجاح! 🎉');
}

// Offers display
function displayOffers(filteredOffers = null) {
    const container = document.getElementById('offersContainer');
    const offersToShow = filteredOffers || offers;
    
    // Sort offers by likes (highest first)
    const sortedOffers = [...offersToShow].sort((a, b) => b.likes - a.likes);
    
    container.innerHTML = '';
    
    if (sortedOffers.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #00bfff; font-size: 1.5rem; grid-column: 1/-1;">لا توجد عروض حالياً 😔</div>';
        return;
    }
    
    sortedOffers.forEach(offer => {
        const offerCard = createOfferCard(offer);
        container.appendChild(offerCard);
    });
}

function createOfferCard(offer) {
    const card = document.createElement('div');
    const isVIP = offer.isVIP || isVIPUser(offer.userId);
    card.className = `offer-card ${isVIP ? 'vip-offer' : ''}`;
    
    const isOwner = offer.userId === currentUser.id;
    const hasLiked = offer.likedBy.includes(currentUser.id);
    
    card.innerHTML = `
        <div class="offer-header">
            <img src="https://i.pravatar.cc/150?img=${offer.userAvatar}" alt="${offer.userName}" class="offer-avatar">
            <span class="offer-username">${offer.userName}${isVIP ? ' 👑' : ''}</span>
            <span class="like-count">❤️ ${offer.likes}</span>
            ${isVIP ? '<span class="vip-badge-small">VIP</span>' : ''}
        </div>
        <div class="offer-content">
            <h3>العرض📋</h3>
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

function toggleLike(offerId) {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) return;
    
    const userIndex = offer.likedBy.indexOf(currentUser.id);
    if (userIndex === -1) {
        offer.likedBy.push(currentUser.id);
        offer.likes++;
    } else {
        offer.likedBy.splice(userIndex, 1);
        offer.likes--;
    }
    
    saveOffers();
    displayOffers();
}

function deleteOffer(offerId) {
    if (confirm('هل أنت متأكد من حذف هذا العرض؟')) {
        offers = offers.filter(o => o.id !== offerId);
        saveOffers();
        displayOffers();
        showNotification('تم حذف العرض بنجاح 🗑️');
    }
}

function showAllOffers() {
    displayOffers();
}

// Chat functionality
function startChat(partnerName, partnerId) {
    // التحقق من الحظر
    if (userSettings.blockedUsers.includes(partnerId)) {
        showNotification('لا يمكنك مراسلة هذا المستخدم - محظور 🚫');
        return;
    }
    
    // التحقق من إعدادات المستخدم المراد مراسلته
    const partnerSettings = getPartnerSettings(partnerId);
    if (!partnerSettings.allowMessages) {
        showNotification('هذا المستخدم لا يقبل المراسلات حالياً 💬🚫');
        return;
    }
    
    currentChatPartner = { name: partnerName, id: partnerId };
    document.getElementById('chatTitle').textContent = `مراسلة ${partnerName}`;
    document.getElementById('chatModal').classList.add('active');
    loadChatMessages();
}

function loadChatMessages() {
    if (!currentChatPartner) return;
    
    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    const messages = conversations[chatId] || [];
    const container = document.getElementById('chatMessages');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #00bfff; padding: 2rem;">ابدأ المحادثة! 💬</div>';
        return;
    }
    
    messages.forEach(message => {
        if (!message.text) return; // Skip empty messages
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.senderId === currentUser.id ? 'sent' : 'received'}`;
        
        const messageTime = message.timestamp ? new Date(message.timestamp).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        }) : '';
        
        messageDiv.innerHTML = `
            <div class="message-text">${message.text}</div>
            ${messageTime ? `<small class="message-time">${messageTime}</small>` : ''}
        `;
        container.appendChild(messageDiv);
    });
    
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text || !currentChatPartner) return;
    
    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    if (!conversations[chatId]) {
        conversations[chatId] = [];
    }
    
    const message = {
        id: Date.now(),
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        text: text,
        timestamp: new Date().toISOString()
    };
    
    conversations[chatId].push(message);
    saveConversations();
    loadChatMessages();
    input.value = '';
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
    
    // Filter chats that have actual messages
    const activeChats = userChats.filter(chatId => {
        const messages = conversations[chatId];
        return messages && messages.length > 0;
    });
    
    if (activeChats.length === 0) {
        container.innerHTML = '<div class="no-conversations"><i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i><p>لا توجد محادثات حالياً</p><p style="opacity: 0.7; font-size: 0.9rem;">ابدأ محادثة من خلال الضغط على "مراسلة الشخص" في أي عرض</p></div>';
        return;
    }
    
    activeChats.forEach(chatId => {
        const messages = conversations[chatId];
        const lastMessage = messages[messages.length - 1];
        const otherUserId = chatId.split('-').find(id => id !== currentUser.id.toString());
        
        // Get user info from saved chats or offers
        let otherUserName = 'مستخدم غير معروف';
        let otherUserAvatar = 1;
        
        // First try to find from offers
        const offer = offers.find(o => o.userId == otherUserId);
        if (offer) {
            otherUserName = offer.userName;
            otherUserAvatar = offer.userAvatar;
        } else {
            // Try to get from message history
            const userMessage = messages.find(m => m.senderId != currentUser.id);
            if (userMessage && userMessage.senderName) {
                otherUserName = userMessage.senderName;
                otherUserAvatar = userMessage.senderAvatar || 1;
            }
        }
        
        const messageItem = document.createElement('div');
        messageItem.className = 'conversation-item';
        messageItem.innerHTML = `
            <div class="conversation-header">
                <img src="https://i.pravatar.cc/150?img=${otherUserAvatar}" alt="${otherUserName}" class="conversation-avatar">
                <div class="conversation-info">
                    <div class="conversation-name">${otherUserName}</div>
                    <div class="conversation-last-message">${lastMessage.text.length > 50 ? lastMessage.text.substring(0, 50) + '...' : lastMessage.text}</div>
                    <small class="conversation-time">${new Date(lastMessage.timestamp).toLocaleString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit'
                    })}</small>
                </div>
                <div class="conversation-indicator">
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
    
    // Select current avatar
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

function saveProfile() {
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

function saveOffers() {
    localStorage.setItem('gamesShopOffers', JSON.stringify(offers));
}

function loadOffers() {
    const savedOffers = localStorage.getItem('gamesShopOffers');
    if (savedOffers) {
        offers = JSON.parse(savedOffers);
    }
}

function saveConversations() {
    localStorage.setItem('gamesShopConversations', JSON.stringify(conversations));
}

function loadConversations() {
    const savedConversations = localStorage.getItem('gamesShopConversations');
    if (savedConversations) {
        conversations = JSON.parse(savedConversations);
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

function toggleMessageSettings() {
    userSettings.allowMessages = !userSettings.allowMessages;
    saveUserSettings();
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
    
    // Filter chats that have actual messages
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
        
        // Get user info
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

function blockUser(userId, userName) {
    if (confirm(`هل أنت متأكد من حظر ${userName}؟`)) {
        userSettings.blockedUsers.push(userId);
        saveUserSettings();
        loadBlockList();
        
        // إرسال رسالة للمحظور
        const chatId = getChatId(currentUser.id, userId);
        if (!conversations[chatId]) {
            conversations[chatId] = [];
        }
        
        const blockMessage = {
            id: Date.now(),
            senderId: currentUser.id,
            text: `تم حظرك من قبل ${currentUser.name} 🚫`,
            timestamp: new Date().toISOString(),
            isSystemMessage: true
        };
        
        conversations[chatId].push(blockMessage);
        saveConversations();
        
        showNotification(`تم حظر ${userName} بنجاح 🚫`);
    }
}

function unblockUser(userId, userName) {
    if (confirm(`هل أنت متأكد من إلغاء حظر ${userName}؟`)) {
        userSettings.blockedUsers = userSettings.blockedUsers.filter(id => id !== userId);
        saveUserSettings();
        loadBlockList();
        showNotification(`تم إلغاء حظر ${userName} ✅`);
    }
}

function getPartnerSettings(partnerId) {
    // في التطبيق الحقيقي، يجب جلب إعدادات المستخدم من قاعدة البيانات
    // هنا نفترض أن جميع المستخدمين يقبلون المراسلات افتراضياً
    return { allowMessages: true };
}

function saveUserSettings() {
    localStorage.setItem('gamesShopUserSettings', JSON.stringify(userSettings));
}

function loadUserSettings() {
    const savedSettings = localStorage.getItem('gamesShopUserSettings');
    if (savedSettings) {
        userSettings = { ...userSettings, ...JSON.parse(savedSettings) };
    }
}

// Support modal
function showSupportModal() {
    document.getElementById('supportModal').classList.add('active');
}

// Market modal
function showMarketModal() {
    document.getElementById('marketModal').classList.add('active');
}

// VIP purchase
function buyVIP() {
    const vipPrice = 10000;
    
    if (userVexBalance < vipPrice) {
        showInsufficientVexModal();
        return;
    }
    
    if (confirm(`هل تريد شراء VIP مقابل ${vipPrice} Vex؟`)) {
        // Deduct Vex and activate VIP
        userVexBalance -= vipPrice;
        saveVexBalance();
        updateVexDisplay();
        activateVIP(currentUser.id);
        showNotification('تم شراء VIP بنجاح! 👑');
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

function loadVexBalance() {
    const savedBalance = localStorage.getItem('userVexBalance');
    if (savedBalance) {
        userVexBalance = parseInt(savedBalance);
    }
}

function saveVexBalance() {
    localStorage.setItem('userVexBalance', userVexBalance.toString());
}

function updateVexDisplay() {
    const vexElement = document.getElementById('userVexBalance');
    if (vexElement) {
        vexElement.textContent = userVexBalance.toLocaleString();
    }
}

function addVex(amount) {
    userVexBalance += amount;
    saveVexBalance();
    updateVexDisplay();
    showNotification(`تم إضافة ${amount} Vex إلى رصيدك! 💰`);
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

// Simplified VIP activation without payment processing

function activateVIP(userId) {
    // تفعيل VIP للمستخدم
    const vipUsers = JSON.parse(localStorage.getItem('vipUsers') || '[]');
    
    if (!vipUsers.includes(userId)) {
        vipUsers.push(userId);
        localStorage.setItem('vipUsers', JSON.stringify(vipUsers));
    }
    
    // تحديث العروض لتظهر بشكل ذهبي
    updateVIPStatus(userId);
}

function updateVIPStatus(userId) {
    // تحديث عروض المستخدم VIP
    offers.forEach(offer => {
        if (offer.userId === userId) {
            offer.isVIP = true;
        }
    });
    
    saveOffers();
    displayOffers();
}

function isVIPUser(userId) {
    const vipUsers = JSON.parse(localStorage.getItem('vipUsers') || '[]');
    return vipUsers.includes(userId);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #00ff80, #00cc66);
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0, 255, 128, 0.4);
        z-index: 3000;
        font-weight: bold;
        animation: slideInRight 0.3s ease;
    `;
    
    // Add animation keyframes
    if (!document.getElementById('notificationStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    notification.textContent = message;
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

// AdSense Functions
function initializeAds() {
    // Initialize AdSense on page load
    setTimeout(() => {
        try {
            (adsbygoogle = window.adsbygoogle || []).push({});
            console.log('AdSense initialized');
        } catch (error) {
            console.error('AdSense initialization error:', error);
        }
    }, 2000);
    
    // Show periodic ads every 5 minutes
    setInterval(showPeriodicAd, 5 * 60 * 1000); // 5 minutes in milliseconds
}

function showPeriodicAd() {
    const adModal = document.createElement('div');
    adModal.className = 'modal active';
    adModal.id = 'periodicAdModal';
    
    adModal.innerHTML = `
        <div class="modal-content ad-modal">
            <div class="modal-header">
                <h3>إعلان 📢</h3>
                <button class="close-modal" onclick="closePeriodicAd()" id="closeAdBtn" disabled>×</button>
                <span class="ad-timer" id="adTimer">5</span>
            </div>
            <div class="modal-body">
                <div class="ad-container">
                    <ins class="adsbygoogle"
                         style="display:block"
                         data-ad-client="ca-pub-1404937854433871"
                         data-ad-slot="3016283172"
                         data-ad-format="auto"
                         data-full-width-responsive="true"></ins>
                </div>
                <p class="ad-message">يمكنك إغلاق الإعلان بعد <span id="countdown">5</span> ثوانٍ</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(adModal);
    
    try {
        (adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
        console.error('AdSense periodic ad error:', error);
    }
    
    // Countdown timer for ad
    let countdown = 5;
    const countdownInterval = setInterval(() => {
        countdown--;
        const countdownElement = document.getElementById('countdown');
        const timerElement = document.getElementById('adTimer');
        
        if (countdownElement) countdownElement.textContent = countdown;
        if (timerElement) timerElement.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            const closeBtn = document.getElementById('closeAdBtn');
            if (closeBtn) {
                closeBtn.disabled = false;
                closeBtn.style.color = '#00bfff';
                closeBtn.style.cursor = 'pointer';
            }
            if (timerElement) timerElement.style.display = 'none';
        }
    }, 1000);
}

function closePeriodicAd() {
    const modal = document.getElementById('periodicAdModal');
    if (modal) {
        modal.remove();
    }
}

// No demo offers - only real user offers will be displayed
