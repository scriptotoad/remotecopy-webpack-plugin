const exec = require('child_process').exec;
const path = require("path");
const isWin = /^win/.test(process.platform);
var Promise = require('bluebird');

function execp(s){
    return new Promise(function (resolve, reject) {
//        console.log(`start->${s}`);
        var stdoutValue;
        var child = exec(s, {timeout: 5000}, function(error, stdout, stderr) {
            stdoutValue = stdout;
            error && reject(error);
            stderr && reject(stderr);
        });
        child.on('close', function(code) {
//            console.log(`finish->${s}`);
            resolve(stdoutValue);
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
            
            //массив путей, начиная с наиболее коротких, затем те которые из продолжают (содержат их в начале)
            //затем новый кратчайший путь, не начинающийся с выше записанными
            //в записи "путь" лежат имена файлов этого пути
            var records = Object.keys(compilation.assets).reduce( (result, file, i, a) => {
                var relativeLocalPathName = path.relative(
                    workingDirectory,
                    path.join(
                        outputPath,
                        file.replace(/\?.*$/,'')
                    )
                );
                var pathNameChunks = relativeLocalPathName.split(path.sep);
                var pathChunks = pathNameChunks.slice(0, -1);
                var nearest = [0];
                var record = result.find(
                    (rec, idx) => {
                        var comparedCount = rec[0].slice(0, pathChunks.length)
                        .concat(null) //грязный хук чоб проще вырезать нужную часть
                        .findIndex(
                            (savedPathChunk, i) => savedPathChunk !== pathNameChunks[i]
                        );
                        if( nearest[0] < comparedCount ){
                            nearest = [comparedCount, idx, idx];
                        } else if ( nearest[0] == comparedCount ){
                            nearest[2] = idx;
                        }
                        return comparedCount === pathChunks.length
                    }
                );
                
                if( !record || result[nearest[1]][0].length > pathChunks.length ){
                    if( nearest[0] > 0 ){
                        record = [pathChunks, []];
                        if( result[nearest[1]][0].length > pathChunks.length ){
                            result.splice( nearest[1], 0, record );
                        }
                        if( result[nearest[2]][0].length < pathChunks.length ){
                            result.splice( nearest[2] + 1, 0, record );
                        }
                    } else {
                        record = [pathChunks, []];
                        result.push(record);
                    }
                }
                record[1].push( pathNameChunks.slice(-1)[0] );
                return result
            }, []);
            records.reverse();
            
            // длина командной строки не более 2047 символов https://support.microsoft.com/ru-ru/kb/830473
            // netstat -o <- список текущих соединений, пади можно узнать сколько можно еще натворить
            // TcpNumConnections ? https://support.microsoft.com/ru-ru/kb/314053#mt2
            
            const MAX_COMMAND_LENGTH = 2047;
            var lastFirstPathChunk;
            const MAX_CONNECT_COUNT = 5;
            var pDirs = new Map();
            var currentConnections = 0;
            var recordIndex = 0;
            function sendMaxParallelCommand(){
                var record;
                for (; MAX_CONNECT_COUNT > currentConnections && recordIndex < records.length;){
                    record = records[recordIndex++];
                    if( !pDirs.has(record[0][0]) ){
                        currentConnections++;
                        pDirs.set(
                            record[0][0],
                            execp(
                                puttyInstallLocation + 'plink '
                                + port
                                + hostName
                                + ' mkdir -p '
                                + remotePathPref.concat(record[0]).join(path.posix.sep)
                            ).then(
                                ()=>{currentConnections--}
                            )
                        );
                    }
                    pDirs.get(record[0][0]).then(
                        (record => () => {
                            var res = [
                               puttyInstallLocation, 'pscp ', port,
                               '',
                               hostName, ':',
                               remotePathPref.concat(record[0]).join(path.posix.sep)
                            ],
                            s,
                            i = record[1].findIndex( fileName => {
                                s = record[0].concat(fileName).join(path.sep) + ' ';
                                if( MAX_COMMAND_LENGTH - res.join('').length >= s.length ){
                                    res[3] += s;
                                } else {
                                    return true
                                }
                            } );
                            if(i !== 0){
                                if( i !== -1 ){
                                    records.push([record[0], record[1].slice(i)]);
                                }
                                currentConnections++;
                                return execp( res.join('') );
                            }
                            throw `RemoteCopyPlugin: break the limit of max length: "${s}"`
                        })(record)
                    ).then(
                        (v) => {
                            console.log(v);
                            currentConnections--;
                            // если все отправлено
                            if( recordIndex >= records.length ){
                                // когда все отправилось
                                if(currentConnections === 0){
                                    callback();
                                } 
                            } else {
                                sendMaxParallelCommand();
                            }
                        }
                    ).then(
                        () => {},
                        er => {
                            console.error(`error: ${er}`);
                            callback(null, er);
                        }
                    );
                }
            }
            sendMaxParallelCommand();            
        });
    }
    return {
        apply
    }
}

RemoteCopyPlugin['default'] = RemoteCopyPlugin;
module.exports = RemoteCopyPlugin;