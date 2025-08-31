const express = require('express');
const path = require('path');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { gql } = require('graphql-tag');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: isProduction ? process.env.ALLOWED_ORIGINS?.split(',') : true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the current directory
app.use(express.static(__dirname));

// In-memory data store for juices
let juices = [
  { id: '1', name: 'Orange Juice', description: 'Freshly squeezed oranges', price: 4.99, category: 'Fruit', inStock: true, imageUrl: './images/first.jpg' },
  { id: '2', name: 'Green Detox', description: 'Spinach, kale, and apple blend', price: 5.99, category: 'Vegetable', inStock: true, imageUrl: './images/second.jpg' },
  { id: '3', name: 'Berry Blast', description: 'Mixed berries with yogurt', price: 6.99, category: 'Smoothie', inStock: true, imageUrl: './images/third.jpg' },
  { id: '4', name: 'Carrot Boost', description: 'Fresh carrots with ginger', price: 4.49, category: 'Vegetable', inStock: false, imageUrl: './images/look.jpg' },
  { id: '5', name: 'Pineapple Paradise', description: 'Tropical pineapple with coconut', price: 7.99, category: 'Fruit', inStock: true, imageUrl: './images/first.jpg' }
];

// In-memory data store for orders
let orders = [
  { id: '1', customerName: 'Pavan', items: ['1', '2'], total: 10.98, status: 'completed', createdAt: new Date('2024-01-15') },
  { id: '2', customerName: 'Sunny', items: ['3'], total: 6.99, status: 'pending', createdAt: new Date('2024-01-16') }
];

// GraphQL Schema
const typeDefs = gql`
  type Juice {
    id: ID!
    name: String!
    description: String!
    price: Float!
    category: String!
    inStock: Boolean!
    imageUrl: String
  }

  type Order {
    id: ID!
    customerName: String!
    items: [String!]!
    total: Float!
    status: String!
    createdAt: String!
    juices: [Juice!]!
  }

  type Query {
    juices: [Juice!]!
    juice(id: ID!): Juice
    juicesByCategory(category: String!): [Juice!]!
    orders: [Order!]!
    order(id: ID!): Order
    searchJuices(query: String!): [Juice!]!
  }

  input JuiceInput {
    name: String!
    description: String
    price: Float!
    category: String
    inStock: Boolean
    imageUrl: String
  }

  input OrderInput {
    customerName: String!
    items: [String!]!
  }

  type Mutation {
    createJuice(input: JuiceInput!): Juice!
    updateJuice(id: ID!, input: JuiceInput!): Juice!
    deleteJuice(id: ID!): Boolean!
    createOrder(input: OrderInput!): Order!
    updateOrderStatus(id: ID!, status: String!): Order!
  }

  type Subscription {
    juiceAdded: Juice!
    orderCreated: Order!
  }
`;

// GraphQL Resolvers
const resolvers = {
  Query: {
    juices: () => juices,
    juice: (_, { id }) => juices.find(j => j.id === id),
    juicesByCategory: (_, { category }) => juices.filter(j => j.category === category),
    orders: () => orders,
    order: (_, { id }) => orders.find(o => o.id === id),
    searchJuices: (_, { query }) => {
      const lowercaseQuery = query.toLowerCase();
      return juices.filter(j => 
        j.name.toLowerCase().includes(lowercaseQuery) ||
        j.description.toLowerCase().includes(lowercaseQuery) ||
        j.category.toLowerCase().includes(lowercaseQuery)
      );
    }
  },
  Order: {
    juices: (parent) => {
      return parent.items.map(itemId => juices.find(j => j.id === itemId)).filter(Boolean);
    }
  },
  Mutation: {
    createJuice: (_, { input }) => {
      const newJuice = {
        id: (juices.length + 1).toString(),
        ...input,
        inStock: input.inStock !== undefined ? input.inStock : true
      };
      juices.push(newJuice);
      return newJuice;
    },
    updateJuice: (_, { id, input }) => {
      const juiceIndex = juices.findIndex(j => j.id === id);
      if (juiceIndex === -1) throw new Error('Juice not found');
      
      juices[juiceIndex] = { ...juices[juiceIndex], ...input };
      return juices[juiceIndex];
    },
    deleteJuice: (_, { id }) => {
      const juiceIndex = juices.findIndex(j => j.id === id);
      if (juiceIndex === -1) throw new Error('Juice not found');
      
      juices.splice(juiceIndex, 1);
      return true;
    },
    createOrder: (_, { input }) => {
      const total = input.items.reduce((sum, itemId) => {
        const juice = juices.find(j => j.id === itemId);
        return sum + (juice ? juice.price : 0);
      }, 0);

      const newOrder = {
        id: (orders.length + 1).toString(),
        ...input,
        total,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      orders.push(newOrder);
      return newOrder;
    },
    updateOrderStatus: (_, { id, status }) => {
      const order = orders.find(o => o.id === id);
      if (!order) throw new Error('Order not found');
      
      order.status = status;
      return order;
    }
  }
};

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    return error;
  }
  // Removed playground plugin - no interactive GraphQL interface
});

