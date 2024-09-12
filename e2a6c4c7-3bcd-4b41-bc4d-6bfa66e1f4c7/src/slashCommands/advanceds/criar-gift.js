// discord.js
const { EmbedBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbGifts = new JsonDatabase({ databasePath: "./databases/dbGifts.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("criar-gift")
        .setDescription("[🛠/💰] Cadastre um novo GiftCard com valor!")
        .addIntegerOption(opInteger => opInteger
            .setName(`valor`)
            .setDescription(`Valor que será resgatado no gift`)
            .setMinValue(1)
            .setRequired(true)
        )
        .setDMPermission(false),

    // execute (command)
    async execute(interaction, client) {

        // user without permission for dbPerms (wio.db)
        if (!dbPerms.has(interaction.user.id)) {
            await interaction.reply({
                content: `❌ | Você não tem permissão para usar este comando.`,
                ephemeral: true
            });
            return;
        };

        // value inserted - giftcard
        const valueInserted = interaction.options.getInteger(`valor`);

        // checks if the entered value is equal to 0
        if (Number(valueInserted) <= 0) {
            await interaction.reply({
                content: `❌ | O valor mínimo é de **R$1**.`,
                ephemeral: true
            });
            return;
        };

        // generates a random code for giftcard
        const giftCode = generateRandomCode(18);

        // set the gift to dbGifts (wio.db)
        await dbGifts.set(`${giftCode}.balance`, Number(valueInserted));

        // embed - giftcard
        const embedGiftcard = new EmbedBuilder()
            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
            .setTitle(`${client.user.username} | Gift Criado`)
            .addFields(
                { name: `🎁 | Código:`, value: `${giftCode}` },
                { name: `💰 | Valor:`, value: `R$__${Number(valueInserted).toFixed(2)}__` }
            )
            .setColor(`Green`)
            .setFooter({ text: `Utilize (/criados) para visualizar todos os giftcards existentes.` });

        // message - success
        await interaction.reply({
            embeds: [embedGiftcard],
            ephemeral: true
        });

        // function - generate random code
        function generateRandomCode(length) {

            // variables with code information
            let result = ``;
            const characters = `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`;
            const charactersLength = characters.length;

            // generates the random code
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            };

            return result;
        };

    },
};