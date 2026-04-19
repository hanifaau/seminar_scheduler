function findFreeWindows(
    busySlots,
    workStart,
    workEnd
) {
    const sorted = [...busySlots].sort((a, b) => a.startTime - b.startTime);

    const merged = [];
    for (const slot of sorted) {
        if (merged.length === 0) {
            merged.push({ ...slot });
        } else {
            const last = merged[merged.length - 1];
            if (slot.startTime <= last.endTime) {
                last.endTime = Math.max(last.endTime, slot.endTime);
            } else {
                merged.push({ ...slot });
            }
        }
    }

    const freeWindows = [];
    let currentTime = workStart;

    for (const busy of merged) {
        if (busy.startTime > currentTime) {
            freeWindows.push({
                start: currentTime,
                end: Math.min(busy.startTime, workEnd),
            });
        }
        currentTime = Math.max(currentTime, busy.endTime);
    }

    if (currentTime < workEnd) {
        freeWindows.push({
            start: currentTime,
            end: workEnd,
        });
    }

    return freeWindows;
}

function intersectFreeWindows(windowsArrays) {
    if (windowsArrays.length === 0) return [];

    let result = windowsArrays[0];

    for (let i = 1; i < windowsArrays.length; i++) {
        const newResult = [];

        for (const r of result) {
            for (const w of windowsArrays[i]) {
                const start = Math.max(r.start, w.start);
                const end = Math.min(r.end, w.end);

                if (start < end) {
                    newResult.push({ start, end });
                }
            }
        }

        result = newResult;
    }

    return result.sort((a, b) => a.start - b.start);
}

const w1 = findFreeWindows([], 480, 1020);
const res = intersectFreeWindows([w1, w1, w1, w1]);
console.log(res);
