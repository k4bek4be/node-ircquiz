# node-ircquiz
## English
Node.js IRC bot for IRC quiz games.

This project is currently under development. Hope it will work correctly anyway :)

### Windows install instructions
1. Download and install [Node.js](https://nodejs.org/) LTS.
1. Download node-ircquiz, and unpack it to Desktop\node-ircquiz.
1. Open cmd.exe.
1. Type `cd Desktop\node-ircquiz`.
1. Type `npm --no-optional install` to automatically install needed packages.
1. Create the `config.json` file (will be described below), basing on `config.example.json`. I suggest using "Notepad++" program for editing the files.
1. Edit the `quiz-config.json` file to suit your needs.
1. Type `node bot.js` to test the config. This will start the bot.
1. Right click on the bot.js file and select "Open with...".
1. Find and select node.exe.
1. Click OK. The bot should start with a double click now.

### Unix (Linux) instructions
1. Install Node.js on your system (refer to its documentation about how to do it) or request it from your system administrator.
1. Download the program with a command `git clone https://github.com/k4bek4be/node-ircquiz`.
1. Type `cd node-ircquiz` to enter the newly created directory.
1. Create the `config.json` file (will be described below) with your favourite editor, basing on `config.example.json`.
1. Run the bot using `node bot.js` command. You can use `screen`, `tmux` or similar to keep it running after disconnecting your terminal.

### Using the program
Note that you have to remove the < > charactes in the command descriptions.
#### Bot commands
1. `cmd <prefix>` Command prefix: prefixes all following commands with specified text.
1. `cmd` Removes previously set prefix.
1. `say <nick or channel> <text>` Send a message to the specified target.
1. `die <reason>` Quits the program. You may have to wait a few seconds after issuing this command.

#### Quiz commands
All quiz commands begin with `quiz <#channel>`. Use `cmd quiz <#channel>` to avoid entering it everytime.
1. `stop` Stops the current game.
1. `clear` Removes all questions from memory.
1. `shuffle` Shuffles all questions in memory.
1. `help` Prints command help.
1. `skip` Skips current question.
1. `start` Starts the game.
1. `addpoint <nick> <points>` Gives or takes points from given nick.
1. `load <filename.json> <APPEND>` Reads questions from a JSON file. Specify "APPEND" to avoid erasing currently loaded questions.
1. `save <filename.json>` Saves questions to a JSON file. Note that this won't replace an existing file. This file type guarantees no information loss.
1. `load_dizzy <filename.txt>` Loads questons with a "Dizzy" format file. The questions are always appended to those currently loaded.
1. `save_dizzy <filename.txt>` Saves questions to a "Dizzy" format file (only REGEX type questions, with the regex information removed - a lossy format). If the file exists, the questions will be appended.
1. `load_mil <filename.txt>` Loads questons with a "Milionerzy" format file. The questions are always appended to those currently loaded.
1. `save_mil <filename.txt>` Saves questions to a "Milionerzy" format file (only ABCD type questions, only 4 answers will be exported - a lossy format). If the file exists, the questions will be appended.
1. `load_fam <filename.txt>` Loads questons with a "Familiada" format file. The questions are always appended to those currently loaded.
1. `save_fam <filename.txt>` Saves questions to a "Familiada" format file (only MULTI type questions). If the file exists, the questions will be appended.
1. `load_c <filename.txt>` Loads questons with a "Cbot" format file. The questions are always appended to those currently loaded.
1. `save_c <filename.txt>` Saves questions to a "Cbot" format file. If the file exists, the questions will be appended.
1. `load_k <filename.txt>` Loads questons with a "Ktrivia" format file. The questions are always appended to those currently loaded.
1. `save_k <filename.txt>` Saves questions to a "Ktrivia" format file. If the file exists, the questions will be appended.

### File formats
#### JSON
This is the internal format of data. Please do not edit the resulting file with a text editor, as the format is very prone to human errors.
#### Dizzy
This format is compatible with a popular Polish script. It allows a single answer for every question.
```
pyt <question>
odp <answer>
pyt <question>
odp <answer>
```
#### Milionerzy
This format is compatible with a popular Polish script. It allows four answers for every question, one of which is correct. The answers are displayed in random order, and the players need to specify a single letter that denotes the chosen answer.
```
<question>
<correct answer>
<incorrect answer 1>
<incorrect answer 2>
<incorrect answer 3>
<question>
<correct answer>
<incorrect answer 1>
<incorrect answer 2>
<incorrect answer 3>
```
#### Familiada
This format is compatible with a popular Polish script. It allows multiple correct answers for each question.
```
<question 1>
<answer 1>*<answer 2>*<answer 3>
<question 2>
<answer 1>*<answer 2>*<answer 3>*<answer 4>*<answer 5>
```
#### Cbot
This is the native format of the previous edition of this software. It allows for every question type. Each line contains a single question. The syntax of the lines is as follows:
The regular expression question (REGEX):
```
<question>;<regular expression>;<human readable answer>
The colour of the sky;blue|turquoise;blue
```
The classic "question-answer" type, like "Dizzy" (also REGEX that is automatically created upon loading):
```
;d;<question>;<answer>
;d;The colour of grass;green
```
The choice-type question, like "Milionerzy", but allows more than 4 answers (ABCD):
```
;m;<question>;<correct answer>;<incorrect answer 1>;<incorrect answer 2>;<incorrect answer 3>
;m;Orange juice is made from;oranges;apples;fish;crude oil
```
The multiple answer type question, like "Familiada" (MULTI):
```
;f;<question>;<answer 1>;<answer 2>
;f;Colours of the rainbow;red;orange;yellow;green;blue;violet
```
The mixed letter question. The players sees the word category, and shuffled letters that consist the answer (SHUFFLE):
```
;s;<category>;<answer>
;s;Car brand;Chevrolet
```
Each line starting with `#` character is ignored.
```
# A comment.
# A second comment.
```

## Polski
Bot IRC napisany w Node.js, służący do prowadzenia quizów na kanałach.

Ten projekt jest jeszcze nieukończony. Mam nadzieję, że pomimo tego będzie działał poprawnie :)

