/** Mijoz boti uchun kichik formatlash yordamchilari. */

/** Telefon holati kodini mijozga tushunarli matnga o'giradi. */
export function conditionLabelTg(condition: string): string {
  switch (condition) {
    case "NEW":
      return "Yangi";
    case "USED":
      return "Ishlatilgan";
    case "REFURBISHED":
      return "Qayta tiklangan";
    default:
      return condition;
  }
}
