
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
        
        // Find user
        const user = registeredUsers.find(u => u.email === email && u.password === password);
        if (!user) {
            return res.status(401).json({ success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ success: false, error: 'خطأ في تسجيل الدخول' });
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

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🎮 GAMES SHOP Server running on http://0.0.0.0:${port}`);
    console.log('📦 Global offers storage initialized');
    console.log('🌐 All users will see offers in real-time');
    console.log('✅ Server is ready and accessible to users');
});
