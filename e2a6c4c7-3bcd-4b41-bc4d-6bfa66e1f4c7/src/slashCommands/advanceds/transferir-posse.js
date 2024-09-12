// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const config = new JsonDatabase({ databasePath: "./config.json" });


// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("transferir-posse")
        .setDescription("[🛠/🔐] Transfira a posse do BOT!")
        .addUserOption(opUser => opUser
            .setName(`usuário`)
            .setDescription(`Selecione um usuário para transferir a posse`)
            .setRequired(true)
        )
        .addStringOption(opString => opString
            .setName(`chave`)
            .setDescription(`Insira sua chave de segurança`)
            .setMaxLength(8)
            .setRequired(true)
        )
        .setDMPermission(false),

    // execute (command)
    async execute(interaction, client) {

        // no owner - user without owner in dbConfigs (wio.db)
        const ownerId = await config.get(`owner`);
        if (ownerId != interaction.user.id) {
            await interaction.reply({
                content: `❌ | Você não tem permissão para usar este comando.`,
                ephemeral: true
            });
            return;
        };

        // user selected
        const userSelected = interaction.options.getUser(`usuário`);

        // checks if the chosen user is the same as the interaction
        if (userSelected.id == interaction.user.id) {
            await interaction.reply({
                content: `❌ | Você não pode selecionar a sí mesmo.`,
                ephemeral: true
            });
            return;
        };

        // create the modal
        const modal = new ModalBuilder()
            .setCustomId(`modalConfirm-${keyInserted}`)
            .setTitle(`📝 | Confirmação`)

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

            // isModalSubmit
            if (iModal.isModalSubmit) {

                // modalLines - modal
                if (iModal.customId == `modalConfirm-${keyInserted}`) {

                    // deferUpdate - postphone the update
                    await iModal.deferUpdate();

                    // inserted text - confirm
                    const insertedText = iModal.fields.getTextInputValue(`confirmText`)
                        .toLowerCase();

                    // checks if confirmText is equal to "sim"
                    if (insertedText == `sim`) {

                        // change the ownerId in dbConfigs (wio.db)
                        await dbConfigs.set(`ownerId`, userSelected.id);

                        // log & message
                        await console.log(`[OWNER/LOG] ${userSelected.username} became an new owner!`);
                        await userSelected.send({
                            content: `${userSelected}`,
                            embeds: [new EmbedBuilder()
                                .setAuthor({ name: `${userSelected.username} - ${userSelected.id}`, iconURL: userSelected.avatarURL({ dynamic: true }) })
                                .setTitle(`${client.user.username} | Novo Dono`)
                                .setDescription(`👑 | Olá ${userSelected}, você é meu novo dono! A partir de agora, você tem controle total sobre todas as minhas funções e comandos.\n\n️⚠ | Apenas você tem permissão para usar os seguintes comandos: (**/add-perm**) & (**/remove-perm**). Estes comandos permitem que você gerencie as permissões dos membros, concedendo ou retirando acesso às minhas funcionalidades.\n\n🔐 | Para simplificar a transferência de posse, criamos uma nova chave única para você. Mantenha está chave em sigilo. Ela permite acesso fácil à transferência de posse da aplicação **${client.user.username}** e não deve ser compartilhada com mais ninguém! Para visualizá-la, basta clicar no botão abaixo.`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                            ],
                            components: [new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`showSecurityKey`)
                                        .setLabel(`Mostrar Chave de Segurança`)
                                        .setEmoji(`🔑`)
                                        .setStyle(`Secondary`)
                                )
                            ]
                        }).catch((err) => {
                            return;
                        });

                        // message - success
                        await iModal.followUp({
                            content: `✅ | Posse transferida para o usuário ${userSelected} com sucesso!\n**⚠ | Você não tem mais o controle deste BOT.**`,
                            ephemeral: true
                        });

                    };

                };

            };

        });

    },
};