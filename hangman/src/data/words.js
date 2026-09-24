// Words to guess, by category; the category is the hint. Single words of 4-12 letters,
// written as usual (French keeps its accents) but guessable with A-Z keys only.
export const CATEGORIES = [
  {
    id: 'animals',
    en: [
      'elephant', 'giraffe', 'zebra', 'lion', 'tiger', 'monkey', 'penguin', 'dolphin', 'whale', 'shark',
      'rabbit', 'squirrel', 'hedgehog', 'turtle', 'tortoise', 'crocodile', 'kangaroo', 'koala', 'panda', 'camel',
      'horse', 'donkey', 'sheep', 'goat', 'chicken', 'duck', 'goose', 'eagle', 'parrot',
      'pigeon', 'spider', 'butterfly', 'snail', 'frog', 'snake', 'lizard', 'octopus',
      'jellyfish', 'crab', 'lobster', 'wolf', 'bear', 'deer', 'mouse', 'hamster', 'kitten',
      'puppy', 'beaver', 'otter', 'seal', 'walrus', 'flamingo', 'ostrich', 'peacock', 'gorilla', 'cheetah',
      'leopard', 'hippopotamus', 'rhinoceros',
    ],
    fr: [
      'éléphant', 'girafe', 'zèbre', 'lion', 'tigre', 'singe', 'pingouin', 'manchot', 'dauphin', 'baleine',
      'requin', 'lapin', 'écureuil', 'hérisson', 'tortue', 'crocodile', 'kangourou', 'koala', 'panda', 'chameau',
      'cheval', 'mouton', 'chèvre', 'poule', 'canard', 'hibou', 'chouette', 'aigle', 'perroquet', 'pigeon',
      'araignée', 'papillon', 'abeille', 'fourmi', 'escargot', 'grenouille', 'serpent', 'lézard', 'pieuvre', 'méduse',
      'crabe', 'homard', 'renard', 'loup', 'ours', 'cerf', 'souris', 'hamster', 'chaton', 'chiot',
      'castor', 'loutre', 'phoque', 'morse', 'flamant', 'autruche', 'paon', 'gorille', 'guépard', 'léopard',
      'hippopotame', 'rhinocéros',
    ],
  },
  {
    id: 'food',
    en: [
      'apple', 'banana', 'cherry', 'strawberry', 'orange', 'lemon', 'grape', 'pear', 'peach', 'pineapple',
      'watermelon', 'melon', 'carrot', 'potato', 'tomato', 'cucumber', 'pumpkin', 'onion', 'garlic', 'cabbage',
      'broccoli', 'lettuce', 'mushroom', 'bread', 'butter', 'cheese', 'yogurt', 'honey', 'pancake', 'sandwich',
      'pizza', 'pasta', 'noodle', 'rice', 'soup', 'salad', 'chocolate', 'cookie', 'biscuit', 'cake',
      'candy', 'popcorn', 'sausage', 'omelet', 'milk', 'juice', 'cereal', 'sugar', 'pepper', 'vanilla',
      'avocado', 'coconut', 'raspberry', 'blueberry', 'spinach',
    ],
    fr: [
      'pomme', 'banane', 'cerise', 'fraise', 'orange', 'citron', 'raisin', 'poire', 'pêche', 'ananas',
      'pastèque', 'melon', 'carotte', 'patate', 'tomate', 'concombre', 'citrouille', 'oignon', 'chou', 'brocoli',
      'salade', 'champignon', 'pain', 'beurre', 'fromage', 'yaourt', 'miel', 'confiture', 'crêpe', 'sandwich',
      'pizza', 'nouille', 'soupe', 'chocolat', 'gâteau', 'biscuit', 'bonbon', 'saucisse', 'omelette', 'lait',
      'céréale', 'sucre', 'poivre', 'vanille', 'framboise', 'myrtille', 'épinard', 'abricot', 'croissant', 'baguette',
      'tartine',
    ],
  },
  {
    id: 'home',
    en: [
      'table', 'chair', 'sofa', 'pillow', 'blanket', 'lamp', 'mirror', 'window', 'door', 'carpet',
      'curtain', 'cupboard', 'drawer', 'shelf', 'kitchen', 'bathroom', 'bedroom', 'garden', 'garage', 'stairs',
      'ceiling', 'floor', 'wall', 'roof', 'chimney', 'fridge', 'oven', 'kettle', 'teapot', 'spoon',
      'fork', 'knife', 'plate', 'bowl', 'glass', 'bottle', 'candle', 'clock', 'telephone', 'computer',
      'television', 'radio', 'bucket', 'broom', 'sponge', 'towel', 'soap', 'toothbrush', 'umbrella', 'basket',
      'ladder', 'hammer', 'scissors',
    ],
    fr: [
      'table', 'chaise', 'canapé', 'oreiller', 'couverture', 'lampe', 'miroir', 'fenêtre', 'porte', 'tapis',
      'rideau', 'placard', 'tiroir', 'étagère', 'cuisine', 'salon', 'chambre', 'jardin', 'garage', 'escalier',
      'plafond', 'plancher', 'toit', 'cheminée', 'frigo', 'four', 'bouilloire', 'théière', 'cuillère', 'fourchette',
      'couteau', 'assiette', 'verre', 'bouteille', 'bougie', 'horloge', 'téléphone', 'ordinateur', 'télévision', 'radio',
      'seau', 'balai', 'éponge', 'serviette', 'savon', 'parapluie', 'panier', 'échelle', 'marteau', 'ciseaux',
    ],
  },
  {
    id: 'nature',
    en: [
      'tree', 'flower', 'forest', 'mountain', 'river', 'lake', 'ocean', 'beach', 'island', 'desert',
      'volcano', 'cloud', 'rain', 'snow', 'rainbow', 'thunder', 'lightning', 'storm', 'wind', 'sunshine',
      'moon', 'star', 'planet', 'leaf', 'branch', 'root', 'grass', 'rock', 'stone', 'pebble',
      'sand', 'wave', 'valley', 'waterfall', 'meadow', 'jungle', 'glacier', 'cave', 'hill', 'pond',
      'daisy', 'tulip', 'rose', 'sunflower', 'acorn', 'feather',
    ],
    fr: [
      'arbre', 'fleur', 'forêt', 'montagne', 'rivière', 'océan', 'plage', 'désert', 'volcan', 'nuage',
      'pluie', 'neige', 'tonnerre', 'éclair', 'orage', 'vent', 'soleil', 'lune', 'étoile', 'planète',
      'feuille', 'branche', 'racine', 'herbe', 'rocher', 'pierre', 'caillou', 'sable', 'vague', 'vallée',
      'cascade', 'prairie', 'jungle', 'glacier', 'grotte', 'colline', 'étang', 'marguerite', 'tulipe', 'rose',
      'tournesol', 'gland', 'plume',
    ],
  },
  {
    id: 'jobs',
    en: [
      'doctor', 'nurse', 'teacher', 'farmer', 'baker', 'butcher', 'pilot', 'sailor', 'soldier', 'firefighter',
      'policeman', 'dentist', 'lawyer', 'judge', 'artist', 'painter', 'singer', 'dancer', 'actor', 'writer',
      'builder', 'plumber', 'electrician', 'mechanic', 'gardener', 'fisherman', 'astronaut', 'scientist', 'engineer', 'architect',
      'chef', 'waiter', 'cashier', 'postman', 'driver', 'carpenter', 'veterinarian', 'pharmacist', 'librarian', 'journalist',
      'photographer', 'musician', 'magician', 'clown', 'queen', 'knight', 'pirate', 'detective',
    ],
    fr: [
      'médecin', 'docteur', 'infirmière', 'professeur', 'maîtresse', 'fermier', 'boulanger', 'boucher', 'pilote', 'marin',
      'soldat', 'pompier', 'policier', 'dentiste', 'avocat', 'juge', 'artiste', 'peintre', 'chanteur', 'danseuse',
      'acteur', 'écrivain', 'maçon', 'plombier', 'électricien', 'mécanicien', 'jardinier', 'pêcheur', 'astronaute', 'ingénieur',
      'architecte', 'cuisinier', 'serveur', 'caissière', 'facteur', 'chauffeur', 'charpentier', 'vétérinaire', 'pharmacien',
      'journaliste', 'photographe', 'musicien', 'magicien', 'clown', 'reine', 'chevalier', 'pirate', 'détective',
    ],
  },
  {
    id: 'sports',
    en: [
      'football', 'soccer', 'tennis', 'golf', 'rugby', 'hockey', 'baseball', 'basketball', 'volleyball', 'swimming',
      'skiing', 'skating', 'cycling', 'running', 'boxing', 'karate', 'judo', 'fencing', 'sailing', 'surfing',
      'rowing', 'climbing', 'archery', 'badminton', 'gymnastics', 'marathon', 'cricket', 'bowling', 'diving', 'wrestling',
    ],
    fr: [
      'football', 'tennis', 'golf', 'rugby', 'hockey', 'basket', 'natation', 'patinage', 'cyclisme', 'course',
      'boxe', 'karaté', 'judo', 'escrime', 'voile', 'surf', 'aviron', 'escalade', 'badminton', 'gymnastique',
      'marathon', 'bowling', 'plongée', 'lutte', 'handball', 'équitation', 'danse',
    ],
  },
  {
    id: 'transport',
    en: [
      'bicycle', 'motorcycle', 'scooter', 'train', 'tram', 'subway', 'truck', 'tractor', 'taxi', 'ambulance',
      'helicopter', 'airplane', 'rocket', 'boat', 'ship', 'submarine', 'sailboat', 'canoe', 'kayak', 'ferry',
      'yacht', 'balloon', 'sled', 'skateboard', 'wagon', 'caravan', 'carriage', 'bulldozer',
    ],
    fr: [
      'voiture', 'vélo', 'bicyclette', 'moto', 'trottinette', 'train', 'tramway', 'métro', 'autobus', 'camion',
      'tracteur', 'taxi', 'ambulance', 'hélicoptère', 'avion', 'fusée', 'bateau', 'navire', 'paquebot', 'voilier',
      'canoë', 'kayak', 'yacht', 'montgolfière', 'luge', 'traîneau', 'charrette', 'caravane', 'carrosse', 'bulldozer',
      'péniche',
    ],
  },
  {
    id: 'body',
    en: [
      'head', 'hair', 'face', 'nose', 'mouth', 'tooth', 'tongue', 'cheek', 'eyebrow', 'eyelash',
      'chin', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'finger', 'thumb', 'knee', 'ankle',
      'foot', 'heel', 'heart', 'stomach', 'brain', 'bone', 'skin', 'muscle', 'belly', 'forehead',
      'throat', 'lung',
    ],
    fr: [
      'tête', 'cheveux', 'visage', 'bouche', 'dent', 'langue', 'lèvre', 'joue', 'sourcil', 'menton',
      'épaule', 'coude', 'poignet', 'main', 'doigt', 'pouce', 'genou', 'cheville', 'pied', 'orteil',
      'talon', 'estomac', 'cerveau', 'peau', 'muscle', 'ventre', 'hanche', 'front', 'gorge', 'poumon',
      'oreille', 'bras', 'jambe', 'nombril', 'cuisse',
    ],
  },
  {
    id: 'clothes',
    en: [
      'shirt', 'trousers', 'jeans', 'skirt', 'dress', 'jacket', 'coat', 'sweater', 'scarf', 'glove',
      'mitten', 'sock', 'shoe', 'boot', 'sandal', 'slipper', 'helmet', 'pajamas', 'belt', 'shorts',
      'pocket', 'button', 'zipper', 'hood', 'apron', 'uniform', 'raincoat', 'necklace', 'bracelet', 'earring',
      'costume', 'swimsuit', 'tights',
    ],
    fr: [
      'chemise', 'pantalon', 'jupe', 'robe', 'veste', 'manteau', 'pull', 'chandail', 'écharpe', 'gant',
      'moufle', 'chaussette', 'chaussure', 'botte', 'sandale', 'pantoufle', 'chapeau', 'casquette', 'casque', 'pyjama',
      'ceinture', 'cravate', 'short', 'poche', 'bouton', 'capuche', 'tablier', 'uniforme', 'imperméable', 'collier',
      'bracelet', 'costume', 'maillot', 'collant', 'bonnet', 'lunettes',
    ],
  },
  {
    id: 'music',
    en: [
      'piano', 'guitar', 'violin', 'cello', 'trumpet', 'trombone', 'flute', 'clarinet', 'saxophone', 'drum',
      'harp', 'banjo', 'accordion', 'harmonica', 'xylophone', 'tambourine', 'organ', 'bagpipe', 'ukulele', 'triangle',
      'cymbal', 'microphone', 'melody', 'rhythm', 'song', 'concert', 'orchestra', 'choir',
    ],
    fr: [
      'piano', 'guitare', 'violon', 'violoncelle', 'trompette', 'trombone', 'flûte', 'clarinette', 'saxophone', 'tambour',
      'batterie', 'harpe', 'banjo', 'accordéon', 'harmonica', 'xylophone', 'tambourin', 'orgue', 'cornemuse', 'ukulélé',
      'triangle', 'cymbale', 'micro', 'mélodie', 'rythme', 'chanson', 'concert', 'orchestre', 'chorale',
    ],
  },
];
