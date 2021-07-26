const Discord = require('discord.js')
const client = new Discord.Client()
const config = require('../../config/bot.json')

client.on('ready', () => {
    console.log(`Rockbot logged in as ${client.user.tag}`)
})

client.on('message', msg => {
	if (msg.content === 'nu!ping') {
		msg.reply('Pong!');
	}
});

client.login(config.token);

module.exports = client