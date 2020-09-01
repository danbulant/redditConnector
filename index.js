const express = require("express");
const discord = require("discord.js");
const Auth = require("discord-oauth2");
const crypto = require('crypto');
const config = require("./config.json");

const client = new discord.Client();
const app = express();
const auth = new Auth({
    clientId: config.cid,
    clientSecret: config.secret
});

app.get("/login", (req, res) => {
    var state = crypto.randomBytes(64).toString('hex');
    res.cookie("state", state);
    res.redirect(auth.generateAuthUrl({
        scope: ["connections", "identify"],
        state
    }));
});

app.get("/callback", (req, res) => {

});


client.login(config.token);