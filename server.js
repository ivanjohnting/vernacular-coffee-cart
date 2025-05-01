const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Make sure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Database file path
const dbPath = process.env.NODE_ENV === 'production' 
  ? ':memory:'  // Use in-memory database for Heroku
  : path.join(dataDir, 'coffee_orders.db');  // Use file-based database for local development

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create tables sequentially to avoid race conditions
    db.serialize(() => {
      // Create orders table
      db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_items TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending'
      )`, (err) => {
        if (err) {
          console.error('Error creating orders table:', err.message);
        } else {
          console.log('Orders table ready');
        }
      });
      
      // Create order counts table
      db.run(`CREATE TABLE IF NOT EXISTS order_counts (
        item_name TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0
      )`, (err) => {
        if (err) {
          console.error('Error creating order_counts table:', err.message);
        } else {
          console.log('Order counts table ready');
          
          // Initialize menu items in counts table
          const menuItems = [
            'Hot Black Coffee', 
            'Hot White Coffee', 
            'Iced Black Coffee', 
            'Iced White Coffee',
            'Hot White Coffee (Oat Milk)',
            'Iced White Coffee (Oat Milk)'
          ];
          
          // Use a prepared statement for inserting menu items
          const stmt = db.prepare(`INSERT OR IGNORE INTO order_counts (item_name, count) VALUES (?, 0)`);
          
          menuItems.forEach(item => {
            stmt.run(item, (err) => {
              if (err) {
                console.error(`Error initializing count for ${item}:`, err.message);
              }
            });
          });
          
          // Finalize the prepared statement
          stmt.finalize(() => {
            console.log('Menu items initialized in counts table');
          });
        }
      });
    });
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/barista', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'barista.html'));
});

// API endpoints
app.get('/api/orders', (req, res) => {
  db.all(`SELECT * FROM orders WHERE status != 'completed' ORDER BY timestamp ASC`, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/counts', (req, res) => {
  db.all(`SELECT * FROM order_counts ORDER BY item_name`, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/orders', (req, res) => {
  const orderItems = req.body.items;
  
  if (!orderItems || orderItems.length === 0) {
    res.status(400).json({ error: 'Order items are required' });
    return;
  }

  db.run(`INSERT INTO orders (order_items) VALUES (?)`, [JSON.stringify(orderItems)], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const orderId = this.lastID;
    
    // Update counts for each item
    orderItems.forEach(item => {
      db.run(`UPDATE order_counts SET count = count + 1 WHERE item_name = ?`, [item]);
    });
    
    // Notify connected clients about the new order
    io.emit('new-order', { id: orderId, order_items: orderItems, timestamp: new Date(), status: 'pending' });
    
    res.json({ id: orderId, success: true });
  });
});

app.put('/api/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const status = req.body.status;
  
  if (!status) {
    res.status(400).json({ error: 'Status is required' });
    return;
  }
  
  db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, orderId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    // Notify connected clients about the status update
    io.emit('order-updated', { id: orderId, status });
    
    res.json({ success: true });
  });
});

// Socket connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
