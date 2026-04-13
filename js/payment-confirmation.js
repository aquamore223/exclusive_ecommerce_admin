// payment-confirmation.js - Handles payment confirmation and delivery management

// ==================== PAYMENT & DELIVERY MANAGEMENT ====================

// Confirm payment for COD order (called after delivery)
async function confirmCODOrder(orderId) {
    if (!confirm('Confirm that cash payment has been received for this order?')) return;
    
    try {
        const updatedOrder = await pb.collection("orders").update(orderId, {
            paymentStatus: 'paid',
            paymentConfirmedAt: new Date().toISOString(),
            paymentConfirmedBy: pb.authStore.model?.email || 'admin',
            updated: new Date().toISOString()
            // Do NOT change orderStatus - it should already be 'delivered'
        }, {
            $autoCancel: false
        });
        
        console.log("Payment confirmed:", updatedOrder);
        showNotification('✅ Cash payment confirmed!', 'success');
        
        // Reload orders to update the display
        if (typeof loadOrders === 'function') {
            await loadOrders();
        }
        
        // Send confirmation email
        await sendPaymentConfirmationEmail(updatedOrder);
        
        // Record in payment history
        await recordPaymentConfirmation(orderId, updatedOrder.total, 'cash_on_delivery');
        
    } catch (error) {
        console.error("Error confirming payment:", error);
        showNotification('Error confirming payment: ' + error.message, 'error');
    }
}

// Mark order as shipped
async function markOrderShipped(orderId) {
    if (!confirm('Mark this order as shipped?')) return;
    
    try {
        const updatedOrder = await pb.collection("orders").update(orderId, {
            orderStatus: 'shipped',
            shippedAt: new Date().toISOString(),
            updated: new Date().toISOString()
        }, {
            $autoCancel: false
        });
        
        showNotification('📦 Order marked as shipped!', 'success');
        if (typeof loadOrders === 'function') await loadOrders();
        
    } catch (error) {
        console.error("Error updating order:", error);
        showNotification('Error updating order: ' + error.message, 'error');
    }
}

// Mark order as delivered (without payment confirmation)
async function markOrderDelivered(orderId) {
    if (!confirm('Mark this order as delivered?')) return;
    
    try {
        const updatedOrder = await pb.collection("orders").update(orderId, {
            orderStatus: 'delivered',
            deliveredAt: new Date().toISOString(),
            updated: new Date().toISOString()
            // Do NOT change paymentStatus - keep as 'pending' for COD
        }, {
            $autoCancel: false
        });
        
        showNotification('📦 Order marked as delivered!', 'success');
        if (typeof loadOrders === 'function') await loadOrders();
        
    } catch (error) {
        console.error("Error updating order:", error);
        showNotification('Error updating order: ' + error.message, 'error');
    }
}

// Mark order as processing
async function markOrderProcessing(orderId) {
    if (!confirm('Start processing this order?')) return;
    
    try {
        await pb.collection("orders").update(orderId, {
            orderStatus: 'processing',
            processingStartedAt: new Date().toISOString(),
            updated: new Date().toISOString()
        }, {
            $autoCancel: false
        });
        
        showNotification('Order is now being processed!', 'success');
        if (typeof loadOrders === 'function') await loadOrders();
        
    } catch (error) {
        console.error("Error updating order:", error);
        showNotification('Error updating order: ' + error.message, 'error');
    }
}

// Cancel order
async function cancelOrder(orderId) {
    const reason = prompt('Reason for cancellation (optional):');
    
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    try {
        await pb.collection("orders").update(orderId, {
            orderStatus: 'cancelled',
            paymentStatus: 'refunded',
            cancellationReason: reason || 'No reason provided',
            cancelledAt: new Date().toISOString(),
            cancelledBy: pb.authStore.model?.email || 'admin',
            updated: new Date().toISOString()
        }, {
            $autoCancel: false
        });
        
        showNotification('Order cancelled successfully!', 'success');
        if (typeof loadOrders === 'function') await loadOrders();
        
    } catch (error) {
        console.error("Error cancelling order:", error);
        showNotification('Error cancelling order: ' + error.message, 'error');
    }
}

