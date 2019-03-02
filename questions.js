module.exports.addQuestion = addQuestion;
module.exports.setMessages = setMessages;
module.exports.loadQuestionsDizzy = loadQuestionsDizzy;
module.exports.loadQuestionsMilioner = loadQuestionsMilioner;
module.exports.loadQuestionsFamiliada = loadQuestionsFamiliada;

var RegexEscape = require("regex-escape");
var sprintf = require('sprintf-js').sprintf;

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
		case 'MULTI': break;
		default: throw 'Unknown question type!'; break;
	}
	questions.push(newQuestion);
}

function loadQuestionsDizzy(questions, src, filename){
	var newQuestions = [];
	try {
		var question = false;
		var answer = false;
		var lines = require('fs').readFileSync(filename, 'utf-8').split('\n');
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
						'regex': new RegExp(RegexEscape(answer))
					};
					addQuestion(newQuestions, src, newQuestion);
					question = false;
					answer = false;
				} else {
					src.send(sprintf(messages.answerMissing, i, question));
					question = false;
					continue;
				}
			} else {
				if(line.startsWith('pyt ')){
					question = line.substring(4).trim();
				} else {
					src.send(sprintf(messages.questionMissing, i));
					continue;
				}
			}
		}
		if(question !== false){
			src.send(messages.lastQuestionUnanswered);
		}
	} catch(e){
		src.send(sprintf(messages.cmdLoadException, filename, e));
		return;
	}
	Array.prototype.push.apply(questions, newQuestions);
	src.send(sprintf(messages.cmdLoaded, newQuestions.length, questions.length));
}

function loadQuestionsMilioner(questions, src, filename){
	var newQuestions = [];
	try {
		var question = false;
		var answers = [];
		var lines = require('fs').readFileSync(filename, 'utf-8').split('\n');
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
		return;
	}
	Array.prototype.push.apply(questions, newQuestions);
	src.send(sprintf(messages.cmdLoaded, newQuestions.length, questions.length));
}

function loadQuestionsFamiliada(questions, src, filename){
	var newQuestions = [];
	try {
		var question = false;
		var answers = [];
		var lines = require('fs').readFileSync(filename, 'utf-8').split('\n');
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
		return;
	}
	Array.prototype.push.apply(questions, newQuestions);
	src.send(sprintf(messages.cmdLoaded, newQuestions.length, questions.length));
}

