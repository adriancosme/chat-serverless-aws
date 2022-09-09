"use strict";
const MongoClient = require("mongodb").MongoClient;
const { connectToDatabase } = require("../utils/database");

module.exports.disconnectHandler = async function (connectionId) {
  console.log("disconnectHandler");
  const table = process.env.TABLE_NAME;
  try {
    const db = await connectToDatabase();
    const filter = {
      connectionId,
    };
    await db.collection(table).deleteMany(filter);
    return true;
  } catch (error) {
    console.error(`Error trying to delete connection ${JSON.stringify(error)}`);
    return false;
  }
};
