import { Banknote, Briefcase, Car, Clapperboard, Coffee, Dumbbell, Fuel, GraduationCap, Gift, HeartPulse, Home, Landmark, Percent, PiggyBank, Plane, Receipt, Repeat, Shapes, ShieldCheck, ShoppingBag, ShoppingBasket, Tag, Undo2, Utensils, Wifi, type LucideIcon } from 'lucide-react'

// Keyword → icon. First match wins; categories are user-defined, so unknown names fall back to a tag.
const RULES: [RegExp, LucideIcon][] = [
  [/food|dining|restaurant|eat|meal/i, Utensils],
  [/grocer|vegetable|milk/i, ShoppingBasket],
  [/shop|cloth|apparel/i, ShoppingBag],
  [/travel|trip|flight|holiday/i, Plane],
  [/fuel|petrol|diesel/i, Fuel],
  [/transport|cab|auto|metro|car|vehicle/i, Car],
  [/entertain|movie|game|ott|fun/i, Clapperboard],
  [/bill|utilit|electric|water|gas/i, Receipt],
  [/internet|wifi|mobile|phone|recharge/i, Wifi],
  [/health|medic|doctor|pharma/i, HeartPulse],
  [/insur/i, ShieldCheck],
  [/emi|loan|rent paid|mortgage/i, Landmark],
  [/educat|school|tuition|course/i, GraduationCap],
  [/subscri/i, Repeat],
  [/gym|fitness|sport/i, Dumbbell],
  [/coffee|cafe|snack/i, Coffee],
  [/salary|pay|wage/i, Banknote],
  [/business|freelance|client/i, Briefcase],
  [/interest/i, Percent],
  [/dividend|invest/i, PiggyBank],
  [/rent/i, Home],
  [/gift/i, Gift],
  [/refund|cashback|reversal/i, Undo2],
  [/other|misc/i, Shapes],
]

export function categoryIcon(name: string): LucideIcon {
  return RULES.find(([re]) => re.test(name))?.[1] ?? Tag
}
