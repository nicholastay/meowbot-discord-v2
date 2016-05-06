import chalk from 'chalk'
import strftime from 'fast-strftime'

class Logging {
    static log(...content) {
        console.log(chalk.cyan(`[${strftime('%l:%M%P')}]`), ...content)
    }

    static mlog(module, ...content) {
        this.log(chalk.magenta(`<${module}>`), ...content)
    }
}

export default Logging
