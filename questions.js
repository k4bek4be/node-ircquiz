module.exports.addQuestion = addQuestion;
module.exports.setMessages = setMessages;
module.exports.loadQuestionsDizzy = loadQuestionsDizzy;
module.exports.loadQuestionsMilioner = loadQuestionsMilioner;
module.exports.loadQuestionsFamiliada = loadQuestionsFamiliada;
module.exports.loadQuestionsCbot = loadQuestionsCbot;
module.exports.loadQuestionsKtrivia = loadQuestionsKtrivia;
module.exports.saveQuestionsDizzy = saveQuestionsDizzy;
module.exports.saveQuestionsMilioner = saveQuestionsMilioner;
module.exports.saveQuestionsFamiliada = saveQuestionsFamiliada;
module.exports.saveQuestionsCbot = saveQuestionsCbot;
module.exports.saveQuestionsKtrivia = saveQuestionsKtrivia;

String.prototype.escapeDiacritics = function(){ // removing Polish characters; add other languages if needed
    return this.replace(/ą/g, 'a').replace(/Ą/g, 'A')
        .replace(/ć/g, 'c').replace(/Ć/g, 'C')
        .replace(/ę/g, 'e').replace(/Ę/g, 'E')
        .replace(/ł/g, 'l').replace(/Ł/g, 'L')
        .replace(/ń/g, 'n').replace(/Ń/g, 'N')
        .replace(/ó/g, 'o').replace(/Ó/g, 'O')
        .replace(/ś/g, 's').replace(/Ś/g, 'S')
        .replace(/ż/g, 'z').replace(/Ż/g, 'Z')
        .replace(/ź/g, 'z').replace(/Ź/g, 'Z');
}

var RegexEscape = require("regex-escape");
var sprintf = require('sprintf-js').sprintf;
var fs = require('fs');

var messages = {};

function setMessages(newMessages){
	messages = newMessages;
}

function addQuestion(questions, src, newQuestion){
	switch(newQuestion.type){
		case 'REGEX':
			if(!newQuestion.ainfo.match(newQuestion.regex)){
				src.send(sprintf(messages.regexNotMatching, newQuestion.ainfo, newQuestion.regex.source));
			}
			break;
		case 'ABCD':
			if(newQuestion.answers.length > 12){
				src.send(sprintf(messages.tooManyAnswers, newQuestion.question));
				newQuestion.answers = newQuestion.answers.slice(0,12);
			}
			for(var i=0; i<newQuestion.answers.length; i++){
				if(newQuestion.answers[i].length > 49){
					src.send(sprintf(messages.answerTooLong, newQuestion.answers[i], newQuestion.question));
					newQuestion.answers[i] = newQuestion.answers[i].substring(0, 49);
				}
			}
			break;
		case 'MULTI': case 'SHUFFLE': break;
		default: throw 'Unknown question type!'; break;
	}
	questions.push(newQuestion);
}

function loadQuestionsDizzy(questions, src, filename){
	var newQuestions = [];
	try {
		var question = false;
		var answer = false;
		var lines = fs.readFileSync(filename, 'utf-8').split('\n');
		for(var i=0; i<lines.length; i++){
			var line = lines[i];
			if(line.trim().length == 0){
				continue;
			}
			if(question !== false){
				if(line.startsWith('odp ')){
					answer = line.substring(4).trim();
					var newQuestion = {
						'type': 'REGEX',
						'question': question,
						'ainfo': answer,
						'regex': new RegExp(RegexEscape(answer.escapeDiacritics()), 'i')
					};
					addQuestion(newQuestions, src, newQuestion);
					question = false;
					answer = false;
				} else {
					src.send(sprintf(messages.answerMissing, (i+1), question));
					question = false;
					continue;
				}
			} else {
				if(line.startsWith('pyt ')){
					question = line.substring(4).trim();
				} else {
					src.send(sprintf(messages.questionMissing, (i+1)));
					continue;
				}
			}
		}
		if(question !== false){
			src.send(messages.lastQuestionUnanswered);
		}
	} catch(e){
		src.send(sprintf(messages.cmdLoadException, filename, e));
		return false;
	}
	Array.prototype.push.apply(questions, newQuestions);
	src.send(sprintf(messages.cmdLoaded, newQuestions.length, questions.length));
	return true;
}

