"use strict";
const { connectToDatabase } = require("../utils/database");

module.exports.connectHandler = async function (connectionId) {
  console.log("connectHandler");
  const table = process.env.TABLE_NAME;
  try {
    const db = await connectToDatabase();
    const filter = {
      connectionId,
    };
    const doc = {
      $set: {
        connectionId,
      },
    };
    await db.collection(table).updateOne(filter, doc, { upsert: true });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};
