var irc = require('irc');
var fs = require('fs');
var readline = require('readline');

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var quiz = [];

var listeners = {
	'registered': [
		function handler(message){
			console.log('IRC connection succeeded');
			bot.send("MODE", bot.nick, "+B");
			config.channels.forEach(function(name){
				bot.join(name, function(){
					var lowerName = name.toLowerCase();
					if(!(lowerName in quiz)){
						quiz[lowerName] = require('./quiz');
						quiz[lowerName].init(name, bot);
					}
				});
			});
		}
	],
	'ctcp-version': [
		function handler(from, to, message){
			bot.ctcp(from, "notice", "VERSION PIRCbot/nodejs/irc (k4be) v0.02");
		}
	],
	'error': [
		function handler(message){
			console.log('error: ', message);
		}
	]/*,
	'message': [
		function handler(nick, to, text, message){
		}
	]*/
};

var bot = new irc.Client(config.server, config.nick, config.options);

for(var key in listeners){
	var functions = listeners[key];
	for(var i=0; i<functions.length; i++){
		bot.addListener(key, functions[i]);
	}
}

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: true
});

rl.on('line', function(line){
	processCommand(myConsole, line);
});

var cmdPrefix = "";

var myConsole = {
	'send': function(text){
		console.log(text);
	}
};

var cmdBinds = {
	'CMD': [
		function(src, cmd, args){
			if(args.length == 0){
				src.send('Command prefix disabled');
				cmdPrefix = '';
			} else {
				cmdPrefix = args.join(' ');
				src.send('Command prefix set to "'+cmdPrefix+'"');
			}
		}
	],
	'SAY': [
		function(src, cmd, args){
			if(args.length < 2){
				src.send('Usage: SAY #channel text');
				return;
			}
			var chan = args.shift();
			bot.say(chan, args.join(' '));
		}
	],
	'DIE': [
		function(src, cmd, args){
			if(args.length > 0){
				var reason = args.join(' ');
			} else {
				var reason = 'Quit';
			}
			bot.disconnect(reason);
			setTimeout(function(){
				process.exit();
			}, 5000);
		}
	],
	'QUIZ': [
		function(src, cmd, args){
			if(args.length < 2){
				src.send('Usage: QUIZ #channel command');
				return;
			}
			var chan = args.shift().toLowerCase();
			var quizcmd = args.shift().toUpperCase();
			if(chan in quiz){
				var binds = quiz[chan].cmdBinds();
				if(quizcmd in binds){
					binds[quizcmd](src, quizcmd, args);
				} else {
					src.send('No such QUIZ command: '+quizcmd);
				}
			} else {
				src.send('No such quiz channel: '+chan);
			}
		}
	]
};

function processCommand(src, line){
	if(line == '') return;
	if(!line.toLowerCase().startsWith('cmd')){
		line = cmdPrefix + ' ' + line;
	}
	line = line.trim();
	var idx = line.indexOf(' ');
	var cmd = '';
	var arg = '';
	if(idx < 0){
		cmd = line;
	} else {
		cmd = line.slice(0, idx);
		arg = line.slice(idx+1);
	}
	cmd = cmd.toUpperCase();
	if(arg.length == 0){
		var args = [];
	} else {
		var args = arg.split(' ');
	}
	if(cmd in cmdBinds){
		cmdBinds[cmd].forEach(function(handler){
			handler(src, cmd, args);
		});
	} else {
		src.send('No such command: '+cmd);
	}
};

