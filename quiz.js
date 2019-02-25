module.exports.init = initialize;
module.exports.cmdBinds = getCmdBinds;
var sprintf = require('sprintf-js').sprintf;

var status = {
	quizEnabled: false,
	qNumber: 0,
	qActive: false,
	questions: [
		{
			'type': 'ABCD',
			'question': 'test1',
			'answers': ['test1', 'test2', 'test3', 'testtttt4']
		},
		{
			'type': 'ABCD',
			'question': 'test1',
			'answers': ['test1', 'test2', 'test3', 'testtttt4']
		},
		{
			'type': 'ABCD',
			'question': 'test1',
			'answers': ['test1', 'test2', 'test3', 'testtttt4']
		},
		{
			'type': 'REGEX',
			'question': 'bardzo dlugi tekst',
			'ainfo': 'bardzo dlugi tekst',
			'regex': /bardzo dlugi tekst/
		},
		{
			'type': 'MULTI',
			'question': 'od 1 do 4',
			'answers': ['jeden', 'dwa', 'trzy', 'cztery']
		},
		{
			'type': 'REGEX',
			'question': 'test',
			'ainfo': 'test',
			'regex': /test/
		}
	],
	hintState: 0,
	currentPoints: 0,
	correctAnswer: false,
	answers: [],
	answered: [], // ABCD: lista nicków, które odpowiedziały; MULTI: lista odpowiedzi, które zostały udzielone
	lateAnsCnt: 0,
	timeouts: [],
	intervals: [],
	questionStartedTime: 0,
	quizStartedTime: 0,
	lastAnswerTime: 0
};

var question;

var settings = {
	statsDelay: 5,
	initPoints: 5,
	notifyRankChange: true,
	multiTime: 20,
	delay: 4,
	ABCDTime: 6,
	maxLateAns: 3,
	maxLateAnsTime: 10,
	hintMax: 10,
};

function initialize(nname, nbot) {
	name = nname;
	bot = nbot;
	addIRCListeners();
	//wczytać ustawienia
	console.log('Zaladowano modul quizowy dla '+nname);
};

function getCmdBinds(){
	return cmdBinds;
};

const ircFormats = {
	'color': String.fromCharCode(0x03),
	'underline': String.fromCharCode(0x1f)
};

const colors = {
	'main': ircFormats.color + "11,01",
	'mainS': ircFormats.color + "00,02",
	'mainInvisible': ircFormats.color + "02,02",
	'info': ircFormats.color + "09,01",
	'infoS': ircFormats.color + "08,01",
	'infoSR': ircFormats.color + "04,01",
	'markStart': ircFormats.underline,
	'markEnd': ircFormats.underline,
	'hintHidden': ircFormats.color + "04",
	'hintShown': ircFormats.color + "09",
	'error': ircFormats.color + "15,05",
	'errorS': ircFormats.color + "08,05",
	'lineStart': ''
};

