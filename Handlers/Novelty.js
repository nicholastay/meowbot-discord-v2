import seedrandom from 'seedrandom'
import axios from 'axios'

class Novelty {
    get commands() {
        return {
            'love': {
                description: 'Calculates the love between you and another person.',
                reply: true,
                blockPM: true,
                handler: (params, author) => {
                    if (!params[0]) return
                    let to   = params.join(' ')
                      , love = Math.floor(seedrandom(`${author.name} <3 ${to}`)() * 100)
                    return `The love between you and ${to} is ${love}%! <3`
                }
            },
            'meow': {
                description: 'Meow.',
                handler: async () => {
                    let cat = (await axios.get('http://random.cat/meow')).data
                    if (!cat.file) throw new Error('no cat file/api broke')
                    return `meow! ${cat.file}`
                }
            }
        }
    }
}

export default new Novelty