// REST API Endpoints (keeping for backward compatibility)
app.get('/api/juices', (req, res) => {
  res.json(juices);
});

app.get('/api/juices/:id', (req, res) => {
  const juice = juices.find(j => j.id === req.params.id);
  if (!juice) return res.status(404).json({ message: 'Juice not found' });
  res.json(juice);
});

app.post('/api/juices', (req, res) => {
  const { name, description, price, category, inStock, imageUrl } = req.body;
  if (!name || !price) return res.status(400).json({ message: 'Name and price are required' });

  const newJuice = {
    id: (juices.length + 1).toString(),
    name,
    description: description || '',
    price: parseFloat(price),
    category: category || 'Fruit',
    inStock: inStock !== undefined ? inStock : true,
    imageUrl: imageUrl || './images/first.jpg'
  };
  juices.push(newJuice);
  res.status(201).json(newJuice);
});

app.put('/api/juices/:id', (req, res) => {
  const juice = juices.find(j => j.id === req.params.id);
  if (!juice) return res.status(404).json({ message: 'Juice not found' });

  const { name, description, price, category, inStock, imageUrl } = req.body;
  juice.name = name || juice.name;
  juice.description = description || juice.description;
  juice.price = price ? parseFloat(price) : juice.price;
  juice.category = category || juice.category;
  juice.inStock = inStock !== undefined ? inStock : juice.inStock;
  juice.imageUrl = imageUrl || juice.imageUrl;

  res.json(juice);
});

app.delete('/api/juices/:id', (req, res) => {
  const juiceIndex = juices.findIndex(j => j.id === req.params.id);
  if (juiceIndex === -1) return res.status(404).json({ message: 'Juice not found' });

  juices.splice(juiceIndex, 1);
  res.json({ message: 'Juice deleted successfully' });
});

// Orders API
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const { customerName, items } = req.body;
  if (!customerName || !items || !Array.isArray(items)) {
    return res.status(400).json({ message: 'Customer name and items array are required' });
  }

  const total = items.reduce((sum, itemId) => {
    const juice = juices.find(j => j.id === itemId);
    return sum + (juice ? juice.price : 0);
  }, 0);

  const newOrder = {
    id: (orders.length + 1).toString(),
    customerName,
    items,
    total,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  orders.push(newOrder);
  res.status(201).json(newOrder);
});

// Route handlers for HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Removed graphql-playground route - no longer needed



// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    graphqlEndpoint: '/graphql',
    restEndpoints: ['/api/juices', '/api/orders']
  });
});

// Start server with Apollo
async function startServer() {
  await server.start();
  
  // Apply Apollo middleware
  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }) => ({ req, juices, orders })
  }));

  // 404 handler for undefined routes (must be after all routes including /graphql)
  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  // Error handling middleware (after all other middleware)
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
  });

  app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📁 Static files served from: ${__dirname}`);
    console.log(`🔗 Health check: http://localhost:${port}/health`);
    console.log(`🍹 REST API: http://localhost:${port}/api/juices`);
    console.log(`📊 GraphQL Endpoint: http://localhost:${port}/graphql (no playground)`);
    console.log(`📊 GraphQL Endpoint: http://localhost:${port}/graphql`);
  });
}

startServer().catch(console.error);