### Instrukcja instalacji w Windows
1. Pobierz i zainstaluj [Node.js](https://nodejs.org/) LTS.
1. Pobierz node-ircquiz i wypakuj do Pulpit\node-ircquiz.
1. Uruchom cmd.exe.
1. Wpisz `cd Desktop\node-ircquiz`.
1. Wpisz `npm --no-optional install`, aby automatycznie zainstalować niezbędne pakiety.
1. Stwórz plik `config.json` (będzie opisany poniżej), bazując na pliku `config.example.json`. Sugeruję użycie programu "Notepad++" do edycji plików.
1. Wyedytuj plik `quiz-config.json` zgodnie ze swoimi potrzebami.
1. Wpisz `node bot.js`, aby przetestować konfigurację. Ta komenda uruchomi bota.
1. Kliknij prawym przyciskiem na ikonę pliku bot.js i wybierz "Otwórz za pomocą...".
1. Znajdź i wybierz node.exe.
1. Kliknij OK. Od teraz bot powinien uruchamiać się po dwukrotnym kliknięciu bot.js.

### Instrukcja instalacji w Unix (i w Linuksie)
1. Zainstaluj w swoim systemie Node.js (jeśli nie wiesz jak, zajrzyj do dokumentacji swojego systemu), lub poproś o to Twojego administratora.
1. Pobierz program używając komendy `git clone https://github.com/k4bek4be/node-ircquiz`.
1. Wpisz `cd node-ircquiz`, aby wejść do nowo stworzonego katalogu.
1. Utwórz plik `config.json` (będzie opisany poniżej) używając swojego ulubionego edytora, bazując się na `config.example.json`.
1. Uruchom bota za pomocą komendy `node bot.js`. Możesz użyć programów `screen`, `tmux` lub podobnych, aby bot nadal działał po odłączeniu Twojego terminala.

### Obsługa programu
Zwróć uwagę, że musisz usunąć znaki < > z poniższych przykładów.
#### Komendy bota
1. `cmd <prefix>` Przedrostek komend: dodaje podany tekst na początku każdej kolejnej komendy.
1. `cmd` Wyłącza poprzednio ustawiony przedrostek.
1. `say <nick lub kanał> <text>` Wysyła wiadomość.
1. `die <powód>` Zamyka program. Cierpliwie poczekaj po użyciu tej komendy.

#### Komendy quizu
Wszystkie komendy quizu zaczynają się od `quiz <#kanał>`. Użyj najpierw `cmd quiz <#channel>`, aby nie wpisywać tego za każdym razem.
1. `stop` Zatrzymuje bieżącą grę.
1. `clear` Usuwa wszystkie pytania z pamięci.
1. `shuffle` Miesza kolejność pytań w pamięci.
1. `help` Wyświetla pomoc komend.
1. `skip` Pomija bieżące pytanie.
1. `start` Rozpoczyna grę.
1. `addpoint <nick> <punkty>` Daje lub zabiera punkty użytkownikowi o podanym nicku.
1. `load <plik.json> <APPEND>` Wczytuje pytania z pliku JSON. Dopisz "APPEND", aby przy tym nie wyczyścić aktualnie załadowanych pytań.
1. `save <plik.json>` Zapisuje pytania do pliku JSON. Uwaga: ta komenda nie nadpisze istniejącego pliku. Typ JSON gwarantuje zachowanie wszystkich informacji o pytaniach.
1. `load_dizzy <plik.txt>` Wczytuje pytania w formacie "Dizzy". Pytania zostaną dopisane do aktualnych.
1. `save_dizzy <plik.txt>` Zapisuje pytania do pliku w formacie "Dizzy" (tylko pytania typu REGEX, i to bez samego wyrażenia regularnego - format stratny). Jeśli plik istnieje, nowe pytania zostaną do niego dodane.
1. `load_mil <plik.txt>` Wczytuje pytania w formacie "Milionerzy". Pytania zostaną dopisane do aktualnych.
1. `save_mil <plik.txt>` Zapisuje pytania do pliku w formacie "Milionerzy" (tylko pytania typu ABCD, i zostaną wyeksportowane tylko 4 odpowiedzi - format stratny). Jeśli plik istnieje, nowe pytania zostaną do niego dodane.
1. `load_fam <plik.txt>` Wczytuje pytania w formacie "Familiada". Pytania zostaną dopisane do aktualnych.
1. `save_fam <plik.txt>` Zapisuje pytania do pliku w formacie "Familiada" (tylko pytania typu MULTI). Jeśli plik istnieje, nowe pytania zostaną do niego dodane.
1. `load_c <plik.txt>` Wczytuje pytania w formacie "Cbot". Pytania zostaną dopisane do aktualnych.
1. `save_c <plik.txt>` Zapisuje pytania do pliku w formacie "Cbot". Jeśli plik istnieje, nowe pytania zostaną do niego dodane.
1. `load_k <plik.txt>` Wczytuje pytania w formacie "Ktrivia". Pytania zostaną dopisane do aktualnych.
1. `save_k <plik.txt>` Zapisuje pytania do pliku w formacie "Ktrivia". Jeśli plik istnieje, nowe pytania zostaną do niego dodane.

### Formaty plików
#### JSON
To wewnętrzny format danych programu. Proszę nie edytować pliku edytorem tekstu, ponieważ format JSON jest bardzo wrażliwy na błędy składniowe.
#### Dizzy
Ten format pozwala na dodanie pytań, z których każde ma jedną odpowiedź.
```
pyt <pytanie>
odp <odpowiedź>
pyt <pytanie>
odp <odpowiedź>
```
#### Milionerzy
Ten format pozwala na podanie czterch odpowiedzi na każde pytanie, z czego tylko pierwsza jest poprawna. Odpowiedzi zostają wyświetlone w losowej kolejności, a gracze muszą podać tylko literę odpowiadającą wybranej odpowiedzi.
```
<pytanie>
<poprawna odpowiedź>
<błędna odpowiedź 1>
<błędna odpowiedź 2>
<błędna odpowiedź 3>
<pytanie>
<poprawna odpowiedź>
<błędna odpowiedź 1>
<błędna odpowiedź 2>
<błędna odpowiedź 3>
```
#### Familiada
Ten format pozwala na podanie wielu poprawnych odpowiedzi na każde pytanie.
```
<pytanie 1>
<odpowiedź 1>*<odpowiedź 2>*<odpowiedź 3>
<pytanie 2>
<odpowiedź 1>*<odpowiedź 2>*<odpowiedź 3>*<odpowiedź 4>*<odpowiedź 5>
```
#### Cbot
Jest to własny format stworzony na potrzeby wcześniejszej edycji tego oprogramowania. Pozwala na podanie każdego rodzaju pytania, każda linia zawiera jedno. Składnia linii jest następująca:
Pytanie z wyrażeniem regularnym (REGEX):
```
<question>;<regular expression>;<human readable answer>
Kolor trawy;ziel(ony|en);zielony
```
Pytanie klasyczne, jak like "Dizzy" (przy ładowaniu zostanie skonwertowane również na typ REGEX):
```
;d;pytanie;odpowiedź
;d;Wszystko spada w...;dół
```
Pytanie wyboru, jak "Milionerzy", ale pozwala na więcej niż 4 odpowiedzi (ABCD):
```
;m;<pytanie>;<poprawna odpowiedź>;<niepoprawna odpowiedź 1>;<niepoprawna odpowiedź 2>;<niepoprawna odpowiedź 3>
;m;Liczbą dwucyfrową jest;12;145;1280;1
```
Pytanie z wieloma odpowiedziami, jak "Familiada" (MULTI):
```
;f;<pytanie>;<odpowiedź 1>;<odpowiedź 2>
;f;Imiona na M;Michał;Marek;Monika;Marcin;Magdalena;Martyna
```
Pytanie z wymieszanymi literami. Gracze otrzymują nazwę kategorii słowa, i wymieszane litery odpowiedzi (SHUFFLE):
```
;s;<kategoria>;<odpowiedź>
;s;Marka samochodu;Chevrolet
```
