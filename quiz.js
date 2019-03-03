module.exports.init = initialize;
module.exports.cmdBinds = getCmdBinds;
var sprintf = require('sprintf-js').sprintf;
var fs = require('fs');
var questions = require('./questions');
RegExp.prototype.toJSON = function() { return this.source; }; // this is required to export regexps as json

String.prototype.escapeDiacritics = function(){ // removing Polish characters; add other languages if needed
	var out = this.replace(/ą/g, 'a').replace(/Ą/g, 'A')
		.replace(/ć/g, 'c').replace(/Ć/g, 'C')
		.replace(/ę/g, 'e').replace(/Ę/g, 'E')
		.replace(/ł/g, 'l').replace(/Ł/g, 'L')
		.replace(/ń/g, 'n').replace(/Ń/g, 'N')
		.replace(/ó/g, 'o').replace(/Ó/g, 'O')
		.replace(/ś/g, 's').replace(/Ś/g, 'S')
		.replace(/ż/g, 'z').replace(/Ż/g, 'Z')
		.replace(/ź/g, 'z').replace(/Ź/g, 'Z');
	console.log('Source: '+this+', escaped: '+out);
	return out;
}

var settings = JSON.parse(fs.readFileSync('quiz-config.json', 'utf8'));

var status = {
	quizEnabled: false,
	qNumber: 0,
	qActive: false,
	questions: [],
	hintState: 0,
	currentPoints: 0,
	correctAnswer: false,
	answers: [],
	answered: [], // ABCD: list of nicks that answered; MULTI: list of answers already given
	lateAnsCnt: 0,
	timeouts: [],
	intervals: [],
	questionStartedTime: 0,
	quizStartedTime: 0,
	lastAnswerTime: 0,
	lastHintTime: 0,
	lastHintCmdTime: 0,
	lastQCmdTime: 0,
	lastStatsCmdTime: 0,
	lastHelpCmdTime: {}
};

var question;

