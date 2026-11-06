// Boolean favorites from earlier releases remain five-star ratings.
export function ratingValue(value){return value===true?5:Number.isInteger(value)&&value>=0&&value<=5?value:0;}
