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
      'home.sub': 'Choose a game to play.',
      play: 'Play',
      home: 'Home',
      language: 'Language',
      sound: 'Sound', on: 'On', off: 'Off',
      hand: 'Playing hand', left: 'Left', right: 'Right',
      'levels.choose': 'Choose a level',
      'levels.last': 'You played this last time',
      howto: 'How to play',
      'level.easy': 'Easy', 'level.medium': 'Medium', 'level.hard': 'Hard',
      keepPlaying: 'Keep Playing',
      wellDone: 'Well done!',
      playAgain: 'Play Again',
      changeLevel: 'Change Level',

      'ws.title': 'Word Search',
      'ws.blurb': 'Find the hidden words in a grid of letters.',
      'ws.action': 'New Puzzle',
      'ws.confirmTitle': 'Start a new puzzle?',
      'ws.confirmText': function (progress) { return progress + ' A new puzzle will clear them.'; },
      'ws.howto': [
        'Slide your finger along a word.',
        'Or tap its first letter, then its last letter.',
        'Find the words in any order. Take as long as you like.'
      ],
      'ws.level.easy': '6 words, across and down',
      'ws.level.medium': '8 words, across, down and diagonal',
      'ws.level.hard': '10 words, any direction, even backwards',
      'ws.level.phone': 'On a phone: a smaller grid with fewer words, so the letters stay big.',
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
      'tm.blurb': 'Turn over the tiles and find the matching pairs.',
      'tm.action': 'New Game',
      'tm.confirmTitle': 'Start a new game?',
      'tm.confirmText': function (progress) { return progress + ' A new game will clear them.'; },
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
      'nh.blurb': 'Tap the numbers in order, starting from 1.',
      'nh.action': 'New Game',
      'nh.confirmTitle': 'Start a new game?',
      'nh.confirmText': function (progress) { return progress + ' A new game will clear them.'; },
      'nh.howto': [
        'Find number 1 and tap it. Then find 2, then 3, and so on.',
        'The numbers are mixed up, so look all over the grid.',
        'If you get stuck, press “Show Me”. Take as long as you like.'
      ],
      'nh.level': function (n) { return 'Numbers 1 to ' + n; },
      'nh.level.phone': 'On a small screen: fewer numbers, so they stay big.',
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
      'nh.progress': function (done, total) { return 'You have found ' + done + ' of ' + total + ' numbers.'; }
    },

    hi: {
      appName: 'सनी गेम्स',
      'home.sub': 'खेलने के लिए एक खेल चुनिए।',
      play: 'खेलिए',
      home: 'होम',
      language: 'भाषा',
      sound: 'आवाज़', on: 'चालू', off: 'बंद',
      hand: 'खेलने वाला हाथ', left: 'बायाँ', right: 'दायाँ',
      'levels.choose': 'स्तर चुनिए',
      'levels.last': 'पिछली बार आपने यही खेला था',
      howto: 'कैसे खेलें',
      'level.easy': 'आसान', 'level.medium': 'मध्यम', 'level.hard': 'कठिन',
      keepPlaying: 'खेलते रहिए',
      wellDone: 'शाबाश!',
      playAgain: 'फिर से खेलिए',
      changeLevel: 'स्तर बदलिए',

      'ws.title': 'शब्द खोज',
      'ws.blurb': 'अक्षरों की जाली में छिपे हुए शब्द ढूँढ़िए।',
      'ws.action': 'नई पहेली',
      'ws.confirmTitle': 'नई पहेली शुरू करें?',
      'ws.confirmText': function (progress) { return progress + ' नई पहेली शुरू करने पर ये मिट जाएँगे।'; },
      'ws.howto': [
        'शब्द पर उँगली फिराइए।',
        'या पहले उसका पहला अक्षर दबाइए, फिर आख़िरी अक्षर।',
        'शब्द किसी भी क्रम में ढूँढ़िए। जितना चाहें, उतना समय लीजिए।'
      ],
      'ws.level.easy': '6 शब्द, आड़े और खड़े',
      'ws.level.medium': '8 शब्द, आड़े, खड़े और तिरछे',
      'ws.level.hard': '10 शब्द, किसी भी दिशा में, उल्टे भी',
      'ws.level.phone': 'फ़ोन पर: छोटी जाली और कम शब्द, ताकि अक्षर बड़े रहें।',
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
      'tm.blurb': 'टाइलें पलटिए और एक जैसी तस्वीरों की जोड़ियाँ ढूँढ़िए।',
      'tm.action': 'नया खेल',
      'tm.confirmTitle': 'नया खेल शुरू करें?',
      'tm.confirmText': function (progress) { return progress + ' नया खेल शुरू करने पर ये मिट जाएँगी।'; },
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
      'nh.blurb': '1 से शुरू करके अंकों को क्रम से दबाइए।',
      'nh.action': 'नया खेल',
      'nh.confirmTitle': 'नया खेल शुरू करें?',
      'nh.confirmText': function (progress) { return progress + ' नया खेल शुरू करने पर ये मिट जाएँगे।'; },
      'nh.howto': [
        'अंक 1 ढूँढ़कर दबाइए। फिर 2 ढूँढ़िए, फिर 3, और इसी तरह आगे।',
        'अंक इधर-उधर बिखरे हैं, इसलिए पूरी जाली में देखिए।',
        'अगर अटक जाएँ, तो “दिखाइए” दबाइए। जितना चाहें, उतना समय लीजिए।'
      ],
      'nh.level': function (n) { return '1 से ' + n + ' तक के अंक'; },
      'nh.level.phone': 'छोटी स्क्रीन पर: कम अंक, ताकि वे बड़े दिखें।',
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
      'nh.progress': function (done, total) { return 'आपने ' + total + ' में से ' + done + ' अंक ढूँढ़ लिए हैं।'; }
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

  SG.t = function (key) {
    let entry = STRINGS[SG.lang][key];
    if (entry === undefined) entry = STRINGS.en[key];
    if (typeof entry !== 'function') return entry;
    return entry.apply(null, Array.prototype.slice.call(arguments, 1));
  };

  document.documentElement.lang = SG.lang;
})(window.SG);
