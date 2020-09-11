const express = require("express");
const cookieParser = require('cookie-parser')
const discord = require("discord.js");
const Auth = require("discord-oauth2");
const crypto = require('crypto');

const {
    CLIENT_ID,
    CLIENT_SECRET,
    TOKEN,
    GUILD_ID,

    PROTOCOL,
    HOSTNAME,
    LOGIN_PATH,
    CALLBACK_PATH,
    PORT
} = require("./config.json");

const client = new discord.Client({
    ws: {
        intents: [
            'GUILDS'
        ]
    }
});
const app = express();
const auth = new Auth({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET
});

/*
 *  Make sure to add a this URL to your Discord Application like show on this page:
 *  https://discordjs.guide/oauth2/#getting-an-oauth2-url
 */
const redirectUri = `${PROTOCOL}://${HOSTNAME}:${PORT}${CALLBACK_PATH}`;

app.use(cookieParser());

app.get(LOGIN_PATH, (req, res) => {
    const state = crypto.randomBytes(64).toString('hex');
    res.cookie("state", state);
    res.redirect(auth.generateAuthUrl({
        scope: ["connections", "identify"],
        state,
        redirectUri
    }));
});

app.get(CALLBACK_PATH, async (req, res) => {
    const { code, state } = req.query;
    // Alternatively, use res.redirect() to use a fancier error page. Same thing goes for all the other error handlers.
    if(state !== req.cookies.state) return res.status(400).send("Wrong state");
    try {
        var token = await auth.tokenRequest({
            code,
            scope: [ "connections", "identify" ],
            grantType: "authorization_code",
            redirectUri
        });
    } catch(e) {
        return res.status(403).send("Invalid code");
    }
    const connections = await auth.getUserConnections(token.access_token);

    let reddit = connections.filter(val => val.type === "reddit");
    if(!reddit[0]) return res.send("No reddit connection found");
    reddit = reddit[0];
    const user = await auth.getUser(token.access_token);

    try {
        var guild = await client.guilds.fetch(GUILD_ID);
    } catch(e) {
        return res.status(500).send("Discord guild not found");
    }
    try {
        var member = await guild.members.fetch(user.id);
    } catch(e) {
        return res.status(403).send("Discord member not found");
    }
    try {
        /*
        Add whatever discord logic you want here. You could for example add a "Verfied" role:
            await member.roles.add("roleId")
        or DM the user: (make sure to do error handling if bot can't DM user)
            await member.send("Succesfully verified you as reddit user u/" + reddit.name + " in guild " + guild.name)

        If you're gonna change the user's nickname like this, remember to limit their "Change nickname" perms - otherwise they can just change it back.
        */
        await member.setNickname("u/" + reddit.name);
    } catch(e) {
        return res.status(500).send("Couldn't change nickname.");
    }
    res.send("Success!");
});

client.login(TOKEN);

app.listen(PORT, () => {
    console.log("Listening on port", PORT);
});
