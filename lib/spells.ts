export interface Spell {
  id: string
  name: string
  icon: string
  description: string
}

export const SPELLS: Spell[] = [
  {
    id: 'chance',
    name: 'Chance',
    icon: '✦',
    description: "Augmente votre total de CHANCE d'une valeur égale à la moitié de vos points de départ (arrondi inférieur si impair). Ne peut dépasser vos points de départ. Utilisable à tout moment, sauf en combat. Peut être lancée plusieurs fois pour récupérer plusieurs paliers.",
  },
  {
    id: 'copie_conforme',
    name: 'Copie Conforme',
    icon: '⚔',
    description: "Crée un double magique de la créature combattue (mêmes HABILETÉ, ENDURANCE, pouvoirs). Le double est sous votre contrôle. Vous pouvez lui ordonner d'attaquer son original.",
  },
  {
    id: 'endurance',
    name: 'Endurance',
    icon: '♥',
    description: "Augmente votre total d'ENDURANCE d'une valeur égale à la moitié de vos points de départ. Ne peut dépasser vos points de départ. Utilisable à tout moment, sauf en combat.",
  },
  {
    id: 'faiblesse',
    name: 'Faiblesse',
    icon: '↓',
    description: "Réduit un monstre puissant à l'état de créature chétive. Ne fonctionne pas sur toutes les créatures, mais quand elle marche, l'adversaire devient une lamentable chiffe molle.",
  },
  {
    id: 'feu',
    name: 'Feu',
    icon: '🔥',
    description: "Fait apparaître du feu à volonté : faible explosion, jaillissement de flammes, mur de feu pour tenir vos adversaires à distance. Toutes les créatures ont peur du feu.",
  },
  {
    id: 'force',
    name: 'Force',
    icon: '💪',
    description: "Accroît considérablement votre force, utile contre des créatures robustes. À utiliser avec précaution : difficile de se contrôler quand on devient soudain si fort.",
  },
  {
    id: 'habilete',
    name: 'Habileté',
    icon: '⚔',
    description: "Augmente votre total d'HABILETÉ d'une valeur égale à la moitié de vos points de départ. Ne peut dépasser vos points de départ. Utilisable à tout moment, sauf en combat.",
  },
  {
    id: 'illusion',
    name: 'Illusion',
    icon: '👁',
    description: "Crée une illusion convaincante (vous transformer en serpent, charbons ardents au sol…). Effets immédiatement annulés dès qu'une action dissipe l'illusion. Plus efficace sur les créatures intelligentes.",
  },
  {
    id: 'levitation',
    name: 'Lévitation',
    icon: '☁',
    description: "Élimine toute pesanteur sur objets, adversaires ou vous-même. La cible se met à flotter sous votre contrôle.",
  },
  {
    id: 'or_du_sot',
    name: "L'Or du Sot",
    icon: '🪙',
    description: "Transforme un rocher ordinaire en ce qui semble un tas d'or. Tour d'illusion plus sûr que la Formule d'Illusion, mais effets brefs : le tas d'or redevient rocher.",
  },
  {
    id: 'protection',
    name: 'Protection',
    icon: '🛡',
    description: "Crée devant vous une barrière invisible vous mettant hors d'atteinte des flèches, épées, créatures. Ne protège pas contre la magie. Vous ne pouvez rien toucher au-delà de la barrière.",
  },
  {
    id: 'telepathie',
    name: 'Télépathie',
    icon: '🧠',
    description: "Capte les ondes psychiques d'une créature : lecture des pensées, savoir ce qu'il y a derrière une porte fermée. Plusieurs sources psychiques proches peuvent semer la confusion.",
  },
]
