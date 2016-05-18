import seedrandom from 'seedrandom'
import axios from 'axios'
import { RateLimiter } from 'limiter'

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

class Novelty {
    constructor() {
        this.meowLimiter = new RateLimiter(25, 'minute')
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
            }
        }
    }
}

export default new Novelty