function saveQuestionsDizzy(questions, src, filename){
	var counter = 0;
	try {
		var data = '';
		for(var i=0; i<questions.length; i++){
			var question = questions[i];
			if(question.type != 'REGEX') continue;
			counter++;
			if(data.length > 0) data += '\n';
			data += 'pyt ' + question.question + '\nodp ' + question.ainfo.escapeDiacritics();
		}
		if(fs.existsSync(filename)){
			data = '\n'+data;
			src.send(sprintf(message.cmdSaveAppending, filename));
		}
		fs.appendFileSync(filename, data);
	} catch(e){
		src.send(sprintf(messages.cmdSaveException, filename, e));
		return false;
	}
	src.send(sprintf(messages.cmdSaved, counter));
	return true;
}

function loadQuestionsMilioner(questions, src, filename){
	var newQuestions = [];
	try {
		var question = false;
		var answers = [];
		var lines = fs.readFileSync(filename, 'utf-8').split('\n');
		for(var i=0; i<lines.length; i++){
			var line = lines[i];
			if(line.trim().length == 0){
				continue;
			}
			if(question === false){
				question = line.trim();
			} else {
				answers.push(line.trim());
				if(answers.length == 4){
					var newQuestion = {
						'type': 'ABCD',
						'question': question,
						'answers': answers
					};
					addQuestion(newQuestions, src, newQuestion);
					question = false;
					answers = [];
				}
			}
		}
		if(answers.length > 0){
			src.send(sprintf(messages.lastQuestionMissingAnswers, question));
		}
	} catch(e){
		src.send(sprintf(messages.cmdLoadException, filename, e));
		return false;
	}
	Array.prototype.push.apply(questions, newQuestions);
	src.send(sprintf(messages.cmdLoaded, newQuestions.length, questions.length));
	return true;
}

function saveQuestionsMilioner(questions, src, filename){
	var counter = 0;
	try {
		var data = '';
		for(var i=0; i<questions.length; i++){
			var question = questions[i];
			if(question.type != 'ABCD') continue;
			counter++;
			if(data.length > 0) data += '\n';
			data += question.question;
			for(var j=0; j<question.answers.length; j++){
				data += '\n' + question.answers[j];
			}
		}
		if(fs.existsSync(filename)){
			data = '\n'+data;
			src.send(sprintf(message.cmdSaveAppending, filename));
		}
		fs.appendFileSync(filename, data);
	} catch(e){
		src.send(sprintf(messages.cmdSaveException, filename, e));
		return false;
	}
	src.send(sprintf(messages.cmdSaved, counter));
	return true;
}

function loadQuestionsFamiliada(questions, src, filename){
	var newQuestions = [];
	try {
		var question = false;
		var answers = [];
		var lines = fs.readFileSync(filename, 'utf-8').split('\n');
		for(var i=0; i<lines.length; i++){
			var line = lines[i];
			if(line.trim().length == 0){
				continue;
			}
			if(question === false){
				question = line.trim();
			} else {
				answers = line.trim().split('*');
				var newQuestion = {
					'type': 'MULTI',
					'question': question,
					'answers': answers
				};
				addQuestion(newQuestions, src, newQuestion);
				question = false;
				answers = [];
				
			}
		}
		if(question !== false){
			src.send(sprintf(messages.lastQuestionMissingAnswers, question));
		}
	} catch(e){
		src.send(sprintf(messages.cmdLoadException, filename, e));
		return false;
	}
	Array.prototype.push.apply(questions, newQuestions);
	src.send(sprintf(messages.cmdLoaded, newQuestions.length, questions.length));
	return true;
}

