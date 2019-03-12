function performCmd(command, args=false){
	var url = "/modules/command/" + command;
	if(args){
		url += '?args=';
		for(var i=0; i<args.length; i++){
			if(i>0) url += ';';
			url += args[i];
		}
	}
	$.ajax({
		url: url,
		dataType: "json",
		success: function(data){
			displayResult(data);
		}
	})
};

function displayResult(data){
	$('#commandResult').text(data.result);
	$('#commandReply').text(data.reply);
}

$(document).ready(function(){
	var a;
	a = document.getElementById("commandStop");
	a.onclick = function() {
		performCmd('stop');
		return false;
	}
	a = document.getElementById("commandClear");
	a.onclick = function() {
		performCmd('clear');
		return false;
	}
	a = document.getElementById("commandShuffle");
	a.onclick = function() {
		performCmd('shuffle');
		return false;
	}
	a = document.getElementById("commandHelp");
	a.onclick = function() {
		performCmd('help');
		return false;
	}
	a = document.getElementById("commandSkip");
	a.onclick = function() {
		performCmd('skip');
		return false;
	}
	a = document.getElementById("commandStart");
	a.onclick = function() {
		performCmd('start');
		return false;
	}
	a = document.getElementById("commandAddpoint");
	a.onclick = function() {
		performCmd('addpoint', [ $('#commandAddpointNick').val(), $('#commandAddpointPoints').val() ] );
		return false;
	}
	a = document.getElementById("commandLoad");
	a.onclick = function() {
		performCmd('load', [ $('#commandLoadFile').val() ] );
		return false;
	}
	a = document.getElementById("commandSave");
	a.onclick = function() {
		performCmd('save', [ $('#commandSaveFile').val() ] );
		return false;
	}
	a = document.getElementById("commandLoadDizzy");
	a.onclick = function() {
		performCmd('load_dizzy', [ $('#commandLoadDizzyFile').val() ] );
		return false;
	}
	a = document.getElementById("commandSaveDizzy");
	a.onclick = function() {
		performCmd('save_dizzy', [ $('#commandSaveDizzyFile').val() ] );
		return false;
	}
	a = document.getElementById("commandLoadMil");
	a.onclick = function() {
		performCmd('load_mil', [ $('#commandLoadMilFile').val() ] );
		return false;
	}
	a = document.getElementById("commandSaveMil");
	a.onclick = function() {
		performCmd('save_mil', [ $('#commandSaveMilFile').val() ] );
		return false;
	}
	a = document.getElementById("commandLoadFam");
	a.onclick = function() {
		performCmd('load_fam', [ $('#commandLoadFamFile').val() ] );
		return false;
	}
	a = document.getElementById("commandSaveFam");
	a.onclick = function() {
		performCmd('save_fam', [ $('#commandSaveFamFile').val() ] );
		return false;
	}
	a = document.getElementById("commandLoadC");
	a.onclick = function() {
		performCmd('load_c', [ $('#commandLoadCFile').val() ] );
		return false;
	}
	a = document.getElementById("commandSaveC");
	a.onclick = function() {
		performCmd('save_c', [ $('#commandSaveCFile').val() ] );
		return false;
	}
	a = document.getElementById("commandLoadK");
	a.onclick = function() {
		performCmd('load_k', [ $('#commandLoadKFile').val() ] );
		return false;
	}
	a = document.getElementById("commandSaveK");
	a.onclick = function() {
		performCmd('save_k', [ $('#commandSaveKFile').val() ] );
		return false;
	}
});
