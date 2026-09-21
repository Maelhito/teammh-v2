/**
 * Données du guide des équivalences alimentaires.
 *
 * Reprises telles quelles de l'artefact Claude de Julie (« Guide des
 * équivalences alimentaires ») : ne pas retoucher les valeurs à la main
 * sans elle, c'est sa base de travail.
 *
 * Deux modes de tableau :
 *  - mode 'kcal'  → équivalent = quantité × (kcal référence ÷ kcal cible)
 *  - mode 'ratio' → équivalent = quantité × (q cible ÷ q référence)
 * On ne remplace un aliment que par un autre du même tableau (ou du même
 * palier / groupe croisé, voir moteur.ts).
 */

export interface AlimentEq {
  n: string;
  cat: string;
  kcal?: number;
  prot?: number;
  fiber?: number;
  carbs?: number;
  fat?: number;
  satFat?: number;
  sugar?: number;
  ingCount?: number;
  firstSugar?: boolean;
  vit?: string[];
  note?: string;
  subcat?: string;
  crossGroup?: string;
  q?: number;
  u?: string;
}

export interface TableauEq {
  id: string;
  title: string;
  short?: string;
  meta: string;
  mode: "kcal" | "ratio";
  tierGroup?: string;
  tierLevel?: number;
  includesBlocks?: string[];
  hideRefRow?: boolean;
  items: AlimentEq[];
}

export interface CategorieEq {
  id: string;
  label: string;
  icon: string;
}

