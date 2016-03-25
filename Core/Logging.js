import chalk from 'chalk'
import strftime from 'fast-strftime'

class Logging {
    log(...content) {
        console.log(chalk.cyan(`[${strftime('%l:%M%P')}]`), ...content)
    }

    mlog(module, ...content) {
        this.log(chalk.magenta(`<${module}>`), ...content)
    }
}

export default new Logging
