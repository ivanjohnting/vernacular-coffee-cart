document.addEventListener('DOMContentLoaded', () => {
    // Connect to Socket.io
    const socket = io();
    
    // DOM Elements
    const pendingOrdersContainer = document.getElementById('pending-orders');
    const completedOrdersContainer = document.getElementById('completed-orders');
    const countsTableBody = document.getElementById('counts-table-body');
    const newOrderSound = document.getElementById('new-order-sound');
    const resetButton = document.getElementById('reset-button');
    const resetKey = document.getElementById('reset-key');
    const resetMessage = document.querySelector('.reset-message');
    
    // Load initial data
    fetchOrders();
    fetchOrderCounts();
    
    // Socket events
    socket.on('new-order', (order) => {
        // Play sound notification
        newOrderSound.play();
        
        // Add the new order to the UI
        const orderElement = createOrderElement(order);
        orderElement.classList.add('new-order');
        
        // Remove empty message if it exists
        const emptyMessage = pendingOrdersContainer.querySelector('.empty-message');
        if (emptyMessage) {
            pendingOrdersContainer.removeChild(emptyMessage);
        }
        
        // Add order to the beginning of the list
        if (pendingOrdersContainer.firstChild) {
            pendingOrdersContainer.insertBefore(orderElement, pendingOrdersContainer.firstChild);
        } else {
            pendingOrdersContainer.appendChild(orderElement);
        }
    });
    
    socket.on('order-updated', (updatedOrder) => {
        // Find and update the order in the UI
        const orderElement = document.querySelector(`.order-card[data-id="${updatedOrder.id}"]`);
        
        if (orderElement && updatedOrder.status === 'completed') {
            // Move to completed section
            pendingOrdersContainer.removeChild(orderElement);
            
            // Remove empty message if it exists
            const emptyMessage = completedOrdersContainer.querySelector('.empty-message');
            if (emptyMessage) {
                completedOrdersContainer.removeChild(emptyMessage);
            }
            
            // Remove action buttons
            const actionsDiv = orderElement.querySelector('.order-actions');
            if (actionsDiv) {
                orderElement.removeChild(actionsDiv);
            }
            
            // Add completed status
            const statusDiv = document.createElement('div');
            statusDiv.className = 'order-status';
            statusDiv.textContent = 'Completed';
            orderElement.appendChild(statusDiv);
            
            // Add to completed orders
            completedOrdersContainer.insertBefore(orderElement, completedOrdersContainer.firstChild);
            
            // Check if pending orders is now empty
            if (pendingOrdersContainer.childElementCount === 0) {
                const emptyMessage = document.createElement('p');
                emptyMessage.className = 'empty-message';
                emptyMessage.textContent = 'No pending orders.';
                pendingOrdersContainer.appendChild(emptyMessage);
            }
        } else if (orderElement && updatedOrder.status === 'cancelled') {
            // Remove from UI
            pendingOrdersContainer.removeChild(orderElement);
            
            // Check if pending orders is now empty
            if (pendingOrdersContainer.childElementCount === 0) {
                const emptyMessage = document.createElement('p');
                emptyMessage.className = 'empty-message';
                emptyMessage.textContent = 'No pending orders.';
                pendingOrdersContainer.appendChild(emptyMessage);
            }
        }
    });
    
    socket.on('counts-updated', () => {
        fetchOrderCounts();
    });
    
    socket.on('data-reset', () => {
        // Reset the UI after a data reset
        fetchOrders();
        fetchOrderCounts();
        resetMessage.textContent = 'All data has been reset successfully!';
        resetMessage.classList.add('success-message');
        setTimeout(() => {
            resetMessage.textContent = '';
            resetMessage.classList.remove('success-message');
        }, 5000);
    });
    
    // Add reset button event listener
    resetButton.addEventListener('click', async () => {
        const key = resetKey.value.trim();
        
        if (!key) {
            resetMessage.textContent = 'Please enter the reset key.';
            resetMessage.classList.add('error-message');
            setTimeout(() => {
                resetMessage.textContent = '';
                resetMessage.classList.remove('error-message');
            }, 5000);
            return;
        }
        
        try {
            const response = await fetch('/api/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                resetKey.value = ''; // Clear the input field
            } else {
                resetMessage.textContent = data.error || 'Error resetting data. Please try again.';
                resetMessage.classList.add('error-message');
                setTimeout(() => {
                    resetMessage.textContent = '';
                    resetMessage.classList.remove('error-message');
                }, 5000);
            }
        } catch (error) {
            console.error('Error:', error);
            resetMessage.textContent = 'Server error. Please try again.';
            resetMessage.classList.add('error-message');
            setTimeout(() => {
                resetMessage.textContent = '';
                resetMessage.classList.remove('error-message');
            }, 5000);
        }
    });
    
    // Function to fetch and display orders
    function fetchOrders() {
        fetch('/api/orders')
            .then(response => response.json())
            .then(orders => {
                pendingOrdersContainer.innerHTML = '';
                completedOrdersContainer.innerHTML = '';
                
                if (orders.length === 0) {
                    const emptyMessage = document.createElement('p');
                    emptyMessage.className = 'empty-message';
                    emptyMessage.textContent = 'No pending orders.';
                    pendingOrdersContainer.appendChild(emptyMessage);
                } else {
                    orders.forEach(order => {
                        const orderElement = createOrderElement(order);
                        pendingOrdersContainer.appendChild(orderElement);
                    });
                }
                
                // Add empty message to completed orders initially
                const emptyCompletedMessage = document.createElement('p');
                emptyCompletedMessage.className = 'empty-message';
                emptyCompletedMessage.textContent = 'No completed orders.';
                completedOrdersContainer.appendChild(emptyCompletedMessage);
            })
            .catch(error => {
                console.error('Error fetching orders:', error);
            });
    }
    
    // Function to create order element
    function createOrderElement(order) {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-card';
        orderElement.dataset.id = order.id;
        
        const orderItems = JSON.parse(order.order_items);
        const timestamp = new Date(order.timestamp);
        
        orderElement.innerHTML = `
            <div class="order-id">Order #${order.id}</div>
            <div class="order-time">${formatTime(timestamp)}</div>
            <ul class="order-items">
                ${orderItems.map(item => `<li>${item}</li>`).join('')}
            </ul>
            <div class="order-actions">
                <button class="btn btn-complete" data-id="${order.id}">Complete</button>
                <button class="btn btn-cancel" data-id="${order.id}">Cancel</button>
            </div>
        `;
        
        // Add event listeners for action buttons
        orderElement.querySelector('.btn-complete').addEventListener('click', () => {
            completeOrder(order.id);
        });
        
        orderElement.querySelector('.btn-cancel').addEventListener('click', () => {
            cancelOrder(order.id);
        });
        
        return orderElement;
    }
    
    // Function to complete an order
    function completeOrder(orderId) {
        fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'completed' })
        })
            .then(response => response.json())
            .catch(error => {
                console.error('Error completing order:', error);
            });
    }
    
    // Function to cancel an order
    function cancelOrder(orderId) {
        fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'cancelled' })
        })
            .then(response => response.json())
            .catch(error => {
                console.error('Error cancelling order:', error);
            });
    }
    
    // Function to fetch and display order counts
    function fetchOrderCounts() {
        fetch('/api/counts')
            .then(response => response.json())
            .then(data => {
                countsTableBody.innerHTML = '';
                
                data.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.item_name}</td>
                        <td>${item.count}</td>
                    `;
                    countsTableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error fetching counts:', error);
            });
    }
    
    // Helper function to format time
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
});