function saveQuestionsFamiliada(questions, src, filename){
	var counter = 0;
	try {
		var data = '';
		for(var i=0; i<questions.length; i++){
			var question = questions[i];
			if(question.type != 'MULTI') continue;
			counter++;
			if(data.length > 0) data += '\n';
			data += question.question + '\n';
			for(var j=0; j<question.answers.length; j++){
				data += (j>0?'*':'') + question.answers[j].escapeDiacritics();
			}
		}
		if(fs.existsSync(filename)){
			data = '\n'+data;
			src.send(sprintf(message.cmdSaveAppending, filename));
		}
		fs.appendFileSync(filename, data);
	} catch(e){
		src.send(sprintf(messages.cmdSaveException, filename, e));
		return false;
	}
	src.send(sprintf(messages.cmdSaved, counter));
	return true;
}

function loadQuestionsCbot(questions, src, filename){
	var newQuestions = [];
	try {
		var question = false;
		var answers = [];
		var lines = fs.readFileSync(filename, 'utf-8').split('\n');
		for(var i=0; i<lines.length; i++){
			var line = lines[i];
			if(line.trim().length == 0 || line.startsWith('#')){
				continue;
			}
			var args = line.split(';');
			if(args[0] == ''){
				switch(args[1]){
					case 'd':
						if(args.length < 4){
							src.send('Incorrect parameters for d in line '+(i+1));
							break;
						}
						var args = line.split(';', 4);
						var newQuestion = {
							'type': 'REGEX',
							'question': args[2],
							'ainfo': args[3],
							'regex': new RegExp(RegexEscape(args[3].escapeDiacritics()), 'i')
						};
						addQuestion(newQuestions, src, newQuestion);
						break;
					case 'm':
						if(args.length < 7){
							src.send('Incorrect parameters for m in line '+(i+1));
							break;
						}
						var answers = args.slice(3);
						var newQuestion = {
							'type': 'ABCD',
							'question': args[2],
							'answers': answers
						};
						addQuestion(newQuestions, src, newQuestion);
						break;
					case 'f':
						if(args.length < 4){
							src.send('Incorrect parameters for f in line '+(i+1));
							break;
						}
						var answers = args.slice(3);
						var newQuestion = {
							'type': 'MULTI',
							'question': args[2],
							'answers': answers
						};
						addQuestion(newQuestions, src, newQuestion);
						break;
					case 's':
						if(args.length < 3){
							src.send('Incorrect parameters for s in line '+(i+1));
							break;
						}
						var args = line.split(';', 4);
						var newQuestion = {
							'type': 'SHUFFLE',
							'question': args[2],
							'answer': args[3]
						};
						addQuestion(newQuestions, src, newQuestion);
						break;
					default:
						src.send('Incorect type "'+args[1]+'" in line '+(i+1));
						break;
				}
			} else {
				try {
					if(args.length != 3){
						src.send('Incorrect parameters in line '+(i+1));
						continue;
					}
					var newQuestion = {
						'type': 'REGEX',
						'question': args[0],
						'ainfo': args[2],
						'regex': new RegExp(args[1].escapeDiacritics(), 'i')
					}
					addQuestion(newQuestions, src, newQuestion);
				} catch(e){
					src.send('Error processing line '+(i+1)+': '+e);
				}
			}
		}
	} catch(e){
		src.send(sprintf(messages.cmdLoadException, filename, e));
		return false;
	}
	Array.prototype.push.apply(questions, newQuestions);
	src.send(sprintf(messages.cmdLoaded, newQuestions.length, questions.length));
	return true;
}

function saveQuestionsCbot(questions, src, filename){
	var counter = 0;
	try {
		var data = '';
		for(var i=0; i<questions.length; i++){
			var question = questions[i];
			counter++;
			if(data.length > 0) data += '\n';
			switch(question.type){
				case 'REGEX':
					data += question.question + ';' + question.regex.source + ';' + question.ainfo;
					break;
				case 'ABCD':
					data += ';m;' + question.question + ';' + question.answers.join(';');
					break;
				case 'MULTI':
					data += ';f;' + question.question + ';' + question.answers.join(';');
					break;
				case 'SHUFFLE':
					data += ';s;' + question.question + ';' + question.answer;
					break;
			}
		}
		if(fs.existsSync(filename)){
			data = '\n'+data;
			src.send(sprintf(message.cmdSaveAppending, filename));
		}
		fs.appendFileSync(filename, data);
	} catch(e){
		src.send(sprintf(messages.cmdSaveException, filename, e));
		return false;
	}
	src.send(sprintf(messages.cmdSaved, counter));
	return true;
}

