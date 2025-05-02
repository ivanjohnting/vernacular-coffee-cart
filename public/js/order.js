document.addEventListener('DOMContentLoaded', () => {
    // Connect to Socket.io
    const socket = io();
    
    // DOM Elements
    const orderForm = document.getElementById('order-form');
    const countsTableBody = document.getElementById('counts-table-body');
    const modal = document.getElementById('order-confirmation');
    const closeModal = document.querySelector('.close');
    
    // Coffee items with their checkboxes and quantity controls
    const coffeeItems = [
        { id: 'hot-black', name: 'Hot Black Coffee' },
        { id: 'hot-white', name: 'Hot White Coffee' },
        { id: 'iced-black', name: 'Iced Black Coffee' },
        { id: 'iced-white', name: 'Iced White Coffee' },
        { id: 'hot-white-oat', name: 'Hot White Coffee (Oat Milk)' },
        { id: 'iced-white-oat', name: 'Iced White Coffee (Oat Milk)' }
    ];
    
    // Milk option toggles
    const hotWhiteCheck = document.getElementById('hot-white');
    const hotWhiteOat = document.getElementById('hot-white-oat');
    const icedWhiteCheck = document.getElementById('iced-white');
    const icedWhiteOat = document.getElementById('iced-white-oat');
    
    // Disable oat milk options initially if regular milk not selected
    hotWhiteOat.disabled = !hotWhiteCheck.checked;
    icedWhiteOat.disabled = !icedWhiteCheck.checked;
    
    // Set up quantity controls for all coffee items
    coffeeItems.forEach(item => {
        const checkbox = document.getElementById(item.id);
        const qtyControl = document.querySelector(`.quantity-control[data-for="${item.id}"]`);
        const decreaseBtn = qtyControl.querySelector('.qty-decrease');
        const increaseBtn = qtyControl.querySelector('.qty-increase');
        const qtyInput = qtyControl.querySelector('.qty-input');
        
        // Initially hide quantity controls for unchecked items
        qtyControl.style.display = checkbox.checked ? 'flex' : 'none';
        
        // Toggle quantity control visibility based on checkbox
        checkbox.addEventListener('change', () => {
            qtyControl.style.display = checkbox.checked ? 'flex' : 'none';
            
            // If this is an oat milk option, handle its parent
            if (item.id === 'hot-white-oat' || item.id === 'iced-white-oat') {
                // The visibility is already controlled by the disabled property
            } else {
                // Handle milk option toggles
                if (item.id === 'hot-white') {
                    hotWhiteOat.disabled = !checkbox.checked;
                    const oatQtyControl = document.querySelector(`.quantity-control[data-for="hot-white-oat"]`);
                    oatQtyControl.style.display = (checkbox.checked && hotWhiteOat.checked) ? 'flex' : 'none';
                } else if (item.id === 'iced-white') {
                    icedWhiteOat.disabled = !checkbox.checked;
                    const oatQtyControl = document.querySelector(`.quantity-control[data-for="iced-white-oat"]`);
                    oatQtyControl.style.display = (checkbox.checked && icedWhiteOat.checked) ? 'flex' : 'none';
                }
            }
        });
        
        // Quantity decrease button
        decreaseBtn.addEventListener('click', () => {
            let value = parseInt(qtyInput.value);
            if (value > 1) {
                qtyInput.value = value - 1;
            }
            updateButtons(qtyInput, decreaseBtn, increaseBtn);
        });
        
        // Quantity increase button
        increaseBtn.addEventListener('click', () => {
            let value = parseInt(qtyInput.value);
            const max = parseInt(qtyInput.getAttribute('max'));
            if (value < max) {
                qtyInput.value = value + 1;
            }
            updateButtons(qtyInput, decreaseBtn, increaseBtn);
        });
        
        // Update buttons state initially
        updateButtons(qtyInput, decreaseBtn, increaseBtn);
    });
    
    // Special handling for oat milk options
    hotWhiteOat.addEventListener('change', () => {
        const oatQtyControl = document.querySelector(`.quantity-control[data-for="hot-white-oat"]`);
        oatQtyControl.style.display = hotWhiteOat.checked ? 'flex' : 'none';
    });
    
    icedWhiteOat.addEventListener('change', () => {
        const oatQtyControl = document.querySelector(`.quantity-control[data-for="iced-white-oat"]`);
        oatQtyControl.style.display = icedWhiteOat.checked ? 'flex' : 'none';
    });
    
    // Load initial counts
    fetchOrderCounts();
    
    // Form submission handler
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const orderItems = [];
        
        // First, check if oat milk variants are selected
        const hotWhiteOatSelected = document.getElementById('hot-white-oat').checked;
        const icedWhiteOatSelected = document.getElementById('iced-white-oat').checked;
        
        // Process each coffee item with quantity
        coffeeItems.forEach(item => {
            const checkbox = document.getElementById(item.id);
            
            if (checkbox.checked) {
                // Skip regular hot white coffee if oat milk version is selected
                if (item.id === 'hot-white' && hotWhiteOatSelected) {
                    return;
                }
                
                // Skip regular iced white coffee if oat milk version is selected
                if (item.id === 'iced-white' && icedWhiteOatSelected) {
                    return;
                }
                
                // Process the item normally
                const qtyInput = document.querySelector(`.quantity-control[data-for="${item.id}"] .qty-input`);
                const quantity = parseInt(qtyInput.value);
                
                // Add multiple instances of the item based on quantity
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
                body: JSON.stringify({ items: orderItems })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Show confirmation modal
                modal.style.display = 'block';
                
                // Reset form
                orderForm.reset();
                
                // Reset all quantities to 1
                document.querySelectorAll('.qty-input').forEach(input => {
                    input.value = 1;
                });
                
                // Hide all quantity controls
                document.querySelectorAll('.quantity-control').forEach(control => {
                    control.style.display = 'none';
                });
                
                // Disable oat milk options
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
    
    // Helper function to update decrease/increase buttons state
    function updateButtons(input, decreaseBtn, increaseBtn) {
        const value = parseInt(input.value);
        const min = parseInt(input.getAttribute('min'));
        const max = parseInt(input.getAttribute('max'));
        
        decreaseBtn.disabled = value <= min;
        increaseBtn.disabled = value >= max;
    }
    
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
