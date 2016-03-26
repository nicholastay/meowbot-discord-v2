/*eslint-disable no-unused-vars */ // shh eslint we need these vars for eval
const Discord  = require('../Core/Discord')
    , Database = require('../Core/Database')
    , Handlers = require('../Core/Handlers')
    , Tools    = require('../Core/Tools')

class Admin {
    constructor() {
        this.textChannel = null
    }

    get commands() {
        return {
            'exec': {
                description: 'Executes a raw JavaScript command and returns the output.',
                hidden: true,
                permissionLevel: 3,
                handler: (params) => {
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
            }
        }
    }
}

export default new Admin
