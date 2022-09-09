const { connectToDatabase } = require("../utils/database");
const TABLE = process.env.QUEUE_TABLE;
module.exports.handler = async function (event) {
  try {
    const { room } = event.pathParameters;
    const db = await connectToDatabase();
    const filter = {
      room,
    };
    await db.collection(TABLE).deleteOne(filter);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Queue deleted!",
      }),
    };
  } catch (error) {
    console.error(`Error trying to delete queue ${JSON.stringify(error)}`);
  }
};
