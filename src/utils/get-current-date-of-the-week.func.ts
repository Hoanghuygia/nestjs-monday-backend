// export function getCurrentDateOfWeek() {
//     const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

//     const currentDate = new Date();
//     const dayOfWeek = currentDate.getDay();

//     return daysOfWeek[dayOfWeek];
// }

export function getCurrentDateOfWeek(): string {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'Asia/Ho_Chi_Minh'
  });

  return formatter.format(now);
}