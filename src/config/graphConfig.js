require("dotenv").config();

module.exports = {
  accessToken: process.env.GRAPH_ACCESS_TOKEN,
  mailbox: process.env.MAILBOX_USER,
};
