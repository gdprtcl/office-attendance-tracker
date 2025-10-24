// Storage key for localStorage
const STORAGE_KEY = 'officeAttendanceData';

// Day types
const DAY_TYPES = {
    UNMARKED: 'unmarked',
    BADGE_IN: 'badge-in',
    LEAVE: 'leave',
    HOLIDAY: 'holiday'
};

// State management
let attendanceData = {};

// Initialize the app
function init() {
    loadData();
    loadTheme();
    renderCalendar();
    calculateMetrics();
    setupEventListeners();
    registerServiceWorker();
    renderBadges();
    checkForNewAchievements();
    generateAIInsights();
    generateAIPredictions();
}

// Load data from localStorage
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            attendanceData = JSON.parse(stored);
        } catch (e) {
            attendanceData = {};
        }
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attendanceData));
}

// Get date string in YYYY-MM-DD format (timezone-safe)
function getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Check if date is a weekend
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
}

// Get 8 weeks past + 2 weeks future, starting from the most recent Sunday
function getRolling8Weeks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find the Saturday 2 weeks from now for end date
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14); // Add 2 weeks
    const dayOfWeek = endDate.getDay();
    if (dayOfWeek !== 6) { // If not Saturday, go to next Saturday
        endDate.setDate(endDate.getDate() + (6 - dayOfWeek));
    }
    
    // Go back 8 weeks from today to get start date
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 55); // 8 weeks - 1 day
    
    // Adjust to start on Sunday
    const startDay = startDate.getDay();
    if (startDay !== 0) {
        startDate.setDate(startDate.getDate() - startDay);
    }
    
    const dates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const dateToAdd = new Date(currentDate);
        dateToAdd.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        dates.push(dateToAdd);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
}

// Get the most recent 4-week period for calculations (ending on previous Saturday)
function getRecent4Weeks() {
        const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find the most recent Saturday (not including today if today is Saturday, go to previous Saturday)
    const endDate = new Date(today);
    const dayOfWeek = endDate.getDay();
    
    if (dayOfWeek === 6) {
        // If today is Saturday, go back to previous Saturday
        endDate.setDate(endDate.getDate() - 7);
    } else {
        // Go back to the most recent Saturday
        endDate.setDate(endDate.getDate() - (dayOfWeek + 1));
    }
    
    // Go back 27 more days to get 4 complete weeks (28 days total)
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 27);
    
    const dates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
}

// Get day name abbreviation
function getDayName(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
}

// Cycle through day types
function cycleType(currentType) {
    switch (currentType) {
        case DAY_TYPES.UNMARKED:
            return DAY_TYPES.BADGE_IN;
        case DAY_TYPES.BADGE_IN:
            return DAY_TYPES.LEAVE;
        case DAY_TYPES.LEAVE:
            return DAY_TYPES.HOLIDAY;
        case DAY_TYPES.HOLIDAY:
            return DAY_TYPES.UNMARKED;
        default:
            return DAY_TYPES.BADGE_IN;
    }
}

// Handle day click
function handleDayClick(dateString, dayElement) {
    // Parse date in local timezone by adding time component
    const date = new Date(dateString + 'T12:00:00');
    console.log('Clicked date:', dateString, 'Day of week:', date.getDay(), ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]);
    
    // Don't allow clicking on weekends
    if (isWeekend(date)) {
        console.log('Blocked as weekend');
        return;
    }
    
    // Get current type
    const currentType = attendanceData[dateString] || DAY_TYPES.UNMARKED;
    
    // Cycle to next type
    const newType = cycleType(currentType);
    
    // Update data
    if (newType === DAY_TYPES.UNMARKED) {
        delete attendanceData[dateString];
        console.log('Deleted from storage:', dateString);
    } else {
        attendanceData[dateString] = newType;
        console.log('Saved to storage:', dateString, '=', newType);
    }
    
    // Save and update UI
    saveData();
    console.log('Full attendanceData:', JSON.stringify(attendanceData, null, 2));
    updateDayElement(dayElement, dateString);
    calculateMetrics();
}