const messages_PL = {
	'currRankHeader': colors.lineStart + colors.main + ' Aktualnie najlepsi: ',
	'rankHeader': colors.lineStart + colors.main + ' ' + colors.markStart + 'Wyniki' + colors.markEnd + ': ',
	'rankFooter': colors.lineStart + colors.main + ' Koniec wyników. ',
	'rankPlace': colors.lineStart + colors.main + ' Miejsce ' + colors.markStart + '%d.' + colors.markEnd + ' ' + colors.mainS + ' %s ' + colors.main + ' ' + colors.markStart + '%d' + colors.markEnd + ' punkt%s ',
	'manualStop': colors.lineStart + colors.main + ' Quiz przerwany przez operatora! ' + colors.markStart + 'Wyniki' + colors.markEnd + ': ',
	'manualSkip': colors.lineStart + colors.info + ' Pytanie nr ' + colors.infoS + '%d' + colors.info + ' pominięte przez operatora. ',
	'started': colors.lineStart + colors.main + ' Quiz rozpoczęty! ',
	'helpHint': colors.lineStart + colors.main + ' Nie wiesz, jak grać? Napisz ' + colors.markStart + '%s' + colors.markEnd + ' :) ',
	'manualRankChanged': colors.lineStart + colors.info + ' Operator zmienił ilość punktów dla ' + colors.infoS + '%s' + colors.info + ' o ' + colors.infoS + '%d' + colors.info + '.',
	'aborted': colors.lineStart + colors.main + ' Quiz przerwany :( ' + colors.markStart + 'Wyniki' + colors.markEnd + ': ',
	'stopped': colors.lineStart + colors.main + ' Koniec quizu! Czas trwania: ' + colors.markStart + '%s' + colors.markEnd + ', ilość pytań: ' + colors.markStart + '%d' + colors.markEnd,
	'announceFirstQuestion': colors.lineStart + colors.info + ' Pierwsze pytanie za ' + colors.infoS + '%d s' + colors.info + '.',
	'endOfQuestions': colors.lineStart + colors.info + ' Koniec pytań! ',
	'announceNextQuestion': colors.lineStart + colors.info + ' Następne pytanie za ' + colors.infoS + '%.1f s ',
	'consolation': colors.lineStart + colors.info + ' Nagroda pocieszenia dla ' + colors.infoS + '%s' + colors.info + ' (bieżący wynik ' + colors.infoS + '%d' + colors.info + ' punkt%s), który udzielił prawidłowej odpowiedzi jako %s, po czasie ' + colors.infoS + '%d' + colors.info + '. Oto ' + colors.infoS + '%d' + colors.info + ' punkt%s dla Ciebie. ',
	'correctlyAnswered': colors.lineStart + colors.infoS + ' %s' + colors.info + ' (bieżący wynik ' + colors.infoS + '%d' + colors.info + ' punkt%s) udzielił, po ' + colors.infoS + '%s' + colors.info + '%s, poprawnej odpowiedzi, otrzymując za to ' + colors.infoS + '%d' + colors.info + ' punkt%s ',
	'correctAnswer': colors.lineStart + colors.main + ' Poprawna odpowiedź ' + colors.mainS + ' %s ',
	'correctlyAnsweredMulti': colors.lineStart + colors.main + ' Poprawna odpowiedź: ' + colors.mainS + ' %s ' + colors.info + ' Punkt dla ' + colors.infoS + '%s' + colors.info + '. ',
	'endOfTimeMulti': colors.lineStart + colors.info + ' Koniec czasu. Nie odgadnięto ' + colors.infoS + '%d' + colors.info + ' odpowiedzi. ',
	'allAnsweredMulti': colors.lineStart + colors.info + ' Odgadnięto wszystkie odpowiedzi! ',
	'correctlyAnsweredABCD': colors.lineStart + colors.info + ' Poprawnie odpowiedzieli: ',
	'correctAnswerABCD': colors.lineStart + colors.main + ' Właściwa odpowiedź: ' + colors.mainS + '%s: %s ',
	'incorrectlyAnsweredABCD': colors.lineStart + colors.info + ' Niepoprawnie odpowiedzieli: ',
	'correctAnswerNickABCD': colors.infoS + '%s ' + colors.info + '(' + colors.infoS + '+%d' + colors.info + ') ',
	'incorrectAnswerNickABCD': colors.infoSR + '%s ' + colors.info + '(' + colors.infoS + '-%d' + colors.info + ') ',
	'question': colors.lineStart + colors.main + ' Pytanie nr ' + colors.markStart + '%d' + colors.markEnd + ' z %d: ' + colors.mainS + ' %s ',
	'remainingAnswersMulti': colors.lineStart + colors.info + ' Pozostało ' + colors.infoS + '%d' + colors.info + ' odpowiedzi i ' + colors.infoS + '%d s' + colors.info + ' czasu.',
	'answersMulti': colors.lineStart + colors.info + ' Ilość odpowiedzi: ' + colors.infoS + '%d' + colors.info + '. Czas na odpowiedź: ' + colors.infoS + '%d s ',
	'timeToAnswerABCD': colors.lineStart + colors.info + ' Czas na odpowiedź: ' + colors.infoS + '%d s ',
	'firstHint': colors.lineStart + colors.info + ' Podpowiedź: ' + colors.hintHidden + ' %s ',
	'hint': colors.lineStart + colors.info + ' Podpowiedź %d z %d: ' + colors.hintShown + ' %s ',
	'tooManyHints': colors.lineStart + colors.error + ' Wyczerpano limit podpowiedzi dla pytania. ',
	'hintsGiven': ' i ' + colors.infoS + '%d' + colors.info + ' podpowiedzi%s',
	'hintsPlural': 'ach',
	
	'cmdStopped': 'Quiz na %s przerwany',
	'cmdNoQuestionActive': 'W tym momencie nie jest aktywne zadne pytanie. Poczekaj.',
	'cmdSkipped': 'Właśnie pominąłeś pytanie nr %d.',
	'cmdAlreadyStarted': 'Już uruchomiony!',
	'cmdNoQuestions': 'Brak pytań!',
	'cmdStarted': 'Uruchomiono!',
	'cmdAddpointSyntax': 'Użycie: ADDPOINT nick ile_punktów',
	'cmdAddpointLimit': 'Możesz odjąć lub dodać maksymalnie 5 punktów.',
	'cmdAddpointNewNick': 'Nick %s nie był obecny na liście. Mimo tego kontynuuję.',
	'cmdAddpoint': 'Dodano %d punkt(ów) dla %s. Ma teraz %d.'
};

