document.addEventListener('DOMContentLoaded', () => {
    // Connect to Socket.io
    const socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });
    
    // DOM Elements
    const pendingOrdersContainer = document.getElementById('pending-orders');
    const completedOrdersContainer = document.getElementById('completed-orders');
    const countsTableBody = document.getElementById('counts-table-body');
    const newOrderSound = document.getElementById('new-order-sound');
    const resetButton = document.getElementById('reset-button');
    const resetKey = document.getElementById('reset-key');
    const resetMessage = document.querySelector('.reset-message');
    const connectionStatus = document.createElement('div');
    
    // Add connection status indicator
    connectionStatus.className = 'connection-status';
    document.querySelector('header').appendChild(connectionStatus);
    
    // Socket connection events
    socket.on('connect', () => {
        console.log('Connected to server');
        connectionStatus.textContent = '● Connected';
        connectionStatus.className = 'connection-status connected';
        
        // Load initial data
        fetchOrders();
        fetchOrderCounts();
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        connectionStatus.textContent = '● Disconnected';
        connectionStatus.className = 'connection-status disconnected';
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        connectionStatus.textContent = '● Connection Error';
        connectionStatus.className = 'connection-status error';
    });
    
    // Implement heartbeat to keep connection alive
    setInterval(() => {
        if (socket.connected) {
            socket.emit('ping');
        }
    }, 30000); // Every 30 seconds
    
    socket.on('pong', () => {
        console.log('Heartbeat received');
    });
    
    // Handle initial orders when connecting
    socket.on('initial-orders', (orders) => {
        console.log('Received initial orders:', orders);
        renderOrders(orders);
    });
    
    // Socket events for real-time updates
    socket.on('new-order', (order) => {
        console.log('New order received:', order);
        
        // Play sound notification
        newOrderSound.play().catch(err => console.error('Error playing sound:', err));
        
        // Create element for the new order
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
        
        // Update order counts
        fetchOrderCounts();
    });
    
    socket.on('order-updated', (updatedOrder) => {
        console.log('Order updated:', updatedOrder);
        
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
                renderOrders(orders);
            })
            .catch(error => {
                console.error('Error fetching orders:', error);
            });
    }
    
    // Function to render orders
    function renderOrders(orders) {
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
    }
    
    // Function to create order element
    function createOrderElement(order) {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-card';
        orderElement.dataset.id = order.id;
        
        // Parse order items if they're a string
        let orderItems;
        try {
            orderItems = typeof order.order_items === 'string' 
                ? JSON.parse(order.order_items) 
                : order.order_items;
        } catch (e) {
            console.error('Error parsing order items:', e);
            orderItems = ['Error loading items'];
        }
        
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
