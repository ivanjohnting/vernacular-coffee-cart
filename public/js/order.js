document.addEventListener('DOMContentLoaded', () => {
    // Connect to Socket.io
    const socket = io();
    
    // DOM Elements
    const orderForm = document.getElementById('order-form');
    const countsTableBody = document.getElementById('counts-table-body');
    const modal = document.getElementById('confirmation-modal');
    const closeModal = document.querySelector('.close');
    
    // Coffee items with their checkboxes and quantity controls
    const coffeeItems = [
        { id: 'hot-black', name: 'Hot Black Coffee' },
        { id: 'hot-white', name: 'Hot White Coffee' },
        { id: 'hot-white-oat', name: 'Hot White Coffee with Oat Milk' },
        { id: 'iced-black', name: 'Iced Black Coffee' },
        { id: 'iced-white', name: 'Iced White Coffee' },
        { id: 'iced-white-oat', name: 'Iced White Coffee with Oat Milk' }
    ];
    
    // Initialize quantity controls for each coffee item
    coffeeItems.forEach(item => {
        const checkbox = document.getElementById(item.id);
        const quantityControl = document.getElementById(`${item.id}-quantity`);
        const minusBtn = quantityControl.querySelector('.minus');
        const plusBtn = quantityControl.querySelector('.plus');
        const qtyInput = document.getElementById(`${item.id}-qty`);
        
        // Show/hide quantity controls based on checkbox state
        checkbox.addEventListener('change', () => {
            quantityControl.style.display = checkbox.checked ? 'flex' : 'none';
        });
        
        // Decrease quantity button
        minusBtn.addEventListener('click', () => {
            const currentValue = parseInt(qtyInput.value);
            if (currentValue > 1) {
                qtyInput.value = currentValue - 1;
            }
        });
        
        // Increase quantity button
        plusBtn.addEventListener('click', () => {
            const currentValue = parseInt(qtyInput.value);
            if (currentValue < 5) {
                qtyInput.value = currentValue + 1;
            }
        });
    });
    
    // Load initial order statistics
    fetchOrderCounts();
    
    // Listen for real-time statistics updates
    socket.on('counts-updated', () => {
        fetchOrderCounts();
    });
    
    // Form submission handler
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const customerName = document.getElementById('customer-name').value.trim();
        if (!customerName) {
            alert('Please enter your name');
            return;
        }
        
        const orderItems = [];
        
        // Process each coffee item with quantity
        coffeeItems.forEach(item => {
            const checkbox = document.getElementById(item.id);
            
            if (checkbox.checked) {
                const qtyInput = document.getElementById(`${item.id}-qty`);
                const quantity = parseInt(qtyInput.value);
                
                // Add coffee items based on quantity
                for (let i = 0; i < quantity; i++) {
                    orderItems.push(item.name);
                }
            }
        });
        
        // Validate if at least one item is selected
        if (orderItems.length === 0) {
            alert('Please select at least one coffee item!');
            return;
        }
        
        try {
            // Send order to server
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    items: orderItems,
                    customerName: customerName
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Clear form
                coffeeItems.forEach(item => {
                    const checkbox = document.getElementById(item.id);
                    checkbox.checked = false;
                    const quantityControl = document.getElementById(`${item.id}-quantity`);
                    quantityControl.style.display = 'none';
                    const qtyInput = document.getElementById(`${item.id}-qty`);
                    qtyInput.value = 1;
                });
                document.getElementById('customer-name').value = '';
                
                // Update order statistics
                fetchOrderCounts();
                
                // Show confirmation modal
                modal.style.display = 'block';
                
                // Close modal after 3 seconds
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 3000);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error submitting order:', error);
            alert('An error occurred while submitting your order. Please try again.');
        }
    });
    
    // Function to fetch and display order counts
    function fetchOrderCounts() {
        fetch('/api/counts')
            .then(response => response.json())
            .then(data => {
                if (!countsTableBody) return;
                
                countsTableBody.innerHTML = '';
                
                if (data.length === 0) {
                    const emptyRow = document.createElement('tr');
                    emptyRow.innerHTML = '<td colspan="2" class="empty-message">No orders yet</td>';
                    countsTableBody.appendChild(emptyRow);
                } else {
                    data.forEach(item => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${item.item_name}</td>
                            <td>${item.count}</td>
                        `;
                        countsTableBody.appendChild(row);
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching counts:', error);
            });
    }
    
    // Close modal when the x is clicked
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});