// Bulk confirm payments for multiple orders
async function bulkConfirmPayments(orderIds) {
    if (!confirm(`Confirm payment for ${orderIds.length} orders?`)) return;
    
    let successCount = 0;
    let failCount = 0;
    
    for (const orderId of orderIds) {
        try {
            await pb.collection("orders").update(orderId, {
                paymentStatus: 'paid',
                orderStatus: 'delivered',
                paymentConfirmedAt: new Date().toISOString(),
                paymentConfirmedBy: pb.authStore.model?.email || 'admin',
                updated: new Date().toISOString()
            }, { $autoCancel: false });
            successCount++;
        } catch (error) {
            console.error(`Failed to confirm order ${orderId}:`, error);
            failCount++;
        }
    }
    
    showNotification(`✅ ${successCount} orders confirmed, ${failCount} failed`, 'success');
    if (typeof loadOrders === 'function') await loadOrders();
}

// Send payment confirmation email
async function sendPaymentConfirmationEmail(order) {
    try {
        // Integrate with your email service
        console.log(`📧 Payment confirmation email would be sent to ${order.email}`);
        console.log(`Order #${order.orderId} - Total: ${formatPrice(order.total)}`);
        
        // Example using a webhook or email API
        // await fetch('/api/send-payment-email', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         to: order.email,
        //         orderId: order.orderId,
        //         total: order.total,
        //         customerName: order.customerName
        //     })
        // });
        
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

// Record payment in history
async function recordPaymentConfirmation(orderId, amount, method) {
    try {
        // Check if payment_history collection exists
        try {
            await pb.collection("payment_history").create({
                orderId: orderId,
                amount: amount,
                paymentMethod: method,
                status: 'completed',
                confirmedBy: pb.authStore.model?.email || 'admin',
                confirmedAt: new Date().toISOString(),
                notes: 'Payment received'
            });
            console.log("✅ Payment recorded in history");
        } catch (e) {
            // Collection might not exist, just log
            console.log("Payment history collection not found, skipping record");
        }
    } catch (error) {
        console.error("Error recording payment:", error);
    }
}

// Get order statistics for COD payments
async function getCODPaymentStats() {
    try {
        const orders = await pb.collection("orders").getFullList({
            filter: `paymentMethod = "cash_on_delivery"`,
            $autoCancel: false
        });
        
        const pendingPayments = orders.filter(o => o.paymentStatus === 'pending').length;
        const completedPayments = orders.filter(o => o.paymentStatus === 'paid').length;
        const totalPendingAmount = orders
            .filter(o => o.paymentStatus === 'pending')
            .reduce((sum, o) => sum + o.total, 0);
        
        return {
            pendingPayments,
            completedPayments,
            totalPendingAmount,
            totalOrders: orders.length
        };
    } catch (error) {
        console.error("Error getting COD stats:", error);
        return null;
    }
}

// Display COD stats in admin panel
async function displayCODStats() {
    const stats = await getCODPaymentStats();
    if (!stats) return;
    
    const statsContainer = document.getElementById('cod-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-clock"></i></div>
                <div class="stat-info">
                    <h3>${stats.pendingPayments}</h3>
                    <p>Pending COD Payments</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                <div class="stat-info">
                    <h3>${stats.completedPayments}</h3>
                    <p>Completed Payments</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
                <div class="stat-info">
                    <h3>${formatPrice(stats.totalPendingAmount)}</h3>
                    <p>Pending Amount</p>
                </div>
            </div>
        `;
    }
}

// Export functions to global scope
window.confirmCODOrder = confirmCODOrder;
window.markOrderShipped = markOrderShipped;
window.markOrderDelivered = markOrderDelivered;
window.markOrderProcessing = markOrderProcessing;
window.cancelOrder = cancelOrder;
window.bulkConfirmPayments = bulkConfirmPayments;
window.getCODPaymentStats = getCODPaymentStats;
window.displayCODStats = displayCODStats;

console.log("✅ Payment confirmation module loaded");