import axios from 'axios'
import fs from 'fs'
import thenify from 'thenify'

const readFileAsync = thenify(fs.readFile) // readFile promise wrapper

/*eslint-disable no-unused-vars */ // shh eslint we need these vars for eval
const Discord  = require('../Core/Discord')
    , Database = require('../Core/Database')
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
                handler: async (params, author, channel) => {
                    if (!params[0]) return
                    let resource = params.join(' ')
                      , b64data  = null

                    Discord.sendMessage(channel, 'One sec, grabbing and uploading picture...')

                    if (/^https?:\/\//.test(resource)) b64data = (await axios.get(resource, { responseType: 'arraybuffer' })).data // URL
                    else b64data = await readFileAsync(resource) // File

                    return Discord.client.setAvatar(b64data)
                                         .then(() => { return 'New avatar sucessfully set.' })
                }
            },
            'setname': {
                description: 'Changes the name of the bot itself.',
                hidden: true,
                permissionLevel: 3,
                handler: async (params) => {
                    if (!params[0]) return
                    return Discord.client.setUsername(params.join(' '))
                                         .then(() => { return 'New username sucessfully set.' })
                }
            }
        }
    }
}

export default new Admin
