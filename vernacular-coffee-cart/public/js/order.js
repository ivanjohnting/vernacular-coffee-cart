document.addEventListener('DOMContentLoaded', () => {
    // Connect to Socket.io
    const socket = io();
    
    // DOM Elements
    const orderForm = document.getElementById('order-form');
    const countsTableBody = document.getElementById('counts-table-body');
    const modal = document.getElementById('order-confirmation');
    const closeModal = document.querySelector('.close');
    
    // Milk option toggles
    const hotWhiteCheck = document.getElementById('hot-white');
    const hotWhiteOat = document.getElementById('hot-white-oat');
    const icedWhiteCheck = document.getElementById('iced-white');
    const icedWhiteOat = document.getElementById('iced-white-oat');
    
    // Disable oat milk options initially if regular milk not selected
    hotWhiteOat.disabled = !hotWhiteCheck.checked;
    icedWhiteOat.disabled = !icedWhiteCheck.checked;
    
    // Listen for change on regular milk options
    hotWhiteCheck.addEventListener('change', () => {
        hotWhiteOat.disabled = !hotWhiteCheck.checked;
        if (!hotWhiteCheck.checked) {
            hotWhiteOat.checked = false;
        }
    });
    
    icedWhiteCheck.addEventListener('change', () => {
        icedWhiteOat.disabled = !icedWhiteCheck.checked;
        if (!icedWhiteCheck.checked) {
            icedWhiteOat.checked = false;
        }
    });
    
    // Load initial counts
    fetchOrderCounts();
    
    // Form submission handler
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const orderItems = [];
        
        // Hot Black Coffee
        if (document.getElementById('hot-black').checked) {
            orderItems.push('Hot Black Coffee');
        }
        
        // Hot White Coffee (regular or oat milk)
        if (hotWhiteCheck.checked) {
            if (hotWhiteOat.checked) {
                orderItems.push('Hot White Coffee (Oat Milk)');
            } else {
                orderItems.push('Hot White Coffee');
            }
        }
        
        // Iced Black Coffee
        if (document.getElementById('iced-black').checked) {
            orderItems.push('Iced Black Coffee');
        }
        
        // Iced White Coffee (regular or oat milk)
        if (icedWhiteCheck.checked) {
            if (icedWhiteOat.checked) {
                orderItems.push('Iced White Coffee (Oat Milk)');
            } else {
                orderItems.push('Iced White Coffee');
            }
        }
        
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
                body: JSON.stringify({ items: orderItems })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Show confirmation modal
                modal.style.display = 'block';
                
                // Reset form
                orderForm.reset();
                hotWhiteOat.disabled = true;
                icedWhiteOat.disabled = true;
                
                // Update counts
                fetchOrderCounts();
            } else {
                alert('Error placing order. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error placing order. Please try again.');
        }
    });
    
    // Close modal when the x is clicked
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Socket event for order count updates
    socket.on('counts-updated', () => {
        fetchOrderCounts();
    });
    
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
});