var messages = messages_PL;

var listeners = {
	'message': [
		function handler(nick, to, text, message){
			if(to.toLowerCase() != name.toLowerCase()) return;
			if(!status.quizEnabled) return;
			if(settings.statsDelay != 0 && (text == '!stat' || text == '!stats')){
				//sprawdź czas
				bot.say(name, messages.currRankHeader);
				quiz.printStats(5);
				bot.say(name, messages.rankFooter);
				return;
			}
			if(text == '!help' || text == '!pomoc'){
				quiz.sendHelp(nick);
				return;
			}
			quiz.processAnswer(text, nick);
			if(!status.qActive) return; //kolejne mają działać tylko gdy aktywne pytanie
			if(text == '!pyt' || text == '!przyp'){
				switch(question.type){
					case 'ABCD': return;
					case 'REGEX': case 'MULTI': break;
				}
				//sprawdź czas
				quiz.sendQuestion();
				return;
			}
			if(text == '!podp'){
				switch(question.type){
					case 'REGEX': break;
					case 'ABCD': case 'MULTI': return;
				}
				//sprawdź czas
				quiz.sendHint();
				return;
			}
		}
	]
};

function addIRCListeners(){
	for(var key in listeners){
		var functions = listeners[key];
		for(var i=0; i<functions.length; i++){
			bot.addListener(key, functions[i]);
		}
	}
}

var name;
var bot;

var cmdBinds = {
	'STOP': function(src, cmd, args){
		if(!status.quizEnabled) return;
		bot.say(name, messages.manualStop);
		quiz.finish();
		src.send(sprintf(messages.cmdStopped, name));
	},
	'HELP': function(src, cmd, args){ // zrobić!
	},
	'SKIP': function(src, cmd, args){
		if(!status.quizEnabled) return;
		if(!status.qActive){
			src.send(messages.cmdNoQuestionActive);
			return;
		}
		status.qActive = 0;
		bot.say(name, sprintf(messages.manualSkip, status.qNumber));
		quiz.nextQuestion();
		src.send(sprintf(messages.cmdSkipped, status.qNumber-1));
	},
	'START': function(src, cmd, args){
		if(status.quizEnabled){
			src.send(messages.cmdAlreadyStarted);
			return;
		}
		if(status.questions == false){
			src.send(messages.cmdNoQuestions);
			return;
		}
		status.quizEnabled = true;
		status.qNumber = 1;
		status.hintState = 0;
		status.currentPoints = settings.initPoints;
		question = status.questions[status.qNumber-1];
		bot.say(name, messages.started);
		bot.say(name, sprintf(messages.helpHint, '!pomoc'));
		//pokaż ustawienia
		quiz.firstQuestion();
		//zapisz czas początku quizu
		src.send(messages.cmdStarted);
	},
	'ADDPOINT': function(src, cmd, args){
		if(args.length != 2){
			src.send(messages.cmdAddpointSyntax);
			return;
		}
		var nick = args[0];
		var points = args[1];
		if(points < -5 || points > 5){
			src.send(messages.cmdAddpointLimit);
			return;
		}
		if(quiz.getPoints(nick) == false){
			src.send(sprintf(messages.cmdAddpointNewNick, nick));
		}
		quiz.addPoint(nick, points);
		src.send(sprintf(messages.cmdAddpoint, points, nick, quiz.getPoints(nick)));
		if(settings.notifyRankChange){
			bot.say(name, sprintf(messages.manualRankChanged, nick, points));
		}
	}
};

