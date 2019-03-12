module.exports.setStatus = setStatus;
module.exports.setSettings = setSettings;
module.exports.setQuiz = setQuiz;
module.exports.setCommands = setCommands;

var status = {};
var settings = {};
var quiz = {};
var commands = {};

var http = require('http');
var fs = require('fs');
var Mustache = require('mustache');

function setQuiz(newQuiz){
	quiz = newQuiz;
}

function setStatus(newStatus){
	status = newStatus;
}

function setSettings(newSettings){
	settings = newSettings;
	http.createServer(processRequest).listen(settings.http.port);
}

function setCommands(newCommands){
	commands = newCommands;
}

function processRequest(req, res){
	if(!checkAuth(req)){
		res.writeHead(401,{'WWW-Authenticate':'Basic realm=Authorization required'});
		res.end('Unauthorized');
	} else {
		if(req.url == '/'){
			serveModule('main', req, res);
		} else if(req.url.startsWith('/files/')){
			var path = req.url.split('/');
			var filename = './web/' + path[1] + '/' + path[2];
			serveFile(res, filename);
		} else if(req.url.startsWith('/modules/')){
			var modname = req.url.split('/')[2];
			serveModule(modname, req, res);
		}
	}
}

var modules = {
	'main':  function(req, res){
		httpPageHeaderFooter(res, '', [], 'main');
	},
	'showStatus': function(req, res){
		httpPageHeaderFooter(res, '', ['status', 'commands'], 'showStatus');
	},
	'status': function(req, res){
		res.writeHead(200,{'Content-Type':'application/json'});
		res.end(JSON.stringify(status));
	}
};

function serveModule(modname, req, res){
	try {
		if(modname in modules){
			modules[modname](req, res); // internal module
		} else {
			var modfile = './web/'+modname.split('/')[0]+'.js';
			delete require.cache[require.resolve(modfile)];
			var module = require(modfile);
			module.init(status, settings, quiz, commands);
			module.run(req, res); // external module
		}
	} catch(e){
		console.log('Exception in http handler: '+e);
		res.writeHead(404);
		res.end();
	}
}

function serveFile(res, filename){
	try {
		var ext = filename.split(/\.(?=[^\.]+$)/)[1] || '';
		var data = fs.readFileSync(filename);
		var mime = 'text/plain';
		switch(ext.toLowerCase()){
			case 'html': mime = 'text/html'; break;
			case 'gif': mime = 'image/gif'; break;
			case 'png': mime = 'image/png'; break;
			case 'jpg': case 'jpeg': mime = 'image/jpeg'; break;
			case 'js': mime = 'text/javascript'; break;
			case 'css': mime = 'text/css'; break;
		}
		res.writeHead(200,{'Content-Type':mime});
		res.end(data);
	} catch(e){
		console.log('Exception in http handler: '+e);
		res.writeHead(404);
		res.end();
	}
}

function checkAuth(req){
	var header = req.headers['authorization'] || '';
	var token = header.split(/\s+/).pop() || '';
	var auth = new Buffer.from(token, 'base64').toString();
	var parts = auth.split(/:/);
	var username = parts[0];
	var password = parts[1];
	if(username != settings.http.login || password != settings.http.password){
		return false;
	}
	return true;
}

function httpPageHeaderFooter(res, data = '', scripts = [], template = false, templateData = {}){
	httpHeader(res);
	var parsedTemplate = '';
	var html = '<html><head><title>node-ircquiz</title><script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>';
	for(var i=0; i<scripts.length; i++){
		html += '<script src="/files/' + scripts[i] + '.js"></script>';
	}
	if(template){
		var templateFile = fs.readFileSync('./web/' + template + '.html', {encoding: 'utf-8'});
		parsedTemplate = Mustache.render(templateFile, templateData);
	}
	html += '<link rel="stylesheet" type="text/css" href="/files/style.css"></head><body>' + data + parsedTemplate + '</body></html>';
	res.end(html);
}

function httpHeader(res){
	res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
}

