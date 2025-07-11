
// Payment Backend Service
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for all origins
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// Add logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Global offers storage with file persistence
const fs = require('fs');
const path = require('path');
const OFFERS_FILE = path.join(__dirname, 'offers.json');
const USERS_FILE = path.join(__dirname, 'users.json');

let globalOffers = [];
let registeredUsers = [];

// Load offers from file on startup
function loadOffersFromFile() {
    try {
        if (fs.existsSync(OFFERS_FILE)) {
            const data = fs.readFileSync(OFFERS_FILE, 'utf8');
            globalOffers = JSON.parse(data);
            console.log(`📁 تم تحميل ${globalOffers.length} عرض من الملف`);
        }
    } catch (error) {
        console.error('خطأ في تحميل العروض:', error);
        globalOffers = [];
    }
}

// Save offers to file
function saveOffersToFile() {
    try {
        fs.writeFileSync(OFFERS_FILE, JSON.stringify(globalOffers, null, 2));
        console.log(`💾 تم حفظ ${globalOffers.length} عرض في الملف`);
    } catch (error) {
        console.error('خطأ في حفظ العروض:', error);
    }
}

// Load users from file
function loadUsersFromFile() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            registeredUsers = JSON.parse(data);
            console.log(`👥 تم تحميل ${registeredUsers.length} مستخدم من الملف`);
        }
    } catch (error) {
        console.error('خطأ في تحميل المستخدمين:', error);
        registeredUsers = [];
    }
}

// Save users to file
function saveUsersToFile() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(registeredUsers, null, 2));
        console.log(`💾 تم حفظ ${registeredUsers.length} مستخدم في الملف`);
    } catch (error) {
        console.error('خطأ في حفظ المستخدمين:', error);
    }
}

// Initialize data on startup
loadOffersFromFile();
loadUsersFromFile();

// Payment endpoint
app.post('/api/payment', async (req, res) => {
    try {
        const { amount, currency, customerPhone, paymentMethod, userId, userName, product } = req.body;
        
        // Validate payment data
        if (!amount || !customerPhone || !paymentMethod) {
            return res.status(400).json({ success: false, error: 'بيانات الدفع غير مكتملة' });
        }
        
        // Process payment through external service
        const paymentResult = await processExternalPayment({
            amount,
            currency,
            customerPhone,
            paymentMethod,
            userId,
            userName,
            product
        });
        
        if (paymentResult.success) {
            // Log successful payment
            console.log(`Payment successful: ${amount} ${currency} from ${customerPhone}`);
            
            res.json({
                success: true,
                transactionId: paymentResult.transactionId,
                message: 'تم الدفع بنجاح'
            });
        } else {
            res.status(400).json({
                success: false,
                error: paymentResult.error || 'فشل في الدفع'
            });
        }
    } catch (error) {
        console.error('Payment processing error:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في النظام'
        });
    }
});

// Simulate external payment service
async function processExternalPayment(paymentData) {
    // This would integrate with a real payment provider
    // For now, we'll simulate the payment process
    
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulate payment success (90% success rate)
            const success = Math.random() > 0.1;
            
            if (success) {
                resolve({
                    success: true,
                    transactionId: `TXN_${Date.now()}`,
                    message: 'Payment processed successfully'
                });
            } else {
                resolve({
                    success: false,
                    error: 'Payment failed'
                });
            }
        }, 1500);
    });
}

// Offers endpoints
app.get('/api/offers', (req, res) => {
    // Sort offers by timestamp (newest first)
    const sortedOffers = [...globalOffers].sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
    });
    res.json(sortedOffers);
});

app.post('/api/offers', (req, res) => {
    try {
        const offer = req.body;
        offer.id = Date.now() + Math.random();
        offer.likes = offer.likes || 0;
        offer.likedBy = offer.likedBy || [];
        offer.timestamp = new Date().toISOString();
        
        // Handle image data if present
        if (offer.image && offer.image.length > 5000000) { // 5MB limit
            return res.status(400).json({ success: false, error: 'Image too large (max 5MB)' });
        }
        
        globalOffers.unshift(offer);
        saveOffersToFile(); // حفظ في الملف
        console.log(`New offer added: ${offer.game} by ${offer.userName}${offer.image ? ' (with image)' : ''}. Total offers: ${globalOffers.length}`);
        res.json({ success: true, offers: globalOffers });
    } catch (error) {
        console.error('Error saving offer:', error);
        res.status(500).json({ success: false, error: 'Failed to save offer' });
    }
});

