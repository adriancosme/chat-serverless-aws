const axios = require("axios");
const { ApiGatewayManagementApi } = require("aws-sdk");
const { connectToDatabase } = require("../utils/database");
const { disconnectHandler } = require("./disconnect");
let user_to = null;

module.exports.messageReadHandler = async function (payload, meta) {
  console.log("messageReadHandler");
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
  } catch (error) {
    console.error(`Error trying to get user to data ${JSON.stringify(error)}`);
  }
  // Llamar endpoint para marcar como leido todo
  try {
    const url = `${process.env.API_MESSAGING}api/chat/read`;
    await axios.post(url, {
      room: payload.room,
      id_user: payload.id_user,
      id_user_to: payload.id_user_to,
    });
  } catch (error) {
    console.error(
      `Error trying to call api on message read ${JSON.stringify(error)}`
    );
  }
  // Responder por websocket para indicarle al cliente que ha leido el mensaje
  try {
    if (user_to != null) {
      await apiGateway
        .postToConnection({
          ConnectionId: user_to.connectionId,
          Data: Buffer.from(
            JSON.stringify({
              event: "messageRead",
              room: payload.room,
              id_user: payload.id_user,
              id_user_to: payload.id_user_to,
              success: true,
            })
          ),
        })
        .promise();
    }
  } catch (error) {
    console.error(
      `Error trying to send data to ws connection ${JSON.stringify(error)}`
    );
    disconnectHandler(user_to.connectionId)
      .then(() => {
        console.log("Connection Gone, deleting...");
      })
      .catch((err) => {
        console.error(JSON.stringify(error));
        callback(null, {
          statusCode: 500,
          body: JSON.stringify(err),
        });
      });
  }
};
