const child_process = require('child_process')
const log = require('./log')
const fs = require('fs')

const FIXLLVM = `
  brew install llvm;
  NEWLLVM="$(brew ls llvm | grep llvm-ar\$)"
  OLDLLVM="$(which llvm-ar)"
  mv $OLDLLVM $OLDLLVM.old &&
  ln -s $NEWLLVM $OLDLLVM
`

module.exports = function(args, done) {
  let cmd = 'cargo ' + args.join(' ')
  log(`running '${cmd}'`)
  let res = child_process.exec(`${cmd} --color always`, {env: process.env, stdio: 'pipe'})
  let errBuf = ""
  let outBuf = ""
  res.stdout.on('data', (dat) => {
    outBuf += dat.toString()
  })
  res.stderr.on('data', (dat) => {
    errBuf += dat.toString()
    process.stderr.write(dat)
  })
  res.on('exit', (code, signal) => {
    if (code !== 0) {
      if (errBuf.indexOf('dyld: Symbol not found: _futimens') >= 0) {
        log('mac linker error detected, see https://github.com/kripken/emscripten/issues/5418')
        log('performing fix...')
        child_process.execSync(FIXLLVM, {stdio: [null, process.stdout, process.stderr], env: process.env})
        log('rerunning cargo command...')
        module.exports(args)
      }
      process.exit(code)
    } else if (done) {
      done(outBuf)
    }
  })
}