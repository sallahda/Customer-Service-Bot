const { MongoClient } = require('mongodb');
require('dotenv').config()

// Replace with your MongoDB connection string

const client = new MongoClient(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

const dbName = 'mockDb';
const collectionName = 'customers';

const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateRandomCustomer = () => {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'William'];
  const lastNames = ['Smith', 'Doe', 'Johnson', 'Brown', 'Taylor'];

  const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  const birthYear = getRandomNumber(1950, 2000);
  const birthMonth = getRandomNumber(1, 12);
  const birthDay = getRandomNumber(1, 28);

  const orders = generateRandomOrders(); // Add this line

  return {
    customerNumber: getRandomNumber(100000, 999999),
    firstName: randomFirstName,
    lastName: randomLastName,
    dateOfBirth: new Date(`${birthYear}-${birthMonth}-${birthDay}`),
    orders, 
  };
};

const generateRandomOrders = () => {
  const orderStatuses = ['pending', 'shipped', 'delivered', 'canceled'];
  const products = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'];

  const numOrders = getRandomNumber(1, 5);
  const orders = [];

  for (let i = 0; i < numOrders; i++) {
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const randomStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const randomQuantity = getRandomNumber(1, 10);
    const randomOrderDate = new Date(Date.now() - getRandomNumber(1, 30) * 24 * 60 * 60 * 1000);
    
    // Generate a random 8-digit order number
    const randomOrderNumber = getRandomNumber(10000000, 99999999);

    const order = {
      orderNumber: randomOrderNumber, // Add this line
      product: randomProduct,
      status: randomStatus,
      quantity: randomQuantity,
      orderDate: randomOrderDate,
    };

    orders.push(order);
  }

  return orders;
};

async function run() {
  try {
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const customers = Array.from({ length: 5 }, () => generateRandomCustomer());

    const result = await collection.insertMany(customers);
    console.log(`Successfully inserted ${result.insertedCount} customers`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

run();
