export function getCurrentDateOfWeek() {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay();

    return daysOfWeek[dayOfWeek];
}