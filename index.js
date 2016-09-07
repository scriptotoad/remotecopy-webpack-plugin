const exec = require('child_process').exec;
const path = require("path");
const isWin = /^win/.test(process.platform);
var Promise = require('bluebird');
function execp(s){
    return new Promise(function (resolve, reject) {
        console.log('\n');
        console.log(s);
        exec( s, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else if (stderr) {
                reject(stderr);
            }
            resolve(stdout);
        });
    });
}

function RemoteCopyPlugin(options) {
    if(!options.remoteOutputAddress){
        throw new Error('RemoteCopyPlugin: remoteOutputAddress must be present');
    }
    const apply = (compiler) => {
        if(!isWin){
            return
        }
        const puttyInstallLocation = '"%PROGRAMFILES(x86)%\\PuTTY\\"';
        // TODO https://github.com/ironSource/node-regedit 
        // cmd REG QUERY HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\PuTTY_is1 /v InstallLocation
        // http://forum.sysinternals.com/finding-all-installed-programs-from-the-registry_topic21312.html
        const workingDirectory = process.cwd();
        compiler.plugin('after-emit', (compilation, callback) => {
            const remoteOutputAddress = options.remoteOutputAddress;
            var hostName = remoteOutputAddress.split(':');
            const remotePathPref = hostName.slice(1);
            hostName = hostName[0];
            const port = options.port ? '-P ' + options.port + ' ': '';
            const outputPath = compiler.outputPath;
            
//            var tree = Object.keys(compilation.assets).reduce( (prev, file, i, a) => {
//                var relativeLocalPathName = path.relative(
//                    workingDirectory,
//                    path.join(
//                        outputPath,
//                        file.replace(/\?.*$/,'')
//                    )
//                );
//                var pathChunks = relativeLocalPathName.split(path.sep);
//                var 
//                prev.find( (rec, i, a) => rec.find() )
//            }, []);
//            
//            
//            Promise.all(
//                Object.keys(compilation.assets).map( file => {
//                    var relativeLocalPathName = path.relative(
//                        workingDirectory,
//                        path.join(
//                            outputPath,
//                            file.replace(/\?.*$/,'')
//                        )
//                    );
//                    console.log('\n');
//                    console.log(relativeLocalPathName);
//                    var pathChunks = relativeLocalPathName.split(path.sep);
//                    
//                    
//                    
//                    return execp(puttyInstallLocation + 'plink '
//                        + port
//                        + hostName
//                        + ' mkdir -p '
//                        + remotePathPref.concat(pathChunks.slice(0,-1)).join(path.posix.sep)
//                    ).then(
//                        execp(puttyInstallLocation + 'pscp '
//                            + port
//                            + relativeLocalPathName + ' '
//                            + hostName + ':'
//                            + remotePathPref.concat(pathChunks).join(path.posix.sep)
//                        )
//                    )
//                })
//            ).then(
//                function() {
//                    console.log(arguments);
//                    callback();
//                },
//                er => {
//                    console.error(`error: ${er}`);
//                    callback(null, er);
//                }
//            );

            var relativeLocalPath = path.relative(
                workingDirectory,
                path.join(
                    outputPath,
                    Object.keys(compilation.assets).find(v => true).replace(/\?.*$/,'')
                )
            ).replace(/\\.*$/,'');
            execp(puttyInstallLocation + 'plink '
                + port
                + remoteOutputAddress
                + ' mkdir -p '
                + relativeLocalPath.split(path.sep).join(path.posix.sep)
            ).then(
                execp(puttyInstallLocation + 'pscp -r '
                    + port
                    + relativeLocalPath + ' '
                    + remoteOutputAddress
                )
            ).then(
                res => {
                    console.log(res);
                    callback();
                },
                er => {
                    console.error(`error: ${er}`);
                    callback(null, er);
                }
            );

        });
    }
    return {
        apply
    }
}

RemoteCopyPlugin['default'] = RemoteCopyPlugin;
module.exports = RemoteCopyPlugin;