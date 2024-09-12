// discord.js
const { ActivityType } = require("discord.js");

// config.json
const config = require("../../../config.json");

// axios - request
const axios = require("axios");

// event
module.exports = {
    name: "ready",
    async execute(client) {

        // main logs
        console.log(`[LOG] ${client.user.username} is ready!`);

        // bot status
        const textStatus = `Vendas Automáticas`;
        client.user.setActivity(textStatus, {
            type: ActivityType.Custom
        });
        client.user.setStatus("online");

        // changes the bot description to the official one
        const description = ``
        await axios.patch(`https://discord.com/api/v10/applications/${client.user.id}`, {
            description: description
        }, {
            headers: {
                "Authorization": `Bot ${config.token}`,
                "Content-Type": 'application/json',
            }
        });

    },
};