function initialize(nname, nbot) {
	name = nname;
	bot = nbot;
	addIRCListeners();
	console.log(sprintf(messages.loaded, nname));
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

const messageTranslations = {
	'pl': {
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
		'correctAnswerABCD': colors.lineStart + colors.main + ' Właściwa odpowiedź: ' + colors.mainS + ' %s: %s ',
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
		'hintDelay': colors.lineStart + colors.error + ' Cierpliwości! Ostatnia podpowiedź była ' + colors.errorS + '%s' + colors.error + ' temu. Nie można tak często! ',
		'settingsInfo': colors.lineStart + colors.main + ' Opóźnienie między pytaniami ' + colors.markStart + '%.0f s' + colors.markEnd + '. Maksymalna ilość odsłonięta w podpowiedzi: ' + colors.markStart + '%d' + colors.markEnd + ' znaków. Minimalny czas między podpowiedziami: ' + colors.markStart + '%.1f s' + colors.markEnd + '. ',
		'hintsPlural': 'ach',
		'suffixSingle': '',
		'suffixCouple': 'y',
		'suffixPlural': 'ów',
		'ord1': 'pierwszy',
		'ord2': 'drugi',
		'ord3': 'trzeci',
		'ord4': 'czwarty',
		'ord5': 'piąty',
		'ordSuffix1': '.',
		'ordSuffix2': '.',
		'ordSuffix3': '.',
		'ordSuffix4': '.',
		'ordSuffixPlural': '.',
		
		'helpCommand': '!pomoc',

		'cmdStopped': 'Quiz na %s przerwany',
		'cmdNoQuestionActive': 'W tym momencie nie jest aktywne zadne pytanie. Poczekaj.',
		'cmdSkipped': 'Właśnie pominąłeś pytanie nr %d.',
		'cmdAlreadyStarted': 'Już uruchomiony!',
		'cmdNoQuestions': 'Brak pytań!',
		'cmdStarted': 'Uruchomiono!',
		'cmdAddpointSyntax': 'Użycie: ADDPOINT nick ile_punktów',
		'cmdAddpointLimit': 'Możesz odjąć lub dodać maksymalnie 5 punktów.',
		'cmdAddpointNewNick': 'Nick %s nie był obecny na liście. Mimo tego kontynuuję.',
		'cmdAddpoint': 'Dodano %d punkt(ów) dla %s. Ma teraz %d.',
		'cmdLoadSyntax': 'Użycie: LOAD plik.json <APPEND>',
		'cmdSpecialLoadSyntax': 'Użycie: LOAD_{DIZZY|MIL|FAM|C} plik.txt',
		'cmdLoaded': 'Załadowano %d pytań (łącznie %d)',
		'cmdCantLoad': 'Jest uruchomiony quiz. Nie można teraz wczytać pytań.',
		'cmdLoadException': 'Błąd podczas ładowania pliku %s: %s',
		'cmdSaveSyntax': 'Użycie: SAVE plik.json',
		'cmdNotOverwriting': 'Plik %s już istnieje. Wstrzymano zapis, aby uniknąć jego uszkodzenia.',
		'cmdSaveException': 'Błąd podczas zapisu pliku %s: %s',
		'cmdSaved': 'Zapisano %d pytań do pliku.',

		'loaded': 'Załadowano moduł quizowy dla %s',
		'regexNotMatching': 'Ostrzeżenie: odpowiedź "%s" nie pasuje do wyrażenia "%s"! Zweryfikuj to.',
		'answerTooLong': 'Odpowiedź "%s" na pytanie "%s" jest zbyt długa! Skracam.',
		'tooManyAnswers': 'Zbyt dużo odpowiedzi na pytanie "%s". Usuwam nadmiarowe.',
		'answerMissing': 'Linia %d: spodziewałem się odpowiedzi. Ignoruję pytanie "%s" i tę linię.',
		'questionMissing': 'Linia %d: spodziewałem się pytania. Ignoruję linię.',
		'lastQuestionUnanswered': 'Ostrzeżenie: ostatnie pytanie nie miało odpowiedzi.',
		'lastQuestionMissingAnswers': 'Ostrzeżenie: ostatnie pytanie "%s" miało za mało odpowiedzi. Zignorowano je. Sprawdź plik!'
	},
	'en': {
		'currRankHeader': colors.lineStart + colors.main + ' Currently leading: ',
		'rankHeader': colors.lineStart + colors.main + ' ' + colors.markStart + 'Results' + colors.markEnd + ': ',
		'rankFooter': colors.lineStart + colors.main + ' End of results. ',
		'rankPlace': colors.lineStart + colors.main + ' Place ' + colors.markStart + '%d.' + colors.markEnd + ' ' + colors.mainS + ' %s ' + colors.main + ' ' + colors.markStart + '%d' + colors.markEnd + ' point%s ',
		'manualStop': colors.lineStart + colors.main + ' Quiz has been stopped by the op! ' + colors.markStart + 'Results' + colors.markEnd + ': ',
		'manualSkip': colors.lineStart + colors.info + ' Question ' + colors.infoS + '%d' + colors.info + ' skipped by the op. ',
		'started': colors.lineStart + colors.main + ' Quiz started! ',
		'helpHint': colors.lineStart + colors.main + ' Don\'t know how to play? Type ' + colors.markStart + '%s' + colors.markEnd + ' :) ',
		'manualRankChanged': colors.lineStart + colors.info + ' The op has changed score for ' + colors.infoS + '%s' + colors.info + ' by ' + colors.infoS + '%d' + colors.info + '.',
		'aborted': colors.lineStart + colors.main + ' Quiz aborted :( ' + colors.markStart + 'Results' + colors.markEnd + ': ',
		'stopped': colors.lineStart + colors.main + ' Quiz finished! Duration: ' + colors.markStart + '%s' + colors.markEnd + ', ' + colors.markStart + '%d' + colors.markEnd + ' questions',
		'announceFirstQuestion': colors.lineStart + colors.info + ' First question will start after ' + colors.infoS + '%d s' + colors.info + '.',
		'endOfQuestions': colors.lineStart + colors.info + ' End of questions! ',
		'announceNextQuestion': colors.lineStart + colors.info + ' Next question will start after ' + colors.infoS + '%.1f s ',
		'consolation': colors.lineStart + colors.info + ' Consolation prize for ' + colors.infoS + '%s' + colors.info + ' (current score ' + colors.infoS + '%d' + colors.info + ' point%s), who answered correctly as %s, after ' + colors.infoS + '%d' + colors.info + '. ' + colors.infoS + '%d' + colors.info + ' point%s for you. ',
		'correctlyAnswered': colors.lineStart + colors.infoS + ' %s' + colors.info + ' (current score ' + colors.infoS + '%d' + colors.info + ' point%s) has answered correctly after ' + colors.infoS + '%s' + colors.info + '%s, getting ' + colors.infoS + '%d' + colors.info + ' point%s for it ',
		'correctAnswer': colors.lineStart + colors.main + ' Correct answer ' + colors.mainS + ' %s ',
		'correctlyAnsweredMulti': colors.lineStart + colors.main + ' Correct answer: ' + colors.mainS + ' %s ' + colors.info + ' A point for ' + colors.infoS + '%s' + colors.info + '. ',
		'endOfTimeMulti': colors.lineStart + colors.info + ' End of time. ' + colors.infoS + '%d' + colors.info + ' questions not answered. ',
		'allAnsweredMulti': colors.lineStart + colors.info + ' All answers guessed! ',
		'correctlyAnsweredABCD': colors.lineStart + colors.info + ' Answered correctly: ',
		'correctAnswerABCD': colors.lineStart + colors.main + ' Correct answer: ' + colors.mainS + '%s: %s ',
		'incorrectlyAnsweredABCD': colors.lineStart + colors.info + ' Answered incorrectly: ',
		'correctAnswerNickABCD': colors.infoS + '%s ' + colors.info + '(' + colors.infoS + '+%d' + colors.info + ') ',
		'incorrectAnswerNickABCD': colors.infoSR + '%s ' + colors.info + '(' + colors.infoS + '-%d' + colors.info + ') ',
		'question': colors.lineStart + colors.main + ' Question ' + colors.markStart + '%d' + colors.markEnd + ' of %d: ' + colors.mainS + ' %s ',
		'remainingAnswersMulti': colors.lineStart + colors.info + ' ' + colors.infoS + '%d' + colors.info + ' answers and ' + colors.infoS + '%d s' + colors.info + ' of time remaining.',
		'answersMulti': colors.lineStart + colors.info + ' There are ' + colors.infoS + '%d' + colors.info + ' correct answers. Time to answer: ' + colors.infoS + '%d s ',
		'timeToAnswerABCD': colors.lineStart + colors.info + ' Time to answer: ' + colors.infoS + '%d s ',
		'firstHint': colors.lineStart + colors.info + ' Hint: ' + colors.hintHidden + ' %s ',
		'hint': colors.lineStart + colors.info + ' Hint %d of %d: ' + colors.hintShown + ' %s ',
		'tooManyHints': colors.lineStart + colors.error + ' Hint limit reached. ',
		'hintsGiven': ' and ' + colors.infoS + '%d' + colors.info + ' hint%s',
		'hintDelay': colors.lineStart + colors.error + ' Be patient! Last hint was given ' + colors.errorS + '%s' + colors.error + ' ago. You\'re too fast! ',
		'settingsInfo': colors.lineStart + colors.main + ' Delay between questions is ' + colors.markStart + '%.0f s' + colors.markEnd + '. Maximum of ' + colors.markStart + '%d' + colors.markEnd + ' characters can be unveiled in hints. Minimum time between hints is ' + colors.markStart + '%.1f s' + colors.markEnd + '. ',
		'hintsPlural': 's',
		'suffixSingle': '',
		'suffixCouple': 's',
		'suffixPlural': 's',
		'ord1': 'first',
		'ord2': 'second',
		'ord3': 'third',
		'ord4': 'fourth',
		'ord5': 'fifth',
		'ordSuffix1': 'st',
		'ordSuffix2': 'nd',
		'ordSuffix3': 'rd',
		'ordSuffix4': 'th',
		'ordSuffixPlural': 'th',
		
		'helpCommand': '!help',
	
		'cmdStopped': 'Stopped quiz on %s',
		'cmdNoQuestionActive': 'No question active now. Please wait a moment.',
		'cmdSkipped': 'You have now skipped question %d.',
		'cmdAlreadyStarted': 'Already started!',
		'cmdNoQuestions': 'No questions loaded!',
		'cmdStarted': 'Started!',
		'cmdAddpointSyntax': 'Syntax: ADDPOINT nick how_many',
		'cmdAddpointLimit': 'You can\'t add nor subtract more than 5 points.',
		'cmdAddpointNewNick': 'Nick %s was not present in the scores list. Continuing anyway.',
		'cmdAddpoint': 'Added %d point(s) for %s. Current score: %d.',
		'cmdLoadSyntax': 'Syntax: LOAD file.json <APPEND>',
		'cmdSpecialLoadSyntax': 'Syntax: LOAD_{DIZZY|MIL|FAM|C} file.txt',
		'cmdLoaded': 'Loaded %d questions (%d in total)',
		'cmdCantLoad': 'Quiz is currently running. Can\'t load questions now.',
		'cmdLoadException': 'Error loading file %s: %s',
		'cmdSaveSyntax': 'Syntax: SAVE file.json',
		'cmdNotOverwriting': 'File %s already exists. Write aborted in order not to damage the file.',
		'cmdSaveException': 'Error saving file %s: %s',
		'cmdSaved': 'Saved %d questions to a file.',

		'loaded': 'Quiz module loaded for %s',
		'regexNotMatching': 'Warning: the answer "%s" does not match the given expression "%s"! Verify this.',
		'answerTooLong': 'The answer "%s" for question "%s" is too long! Truncating.',
		'tooManyAnswers': 'Too many answers for question "%s". Truncating.',
		'answerMissing': 'Line %d: answer expected. Ignoring the question "%s" and this line.',
		'questionMissing': 'Line %d: question expected. Ignoring the line.',
		'lastQuestionUnanswered': 'Warning: last question did not have an answer.',
		'lastQuestionMissingAnswers': 'Warning: last question "%s" had not enough answers. This question was ignored. Check the file!'
	}
};

var messages = messageTranslations[settings.language];
questions.setMessages(messages);

var listeners = {
	'message': [
		function handler(nick, to, text, message){
			if(to.toLowerCase() != name.toLowerCase()) return;
			var lowerNick = nick.toLowerCase();
			if(!status.quizEnabled) return;
			if(settings.statsDelay != 0 && (text == '!stat' || text == '!stats')){
				if(timeDiff(status.lastStatsCmdTime) < settings.repeatDelay){
					return;
				}
				status.lastStatsCmdTime = Date.now();
				bot.say(name, messages.currRankHeader);
				quiz.printStats(5);
				bot.say(name, messages.rankFooter);
				return;
			}
			if(text == '!help' || text == '!pomoc' || text == messages.helpCommand){
				if(lowerNick in status.lastHelpCmdTime && timeDiff(status.lastHelpCmdTime[lowerNick]) < settings.helpDelay){
					return;
				}
				status.lastHelpCmdTime[lowerNick] = Date.now();
				quiz.sendHelp(nick);
				return;
			}
			quiz.processAnswer(text, nick);
			if(!status.qActive) return; //following lines should work only with active question
			if(text == '!pyt' || text == '!przyp'){
				if(timeDiff(status.lastQCmdTime) < settings.repeatDelay){
					return;
				}
				status.lastQCmdTime = Date.now();
				switch(question.type){
					case 'ABCD': return;
					case 'REGEX': case 'MULTI': break;
				}
				quiz.sendQuestion();
				return;
			}
			if(text == '!podp'){
				if(timeDiff(status.lastHintCmdTime) < settings.repeatDelay){
					return;
				}
				status.lastHintCmdTime = Date.now();
				switch(question.type){
					case 'REGEX': break;
					case 'ABCD': case 'MULTI': return;
				}
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
	'HELP': function(src, cmd, args){
		console.log('not implemented');
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
		if(status.questions == false || status.questions.length == 0){
			src.send(messages.cmdNoQuestions);
			return;
		}
		status.quizEnabled = true;
		status.qNumber = 1;
		status.hintState = 0;
		status.currentPoints = settings.initPoints;
		question = status.questions[status.qNumber-1];
		bot.say(name, messages.started);
		bot.say(name, sprintf(messages.helpHint, messages.helpCommand));
		bot.say(name, sprintf(messages.settingsInfo, settings.delay, settings.hintMax, settings.hintDelay));
		quiz.firstQuestion();
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
	},
	'LOAD': function(src, cmd, args){
		if(args.length < 1 || args.length > 2 || (args.length == 2 && args[1].toLowerCase() != 'append')){
			src.send(messages.cmdLoadSyntax);
			return;
		}
		if(status.quizEnabled){
			src.send(messages.cmdCantLoad);
			return;
		}
		if(args.length == 1){
			status.questions = [];
		}
		try {
			var newQuestions = JSON.parse(fs.readFileSync(args[0], 'utf8'));
			for(var i=0; i<newQuestions.length; i++){
				if(newQuestions[i].type == 'REGEX'){
					newQuestions[i].regex = new RegExp(newQuestions[i].regex.escapeDiacritics(), 'i'); // restoring regexps from source strings
				}
			}
			status.questions = status.questions.concat(newQuestions);
		} catch(error){
			src.send(sprintf(messages.cmdLoadException, args[0], error));
			return;
		}
		src.send(sprintf(messages.cmdLoaded, newQuestions.length, status.questions.length));
	},
	'SAVE': function(src, cmd, args){
		if(args.length != 1){
			src.send(messages.cmdSaveSyntax);
			return;
		}
		if(fs.existsSync(args[0])){
			src.send(sprintf(messages.cmdNotOverwriting, args[0]));
			return;
		}
		try {
			fs.writeFileSync(args[0], JSON.stringify(status.questions));
		} catch(error){
			src.send(sprintf(messages.cmdSaveException, args[0], error));
			return;
		}
		src.send(sprintf(messages.cmdSaved, status.questions.length));
	},
	'LOAD_DIZZY': function(src, cmd, args){
		if(args.length != 1){
			src.send(messages.cmdSpecialLoadSyntax);
			return;
		}
		if(status.quizEnabled){
			src.send(messages.cmdCantLoad);
			return;
		}
		questions.loadQuestionsDizzy(status.questions, src, args[0]);
	},
	'LOAD_MIL': function(src, cmd, args){
		if(args.length != 1){
			src.send(messages.cmdSpecialLoadSyntax);
			return;
		}
		if(status.quizEnabled){
			src.send(messages.cmdCantLoad);
			return;
		}
		questions.loadQuestionsMilioner(status.questions, src, args[0]);
	},
	'LOAD_FAM': function(src, cmd, args){
		if(args.length != 1){
			src.send(messages.cmdSpecialLoadSyntax);
			return;
		}
		if(status.quizEnabled){
			src.send(messages.cmdCantLoad);
			return;
		}
		questions.loadQuestionsFamiliada(status.questions, src, args[0]);
	},
	'LOAD_C': function(src, cmd, args){
		if(args.length != 1){
			src.send(messages.cmdSpecialLoadSyntax);
			return;
		}
		if(status.quizEnabled){
			src.send(messages.cmdCantLoad);
			return;
		}
		questions.loadQuestionsCbot(status.questions, src, args[0]);
	},
	'LOAD_K': function(src, cmd, args){
		if(args.length != 1){
			src.send(messages.cmdSpecialLoadSyntax);
			return;
		}
		if(status.quizEnabled){
			src.send(messages.cmdCantLoad);
			return;
		}
		questions.loadQuestionsKtrivia(status.questions, src, args[0]);
	}
};

function anti_google(text){
	return text;
};

function getRandomInt(min, max) {
	max += 1;
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
}

function ordinal(num){
	switch(num){
		case 1: return messages.ord1; break;
		case 2: return messages.ord2; break;
		case 3: return messages.ord3; break;
		case 4: return messages.ord4; break;
		case 5: return messages.ord5; break;
	}
	var lastDigit = num%10;
	switch(lastDigit){
		case 1: var suffix = messages.ordSuffix1; break;
		case 2: var suffix = messages.ordSuffix2; break;
		case 3: var suffix = messages.ordSuffix3; break;
		default: var suffix = messages.ordSuffixPlural; break;
	}
	return num + suffix;
}

function timeDiff(date){
	return (Date.now() - date) / 1000;
}

function formatTimeDiff(date){
	return timeDiff(date) + ' s';
}

function suffix(num){
	if(num == 1) return messages.suffixSingle;
	var lastDigit = num%10;
	if(lastDigit > 1 && lastDigit < 5) return messages.suffixCouple;
	return messages.suffixPlural;
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
		status.lastHintCmdTime = 0;
		status.lastHintTime = 0;
	},
	'cleanup': function(){
		if(status.quizEnabled){
			bot.say(name, messages.aborted);
			quiz.finish();
		}
		status.questions = [];
	},
	'stop': function(){
		if(!status.quizEnabled){
			return;
		}
		bot.say(name, sprintf(messages.stopped, formatTimeDiff(status.quizStartedTime), status.qNumber));
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
		status.qActive = false;
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
		if(!status.qActive){ // late answers
			if(status.lateAnsCnt < 0 || status.lateAnsCnt > settings.maxLateAns) return; // <0 - it's the first answer, >max - set value exceeded
			if(timeDiff(status.lastAnswerTime) > settings.maxLateAnsTime) return;
			if(nick.toLowerCase() in status.answers) return; // somebody answered second time
			if(quiz.checkAnswer(message)){
				var myPoints = (status.currentPoints>1)?(status.currentPoints-1):1;
				quiz.addPoint(nick, myPoints);
				var points = quiz.getPoints(nick);
				bot.say(name, sprintf(messages.consolation, nick, points, suffix(points), ordinal(status.lateAnsCnt+2), formatTimeDiff(status.questionStartedTime), myPoints, suffix(myPoints)));
				status.lateAnsCnt++;
				status.answers[nick.toLowerCase()] = true;
			}
			return;
		}
		if(!quiz.checkAnswer(message)) return;
		quiz.addPoint(nick, status.currentPoints);
		var points = quiz.getPoints(nick);
		bot.say(name, sprintf(messages.correctlyAnswered, nick, points, suffix(points), formatTimeDiff(status.questionStartedTime), quiz.hintInfo(), status.currentPoints, suffix(status.currentPoints)));
		bot.say(name, sprintf(messages.correctAnswer, question.ainfo));
		
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
			if(question.answers[i].toLowerCase().escapeDiacritics() == message.toLowerCase().escapeDiacritics()){
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
		bot.say(name, sprintf(messages.question, status.qNumber, status.questions.length, text)); // TODO divide long messages
		switch(question.type){
			case 'REGEX': break;
			case 'ABCD':
				var len = 0;
				var text = colors.lineStart;
				for(var i=0; i<question.answers.length; i++){ // calculate the length of longest answer
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
		if(status.hintState == 0){  // first hint: only the letter count
			for(var i=0; i<question.ainfo.length; i++){
				hintText += (question.ainfo.charAt(i) == ' ')?' ':'.';
			}
			bot.say(name, sprintf(messages.firstHint, hintText));
		} else {
			if(status.hintState > hintMax){
				bot.say(name, messages.tooManyHints);
				return;
			}
			if(timeDiff(status.lastHintTime) < settings.hintDelay){
				bot.say(name, sprintf(messages.hintDelay, formatTimeDiff(status.lastHintTime)));
				return;
			}
			hintText = quiz.hintGen();
			bot.say(name, sprintf(messages.hint, status.hintState, hintMax, hintText));
		}
		status.lastHintTime = Date.now();
		status.hintState++;
		if(status.currentPoints > 1) status.currentPoints--;
	},
	'clearResults': function(){
		quiz.rank = [];
		status.lastHelpCmdTime = {};
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
		if(ans.escapeDiacritics().match(question.regex)){
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
	'hintGen': function() { //generate a hint with random characters unveiled
		var buf = "";

		var output_state = 1;
		var curr_word_index = 0;
		var in_word = false;

		if(status.hintState <= 1){ // first call with this question
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
				var j = quiz.pick_hint_letter(curr_word_index, i - curr_word_index);
				if(j >= 0)
					quiz.hintState[j + curr_word_index] = true;
			}
		}

		for(i=0; i<question.ainfo.length; i++){
			if(question.ainfo.charAt(i) == ' '){
				buf += ' '; //copy all the spaces
			} else if(quiz.hintState[i]){
				if(output_state != 1){
					output_state = 1;
					buf += colors.hintShown;
				}
				buf += question.ainfo.charAt(i); //copy only unveiled letters
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

