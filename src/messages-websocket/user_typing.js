const { ApiGatewayManagementApi } = require("aws-sdk");
const { connectToDatabase } = require("../utils/database");
let user_to = null;
module.exports.userTypingHandler = async function (payload, meta) {
  console.log("userTypingHandler");
  const TABLE_CONNECTIONS = process.env.TABLE_NAME;
  const apiGateway = new ApiGatewayManagementApi({
    endpoint: `${meta.domain}/${meta.stage}`,
  });
  const id_user_to = payload.id_user_to;
  try {
    const db = await connectToDatabase();
    const filter = {
      userId: id_user_to,
    };
    user_to = await db.collection(TABLE_CONNECTIONS).findOne(filter);
  } catch (err) {
    console.error(
      `Error trying to get user to data on user typing ${JSON.stringify(err)}`
    );
  }
  try {
    if (user_to != null) {
      await apiGateway
        .postToConnection({
          ConnectionId: user_to.connectionId,
          Data: Buffer.from(
            JSON.stringify({
              event: "userTyping",
              state: payload.state,
              userId: user_to.userId,
            })
          ),
        })
        .promise();
    }
  } catch (error) {
    console.error(
      `Error trying to ws postToConnection on userTyping ${JSON.stringify(
        error
      )}`
    );
    disconnectHandler(user_to.connectionId)
      .then(() => {
        console.log("Connection Gone, deleting...");
      })
      .catch((err) => {
        console.error(JSON.stringify(err));
        callback(null, {
          statusCode: 500,
          body: JSON.stringify(err),
        });
      });
  }
};