app.delete('/api/offers/:offerId', (req, res) => {
    try {
        const offerId = parseFloat(req.params.offerId);
        const initialLength = globalOffers.length;
        globalOffers = globalOffers.filter(offer => offer.id !== offerId);
        
        if (globalOffers.length < initialLength) {
            saveOffersToFile(); // حفظ في الملف
            console.log(`Offer ${offerId} deleted. Total offers: ${globalOffers.length}`);
            res.json({ success: true, offers: globalOffers });
        } else {
            res.status(404).json({ success: false, error: 'Offer not found' });
        }
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).json({ success: false, error: 'Failed to delete offer' });
    }
});

app.post('/api/offers/:offerId/like', (req, res) => {
    try {
        const offerId = parseFloat(req.params.offerId);
        const { userId } = req.body;
        
        const offerIndex = globalOffers.findIndex(o => o.id === offerId);
        if (offerIndex !== -1) {
            const offer = globalOffers[offerIndex];
            
            if (!offer.likedBy) offer.likedBy = [];
            if (!offer.likes) offer.likes = 0;
            
            const userIndex = offer.likedBy.indexOf(userId);
            if (userIndex > -1) {
                offer.likedBy.splice(userIndex, 1);
                offer.likes = Math.max(0, offer.likes - 1);
            } else {
                offer.likedBy.push(userId);
                offer.likes = (offer.likes || 0) + 1;
            }
            
            globalOffers[offerIndex] = offer;
            saveOffersToFile(); // حفظ في الملف
            res.json({ success: true, offer: offer });
        } else {
            res.status(404).json({ success: false, error: 'Offer not found' });
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ success: false, error: 'Failed to like offer' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        totalOffers: globalOffers.length,
        offers: globalOffers.slice(0, 3) // Show first 3 offers for debugging
    });
});

// User registration endpoint
app.post('/api/register', (req, res) => {
    try {
        const { email, name, password } = req.body;
        
        // Check if email already exists
        const existingUser = registeredUsers.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'البريد الإلكتروني مسجل بالفعل' });
        }
        
        // Create new user
        const newUser = {
            id: Date.now() + Math.random(),
            email,
            name,
            password, // في التطبيق الحقيقي يجب تشفير كلمة المرور
            avatar: Math.floor(Math.random() * 6) + 1,
            joinDate: new Date().toISOString()
        };
        
        registeredUsers.push(newUser);
        saveUsersToFile();
        
        res.json({ success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name, avatar: newUser.avatar } });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ success: false, error: 'خطأ في التسجيل' });
    }
});

// User login endpoint
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        // التحقق من وجود البيانات
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'من فضلك املأ جميع الحقول' });
        }

        // التحقق من صحة البريد الإلكتروني
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: 'من فضلك أدخل بريد إلكتروني صحيح' });
        }
        
        // البحث عن المستخدم بالبريد الإلكتروني
        const userByEmail = registeredUsers.find(u => u.email === email);
        if (!userByEmail) {
            return res.status(401).json({ success: false, error: 'البريد الإلكتروني غير مسجل' });
        }

        // التحقق من كلمة المرور
        if (userByEmail.password !== password) {
            return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
        }
        
        console.log(`✅ تم تسجيل دخول المستخدم: ${userByEmail.name} (${email})`);
        res.json({ success: true, user: { id: userByEmail.id, email: userByEmail.email, name: userByEmail.name, avatar: userByEmail.avatar } });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ success: false, error: 'خطأ في تسجيل الدخول' });
    }
});

// Conversations storage
let globalConversations = {};
const CONVERSATIONS_FILE = path.join(__dirname, 'conversations.json');

// Load conversations from file
function loadConversationsFromFile() {
    try {
        if (fs.existsSync(CONVERSATIONS_FILE)) {
            const data = fs.readFileSync(CONVERSATIONS_FILE, 'utf8');
            globalConversations = JSON.parse(data);
            console.log(`💬 تم تحميل المحادثات من الملف`);
        }
    } catch (error) {
        console.error('خطأ في تحميل المحادثات:', error);
        globalConversations = {};
    }
}

// Save conversations to file
function saveConversationsToFile() {
    try {
        fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(globalConversations, null, 2));
        console.log(`💾 تم حفظ المحادثات في الملف`);
    } catch (error) {
        console.error('خطأ في حفظ المحادثات:', error);
    }
}

// Load conversations on startup
loadConversationsFromFile();

// Get conversations for a user
app.get('/api/conversations/:userId', (req, res) => {
    try {
        const userId = req.params.userId;
        const userConversations = {};
        
        // Find all conversations that include this user
        Object.keys(globalConversations).forEach(chatId => {
            if (chatId.includes(userId)) {
                userConversations[chatId] = globalConversations[chatId];
            }
        });
        
        res.json(userConversations);
    } catch (error) {
        console.error('Error getting conversations:', error);
        res.status(500).json({ success: false, error: 'Failed to get conversations' });
    }
});

