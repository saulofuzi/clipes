const { Client, GatewayIntentBits, Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Configuração com suas credenciais
const TOKEN = 'MTQ0NzA5ODg2NTgwMjE1MDA5Mg.GX7ovq.8LN0ZjwbeQ8IanGs6650VmZxasZE4B9xzZaYg8';
const CLIENT_ID = '1447098865802150092';

console.log('🚀 Iniciando bot...');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Carregar comandos
const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(__dirname, 'commands', file));
    commands.push(command.data.toJSON());
}

// Registrar comandos slash
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('🔄 Registrando comandos slash...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        console.log('✅ Comandos slash registrados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
})();

client.once(Events.ClientReady, (c) => {
    console.log(`✅ Bot ${c.user.tag} está online!`);
    console.log(`📊 Memória usada: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🆔 Client ID: ${CLIENT_ID}`);
    console.log(`🌐 Servidor: ${c.guilds.cache.size} servidores`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = require(path.join(__dirname, 'commands', interaction.commandName));
    
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('❌ Erro ao executar comando:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao executar o comando!',
            ephemeral: true
        });
    }
});

client.on(Events.Error, error => {
    console.error('❌ Erro no cliente Discord:', error);
});

// Limpeza automática de arquivos temporários
setInterval(() => {
    const tempDir = path.join(__dirname, '..', 'temp');
    if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            const fileAge = (now - stats.mtimeMs) / 1000 / 60;
            if (fileAge > 5) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Arquivo temporário removido: ${file}`);
            }
        });
    }
}, 30 * 60 * 1000);

client.login(TOKEN);
