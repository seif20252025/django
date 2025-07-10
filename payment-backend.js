
// Payment Backend Service
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('.'));

// Global offers storage
let globalOffers = [];

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
    res.json(globalOffers);
});

app.post('/api/offers', (req, res) => {
    try {
        const offer = req.body;
        globalOffers.unshift(offer);
        res.json({ success: true, offers: globalOffers });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to save offer' });
    }
});

app.delete('/api/offers/:offerId', (req, res) => {
    try {
        const offerId = parseFloat(req.params.offerId);
        globalOffers = globalOffers.filter(offer => offer.id !== offerId);
        res.json({ success: true, offers: globalOffers });
    } catch (error) {
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
            res.json({ success: true, offer: offer });
        } else {
            res.status(404).json({ success: false, error: 'Offer not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to like offer' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`Payment server running on port ${port}`);
});

module.exports = app;
