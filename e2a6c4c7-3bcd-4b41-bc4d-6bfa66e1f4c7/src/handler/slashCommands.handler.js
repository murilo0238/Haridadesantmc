// discord - api
const { REST } = require("@discordjs/rest");
const { Routes } = require('discord-api-types/v9');

// access - files
const fs = require("fs");

// config.json
const config = require("../../config.json");

// handler
module.exports = (client) => {

    // import the commands
    client.handleCommands = async (path) => {
        client.commandArray = [];
        const commandFolders = fs.readdirSync(path);
        for (const folder of commandFolders) {
            const commandFiles = fs.readdirSync(`${path}/${folder}`).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const command = require(`../slashCommands/${folder}/${file}`);
                client.commands.set(command.data.name, command);
                client.commandArray.push(command.data.toJSON());
            };
        };
    };

    // makes the command request - ready
    client.on("ready", async (r) => {
        try {
            const rest = new REST({
                version: `9`
            }).setToken(config.token);
            await rest.put(
                Routes.applicationCommands(client.user.id), {
                body: client.commandArray
            });
            console.log(`[LOG] ${client.commandArray.length} slash commands were loaded.`);
        } catch (err) {
            console.log(err);
        };
    });

};