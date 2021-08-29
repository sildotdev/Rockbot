const Discord = require('discord.js')
const config = require('../../../config/bot.json')
const request = require('request')
const cheerio = require('cheerio')
const schedule = require('node-schedule');
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

let CurrentLevel = false
let LevelDescription = false

function GetLevelDescription() {
    return LevelDescription ? LevelDescription : "*Error retrieving Northwestern COVID-19 level.*"
}

module.exports = (client) => {
    if (!config.covid.enabled) return;

    client.on('ready', () => {
        var statsSchedule = schedule.scheduleJob('0 23 * * 4', statsUpdate);
        var statsSchedule2 = schedule.scheduleJob('0 23 * * 1', statsUpdate);
        var caseSchedule = schedule.scheduleJob('0 20 * * 5', caseUpdate);
        var levelSchedule = schedule.scheduleJob('30 * * * * *', levelUpdate);
        var newsSchedule = schedule.scheduleJob('45 * * * * *', newsUpdate);

        levelUpdate()
        newsUpdate()

        // statsUpdate()
        // caseUpdate()
    })

    function statsUpdate() {
        if (!config.covid.stats.enabled) return;

        request('https://www.northwestern.edu/coronavirus-covid-19-updates/university-status/dashboard/index.html', (err, res, body) => {
            if (err || !res || !body || res.statusCode != 200) {
                console.error('statsUpdate request failed. Status code: ' + res.statusCode + '. Error: ' + err)
                return
            }

            let $ = cheerio.load(body)

            let statsData = {}
            
            let unwantedText = $('#standard-wrap > div > section:nth-child(4) > div > div:nth-child(1) > div.small > strong').text()
            let statsDateRange = $('#standard-wrap > div > section:nth-child(4) > div > div:nth-child(1) > div.small').text().substring(unwantedText.length)
            
            let stats = $('#standard-wrap > div > section:nth-child(4) > div').children()
            
            stats.each((index, element) => {
                statsData[$('div.small > strong', element).text()] = $('div.big', element).text()
            })

            let embed = new Discord.MessageEmbed()
                .setColor(CurrentLevel.color || '#ffffff')
                .setTitle(`Activity Level: **${CurrentLevel.name}**`)
                .setURL('https://www.northwestern.edu/coronavirus-covid-19-updates/university-status/dashboard/index.html')
                .setDescription(GetLevelDescription())
                .attachFiles([path.join(__dirname, '../../public/img/nu.jpg')])
                .setAuthor('Northwestern COVID-19 Statistics Update', 'attachment://nu.jpg', 'https://www.northwestern.edu/coronavirus-covid-19-updates/index.html')
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
        if (!config.covid.level.enabled) return;

        request('https://www.northwestern.edu/coronavirus-covid-19-updates/index.html', (err, res, body) => {
            if (err || !res || !body || res.statusCode != 200) {
                console.error('levelUpdate request failed. Status code: ' + res.statusCode + '. Error: ' + err)
                return
            }

            let $ = cheerio.load(body)

            LevelDescription = $('#main-content > div > section:nth-child(1) > div.section-top.contain-970 > p:nth-child(3)').text()
            let level = $('#main-content > div > section:nth-child(1) > div.section-top.contain-970 > p.subhead').attr('class').split('-')[1].toUpperCase()
            
            if (!CurrentLevel) {
                CurrentLevel = ACTIVITY_LEVELS[level]
            }

            
            if (CurrentLevel != ACTIVITY_LEVELS[level]) {
                let embed = new Discord.MessageEmbed()
                    .setColor(ACTIVITY_LEVELS[level].color || '#ffffff')
                    .setTitle(`Activity level changed from ${CurrentLevel.name} to **${level}**`)
                    .setURL('https://www.northwestern.edu/coronavirus-covid-19-updates/university-status/dashboard/index.html')
                    .setDescription(GetLevelDescription())
                    .attachFiles([path.join(__dirname, '../../public/img/nu.jpg')])
                    .setAuthor('Northwestern COVID-19 Level Update', 'attachment://nu.jpg', 'https://www.northwestern.edu/coronavirus-covid-19-updates/index.html')
                    .addField('Disclaimer', 'Please double check this information by clicking the link above. Further updates will likely be communicated through e-mail by Northwestern officials.', false)
                
                client.channels.fetch(config.covid.level.channel)
                    .then(channel => channel.send(embed)
                        .then(message => {
                            message.crosspost().then(() => {
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
                
                CurrentLevel = ACTIVITY_LEVELS[level]
            }
        })
    }

    function caseUpdate() {
        if (!config.covid.cases.enabled) return;

        request('https://www.northwestern.edu/coronavirus-covid-19-updates/university-status/dashboard/index.html', (err, res, body) => {
            if (err || !res || !body || res.statusCode != 200) {
                console.error('caseUpdate request failed. Status code: ' + res.statusCode + '. Error: ' + err)
                return
            }

            let $ = cheerio.load(body)

            let rawCaseData = $('#canvas').text()
            let formattedCaseData = {}

            let latestDate = ""
            let latestData = {}

            rawCaseData = rawCaseData.split(';').slice(1)     // Remove title ("Bar chart values for confirmed COVID-19 cases") & split weeks into table
            rawCaseData.pop()

            for (let i = rawCaseData.length - 1; i >= 0; i--) {
                let splitEntry = rawCaseData[i].substring(1).split(':')
                let key = splitEntry[0]
                let splitData = splitEntry[1].split(',')
                let dataFormatted = {}

                for (let ii = 0; ii < splitData.length; ii++) {
                    splitData[ii] = splitData[ii].substring(1)
                    let splitDataSeparated = splitData[ii].split(' ')
                    let casesAmount = splitDataSeparated.splice(-1)[0]
                    let dataPopulation = splitDataSeparated.join(' ')
                    let percentChange = (i == rawCaseData.length - 1 ? 0 : Math.round(-(1-(casesAmount / latestData[dataPopulation].value)) * 100))
                    percentChange = (percentChange >= 0 ? '+' : '') + percentChange + '%'
                    percentChange = percentChange.replace('Infinity', '∞').replace('NaN', '0')
                    dataFormatted[dataPopulation] = { 'value': casesAmount, 'percentChange': percentChange }
                }

                formattedCaseData[key] = dataFormatted

                latestData = dataFormatted
                latestDate = key
            }

            let embed = new Discord.MessageEmbed()
                .setColor(CurrentLevel.color || '#ffffff')
                .setTitle(`Northwestern COVID-19 case update for ${latestDate}`)
                .setURL('https://www.northwestern.edu/coronavirus-covid-19-updates/university-status/dashboard/index.html')
                .setDescription(GetLevelDescription())
                .attachFiles([path.join(__dirname, '../../public/img/nu.jpg')])
                .setAuthor('Northwestern COVID-19 Case Update', 'attachment://nu.jpg', 'https://www.northwestern.edu/coronavirus-covid-19-updates/index.html')

            for (let k in latestData) {
                embed.addField(k, latestData[k].value + ' (' + latestData[k].percentChange + ')', true)
            }

            embed.addField('Disclaimer', 'Confirmed case counts are based on data from Northwestern’s various testing vendors. It includes Northwestern University students, staff and faculty. This data may include the same individuals under more than one category if they have multiple university roles. ', false)

            client.channels.fetch(config.covid.cases.channel)
                .then(channel => channel.send(embed)
                    .then(message => {
                        message.crosspost().then(() => {
                            console.log('COVID-19 case update successfully crossposted!')
                        }).catch((err) => {
                            console.error('Could not crosspost COVID-19 case update: ' + err)
                        })
                        console.log('COVID-19 case update successfully posted!')
                    }).catch((err) => {
                        console.error('Could not post COVID-19 case update: ' + err)
                    })
                ).catch((err) => {
                    console.error('Could not fetch COVID-19 case update channel: ' + err)
                })
        })
    }

    var lastNews = []
    function newsUpdate() {
        if (!config.covid.enabled || !config.covid.news.enabled) return
        console.log("Running COVID-19 news update.")
        
        request('https://www.northwestern.edu/coronavirus-covid-19-updates/developments/index.html', (err, res, body) => {
            if (err || !res || !body || res.statusCode != 200) {
                console.error('newsUpdate request failed. Status code: ' + res.statusCode + '. Error: ' + err)
                return
            }
            
            var $ = cheerio.load(body)
            var newsParent = $('#standard-wrap > div > article')

            if (!newsParent) {
                return
            }
            
            if (!lastNews || lastNews.length == 0) {
                newsParent.each((i, item) => {
                    if (item.name == "article") {
                        lastNews.push({
                            title: item.children[0].children[0].children[0].data,
                            date: item.children[1].children[0].data,
                            link: 'https://www.northwestern.edu/coronavirus-covid-19-updates/developments/' + item.children[0].children[0].attribs.href
                        })
                    }
                })

                console.log("Initialized news list.")
                return
            }

            var newNews = []
            newsParent.each((i, item) => {
                if (item.name == "article") {
                    console.log(item.children[0].children[0].children[0].data, "\t\t\t\t\t\t", lastNews[0].title)
                    if (item.children[0].children[0].children[0].data != lastNews[0].title) {
                        newNews.unshift({
                            title: item.children[0].children[0].children[0].data,
                            date: item.children[1].children[0].data,
                            link: 'https://www.northwestern.edu/coronavirus-covid-19-updates/developments/' + item.children[0].children[0].attribs.href
                        })

                        console.log("News update found: " + newNews[0].title)
                        
                        var embed = new Discord.MessageEmbed()
                            .setColor(CurrentLevel.color || '#ffffff')
                            .setTitle(newNews[0].title)
                            .setURL(newNews[0].link)
                            .attachFiles([path.join(__dirname, '../public/img/nu.jpg')])
                            .setAuthor('Northwestern COVID-19 News Update', 'attachment://nu.jpg', 'https://www.northwestern.edu/coronavirus-covid-19-updates/developments/index.html')
                            .setFooter('Made by sil  •  contact@sil.dev')
                            .setTimestamp()
                
                        client.channels.fetch(config.covid.news.channel)
                            .then(channel => channel.send(embed)
                                .then(message => {
                                    message.crosspost().then(() => {
                                        console.log('COVID-19 news update successfully crossposted!')
                                    }).catch((err) => {
                                        console.error('Could not crosspost COVID-19 news update: ' + err)
                                    })
                                    console.log('COVID-19 news update successfully posted!')
                                }).catch((err) => {
                                    console.error('Could not post COVID-19 news update: ' + err)
                                })
                            ).catch((err) => {
                                console.error('Could not fetch COVID-19 news update channel: ' + err)
                            })
                    } else {
                        return false
                    }
                }
            })

            newNews.forEach(news => {
                lastNews.unshift(news)
            })
        })
    }

}