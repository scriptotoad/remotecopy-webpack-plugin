# remotecopy-webpack-plugin

### Getting started

Install the plugin:

```
npm install --save-dev git://github.com/scriptotoad/remotecopy-webpack-plugin.git
```

### Require

[PuTTY](http://www.chiark.greenend.org.uk/~sgtatham/putty/download.html)
better use A Windows MSI installer.
pageant.exe
pscp.exe
plink.exe

### Examples

```javascript
'use strict';
var RemoteCopyPlugin = require('remotecopy-webpack-plugin');
var remoteCopyPlugin = ( hash => process.env.USERNAME in hash && new RemoteCopyPlugin({
    remoteOutputAddress: hash[process.env.USERNAME],
    port: 22
}) )(
    //позволяет настроить для каждого пользователя адрес удаленого сервера индивидуально
    {
        'windowUserName': 'remote_user_name@host.name:remote_path'
    }
);
    
});
var path = require('path');
var webpack = require('webpack');

module.exports = [{
    context: path.join(__dirname, 'app1'),
    entry: "./index.js",
    output: {
        path: path.join(__dirname, 'distapp1')
    }
},{
    context: path.join(__dirname, 'app2'),
    entry: "./index.js",
    output: {
        path: path.join(__dirname, 'distapp2variant1')
    }
    plugins: [
        new webpack.DefinePlugin({
            "INIT_DATA": JSON.stringify("variant1")
        })
    ]
},{
    context: path.join(__dirname, 'app2'),
    entry: "./index.js",
    output: {
        path: path.join(__dirname, 'distapp2variant2')
    }
    plugins: [
        new webpack.DefinePlugin({
            "INIT_DATA": JSON.stringify("variant2")
        })
    ]
}
].map( configRec => {
    //не копировать на сервер, если нет адреса записи для этого пользователя
    remoteCopyPlugin && (
        configRec.plugins || (configRec.plugins = [])
    ).push(remoteCopyPlugin);
    return configRec
});
```

### Options

remoteOutputAddress - required, 'remote_user_name@host.name:remote_path'
port - optional
puttyLocation - optional, search order: options.puttyLocation afterwards in Windows registry. It set on A Windows MSI installer. Afterwards in "%PROGRAMFILES(x86)%\PuTTY\
