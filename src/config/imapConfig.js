require("dotenv").config();

module.exports = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: {
    servername: "imap.gmail.com",
    rejectUnauthorized: false,
  },
  authTimeout: 10000,
  connTimeout: 30000,
};
