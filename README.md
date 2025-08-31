# Fresh Juice Store - GraphQL API

A Node.js Express server with GraphQL API for a fresh juice store.

## Features

- GraphQL API with Apollo Server
- REST API endpoints for backward compatibility
- Juice and Order management
- Real-time data with in-memory storage

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Access the application:
- Main site: http://localhost:3000
- GraphQL Endpoint: http://localhost:3000/graphql
- Health Check: http://localhost:3000/health

## API Endpoints

### GraphQL
- **Endpoint**: `/graphql`

### REST API
- **Juices**: `/api/juices`
- **Orders**: `/api/orders`
- **Health Check**: `/health`

## GraphQL Queries

### Get All Juices
```graphql
query {
  juices {
    id
    name
    description
    price
    category
    inStock
    imageUrl
  }
}
```

### Get Juices by Category
```graphql
query {
  juicesByCategory(category: "Fruit") {
    id
    name
    price
  }
}
```

### Search Juices
```graphql
query {
  searchJuices(query: "berry") {
    id
    name
    description
  }
}
```

## Mutations

### Create Juice
```graphql
mutation {
  createJuice(input: {
    name: "Mango Tango"
    description: "Fresh mango with tropical flavors"
    price: 6.49
    category: "Fruit"
    inStock: true
  }) {
    id
    name
    price
  }
}
```

### Create Order
```graphql
mutation {
  createOrder(input: {
    customerName: "John Doe"
    items: ["1", "2"]
  }) {
    id
    customerName
    total
    status
  }
}
```

## Technologies Used

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Apollo Server** - GraphQL server
- **GraphQL** - Query language
- **Bootstrap** - UI framework


