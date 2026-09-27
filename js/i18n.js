// Every word the player reads, in each language.  SG.t('ws.found', 2, 6) -> "Found 2 of 6 words"
// Entries are plain strings, lists, or small functions when a sentence needs numbers or names.
//
// Hindi notes: the polite -इए forms are used throughout; "pair" is always जोड़ी (feminine);
// sentences are phrased so they never depend on the gender of a picture's name.
(function (SG) {
  'use strict';

  const STRINGS = {
    en: {
      appName: 'Sunny Games',
      home: 'Home',
      language: 'Language',
      sound: 'Sound', on: 'On', off: 'Off',
      hand: 'Playing hand', left: 'Left', right: 'Right',
      'levels.choose': 'Choose a level',
      'levels.last': 'You played this last time',
      'levels.playing': 'Playing now',
      'levels.resumeTitle': 'Your game is waiting',
      'levels.resumeText': function (progress) { return progress + ' Choosing a level below starts a new game.'; },
      'bar.level': function (name) { return 'Level: ' + name + '. Change the level'; },
      settings: 'Settings',
      start: 'Start',
      back: 'Back',
      howto: 'How to play',
      'level.easy': 'Easy', 'level.medium': 'Medium', 'level.hard': 'Hard',
      keepPlaying: 'Keep Playing',
      wellDone: 'Well done!',
      playAgain: 'Play Again',
      changeLevel: 'Change Level',
      newGame: 'New Game',

      'ws.title': 'Word Search',
      'ws.action': 'New Puzzle',
      'ws.howto': [
        'Slide your finger along a word.',
        'Or tap its first letter, then its last letter.',
        'Find the words in any order. Take as long as you like.'
      ],
      'ws.level.easy': '6 words, across and down',
      'ws.level.medium': '8 words, across, down and diagonal',
      'ws.level.hard': '10 words, any direction, even backwards',
      'ws.topic': 'Topic',
      'ws.list': 'Words to find',
      'ws.trophies': 'Words you found',
      'ws.grid': 'Letter grid. Arrow keys move. Press Enter on the first letter of a word, then on its last letter.',
      'ws.hint': 'Show a Hint',
      'ws.tip': 'Slide along a word, or tap its first letter and then its last letter.',
      'ws.foundNote': ' (found)',
      'ws.found': function (n, total) { return 'Found ' + n + ' of ' + total + ' words'; },
      'ws.lookFor': function (word) { return 'Look for ' + word + '. Its first letter is circled.'; },
      'ws.first': function (letter) { return 'First letter: ' + letter + '. Now tap the last letter of the word.'; },
      'ws.foundWord': function (word, left) { return 'You found ' + word + '! ' + left + (left === 1 ? ' word' : ' words') + ' to go.'; },
      'ws.foundLast': function (word) { return 'You found ' + word + '. That is all of them!'; },
      'ws.win': function (total, theme) { return 'You found all ' + total + ' words in the ' + theme + ' puzzle.'; },
      'ws.progress': function (n, total) { return 'You have found ' + n + ' of ' + total + ' words.'; },

      'tm.title': 'Tile Match',
      'tm.howto': [
        'Tap a tile to turn it over. Then tap another.',
        'If the two pictures match, they stay showing.',
        'If not, remember where they are. Take as long as you like.'
      ],
      'tm.level': function (tiles, pairs) { return tiles + ' tiles, ' + pairs + ' pairs'; },
      'tm.tile': function (i) { return 'Tile ' + i; },
      'tm.down': 'face down',
      'tm.matched': 'matched',
      'tm.start': function (total) { return 'Found 0 of ' + total + ' pairs. Tap a tile to turn it over.'; },
      'tm.first': function (name) { return name + '. Now find the other ' + name.toLowerCase() + '.'; },
      'tm.mismatch': function (a, b) { return a + ' and ' + b.toLowerCase() + ' are not a pair. Tap any tile to carry on.'; },
      'tm.match': function (name, left) { return 'You matched the ' + name.toLowerCase() + '! ' + left + (left === 1 ? ' pair' : ' pairs') + ' to go.'; },
      'tm.matchLast': function (name) { return 'You matched the ' + name.toLowerCase() + '. That is all of them!'; },
      'tm.win': function (pairs, turns) { return 'You matched all ' + pairs + ' pairs in ' + turns + ' turns.'; },
      'tm.progress': function (n, total) { return 'You have found ' + n + ' of ' + total + ' pairs.'; },

      'nh.title': 'Number Hunt',
      'nh.howto': [
        'Find number 1 and tap it. Then find 2, then 3, and so on.',
        'The numbers are mixed up, so look all over the screen.',
        'If you get stuck, press “Show Me”. Take as long as you like.'
      ],
      'nh.level': function (n) { return 'Numbers 1 to ' + n; },
      'nh.find': 'Find',
      'nh.hint': 'Show Me',
      'nh.board': 'Numbers',
      'nh.doneTile': function (n) { return n + ', found'; },
      'nh.start': function (total) { return 'Tap the numbers in order, from 1 to ' + total + '.'; },
      'nh.good': function (done, total) { return 'Good. ' + done + ' of ' + total + ' found.'; },
      'nh.other': function (tapped, next) { return 'That is ' + tapped + '. Look for ' + next + '.'; },
      'nh.hintMsg': function (next) { return next + ' is circled.'; },
      'nh.last': function (total) { return 'You found ' + total + '. That is all of them!'; },
      'nh.win': function (total) { return 'You found every number from 1 to ' + total + ', in order.'; },
      'nh.progress': function (done, total) { return 'You have found ' + done + ' of ' + total + ' numbers.'; },

      'pt.title': 'Repeat the Pattern',
      'pt.howto': [
        'Press “Watch”. The pads light up one after another.',
        'Then tap the same pads, in the same order.',
        'If you slip, just watch it again. Each pattern is one step longer than the last.'
      ],
      'pt.level.easy': 'Four pads, patterns of 2 to 5',
      'pt.level.medium': 'Four pads, patterns of 3 to 7',
      'pt.level.hard': 'Six pads, patterns of 3 to 7',
      'pt.board': 'Pads',
      'pt.watch': 'Watch',
      'pt.watchAgain': 'Watch Again',
      'pt.start': 'Press “Watch” to see the pattern.',
      'pt.watching': 'Watch the pads…',
      'pt.yourTurn': function (n) { return 'Your turn. Tap the same ' + n + ' pads in the same order.'; },
      'pt.step': function (k, n) { return 'Good. ' + k + ' of ' + n + '.'; },
      'pt.slip': 'Not quite – that’s all right. Press “Watch Again” to see it once more.',
      'pt.roundDone': function (next) { return 'Well remembered! Next, a pattern of ' + next + '. Press “Watch”.'; },
      'pt.last': function (n) { return 'Well remembered! That was the longest one: ' + n + ' pads.'; },
      'pt.win': function (n) { return 'You remembered every pattern, all the way up to ' + n + ' pads.'; },
      'pt.progress': function (n) { return 'You are on a pattern of ' + n + ' pads.'; },

      'so.title': 'Sort into Baskets',
      'so.howto': [
        'Tap a picture, then tap the basket where it belongs.',
        'Or slide the picture into its basket with your finger.',
        'If it is the wrong basket, the picture comes back. Take as long as you like.'
      ],
      'so.level': function (baskets, things) { return baskets + ' baskets, ' + things + ' pictures'; },
      'so.baskets': 'Baskets',
      'so.table': 'Pictures to sort',
      'so.start': 'Tap a picture, then the basket it goes in. Or slide it there.',
      'so.pick': function (item) { return item + '. Now tap the basket it goes in, or slide it there.'; },
      'so.tapFirst': 'First tap a picture, then the basket it goes in.',
      'so.wrong': function (item, basket) { return '“' + basket + '” is not the basket for the ' + item.toLowerCase() + '. Try another one.'; },
      'so.reveal': function (item, basket) { return 'The basket for the ' + item.toLowerCase() + ' is “' + basket + '”. It is circled.'; },
      'so.good': function (item, basket, left) { return 'Yes! ' + item + ' – into “' + basket + '”. ' + left + ' to go.'; },
      'so.last': function (item, basket) { return 'Yes! ' + item + ' – into “' + basket + '”. All sorted!'; },
      'so.win': function (n) { return 'You sorted all ' + n + ' pictures into their baskets.'; },
      'so.progress': function (n, total) { return 'You have sorted ' + n + ' of ' + total + ' pictures.'; },

      'col.title': 'Colouring Book',
      'col.choose': 'Choose a picture',
      'col.howto': [
        'First choose a colour.',
        'Then tap part of the picture. It fills with that colour.',
        'To change a part, choose another colour and tap it again. Nothing can go wrong.'
      ],
      'col.detail': function (n) { return n + ' parts to colour.'; },
      'col.started': 'Carries on where you left off.',
      'col.picture': 'Picture. Each part is a button.',
      'col.palette': 'Colours',
      'col.part': function (n) { return 'Part ' + n; },
      'col.colour': function (name) { return 'Colour: ' + name + '. Tap part of the picture.'; },
      'col.undo': 'Undo',
      'col.undone': 'The last colour has been taken back.',
      'col.nothingToUndo': 'There is nothing to take back yet.',
      'col.finish': 'I’m Finished',
      'col.empty': 'Tap part of the picture to colour it first.',
      'col.doneTitle': 'Beautiful!',
      'col.doneText': function (name) { return 'Your ' + name.toLowerCase() + ' is saved. You can come back and change it any time.'; },
      'col.keep': 'Keep Colouring',
      'col.another': 'Choose Another Picture',
      'col.action': 'Start Again',
      'col.bar': function (name) { return 'Picture: ' + name + '. Choose another picture'; },
      'col.resumeTitle': 'Your picture is kept',
      'col.resumeText': function (progress) { return progress + ' It stays as it is if you choose another picture. “Start Again” makes it all white.'; },
      'col.progress': function (n) { return 'You have coloured ' + n + (n === 1 ? ' part.' : ' parts.'); },

      'hm.title': 'Harmonium',
      'hm.howto': [
        'Press a key and hold it: it plays its note for as long as you hold it.',
        'To play a tune, press the key with the hand on it, then the next one.',
        'Another key just plays its own note. Take as long as you like.'
      ],
      'hm.level.free': 'Play freely',
      'hm.level.scale': 'Sa Re Ga Ma',
      'hm.level.twinkle': 'Twinkle, Twinkle',
      'hm.level.jingle': 'Jingle Bells',
      'hm.detail.free': 'Any key, any time.',
      'hm.detail.scale': 'Up the scale and back down.',
      'hm.detail.twinkle': 'A tune everyone knows, in 6 short lines.',
      'hm.detail.jingle': 'Four lines, a little longer.',
      'hm.board': 'Harmonium keys',
      'hm.listen': 'Listen',
      'hm.free': 'Press any key. Each key has its own note.',
      'hm.played': function (name) { return 'You played ' + name + '.'; },
      'hm.start': function (tune, next) { return tune + ': press the key with the hand on it, ' + next + '. Press “Listen” to hear it first.'; },
      'hm.next': function (next) { return 'Good. Now ' + next + '.'; },
      'hm.other': function (played, next) { return 'That was ' + played + '. The next note is ' + next + ', with the hand on it.'; },
      'hm.phraseDone': function (k, total) { return 'Lovely! Now line ' + k + ' of ' + total + '.'; },
      'hm.listening': 'Listen…',
      'hm.yourTurn': function (next) { return 'Your turn. Start with ' + next + '.'; },
      'hm.last': function (tune) { return 'You played all of ' + tune + '!'; },
      'hm.win': function (tune) { return 'You played ' + tune + ' all the way through.'; },
      'hm.progress': function (tune) { return 'You are part way through ' + tune + '.'; },

      'rg.title': 'Rangoli Mirror',
      'rg.choose': 'Choose a rangoli',
      'rg.howto': [
        'Choose a colour and a shape.',
        'Tap anywhere on the floor. Your mark appears all the way round, like in a mirror.',
        'Keep adding marks. Undo takes one back. Nothing can go wrong.'
      ],
      'rg.detail': function (n) { return 'Each mark goes round ' + n + ' times, mirrored.'; },
      'rg.board': 'Rangoli floor. Arrow keys move round the dots; Enter makes a mark.',
      'rg.shapes': 'Shapes',
      'rg.status': function (colour, shape) { return colour + ' ' + shape.toLowerCase() + '. Tap anywhere on the floor.'; },
      'rg.empty': 'Tap the floor to make a mark first.',
      'rg.doneText': 'Your rangoli is saved. You can come back and add to it any time.',
      'rg.keep': 'Keep Going',
      'rg.another': 'Choose Another',
      'rg.action': 'Start Again',
      'rg.bar': function (name) { return 'Rangoli: ' + name + '. Choose another'; },
      'rg.resumeTitle': 'Your rangoli is kept',
      'rg.resumeText': function (progress) { return progress + ' It stays as it is if you choose another. “Start Again” clears the floor.'; },
      'rg.progress': 'You have started a rangoli here.',

      'dy.title': 'Diya Trail',
      'dy.howto': [
        'Put your finger on the glowing dots and slide along them.',
        'Each dot lights up. When you reach a diya, it lights too.',
        'You can also tap the dots one by one. Take as long as you like.'
      ],
      'dy.level.easy': '3 diyas, gentle curves',
      'dy.level.medium': '5 diyas',
      'dy.level.hard': '7 diyas, twisty paths',
      'dy.board': 'Night sky with diyas. Press Enter to light the next dot.',
      'dy.start': 'Slide your finger along the dots, from the burning diya to the next one.',
      'dy.lit': function (n, total) { return 'Lovely! ' + n + ' of ' + total + ' diyas lit. Carry on along the dots.'; },
      'dy.last': 'Every diya is lit!',
      'dy.win': function (n) { return 'You lit all ' + n + ' diyas.'; },
      'dy.progress': function (n, total) { return 'You have lit ' + n + ' of ' + total + ' diyas.'; }
    },

    hi: {
      appName: 'सनी गेम्स',
      home: 'होम',
      language: 'भाषा',
      sound: 'आवाज़', on: 'चालू', off: 'बंद',
      hand: 'खेलने वाला हाथ', left: 'बायाँ', right: 'दायाँ',
      'levels.choose': 'स्तर चुनिए',
      'levels.last': 'पिछली बार आपने यही खेला था',
      'levels.playing': 'अभी यही खेल चल रहा है',
      'levels.resumeTitle': 'आपका खेल अभी बाकी है',
      'levels.resumeText': function (progress) { return progress + ' नीचे कोई स्तर चुनने पर नया खेल शुरू होगा।'; },
      'bar.level': function (name) { return 'स्तर: ' + name + '। स्तर बदलिए'; },
      settings: 'सेटिंग',
      start: 'शुरू कीजिए',
      back: 'वापस',
      howto: 'कैसे खेलें',
      'level.easy': 'आसान', 'level.medium': 'मध्यम', 'level.hard': 'कठिन',
      keepPlaying: 'खेलते रहिए',
      wellDone: 'शाबाश!',
      playAgain: 'फिर से खेलिए',
      changeLevel: 'स्तर बदलिए',
      newGame: 'नया खेल',

      'ws.title': 'शब्द खोज',
      'ws.action': 'नई पहेली',
      'ws.howto': [
        'शब्द पर उँगली फिराइए।',
        'या पहले उसका पहला अक्षर दबाइए, फिर आख़िरी अक्षर।',
        'शब्द किसी भी क्रम में ढूँढ़िए। जितना चाहें, उतना समय लीजिए।'
      ],
      'ws.level.easy': '6 शब्द, आड़े और खड़े',
      'ws.level.medium': '8 शब्द, आड़े, खड़े और तिरछे',
      'ws.level.hard': '10 शब्द, किसी भी दिशा में, उल्टे भी',
      'ws.topic': 'विषय',
      'ws.list': 'ढूँढ़ने वाले शब्द',
      'ws.trophies': 'आपके ढूँढ़े हुए शब्द',
      'ws.grid': 'अक्षरों की जाली। तीर वाले बटनों से चलिए। शब्द के पहले अक्षर पर एंटर दबाइए, फिर आख़िरी अक्षर पर।',
      'ws.hint': 'संकेत दिखाइए',
      'ws.tip': 'शब्द पर उँगली फिराइए, या उसका पहला अक्षर और फिर आख़िरी अक्षर दबाइए।',
      'ws.foundNote': ' (मिल गया)',
      'ws.found': function (n, total) { return total + ' में से ' + n + ' शब्द मिले'; },
      'ws.lookFor': function (word) { return '“' + word + '” ढूँढ़िए। इसके पहले अक्षर पर घेरा बना है।'; },
      'ws.first': function (letter) { return 'पहला अक्षर: ' + letter + '। अब शब्द का आख़िरी अक्षर दबाइए।'; },
      'ws.foundWord': function (word, left) { return '“' + word + '” मिल गया! ' + left + ' शब्द बाकी ' + (left === 1 ? 'है' : 'हैं') + '।'; },
      'ws.foundLast': function (word) { return '“' + word + '” मिल गया। सारे शब्द मिल गए!'; },
      'ws.win': function (total, theme) { return 'आपने “' + theme + '” पहेली के सभी ' + total + ' शब्द ढूँढ़ लिए।'; },
      'ws.progress': function (n, total) { return 'आपने ' + total + ' में से ' + n + ' शब्द ढूँढ़ लिए हैं।'; },

      'tm.title': 'जोड़ी मिलाओ',
      'tm.howto': [
        'किसी टाइल को दबाकर पलटिए। फिर दूसरी टाइल दबाइए।',
        'अगर दोनों तस्वीरें एक जैसी हैं, तो वे खुली रहेंगी।',
        'अगर नहीं, तो याद रखिए कि वे कहाँ हैं। जितना चाहें, उतना समय लीजिए।'
      ],
      'tm.level': function (tiles, pairs) { return tiles + ' टाइलें, ' + pairs + ' जोड़ियाँ'; },
      'tm.tile': function (i) { return 'टाइल ' + i; },
      'tm.down': 'बंद',
      'tm.matched': 'जोड़ी मिल गई',
      'tm.start': function (total) { return total + ' में से 0 जोड़ियाँ मिलीं। किसी टाइल को दबाकर पलटिए।'; },
      'tm.first': function (name) { return name + '। अब इसकी जोड़ी ढूँढ़िए।'; },
      'tm.mismatch': function (a, b) { return a + ' और ' + b + ' — यह जोड़ी नहीं है। आगे खेलने के लिए कोई भी टाइल दबाइए।'; },
      'tm.match': function (name, left) { return name + ' की जोड़ी मिल गई! ' + left + (left === 1 ? ' जोड़ी बाकी है।' : ' जोड़ियाँ बाकी हैं।'); },
      'tm.matchLast': function (name) { return name + ' की जोड़ी मिल गई। सारी जोड़ियाँ मिल गईं!'; },
      'tm.win': function (pairs, turns) { return 'आपने सभी ' + pairs + ' जोड़ियाँ ' + turns + ' बारियों में मिला लीं।'; },
      'tm.progress': function (n, total) { return 'आपने ' + total + ' में से ' + n + ' जोड़ियाँ ढूँढ़ ली हैं।'; },

      'nh.title': 'अंक खोज',
      'nh.howto': [
        'अंक 1 ढूँढ़कर दबाइए। फिर 2 ढूँढ़िए, फिर 3, और इसी तरह आगे।',
        'अंक इधर-उधर बिखरे हैं, इसलिए पूरी स्क्रीन पर देखिए।',
        'अगर अटक जाएँ, तो “दिखाइए” दबाइए। जितना चाहें, उतना समय लीजिए।'
      ],
      'nh.level': function (n) { return '1 से ' + n + ' तक के अंक'; },
      'nh.find': 'ढूँढ़िए',
      'nh.hint': 'दिखाइए',
      'nh.board': 'अंक',
      'nh.doneTile': function (n) { return n + ', मिल गया'; },
      'nh.start': function (total) { return '1 से ' + total + ' तक, अंकों को क्रम से दबाइए।'; },
      'nh.good': function (done, total) { return 'बहुत अच्छे। ' + total + ' में से ' + done + ' मिल गए।'; },
      'nh.other': function (tapped, next) { return 'यह ' + tapped + ' है। ' + next + ' ढूँढ़िए।'; },
      'nh.hintMsg': function (next) { return next + ' पर घेरा बना है।'; },
      'nh.last': function (total) { return total + ' मिल गया। सारे अंक मिल गए!'; },
      'nh.win': function (total) { return 'आपने 1 से ' + total + ' तक के सभी अंक क्रम से ढूँढ़ लिए।'; },
      'nh.progress': function (done, total) { return 'आपने ' + total + ' में से ' + done + ' अंक ढूँढ़ लिए हैं।'; },

      'pt.title': 'क्रम दोहराइए',
      'pt.howto': [
        '“देखिए” दबाइए। बटन एक-एक करके चमकेंगे।',
        'फिर उन्हीं बटनों को उसी क्रम में दबाइए।',
        'अगर चूक हो जाए, तो बस फिर से देखिए। हर बार क्रम एक बढ़ जाता है।'
      ],
      'pt.level.easy': 'चार बटन, 2 से 5 तक का क्रम',
      'pt.level.medium': 'चार बटन, 3 से 7 तक का क्रम',
      'pt.level.hard': 'छह बटन, 3 से 7 तक का क्रम',
      'pt.board': 'बटन',
      'pt.watch': 'देखिए',
      'pt.watchAgain': 'फिर से देखिए',
      'pt.start': 'क्रम देखने के लिए “देखिए” दबाइए।',
      'pt.watching': 'ध्यान से देखिए…',
      'pt.yourTurn': function (n) { return 'अब आपकी बारी। वही ' + n + ' बटन उसी क्रम में दबाइए।'; },
      'pt.step': function (k, n) { return 'बहुत अच्छे। ' + n + ' में से ' + k + '।'; },
      'pt.slip': 'कोई बात नहीं। क्रम दोबारा देखने के लिए “फिर से देखिए” दबाइए।',
      'pt.roundDone': function (next) { return 'बहुत बढ़िया! अब ' + next + ' बटनों का क्रम। “देखिए” दबाइए।'; },
      'pt.last': function (n) { return 'बहुत बढ़िया! यह सबसे लंबा क्रम था: ' + n + ' बटन।'; },
      'pt.win': function (n) { return 'आपने ' + n + ' बटनों तक के सारे क्रम याद रखे।'; },
      'pt.progress': function (n) { return 'अभी ' + n + ' बटनों का क्रम चल रहा है।'; },

      'so.title': 'टोकरी में रखिए',
      'so.howto': [
        'कोई तस्वीर दबाइए, फिर उसकी सही टोकरी दबाइए।',
        'या तस्वीर को उँगली से खिसकाकर उसकी टोकरी में डालिए।',
        'अगर टोकरी सही नहीं है, तो तस्वीर वापस आ जाएगी। जितना चाहें, उतना समय लीजिए।'
      ],
      'so.level': function (baskets, things) { return baskets + ' टोकरियाँ, ' + things + ' तस्वीरें'; },
      'so.baskets': 'टोकरियाँ',
      'so.table': 'रखने वाली तस्वीरें',
      'so.start': 'कोई तस्वीर दबाइए, फिर उसकी टोकरी। या तस्वीर को खिसकाकर वहाँ ले जाइए।',
      'so.pick': function (item) { return item + '। अब इसकी टोकरी दबाइए, या इसे वहाँ तक खिसकाइए।'; },
      'so.tapFirst': 'पहले कोई तस्वीर दबाइए, फिर उसकी टोकरी।',
      'so.wrong': function (item, basket) { return item + ' के लिए “' + basket + '” वाली टोकरी नहीं है। दूसरी टोकरी आज़माइए।'; },
      'so.reveal': function (item, basket) { return item + ' की जगह “' + basket + '” वाली टोकरी में है। उस पर घेरा बना है।'; },
      'so.good': function (item, basket, left) { return 'बिल्कुल सही! ' + item + ' — “' + basket + '”। ' + left + ' बाकी।'; },
      'so.last': function (item, basket) { return 'बिल्कुल सही! ' + item + ' — “' + basket + '”। सब कुछ रख दिया!'; },
      'so.win': function (n) { return 'आपने सभी ' + n + ' तस्वीरें सही टोकरियों में रख दीं।'; },
      'so.progress': function (n, total) { return 'आपने ' + total + ' में से ' + n + ' तस्वीरें रख दी हैं।'; },

      'col.title': 'रंग भरिए',
      'col.choose': 'तस्वीर चुनिए',
      'col.howto': [
        'पहले एक रंग चुनिए।',
        'फिर तस्वीर का कोई हिस्सा दबाइए। उसमें वह रंग भर जाएगा।',
        'रंग बदलना हो, तो दूसरा रंग चुनकर वही हिस्सा फिर से दबाइए। कुछ भी गलत नहीं होता।'
      ],
      'col.detail': function (n) { return 'रंगने के लिए ' + n + ' हिस्से।'; },
      'col.started': 'जहाँ छोड़ा था, वहीं से आगे।',
      'col.picture': 'तस्वीर। हर हिस्सा एक बटन है।',
      'col.palette': 'रंग',
      'col.part': function (n) { return 'हिस्सा ' + n; },
      'col.colour': function (name) { return 'रंग: ' + name + '। अब तस्वीर का कोई हिस्सा दबाइए।'; },
      'col.undo': 'वापस लीजिए',
      'col.undone': 'पिछला रंग हटा दिया गया।',
      'col.nothingToUndo': 'अभी वापस लेने के लिए कुछ नहीं है।',
      'col.finish': 'पूरा हो गया',
      'col.empty': 'पहले तस्वीर का कोई हिस्सा दबाकर रंग भरिए।',
      'col.doneTitle': 'बहुत सुंदर!',
      'col.doneText': function () { return 'आपकी तस्वीर सहेज ली गई है। इसे कभी भी फिर से खोलकर बदला जा सकता है।'; },
      'col.keep': 'रंग भरते रहिए',
      'col.another': 'दूसरी तस्वीर चुनिए',
      'col.action': 'फिर से शुरू',
      'col.bar': function (name) { return 'तस्वीर: ' + name + '। दूसरी तस्वीर चुनिए'; },
      'col.resumeTitle': 'आपकी तस्वीर सहेजी हुई है',
      'col.resumeText': function (progress) { return progress + ' दूसरी तस्वीर चुनने पर भी यह ऐसी ही रहेगी। “फिर से शुरू” दबाने पर सारे रंग मिट जाएँगे।'; },
      'col.progress': function (n) { return 'आपने ' + n + ' हिस्सों में रंग भरा है।'; },

      'hm.title': 'हारमोनियम',
      'hm.howto': [
        'कोई बटन दबाकर रखिए: जब तक दबाए रखेंगे, उसका सुर बजता रहेगा।',
        'धुन बजाने के लिए, जिस बटन पर हाथ का निशान है उसे दबाइए, फिर अगला।',
        'कोई दूसरा बटन बस अपना सुर बजाता है। जितना चाहें, उतना समय लीजिए।'
      ],
      'hm.level.free': 'मन से बजाइए',
      'hm.level.scale': 'सा रे ग म',
      'hm.level.twinkle': 'ट्विंकल ट्विंकल',
      'hm.level.jingle': 'जिंगल बेल्स',
      'hm.detail.free': 'कोई भी बटन, कभी भी।',
      'hm.detail.scale': 'सुर ऊपर, और फिर नीचे।',
      'hm.detail.twinkle': 'सबकी जानी-पहचानी धुन, 6 छोटी पंक्तियाँ।',
      'hm.detail.jingle': 'चार पंक्तियाँ, थोड़ी लंबी।',
      'hm.board': 'हारमोनियम के बटन',
      'hm.listen': 'सुनिए',
      'hm.free': 'कोई भी बटन दबाइए। हर बटन का अपना सुर है।',
      'hm.played': function (name) { return name + ' बजा।'; },
      'hm.start': function (tune, next) { return tune + ': जिस बटन पर हाथ है, उसे दबाइए – ' + next + '। पहले सुनना हो तो “सुनिए” दबाइए।'; },
      'hm.next': function (next) { return 'बहुत अच्छे। अब ' + next + '।'; },
      'hm.other': function (played, next) { return 'यह ' + played + ' था। अगला सुर ' + next + ' है, जिस पर हाथ है।'; },
      'hm.phraseDone': function (k, total) { return 'वाह! अब ' + total + ' में से पंक्ति ' + k + '।'; },
      'hm.listening': 'सुनिए…',
      'hm.yourTurn': function (next) { return 'अब आपकी बारी। ' + next + ' से शुरू कीजिए।'; },
      'hm.last': function (tune) { return 'आपने “' + tune + '” की पूरी धुन बजा ली!'; },
      'hm.win': function (tune) { return 'आपने “' + tune + '” की धुन शुरू से आख़िर तक बजा ली।'; },
      'hm.progress': function (tune) { return '“' + tune + '” की धुन अभी पूरी नहीं हुई है।'; },

      'rg.title': 'रंगोली',
      'rg.choose': 'रंगोली चुनिए',
      'rg.howto': [
        'एक रंग और एक आकार चुनिए।',
        'ज़मीन पर कहीं भी दबाइए। आपका निशान आईने की तरह चारों ओर बन जाएगा।',
        'निशान बनाते जाइए। “वापस लीजिए” से आख़िरी निशान हट जाता है। कुछ भी गलत नहीं होता।'
      ],
      'rg.detail': function (n) { return 'हर निशान ' + n + ' बार घूमकर बनता है।'; },
      'rg.board': 'रंगोली की ज़मीन। तीर वाले बटनों से बिंदुओं पर चलिए, एंटर से निशान बनाइए।',
      'rg.shapes': 'आकार',
      'rg.status': function (colour, shape) { return colour + ' रंग, ' + shape + '। ज़मीन पर कहीं भी दबाइए।'; },
      'rg.empty': 'पहले ज़मीन पर दबाकर कोई निशान बनाइए।',
      'rg.doneText': 'आपकी रंगोली सहेज ली गई है। इसे कभी भी खोलकर और सजाया जा सकता है।',
      'rg.keep': 'सजाते रहिए',
      'rg.another': 'दूसरी चुनिए',
      'rg.action': 'फिर से शुरू',
      'rg.bar': function (name) { return 'रंगोली: ' + name + '। दूसरी चुनिए'; },
      'rg.resumeTitle': 'आपकी रंगोली सहेजी हुई है',
      'rg.resumeText': function (progress) { return progress + ' दूसरी चुनने पर भी यह ऐसी ही रहेगी। “फिर से शुरू” दबाने पर ज़मीन साफ़ हो जाएगी।'; },
      'rg.progress': 'यहाँ आपकी रंगोली बन रही है।',

      'dy.title': 'दीयों की राह',
      'dy.howto': [
        'चमकते बिंदुओं पर उँगली रखिए और उन पर फिराते जाइए।',
        'हर बिंदु जल उठता है। दीये तक पहुँचते ही वह भी जल जाता है।',
        'बिंदुओं को एक-एक करके दबा भी सकते हैं। जितना चाहें, उतना समय लीजिए।'
      ],
      'dy.level.easy': '3 दीये, हल्के मोड़',
      'dy.level.medium': '5 दीये',
      'dy.level.hard': '7 दीये, घुमावदार राह',
      'dy.board': 'दीयों वाला रात का आसमान। अगला बिंदु जलाने के लिए एंटर दबाइए।',
      'dy.start': 'जलते दीये से अगले दीये तक, बिंदुओं पर उँगली फिराइए।',
      'dy.lit': function (n, total) { return 'बहुत सुंदर! ' + total + ' में से ' + n + ' दीये जल गए। बिंदुओं पर आगे बढ़िए।'; },
      'dy.last': 'सारे दीये जल गए!',
      'dy.win': function (n) { return 'आपने सभी ' + n + ' दीये जला दिए।'; },
      'dy.progress': function (n, total) { return 'आपने ' + total + ' में से ' + n + ' दीये जला दिए हैं।'; }
    }
  };

  // Shown in their own script whatever the current language, so each reader can find theirs.
  SG.languages = [{ value: 'en', text: 'English' }, { value: 'hi', text: 'हिंदी' }];

  SG.lang = SG.store.get('lang', 'en');
  if (!STRINGS[SG.lang]) SG.lang = 'en';

  SG.setLang = function (lang) {
    if (!STRINGS[lang]) return;
    SG.lang = lang;
    SG.store.set('lang', lang);
    document.documentElement.lang = lang; // also switches on the Devanagari spacing rules in style.css
  };

  SG.has = function (key) {
    return STRINGS[SG.lang][key] !== undefined || STRINGS.en[key] !== undefined;
  };

  SG.t = function (key) {
    let entry = STRINGS[SG.lang][key];
    if (entry === undefined) entry = STRINGS.en[key];
    if (typeof entry !== 'function') return entry;
    return entry.apply(null, Array.prototype.slice.call(arguments, 1));
  };

  document.documentElement.lang = SG.lang;
})(window.SG);
