// Word Search topics. To add your own, copy a block and change the words.
// Rules: CAPITAL letters A-Z only, no spaces, 4 to 12 letters.
// (Words longer than the grid are skipped: Easy fits 8 letters, Medium 10, Hard 12.)
(function (SG) {
  'use strict';

  SG.themes = [
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
  ];
})(window.SG);
