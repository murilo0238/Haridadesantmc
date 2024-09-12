// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbProfiles = new JsonDatabase({ databasePath: "./databases/dbProfiles.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("administrar-saldo")
        .setDescription("[🛠/💰] Gerencie o saldo de algum usuário!")
        .addStringOption(opString => opString
            .setName("ação")
            .setDescription("Selecione o Tipo de Ação")
            .addChoices(
                { name: "Adicionar", value: "add" },
                { name: "Remover", value: "remove" }
            )
            .setRequired(true)
        )
        .addUserOption(opUser => opUser
            .setName("usuário")
            .setDescription("Usuário que terá o saldo gerenciado")
            .setRequired(true)
        )
        .addIntegerOption(opInteger => opInteger
            .setName("valor")
            .setDescription("Insirá o valor que será adicionado ou removido")
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

        // variables with option information
        const actionSelected = interaction.options.getString("ação");
        const userSelected = interaction.options.getUser("usuário");
        const valueInserted = interaction.options.getInteger("valor");

        // checks if the entered value is equal to 0
        if (Number(valueInserted) <= 0) {
            await interaction.reply({
                content: `❌ | O valor mínimo é de **R$__1.00__**!`,
                ephemeral: true
            });
            return;
        };

        // chosen action
        if (actionSelected == `add`) {

            // adds the balance to the user profile 
            await dbProfiles.add(`${userSelected.id}.balance`, Number(valueInserted));

            // user balance
            const userBalance = await dbProfiles.get(`${userSelected.id}.balance`);

            // message - success
            await interaction.reply({
                content: `✅ | Foram adicionados **R$__${Number(valueInserted).toFixed(2)}__** no usuário ${userSelected}. Agora ele tem **R$__${Number(userBalance).toFixed(2)}__** no total.`,
                ephemeral: true
            });

        } else if (actionSelected == "remove") {

            // user balance - before
            const userBalanceBefore = await dbProfiles.get(`${userSelected.id}.balance`);

            // checks if the user's balance is equal to 0
            if (Number(userBalanceBefore) <= 0) {
                await interaction.reply({
                    content: `❌ | O usuário ${userSelected} não tem saldo suficiente para ser removido.`,
                    ephemeral: true
                });
                return;
            };

            // subtracts the balance to the user profile 
            await dbProfiles.substr(`${userSelected.id}.balance`, Number(valueInserted));

            // user balance - after
            const userBalanceAfter = await dbProfiles.get(`${userSelected.id}.balance`);

            // message - success
            await interaction.reply({
                content: `✅ | Foram removidos **R$__${Number(valueInserted).toFixed(2)}__** do usuário ${userSelected}. Agora ele tem **R$__${Number(userBalanceAfter).toFixed(2)}__** no total.`,
                ephemeral: true
            });

        };

    },
};