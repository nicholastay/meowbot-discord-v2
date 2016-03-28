import nodesu from 'nodesu'

import Config from '../Core/Config'

class Osu {
    constructor() {
        if (!Config.osu || !Config.osu.apiKey) return this.api = null
        this.api = new nodesu.api({
            apiKey: Config.osu.apiKey
        })
    }

    get commands() {
        return {
            'osu': {
                description: 'Get\'s the osu! information of a user.',
                handler: async (params) => {
                    if (!this.api) return 'My bot owner hasn\'t set me up properly! Please go tell him to setup me properly for osu!'
                    if (!params[0]) return 'You need to tell me the username of the person you want me to lookup...'

                    let osuUser = await this.api.getUser(this.api.user.byUsername(params.join(' ')))
                    return `Here's some information about that osu! user:
\`\`\`
Username: ${osuUser.username}
User ID: ${osuUser.user_id}
Avatar: https://a.ppy.sh/${osuUser.user_id}
Country: ${osuUser.country}
Rank: #${osuUser.pp_rank} (${osuUser.pp_raw}pp)
Country Rank: #${osuUser.pp_country_rank} [${osuUser.country}]
Level: ${Math.floor(Number(osuUser.level))}
Playcount: ${osuUser.playcount}
Ranked Score: ${osuUser.ranked_score}
Accuracy: ${Number(osuUser.accuracy).toFixed(2)}%
Total Hit Counts (300/100/50): ${osuUser.count300}/${osuUser.count100}/${osuUser.count50}
Total Ranks Achieved (SS/S/A): ${osuUser.count_rank_ss}/${osuUser.count_rank_s}/${osuUser.count_rank_a}
Profile URL: https://osu.ppy.sh/u/${osuUser.user_id}
\`\`\``
                }
            }
        }
    }
}

export default new Osu
