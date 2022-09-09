const { connectToDatabase } = require("../utils/database");
const TABLE = process.env.QUEUE_TABLE;
module.exports.handler = async function (event) {
  try {
    if (
      !event.queryStringParameters ||
      !event.queryStringParameters.virtualsKeys
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "virtualsKeys id is required",
        }),
      };
    }
    const { virtualsKeys } = event.queryStringParameters;
    const virtuals = virtualsKeys.split(",").map((value) => parseInt(value));

    const db = await connectToDatabase();
    const filter = {
      id_virtual: { $in: virtuals },
    };
    const queue = await db
      .collection(TABLE)
      .find(filter)
      .sort({ createdAt: 1 })
      .toArray();
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        queue,
      }),
    };
  } catch (error) {
    console.error(`Error trying to get queue ${JSON.stringify}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
      }),
    };
  }
};