// Update a single day element
function updateDayElement(element, dateString) {
    const date = new Date(dateString);
    const type = attendanceData[dateString] || DAY_TYPES.UNMARKED;
    
    // Remove all type classes
    element.classList.remove(DAY_TYPES.BADGE_IN, DAY_TYPES.LEAVE, DAY_TYPES.HOLIDAY);
    
    // Add appropriate class
    if (type !== DAY_TYPES.UNMARKED) {
        element.classList.add(type);
    }
}

// Render the calendar
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    
    const dates = getRolling8Weeks();
    
    // Get today's date in IST timezone
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    const todayYear = istTime.getUTCFullYear();
    const todayMonth = istTime.getUTCMonth();
    const todayDate = istTime.getUTCDate();
    
    console.log('Today in IST:', todayYear, todayMonth + 1, todayDate);
    
    // Add day headers (Sun, Mon, Tue, etc.)
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const headerElement = document.createElement('div');
        headerElement.className = 'calendar-header';
        headerElement.textContent = day;
        calendar.appendChild(headerElement);
    });
    
    let currentMonth = -1;
    let currentYear = -1;
    
    dates.forEach((date, index) => {
        const dateString = getDateString(date);
        
        // Add month/year header when month changes and it's a Sunday
        if (date.getDay() === 0 || index === 0) {
            const month = date.getMonth();
            const year = date.getFullYear();
            
            if (month !== currentMonth || year !== currentYear) {
                currentMonth = month;
                currentYear = year;
                
                const monthYearElement = document.createElement('div');
                monthYearElement.className = 'month-year-header';
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                   'July', 'August', 'September', 'October', 'November', 'December'];
                monthYearElement.textContent = `${monthNames[month]} ${year}`;
                calendar.appendChild(monthYearElement);
            }
        }
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // Check if it's a weekend
        if (isWeekend(date)) {
            dayElement.classList.add('weekend');
        }
        
        // Add day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        
        dayElement.appendChild(dayNumber);
        
        // Add "Today" indicator by comparing date components
        const isToday = date.getFullYear() === todayYear && 
                       date.getMonth() === todayMonth && 
                       date.getDate() === todayDate;
        
        if (isToday) {
            dayElement.classList.add('today');
            console.log('Today border added for:', dateString);
        }
        
        // Mark future dates
        const checkDate = new Date(todayYear, todayMonth, todayDate);
        if (date > checkDate) {
            dayElement.classList.add('future');
        }
        
        // Update based on stored data
        updateDayElement(dayElement, dateString);
        
        // Add click handler for all dates (but handleDayClick will prevent weekend clicks)
        if (!isWeekend(date)) {
            dayElement.addEventListener('click', () => {
                console.log('Calendar render - dateString passed to handler:', dateString, 'Original date object:', date, 'Day of week:', date.getDay());
                handleDayClick(dateString, dayElement);
            });
            dayElement.style.cursor = 'pointer';
        } else {
            dayElement.style.cursor = 'not-allowed';
        }
        
        calendar.appendChild(dayElement);
    });
}

