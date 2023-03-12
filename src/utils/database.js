const MongoClient = require("mongodb").MongoClient;
let cachedDb = null;

async function connectToDatabase() {
  try {
    if (cachedDb) {
      return cachedDb;
    }
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = await client.db(process.env.DATABASE);
    cachedDb = db;
    return db;
  } catch (error) {
    console.error(
      `Error trying to conecting to database ${JSON.stringify(error)}`
    );
  }
}

function getCollection(collectionName) {
  return cachedDb.db.collection(collectionName);
}

module.exports = {
  connectToDatabase,
  getCollection,
};
