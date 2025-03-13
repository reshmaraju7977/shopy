const express = require('express');
const app = express();
const bodyParser = require('body-parser'); // Use semicolon here instead of comma
const cors = require('cors');
require('dotenv/config');
const connectDB = require('./config/db');


app.use(cors());
app.options('*', cors());

app.use(bodyParser.json());

// const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');

const PORT = process.env.PORT || 8080;

// app.use(`/api/users`, usersRoutes);
app.use("/uploads",express.static("uploads"));
app.use(`/api/category`, categoryRoutes);
app.use(`/api/products`, productRoutes);

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log("Connected to DB");
        console.log("Server is running on port " + PORT);
    });
});