// Save a conversation message
app.post('/api/conversations', (req, res) => {
    try {
        const { chatId, message, senderId, recipientId } = req.body;
        
        if (!globalConversations[chatId]) {
            globalConversations[chatId] = [];
        }
        
        globalConversations[chatId].push(message);
        saveConversationsToFile();
        
        console.log(`💬 رسالة جديدة في المحادثة ${chatId} من المستخدم ${senderId}`);
        res.json({ success: true, conversations: globalConversations });
    } catch (error) {
        console.error('Error saving conversation:', error);
        res.status(500).json({ success: false, error: 'Failed to save conversation' });
    }
});

// Debug endpoint to view all offers
app.get('/api/debug/offers', (req, res) => {
    res.json({
        success: true,
        totalOffers: globalOffers.length,
        offers: globalOffers,
        timestamp: new Date().toISOString()
    });
});

// Debug endpoint to view all conversations
app.get('/api/debug/conversations', (req, res) => {
    res.json({
        success: true,
        totalConversations: Object.keys(globalConversations).length,
        conversations: globalConversations,
        timestamp: new Date().toISOString()
    });
});

// Notification endpoint for instant messaging
app.post('/api/notify', (req, res) => {
    try {
        const notification = req.body;
        console.log(`🔔 إشعار رسالة جديدة من ${notification.senderName} إلى ${notification.recipientId}`);
        res.json({ success: true, message: 'Notification sent' });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ success: false, error: 'Failed to send notification' });
    }
});

// Offer messages storage
let globalOfferMessages = [];
const OFFER_MESSAGES_FILE = path.join(__dirname, 'offer-messages.json');

// Load offer messages from file
function loadOfferMessagesFromFile() {
    try {
        if (fs.existsSync(OFFER_MESSAGES_FILE)) {
            const data = fs.readFileSync(OFFER_MESSAGES_FILE, 'utf8');
            globalOfferMessages = JSON.parse(data);
            console.log(`📩 تم تحميل ${globalOfferMessages.length} رسالة عرض من الملف`);
        }
    } catch (error) {
        console.error('خطأ في تحميل رسائل العروض:', error);
        globalOfferMessages = [];
    }
}

// Save offer messages to file
function saveOfferMessagesToFile() {
    try {
        fs.writeFileSync(OFFER_MESSAGES_FILE, JSON.stringify(globalOfferMessages, null, 2));
        console.log(`💾 تم حفظ ${globalOfferMessages.length} رسالة عرض في الملف`);
    } catch (error) {
        console.error('خطأ في حفظ رسائل العروض:', error);
    }
}

// Load offer messages on startup
loadOfferMessagesFromFile();

// Get offer messages for a user
app.get('/api/offer-messages/:userId', (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const userMessages = globalOfferMessages.filter(msg => 
            msg.recipientId === userId && msg.status === 'pending'
        );
        
        res.json(userMessages);
    } catch (error) {
        console.error('Error getting offer messages:', error);
        res.status(500).json({ success: false, error: 'Failed to get offer messages' });
    }
});

// Save an offer message
app.post('/api/offer-messages', (req, res) => {
    try {
        const offerMessage = req.body;
        
        globalOfferMessages.push(offerMessage);
        saveOfferMessagesToFile();
        
        console.log(`📩 رسالة عرض جديدة من ${offerMessage.senderName} إلى ${offerMessage.recipientName}`);
        res.json({ success: true, message: 'Offer message saved' });
    } catch (error) {
        console.error('Error saving offer message:', error);
        res.status(500).json({ success: false, error: 'Failed to save offer message' });
    }
});

// Update offer message status (accept/reject)
app.put('/api/offer-messages/:messageId', (req, res) => {
    try {
        const messageId = req.params.messageId;
        const { status, response } = req.body;
        
        const messageIndex = globalOfferMessages.findIndex(msg => msg.id == messageId);
        if (messageIndex !== -1) {
            globalOfferMessages[messageIndex].status = status;
            if (response) {
                globalOfferMessages[messageIndex].response = response;
            }
            saveOfferMessagesToFile();
            
            console.log(`📩 تم تحديث حالة رسالة العرض ${messageId} إلى ${status}`);
            res.json({ success: true, message: 'Offer message updated' });
        } else {
            res.status(404).json({ success: false, error: 'Offer message not found' });
        }
    } catch (error) {
        console.error('Error updating offer message:', error);
        res.status(500).json({ success: false, error: 'Failed to update offer message' });
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🎮 GAMES SHOP Server running on http://0.0.0.0:${port}`);
    console.log('📦 Global offers storage initialized');
    console.log('🌐 All users will see offers in real-time');
    console.log('✅ Server is ready and accessible to users');
});
