var qstatus = {};

function getStatus(){
	$.ajax({
		url: "/modules/status",
		dataType: "json",
		success: function(data){
			qstatus = data;
			fillStatus();
		}
	})
};

$(document).ready(function(){
	setInterval(getStatus, 1000);
});

function fillStatus(){
	if(qstatus.quizEnabled){
		$('#quizActive').removeClass('disabled');
		$('#quizActive').addClass('enabled');
		$('#quizActive').text('Enabled');
		if(qstatus.qActive){
			$('#questionActive').addClass('enabled');
			$('#questionActive').removeClass('disabled');
			$('#questionActive').text('Yes');
		} else {
			$('#questionActive').removeClass('enabled');
			$('#questionActive').addClass('disabled');
			$('#questionActive').text('No');
		}
		showQuestionInfo();
	} else {
		$('#quizActive').addClass('disabled');
		$('#quizActive').removeClass('enabled');
		$('#quizActive').text('Disabled');
		$('.qActive').hide();
	}
	showAllQuestions();
}

function ABCDAnswerLetter(id){
	for(var i=0; i<qstatus.answers.length; i++){
		if(qstatus.answers[i] == id){
			return String.fromCharCode('A'.charCodeAt(0) + i);
		}
	}
	return '?';
}

function htmlEscape(text){
	return $("<div>").text(text).html();
}

function generateQuestionHtml(question, current=false){
	switch(question.type){
		case 'REGEX':
			return '<table><tr><td>Regular expression</td><td>'+htmlEscape(question.regex)+'</td></tr><tr><td>Displayed answer</td><td>'+htmlEscape(question.ainfo)+'</td></tr></table>';
		case 'ABCD':
			var html = '<table><tr><td>Correct answer</td><td>';
			if(current) html += '('+ABCDAnswerLetter(0)+') ';
			html += htmlEscape(question.answers[0])+'</td></tr><tr><td>Incorrect answers</td><td>';
			for(var i=1; i<question.answers.length; i++){
				if(current) html += '('+ABCDAnswerLetter(i)+') ';
				html += htmlEscape(question.answers[i]) + '<br>';
			}
			html += '</td></tr></table>';
			return html;
		case 'MULTI':
			var html = '';
			for(var i=0; i<question.answers.length; i++){
				html += '<span';
				if(current){
					if(qstatus.answered[i]) html += ' class="enabled"';
				}
				html += '>' + htmlEscape(question.answers[i]) + '</span><br>';
				
			}
			return html;
		case 'SHUFFLE':
			return htmlEscape(question.answer);
	}
}

function showQuestionInfo(){
	$('#currentQuestionNumber').text(qstatus.qNumber);
	$('#currentQuestionType').text(qstatus.question.type);
	$('#currentQuestion').text(qstatus.question.question);
	$('#currentAnswer').html(generateQuestionHtml(qstatus.question, true));
	$('.qActive').show();
}

function showAllQuestions(){
	var html = '<h2>List of questions:</h3><ol>';
	for(var i=0; i<qstatus.questions.length; i++){
		html += '<li><table><tr><td>Type</td><td>' + qstatus.questions[i].type + '</td></tr><tr><td>Question</td><td>' + qstatus.questions[i].question + '</td></tr><tr><td>Answer</td><td>' + generateQuestionHtml(qstatus.questions[i]) + '</td></tr></table></li>';
	}
	html += '</ol>'
	$('#allQuestions').html(html);
}
