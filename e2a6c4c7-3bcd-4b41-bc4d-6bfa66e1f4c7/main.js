// discord.js
const { Client, GatewayIntentBits, Collection } = require("discord.js");

// client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// allows you to import the client externally
module.exports = client;

// config.json
const config = require("./config.json");

// fs - files
const { readdirSync } = require("node:fs");

// collections
client.commands = new Collection();

// import the handlers
const handlers = readdirSync("./src/handler").filter((file) => file.endsWith('.js'));
for (const file of handlers) {
    require(`./src/handler/${file}`)(client);
};

// loads the collections with the types of commands
client.handleCommands("./src/slashCommands");

// clear - login
console.clear();
client.login(config.token);

// unhandledRejection
process.on("unhandledRejection", (reason, promise) => {
    console.error(reason + " " + promise);
    return;
});

// uncaughtException
process.on("uncaughtException", (error, origin) => {
    console.error(error + " " + origin);
    return;
});

