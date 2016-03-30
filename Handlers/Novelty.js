import seedrandom from 'seedrandom'

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
            }
        }
    }
}

export default new Novelty
