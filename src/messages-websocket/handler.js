const { connectHandler } = require("./connect");
const { disconnectHandler } = require("./disconnect");
const { sendMessageHandler } = require("./message");
const { setUserIdHandler } = require("./setUserId");
const { messageReadHandler } = require("./message_read");

const { userTypingHandler } = require("./user_typing");

module.exports.handler = function (event, context, callback) {
  console.log(event);
  context.callbackWaitsForEmptyEventLoop = false;
  if (!event.requestContext) {
    return {};
  }
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  const connectionId = event.requestContext.connectionId;
  const routeKey = event.requestContext.routeKey;
  const body =
    typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  switch (routeKey) {
    case "$connect":
      connectHandler(connectionId)
        .then(() => {
          callback(null, {
            statusCode: 200,
            body: "Client connected",
          });
        })
        .catch((err) => {
          console.error(JSON.stringify(err));
          callback(null, {
            statusCode: 500,
            body: JSON.stringify(err),
          });
        });
      break;
    case "$disconnect":
      disconnectHandler(connectionId)
        .then(() => {
          callback(null, {
            statusCode: 200,
            body: "Client disconnected",
          });
        })
        .catch((err) => {
          console.error(JSON.stringify(err));
          callback(null, {
            statusCode: 500,
            body: JSON.stringify(err),
          });
        });
      break;
    case "setUserId":
      setUserIdHandler(connectionId, body)
        .then(() => {
          callback(null, {
            statusCode: 200,
            body: "userId established",
          });
        })
        .catch((err) => {
          console.error(err);
          callback(null, {
            statusCode: 500,
            body: JSON.stringify(err),
          });
        });
      break;
    case "sendMessage":
      sendMessageHandler(body, { domain, stage, connectionId })
        .then(() => {
          callback(null, {
            statusCode: 200,
            body: "message sent",
          });
        })
        .catch((err) => {
          console.error(err);
          callback(null, {
            statusCode: 500,
            body: JSON.stringify(err),
          });
        });
      break;
    case "messageRead":
      messageReadHandler(body, { domain, stage })
        .then(() => {
          callback(null, {
            statusCode: 200,
            body: "message read",
          });
        })
        .catch((err) => {
          console.error(err);
          callback(null, {
            statusCode: 500,
            body: JSON.stringify(err),
          });
        });
      break;
    case "userTyping":
      callback(null, {
        statusCode: 200,
        body: "userTyping action",
      });
      // userTypingHandler(body, { domain, stage })
      //   .then(() => {})
      //   .catch(() => {
      //     console.error(err);
      //     callback(null, {
      //       statusCode: 500,
      //       body: JSON.stringify(err),
      //     });
      //   });
      break;
    default:
      console.log("default");
      callback(null, {
        statusCode: 200,
        body: "default action",
      });      
      break;
  }
};