function loadQuestionsKtrivia(questions, src, filename){
	var newQuestions = [];
	try {
		var question = false;
		var answers = [];
		var lines = fs.readFileSync(filename, 'utf-8').split('\n');
		for(var i=0; i<lines.length; i++){
			var line = lines[i];
			if(line.trim().length == 0){
				continue;
			}
			var args = line.split('|');
			switch(args[0]){
				case 'd':
					if(args.length != 5){
						src.send('Incorrect parameters for d in line '+(i+1));
						break;
					}
					var newQuestion = {
						'type': 'REGEX',
						'question': args[3],
						'ainfo': args[4],
						'regex': new RegExp(RegexEscape(args[4].escapeDiacritics()), 'i'),
						'author': args[1]
					};
					addQuestion(newQuestions, src, newQuestion);
					break;
				case 'c':
					if(args.length != 8){
						src.send('Incorrect parameters for c in line '+(i+1));
						break;
					}
					var answers = args.slice(4);
					var newQuestion = {
						'type': 'ABCD',
						'question': args[3],
						'answers': answers,
						'author': args[1]
					};
					addQuestion(newQuestions, src, newQuestion);
					break;
				case 'm':
					if(args.length < 5){
						src.send('Incorrect parameters for m in line '+(i+1));
						break;
					}
					var answers = args.slice(4);
					var newQuestion = {
						'type': 'MULTI',
						'question': args[3],
						'answers': answers,
						'author': args[1]
					};
					addQuestion(newQuestions, src, newQuestion);
					break;
				case 'x':
					if(args.length != 5){
						src.send('Incorrect parameters for x in line '+(i+1));
						break;
					}
					var newQuestion = {
						'type': 'SHUFFLE',
						'question': args[2],
						'answer': args[4],
						'author': args[1]
					};
					addQuestion(newQuestions, src, newQuestion);
					break;
				default:
					src.send('Incorect type "'+args[0]+'" in line '+(i+1));
					break;
			}
		}
	} catch(e){
		src.send(sprintf(messages.cmdLoadException, filename, e));
		return false;
	}
	Array.prototype.push.apply(questions, newQuestions);
	src.send(sprintf(messages.cmdLoaded, newQuestions.length, questions.length));
	return true;
}

function saveQuestionsKtrivia(questions, src, filename){
	var counter = 0;
	try {
		var data = '';
		for(var i=0; i<questions.length; i++){
			var question = questions[i];
			counter++;
			if(data.length > 0) data += '\n';
			if(question.author === undefined){
				var author = '';
			} else {
				var author = question.author;
			}
			switch(question.type){
				case 'REGEX':
					data += 'd|' + author + '||' + question.question.escapeDiacritics() + '|' + question.ainfo.escapeDiacritics();
					break;
				case 'ABCD':
					data += 'c|' + author + '||' + question.question + '|' + question.answers.join('|');
					break;
				case 'MULTI':
					data += 'm|' + author + '||' + question.question + '|' + question.answers.join('|');
					break;
				case 'SHUFFLE':
					data += 'x|' + author + '|' + question.question + '|@|' + question.answer;
					break;
			}
		}
		if(fs.existsSync(filename)){
			data = '\n'+data;
			src.send(sprintf(message.cmdSaveAppending, filename));
		}
		fs.appendFileSync(filename, data);
	} catch(e){
		src.send(sprintf(messages.cmdSaveException, filename, e));
		return false;
	}
	src.send(sprintf(messages.cmdSaved, counter));
	return true;
}


