// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, AttachmentBuilder } = require("discord.js");

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
const dbOpenedPayments = new JsonDatabase({ databasePath: "./databases/dbOpenedPayments.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("gerar-pix")
        .setDescription("[💰] Gere uma cobrança via Pix!")
        .addIntegerOption(opInteger => opInteger
            .setName(`valor`)
            .setDescription(`Valor do Pagamento`)
            .setMinValue(1)
            .setRequired(true)
        )
        .setDMPermission(false),

    // execute (command)
    async execute(interaction, client) {

        // variables with interaction information
        const channelI = interaction.channel;
        const userI = interaction.user;

        // checks if the user already has an open payment
        const userPayment = await dbOpenedPayments.get(channelI.id);
        if (userPayment) {

            // checks if the payer is the same as the interaction
            if (userPayment.payer == userI.id) {
                await interaction.reply({
                    content: `❌ | Você já tem um pagamento em aberto.`,
                    ephemeral: true
                });
                return;
            };

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

        // inserteds informations
        let valueInserted = interaction.options.getInteger(`valor`);

        // checks if the entered value is equal to 0
        if (Number(valueInserted) <= 0) {
            await interaction.reply({
                content: `❌ | O valor mínimo é de \`R$1\`.`,
                ephemeral: true
            });
            return;
        };

        // message - loading
        await interaction.reply({
            content: `🔁 | Gerando o pagamento ...`
        }).then(async (msg) => {

            // payment details
            const paymentData = {
                transaction_amount: Number(valueInserted),
                description: `Cobrança - ${userI.username}`,
                payment_method_id: `pix`,
                payer: {
                    email: `cliente@gmail.com`,
                },
            };

            // create the payment
            await mpPayment.create({ body: paymentData })
                .then(async (data) => {

                    // loop - cancel the payment
                    const loopCancelPayment = setTimeout(async (t) => {

                        // cancel payment via paid market
                        await mpPayment.cancel({ id: data.id })
                            .catch((err) => {
                                return;
                            });

                        // delete the payment in dbOpenedPayments (wio.db)
                        await dbOpenedPayments.delete(channelI.id);

                        // editReply - payment time expired
                        await interaction.editReply({
                            content: `⚠ | O prazo para o pagamento expirou, já que não foi efetuado dentro do período estipulado.`,
                            embeds: [],
                            components: []
                        });

                    }, 600000);

                    // arrow the pamyments information in dbOpenedPayments (wio.db)
                    await dbOpenedPayments.set(`${channelI.id}.payer`, userI.id);
                    await dbOpenedPayments.set(`${channelI.id}.valueAdded`, Number(valueInserted));
                    await dbOpenedPayments.set(`${channelI.id}.paymentId`, data.id);
                    await dbOpenedPayments.set(`${channelI.id}.date`, moment());

                    // row pix - payment
                    const rowPixPayment = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`copiaCola`).setLabel(`Copia e Cola`).setEmoji(`💠`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`qrCode`).setLabel(`QR Code`).setEmoji(`🖨`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`cancelPayment`).setEmoji(`❌`).setStyle(`Danger`)
                        );

                    // time that payment will expire (moment)
                    const tenMinutes = moment().add(10, `minute`);
                    const expirationTenMinutes = `<t:${Math.floor(tenMinutes.toDate().getTime() / 1000)}:f> (<t:${Math.floor(tenMinutes.toDate().getTime() / 1000)}:R>)`;

                    // embed pix - payment
                    const embedPixPayment = new EmbedBuilder()
                        .setTitle(`${client.user.username} | Pagamento`)
                        .addFields(
                            { name: `💸 | Valor:`, value: `R$${Number(valueInserted).toFixed(2)}` },
                            { name: `⏰ | Pagamento expira em:`, value: expirationTenMinutes }
                        )
                        .setColor(`NotQuiteBlack`)
                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

                    // message - edit
                    await interaction.editReply({
                        content: `${userI}`,
                        embeds: [embedPixPayment],
                        components: [rowPixPayment]
                    });

                    // loop - check payment
                    const loopCheckPayment = setInterval(async (i) => {

                        // payment - status
                        const paymentGet = await mpPayment.get({ id: data.id });
                        const paymentStatus = paymentGet.status;

                        // checks whether the payment status is approved
                        if (paymentStatus == `approved`) {

                            // stop the loop - cancel payment
                            clearTimeout(loopCancelPayment);

                            // stop the loop - check payment
                            clearInterval(loopCheckPayment);

                            // delete the payment in dbOpenedPayments (wio.db)
                            await dbOpenedPayments.delete(channelI.id);

                            // embed - success payment
                            const embedSuccessPayment = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Pagamento Aprovado`)
                                .setDescription(`✅ | O pagamento no valor de **R$__${Number(valueInserted).toFixed(2)}__** gerado por ${userI} foi aprovado!`)
                                .setColor(`Green`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

                            // editReply - success payment
                            await interaction.editReply({
                                content: `🎉 | Pagamento Aprovado!\n📝 | ID do Pagamento: **${data.id}**`,
                                embeds: [embedSuccessPayment],
                                components: []
                            });

                        };

                    }, 5000);

                    // createMessageComponentCollector - collector
                    const collectorPayment = msg.createMessageComponentCollector({
                        time: 600000
                    });
                    collectorPayment.on("collect", async (iPayment) => {

                        // copiaCola - button
                        if (iPayment.customId == `copiaCola`) {

                            // deferUpdate - postphone the update
                            await iPayment.deferUpdate();

                            // copia & cola
                            const codePix = data.point_of_interaction.transaction_data.qr_code;

                            // followUp - copia & cola
                            await iPayment.followUp({
                                content: `${codePix}`,
                                ephemeral: true
                            });

                        };

                        // qrCode - button
                        if (iPayment.customId == `qrCode`) {

                            // deferUpdate - postphone the update
                            await iPayment.deferUpdate();

                            // qr code - attachment
                            const bufferQrCode = Buffer.from(data.point_of_interaction.transaction_data.qr_code_base64, "base64");
                            const qrCodeAttachment = new AttachmentBuilder(bufferQrCode, "payment.png");

                            // followUp - qr code
                            await iPayment.followUp({
                                files: [qrCodeAttachment],
                                ephemeral: true
                            });

                        };

                        // cancelPayment - button
                        if (iPayment.customId == `cancelPayment`) {

                            // deferUpdate - postphone the update
                            await iPayment.deferUpdate();

                            // stop the loop - payment
                            clearTimeout(loopCancelPayment);

                            // stop the loop - check payment
                            clearInterval(loopCheckPayment);

                            // cancel payment via paid market
                            await mpPayment.cancel({ id: data.id })
                                .catch((err) => {
                                    return;
                                });

                            // delete the payment in dbOpenedPayments (wio.db)
                            await dbOpenedPayments.delete(channelI.id);

                            // message - edit - cancelled payment
                            await interaction.editReply({
                                content: `❌ | Pagamento Cancelado!`,
                                embeds: [],
                                components: []
                            });

                            // stop the collector (collectorPayment)
                            await collectorPayment.stop();

                        };

                    });

                }).catch(async (err) => {

                    // message - edit - error
                    await interaction.editReply({
                        content: `❌ | Ocorreu um erro ao gerar o pagamento.`,
                        embeds: [],
                        components: []
                    });

                    // delete the product in dbOpenedPayments (wio.db)
                    await dbOpenedPayments.delete(channelI.id);

                });

        });

    },
};