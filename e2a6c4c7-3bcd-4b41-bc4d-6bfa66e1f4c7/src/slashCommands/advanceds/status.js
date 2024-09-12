// discord.js
const { EmbedBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// axios - request
const axios = require("axios");

// moment - date and time
const moment = require("moment");

// mercadopago
const { MercadoPagoConfig, Payment } = require("mercadopago");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("status")
        .setDescription("[🛠/💰] Verifique o status de um pagamento!")
        .addStringOption(opString => opString
            .setName(`id`)
            .setDescription(`ID do Pagamento`)
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

        // mercadopago - client
        const mpClient = new MercadoPagoConfig({ accessToken: tokenMp });

        // mercadopago - methods
        const mpPayment = new Payment(mpClient);

        // payment - id
        const paymentId = interaction.options.getString(`id`);

        // message - loading
        await interaction.reply({
            content: `🔁 | Carregando ...`,
            ephemeral: true
        }).then(async (msg) => {

            // check payment status
            await mpPayment.get({ id: paymentId })
                .then(async (data) => {

                    // payment - status - formatted
                    const paymentStatus = data.status.toString()
                        .replace(`pending`, `Pendente`)
                        .replace(`approved`, `Aprovado`)
                        .replace(`authorized`, `Autorizado`)
                        .replace(`in_process`, `Em processo`)
                        .replace(`in_mediation`, `Em mediação`)
                        .replace(`rejected`, `Rejeitado`)
                        .replace(`cancelled`, `Cancelado`)
                        .replace(`refunded`, `Reembolsado`)
                        .replace(`charged_back`, `Cobrado de Volta (Charged Back)`);

                    // payment - value
                    const paymentValue = data.transaction_amount;

                    // payment - date created
                    const paymentDateCreated = `<t:${Math.floor(moment(data.date_created).toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment(data.date_created).toDate().getTime() / 1000)}:R>)`;

                    // embed - payment
                    const embedPayment = new EmbedBuilder()
                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                        .setTitle(`${client.user.username} | Pagamento`)
                        .addFields(
                            { name: `📝 | Status do Pagamento:`, value: `${paymentStatus}` },
                            { name: `💸 | Valor:`, value: `R$__${Number(paymentValue).toFixed(2)}__` },
                            { name: `⏰ | Pagamento criado em:`, value: `${paymentDateCreated}` }
                        )
                        .setColor(`NotQuiteBlack`)
                        .setTimestamp()

                    // message - edit - success
                    await interaction.editReply({
                        content: ``,
                        embeds: [embedPayment],
                        ephemeral: true
                    });

                }).catch(async (err) => {

                    // message - edit - error
                    await interaction.editReply({
                        content: `❌ | Ocorreu um erro! Verifique o ID inserido e tente novamente.`,
                        ephemeral: true
                    });

                });

        });

    },
};