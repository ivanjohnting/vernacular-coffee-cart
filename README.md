# Vernacular Coffee Cart

A simple web application to manage coffee orders for a wedding coffee cart service. The application allows taking coffee orders and transmitting them to baristas in real-time while keeping track of order statistics.

## Features

- Take orders for various coffee types (hot/iced, black/white)
- Option for oat milk alternatives
- Real-time order transmission to baristas
- Chronological order management
- Order status tracking (pending, completed, cancelled)
- Coffee type counting statistics
- Sound notifications for new orders
- Mobile-responsive design

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Usage

### Order Taking Interface (Main Page)

- Check the coffee items to add to an order
- For white coffees, you can optionally select oat milk
- Submit the order to send it to the barista
- View current order counts at the bottom of the page

### Barista View

- Access via the "Barista View" link at the bottom of the main page
- See pending orders in chronological order
- Complete or cancel orders with the action buttons
- View completed orders and overall statistics
- Receive sound notifications when new orders arrive

## Deployment

### Deploying to Heroku

1. Create a Heroku account if you don't have one
2. Install the Heroku CLI
3. Login to Heroku:

```bash
heroku login
```

4. Create a new Heroku app:

```bash
heroku create vernacular-coffee-cart
```

5. Push your code to Heroku:

```bash
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

### Deploying to Netlify

1. Create a `netlify.toml` file in the project root:

```toml
[build]
  functions = "functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. Sign up for Netlify and connect your repository
3. Deploy from the Netlify dashboard

## Technologies Used

- Node.js and Express for the server
- Socket.IO for real-time communication
- SQLite for data storage
- Vanilla JavaScript for front-end functionality
- CSS for styling

## License

This project is licensed under the MIT License.
