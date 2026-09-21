// Word Search topics, per language. To add your own, copy a block and change the words.
//
// English: CAPITAL letters A-Z only, no spaces, 4 to 12 letters.
// Hindi:   ordinary Devanagari, no spaces. Each word is split into aksharas for the grid
//          (रिश्तेदार -> रि | श्ते | दा | र), and needs at least 3 of them. Conjuncts are fine.
// Words longer than the grid are simply skipped (a tablet grid fits 8, 10 or 12 squares).
(function (SG) {
  'use strict';

  SG.themes = {
    en: [
      {
        name: 'Garden',
        words: ['ROSE', 'TULIP', 'DAISY', 'SEEDS', 'SOIL', 'SPADE', 'RAKE', 'HOSE', 'WEEDS', 'BLOOM',
          'FENCE', 'HEDGE', 'LAWN', 'FERN', 'LILY', 'SHED', 'WATER', 'PETAL', 'ROOTS', 'GLOVES',
          'ORCHID', 'COMPOST', 'SUNFLOWER', 'BUTTERFLY']
      },
      {
        name: 'Kitchen',
        words: ['SPOON', 'FORK', 'KNIFE', 'PLATE', 'KETTLE', 'OVEN', 'STOVE', 'BOWL', 'WHISK', 'APRON',
          'TEAPOT', 'SUGAR', 'FLOUR', 'BREAD', 'BUTTER', 'SALT', 'PEPPER', 'RECIPE', 'SPICE', 'LADLE',
          'TOAST', 'SAUCEPAN', 'CUPBOARD']
      },
      {
        name: 'Animals',
        words: ['HORSE', 'SHEEP', 'TIGER', 'ZEBRA', 'RABBIT', 'MONKEY', 'ELEPHANT', 'LION', 'BEAR', 'DEER',
          'GOAT', 'CAMEL', 'OTTER', 'WOLF', 'MOUSE', 'DONKEY', 'GIRAFFE', 'PANDA', 'SQUIRREL', 'KANGAROO']
      },
      {
        name: 'Birds',
        words: ['ROBIN', 'SPARROW', 'EAGLE', 'PARROT', 'SWAN', 'DUCK', 'GOOSE', 'CROW', 'DOVE', 'PEACOCK',
          'HERON', 'FINCH', 'PIGEON', 'STORK', 'WREN', 'HAWK', 'CRANE', 'MAGPIE', 'KINGFISHER', 'FLAMINGO']
      },
      {
        name: 'Fruit',
        words: ['APPLE', 'MANGO', 'BANANA', 'GRAPE', 'LEMON', 'PEACH', 'CHERRY', 'PLUM', 'ORANGE', 'PEAR',
          'MELON', 'GUAVA', 'PAPAYA', 'LIME', 'KIWI', 'APRICOT', 'COCONUT', 'DATES', 'PINEAPPLE', 'STRAWBERRY']
      },
      {
        name: 'Weather',
        words: ['SUNNY', 'CLOUD', 'STORM', 'BREEZE', 'THUNDER', 'SNOW', 'FROST', 'MIST', 'WIND', 'RAINBOW',
          'SHOWER', 'HAIL', 'WARM', 'COOL', 'DRIZZLE', 'MONSOON', 'SUNSHINE', 'HUMID', 'LIGHTNING', 'FORECAST']
      },
      {
        name: 'Family',
        words: ['MOTHER', 'FATHER', 'SISTER', 'BROTHER', 'AUNT', 'UNCLE', 'COUSIN', 'NIECE', 'NEPHEW', 'GRANDMA',
          'GRANDPA', 'FAMILY', 'HOME', 'LOVE', 'BABY', 'DAUGHTER', 'TWINS', 'PARENT', 'WEDDING', 'HUGS']
      },
      {
        name: 'Music',
        words: ['PIANO', 'VIOLIN', 'DRUM', 'FLUTE', 'GUITAR', 'SONG', 'DANCE', 'CHOIR', 'HARP', 'TUNE',
          'MELODY', 'RHYTHM', 'SINGER', 'OPERA', 'RADIO', 'TRUMPET', 'SITAR', 'TABLA', 'WALTZ', 'CONCERT',
          'ORCHESTRA']
      },
      {
        name: 'Travel',
        words: ['TRAIN', 'PLANE', 'BOAT', 'BEACH', 'HOTEL', 'TICKET', 'SUITCASE', 'PASSPORT', 'CAMERA', 'MOUNTAIN',
          'ISLAND', 'BRIDGE', 'MUSEUM', 'MARKET', 'TAXI', 'RIVER', 'LAKE', 'PICNIC', 'JOURNEY', 'POSTCARD']
      },
      {
        name: 'Clothes',
        words: ['SHIRT', 'SCARF', 'SHOES', 'SOCKS', 'DRESS', 'JACKET', 'GLOVES', 'COAT', 'SWEATER', 'SHAWL',
          'BUTTON', 'POCKET', 'SKIRT', 'BOOTS', 'BELT', 'SARI', 'KURTA', 'SLIPPERS', 'CARDIGAN', 'RAINCOAT']
      }
    ],

    hi: [
      {
        name: 'बगीचा',
        words: ['गुलाब', 'कमल', 'चमेली', 'तितली', 'टहनी', 'गमला', 'फुलवारी', 'तुलसी', 'सूरजमुखी', 'खुरपी',
          'बगीचा', 'भँवरा', 'गिलहरी', 'पीपल', 'बरगद', 'मोगरा', 'गुड़हल', 'हरियाली', 'पत्तियाँ', 'अमलतास']
      },
      {
        name: 'रसोई',
        words: ['चम्मच', 'कटोरी', 'गिलास', 'कड़ाही', 'बेलन', 'चकला', 'पतीला', 'नमक', 'मसाला', 'अचार',
          'चावल', 'पराठा', 'चटनी', 'खिचड़ी', 'पापड़', 'जलेबी', 'समोसा', 'अदरक', 'लहसुन', 'धनिया',
          'इलायची', 'छलनी', 'चिमटा']
      },
      {
        name: 'जानवर',
        words: ['बंदर', 'हिरन', 'खरगोश', 'गिलहरी', 'बकरी', 'मगरमच्छ', 'कछुआ', 'नेवला', 'सियार', 'भेड़िया',
          'जिराफ़', 'बारहसिंगा', 'तेंदुआ', 'लंगूर', 'मेंढक', 'छिपकली', 'अजगर', 'बछड़ा', 'नीलगाय', 'चमगादड़']
      },
      {
        name: 'पक्षी',
        words: ['कबूतर', 'चिड़िया', 'कोयल', 'बुलबुल', 'बगुला', 'गौरैया', 'बतख', 'सारस', 'तीतर', 'बटेर',
          'पपीहा', 'कठफोड़वा', 'नीलकंठ', 'चकोर', 'गरुड़', 'टिटहरी', 'अबाबील', 'शुतुरमुर्ग', 'राजहंस', 'मुर्गाबी']
      },
      {
        name: 'फल',
        words: ['संतरा', 'अंगूर', 'अनार', 'अमरूद', 'पपीता', 'तरबूज़', 'खरबूजा', 'नारियल', 'अनानास', 'जामुन',
          'नाशपाती', 'शरीफा', 'खजूर', 'इमली', 'कटहल', 'मौसमी', 'शहतूत', 'सिंघाड़ा', 'अंजीर', 'आलूबुखारा']
      },
      {
        name: 'मौसम',
        words: ['बारिश', 'बादल', 'बिजली', 'तूफ़ान', 'सावन', 'गरमी', 'सरदी', 'कोहरा', 'बरसात', 'इंद्रधनुष',
          'मानसून', 'बसंत', 'पतझड़', 'बौछार', 'फुहार', 'उमस', 'चाँदनी', 'शीतलहर', 'ठंडक', 'आसमान']
      },
      {
        name: 'परिवार',
        words: ['परिवार', 'बहन', 'भतीजा', 'भतीजी', 'भानजा', 'दामाद', 'ससुर', 'देवर', 'ननद', 'जेठानी',
          'देवरानी', 'ससुराल', 'मायका', 'रिश्तेदार', 'बुज़ुर्ग', 'आशीर्वाद', 'मेहमान', 'दादाजी', 'नानाजी', 'बचपन']
      },
      {
        name: 'संगीत',
        words: ['सितार', 'तबला', 'बाँसुरी', 'हारमोनियम', 'ढोलक', 'शहनाई', 'सारंगी', 'भजन', 'कीर्तन', 'गायक',
          'संगीत', 'घुँघरू', 'मंजीरा', 'कव्वाली', 'ग़ज़ल', 'लोकगीत', 'सरगम', 'आलाप', 'तानपूरा', 'संतूर',
          'पखावज', 'नगाड़ा', 'रेडियो']
      },
      {
        name: 'यात्रा',
        words: ['रेलगाड़ी', 'स्टेशन', 'टिकट', 'सामान', 'पहाड़', 'समुद्र', 'बाज़ार', 'होटल', 'जहाज़', 'सड़क',
          'तस्वीर', 'मुसाफ़िर', 'सराय', 'झरना', 'रेगिस्तान', 'जंगल', 'महल', 'मीनार', 'सफ़र', 'बंदरगाह',
          'किनारा']
      },
      {
        name: 'कपड़े',
        words: ['पजामा', 'दुपट्टा', 'पगड़ी', 'चुनरी', 'शेरवानी', 'सलवार', 'कमीज़', 'लहँगा', 'चप्पल', 'स्वेटर',
          'रूमाल', 'बटन', 'दस्ताने', 'मफ़लर', 'अँगोछा', 'घाघरा', 'ओढ़नी', 'अचकन', 'बनियान', 'पतलून',
          'जैकेट']
      }
    ]
  };
})(window.SG);
