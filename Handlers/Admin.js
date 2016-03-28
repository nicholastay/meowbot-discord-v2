import axios from 'axios'
import fs from 'fs'
import thenify from 'thenify'

const readFileAsync = thenify(fs.readFile) // readFile promise wrapper

/*eslint-disable no-unused-vars */ // shh eslint we need these vars for eval
const Discord  = require('../Core/Discord')
    , Database = require('../Core/Database').db
    , Handlers = require('../Core/Handlers')
    , Tools    = require('../Core/Tools')

class Admin {
    get commands() {
        return {
            'exec': {
                description: 'Executes a raw JavaScript command and returns the output.',
                hidden: true,
                permissionLevel: 3,
                handler: (params, author, channel, message) => {
                    let resp
                    try {
                        resp = eval(params.join(' '))
                    }
                    catch (e) {
                        resp = e
                    }

                    // shutup eslint because it just looks cleaner without the weird template string workarounds
                    return '```\n' + resp + '\n```' // eslint-disable-line prefer-template
                }
            },
            'setavatar': { /*eslint-enable no-unused-vars */
                description: 'Sets the avatar of the bot using a file on the local system, or a url.',
                hidden: true,
                permissionLevel: 3,
                handler: async (params) => {
                    let resource = params.join(' ')
                      , b64data  = null

                    if (/^https?:\/\//.test(resource)) b64data = (await axios.get(resource, { responseType: 'arraybuffer' })).data // URL
                    else b64data = await readFileAsync(resource) // File

                    return Discord.client.setAvatar(b64data)
                                         .then(() => { return 'New avatar sucessfully set.' })
                }
            }
        }
    }
}

export default new Admin
