const exec = require('child_process').exec;
const path = require("path");

function RemoteCopyPlugin(options) {
    if(!options.remoteOutputAddress){
        throw new Error('RemoteCopyPlugin: remoteOutputAddress must be present');
    }
    const apply = (compiler) => {
        compiler.plugin('after-emit', (compilation, callback) => {
            const remoteOutputAddress = options.remoteOutputAddress;
            const port = options.port ? '-P ' + options.port + ' ': '';
            const outputPath = compiler.outputPath;
            const workingDirectory = process.cwd();
            var relativeLocalPath = path.relative(
                workingDirectory,
                path.join(
                    outputPath,
                    Object.keys(compilation.assets).find(v => true).replace(/\?.*$/,'')
                )
            ).replace(/\\.*$/,'');            
            exec('"%PROGRAMFILES(x86)%\\PuTTY\\pscp" -r ' 
                    + port
                    + relativeLocalPath + ' '
                    + remoteOutputAddress, (error, stdout, stderr) =>
            {
                if (error) {
                  console.error(`exec error: ${error}`);
                  callback(null,error);
                  return;
                }
                console.log(`stdout: ${stdout}`);
                if(stderr) {
                    console.log(`stderr: ${stderr}`);
                }
            });
            callback();
        });
    }
    return {
        apply
    }
}

RemoteCopyPlugin['default'] = RemoteCopyPlugin;
module.exports = RemoteCopyPlugin;