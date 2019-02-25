module.exports.init = initialize;
module.exports.cmdBinds = getCmdBinds;

var status = {
	quizEnabled: false,
	qNumber: 0,
	qActive: false,
	questions: [
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
			'type': 'ABCD',
			'question': 'test1',
			'answers': ['test1', 'test2', 'test3', 'test4']
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

var listeners = {
	'message': [
		function handler(nick, to, text, message){
			if(to.toLowerCase() != name.toLowerCase()) return;
			if(!status.quizEnabled) return;
			if(settings.statsDelay != 0 && (text == '!stat' || text == '!stats')){
				//sprawdź czas
				bot.say(name, 'Aktualnie najlepsi:');
				quiz.printStats(5);
				bot.say(name, 'Koniec wynikow.');
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
		bot.say(name, 'Quiz przerwany przez operatora! Wyniki:');
		quiz.finish();
		src.send('Quiz na '+name+' przerwany');
	},
	'HELP': function(src, cmd, args){ // zrobić!
	},
	'SKIP': function(src, cmd, args){
		if(!status.quizEnabled) return;
		if(!status.qActive){
			src.send('W tym momencie nie jest aktywne zadne pytanie. Poczekaj.');
			return;
		}
		status.qActive = 0;
		bot.say('Pytanie nr '+status.qNumber+' pominięte przez operatora.');
		quiz.nextQuestion();
		src.send('Właśnie pominąłeś pytanie nr '+status.qNumber-1);
	},
	'START': function(src, cmd, args){
		if(status.quizEnabled){
			src.send('Już uruchomiony!');
			return;
		}
		if(status.questions == false){
			src.send('Brak pytań!');
			return;
		}
		status.quizEnabled = true;
		status.qNumber = 1;
		status.hintState = 0;
		status.currentPoints = settings.initPoints;
		question = status.questions[status.qNumber-1];
		bot.say(name, 'Quiz rozpoczęty!');
		bot.say(name, 'Nie wiesz, jak grać? Napisz !pomoc :)');
		//pokaż ustawienia
		quiz.firstQuestion();
		//zapisz czas początku quizu
		src.send('Uruchomiono!');
	},
	'ADDPOINT': function(src, cmd, args){
		if(args.length != 2){
			src.send('Użycie: ADDPOINT nick ile_punktów');
			return;
		}
		var nick = args[0];
		var points = args[1];
		if(points < -5 || points > 5){
			src.send('Możesz odjąć lub dodać maksymalnie 5 punktów.');
			return;
		}
		if(quiz.getPoints(nick) == false){
			src.send('Nick '+nick+' nie był obecny na liście Mimo tego kontynuuję.');
		}
		quiz.addPoint(nick, points);
		src.send('Dodano '+points+' punkt(ów) dla '+nick+'. Ma teraz '+quiz.getPoints(nick)+'.');
		if(settings.notifyRankChange){
			bot.say(name, 'Operator zmienił ilość punktów dla '+nick+' o '+points);
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
			bot.say(name, 'Quiz przerwany :( Wyniki:');
			quiz.finish();
		}
		status.questions = [];
		//del command QUIZ
	},
	'stop': function(){
		if(!status.quizEnabled){
			return;
		}
		bot.say(name, 'Koniec quizu! Czas trwania: '+timeDiff(status.quizStartedTime)+', ilość pytań: '+status.qNumber);
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
		bot.say(name, 'Pierwsze pytanie za '+settings.delay*2+' s');
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
			bot.say(name, 'Koniec pytań!');
		} else {
			bot.say(name, 'Następne pytanie za '+settings.delay+' s');
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
			bot.say(name, 'Wyniki:');
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
			bot.say(name, 'Miejsce '+dispplace+'. '+points[i].nick+' '+points[i].points+' punktów');
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
				bot.say(name, 'Nagroda pocieszenia dla '+nick+' (bieżący wynik '+points+' punktów), który udzielił prawidłowej odpowiedzi jako '+ordinal(status.lateAnsCnt+2)+', po czasie '+timeDiff(status.questionStartedTime));
				status.lateAnsCnt++;
				status.answers[nick.toLowerCase()] = true;
			}
			return;
		}
		if(!quiz.checkAnswer(message)) return;
		quiz.addPoint(nick, status.currentPoints);
		var points = quiz.getPoints(nick);
		bot.say(name, nick + ' (bieżący wynik '+points+' punktów) udzielił, po '+timeDiff(status.questionStartedTime)+', poprawnej odpowiedzi, otrzymując za to '+status.currentPoints+' punktów');
		bot.say(name, 'Poprawna odpowiedź: '+question.ainfo);
		
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
		bot.say(name, 'Poprawna odpowiedź: ' + question.answers[i] + '. Punkt dla '+nick+'.');
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
			bot.say(name, 'Koniec czasu. Nie odgadnięto '+unanswered+' odpowiedzi.');
		} else {
			bot.say(name, 'Odgadnięto wszystkie odpowiedzi!');
		}
		quiz.nextQuestion();		
	},
	'signFinishABCD': function(n){
		var currentPoints = status.currentPoints;
		var currentNegpoints = status.currentPoints;
		if(currentNegpoints > 1) currentNegpoints--;
		var text = 'Poprawnie odpowiedzieli: ';
		status.qActive = 0;
		if(question.type == 'ABCD'){
			var char = String.fromCharCode('A'.charCodeAt(0) + status.correctAnswer);
			bot.say(name, 'Właściwa odpowiedź: '+char+': '+question.answers[0]);
			for(nick in status.answered){
				if(status.answered[nick].correct != true) continue;
				text += status.answered[nick].nick + ' ('+currentPoints+') ';
				quiz.addPoint(status.answered[nick].nick, currentPoints);
				if(currentPoints > 1) currentPoints--;
				if(currentNegpoints > 1) currentNegpoints--;
			}
			bot.say(name, text);
			text = 'Niepoprawnie odpowiedzieli: ';
			for(nick in status.answered){
				if(status.answered[nick].correct == true) continue;
				text += status.answered[nick].nick + ' (-'+currentNegpoints+') ';
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
		bot.say(name, 'Pytanie nr '+status.qNumber+' z '+status.questions.length+': '+text); // zrobić dzielenie na linie
		switch(question.type){
			case 'REGEX': break;
			case 'ABCD':
				var len = 0;
				var text = '';
				for(var i=0; i<question.answers.length; i++){ // liczenie długości najdłuższej odpowiedzi
					if(question.answers[i].length > len) len = question.answers[i].length;
				}
				for(var i=0; i<question.answers.length; i++){
					text += String.fromCharCode('A'.charCodeAt(0) + i) + ' ' + question.answers[status.answers[i]];
					for(var j=question.answers[i].length; j<len; j++){
						text += '.';
					}
					text += ' ';
					if(i%2 == 1 || i == question.answers.length - 1){
						bot.say(name, text);
						text = '';
					}
				}
				break;
			case 'MULTI':
				if(status.qActive){
					bot.say(name, 'Pozostało '+quiz.getMultiUnanswered()+' odpowiedzi i '+quiz.getRemainingTime()+' s czasu.');
				} else {
					bot.say(name, 'Ilość odpowiedzi: '+question.answers.length+'. Czas na odpowiedź: '+settings.multiTime+'s');
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
			bot.say(name, 'Podpowiedź: '+hintText);
			status.hintState++;
			if(status.currentPoints > 1) status.currentPoints--;
			return;
		}
		if(status.hintState > hintMax){
			bot.say(name, 'Wyczerpano limit podpowiedzi dla pytania.');
			return;
		}
		// sprawdź limit czasu
		hintText = quiz.hintGen();
		bot.say(name, 'Podpowiedź '+status.hintState+' z '+hintMax+': '+hintText);
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
					buf += String.fromCharCode(3)+"09";
				}
				buf += question.ainfo.charAt(i); //literki kopiuję tylko jeśli ustawiona flaga
			} else {
				if(output_state != 0){
					output_state = 0;
					buf += String.fromCharCode(3)+"04";
				}
				buf += '.';
			}
		}
		return buf;
	}
}
