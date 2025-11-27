export interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  type: 'multiple_choice' | 'true_false';
  order_index: number;
}

// Health Education Quiz Questions - Based on Chapter 36: Self-care and Medications
export const quizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    question_text: 'Mitä itsehoito tarkoittaa?',
    options: [
      'Lääkärin määräämää hoitoa',
      'Itsestä huolehtimista ja oman terveyden edistämistä',
      'Apteekista ostettavia lääkkeitä',
      'Sairaalassa annettavaa hoitoa'
    ],
    correct_answer: 1,
    type: 'multiple_choice',
    order_index: 0
  },
  {
    id: 'q2',
    question_text: 'Kuinka kauan flunssan oireet yleensä kestävät?',
    options: [
      '2-3 päivää',
      '1-2 viikkoa',
      'Kuukausi',
      'Vain yhden päivän'
    ],
    correct_answer: 1,
    type: 'multiple_choice',
    order_index: 1
  },
  {
    id: 'q3',
    question_text: 'Mikä on paras hoito flunssaan?',
    options: [
      'Antibiootit',
      'Lepo, riittävä juominen ja raskaan liikunnan välttäminen',
      'Kylmä suihku',
      'Kahvinjuonti'
    ],
    correct_answer: 1,
    type: 'multiple_choice',
    order_index: 2
  },
  {
    id: 'q4',
    question_text: 'Missä lääkkeitä saa myydä?',
    options: [
      'Ruokakaupassa',
      'Kioskeissa',
      'Vain apteekeissa',
      'Internetissä'
    ],
    correct_answer: 2,
    type: 'multiple_choice',
    order_index: 3
  },
  {
    id: 'q5',
    question_text: 'Mikä on nuorten yleisin päänsäryn syy?',
    options: [
      'Niskojen ja hartialihasten jännitystila',
      'Silmäsairaus',
      'Korvatulehdus',
      'Diabetes'
    ],
    correct_answer: 0,
    type: 'multiple_choice',
    order_index: 4
  },
  {
    id: 'q6',
    question_text: 'Kuinka kauan kuumeen tulisi kestää ennen lääkärin hoitoon hakeutumista?',
    options: [
      'Yhden päivän',
      'Kolme päivää',
      'Viikon',
      'Ei tarvitse hakeutua hoitoon'
    ],
    correct_answer: 1,
    type: 'multiple_choice',
    order_index: 5
  },
  {
    id: 'q7',
    question_text: 'Mitkä ovat itsehoitolääkkeet?',
    options: [
      'Lääkärin määräämiä lääkkeitä',
      'Lievien oireiden tilapäiseen hoitoon tarkoitettuja lääkkeitä',
      'Vain reseptillä saatavia lääkkeitä',
      'Kasveista valmistettuja tuotteita'
    ],
    correct_answer: 1,
    type: 'multiple_choice',
    order_index: 6
  },
  {
    id: 'q8',
    question_text: 'Mikä on medikalisaatio?',
    options: [
      'Lääkkeiden kehittämistä',
      'Normaalin elämän lääketieteellistämistä',
      'Sairauksien parantamista',
      'Lääkärin vastaanotto'
    ],
    correct_answer: 1,
    type: 'multiple_choice',
    order_index: 7
  },
  {
    id: 'q9',
    question_text: 'Luontaistuotteet ovat lääkkeitä, jotka parantavat sairauksia.',
    options: [
      'Totuus',
      'Väärä'
    ],
    correct_answer: 1,
    type: 'true_false',
    order_index: 8
  },
  {
    id: 'q10',
    question_text: 'Lääkkeiden tehtävinä on:',
    options: [
      'Vain oireiden lievittäminen',
      'Täydellinen parantaminen',
      'Parantaa sairauksia, lievittää oireita ja ennaltaehkäistä sairauksien syntymistä',
      'Kaikkien vaivojen hoitaminen'
    ],
    correct_answer: 2,
    type: 'multiple_choice',
    order_index: 9
  }
];

// Room configuration for the hardcoded quiz
export const QUIZ_CONFIG = {
  ROOM_CODE: 'KPL36', // Health chapter 36
  TOTAL_QUESTIONS: quizQuestions.length,
  TIME_LIMIT: 30, // seconds per question
  MAX_POINTS: 1000 // maximum points per question
};

// Calculate points based on speed (time remaining)
export function calculatePoints(timeLeft: number): number {
  if (timeLeft <= 0) return 0;
  
  // Points decrease linearly based on time taken
  // Formula: (timeLeft / TIME_LIMIT) * MAX_POINTS
  const percentageLeft = timeLeft / QUIZ_CONFIG.TIME_LIMIT;
  return Math.floor(percentageLeft * QUIZ_CONFIG.MAX_POINTS);
}