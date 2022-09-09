"use strict";
const { connectToDatabase } = require("../utils/database");

module.exports.setUserIdHandler = async function (connectionId, payload) {
  console.log("setUserIdHandler");
  const table = process.env.TABLE_NAME;
  try {
    const db = await connectToDatabase();
    const filter = {
      connectionId: connectionId,
    };
    const doc = {
      $set: {
        userId: payload.userId,
        typeUser: payload.typeUser,
        connectionId: connectionId,
      },
    };
    db.collection(table).updateOne(filter, doc, { upsert: true });
  } catch (error) {
    console.error(`Error trying to put data ${JSON.stringify(error)}`);
  }
};
