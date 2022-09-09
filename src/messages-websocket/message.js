"use strict";
const axios = require("axios");
const { ApiGatewayManagementApi } = require("aws-sdk");
const moment = require("moment-timezone");
const { connectToDatabase } = require("../utils/database");
const { disconnectHandler } = require("./disconnect");
const TABLE_CONNECTIONS = process.env.TABLE_NAME;
const TABLE_QUEUE = process.env.QUEUE_TABLE;
let usersData;
var date = new Date();
async function checkUserData({ id_user, id_user_to }) {
  const params = new URLSearchParams();
  params.append("id_user", id_user);
  params.append("id_user_to", id_user_to);
  usersData = await axios.get(`${process.env.API_SINCELOVE}api/user/get`, {
    params,
    headers: {
      "X-Authorization": process.env.API_KEY,
    },
  });
}
async function persistMessage({
  id,
  message,
  room,
  type,
  id_user,
  id_user_to,
  quote,
}) {
  if (usersData.data) {
    const url = `${process.env.API_MESSAGING}api/message`;
    usersData.data.user.last_online_at = moment(date.getTime())
      .tz("America/Mazatlan")
      .toISOString();
    return await axios.post(url, {
      id,
      message,
      room,
      type,
      id_user,
      id_user_to,
      quote,
      user: usersData.data.user,
      user_to: usersData.data.user_to,
    });
  }
}

async function getOrCreateConversation({ id_user, id_user_to }) {
  return axios
    .post(`${process.env.API_MESSAGING}api/conversation`, {
      id_user_to: id_user_to,
      id_user: id_user,
    })
    .then((res) => res.data)
    .catch((err) => console.error(JSON.stringify(err)));
}

async function saveToQueue(payload) {
  try {
    if (payload.user_from_type !== "normal") {
      return;
    }
    const db = await connectToDatabase();
    const filter = {
      room: payload.room,
    };
    const doc = {
      $set: {
        room: payload.room,
        createdAt: new Date().toISOString(),
        id_client: payload.id_user,
        client: usersData.data.user,
        id_virtual: payload.id_user_to,
        virtual: usersData.data.user_to,
      },
    };
    await db.collection(TABLE_QUEUE).updateOne(filter, doc, { upsert: true });
  } catch (error) {
    console.error(`Error trying to saveQueue on ${JSON.stringify(error)}`);
  }
}
let user_to = null;
module.exports.sendMessageHandler = async function (payload, meta) {
  console.log("sendMessageHandler");
  const apiGateway = new ApiGatewayManagementApi({
    endpoint: `${meta.domain}/${meta.stage}`,
  });
  const id_user_to = payload.id_user_to;
  try {
    await checkUserData({
      id_user: payload.id_user,
      id_user_to: payload.id_user_to,
    });
  } catch (error) {
    console.error(`User blocked or not exist ${JSON.stringify(error)}`);
    return;
  }
  try {
    const db = await connectToDatabase();
    const filter = {
      userId: id_user_to,
    };
    user_to = await db.collection(TABLE_CONNECTIONS).findOne(filter);
    console.log("user_to", user_to);
  } catch (error) {
    console.error(`Error trying to get user to ${JSON.stringify(error)}`);
  }
  try {
    if (user_to != null) {
      let typeMessage = payload.type.trim().toLowerCase();
      let quoteMesage = null;
      if (payload.quote != null) {
        typeMessage = "quote";
        if (payload.quote.type === "image") {
          typeMessage = "quote_image";
        }
        quoteMesage = payload.quote.message;
      }
      let id_conversation = payload.id_conversation;
      if (payload.id_conversation == null) {
        const conversation = await getOrCreateConversation({
          id_user: payload.id_user,
          id_user_to: payload.id_user_to,
        });
        id_conversation = conversation._id;
      }

      try {
        console.log("postToConnection", user_to.connectionId, payload);
        await apiGateway
          .postToConnection({
            ConnectionId: user_to.connectionId,
            Data: Buffer.from(
              JSON.stringify({
                event: "sendMessage",
                id: payload.id,
                message: payload.message,
                type: typeMessage,
                id_user: payload.id_user,
                id_user_to: payload.id_user_to,
                quote: quoteMesage,
                room: payload.room,
                conversation: {
                  id: id_conversation,
                  last_message: payload.message,
                  user: payload.user,
                  user_to: payload.user_to,
                  id_user: payload.id_user,
                  id_user_to: payload.id_user_to,
                  room: payload.room,
                },
                createdAt: moment(date.getTime())
                  .tz("America/Mazatlan")
                  .toISOString(),
                upadatedAt: moment(date.getTime())
                  .tz("America/Mazatlan")
                  .toISOString(),
              })
            ),
          })
          .promise();
      } catch (error) {
        console.error(
          `Error trying to ws postToConnection on sendMessage ${JSON.stringify(
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
    }
  } catch (error) {
    console.error(`Error trying to send data ${JSON.stringify(error)}`);
  }
  try {
    await persistMessage({
      id: payload.id,
      message: payload.message,
      type: payload.type,
      id_user: payload.id_user,
      id_user_to: payload.id_user_to,
      quote: payload.quote,
      room: payload.room,
    });
  } catch (error) {
    console.error(`Error trying to save message ${JSON.stringify(error)}`);
  }

  try {
    await saveToQueue(payload);
  } catch (error) {
    console.error(`Error trying to save queue ${JSON.stringify(error)}`);
  }
  try {
    if (payload.user_from_type !== "normal") {
      return;
    }
    let items = [];
    const db = await connectToDatabase();
    items = await db
      .collection(TABLE_CONNECTIONS)
      .find({ typeUser: "virtual" })
      .toArray();
    items.forEach((userConnected) => {
      apiGateway
        .postToConnection({
          ConnectionId: userConnected.connectionId,
          Data: Buffer.from(
            JSON.stringify({
              event: "newClientInQueue",
            })
          ),
        })
        .promise()
        .then(() => {
          console.log(`newClientInQueue to ${userConnected.connectionId}!`);
        })
        .catch(() => {
          disconnectHandler(userConnected.connectionId)
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
        });
    });
  } catch (error) {
    console.error(`Error trying to notify users ${JSON.stringify(error)}`);
  }
};