function anti_google(text){
	return text;
};

function removeSpecialChars(text){
	return text;
};

function getRandomInt(min, max) {
	max += 1;
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
}

function ordinal(num){
	return num;
}

function timeDiff(date){
	var diff = Date.now() - date;
	diff /= 1000;
	return diff + 's';
}

function suffix(num){
	return 'ów';
}

var quiz = {
	'rank': [],
	'compareRanks': function(a,b){
		if(a.points < b.points) return 1;
		if(a.points > b.points) return -1;
		return 0;
	},
	'clearTimers': function(){
		for(key in status.intervals){
			clearInterval(status.intervals[key]);
		}
		for(key in status.timeouts){
			clearTimeout(status.timeouts[key]);
		}
		status.intervals = [];
		status.timeouts = [];
	},
	'cleanup': function(){
		if(status.quizEnabled){
			bot.say(name, messages.aborted);
			quiz.finish();
		}
		status.questions = [];
		//del command QUIZ
	},
	'stop': function(){
		if(!status.quizEnabled){
			return;
		}
		bot.say(name, sprintf(messages.stopped, timeDiff(status.quizStartedTime), status.qNumber));
		question = false;
		status.qNumber = 0;
		status.quizEnabled = false;
		quiz.clearResults();
	},
	'finish': function(){
		quiz.printStats(0);
		quiz.stop();
	},
	'firstQuestion': function(){
		quiz.clearTimers();
		bot.say(name, sprintf(messages.announceFirstQuestion, settings.delay*2));
		status.timeouts['firstQuestion'] = setTimeout(quiz.signFirstQuestion, settings.delay*2*1000);
	},
	'signFirstQuestion': function(){
		delete status.timeouts['firstQuestion'];
		if(!status.quizEnabled) return;
		status.quizStartedTime = Date.now();
		quiz.initQuestion();
		quiz.sendQuestion();
		status.qActive = true;	
	},
	'nextQuestion': function(){
		quiz.clearTimers();
		if(status.qNumber == status.questions.length){
			bot.say(name, messages.endOfQuestions);
		} else {
			bot.say(name, sprintf(messages.announceNextQuestion, settings.delay));
		}
		status.timeouts['nextQuestion'] = setTimeout(quiz.signNextQuestion, settings.delay*1000);
	},
	'signNextQuestion': function(){
		delete status.timeouts['nextQuestion'];
		if(!status.quizEnabled) return;
		quiz.setNextQuestion();		
	},
	'setNextQuestion': function(){
		status.lateAnsCnt = false;
		if(status.questions == false) return;
		if(status.qNumber == status.questions.length){
			bot.say(name, messages.rankHeader);
			quiz.finish();
			return;
		}
		status.qNumber++;
		question = status.questions[status.qNumber-1];
		status.hintState = 0;
		quiz.initQuestion();
		quiz.sendQuestion();
		status.qActive = true;
		status.currentPoints = settings.initPoints;
	},
	'initQuestion': function(){
		status.answers = [];
		status.answered = [];
		status.correctAnswer = false;
		status.questionStartedTime = Date.now();
		if(question.type == 'ABCD'){
			for(var i=0; i<question.answers.length; i++){
				do {
					var ok = 1;
					status.answers[i] = getRandomInt(0, question.answers.length-1);
					console.log('i: '+i+', random: '+status.answers[i]);
					for(var j=0; j<i; j++){
						if(status.answers[i] == status.answers[j]) ok = 0;
					}
				} while(!ok);
			}
			for(var i=0; i<status.answers.length; i++){
				if(status.answers[i] == 0){
					status.correctAnswer = i;
					console.log('correct answer is '+i);
					break;
				}
			}
			status.timeouts['ABCDFinish'] = setTimeout(quiz.signFinishABCD, settings.ABCDTime*1000);
		}
		if(question.type == 'MULTI'){
			for(var i=0; i<question.answers.length; i++){
				status.answered[i] = false;
			}
			status.timeouts['MultiFinish'] = setTimeout(quiz.signFinishMulti, settings.multiTime*1000);
		}
	},	
	'printStats': function(count){
		var points = [];
		var place = 1;
		var dispplace = 1;
		var lastpoints = 0;
		for(key in quiz.rank){
			points.push(quiz.rank[key]);
		}
		points.sort(quiz.compareRanks);
		for(var i=0; i<points.length; i++){
			if(count > 0 && i > count) return;
			if(lastpoints != points[i].points){
				dispplace = place;
			}
			bot.say(name, sprintf(messages.rankPlace, dispplace, points[i].nick, points[i].points, suffix(points[i].points)));
			place++;
			lastpoints = points[i].points;
		}
	},
	'sendHelp': function(nick){
		console.log('Not implemented');
	},
	'processAnswer': function(message, nick){
		console.log('process');
		switch(question.type){
			case 'REGEX': quiz.processAnswerRegex(message, nick); break;
			case 'ABCD': quiz.processAnswerABCD(message, nick); break;
			case 'MULTI': quiz.processAnswerMulti(message, nick); break;
		}
	},
	'hintInfo': function(){
		if(status.hintState == 0) return '';
		return sprintf(messages.hintsGiven, status.hintState, status.hintState>1?messages.hintsPlural:'');
	},
	'processAnswerRegex': function(message, nick){
		console.log('process regex');
		if(!status.qActive){ // odp dodatkowe
			if(status.lateAnsCnt < 0 || status.lateAnsCnt > settings.maxLateAns) return; // <0 - właściwa odpowiedź, >max - przekroczone ustawienie
			if(Date.now() > status.lastAnswerTime + (settings.maxLateAnsTime * 1000)) return;
			if(nick.toLowerCase() in status.answers) return; // ktoś wysłał drugi raz
			if(quiz.checkAnswer(message)){
				var myPoints = (status.currentPoints>1)?(status.currentPoints-1):1;
				quiz.addPoint(nick, myPoints);
				var points = quiz.getPoints(nick);
				bot.say(name, sprintf(messages.consolation, nick, points, suffix(points), ordinal(status.lateAnsCnt+2), timeDiff(status.questionStartedTime), myPoints, suffix(myPoints)));
				status.lateAnsCnt++;
				status.answers[nick.toLowerCase()] = true;
			}
			return;
		}
		if(!quiz.checkAnswer(message)) return;
		quiz.addPoint(nick, status.currentPoints);
		var points = quiz.getPoints(nick);
		bot.say(name, sprintf(messages.correctlyAnswered, nick, points, suffix(points), timeDiff(status.questionStartedTime), quiz.hintInfo(), status.currentPoints, suffix(status.currentPoints)));
		bot.say(name, sprintf(messages.correctAnswer, question.ainfo));
		
		status.qActive = 0;
		status.answers[nick.toLowerCase()] = true;
		status.lastAnswerTime = Date.now();
		status.lateAnsCnt = 0;
		quiz.nextQuestion();
	},
	'processAnswerABCD': function(message, nick){
		if(!status.qActive) return;
		console.log('process abcd '+message);
		var correct = false;
		
		if(message.length != 1) return;
		if(!status.qActive) return;
		
		var char = message.charAt(0);
		if(!quiz.letterInRange(char, question.answers.length)) return;
		var code = message.toLowerCase().charCodeAt(0);
		code -= 'a'.charCodeAt(0);
		if(code == status.correctAnswer) correct = true;
		var lowerNick = nick.toLowerCase();
		if(!(lowerNick in status.answered)){
			console.log(nick + ' answered '+message);
			status.answered[lowerNick] = {'nick': nick, 'correct': correct};
		} else {
			console.log(nick + ' already answered');
		}
	},
	'processAnswerMulti': function(message, nick){
		if(!status.qActive) return;
		console.log('process multi');
		var found = false;
		var i = 0;
		for(; i<question.answers.length; i++){
			if(status.answered[i] == true) continue;
			if(removeSpecialChars(question.answers[i].toLowerCase()) == removeSpecialChars(message.toLowerCase())){
				status.answered[i] = true;
				found = true;
				break;
			}
		}
		if(!found) return;
		bot.say(name, sprintf(messages.correctlyAnsweredMulti, question.answers[i], nick));
		quiz.addPoint(nick, 1);
		for(i=0; i<question.answers.length; i++){
			if(status.answered[i] == false) return;
		}
		quiz.signFinishMulti(0);
	},
	'signFinishMulti': function(n){
		console.log('finish multi');
		var unanswered = quiz.getMultiUnanswered();
		status.answered = [];
		if(unanswered > 0){
			bot.say(name, sprintf(messages.endOfTimeMulti, unanswered));
		} else {
			bot.say(name, messages.allAnsweredMulti);
		}
		quiz.nextQuestion();		
	},
	'signFinishABCD': function(n){
		var currentPoints = status.currentPoints;
		var currentNegpoints = status.currentPoints;
		if(currentNegpoints > 1) currentNegpoints--;
		var text = messages.correctlyAnsweredABCD;
		status.qActive = 0;
		if(question.type == 'ABCD'){
			var char = String.fromCharCode('A'.charCodeAt(0) + status.correctAnswer);
			bot.say(name, sprintf(messages.correctAnswerABCD, char, question.answers[0]));
			for(nick in status.answered){
				if(status.answered[nick].correct != true) continue;
				text += sprintf(messages.correctAnswerNickABCD, status.answered[nick].nick, currentPoints);
				quiz.addPoint(status.answered[nick].nick, currentPoints);
				if(currentPoints > 1) currentPoints--;
				if(currentNegpoints > 1) currentNegpoints--;
			}
			bot.say(name, text);
			text = messages.incorrectlyAnsweredABCD;
			for(nick in status.answered){
				if(status.answered[nick].correct == true) continue;
				text += sprintf(messages.incorrectAnswerNickABCD, status.answered[nick].nick, currentNegpoints);
				quiz.addPoint(status.answered[nick].nick, -currentNegpoints);
				if(currentNegpoints > 1) currentNegpoints--;
			}
			bot.say(name, text);
		}
		quiz.nextQuestion();
	},
	'letterInRange': function(letter, max){
		if(!max) return false;
		max--;
		var code = letter.toLowerCase().charCodeAt(0);
		var firstCode = 'a'.charCodeAt(0);
		if(code >= firstCode && code <= (firstCode + max)) return 1;
		return 0;		
	},
	'sendQuestion': function(){
		if(status.qNumber == 0) return;
		var text = anti_google(question.question);
		bot.say(name, sprintf(messages.question, status.qNumber, status.questions.length, text)); // zrobić dzielenie na linie
		switch(question.type){
			case 'REGEX': break;
			case 'ABCD':
				var len = 0;
				var text = colors.lineStart;
				for(var i=0; i<question.answers.length; i++){ // liczenie długości najdłuższej odpowiedzi
					if(question.answers[i].length > len) len = question.answers[i].length;
				}
				for(var i=0; i<question.answers.length; i++){
					text += colors.main + ' ' + String.fromCharCode('A'.charCodeAt(0) + i) + ': ' + colors.mainS + ' ' + question.answers[status.answers[i]] + colors.mainInvisible;
					for(var j=question.answers[status.answers[i]].length; j<len; j++){
						text += '.';
					}
					text += ' ';
					if(i%2 == 1 || i == question.answers.length - 1){
						bot.say(name, text);
						text = '';
					}
				}
				bot.say(name, sprintf(messages.timeToAnswerABCD, settings.ABCDTime));
				break;
			case 'MULTI':
				if(status.qActive){
					bot.say(name, sprintf(messages.remainingAnswersMulti, quiz.getMultiUnanswered(), quiz.getRemainingTime()));
				} else {
					bot.say(name, sprintf(messages.answersMulti, question.answers.length, settings.multiTime));
				}
				break;
		}
	},
	'maxWordLength': function(text){
		var maxLen = 0;
		var currLen = 0;
		for(i=0; i<text.length; i++){
			if(text.charAt(i) != ' '){
				currLen++;
				if(maxLen < currLen) maxLen = currLen;
			} else {
				currLen = 0;
			}
		}
		return maxLen;
	},
	'sendHint': function(){
		var hintMax = quiz.maxWordLength(question.ainfo)-1;
		if(hintMax > settings.hintMax) hintMax = settings.hintMax;
		var hintText = '';
		if(status.hintState == 0){  // pierwsza podpowiedź - tylko ilość literek
			for(var i=0; i<question.ainfo.length; i++){
				hintText += (question.ainfo.charAt(i) == ' ')?' ':'.';
			}
			bot.say(name, sprintf(messages.firstHint, hintText));
			status.hintState++;
			if(status.currentPoints > 1) status.currentPoints--;
			return;
		}
		if(status.hintState > hintMax){
			bot.say(name, messages.tooManyHints);
			return;
		}
		// sprawdź limit czasu
		hintText = quiz.hintGen();
		bot.say(name, sprintf(messages.hint, status.hintState, hintMax, hintText));
		status.hintState++;
		if(status.currentPoints > 1) status.currentPoints--;
	},
	'clearResults': function(){
		quiz.rank = [];
	},
	'addPoint': function(nick, points){
		var lowerNick = nick.toLowerCase();
		if(lowerNick in quiz.rank){
			quiz.rank[lowerNick].points += points;
		} else {
			quiz.rank[lowerNick] = { 'points': points, 'nick': nick };
		}
	},
	'getPoints': function(nick){
		var lowerNick = nick.toLowerCase();
		if(lowerNick in quiz.rank){
			return quiz.rank[lowerNick].points;
		} else {
			return false;
		}
	},
	'getMultiUnanswered': function(){
		var count = 0;
		for(var i=0; i<status.answered.length; i++){
			if(status.answered[i] == false) count++;
		}
		return count;
	},
	'getRemainingTime': function(){
		return settings.multiTime - ((Date.now() - status.questionStartedTime) / 1000);
	},
	'checkAnswer': function(ans){
		answer = removeSpecialChars(ans);
		if(ans.match(question.regex)){
			return true;
		}
		return false;
	},
	'hintState': [],
	'pick_hint_letter': function(start, len){
		var r = 0;
		var i = 0;
		for(; i<len; i++) {
			if(!quiz.hintState[start+i])
				r++;
		}

		if(r)
			r = getRandomInt(0, r-1);
		else
			return -1;

		for(i=0; i<len; i++) {
			if(!quiz.hintState[start+i]) {
				if(r == 0)
					break;
				r--;
			}
		}

		return i;
	},
	'hintGen': function() { //generacja podpowiedzi z odsłoniętymi losowymi znakami
		var buf = "";
		//static bool hstate[512]; - hintState
		var output_state = 1;
		var curr_word_index = 0;
		var in_word = false;

		if(status.hintState <= 1){// jest to pierwsze wywołanie dla tego pytania
	//		hstate[0] = true; //pierwsza literka zawsze widoczna
			quiz.hintState = [];
			in_word = false;
			for(var i=0; i<question.ainfo.length; i++){
				quiz.hintState[i] = false;
				if(!in_word && (question.ainfo.charAt(i) != ' ')) {
					quiz.hintState[i] = true;
					in_word = true;
				}

				if(in_word && (question.ainfo.charAt(i) == ' ')) {
					in_word = false;
				}
			}
		} else {
			in_word = false;

			for(i=0; i<question.ainfo.length; i++){
				if(!in_word && (question.ainfo.charAt(i) != ' ')) {
					curr_word_index = i;
					in_word = true;
				}

				if(in_word && (question.ainfo.charAt(i) == ' ')) {
					var j = quiz.pick_hint_letter(curr_word_index, i - curr_word_index);
					if(j >= 0)
						quiz.hintState[j + curr_word_index] = true;
					in_word = false;
				}
			}

			if(in_word) {
				var j = quiz.pick_hint_letter(curr_word_index, i - curr_word_index);/////////////////
				if(j >= 0)
					quiz.hintState[j + curr_word_index] = true;
			}
		}

		for(i=0; i<question.ainfo.length; i++){
			if(question.ainfo.charAt(i) == ' '){
				buf += ' '; //spacje kopiuję
				//continue;
			} else if(quiz.hintState[i]){
				if(output_state != 1){
					output_state = 1;
					buf += colors.hintShown;
				}
				buf += question.ainfo.charAt(i); //literki kopiuję tylko jeśli ustawiona flaga
			} else {
				if(output_state != 0){
					output_state = 0;
					buf += colors.hintHidden;
				}
				buf += '.';
			}
		}
		return buf;
	}
}

