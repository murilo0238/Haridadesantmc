// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder } = require("discord.js");

// axios - request
const axios = require("axios");

// mercadopago
const { MercadoPagoConfig, PaymentRefund } = require("mercadopago");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });
const dbPurchases = new JsonDatabase({ databasePath: "./databases/dbPurchases.json" });

// event
module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {

        // isButton
        if (interaction.isButton()) {

            // button id
            const buttonId = interaction.customId;

            // checks if the button id starts with (refund)
            if (buttonId.startsWith(`refund`)) {

                // extracts the payment ID from the button identifier
                const [_, paymentId] = buttonId.split('-');

                // get all keys and values ​​from dbPurchases and map (wio.db)
                const allPurchases = dbPurchases.all();
                const allPaymentIds = allPurchases.map((entry) => entry.ID);

                // checks if the id exists and if allPaymentsIds includes the payment ID (paymentId)
                if (paymentId && allPaymentIds.includes(paymentId)) {

                    // checks if user is in dbPerms (wio.db)
                    if (!dbPerms.has(interaction.user.id)) return;

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
                    const mpRefund = new PaymentRefund(mpClient);

                    // message - interaction
                    const msgPurchase = interaction.message;
                    const channelPurchase = interaction.channel;

                    // create the modal
                    const modal = new ModalBuilder()
                        .setCustomId(`modalConfirm-${paymentId}`)
                        .setTitle(`🔁 | ${paymentId}`);

                    // creates the components for the modal
                    const inputConfirm = new TextInputBuilder()
                        .setCustomId('confirmText')
                        .setLabel(`Escreva "SIM" para continuar:`)
                        .setMaxLength(3)
                        .setPlaceholder(`SIM`)
                        .setRequired(true)
                        .setStyle(`Paragraph`)

                    // rows for components
                    const iConfirm = new ActionRowBuilder().addComponents(inputConfirm);

                    // add the rows to the modal
                    modal.addComponents(iConfirm);

                    // open the modal
                    await interaction.showModal(modal);

                    // event - interactionCreate
                    client.once("interactionCreate", async (iModal) => {

                        // modalLines - modal
                        if (iModal.customId == `modalConfirm-${paymentId}`) {

                            // deferUpdate - postphone the update
                            await iModal.deferUpdate();

                            // inserted text - confirm
                            const insertedText = iModal.fields.getTextInputValue(`confirmText`)
                                .toLowerCase();

                            // checks if confirmText is equal to "sim"
                            if (insertedText == `sim`) {

                                // create a refund on payment id
                                await mpRefund.create({
                                    payment_id: paymentId
                                }).then(async (refund) => {

                                    // message - edit
                                    await msgPurchase.edit({
                                        components: [new ActionRowBuilder()
                                            .addComponents(
                                                new ButtonBuilder().setCustomId(`refund-${paymentId}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`).setDisabled(true).setDisabled(true)
                                            )
                                        ]
                                    });

                                    // variables with informations the product refunded
                                    const buyerPurchase = await dbPurchases.get(`${paymentId}.buyer`);
                                    const productsPurchase = await dbPurchases.get(`${paymentId}.productsNames`);
                                    const pricePurchase = await dbPurchases.get(`${paymentId}.pricePaid`);

                                    // buyer fetch
                                    const buyerFetch = await client.users.fetch(buyerPurchase);

                                    // embed - refund
                                    const embedRefund = new EmbedBuilder()
                                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                        .setTitle(`${client.user.username} | Reembolso`)
                                        .addFields(
                                            { name: `📝 | ID DO PEDIDO:`, value: `\`${paymentId}\`` },
                                            { name: `👤 | COMPRADOR(A):`, value: `${buyerFetch} | ${buyerFetch.username}` },
                                            { name: `🌎 | PRODUTO(S) REEMBOLSADO(S):`, value: `${productsPurchase.join(`\n`)}` },
                                            { name: `🛒 | VALOR REEMBOLSADO:`, value: `\`R$${Number(pricePurchase).toFixed(2)}\`` },
                                            { name: `🏷 | REEMBOLSADO POR:`, value: `${interaction.user} | ${interaction.user.username}` }
                                        )
                                        .setColor(`NotQuiteBlack`)
                                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

                                    // channelPurchase - message - success
                                    await channelPurchase.send({
                                        content: `✅ | Pagamento ID: **${paymentId}** reembolsado com sucesso.`,
                                        embeds: [embedRefund]
                                    });

                                }).catch(async (err) => {

                                    // message - error
                                    await iModal.followUp({
                                        content: `❌ | Ocorreu um erro ao reembolsar o Pagamento ID: **${paymentId}**.`,
                                        ephemeral: true
                                    });

                                });

                            };

                        };

                    });

                };

            };

        };

    },
};