import seedrandom from 'seedrandom'
import axios from 'axios'
import { RateLimiter } from 'limiter'
import MsTranslator from 'mstranslator'
import thenify from 'thenify'
import kuroshiro from 'kuroshiro'

import Config from '../Core/Config'
import Tools from '../Core/Tools'

const BALL_RESPONSES = [
    'it is certain',
    'it is decidedly so',
    'without a doubt',
    'yes, definitely',
    'you may rely on it',
    'as I see it, yes',
    'most likely',
    'outlook good',
    'yes',
    'signs point to yes',
    'reply hazy try again',
    'ask again later',
    'better not tell you now',
    'cannot predict now',
    'concentrate and ask again',
    'don\'t count on it',
    'my reply is no',
    'my sources say no',
    'outlook not so good',
    'very doubtful'
]

const JP_CHECK = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/ // https://stackoverflow.com/questions/15033196/using-javascript-to-check-whether-a-string-contains-japanese-characters-includi

kuroshiro.init(() => {}) // idk if you actually need this

class Novelty {
    constructor() {
        this.meowLimiter = new RateLimiter(25, 'minute')

        if (Config.novelty && Config.novelty.microsoft) {
            this.transLimiter = new RateLimiter(15, 'minute')
            this.transApi = new MsTranslator({
                client_id: Config.novelty.microsoft.clientId,
                client_secret: Config.novelty.microsoft.clientSecret
            }, true)

            this.transApi.translateAsync = thenify(this.transApi.translate)
        }
    }

    get commands() {
        return {
            'love': {
                description: 'Calculates the love between you and another person.',
                reply: true,
                blockPM: true,
                requireParams: true,
                handler: (params, author) => {
                    let to   = params.join(' ')
                      , love = Math.floor(seedrandom(`${author.name} <3 ${to}`)() * 100)
                    return `The love between you and ${to} is ${love}%! <3`
                }
            },
            '8ball': {
                description: 'Gives a 8-ball magic reading.',
                reply: true,
                blockPM: true,
                requireParams: true,
                handler: () => {
                    let readingIndex = Tools.getRandomInt(0, BALL_RESPONSES.length)
                    return `I peer into my magic 8-ball and it says: ${BALL_RESPONSES[readingIndex]}.`
                }
            },
            'meow': {
                description: 'Meow.',
                handler: async () => {
                    if (this.meowLimiter.tryRemoveTokens(1)) {
                        let cat = (await axios.get('http://random.cat/meow')).data

                        if (!cat.file)
                            throw new Error('no cat file/api broke')
                        
                        return `meow! ${encodeURI(cat.file)}`
                    }
                    // otherwise silently drop command
                }
            },
            'reverse': {
                description: 'I wonder what this command does pfft',
                handler: (params) => {
                    return Tools.reverse(params.join(' '))
                }
            },
            'sideways': {
                description: 'sideways :^)',
                handler: (params) => {
                    return params.join(' ').split('').join('\n')
                }
            },
            'square': {
                description: 'square.',
                handler: (params) => {
                    let text = params.join(' ').split('')
                      , resp = '```\n'
                    for (let i = 0; i < text.length; i++) {
                        resp += text.join(' ')
                        text.push(text.shift())
                        resp += '\n'
                    }
                    resp += '```'
                    return resp
                }
            },
            'roll': {
                description: 'Roll the dice. (by default 1-10, usage [min (optional)] [max])',
                handler: (params) => {
                    let min = 1
                      , max = 10

                    if (Number(params[0])) {
                        if (Number(params[1])) {
                            min = Number(params[0])
                            max = Number(params[1])
                        } else {
                            max = Number(params[0])
                        }
                    }

                    return `I roll the dice and the number is..... ${Tools.getRandomInt(min, max+1)}!`
                }
            },
            'translate': {
                description: 'Translate random phrases!',
                hidden: !!this.transApi, // hide aka disable if not set up
                requireParams: true,
                handler: async (params) => {
                    if (params[0].toLowerCase() === 'languages')
                        return 'You can find a list of languages here - https://msdn.microsoft.com/en-us/library/hh456380.aspx'

                    if (!params[1])
                        return

                    if (this.transLimiter.tryRemoveTokens(1)) {
                        let toL   = params.shift()
                          , fromL = 'en'

                        if (toL.indexOf(':') > -1) {
                            let spl = toL.split(':')
                            toL = spl[1]
                            fromL = spl[0]
                        }

                        let resp = await this.transApi.translateAsync({
                            text: params.join(' '),
                            from: fromL,
                            to: toL
                        })

                        return `${resp} (\`${fromL}:${toL}\`)`
                    }
                    // silently drop
                }
            },
            'unweeb': {
                description: 'Learn to read that weebspeak! ...',
                requireParams: true,
                reply: true,
                handler: (params, author) => {
                    let input = params.join(' ')

                    if (!JP_CHECK.test(input))
                        return 'You need to enter at least some Japanese!'

                    let conversion = kuroshiro.convert(input, { to: 'romaji', mode: 'spaced' })
                    if (!conversion)
                        return 'Invalid Japanese input!'

                    return `\n\`\`\`\n${conversion}\n\`\`\``
                }
            }
        }
    }
}

export default new Novelty
