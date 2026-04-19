function generateWeekDates(startDate, weeksAhead = 2) {
    const dates = [];
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    let currentDate = new Date(startDate);

    for (let week = 0; week < weeksAhead; week++) {
        for (let i = 0; i < 7; i++) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                const dateString = currentDate.toISOString().split('T')[0];
                dates.push({
                    date: dateString,
                    day: dayNames[dayOfWeek],
                });
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    return dates;
}

console.log(generateWeekDates(new Date()));
