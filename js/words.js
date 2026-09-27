// Word Search topics, per language. To add your own, copy a block and change the words.
// Everyday words from an Indian home - short and common, nothing to puzzle over.
//
// icon:    a picture shown with the topic's name, so the topic is clear without reading
// English: CAPITAL letters A-Z only, no spaces, 3 to 12 letters.
// Hindi:   ordinary Devanagari, no spaces. Each word is split into aksharas for the grid
//          (रिश्तेदार -> रि | श्ते | दा | र), and needs at least 3 of them. Conjuncts are fine.
// Words longer than the grid are simply skipped (a tablet grid fits 8, 10 or 12 squares).
(function (SG) {
  'use strict';

  SG.themes = {
    en: [
      { name: 'Fruit', icon: '🥭', words: ['MANGO', 'BANANA', 'APPLE', 'GUAVA', 'GRAPES', 'LEMON', 'ORANGE', 'PAPAYA',
        'COCONUT', 'MELON', 'PEAR', 'DATES', 'PLUM', 'LIME', 'CHERRY', 'FIGS'] },
      { name: 'Food', icon: '🍛', words: ['ROTI', 'DAL', 'RICE', 'CHAI', 'CURD', 'GHEE', 'MILK', 'SUGAR', 'SALT', 'HONEY',
        'BREAD', 'PANEER', 'PICKLE', 'SAMOSA', 'KHEER', 'HALWA', 'JALEBI', 'DOSA', 'IDLI', 'SOUP'] },
      { name: 'Family', icon: '👪', words: ['MOTHER', 'FATHER', 'SISTER', 'BROTHER', 'SON', 'DAUGHTER', 'NANI', 'NANA',
        'DADI', 'DADA', 'BABY', 'AUNTY', 'UNCLE', 'WIFE', 'HUSBAND', 'FAMILY', 'HOME', 'LOVE'] },
      { name: 'Home', icon: '🏠', words: ['DOOR', 'ROOF', 'BED', 'CHAIR', 'TABLE', 'FAN', 'LAMP', 'CLOCK', 'MIRROR',
        'WINDOW', 'SOFA', 'CUP', 'PLATE', 'SPOON', 'BUCKET', 'BROOM', 'PILLOW'] },
      { name: 'Animals', icon: '🐘', words: ['COW', 'CAT', 'DOG', 'GOAT', 'HORSE', 'TIGER', 'LION', 'CAMEL', 'MONKEY',
        'ELEPHANT', 'DONKEY', 'BEAR', 'DEER', 'RABBIT', 'MOUSE', 'SHEEP'] },
      { name: 'Birds', icon: '🦜', words: ['CROW', 'PARROT', 'PEACOCK', 'PIGEON', 'SPARROW', 'DUCK', 'HEN', 'OWL',
        'EAGLE', 'CRANE', 'SWAN', 'MYNA', 'ROOSTER', 'DOVE'] },
      { name: 'Festivals', icon: '🎆', words: ['DIWALI', 'HOLI', 'RAKHI', 'DIYA', 'LAMP', 'SWEETS', 'GIFTS', 'PUJA',
        'FLOWERS', 'RANGOLI', 'KITE', 'MELA', 'EID', 'AARTI', 'DRUMS'] },
      { name: 'Colours', icon: '🎨', words: ['RED', 'BLUE', 'GREEN', 'PINK', 'YELLOW', 'WHITE', 'BLACK', 'ORANGE',
        'BROWN', 'PURPLE', 'GOLD', 'SILVER', 'GREY'] },
      { name: 'Body', icon: '🖐️', words: ['HAND', 'FOOT', 'EYES', 'EARS', 'NOSE', 'HAIR', 'HEAD', 'KNEE', 'ARM', 'LEGS',
        'NECK', 'MOUTH', 'TEETH', 'FINGER'] },
      { name: 'Clothes', icon: '👗', words: ['SARI', 'KURTA', 'SHIRT', 'SHAWL', 'SHOES', 'SOCKS', 'CAP', 'DHOTI', 'SCARF',
        'SWEATER', 'SLIPPERS', 'COAT', 'BELT'] },
      { name: 'Weather', icon: '☀️', words: ['SUN', 'RAIN', 'CLOUD', 'WIND', 'STORM', 'HOT', 'COLD', 'RAINBOW', 'MONSOON',
        'FOG', 'SNOW', 'THUNDER'] }
    ],

    hi: [
      { name: 'फल', icon: '🥭', words: ['अमरूद', 'अंगूर', 'संतरा', 'पपीता', 'नारियल', 'तरबूज़', 'अनार', 'खजूर', 'जामुन',
        'नाशपाती', 'अनानास', 'खरबूजा', 'शरीफा', 'मौसमी'] },
      { name: 'खाना', icon: '🍛', words: ['पराठा', 'चावल', 'समोसा', 'जलेबी', 'कचौरी', 'पकौड़ा', 'खिचड़ी', 'हलवा',
        'रसगुल्ला', 'अचार', 'चटनी', 'पापड़', 'मिठाई', 'बिरयानी', 'दलिया'] },
      { name: 'परिवार', icon: '👪', words: ['परिवार', 'दादाजी', 'दादीजी', 'नानाजी', 'नानीजी', 'माताजी', 'पिताजी', 'बहन',
        'भतीजा', 'भतीजी', 'दामाद', 'ससुराल', 'मेहमान', 'बचपन'] },
      { name: 'घर', icon: '🏠', words: ['दरवाज़ा', 'खिड़की', 'कमरा', 'पलंग', 'तकिया', 'कुरसी', 'चादर', 'आँगन', 'रसोई',
        'बरतन', 'छतरी', 'दीवार', 'अलमारी'] },
      { name: 'जानवर', icon: '🐘', words: ['बंदर', 'बकरी', 'खरगोश', 'हिरन', 'कछुआ', 'गिलहरी', 'मगरमच्छ', 'मेंढक',
        'बछड़ा', 'तेंदुआ', 'गिरगिट', 'चीतल'] },
      { name: 'पक्षी', icon: '🦜', words: ['कबूतर', 'चिड़िया', 'कोयल', 'बुलबुल', 'बगुला', 'गौरैया', 'बतख', 'सारस',
        'मुरगा', 'मुरगी', 'तीतर', 'नीलकंठ'] },
      { name: 'त्योहार', icon: '🎆', words: ['दिवाली', 'दीपक', 'मिठाई', 'रंगोली', 'पतंग', 'दशहरा', 'लोहड़ी', 'आरती',
        'उपहार', 'फुलझड़ी', 'पटाखे', 'गुलाल', 'पिचकारी', 'राखियाँ'] },
      { name: 'रंग', icon: '🎨', words: ['गुलाबी', 'बैंगनी', 'नारंगी', 'सफ़ेद', 'आसमानी', 'सुनहरा', 'केसरिया', 'जामुनी',
        'चमकीला', 'रंगीन'] },
      { name: 'मौसम', icon: '☀️', words: ['बारिश', 'बादल', 'बिजली', 'गरमी', 'सरदी', 'कोहरा', 'बरसात', 'सावन', 'बसंत',
        'ठंडक', 'तूफ़ान', 'आसमान', 'सूरज'] },
      { name: 'कपड़े', icon: '👗', words: ['कुरता', 'पजामा', 'दुपट्टा', 'स्वेटर', 'चप्पल', 'रूमाल', 'कमीज़', 'सलवार',
        'पगड़ी', 'मफ़लर', 'बनियान', 'चुनरी'] }
    ]
  };
})(window.SG);
