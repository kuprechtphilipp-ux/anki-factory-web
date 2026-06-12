export interface TourStep {
  target: string
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export const CRAMO_TOUR_STEPS: TourStep[] = [
  {
    target: 'nav-kurse',
    title: 'Deine Kurse',
    content: 'Hier findest du alle deine Kurse und Themen. Lade Folien hoch, ich mach dir daraus Karteikarten.',
    placement: 'right',
  },
  {
    target: 'nav-tutor',
    title: 'Ich bin hier drüben',
    content: 'Im AI-Tutor-Tab kannst du mir ernsthafte Fragen zum Stoff stellen — oder einfach mit mir quatschen, wenn du Motivation brauchst.',
    placement: 'right',
  },
  {
    target: 'nav-credits',
    title: 'Deine AI Credits',
    content: 'Hier siehst du jederzeit, wie viele Credits du noch hast und wofür du sie verbraucht hast.',
    placement: 'right',
  },
  {
    target: 'nav-statistik',
    title: 'Dein Lernfortschritt',
    content: 'Streaks, fällige Karten, Quiz-Ergebnisse — hier siehst du auf einen Blick, wie\'s läuft.',
    placement: 'right',
  },
  {
    target: 'nav-account',
    title: 'Dein Account',
    content: 'Hier verwaltest du dein Profil, dein Passwort und kannst deinen Account löschen, falls es mal so weit kommen sollte.',
    placement: 'right',
  },
  {
    target: 'cramo-widget',
    title: 'Ich bin immer erreichbar',
    content: 'Egal wo du gerade bist — über dieses Icon kannst du mich jederzeit kurz etwas fragen, auch während du lernst.',
    placement: 'left',
  },
  {
    target: 'plan-banner',
    title: 'Dein Plan',
    content: 'Hier oben siehst du immer deinen aktuellen Plan und deine Credits. Klick drauf, um zu upgraden oder einen Einladungscode einzulösen.',
    placement: 'bottom',
  },
  {
    target: 'phone-widget',
    title: 'Cramo am Handy',
    content: 'Scann hier den QR-Code, um Cramo auf dem Handy zu öffnen und unterwegs weiterzulernen. Kurse anlegen und Karten generieren machst du am besten hier am Laptop oder Tablet.',
    placement: 'bottom',
  },
  {
    target: 'laptop-widget',
    title: 'Cramo am Laptop',
    content: 'Hier findest du den Link zu Cramo für deinen Laptop oder Tablet. Lege dort deine Kurse an und generiere deine Karten — danach kannst du hier am Handy weiterlernen.',
    placement: 'bottom',
  },
  {
    target: 'lightbulb-button',
    title: 'Bis bald',
    content: 'Falls du diese Tour oder deine Angaben nochmal ändern willst: einfach hier klicken. Viel Erfolg!',
    placement: 'bottom',
  },
]
