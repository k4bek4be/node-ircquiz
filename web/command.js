module.exports.init = init;
module.exports.run = run;

var status = {};
var settings = {};
var quiz = {};
var commands = {};

function init(newStatus, newSettings, newQuiz, newCommands){
	status = newStatus;
	settings = newSettings;
	quiz = newQuiz;
	commands = newCommands;
}

var buffer = '';

function bufferOutput(text){
	if(buffer != ''){
		buffer += '\n';
	}
	buffer += text;
}

var mySource = {
	'send': function(text){
		bufferOutput(text);
	}
}

function run(req, res){
	try {
		var httpArgs = require('url').parse(req.url, true);
		console.log(httpArgs);
		var cmd = httpArgs.pathname.split('/')[3].toUpperCase();
		if(httpArgs.query.args !== undefined){
			var args = httpArgs.query.args.split(';');
		} else {
			var args = [];
		}
		var result = (commands[cmd](mySource, cmd, args))?'success':'fail';
		var output = { 'result': result, 'reply': buffer };
		res.writeHead(200,{'Content-Type':'application/json'});
		res.end(JSON.stringify(output));
	} catch(e){
		console.log('Exception in command module: '+e);
		res.writeHead(404);
		res.end();
	}
}

