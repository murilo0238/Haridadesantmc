// discord.js
const { EmbedBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// axios - request
const axios = require("axios");

// mercadopago
const { MercadoPagoConfig, PaymentRefund } = require("mercadopago");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });
const dbPurchases = new JsonDatabase({ databasePath: "./databases/dbPurchases.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("reembolsar")
        .setDescription("[🛠/💰] Reembolse um pagamento pelo ID!")
        .addStringOption(opString => opString
            .setName("id")
            .setDescription("ID do Pagamento")
            .setMaxLength(38)
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

        // payment - id
        const paymentId = interaction.options.getString("id");

        // checks if the paid market access token is equal to none
        const tokenMp = await dbConfigs.get(`payments.mpAcessToken`);
        if (tokenMp != `none`) {

            // checks if the token is valid per request (axios)
            await axios.get(`https://api.mercadopago.com/v1/payments/search`, {
                headers: {
                    "Authorization": `Bearer ${tokenMp}`
                }
            }).catch(async (err) => {

                // message - error
                await interaction.reply({
                    content: `❌ | O Token MP que está configurado é inválido.`,
                    ephemeral: true
                });
                return;

            });

        } else {

            // message - error
            await interaction.reply({
                content: `❌ | Configure um Token MP para utilizar este comando.`,
                ephemeral: true
            });
            return;

        };

        // message - loading
        await interaction.reply({
            content: `🔁 | Carregando ...`,
            ephemeral: true
        });

        // mercadopago - client
        const mpClient = new MercadoPagoConfig({ accessToken: tokenMp });

        // mercadopago - methods
        const mpRefund = new PaymentRefund(mpClient);

        // create a refund on payment id
        await mpRefund.create({
            payment_id: paymentId
        }).then(async (refund) => {

            // message - edit -  success
            await interaction.editReply({
                content: `✅ | Pagamento ID: **${paymentId}** reembolsado com sucesso.`,
                ephemeral: true
            });

        }).catch(async (err) => {

            // message - edit - error
            await interaction.editReply({
                content: `❌ | Ocorreu um erro ao reembolsar o Pagamento ID: **${paymentId}**.`,
                ephemeral: true
            });

            return;
        });

    },
};