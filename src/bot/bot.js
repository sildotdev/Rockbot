const Discord = require('discord.js')
const client = new Discord.Client()
const config = require('../../config/bot.json')

if (config.covid.enabled) require('./modules/covid.js')(client);

client.on('ready', () => {
    console.log(`Rockbot logged in as ${client.user.tag}`)

	client.api.applications(client.user.id).guilds('867553887186321419').commands.post({data: {
		name: 'ping',
		description: 'Ping pong!'
	}})
})

client.login(config.token);

client.ws.on('INTERACTION_CREATE', async interaction => {
	if (interaction.data.name == 'ping') {
		client.api.interactions(interaction.id, interaction.token).callback.post({data: {
			type: 4,
			data: {
			  content: 'Pong!'
			}
		}})
	}
})

module.exports = client