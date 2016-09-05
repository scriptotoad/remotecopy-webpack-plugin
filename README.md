# remotecopy-webpack-plugin

### Getting started

Install the plugin:

```
npm install --save-dev git://github.com/scriptotoad/remotecopy-webpack-plugin.git
```

### Require

PuTTY
pageant.exe
"%PROGRAMFILES(x86)%\PuTTY\pscp.exe

### Examples

```javascript
var RemoteCopyPlugin = require('remotecopy-webpack-plugin');
var remoteCopyPlugin = new RemoteCopyPlugin({
    remoteOutputAddress: ({
        'windowUserName': 'remote_user_name@host.name:remote_path'
    })[process.env.USERNAME], //позволяет настроить для каждого пользователя адрес удаленого сервера индивидуально
    port: 22
});
var path = require('path');
var webpack = require('webpack');

module.exports = [{
    context: path.join(__dirname, 'app1'),
    entry: "./index.js",
    output: {
        path: path.join(__dirname, 'distapp1')
    }
    plugins: [
        remoteCopyPlugin
    ]
},{
    context: path.join(__dirname, 'app2'),
    entry: "./index.js",
    output: {
        path: path.join(__dirname, 'distapp2variant1')
    }
    plugins: [
        remoteCopyPlugin,
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
        remoteCopyPlugin,
        new webpack.DefinePlugin({
            "INIT_DATA": JSON.stringify("variant2")
        })
    ]
}
];
```