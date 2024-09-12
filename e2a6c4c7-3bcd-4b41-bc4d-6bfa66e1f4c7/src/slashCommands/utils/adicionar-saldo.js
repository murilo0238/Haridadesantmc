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
const dbProfiles = new JsonDatabase({ databasePath: "./databases/dbProfiles.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("adicionar-saldo")
        .setDescription("[💰] Adicione Saldo via Pix!")
        .addIntegerOption(opInteger => opInteger
            .setName(`valor`)
            .setDescription(`Valor que será adicionado`)
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

        // variables with balance informations
        const minimumDeposit = await dbConfigs.get(`balance.minimumDeposit`);

        // checks if the value is less than the minimum
        if (Number(valueInserted) < Number(minimumDeposit)) {
            await interaction.reply({
                content: `❌ | O valor mínimo para depósito é de \`R$${Number(minimumDeposit).toFixed(2)}\`.`,
                ephemeral: true
            });
            return;
        };

        // checks if the entered value is equal to 0
        if (Number(valueInserted) <= 0) {
            await interaction.reply({
                content: `❌ | O valor mínimo para depósito é de \`R$1\`.`,
                ephemeral: true
            });
            return;
        };

        // message - loading
        const msg = await interaction.reply({
            content: `🔁 | Gerando o pagamento ...`,
            ephemeral: true
        });

        // original value - no discount
        let originalValue = valueInserted;

        // value discounted - valueInserted
        let discountedValue = 0;

        // variables with balance discount information
        const bonusDeposit = await dbConfigs.get(`balance.bonusDeposit`);
        if (bonusDeposit != 0) {

            // changes the value of variables
            discountedValue = (bonusDeposit / 100) * originalValue;
            valueInserted = originalValue + discountedValue;

        };

        // payment details
        const paymentData = {
            transaction_amount: Number(originalValue),
            description: `Adição de Saldo - ${userI.username}`,
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

                    // log - payment time expired - balance
                    const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                    if (channelLogsPriv) {
                        await channelLogsPriv.send({
                            embeds: [new EmbedBuilder()
                                .setAuthor({ name: `${userI.username} - ${userI.id}`, iconURL: userI.avatarURL({ dynamic: true }) })
                                .setTitle(`${client.user.username} | Pagamento Cancelado`)
                                .setDescription(`👤 | O ${userI} não realizou o pagamento dentro do prazo e foi cancelada a adição de saldo no valor de **R$__${Number(originalValue).toFixed(2)}__**.`)
                                .addFields(
                                    { name: `📝 | ID do Pagamento:`, value: `**${data.id}**` }
                                )
                                .setThumbnail(userI.avatarURL({ dynamic: true }))
                                .setColor(`Red`)
                                .setTimestamp()
                            ]
                        });
                    };

                    // editReply - payment time expired
                    await interaction.editReply({
                        content: `⚠ | O prazo para o pagamento expirou, já que não foi efetuado dentro do período estipulado.`,
                        embeds: [],
                        components: []
                    });

                }, 600000);

                // arrow the pamyments information in dbOpenedPayments (wio.db)
                await dbOpenedPayments.set(`${channelI.id}.payer`, userI.id);
                await dbOpenedPayments.set(`${channelI.id}.valueAdded`, Number(originalValue));
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
                        { name: `💸 | Valor:`, value: `R$${Number(originalValue).toFixed(2)}` },
                        { name: `🎉 | Bônus de Depósito:`, value: `${bonusDeposit}% - R$${Number(discountedValue).toFixed(2)}` },
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

                        // adds the balance to the user profile 
                        await dbProfiles.add(`${userI.id}.balance`, Number(valueInserted));

                        // checks if the discount bonus is equal to 0
                        const bonusDeposit = await dbConfigs.get(`balance.bonusDeposit`);
                        if (bonusDeposit == 0) {

                            // log - success payment
                            const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                            if (channelLogsPriv) {
                                await channelLogsPriv.send({
                                    embeds: [new EmbedBuilder()
                                        .setAuthor({ name: `${userI.username} - ${userI.id}`, iconURL: userI.avatarURL({ dynamic: true }) })
                                        .setTitle(`${client.user.username} | Pagamento Criado`)
                                        .setDescription(`👤 | O ${userI} efetuou um pagamento no valor de R$${Number(originalValue).toFixed(2)} para adição de saldo.`)
                                        .addFields(
                                            { name: `📝 | ID do Pagamento:`, value: `**${data.id}**` }
                                        )
                                        .setThumbnail(userI.avatarURL({ dynamic: true }))
                                        .setColor(`Green`)
                                        .setTimestamp()
                                    ]
                                });
                            };

                            // embed - success payment
                            const embedSuccessPayment = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Pagamento Aprovado`)
                                .setDescription(`✅ | Seu pagamento no valor de **R$__${Number(originalValue).toFixed(2)}__** para adição de saldo foi aprovado!`)
                                .setColor(`Green`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

                            // editReply - success payment
                            await interaction.editReply({
                                content: `🎉 | Pagamento Aprovado!\n📝 | ID da compra: **${data.id}**`,
                                embeds: [embedSuccessPayment],
                                components: []
                            });

                        } else {

                            // log - success payment
                            const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                            if (channelLogsPriv) {
                                await channelLogsPriv.send({
                                    embeds: [new EmbedBuilder()
                                        .setAuthor({ name: `${userI.username} - ${userI.id}`, iconURL: userI.avatarURL({ dynamic: true }) })
                                        .setTitle(`${client.user.username} | Pagamento Criado`)
                                        .setDescription(`👤 | O ${userI} efetuou um pagamento no valor de R$${Number(originalValue).toFixed(2)} para adição de saldo e recebeu um bônus de **${bonusDeposit}%**, totalizando um acréscimo de **R$__${Number(valueInserted).toFixed(2)}__**.`)
                                        .addFields(
                                            { name: `📝 | ID do Pagamento:`, value: `**${data.id}**` }
                                        )
                                        .setThumbnail(userI.avatarURL({ dynamic: true }))
                                        .setColor(`Green`)
                                        .setTimestamp()
                                    ]
                                });
                            };

                            // embed - success payment
                            const embedSuccessPayment = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Pagamento Aprovado`)
                                .setDescription(`✅ | Seu pagamento no valor de **R$__${Number(originalValue).toFixed(2)}__** para adição de saldo foi aprovado! Você recebeu um bônus de **${bonusDeposit}%**, totalizando um acréscimo de **R$__${Number(valueInserted).toFixed(2)}__**.`)
                                .setColor(`Green`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

                            // editReply - success payment
                            await interaction.editReply({
                                content: `🎉 | Pagamento Aprovado!\n📝 | ID da compra: **${data.id}**`,
                                embeds: [embedSuccessPayment],
                                components: []
                            });

                        };

                    };

                }, 5000);

                // createMessageComponentCollector - collector
                const filter = (m) => m.user.id == userI.id;
                const collectorPayment = msg.createMessageComponentCollector({
                    filter: filter,
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

                        // log - cancelled payment - balance
                        const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                        if (channelLogsPriv) {
                            await channelLogsPriv.send({
                                embeds: [new EmbedBuilder()
                                    .setAuthor({ name: `${userI.username} - ${userI.id}`, iconURL: userI.avatarURL({ dynamic: true }) })
                                    .setTitle(`${client.user.username} | Pagamento Cancelado`)
                                    .setDescription(`👤 | O ${userI} cancelou o pagamento para adição de saldo no valor de **R$__${Number(originalValue).toFixed(2)}__**.`)
                                    .addFields(
                                        { name: `📝 | ID do Pagamento:`, value: `**${data.id}**` }
                                    )
                                    .setThumbnail(userI.avatarURL({ dynamic: true }))
                                    .setColor(`Red`)
                                    .setTimestamp()
                                ]
                            });
                        };

                        // deleteReply - cancelled payment
                        await interaction.deleteReply();

                        // stop the collector (collectorPayment)
                        await collectorPayment.stop();

                    };

                });

                // log - created payment
                const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                if (channelLogsPriv) {
                    await channelLogsPriv.send({
                        embeds: [new EmbedBuilder()
                            .setAuthor({ name: `${userI.username} - ${userI.id}`, iconURL: userI.avatarURL({ dynamic: true }) })
                            .setTitle(`${client.user.username} | Pagamento Criado`)
                            .setDescription(`👤 | O ${userI} solicitou um pagamento para adição de saldo no valor de **__R$${Number(originalValue).toFixed(2)}__**.`)
                            .addFields(
                                { name: `📝 | ID do Pagamento:`, value: `**${data.id}**` }
                            )
                            .setThumbnail(userI.avatarURL({ dynamic: true }))
                            .setColor(`Green`)
                            .setTimestamp()
                        ]
                    });
                };

            }).catch(async (err) => {

                // message - edit - error
                await interaction.editReply({
                    content: `❌ | Ocorreu um erro ao gerar o pagamento.`,
                    embeds: [],
                    components: [],
                    ephemeral: true
                });

                // delete the product in dbOpenedPayments (wio.db)
                await dbOpenedPayments.delete(channelI.id);

            });

    },
};