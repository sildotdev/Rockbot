const Discord = require('discord.js');
const config = require('../../../config/bot.json')
const request = require('request');
const cheerio = require('cheerio');
const path = require('path')

const ACTIVITY_LEVELS = {
    "GREEN": {
        "name": "Green",
        "color": "#58b947",
    },
    "YELLOW": {
        "name": "Yellow",
        "color": "#ffc520",
    },
    "ORANGE": {
        "name": "Orange",
        "color": "#d85820",
    },
    "RED": {
        "name": "Red",
        "color": "#e51f1f",
    },
}

var CurrentLevel = ACTIVITY_LEVELS["YELLOW"]
var LevelDescription = ""

module.exports = (client) => {
    if (!config.covid.enabled) return

    client.on('ready', () => {
        levelUpdate()
        statsUpdate()
    })

    function statsUpdate() {
        if (!config.covid.stats.enabled) return

        request('https://www.northwestern.edu/coronavirus-covid-19-updates/university-status/dashboard/index.html', (err, res, body) => {
            if (err || !res || !body || res.statusCode != 200) {
                return;
            }

            var $ = cheerio.load(body);

            var statsData = {}
            
            var unwantedText = $('#standard-wrap > div > section:nth-child(4) > div > div:nth-child(1) > div.small > strong').text()
            var statsDateRange = $('#standard-wrap > div > section:nth-child(4) > div > div:nth-child(1) > div.small').text().substring(unwantedText.length)
            
            var stats = $('#standard-wrap > div > section:nth-child(4) > div').children()
            
            stats.each((index, element) => {
                statsData[$('div.small > strong', element).text()] = $('div.big', element).text()
            })

            var embed = new Discord.MessageEmbed()
                .setColor(CurrentLevel.color)
                .setTitle(`Current Activity Level: **${CurrentLevel.name}**`)
                .setURL('https://www.northwestern.edu/coronavirus-covid-19-updates/university-status/dashboard/index.html')
                .setDescription(LevelDescription)
                .attachFiles([path.join(__dirname, '../../public/img/nu.jpg')])
                .setAuthor('Northwestern COVID-19 Statistics Update', 'attachment://nu.jpg', 'https://www.northwestern.edu/coronavirus-covid-19-updates/university-status/dashboard/index.html')
                .setTimestamp()
                .setFooter('Made by sil  •  contact@sil.dev')
                .addField('\u200B', `**__Data for the ${statsDateRange}__**`, false)


            for (let key in statsData) {
                embed.addField(key, statsData[key], true)
            }    

            client.channels.fetch(config.covid.stats.channel)
                .then(channel => channel.send(embed)
                    .then(message => {
                        message.crosspost().then(() => {
                            console.log('COVID-19 status update successfully crossposted!')
                        }).catch((err) => {
                            console.error('Could not crosspost COVID-19 status update: ' + err)
                        })
                        console.log('COVID-19 status update successfully posted!')
                    }).catch((err) => {
                        console.log('Could not post COVID-19 status update: ' + err)
                    })
                ).catch((err) => {
                    console.log('Could not fetch COVID-19 status update channel: ' + err)
                })
        })
    }

    function levelUpdate() {
        if (!config.covid.level.enabled) return

        request('https://www.northwestern.edu/coronavirus-covid-19-updates/index.html', (err, res, body) => {
            if (err || !res || !body || res.statusCode != 200) {
                return;
            }

            var $ = cheerio.load(body);
            LevelDescription = $('#main-content > div > section:nth-child(1) > div.section-top.contain-970 > p:nth-child(3)').text()
            
            var level = $('#main-content > div > section:nth-child(1) > div.section-top.contain-970 > p.subhead').attr('class').split('-')[1].toUpperCase()
            
            if (CurrentLevel != ACTIVITY_LEVELS[level]) {
                var embed = new Discord.MessageEmbed()
                    .setColor(ACTIVITY_LEVELS[level].color)
                    .setTitle(`Activity level changed from ${CurrentLevel.name} to **${level}**`)
                    .setURL('https://www.northwestern.edu/coronavirus-covid-19-updates/university-status/dashboard/index.html')
                    .setDescription(LevelDescription)
                    .attachFiles([path.join(__dirname, '../../public/img/nu.jpg')])
                    .setAuthor('Northwestern COVID-19 Statistics Update', 'attachment://nu.jpg', 'https://www.northwestern.edu/coronavirus-covid-19-updates/university-status/dashboard/index.html')
                    .addField('Disclaimer', 'Please double check this information by clicking the link above. Further updates will likely be communicated through e-mail by Northwestern officials.', false)
                
                client.channels.fetch(config.covid.level.channel)
                    .then(channel => channel.send(embed)
                        .then(message => {
                            message.crossport.then(() => {
                                console.log('COVID-19 level update successfully crossposted!')
                            }).catch((err) => {
                                console.error('Could not crosspost COVID-19 level update: ' + err)
                            })
                            console.log('COVID-19 level update successfully posted!')
                        }).catch((err) => {
                            console.error('Could not post COVID-19 level update: ' + err)
                        })
                    ).catch((err) => {
                        console.error('Could not fetch COVID-19 level update channel: ' + err)
                    })
            }
        })
    }
}