// Calculate all metrics (based on most recent 4 weeks)
function calculateMetrics() {
    const dates = getRecent4Weeks();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Update the calculation period display
    if (dates.length > 0) {
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        const formatDate = (date) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        };
        document.getElementById('calculationPeriod').textContent = 
            `Calculation Period: ${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    
    let badgeIns = 0;
    let eligibleDays = 0;
    
    dates.forEach(date => {
        // Only count up to today
        if (date > today) {
            return;
        }

        const dateString = getDateString(date);
        const type = attendanceData[dateString] || DAY_TYPES.UNMARKED;
        
        // Count badge-ins
        if (type === DAY_TYPES.BADGE_IN) {
            badgeIns++;
        }
        
        // Count eligible days (weekdays that are not leave or holidays)
        if (!isWeekend(date) && type !== DAY_TYPES.LEAVE && type !== DAY_TYPES.HOLIDAY) {
            eligibleDays++;
        }
    });
    
    // Calculate minimum expected days (eligible days * 0.6)
    const minExpected = Math.round(eligibleDays * 0.6);
    
    // Calculate average days on-site per week
    // Formula: (badge-ins / min expected) * 3
    let avgDays = 0;
    if (minExpected > 0) {
        avgDays = (badgeIns / minExpected) * 3;
    }
    
    // Update UI
    document.getElementById('badgeIns').textContent = badgeIns;
    document.getElementById('eligibleDays').textContent = eligibleDays;
    document.getElementById('minExpected').textContent = minExpected;
    document.getElementById('avgDays').textContent = avgDays.toFixed(1);
    
    // Add visual feedback for meeting the 3.0 average
    const avgDaysElement = document.getElementById('avgDays');
    const avgCardElement = avgDaysElement.closest('.metric-card');
    if (avgDays >= 3.0) {
        avgCardElement.style.background = '#00A83D';
        avgCardElement.style.borderColor = '#00A83D';
    } else {
        avgCardElement.style.background = '#0077C5';
        avgCardElement.style.borderColor = '#0077C5';
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
            attendanceData = {};
            saveData();
            renderCalendar();
            calculateMetrics();
            renderBadges();
            generateAIInsights();
            generateAIPredictions();
        }
    });
    
    document.getElementById('notificationBtn').addEventListener('click', requestNotificationPermission);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

// ==========================================
// Dark Mode / Theme Toggle
// ==========================================

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcon(true);
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.querySelector('.theme-icon');
    icon.textContent = isDark ? '☀️' : '🌙';
}

// ==========================================
// PWA - Progressive Web App Support
// ==========================================

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/office-attendance-tracker/service-worker.js')
            .then(() => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
}

// ==========================================
// Notifications & Alerts System
// ==========================================

function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('This browser does not support notifications');
        return;
    }

    Notification.requestPermission().then(permission => {
        const btn = document.getElementById('notificationBtn');
        if (permission === 'granted') {
            btn.textContent = '✅ Alerts Enabled';
            btn.disabled = true;
            localStorage.setItem('notificationsEnabled', 'true');
            scheduleWeeklyReminder();
            showNotification('Alerts Enabled! 🎉', 'You\'ll receive weekly attendance reminders.');
        } else {
            alert('Please enable notifications in your browser settings.');
        }
    });
}

function showNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'icon-192.png',
            badge: 'icon-192.png'
        });
    }
}

function scheduleWeeklyReminder() {
    // Check if it's Monday and send reminder
    const today = new Date();
    if (today.getDay() === 1) { // Monday
        const dates = getRecent4Weeks();
        let badgeIns = 0;
        dates.forEach(date => {
            const dateString = getDateString(date);
            const type = attendanceData[dateString] || DAY_TYPES.UNMARKED;
            if (type === DAY_TYPES.BADGE_IN) badgeIns++;
        });
        
        const avgDays = calculateAverageDays();
        if (avgDays < 3.0) {
            showNotification('⚠️ Attendance Alert', 
                `Your average is ${avgDays.toFixed(1)}/week. Plan more office days this week!`);
        }
    }
}

// ==========================================
// AI Insights Engine (What's happening NOW)
// ==========================================

function generateAIInsights() {
    const dates = getRecent4Weeks();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if the 4-week calculation period has ended (ends on most recent Saturday)
    const calculationPeriodEnd = dates[dates.length - 1];
    const isPeriodComplete = calculationPeriodEnd < today;
    
    let badgeIns = 0;
    let eligibleDays = 0;
    
    dates.forEach(date => {
        if (date > today) return;
        
        const dateString = getDateString(date);
        const type = attendanceData[dateString] || DAY_TYPES.UNMARKED;
        
        if (type === DAY_TYPES.BADGE_IN) badgeIns++;
        if (!isWeekend(date) && type !== DAY_TYPES.LEAVE && type !== DAY_TYPES.HOLIDAY) {
            eligibleDays++;
        }
    });
    
    const minExpected = Math.round(eligibleDays * 0.6);
    const avgDays = minExpected > 0 ? (badgeIns / minExpected) * 3 : 0;
    const daysNeeded = Math.max(0, Math.ceil(minExpected - badgeIns));
    
    const suggestions = [];
    
    // AI Suggestion Logic
    if (avgDays >= 3.0) {
        suggestions.push('🎉 Great job! You\'re meeting your attendance goal!');
        if (badgeIns > minExpected) {
            suggestions.push(`You exceeded expectations with ${badgeIns - minExpected} extra office day${badgeIns - minExpected > 1 ? 's' : ''}!`);
        }
    } else if (daysNeeded > 0) {
        if (isPeriodComplete) {
            // Period has ended - use past tense
            suggestions.push(`You needed ${daysNeeded} more office day${daysNeeded > 1 ? 's' : ''} to reach the 3.0 goal for that period.`);
            suggestions.push('Focus on the current week to improve your next 4-week average!');
        } else {
            // Period is ongoing - use present/future tense
            suggestions.push(`You need ${daysNeeded} more office day${daysNeeded > 1 ? 's' : ''} to reach your 3.0 goal.`);
            
            // Calculate remaining weekdays in the calculation period
            let weekdaysRemaining = 0;
            let current = new Date(today);
            while (current <= calculationPeriodEnd) {
                if (!isWeekend(current)) weekdaysRemaining++;
                current.setDate(current.getDate() + 1);
            }
            
            if (weekdaysRemaining > 0 && daysNeeded <= weekdaysRemaining) {
                suggestions.push(`You have ${weekdaysRemaining} weekday${weekdaysRemaining > 1 ? 's' : ''} left to make it!`);
            } else if (daysNeeded > weekdaysRemaining && weekdaysRemaining > 0) {
                suggestions.push(`Only ${weekdaysRemaining} weekday${weekdaysRemaining > 1 ? 's' : ''} left in this period - do your best!`);
            }
        }
        
        // General day-of-week tips (always relevant)
        const dayOfWeek = today.getDay();
        if (dayOfWeek === 1) { // Monday
            suggestions.push('Start the week strong! Plan your office days for this week.');
        } else if (dayOfWeek === 5) { // Friday
            suggestions.push('Plan ahead for next week to stay on track.');
        }
    }
    
    // Trend analysis
    if (badgeIns > 0 && eligibleDays > 0) {
        const rate = badgeIns / eligibleDays;
        if (rate < 0.5) {
            suggestions.push('Try to make office visits a regular habit - consistency is key!');
        }
    }
    
    // Display insights
    const container = document.getElementById('aiInsights');
    if (suggestions.length > 0) {
        container.innerHTML = `
            <h3>💡 AI Insights</h3>
            <p>Current status and actionable advice for this 4-week period</p>
            <ul>${suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
        `;
        container.classList.add('show');
    } else {
        container.classList.remove('show');
    }
}

function calculateAverageDays() {
    const dates = getRecent4Weeks();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let badgeIns = 0;
    let eligibleDays = 0;
    
    dates.forEach(date => {
        if (date > today) return;
        const dateString = getDateString(date);
        const type = attendanceData[dateString] || DAY_TYPES.UNMARKED;
        if (type === DAY_TYPES.BADGE_IN) badgeIns++;
        if (!isWeekend(date) && type !== DAY_TYPES.LEAVE && type !== DAY_TYPES.HOLIDAY) {
            eligibleDays++;
        }
    });
    
    const minExpected = Math.round(eligibleDays * 0.6);
    return minExpected > 0 ? (badgeIns / minExpected) * 3 : 0;
}

// ==========================================
// Achievement Badges System
// ==========================================

const BADGES = [
    { id: 'first-day', icon: '🎯', name: 'First Day', description: 'Mark your first office day', condition: () => getTotalBadgeIns() >= 1 },
    { id: 'week-warrior', icon: '💪', name: 'Week Warrior', description: '5 office days in a week', condition: () => checkWeekStreak(5) },
    { id: 'consistent', icon: '⭐', name: 'Consistent', description: 'Badge in 3 days/week for 4 weeks', condition: () => calculateAverageDays() >= 3.0 },
    { id: 'overachiever', icon: '🚀', name: 'Overachiever', description: 'Average 4+ days/week', condition: () => calculateAverageDays() >= 4.0 },
    { id: 'milestone-20', icon: '🏆', name: '20 Days', description: 'Badge in 20 times total', condition: () => getTotalBadgeIns() >= 20 },
    { id: 'milestone-50', icon: '💎', name: '50 Days', description: 'Badge in 50 times total', condition: () => getTotalBadgeIns() >= 50 },
    { id: 'early-bird', icon: '🌅', name: 'Early Bird', description: 'Badge in on Monday 4 weeks in a row', condition: () => checkMondayStreak() },
    { id: 'perfect-month', icon: '👑', name: 'Perfect Month', description: 'Meet goal every week for 4 weeks', condition: () => checkPerfectMonth() }
];

function getTotalBadgeIns() {
    let count = 0;
    Object.values(attendanceData).forEach(type => {
        if (type === DAY_TYPES.BADGE_IN) count++;
    });
    return count;
}

function getCurrentStreak() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let current = new Date(today);
    
    while (true) {
        const dateString = getDateString(current);
        if (attendanceData[dateString] === DAY_TYPES.BADGE_IN) {
            streak++;
            current.setDate(current.getDate() - 1);
        } else if (!isWeekend(current)) {
            break;
        } else {
            current.setDate(current.getDate() - 1);
        }
    }
    return streak;
}

function checkWeekStreak(days) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    let count = 0;
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateString = getDateString(date);
        if (attendanceData[dateString] === DAY_TYPES.BADGE_IN) count++;
    }
    return count >= days;
}

function checkMondayStreak() {
    const today = new Date();
    let mondaysChecked = 0;
    
    for (let week = 0; week < 4; week++) {
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1 - (week * 7));
        const dateString = getDateString(monday);
        if (attendanceData[dateString] === DAY_TYPES.BADGE_IN) {
            mondaysChecked++;
        }
    }
    return mondaysChecked >= 4;
}

function checkPerfectMonth() {
    return calculateAverageDays() >= 3.0 && getTotalBadgeIns() >= 12;
}

function checkForNewAchievements() {
    const earnedBadges = JSON.parse(localStorage.getItem('earnedBadges') || '[]');
    const newBadges = [];
    
    BADGES.forEach(badge => {
        if (!earnedBadges.includes(badge.id) && badge.condition()) {
            earnedBadges.push(badge.id);
            newBadges.push(badge);
        }
    });
    
    if (newBadges.length > 0) {
        localStorage.setItem('earnedBadges', JSON.stringify(earnedBadges));
        newBadges.forEach(badge => showAchievementToast(badge));
    }
}

function showAchievementToast(badge) {
    const toast = document.getElementById('achievementToast');
    toast.innerHTML = `
        <h4>${badge.icon} Achievement Unlocked!</h4>
        <p><strong>${badge.name}</strong>: ${badge.description}</p>
    `;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function renderBadges() {
    const container = document.getElementById('badges');
    const earnedBadges = JSON.parse(localStorage.getItem('earnedBadges') || '[]');
    
    container.innerHTML = BADGES.map(badge => {
        const earned = earnedBadges.includes(badge.id);
        return `
            <div class="badge ${earned ? '' : 'locked'}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-description">${badge.description}</div>
            </div>
        `;
    }).join('');
}

// ==========================================
// AI Predictions Engine (What's COMING in the future)
// ==========================================

function generateAIPredictions() {
    const dates = getRecent4Weeks();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get historical data
    let badgeIns = 0;
    let eligibleDays = 0;
    let weekdaysInPeriod = 0;
    
    dates.forEach(date => {
        if (date > today) return;
        
        const dateString = getDateString(date);
        const type = attendanceData[dateString] || DAY_TYPES.UNMARKED;
        
        if (type === DAY_TYPES.BADGE_IN) badgeIns++;
        if (!isWeekend(date)) weekdaysInPeriod++;
        if (!isWeekend(date) && type !== DAY_TYPES.LEAVE && type !== DAY_TYPES.HOLIDAY) {
            eligibleDays++;
        }
    });
    
    if (badgeIns === 0 || weekdaysInPeriod === 0) {
        document.getElementById('aiPredictions').classList.remove('show');
        return;
    }
    
    // Calculate current rate
    const currentRate = badgeIns / weekdaysInPeriod;
    const minExpected = Math.round(eligibleDays * 0.6);
    const currentAvg = minExpected > 0 ? (badgeIns / minExpected) * 3 : 0;
    
    const predictions = [];
    
    // Prediction 1: Next month forecast
    const nextMonthWeekdays = 20; // Approximate
    const predictedNextMonth = Math.round(currentRate * nextMonthWeekdays);
    predictions.push(`If you maintain this pace, you'll badge in ~${predictedNextMonth} days next month.`);
    
    // Prediction 2: Trend analysis
    if (currentAvg >= 3.5) {
        predictions.push('Your trajectory is strong - you\'ll likely exceed 3.0 consistently! 📈');
    } else if (currentAvg >= 3.0) {
        predictions.push('At this rate, you\'ll stay on track to meet the 3.0 goal.');
    } else if (currentAvg >= 2.5) {
        const daysNeeded = Math.ceil((3.0 / currentAvg) * badgeIns) - badgeIns;
        predictions.push(`Increase by ${daysNeeded} more days per period to reach 3.0.`);
    } else {
        predictions.push('Significantly increase office visits to meet future 3.0 goals.');
    }
    
    // Prediction 3: Pattern analysis (only show if we have enough data and a clear pattern)
    const dayCount = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}; // Mon-Fri only
    let totalBadgeIns = 0;
    Object.keys(attendanceData).forEach(dateString => {
        if (attendanceData[dateString] === DAY_TYPES.BADGE_IN) {
            const date = new Date(dateString + 'T12:00:00');
            const day = date.getDay();
            if (day >= 1 && day <= 5) { // Weekdays only
                dayCount[day]++;
                totalBadgeIns++;
            }
        }
    });
    
    if (totalBadgeIns >= 5) { // Only show if we have enough data
        const dayNames = {1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday'};
        const sortedDays = Object.keys(dayCount).sort((a, b) => dayCount[b] - dayCount[a]);
        const topDay = sortedDays[0];
        const topDayCount = dayCount[topDay];
        const topDayPercent = Math.round((topDayCount / totalBadgeIns) * 100);
        
        // Only show if there's a clear pattern (>30% of days are on one specific day)
        if (topDayPercent > 30) {
            predictions.push(`${topDayPercent}% of your office days are ${dayNames[topDay]}s - maintain this consistency!`);
        }
    }
    
    // Display predictions
    const container = document.getElementById('aiPredictions');
    if (predictions.length > 0) {
        container.innerHTML = `
            <h3>🔮 AI Predictions</h3>
            <p>Future forecasts based on your current behavior patterns</p>
            <ul>${predictions.map(p => `<li>${p}</li>`).join('')}</ul>
        `;
        container.classList.add('show');
    } else {
        container.classList.remove('show');
    }
}

// Override the existing calculateMetrics to trigger new features
const originalCalculateMetrics = calculateMetrics;
calculateMetrics = function() {
    originalCalculateMetrics();
    checkForNewAchievements();
    generateAIInsights();
    generateAIPredictions();
    renderBadges();
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
