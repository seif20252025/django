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

// Server API base URL
const API_BASE = '';

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

    // Load data from server
    loadOffersFromServer();
    loadConversationsFromServer();
    loadUserSettingsFromServer();
    loadMembersFromServer();

    // Event listeners
    setupEventListeners();
}

// Server API functions
async function loadOffersFromServer() {
    try {
        const response = await fetch(`${API_BASE}/api/offers`);
        if (response.ok) {
            offers = await response.json();
            displayOffers();
        }
    } catch (error) {
        console.error('Error loading offers:', error);
    }
}

async function saveOfferToServer(offer) {
    try {
        const response = await fetch(`${API_BASE}/api/offers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(offer)
        });

        if (response.ok) {
            const result = await response.json();
            return result.offer;
        }
    } catch (error) {
        console.error('Error saving offer:', error);
    }
    return null;
}

async function deleteOfferFromServer(offerId) {
    try {
        const response = await fetch(`${API_BASE}/api/offers/${offerId}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (error) {
        console.error('Error deleting offer:', error);
        return false;
    }
}

async function likeOfferOnServer(offerId) {
    try {
        const response = await fetch(`${API_BASE}/api/offers/${offerId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });

        if (response.ok) {
            const result = await response.json();
            return result.offer;
        }
    } catch (error) {
        console.error('Error liking offer:', error);
    }
    return null;
}

async function loadConversationsFromServer() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/api/conversations/${currentUser.id}`);
        if (response.ok) {
            conversations = await response.json();
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

async function saveMessageToServer(chatId, message) {
    try {
        const response = await fetch(`${API_BASE}/api/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ chatId, message })
        });

        if (response.ok) {
            const result = await response.json();
            return result.message;
        }
    } catch (error) {
        console.error('Error saving message:', error);
    }
    return null;
}

async function loadMembersFromServer() {
    try {
        const response = await fetch(`${API_BASE}/api/members`);
        if (response.ok) {
            registeredMembers = await response.json();
        }
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

async function saveMemberToServer(member) {
    try {
        const response = await fetch(`${API_BASE}/api/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(member)
        });

        if (response.ok) {
            const result = await response.json();
            registeredMembers = result.members;
            return true;
        }
    } catch (error) {
        console.error('Error saving member:', error);
    }
    return false;
}

async function loadUserSettingsFromServer() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/api/settings/${currentUser.id}`);
        if (response.ok) {
            userSettings = await response.json();
        }
    } catch (error) {
        console.error('Error loading user settings:', error);
    }
}

async function saveUserSettingsToServer() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/api/settings/${currentUser.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userSettings)
        });
        return response.ok;
    } catch (error) {
        console.error('Error saving user settings:', error);
        return false;
    }
}

async function checkVIPStatus() {
    if (!currentUser) return false;

    try {
        const response = await fetch(`${API_BASE}/api/vip/${currentUser.id}`);
        if (response.ok) {
            const result = await response.json();
            return result.isVIP;
        }
    } catch (error) {
        console.error('Error checking VIP status:', error);
    }
    return false;
}

async function activateVIPOnServer() {
    if (!currentUser) return false;

    try {
        const response = await fetch(`${API_BASE}/api/vip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });
        return response.ok;
    } catch (error) {
        console.error('Error activating VIP:', error);
        return false;
    }
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

    // Members button
    document.getElementById('membersBtn').addEventListener('click', () => {
        showMembersModal();
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
async function handleLogin() {
    const username = document.getElementById('usernameInput').value.trim();
    if (username.length > 0) {
        currentUser = {
            name: username,
            avatar: selectedAvatar,
            id: Date.now()
        };
        localStorage.setItem('gamesShopUser', JSON.stringify(currentUser));
        userVexBalance = 0; // Reset Vex balance to 0 as requested
        await showMainPage();
    } else {
        alert('من فضلك ادخل اسمك');
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

    // Register member on server
    await registerMember();

    // Load all data from server
    await loadOffersFromServer();
    await loadConversationsFromServer();
    await loadUserSettingsFromServer();
    await loadMembersFromServer();

    // Display offers
    displayOffers();

    // Check for new messages
    checkForNewMessages();
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

async function submitOffer() {
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

    // Show security warning before submitting
    showSecurityWarning(async () => {
        const isVIP = await checkVIPStatus();

        const newOffer = {
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            game: game,
            offer: offerText,
            requirement: requirement,
            isVIP: isVIP
        };

        const savedOffer = await saveOfferToServer(newOffer);
        if (savedOffer) {
            await loadOffersFromServer(); // Reload all offers
            closeAddOfferModal();
            showNotification('تم إضافة العرض بنجاح! 🎉');
        } else {
            alert('حدث خطأ في إضافة العرض');
        }
    });
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
    const updatedOffer = await likeOfferOnServer(offerId);
    if (updatedOffer) {
        // Update local offers array
        const offerIndex = offers.findIndex(o => o.id === offerId);
        if (offerIndex !== -1) {
            offers[offerIndex] = updatedOffer;
        }
        displayOffers();
    }
}

async function deleteOffer(offerId) {
    if (confirm('هل أنت متأكد من حذف هذا العرض؟')) {
        const success = await deleteOfferFromServer(offerId);
        if (success) {
            await loadOffersFromServer();
            showNotification('تم حذف العرض بنجاح 🗑️');
        } else {
            alert('حدث خطأ في حذف العرض');
        }
    }
}

function showAllOffers() {
    loadOffersFromServer();
}

// Chat functionality
function startChat(partnerName, partnerId) {
    // التحقق من الحظر
    if (userSettings.blockedUsers.includes(partnerId)) {
        showNotification('لا يمكنك مراسلة هذا المستخدم - محظور 🚫');
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
        if (!message.text) return;

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

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();

    if (!text || !currentChatPartner) return;

    const chatId = getChatId(currentUser.id, currentChatPartner.id);

    const message = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        text: text
    };

    const savedMessage = await saveMessageToServer(chatId, message);
    if (savedMessage) {
        await loadConversationsFromServer();
        loadChatMessages();
        input.value = '';
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

    // Update on server
    await saveMemberToServer(currentUser);

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
    await saveUserSettingsToServer();
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
        await saveUserSettingsToServer();
        loadBlockList();

        const chatId = getChatId(currentUser.id, userId);
        const blockMessage = {
            senderId: currentUser.id,
            text: `تم حظرك من قبل ${currentUser.name} 🚫`,
            isSystemMessage: true
        };

        await saveMessageToServer(chatId, blockMessage);
        showNotification(`تم حظر ${userName} بنجاح 🚫`);
    }
}

async function unblockUser(userId, userName) {
    if (confirm(`هل أنت متأكد من إلغاء حظر ${userName}؟`)) {
        userSettings.blockedUsers = userSettings.blockedUsers.filter(id => id !== userId);
        await saveUserSettingsToServer();
        loadBlockList();
        showNotification(`تم إلغاء حظر ${userName} ✅`);
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
async function buyVIP() {
    const vipPrice = 10000;

    if (userVexBalance < vipPrice) {
        showInsufficientVexModal();
        return;
    }

    if (confirm(`هل تريد شراء VIP مقابل ${vipPrice} Vex؟`)) {
        userVexBalance -= vipPrice;
        updateVexDisplay();

        const success = await activateVIPOnServer();
        if (success) {
            showNotification('تم شراء VIP بنجاح! 👑');
            await loadOffersFromServer(); // Reload offers to show VIP status
        } else {
            userVexBalance += vipPrice; // Refund if activation failed
            updateVexDisplay();
            alert('حدث خطأ في تفعيل VIP');
        }
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
let adInitialized = false;
let periodicAdInterval = null;

function initializeAds() {
    try {
        // Wait for AdSense script to load
        if (typeof window.adsbygoogle !== 'undefined') {
            // Initialize main ad only once
            if (!adInitialized) {
                const mainAd = document.querySelector('.main-ad');
                if (mainAd && !mainAd.getAttribute('data-adsbygoogle-status')) {
                    try {
                        (window.adsbygoogle = window.adsbygoogle || []).push({});
                        adInitialized = true;
                    } catch (adError) {
                        console.warn('Main ad initialization failed:', adError);
                    }
                }
            }

            // Show periodic ads every 5 minutes (only if not already running)
            if (!periodicAdInterval) {
                periodicAdInterval = setInterval(() => {
                    try {
                        showPeriodicAd();
                    } catch (adError) {
                        console.warn('Periodic ad failed:', adError);
                    }
                }, 300000); // 5 minutes
            }

            // Clear interval on page unload
            window.addEventListener('beforeunload', () => {
                if (periodicAdInterval) {
                    clearInterval(periodicAdInterval);
                    periodicAdInterval = null;
                }
            });
        } else {
            // Retry initialization if AdSense not loaded yet
            setTimeout(initializeAds, 1000);
        }
    } catch (error) {
        console.warn('AdSense initialization error:', error);
    }
}

function showPeriodicAd() {
    // Check if there's already an ad showing
    if (document.querySelector('.ad-overlay')) {
        return;
    }

    try {
        // Create ad overlay
        const adOverlay = document.createElement('div');
        adOverlay.className = 'ad-overlay';
        adOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            z-index: 3000;
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(5px);
        `;

        const adContainer = document.createElement('div');
        adContainer.style.cssText = `
            background: linear-gradient(135deg, #000428 0%, #004e92 100%);
            padding: 2rem;
            border-radius: 15px;
            max-width: 90%;
            width: 500px;
            text-align: center;
            position: relative;
            border: 2px solid #00bfff;
            box-shadow: 0 20px 40px rgba(0, 191, 255, 0.3);
            color: white;
        `;

        // Show promotional content
        adContainer.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <span id="adTimer" style="background: #ff4444; color: white; padding: 0.5rem 1rem; border-radius: 50px; font-weight: bold; font-size: 1.1rem;">5</span>
            </div>
            <div style="background: linear-gradient(45deg, #00bfff, #004e92); padding: 2.5rem; border-radius: 15px; margin-bottom: 1rem;">
                <h2 style="margin: 0 0 1rem 0; color: white; font-size: 2rem;">🎮 GAMES SHOP 🎮</h2>
                <p style="margin: 0.5rem 0; font-size: 1.1rem;">أفضل موقع لبيع وشراء عروض الألعاب</p>
                <p style="margin: 0.5rem 0; font-size: 1.1rem;">انضم إلى مجتمعنا الآن!</p>
                <p style="margin: 0.5rem 0; font-size: 1.1rem; color: #ffd700;">احصل على VIP واستمتع بالمميزات الحصرية! 👑</p>
            </div>
            <button id="closeAdBtn" style="
                background: #666;
                border: none;
                padding: 0.8rem 1.5rem;
                border-radius: 10px;
                cursor: not-allowed;
                color: #ccc;
                font-size: 1rem;
                font-weight: bold;
                transition: all 0.3s ease;
            " disabled>إغلاق (5)</button>
        `;

        adOverlay.appendChild(adContainer);
        document.body.appendChild(adOverlay);

        // Close ad function
        const closeAd = () => {
            if (adOverlay && adOverlay.parentNode) {
                adOverlay.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    if (adOverlay.parentNode) {
                        adOverlay.parentNode.removeChild(adOverlay);
                    }
                }, 300);
            }
        };

        // Countdown timer for ad
        let countdown = 5;
        const countdownInterval = setInterval(() => {
            countdown--;
            const timerElement = document.getElementById('adTimer');
            const closeBtn = document.getElementById('closeAdBtn');

            if (timerElement) timerElement.textContent = countdown;
            if (closeBtn) closeBtn.textContent = `إغلاق (${countdown})`;

            if (countdown <= 0) {
                clearInterval(countdownInterval);
                if (closeBtn) {
                    closeBtn.disabled = false;
                    closeBtn.style.background = 'linear-gradient(45deg, #00bfff, #004e92)';
                    closeBtn.style.color = 'white';
                    closeBtn.style.cursor = 'pointer';
                    closeBtn.textContent = 'إغلاق ✕';
                    closeBtn.addEventListener('click', closeAd);
                }
                if (timerElement) timerElement.style.display = 'none';
            }
        }, 1000);

        // Add CSS animation
        if (!document.getElementById('adAnimationStyles')) {
            const style = document.createElement('style');
            style.id = 'adAnimationStyles';
            style.textContent = `
                @keyframes fadeOut {
                    from { opacity: 1; transform: scale(1); }
                    to { opacity: 0; transform: scale(0.9); }
                }
            `;
            document.head.appendChild(style);
        }

    } catch (error) {
        console.warn('Periodic ad error:', error);
    }
}

// Security Warning Modal
function showSecurityWarning(callback) {
    const modal = document.getElementById('securityWarningModal');
    modal.classList.add('active');

    const agreeBtn = document.getElementById('agreeWarning');
    agreeBtn.onclick = () => {
        modal.classList.remove('active');
        if (callback) callback();
    };
}

// Members functionality
async function showMembersModal() {
    document.getElementById('membersModal').classList.add('active');
    await loadMembersFromServer();
    loadMembersList();
}

async function registerMember() {
    if (!currentUser) return;

    const member = {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
    };

    await saveMemberToServer(member);
}

function loadMembersList() {
    const container = document.getElementById('membersList');
    container.innerHTML = '';

    if (registeredMembers.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #00bfff; padding: 2rem;">لا يوجد أعضاء حالياً</div>';
        return;
    }

    const sortedMembers = [...registeredMembers].sort((a, b) => {
        if (a.isVIP && !b.isVIP) return -1;
        if (!a.isVIP && b.isVIP) return 1;
        return new Date(b.joinTime || 0) - new Date(a.joinTime || 0);
    });

    sortedMembers.forEach(member => {
        const memberCard = document.createElement('div');
        memberCard.className = `member-card ${member.isVIP ? 'vip-member' : ''}`;

        const joinDate = member.joinTime ? new Date(member.joinTime).toLocaleDateString('ar-EG') : 'غير محدد';

        memberCard.innerHTML = `
            <img src="https://i.pravatar.cc/150?img=${member.avatar}" alt="${member.name}" class="member-avatar">
            <div class="member-name">${member.name}${member.isVIP ? '<span class="vip-crown">👑</span>' : ''}</div>
            <div class="member-greeting">منور يا ${member.name}</div>
            <div class="member-join-time">انضم في ${joinDate}</div>
        `;

        container.appendChild(memberCard);
    });
}

// Message notifications
function notifyNewMessage(recipientId) {
    if (recipientId === currentUser.id) {
        showMessageNotification();
    }
}

function showMessageNotification() {
    const notification = document.getElementById('messageNotification');
    if (notification) {
        notification.classList.remove('hidden');
        hasNewMessages = true;
    }
}

function clearMessageNotification() {
    const notification = document.getElementById('messageNotification');
    if (notification) {
        notification.classList.add('hidden');
        hasNewMessages = false;
    }
}

function checkForNewMessages() {
    const userChats = Object.keys(conversations).filter(chatId => 
        chatId.includes(currentUser.id.toString())
    );

    let hasUnreadMessages = false;
    userChats.forEach(chatId => {
        const messages = conversations[chatId];
        if (messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.senderId !== currentUser.id) {
                hasUnreadMessages = true;
            }
        }
    });

    if (hasUnreadMessages) {
        showMessageNotification();
    }
}