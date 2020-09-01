const express = require("express");
const cookieParser = require('cookie-parser')
const discord = require("discord.js");
const Auth = require("discord-oauth2");
const crypto = require('crypto');
const config = require("./config.json");

const client = new discord.Client({
    ws: {
        intents: [
            'GUILDS'
        ]
    }
});
const app = express();
const auth = new Auth({
    clientId: config.cid,
    clientSecret: config.secret
});

app.use(cookieParser());

app.get("/login", (req, res) => {
    var state = crypto.randomBytes(64).toString('hex');
    res.cookie("state", state);
    res.redirect(auth.generateAuthUrl({
        scope: ["connections", "identify"],
        state,
        redirectUri: "http://localhost:8080/callback"
    }));
});

app.get("/callback", async (req, res) => {
    const { code, state } = req.query;
    if(state !== req.cookies.state) return res.status(400).send("Wrong state");
    try {
        var token = await auth.tokenRequest({
            code,
            scope: [ "connections", "identify" ],
            grantType: "authorization_code",
            redirectUri: "http://localhost:8080/callback"
        });
    } catch(e) {
        return res.status(403).send("Invalid code");
    }
    var connections = await auth.getUserConnections(token.access_token);
    var reddit = connections.filter(val => val.type === "reddit");
    if(!reddit) return res.send("No reddit connection");
    reddit = reddit[0];
    var user = await auth.getUser(token.access_token);

    try {
        var guild = await client.guilds.fetch(config.guild);
    } catch(e) {
        return res.status(500).send("Guild not found");
    }
    try {
        var member = await guild.members.fetch(user.id);
    } catch(e) {
        return res.status(403).send("Member not found");
    }
    try {
        await member.setNickname("u/" + reddit.name);
    } catch(e) {
        console.log(e);
        return res.status(500).send("Missing nickname permission");
    }
    res.send("Done");
});

client.login(config.token);

app.listen(8080, () => {
    console.log("http://localhost:8080/login");
})