export const DATA: TableauEq[] = [
  // ---------------- LÉGUMES ----------------
  {id:'leg-l1', title:'Légumes — jusqu\'à 25 kcal/100g', meta:'les plus légers : salades, courgette, tomate, champignons…', mode:'kcal', tierGroup:'legumes', tierLevel:1, items:[
    {n:'Cresson',kcal:11,prot:2.3,fiber:1.1,carbs:1.3,vit:['Vitamine K','Vitamine C'],cat:'legumes'},{n:'Concombre',kcal:12,prot:0.7,fiber:0.5,carbs:2.2,vit:['Vitamine K'],cat:'legumes'},{n:'Cornichon',kcal:12,prot:0.8,fiber:1.2,carbs:2.0,vit:['Vitamine K'],cat:'legumes'},
    {n:'Chou pak-choï',kcal:13,prot:1.5,fiber:1.0,carbs:1.2,vit:['Vitamine C','Vitamine K'],cat:'legumes'},{n:'Christophine',kcal:19,prot:0.8,fiber:1.7,carbs:4.1,vit:['Vitamine C'],cat:'legumes'},{n:'Salade iceberg',kcal:14,prot:0.9,fiber:1.2,carbs:2.1,vit:['Vitamine K'],cat:'legumes'},{n:'Laitue',kcal:15,prot:1.4,fiber:1.3,carbs:2.0,vit:['Vitamine A','Vitamine K'],cat:'legumes'},
    {n:'Céleri branche',kcal:16,prot:0.7,fiber:1.6,carbs:3.0,vit:['Vitamine K'],cat:'legumes'},{n:'Radis',kcal:16,prot:0.7,fiber:1.6,carbs:2.1,vit:['Vitamine C'],cat:'legumes'},{n:'Chicorée frisée',kcal:17,prot:1.7,fiber:2.0,carbs:2.4,vit:['Vitamine A','Vitamine K'],cat:'legumes'},
    {n:'Courgette',kcal:17,prot:1.2,fiber:1.0,carbs:3.1,vit:['Vitamine C','Potassium'],cat:'legumes'},{n:'Endive',kcal:17,prot:1.3,fiber:1.6,carbs:2.9,vit:['Vitamine K','Vitamine A'],cat:'legumes'},{n:'Tomate',kcal:18,prot:0.9,fiber:1.2,carbs:3.9,vit:['Vitamine C','Potassium'],cat:'legumes'},
    {n:'Tomate cerise',kcal:18,prot:0.9,fiber:1.2,carbs:3.9,vit:['Vitamine C'],cat:'legumes'},{n:'Blette',kcal:19,prot:1.8,fiber:1.6,carbs:3.7,vit:['Vitamine K','Vitamine A'],cat:'legumes'},{n:'Poivron vert',kcal:20,prot:0.9,fiber:1.7,carbs:4.6,vit:['Vitamine C'],cat:'legumes'},
    {n:'Asperge',kcal:20,prot:2.2,fiber:2.1,carbs:3.4,vit:['Vitamine K','Vitamine B9 (folates)'],cat:'legumes'},{n:'Mâche',kcal:21,prot:2,fiber:1.7,carbs:3.6,vit:['Vitamine A','Vitamine B9 (folates)'],cat:'legumes'},{n:'Champignon de Paris',kcal:22,prot:3.1,fiber:1.0,carbs:3.3,vit:['Vitamine D','Potassium'],cat:'legumes'},
    {n:'Fenouil',kcal:22,prot:1,fiber:3.1,carbs:7.3,vit:['Vitamine C','Potassium'],cat:'legumes'},{n:'Épinard',kcal:23,prot:2.9,fiber:2.2,carbs:3.6,vit:['Vitamine K','Vitamine A'],cat:'legumes'},
    {n:'Roquette',kcal:25,prot:2.6,fiber:1.6,carbs:3.7,vit:['Vitamine K','Vitamine C'],cat:'legumes'},{n:'Aubergine',kcal:25,prot:1,fiber:3.0,carbs:5.9,vit:['Potassium'],cat:'legumes'},
    {n:'Chou-fleur',kcal:25,prot:1.9,fiber:2.0,carbs:5.0,vit:['Vitamine C','Vitamine K'],cat:'legumes'},{n:'Chou blanc',kcal:25,prot:1.3,fiber:2.5,carbs:5.8,vit:['Vitamine C','Vitamine K'],cat:'legumes'}
  ]},
  {id:'leg-l2', title:'Légumes — 26 à 35 kcal/100g', meta:'', mode:'kcal', tierGroup:'legumes', tierLevel:2, items:[
    {n:'Cèpe',kcal:26,prot:3.6,fiber:2.5,carbs:3.3,vit:['Potassium'],cat:'legumes'},{n:'Potiron / citrouille',kcal:26,prot:1,fiber:0.5,carbs:6.5,vit:['Vitamine A'],cat:'legumes'},{n:'Poivron jaune',kcal:27,prot:1,fiber:1.7,carbs:6.3,vit:['Vitamine C'],cat:'legumes'},
    {n:'Courge spaghetti',kcal:27,prot:0.6,fiber:1.4,carbs:6.5,vit:['Vitamine C'],cat:'legumes'},{n:'Chou romanesco',kcal:28,prot:2,fiber:2.2,carbs:5.0,vit:['Vitamine C','Vitamine K'],cat:'legumes'},{n:'Navet',kcal:28,prot:0.9,fiber:1.8,carbs:6.4,vit:['Vitamine C'],cat:'legumes'},
    {n:'Poireau',kcal:29,prot:1.5,fiber:1.8,carbs:6.6,vit:['Vitamine K','Vitamine A'],cat:'legumes'},{n:'Haricot beurre',kcal:30,prot:1.8,fiber:3.0,carbs:4.3,vit:['Vitamine C','Vitamine K'],cat:'legumes'},{n:'Pousses de soja',kcal:30,prot:3,fiber:1.9,carbs:5.9,vit:['Vitamine C'],cat:'legumes'},
    {n:'Poivron rouge',kcal:31,prot:1,fiber:1.7,carbs:6.0,vit:['Vitamine C','Vitamine A'],cat:'legumes'},{n:'Chou rouge',kcal:31,prot:1.4,fiber:2.1,carbs:6.9,vit:['Vitamine C','Vitamine K'],cat:'legumes'},
    {n:'Haricot vert',kcal:31,prot:1.8,fiber:3.4,carbs:7.1,vit:['Vitamine C','Vitamine K'],cat:'legumes'},{n:'Céleri rave',kcal:32,prot:1.5,fiber:1.8,carbs:6.0,vit:['Vitamine C','Potassium'],cat:'legumes'},{n:'Coulis de tomate',kcal:32,prot:1.5,fiber:1.5,carbs:6.5,vit:['Vitamine C'],cat:'legumes'},
    {n:'Brocoli',kcal:34,prot:2.8,fiber:2.6,carbs:5.2,vit:['Vitamine C','Vitamine K'],cat:'legumes'}
  ]},
  {id:'leg-l3', title:'Légumes — 36 à 45 kcal/100g', meta:'', mode:'kcal', tierGroup:'legumes', tierLevel:3, items:[
    {n:'Rutabaga',kcal:37,prot:1.1,fiber:2.3,carbs:8.1,vit:['Vitamine C'],cat:'legumes'},{n:'Oignon',kcal:40,prot:1.1,fiber:1.7,carbs:9.0,vit:['Vitamine C'],cat:'legumes'},
    {n:'Oignon rouge',kcal:40,prot:1.1,fiber:1.7,carbs:9.0,vit:['Vitamine C'],cat:'legumes'},{n:'Piment fort frais',kcal:40,prot:1.9,fiber:1.5,carbs:8.8,vit:['Vitamine C','Vitamine A'],cat:'legumes'},{n:'Carotte',kcal:41,prot:0.9,fiber:2.8,carbs:9.6,vit:['Vitamine A'],cat:'legumes'},
    {n:'Chou de Bruxelles',kcal:43,prot:3.4,fiber:3.8,carbs:8.0,vit:['Vitamine C','Vitamine K'],cat:'legumes'},{n:'Betterave',kcal:43,prot:1.6,fiber:2.8,carbs:9.6,vit:['Vitamine B9 (folates)','Potassium'],cat:'legumes'},
    {n:'Courge butternut',kcal:45,prot:1,fiber:2.0,carbs:11.7,vit:['Vitamine A'],cat:'legumes'}
  ]},
  {id:'leg-l4', title:'Légumes — 46 à 100 kcal/100g', meta:'', mode:'kcal', tierGroup:'legumes', tierLevel:4, items:[
    {n:'Artichaut',kcal:47,prot:3.3,fiber:5.4,carbs:10.5,vit:['Vitamine C','Vitamine K'],cat:'legumes'},{n:'Chou kale',kcal:54,prot:4.3,fiber:3.6,carbs:8.8,vit:['Vitamine K','Vitamine A'],cat:'legumes'},{n:'Panais',kcal:71,prot:1.3,fiber:4.9,carbs:17.9,vit:['Vitamine C','Potassium'],cat:'legumes'},
    {n:'Échalote',kcal:72,prot:2.5,fiber:3.2,carbs:16.8,vit:['Vitamine C'],cat:'legumes'},{n:'Topinambour',kcal:73,prot:2,fiber:1.6,carbs:17.4,vit:['Potassium'],cat:'legumes'},{n:'Gingembre frais',kcal:80,prot:1.8,fiber:2.0,carbs:17.8,vit:['Vitamine B6'],cat:'legumes'},
    {n:'Petit pois frais',kcal:81,prot:5.4,fiber:5.1,carbs:14.5,vit:['Vitamine C','Vitamine B9 (folates)'],cat:'legumes'},{n:'Salsifis',kcal:82,prot:3.3,fiber:3.3,carbs:18.6,vit:['Potassium'],cat:'legumes'},{n:'Concentré de tomate',kcal:82,prot:4.3,fiber:5.0,carbs:19.0,vit:['Vitamine C','Potassium'],cat:'legumes'}
  ]},
  {id:'leg-l5', title:'Légumes — 100 kcal et plus', meta:'olives, ail, avocat : plus caloriques, à compter comme un vrai aliment du repas', mode:'kcal', tierGroup:'legumes', tierLevel:5, items:[
    {n:'Olive noire',kcal:115,prot:1,fiber:2.5,carbs:3.8,vit:['Vitamine E'],cat:'legumes'},{n:'Olive verte',kcal:145,prot:1,fiber:3.3,carbs:3.8,vit:['Vitamine E'],cat:'legumes'},{n:'Ail',kcal:149,prot:6.4,fiber:2.1,carbs:33.1,vit:['Vitamine B6','Vitamine C'],cat:'legumes'},
    {n:'Avocat',kcal:160,prot:2,fiber:6.7,carbs:8.5,vit:['Vitamine E','Potassium'],cat:'legumes'},{n:'Tomate séchée',kcal:258,prot:14,fiber:12.3,carbs:55.8,vit:['Vitamine C','Potassium'],cat:'legumes'}
  ]},

  // ---------------- FRUITS ----------------
  {id:'fr-l1', title:'Fruits — jusqu\'à 35 kcal/100g', meta:'', mode:'kcal', tierGroup:'fruits', tierLevel:1, items:[
    {n:'Rhubarbe',kcal:21,prot:0.9,fiber:1.8,carbs:4.5,vit:['Vitamine K'],cat:'fruits'},{n:'Citron',kcal:29,prot:1.1,fiber:2.8,carbs:9.3,vit:['Vitamine C'],cat:'fruits'},{n:'Citron vert',kcal:30,prot:0.7,fiber:2.8,carbs:10.5,vit:['Vitamine C'],cat:'fruits'},
    {n:'Fraise des bois',kcal:30,prot:0.8,fiber:2.0,carbs:7.7,vit:['Vitamine C'],cat:'fruits'},{n:'Pastèque',kcal:30,prot:0.6,fiber:0.4,carbs:7.6,vit:['Vitamine A','Vitamine C'],cat:'fruits'},{n:'Carambole',kcal:31,prot:1,fiber:2.8,carbs:6.7,vit:['Vitamine C'],cat:'fruits'},
    {n:'Tamarillo',kcal:31,prot:1.5,fiber:3.3,carbs:6.5,vit:['Vitamine C','Vitamine A'],cat:'fruits'},{n:'Fraise',kcal:32,prot:0.7,fiber:2.0,carbs:7.7,vit:['Vitamine C'],cat:'fruits'},{n:'Melon',kcal:34,prot:0.8,fiber:0.9,carbs:8.2,vit:['Vitamine A','Vitamine C'],cat:'fruits'}
  ]},
  {id:'fr-l2', title:'Fruits — 36 à 50 kcal/100g', meta:'', mode:'kcal', tierGroup:'fruits', tierLevel:2, items:[
    {n:'Pêche',kcal:39,prot:0.9,fiber:1.5,carbs:9.5,vit:['Vitamine C'],cat:'fruits'},{n:'Pamplemousse',kcal:42,prot:0.8,fiber:1.6,carbs:10.7,vit:['Vitamine C'],cat:'fruits'},{n:'Poire asiatique (nashi)',kcal:42,prot:0.5,fiber:3.6,carbs:10.6,vit:['Vitamine C'],cat:'fruits'},
    {n:'Mûre',kcal:43,prot:1.4,fiber:5.3,carbs:9.6,vit:['Vitamine C','Vitamine K'],cat:'fruits'},{n:'Papaye',kcal:43,prot:0.5,fiber:1.7,carbs:10.8,vit:['Vitamine A','Vitamine C'],cat:'fruits'},{n:'Nectarine',kcal:44,prot:1.1,fiber:1.5,carbs:10.6,vit:['Vitamine C'],cat:'fruits'},
    {n:'Groseille à maquereau',kcal:44,prot:0.9,fiber:4.3,carbs:10.2,vit:['Vitamine C'],cat:'fruits'},{n:'Prune',kcal:46,prot:0.7,fiber:1.4,carbs:11.4,vit:['Vitamine C','Vitamine K'],cat:'fruits'},{n:'Airelle / canneberge fraîche',kcal:46,prot:0.4,fiber:4.6,carbs:12.2,vit:['Vitamine C'],cat:'fruits'},
    {n:'Orange',kcal:47,prot:0.9,fiber:2.4,carbs:11.8,vit:['Vitamine C'],cat:'fruits'},{n:'Clémentine',kcal:47,prot:0.9,fiber:1.7,carbs:11.7,vit:['Vitamine C'],cat:'fruits'},{n:'Nèfle',kcal:47,prot:0.4,fiber:1.7,carbs:12.1,vit:['Vitamine A'],cat:'fruits'},
    {n:'Pomme',kcal:48,prot:0.3,fiber:2.4,carbs:11.4,vit:['Vitamine C'],cat:'fruits'},{n:'Abricot',kcal:48,prot:1.4,fiber:2.0,carbs:11.1,vit:['Vitamine A','Vitamine C'],cat:'fruits'},{n:'Ananas',kcal:50,prot:0.5,fiber:1.4,carbs:13.1,vit:['Vitamine C'],cat:'fruits'}
  ]},
  {id:'fr-l3', title:'Fruits — 51 à 70 kcal/100g', meta:'', mode:'kcal', tierGroup:'fruits', tierLevel:3, items:[
    {n:'Framboise',kcal:52,prot:1.2,fiber:6.5,carbs:11.9,vit:['Vitamine C','Vitamine K'],cat:'fruits'},{n:'Mandarine',kcal:53,prot:0.8,fiber:1.8,carbs:13.3,vit:['Vitamine C'],cat:'fruits'},{n:'Physalis',kcal:53,prot:1.9,fiber:4.9,carbs:11.2,vit:['Vitamine C','Vitamine A'],cat:'fruits'},
    {n:'Poire',kcal:57,prot:0.4,fiber:3.1,carbs:15.2,vit:['Vitamine C'],cat:'fruits'},{n:'Myrtille',kcal:57,prot:0.7,fiber:2.4,carbs:14.5,vit:['Vitamine C','Vitamine K'],cat:'fruits'},{n:'Coing',kcal:57,prot:0.4,fiber:6.4,carbs:15.3,vit:['Vitamine C'],cat:'fruits'},
    {n:'Fruit du dragon (pitaya)',kcal:60,prot:1.2,fiber:1.9,carbs:13.0,vit:['Vitamine C'],cat:'fruits'},{n:'Longane',kcal:60,prot:1.3,fiber:1.1,carbs:15.1,vit:['Vitamine C'],cat:'fruits'},{n:'Kiwi',kcal:61,prot:1.1,fiber:3.0,carbs:14.7,vit:['Vitamine C','Vitamine K'],cat:'fruits'},
    {n:'Cassis',kcal:63,prot:1.4,fiber:7.0,carbs:13.3,vit:['Vitamine C'],cat:'fruits'},{n:'Cerise',kcal:63,prot:1.1,fiber:2.1,carbs:16.0,vit:['Vitamine C','Potassium'],cat:'fruits'},{n:'Mangue',kcal:65,prot:0.5,fiber:1.6,carbs:15.0,vit:['Vitamine A','Vitamine C'],cat:'fruits'},
    {n:'Litchi',kcal:66,prot:0.8,fiber:1.3,carbs:16.5,vit:['Vitamine C'],cat:'fruits'},{n:'Corossol',kcal:66,prot:1,fiber:3.3,carbs:16.8,vit:['Vitamine C'],cat:'fruits'},{n:'Groseille',kcal:68,prot:1.4,fiber:4.3,carbs:15.4,vit:['Vitamine C'],cat:'fruits'},
    {n:'Goyave',kcal:68,prot:2.6,fiber:5.4,carbs:14.3,vit:['Vitamine C'],cat:'fruits'},{n:'Raisin',kcal:69,prot:0.6,fiber:0.9,carbs:18.1,vit:['Vitamine K'],cat:'fruits'},{n:'Kaki (plaquemine)',kcal:70,prot:0.6,fiber:3.6,carbs:18.6,vit:['Vitamine A','Vitamine C'],cat:'fruits'}
  ]},
  {id:'fr-l4', title:'Fruits — 71 à 100 kcal/100g', meta:'', mode:'kcal', tierGroup:'fruits', tierLevel:4, items:[
    {n:'Kumquat',kcal:71,prot:1.9,fiber:6.5,carbs:16.0,vit:['Vitamine C'],cat:'fruits'},{n:'Mangoustan',kcal:73,prot:0.6,fiber:5.1,carbs:17.9,vit:['Vitamine C'],cat:'fruits'},{n:'Figue fraîche',kcal:74,prot:0.8,fiber:2.9,carbs:19.2,vit:['Potassium'],cat:'fruits'},
    {n:'Jujube',kcal:79,prot:1.2,fiber:2.5,carbs:20.2,vit:['Vitamine C'],cat:'fruits'},{n:'Grenade',kcal:83,prot:1.7,fiber:4.0,carbs:18.7,vit:['Vitamine C','Vitamine K'],cat:'fruits'},{n:'Banane',kcal:89,prot:1.1,fiber:2.6,carbs:22.8,vit:['Vitamine B6','Potassium'],cat:'fruits'},
    {n:'Jaque (jackfruit)',kcal:95,prot:1.7,fiber:1.5,carbs:23.2,vit:['Vitamine C','Potassium'],cat:'fruits'},{n:'Fruit de la passion',kcal:97,prot:2.2,fiber:10.4,carbs:23.4,vit:['Vitamine C','Vitamine A'],cat:'fruits'}
  ]},
  {id:'fr-l5', title:'Fruits — 100 kcal et plus', meta:'fruits denses en énergie, à compter en plus grande quantité qu\'un fruit classique', mode:'kcal', tierGroup:'fruits', tierLevel:5, items:[
    {n:'Datte fraîche',kcal:145,prot:2.5,fiber:6.7,carbs:31.3,vit:['Potassium'],cat:'fruits'},{n:'Noix de coco fraîche',kcal:354,prot:3.3,fiber:9.0,carbs:15.2,vit:['Vitamine B6','Potassium'],cat:'fruits'}
  ]},
  {id:'fr-secs', title:'Fruits secs (séchés)', meta:'à remplacer uniquement entre eux, sans sucre ajouté', mode:'kcal', items:[
    {n:'Pruneau',kcal:240,prot:2.2,fiber:7.1,carbs:63.9,vit:['Vitamine A','Potassium'],cat:'fruits'},{n:'Abricot sec',kcal:241,prot:3.4,fiber:7.3,carbs:62.6,vit:['Vitamine A','Potassium'],cat:'fruits'},{n:'Figue sèche',kcal:249,prot:3.3,fiber:9.8,carbs:63.9,vit:['Potassium','Vitamine K'],cat:'fruits'},
    {n:'Datte séchée',kcal:282,prot:2.5,fiber:8.0,carbs:75.0,vit:['Potassium'],cat:'fruits'},{n:'Raisin sec',kcal:299,prot:3.1,fiber:3.7,carbs:79.2,vit:['Potassium'],cat:'fruits'},{n:'Canneberge séchée',kcal:308,prot:0.1,fiber:5.7,carbs:82.4,vit:['Vitamine C'],cat:'fruits'}
  ]},

  // ---------------- FÉCULENTS (+ légumineuses intégrées) ----------------
  {id:'fec-tuber', title:'Féculents — Tubercules', short:'Tubercules', meta:'', mode:'kcal', tierGroup:'feculents-cascade', tierLevel:1, items:[
    {n:'Pomme de terre',kcal:77,prot:2,fiber:2.2,carbs:17,cat:'feculents',subcat:'Tubercules'},{n:'Patate douce',kcal:86,prot:1.6,fiber:3.0,carbs:20,cat:'feculents',subcat:'Tubercules'},
    {n:'Maïs doux (grains)',kcal:86,prot:3.2,fiber:2.7,carbs:19,cat:'feculents',subcat:'Tubercules'},{n:'Taro',kcal:112,prot:1.5,fiber:4.1,carbs:26,cat:'feculents',subcat:'Tubercules'},
    {n:'Igname',kcal:118,prot:1.5,fiber:4.1,carbs:28,cat:'feculents',subcat:'Tubercules'},{n:'Banane plantain',kcal:122,prot:1.3,fiber:2.3,carbs:32,cat:'feculents',subcat:'Tubercules'},
    {n:'Manioc',kcal:160,prot:1.4,fiber:1.8,carbs:38,cat:'feculents',subcat:'Tubercules'},{n:'Châtaignes fraîches',kcal:189,prot:1.8,fiber:8.1,carbs:40,cat:'feculents',subcat:'Tubercules'}
  ]},
  {id:'fec-legumineuses', title:'Légumineuses', short:'Légumineuses', meta:'', mode:'kcal', tierGroup:'feculents-cascade', tierLevel:2, items:[
    {n:'Haricots blancs (conserve, égouttés)',kcal:90,prot:5.5,fiber:6.5,carbs:16.6,vit:['Potassium','Vitamine B9 (folates)'],cat:'legumineuses',subcat:'Légumineuses'},{n:'Lentilles vertes (conserve, égouttées)',kcal:100,prot:7.6,fiber:7.9,carbs:17.0,vit:['Vitamine B9 (folates)','Potassium'],cat:'legumineuses',subcat:'Légumineuses'},
    {n:'Pois cassés (cuits)',kcal:118,prot:8.3,fiber:8.3,carbs:21.1,vit:['Vitamine B9 (folates)'],cat:'legumineuses',subcat:'Légumineuses'},{n:'Haricots rouges (conserve, égouttés)',kcal:127,prot:8.7,fiber:6.4,carbs:22.8,vit:['Potassium','Vitamine B9 (folates)'],cat:'legumineuses',subcat:'Légumineuses'},
    {n:'Pois chiches (conserve, égouttés)',kcal:139,prot:7,fiber:7.6,carbs:23.7,vit:['Vitamine B9 (folates)','Vitamine B6'],cat:'legumineuses',subcat:'Légumineuses'},{n:'Lentilles corail (cru)',kcal:358,prot:25,fiber:10.7,carbs:60.1,vit:['Vitamine B9 (folates)','Potassium'],cat:'legumineuses',subcat:'Légumineuses'}
  ]},
  {id:'fec-cereales', title:'Féculents — Céréales & pâtes', short:'Céréales & pâtes', meta:'', mode:'kcal', tierGroup:'feculents-cascade', tierLevel:2, items:[
    {n:'Boulgour',kcal:342,prot:12.3,fiber:18.3,carbs:76,cat:'feculents',subcat:'Céréales & pâtes'},{n:'Sarrasin',kcal:343,prot:13.3,fiber:10.0,carbs:71,cat:'feculents',subcat:'Céréales & pâtes'},
    {n:'Pâtes complètes',kcal:348,prot:13,fiber:8.6,carbs:68,cat:'feculents',subcat:'Céréales & pâtes'},{n:'Riz basmati',kcal:350,prot:7.9,fiber:1.3,carbs:78,cat:'feculents',subcat:'Céréales & pâtes'},
    {n:'Orge perlé',kcal:352,prot:9.9,fiber:15.6,carbs:77,cat:'feculents',subcat:'Céréales & pâtes'},{n:'Pâtes blanches',kcal:353,prot:12,fiber:3.0,carbs:75,cat:'feculents',subcat:'Céréales & pâtes'},
    {n:'Riz rond',kcal:355,prot:6.7,fiber:1.4,carbs:80,cat:'feculents',subcat:'Céréales & pâtes'},{n:'Riz blanc',kcal:358,prot:6.5,fiber:1.3,carbs:79,cat:'feculents',subcat:'Céréales & pâtes'},
    {n:'Riz complet',kcal:358,prot:7.1,fiber:3.5,carbs:77,cat:'feculents',subcat:'Céréales & pâtes'},{n:'Semoule de blé',kcal:360,prot:12.7,fiber:3.9,carbs:77,cat:'feculents',subcat:'Céréales & pâtes'},
    {n:'Semoule de maïs / polenta',kcal:362,prot:8.1,fiber:7.3,carbs:77,cat:'feculents',subcat:'Céréales & pâtes'},{n:'Quinoa',kcal:368,prot:14.1,fiber:7.0,carbs:64,cat:'feculents',subcat:'Céréales & pâtes'},
    {n:'Couscous',kcal:376,prot:12.8,fiber:5.0,carbs:77,cat:'feculents',subcat:'Céréales & pâtes'},{n:'Millet',kcal:378,prot:11,fiber:8.5,carbs:73,cat:'feculents',subcat:'Céréales & pâtes'},
    {n:'Gnocchis',kcal:157,prot:3.5,fiber:1.8,carbs:31,cat:'feculents',subcat:'Céréales & pâtes',note:'valeur estimée (aliment transformé, absent de ta fiche)'}
  ]},
  {id:'fec-pain', title:'Féculents — Pain', short:'Pain', meta:'', mode:'kcal', tierGroup:'feculents-cascade', tierLevel:3, items:[
    {n:'Pain de seigle',kcal:220,prot:7,fiber:5.8,carbs:43,cat:'feculents',subcat:'Pain'},{n:'Pain complet',kcal:247,prot:9,fiber:7.0,carbs:41,cat:'feculents',subcat:'Pain'},
    {n:'Pain de mie complet',kcal:250,prot:9,fiber:6.5,carbs:43,cat:'feculents',subcat:'Pain'},{n:'Pain aux céréales',kcal:260,prot:9.5,fiber:6.0,carbs:46,cat:'feculents',subcat:'Pain'},
    {n:'Pain blanc',kcal:265,prot:8,fiber:2.7,carbs:51,cat:'feculents',subcat:'Pain'},{n:'Baguette tradition',kcal:270,prot:8.5,fiber:3.0,carbs:55,cat:'feculents',subcat:'Pain'},
    {n:'Pain de mie blanc',kcal:275,prot:8,fiber:2.7,carbs:50,cat:'feculents',subcat:'Pain'},{n:'Pain pita',kcal:275,prot:9,fiber:3.0,carbs:55,cat:'feculents',subcat:'Pain'},
    {n:'Pain grillé (toast)',kcal:280,prot:9,fiber:3.0,carbs:56,cat:'feculents',subcat:'Pain'},{n:'Tortilla de blé',kcal:310,prot:8,fiber:2.0,carbs:50,cat:'feculents',subcat:'Pain'}
  ]},
  {id:'fec-farine-petitdej', title:'Féculents — Farines & petit-déjeuner', short:'Farines & petit-déjeuner', meta:'groupe à part, non relié à la cascade tubercules → céréales → pain', mode:'kcal', includesBlocks:['fec-pain'], items:[
    {n:'Farine de sarrasin',kcal:335,prot:13,fiber:10.0,carbs:70,cat:'feculents',subcat:'Farines'},{n:'Farine de blé',kcal:364,prot:10,fiber:3.4,carbs:76,cat:'feculents',subcat:'Farines'},
    {n:'Fécule de maïs (maïzena)',kcal:381,prot:0.3,fiber:0.5,carbs:91,cat:'feculents',subcat:'Farines'},{n:'Muesli',kcal:360,prot:10,fiber:8.0,carbs:65,cat:'feculents',subcat:'Petit-déjeuner'},
    {n:'Pain d\'épices',kcal:360,prot:5,fiber:1.5,carbs:73,cat:'feculents',subcat:'Petit-déjeuner'},{n:'Céréales type corn flakes',kcal:378,prot:7,fiber:3.0,carbs:84,cat:'feculents',subcat:'Petit-déjeuner'},
    {n:'Flocons d\'avoine',kcal:389,prot:16.9,fiber:10.0,carbs:58,cat:'feculents',subcat:'Petit-déjeuner'},{n:'Biscottes',kcal:400,prot:10,fiber:3.5,carbs:75,cat:'feculents',subcat:'Petit-déjeuner'},
    {n:'Croissant',kcal:406,prot:8,fiber:2.0,carbs:45,cat:'feculents',subcat:'Petit-déjeuner'},{n:'Pain au chocolat',kcal:410,prot:7.5,fiber:2.0,carbs:45,cat:'feculents',subcat:'Petit-déjeuner'}
  ]},
  // ---------------- VIANDES (+ protéines végétales cross-taguées) ----------------
  {id:'via-maigre', title:'Viandes & protéines maigres', meta:'', mode:'kcal', items:[
    {n:'Tofu nature',kcal:76,prot:8,cat:'proteines-vegetales',crossGroup:'prot-maigre'},{n:'Jambon de dinde',kcal:90,prot:19,cat:'viandes',crossGroup:'prot-maigre'},
    {n:'Jambon de poulet',kcal:95,prot:18,cat:'viandes',crossGroup:'prot-maigre'},{n:'Jambon blanc découenné dégraissé',kcal:100,prot:20,cat:'viandes',crossGroup:'prot-maigre'},
    {n:'Dinde, blanc',kcal:104,prot:24,cat:'viandes',crossGroup:'prot-maigre'},{n:'Veau, escalope',kcal:108,prot:21,cat:'viandes',crossGroup:'prot-maigre'},{n:'Poulet, blanc sans peau',kcal:110,prot:23,cat:'viandes',crossGroup:'prot-maigre'},
    {n:'Lapin',kcal:114,prot:21,cat:'viandes',crossGroup:'prot-maigre'},{n:'Cerf (venaison)',kcal:120,prot:22,cat:'viandes',crossGroup:'prot-maigre'},{n:'Edamame',kcal:122,prot:11,cat:'proteines-vegetales',crossGroup:'prot-maigre'},
    {n:'Poulet, cuisse sans peau',kcal:130,prot:18,cat:'viandes',crossGroup:'prot-maigre'},{n:'Bœuf haché 5% MG',kcal:130,prot:21,cat:'viandes',crossGroup:'prot-maigre'}
  ]},
  {id:'via-mi', title:'Viandes & protéines mi-grasses', meta:'', mode:'kcal', items:[
    {n:'Bavette de bœuf',kcal:140,prot:21,cat:'viandes',crossGroup:'prot-migras'},{n:'Canard, magret sans peau',kcal:140,prot:20,cat:'viandes',crossGroup:'prot-migras'},
    {n:'Filet de bœuf',kcal:143,prot:21,cat:'viandes',crossGroup:'prot-migras'},{n:'Porc, filet mignon',kcal:143,prot:21,cat:'viandes',crossGroup:'prot-migras'},{n:'Tofu fumé',kcal:150,prot:15,cat:'proteines-vegetales',crossGroup:'prot-migras'},
    {n:'Seitan',kcal:150,prot:25,cat:'proteines-vegetales',crossGroup:'prot-migras'},{n:'Agneau, gigot',kcal:158,prot:20,cat:'viandes',crossGroup:'prot-migras'},{n:'Houmous',kcal:166,prot:8,cat:'proteines-vegetales',crossGroup:'prot-migras'},
    {n:'Porc, côte',kcal:180,prot:19,cat:'viandes',crossGroup:'prot-migras'},{n:'Tempeh',kcal:190,prot:19,cat:'proteines-vegetales',crossGroup:'prot-migras'}
  ]},
  {id:'via-grasse', title:'Viandes grasses', meta:'', mode:'kcal', items:[
    {n:'Entrecôte',kcal:200,prot:19,cat:'viandes',crossGroup:'prot-grasse'},{n:'Steak de soja / haché végétal',kcal:220,prot:18,cat:'proteines-vegetales',crossGroup:'prot-grasse'},
    {n:'Bœuf haché 15% MG',kcal:220,prot:18,cat:'viandes',crossGroup:'prot-grasse'},
    {n:'Jambon cru (type Bayonne)',kcal:250,prot:25,cat:'viandes',crossGroup:'prot-grasse'},{n:'Chipolata',kcal:260,prot:12,cat:'viandes',crossGroup:'prot-grasse'}
  ]},
  {id:'via-charcuterie', title:'Charcuterie & protéines végétales denses', meta:'', mode:'kcal', items:[
    {n:'Lardons',kcal:280,prot:14,cat:'viandes'},{n:'Saucisse de Toulouse',kcal:280,prot:13,cat:'viandes'},{n:'Merguez',kcal:280,prot:14,cat:'viandes'},
    {n:'Boudin noir',kcal:300,prot:13,cat:'viandes'},{n:'Pâté de campagne',kcal:330,prot:13,cat:'viandes'},
    {n:'Protéines de soja texturées',kcal:330,prot:50,cat:'proteines-vegetales',note:'poids sec, à réhydrater avant cuisson'},
    {n:'Falafel',kcal:330,prot:13,cat:'proteines-vegetales'},{n:'Bacon',kcal:350,prot:13,cat:'viandes'},{n:'Rillettes',kcal:380,prot:14,cat:'viandes'},
    {n:'Chorizo',kcal:400,prot:24,cat:'viandes'},{n:'Salami',kcal:400,prot:22,cat:'viandes'},{n:'Foie gras',kcal:460,prot:8,cat:'viandes'}
  ]},

  // ---------------- ŒUFS ----------------
  {id:'oeufs-1', title:'Œufs', meta:'attention : à calories égales, blanc et jaune d\'œuf restent très différents en protéines/lipides — un bon repère calorique, pas un vrai remplacement nutritionnel', mode:'kcal', items:[
    {n:'Blanc d\'œuf',kcal:52,prot:11,cat:'oeufs',crossGroup:'prot-maigre'},{n:'Œuf entier',kcal:155,prot:13,cat:'oeufs',crossGroup:'prot-migras'},
    {n:'Œuf de caille',kcal:158,prot:13.1,cat:'oeufs',crossGroup:'prot-migras'},{n:'Jaune d\'œuf',kcal:322,prot:16,cat:'oeufs',crossGroup:'prot-grasse'}
  ]},

  // ---------------- POISSONS ----------------
  {id:'poi-maigre', title:'Poissons & fruits de mer — maigres', meta:'', mode:'kcal', items:[
    {n:'Huître',kcal:70,prot:9,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},{n:'Crevette',kcal:71,prot:21,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},{n:'Merlan',kcal:72,prot:17,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},
    {n:'Cabillaud (morue)',kcal:82,prot:18,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},{n:'Sole',kcal:82,prot:17,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},{n:'Lieu noir',kcal:82,prot:18,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},
    {n:'Poulpe',kcal:82,prot:15,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},{n:'Colin (merlu)',kcal:85,prot:17,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},{n:'Moule (chair)',kcal:86,prot:12,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},
    {n:'Coquille Saint-Jacques',kcal:88,prot:17,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},{n:'Calamar / encornet',kcal:92,prot:15,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},{n:'Surimi',kcal:95,prot:8,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},
    {n:'Dorade',kcal:96,prot:20,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},{n:'Bar (loup de mer)',kcal:97,prot:18,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'},{n:'Raie',kcal:98,prot:18,cat:'poissons',subcat:'Poissons maigres',crossGroup:'prot-maigre'}
  ]},
  {id:'poi-migras', title:'Poissons — mi-gras', meta:'100 à 150 kcal/100g environ', mode:'kcal', items:[
    {n:'Thon au naturel (boîte, égoutté)',kcal:116,prot:25,cat:'poissons',subcat:'Poissons mi-gras',crossGroup:'prot-migras'},{n:'Saumon fumé',kcal:117,prot:22,cat:'poissons',subcat:'Poissons mi-gras',crossGroup:'prot-migras'},
    {n:'Thon frais',kcal:144,prot:24,cat:'poissons',subcat:'Poissons mi-gras',crossGroup:'prot-migras'},{n:'Truite',kcal:148,prot:20,cat:'poissons',subcat:'Poissons mi-gras',crossGroup:'prot-migras'},
    {n:'Sardine au naturel (boîte, égouttée)',kcal:140,prot:20,cat:'poissons',subcat:'Poissons mi-gras',crossGroup:'prot-migras'}
  ]},
  {id:'poi-gras', title:'Poissons — gras', meta:'', mode:'kcal', items:[
    {n:'Hareng',kcal:158,prot:18,cat:'poissons',subcat:'Poissons gras',crossGroup:'prot-grasse'},
    {n:'Sardine fraîche',kcal:165,prot:20,cat:'poissons',subcat:'Poissons gras',crossGroup:'prot-grasse'},{n:'Maquereau',kcal:205,prot:19,cat:'poissons',subcat:'Poissons gras',crossGroup:'prot-grasse'},{n:'Saumon',kcal:208,prot:20,cat:'poissons',subcat:'Poissons gras',crossGroup:'prot-grasse'},
    {n:'Anchois marinés',kcal:210,prot:20,cat:'poissons',subcat:'Poissons gras',crossGroup:'prot-grasse'}
  ]},

  // ---------------- LAITIERS (lait + yaourts + fromages frais) ----------------
  {id:'lait-yaourt', title:'Laits & yaourts', meta:'', mode:'kcal', items:[
    {n:'Lait d\'amande non sucré',kcal:20,prot:0.5,fat:1.1,cat:'laitiers',subcat:'Lait'},{n:'Lait écrémé',kcal:35,prot:3.4,fat:0.1,cat:'laitiers',subcat:'Lait'},
    {n:'Lait de soja non sucré',kcal:40,prot:3.3,fat:1.8,cat:'laitiers',subcat:'Lait'},
    {n:'Lait demi-écrémé',kcal:46,prot:3.3,fat:1.6,cat:'laitiers',subcat:'Lait'},{n:'Yaourt nature 0%',kcal:45,prot:4.5,fat:0.1,cat:'laitiers',subcat:'Yaourt',crossGroup:'frais-yaourt'},
    {n:'Fromage blanc 0%',kcal:45,prot:8,fat:0.2,cat:'laitiers',subcat:'Yaourt',crossGroup:'frais-yaourt'},{n:'Lait d\'avoine',kcal:47,prot:1,fat:1.5,cat:'laitiers',subcat:'Lait'},
    {n:'Yaourt à la grecque 0%',kcal:57,prot:9,fat:0.4,cat:'laitiers',subcat:'Yaourt',crossGroup:'frais-yaourt'},{n:'Skyr',kcal:60,prot:9.5,fat:0.2,cat:'laitiers',subcat:'Yaourt',crossGroup:'frais-yaourt'},{n:'Lait de chèvre',kcal:60,prot:3.4,fat:3.6,cat:'laitiers',subcat:'Lait'},
    {n:'Lait entier',kcal:64,prot:3.2,fat:3.6,cat:'laitiers',subcat:'Lait'},{n:'Yaourt nature (lait entier)',kcal:66,prot:3.5,fat:3.0,cat:'laitiers',subcat:'Yaourt',crossGroup:'frais-yaourt'},{n:'Fromage blanc 3% MG',kcal:63,prot:7.5,fat:3.0,cat:'laitiers',subcat:'Yaourt',crossGroup:'frais-yaourt'},
    {n:'Fromage blanc 20% MG',kcal:90,prot:7.5,fat:4.0,cat:'laitiers',subcat:'Yaourt',crossGroup:'frais-yaourt'},{n:'Yaourt grec nature',kcal:97,prot:4.5,fat:5.0,cat:'laitiers',subcat:'Yaourt',crossGroup:'frais-yaourt'},
    {n:'Petit-suisse nature',kcal:100,prot:8.5,fat:6.0,cat:'laitiers',subcat:'Yaourt',crossGroup:'frais-yaourt'},
    {n:'Lait concentré non sucré',kcal:135,prot:7.5,fat:7.5,cat:'laitiers',subcat:'Lait'}
  ]},

  // ---------------- FROMAGES ----------------
  {id:'from-frais', title:'Fromages — frais / légers', short:'Fromages frais / légers', meta:'', mode:'kcal', tierGroup:'fromages-cascade', tierLevel:1, items:[
    {n:'Cottage cheese',kcal:98,prot:11,fat:4.0,cat:'fromages',crossGroup:'frais-yaourt'},{n:'Cancoillotte',kcal:130,prot:11,fat:5.0,cat:'fromages',crossGroup:'frais-yaourt'},
    {n:'Fromage à tartiner allégé',kcal:150,prot:12,fat:8.0,cat:'fromages',crossGroup:'frais-yaourt'},{n:'Ricotta',kcal:174,prot:8,fat:13.0,cat:'fromages',crossGroup:'frais-yaourt'},{n:'Chèvre frais',kcal:200,prot:13,fat:15.0,cat:'fromages',crossGroup:'frais-yaourt'},
    {n:'Fromage frais type Philadelphia',kcal:253,prot:5.5,fat:23.0,cat:'fromages',crossGroup:'frais-yaourt'}
  ]},
  {id:'from-mi', title:'Fromages — mi-affinés', short:'Fromages mi-affinés', meta:'', mode:'kcal', tierGroup:'fromages-cascade', tierLevel:2, items:[
    {n:'Burrata',kcal:250,prot:14,fat:20.0,cat:'fromages'},{n:'Feta',kcal:264,prot:14,fat:21.0,cat:'fromages'},{n:'La Vache qui rit (portion)',kcal:273,prot:11,fat:23.0,cat:'fromages'},
    {n:'Mozzarella',kcal:280,prot:22,fat:20.0,cat:'fromages'},{n:'Camembert',kcal:300,prot:20,fat:24.0,cat:'fromages'},{n:'Pont-l\'Évêque',kcal:300,prot:21,fat:24.0,cat:'fromages'},
    {n:'Reblochon',kcal:310,prot:20,fat:26.0,cat:'fromages'},{n:'Halloumi',kcal:320,prot:21,fat:25.0,cat:'fromages'},{n:'Tomme de Savoie',kcal:321,prot:22,fat:26.0,cat:'fromages'},
    {n:'Edam',kcal:327,prot:25,fat:24.0,cat:'fromages'},{n:'Brie',kcal:330,prot:20,fat:27.0,cat:'fromages'},{n:'Crottin de chèvre affiné',kcal:330,prot:22,fat:27.0,cat:'fromages'}
  ]},
  {id:'from-affine', title:'Fromages — affinés / pâte dure', short:'Fromages affinés / pâte dure', meta:'', mode:'kcal', tierGroup:'fromages-cascade', tierLevel:3, items:[
    {n:'Saint-Nectaire',kcal:343,prot:21,fat:28.0,cat:'fromages'},{n:'Morbier',kcal:350,prot:24,fat:29.0,cat:'fromages'},{n:'Provolone',kcal:351,prot:25,fat:27.0,cat:'fromages'},
    {n:'Bleu d\'Auvergne',kcal:353,prot:21,fat:29.0,cat:'fromages'},{n:'Gorgonzola',kcal:353,prot:19,fat:30.0,cat:'fromages'},{n:'Gouda',kcal:356,prot:25,fat:28.0,cat:'fromages'},
    {n:'Munster',kcal:368,prot:20,fat:30.0,cat:'fromages'},{n:'Roquefort',kcal:369,prot:19,fat:31.0,cat:'fromages'},{n:'Mimolette',kcal:377,prot:24,fat:30.0,cat:'fromages'},
    {n:'Emmental',kcal:380,prot:29,fat:29.0,cat:'fromages'},{n:'Fromage de brebis (type Ossau-Iraty)',kcal:380,prot:25,fat:30.0,cat:'fromages'},{n:'Cantal',kcal:380,prot:24,fat:30.0,cat:'fromages'},
    {n:'Boursin (ail & fines herbes)',kcal:380,prot:6.4,fat:37.0,cat:'fromages'},{n:'Parmesan',kcal:392,prot:38,fat:26.0,cat:'fromages'},{n:'Beaufort',kcal:396,prot:29,fat:31.0,cat:'fromages'},
    {n:'Gruyère',kcal:396,prot:29,fat:31.0,cat:'fromages'},{n:'Cheddar',kcal:404,prot:25,fat:33.0,cat:'fromages'},{n:'Comté',kcal:411,prot:28,fat:32.0,cat:'fromages'},{n:'Mascarpone',kcal:450,prot:4.5,fat:47.0,cat:'fromages'}
  ]},

  // ---------------- LIPIDES ----------------
  {id:'lip-cremes', title:'Lipides — crèmes & beurre', short:'Crèmes & beurre', meta:'', mode:'kcal', includesBlocks:['lip-huiles','lip-oleagineux'], items:[
    {n:'Crème fraîche légère 15%',kcal:155,prot:2.9,cat:'lipides'},{n:'Crème fraîche épaisse 30%',kcal:292,prot:2.2,cat:'lipides'},{n:'Beurre',kcal:717,prot:0.7,cat:'lipides'}
  ]},
  {id:'lip-huiles', title:'Lipides — huiles', short:'Huiles', meta:'valeur mesurée pour l\'huile d\'olive ; les autres huiles ont une densité calorique très proche (≈ 880-900 kcal/100g), valeur reprise par estimation', mode:'kcal', items:[
    {n:'Huile d\'olive',kcal:884,prot:0,cat:'lipides'},{n:'Huile de colza',kcal:884,prot:0,cat:'lipides',note:'estimation, densité proche de l\'huile d\'olive'},
    {n:'Huile de tournesol',kcal:884,prot:0,cat:'lipides',note:'estimation'},{n:'Huile de coco',kcal:862,prot:0,cat:'lipides',note:'estimation'},{n:'Huile de sésame',kcal:884,prot:0,cat:'lipides',note:'estimation'}
  ]},
  {id:'lip-oleagineux', title:'Lipides — oléagineux', short:'Oléagineux', meta:'valeurs pour 100g, à ramener à une portion réaliste (20-30g)', mode:'kcal', items:[
    {n:'Graines de chia',kcal:486,prot:17,fiber:34.4,cat:'lipides'},{n:'Graines de lin',kcal:534,prot:18,fiber:27.3,cat:'lipides'},{n:'Noix de cajou',kcal:553,prot:18,fiber:3.3,cat:'lipides'},
    {n:'Graines de courge',kcal:559,prot:30,fiber:6.5,cat:'lipides'},{n:'Pistaches',kcal:560,prot:20,fiber:10.6,cat:'lipides'},{n:'Amandes',kcal:579,prot:21,fiber:12.5,cat:'lipides'},
    {n:'Graines de tournesol',kcal:584,prot:21,fiber:8.6,cat:'lipides'},{n:'Beurre de cacahuète',kcal:588,prot:25,fiber:6.0,cat:'lipides'},
    {n:'Beurre d\'amande',kcal:614,prot:21,fiber:10.0,cat:'lipides',note:'valeur estimée, absente de ta fiche'},
    {n:'Noisettes',kcal:628,prot:15,fiber:9.7,cat:'lipides'},{n:'Noix (cerneaux)',kcal:654,prot:15,fiber:6.7,cat:'lipides'}
  ]},

  // ---------------- PRODUITS SUCRÉS ----------------
  {id:'sucre-1', title:'Produits sucrés — basiques', short:'Basiques', meta:'⚠️ groupe plus approximatif que les autres : miel, sirops, sucre et chocolat n\'ont pas le même profil nutritionnel, seule la valeur calorique est alignée.', mode:'kcal', items:[
    {n:'Sirop d\'érable',kcal:269,prot:0,fiber:0,satFat:0,sugar:67,ingCount:1,firstSugar:false,cat:'sucre',subcat:'Basiques (sirops, miel, sucre, chocolat, confiture)',crossGroup:'sucre-basiques-biscuits'},{n:'Confiture',kcal:250,prot:0.3,fiber:1.0,satFat:0,sugar:55,ingCount:4,firstSugar:false,cat:'sucre',subcat:'Basiques (sirops, miel, sucre, chocolat, confiture)',crossGroup:'sucre-basiques-biscuits'},
    {n:'Sirop d\'agave',kcal:310,prot:0,fiber:0,satFat:0,sugar:68,ingCount:1,firstSugar:false,cat:'sucre',subcat:'Basiques (sirops, miel, sucre, chocolat, confiture)',crossGroup:'sucre-basiques-biscuits'},{n:'Miel',kcal:315,prot:0.3,fiber:0.2,satFat:0,sugar:76,ingCount:1,firstSugar:false,cat:'sucre',subcat:'Basiques (sirops, miel, sucre, chocolat, confiture)',crossGroup:'sucre-basiques-biscuits'},
    {n:'Sucre de coco',kcal:386,prot:0,fiber:0,satFat:0,sugar:90,ingCount:1,firstSugar:true,cat:'sucre',subcat:'Basiques (sirops, miel, sucre, chocolat, confiture)',crossGroup:'sucre-basiques-biscuits'},{n:'Sucre (blanc)',kcal:400,prot:0,fiber:0,satFat:0,sugar:100,ingCount:1,firstSugar:true,cat:'sucre',subcat:'Basiques (sirops, miel, sucre, chocolat, confiture)',crossGroup:'sucre-basiques-biscuits'},
    {n:'Chocolat au lait',kcal:534,prot:7.6,fiber:2.5,satFat:19,sugar:51,ingCount:7,firstSugar:true,cat:'sucre',subcat:'Basiques (sirops, miel, sucre, chocolat, confiture)',crossGroup:'sucre-basiques-biscuits'},{n:'Chocolat blanc',kcal:539,prot:5.9,fiber:0,satFat:19,sugar:59,ingCount:5,firstSugar:true,cat:'sucre',subcat:'Basiques (sirops, miel, sucre, chocolat, confiture)',crossGroup:'sucre-basiques-biscuits'},
    {n:'Nutella (pâte à tartiner)',kcal:539,prot:6,fiber:3.4,satFat:10.6,sugar:56.3,ingCount:9,firstSugar:true,cat:'sucre',subcat:'Basiques (sirops, miel, sucre, chocolat, confiture)',crossGroup:'sucre-basiques-biscuits'},{n:'Chocolat noir 70%',kcal:546,prot:7.8,fiber:10.0,satFat:24,sugar:29,ingCount:5,firstSugar:false,cat:'sucre',subcat:'Basiques (sirops, miel, sucre, chocolat, confiture)',crossGroup:'sucre-basiques-biscuits'}
  ]},
  {id:'sucre-2', title:'Produits sucrés — biscuits & petites douceurs', short:'Biscuits & petites douceurs', meta:'portions individuelles facilement comparables à un carré de chocolat ou un biscuit.', mode:'kcal', items:[
    {n:'Spéculoos',kcal:471,prot:5.9,fiber:2.0,satFat:8.0,sugar:29,ingCount:7,firstSugar:false,note:'valeurs moyennes du marché',cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'Cookie (pépites de chocolat)',kcal:480,prot:5.5,fiber:2.5,satFat:13.0,sugar:38,ingCount:8,firstSugar:false,note:'valeurs moyennes du marché',cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'Petit Beurre (LU)',kcal:435,prot:7,fiber:2.0,satFat:4.0,sugar:20,ingCount:7,firstSugar:false,cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'BN (goûter chocolat)',kcal:440,prot:6,fiber:2.0,satFat:6.0,sugar:33,ingCount:9,firstSugar:false,cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'Mars',kcal:445,prot:4,fiber:1.0,satFat:9.0,sugar:59,ingCount:9,firstSugar:true,cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'Granola (LU)',kcal:460,prot:6.5,fiber:2.0,satFat:8.0,sugar:35,ingCount:9,firstSugar:false,cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'Prince (LU)',kcal:470,prot:7,fiber:2.5,satFat:5.0,sugar:30,ingCount:10,firstSugar:false,cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'Oreo',kcal:480,prot:5,fiber:2.0,satFat:7.0,sugar:38,ingCount:10,firstSugar:false,cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'Twix',kcal:480,prot:4.5,fiber:1.5,satFat:17.0,sugar:47,ingCount:9,firstSugar:false,cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'Snickers',kcal:480,prot:9,fiber:2.5,satFat:10.0,sugar:46,ingCount:12,firstSugar:false,cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'M&M\'s chocolat au lait',kcal:480,prot:4,fiber:2.0,satFat:10.0,sugar:65,ingCount:10,firstSugar:true,cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'KitKat',kcal:510,prot:6,fiber:2.0,satFat:17.0,sugar:47,ingCount:10,firstSugar:true,cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'Kinder Bueno',kcal:560,prot:8,fiber:1.5,satFat:11.0,sugar:46,ingCount:9,firstSugar:true,cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'},
    {n:'Ferrero Rocher',kcal:596,prot:7,fiber:3.0,satFat:11.0,sugar:50,ingCount:10,firstSugar:true,cat:'sucre',subcat:'Biscuits & petites douceurs industrielles',crossGroup:'sucre-basiques-biscuits'}
  ]},
  // ---------------- AUTRES ----------------
  {id:'aut-1', title:'Levure chimique ⇄ bicarbonate', meta:'le bicarbonate agit seulement au contact d\'un élément acide (citron, vinaigre, yaourt, fromage blanc, cacao) — valeurs de ton guide d\'origine', mode:'ratio', items:[
    {n:'Levure chimique (1 sachet ≈ 11g)',q:1,u:'sachet(s)',cat:'autres'},{n:'Bicarbonate de soude',q:0.5,u:'c. à café',cat:'autres'}
  ]},

  // ---------------- APÉRO SALÉ ----------------
  {id:'apero-1', title:'Apéro salé', meta:'extras, pas des aliments de plan alimentaire — à consommer avec conscience de l\'apport calorique', mode:'kcal', items:[
    {n:'Apéricube (fromage apéritif)',kcal:290,prot:12,fat:24,cat:'apero'},{n:'Pois chiches grillés (four, paprika)',kcal:350,prot:19,fat:14,note:'valeur moyenne',cat:'apero'},
    {n:'Pop-corn nature',kcal:375,prot:11,fat:4,note:'valeur moyenne',cat:'apero'},{n:'Bretzels salés',kcal:380,prot:10,fat:9,cat:'apero'},
    {n:'Saucisson sec',kcal:400,prot:24,fat:32,cat:'apero'},{n:'Gressins',kcal:410,prot:11,fat:11,cat:'apero'},
    {n:'Belin crackers',kcal:480,prot:9,fat:20,cat:'apero'},{n:'Doritos nacho cheese',kcal:490,prot:7,fat:26,cat:'apero'},
    {n:'Tuc (crackers salés)',kcal:495,prot:8,fat:22,cat:'apero'},{n:'Chipster (Bret\'s)',kcal:500,prot:6.5,fat:24,cat:'apero'},
    {n:'Monster Munch',kcal:505,prot:6,fat:27,cat:'apero'},{n:'Pringles nature',kcal:528,prot:5.5,fat:34,cat:'apero'},
    {n:'Bret\'s nature',kcal:530,prot:6,fat:34,cat:'apero'},{n:'Vico nature',kcal:535,prot:6,fat:35,cat:'apero'},
    {n:'Chips nature (générique)',kcal:536,prot:6,fat:35,cat:'apero'},{n:'Lay\'s nature',kcal:536,prot:6,fat:35,cat:'apero'},
    {n:'Curly (cacahuète soufflée)',kcal:545,prot:6,fat:35,cat:'apero'},{n:'Cacahuètes apéritives salées',kcal:605,prot:25,fat:49,cat:'apero'}
  ]}
];


export const CATEGORIES: CategorieEq[] = [
  {id:'legumes', label:'Légumes', icon:'🥦'},
  {id:'legumineuses', label:'Légumineuses', icon:'🫘'},
  {id:'fruits', label:'Fruits', icon:'🍓'},
  {id:'feculents', label:'Féculents', icon:'🍚'},
  {id:'viandes', label:'Viandes', icon:'🍗'},
  {id:'proteines-vegetales', label:'Protéines végétales', icon:'🌱'},
  {id:'poissons', label:'Poissons', icon:'🐟'},
  {id:'oeufs', label:'Œufs', icon:'🥚'},
  {id:'laitiers', label:'Laits & yaourts', icon:'🥛'},
  {id:'fromages', label:'Fromages', icon:'🧀'},
  {id:'lipides', label:'Lipides', icon:'🫒'},
  {id:'sucre', label:'Produits sucrés', icon:'🍯'},
  {id:'apero', label:'Apéro salé', icon:'🧂'},
  {id:'autres', label:'Autres', icon:'🍵'}
];
