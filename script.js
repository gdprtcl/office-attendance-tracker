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
    renderCalendar();
    calculateMetrics();
    setupEventListeners();
    registerServiceWorker();
    renderBadges();
    checkForNewAchievements();
    generateAISuggestions();
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

// Get date string in YYYY-MM-DD format
function getDateString(date) {
    return date.toISOString().split('T')[0];
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
        dates.push(new Date(currentDate));
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
    // Get current type
    const currentType = attendanceData[dateString] || DAY_TYPES.UNMARKED;
    
    // Cycle to next type
    const newType = cycleType(currentType);
    
    // Update data
    if (newType === DAY_TYPES.UNMARKED) {
        delete attendanceData[dateString];
    } else {
        attendanceData[dateString] = newType;
    }
    
    // Save and update UI
    saveData();
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
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
        
        // Add "Today" indicator or "Future" indicator
        if (date.getTime() === today.getTime()) {
            const todayLabel = document.createElement('div');
            todayLabel.className = 'today-label';
            todayLabel.textContent = 'Today';
            dayElement.appendChild(todayLabel);
        } else if (date > today) {
            dayElement.classList.add('future');
        }
        
        // Update based on stored data
        updateDayElement(dayElement, dateString);
        
        // Add click handler for all dates
        dayElement.addEventListener('click', () => handleDayClick(dateString, dayElement));
        
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
            generateAISuggestions();
        }
    });
    
    document.getElementById('notificationBtn').addEventListener('click', requestNotificationPermission);
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
// AI Suggestions Engine
// ==========================================

function generateAISuggestions() {
    const dates = getRecent4Weeks();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let badgeIns = 0;
    let eligibleDays = 0;
    let weekdaysRemaining = 0;
    
    dates.forEach(date => {
        if (date > today) return;
        
        const dateString = getDateString(date);
        const type = attendanceData[dateString] || DAY_TYPES.UNMARKED;
        
        if (type === DAY_TYPES.BADGE_IN) badgeIns++;
        if (!isWeekend(date) && type !== DAY_TYPES.LEAVE && type !== DAY_TYPES.HOLIDAY) {
            eligibleDays++;
        }
    });
    
    // Count remaining weekdays in current week
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
    
    let current = new Date(today);
    while (current <= endOfWeek) {
        if (!isWeekend(current)) weekdaysRemaining++;
        current.setDate(current.getDate() + 1);
    }
    
    const minExpected = Math.round(eligibleDays * 0.6);
    const avgDays = minExpected > 0 ? (badgeIns / minExpected) * 3 : 0;
    const daysNeeded = Math.max(0, Math.ceil(minExpected - badgeIns));
    
    const suggestions = [];
    
    // AI Suggestion Logic
    if (avgDays >= 3.0) {
        suggestions.push('🎉 Great job! You\'re meeting your attendance goal!');
        if (badgeIns > minExpected) {
            suggestions.push(`You have ${badgeIns - minExpected} extra office day${badgeIns - minExpected > 1 ? 's' : ''} banked.`);
        }
    } else if (daysNeeded > 0) {
        suggestions.push(`You need ${daysNeeded} more office day${daysNeeded > 1 ? 's' : ''} to reach your 3.0 goal.`);
        
        if (weekdaysRemaining > 0) {
            suggestions.push(`Consider coming in ${Math.min(daysNeeded, weekdaysRemaining)} day${Math.min(daysNeeded, weekdaysRemaining) > 1 ? 's' : ''} this week.`);
        }
        
        // Pattern analysis
        const dayOfWeek = today.getDay();
        if (dayOfWeek === 1) { // Monday
            suggestions.push('Start the week strong! Mark your office days for this week.');
        } else if (dayOfWeek === 5) { // Friday
            suggestions.push('Plan your office days for next week to stay on track.');
        }
    }
    
    // Trend analysis
    if (badgeIns > 0 && eligibleDays > 0) {
        const rate = badgeIns / eligibleDays;
        if (rate < 0.5) {
            suggestions.push('Try to make office visits a regular habit - consistency is key!');
        }
    }
    
    // Display suggestions
    const container = document.getElementById('aiSuggestions');
    if (suggestions.length > 0) {
        container.innerHTML = `
            <h3>🤖 AI Insights</h3>
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
    { id: 'streak-7', icon: '🔥', name: 'Week Streak', description: '7 day streak', condition: () => getCurrentStreak() >= 7 },
    { id: 'streak-14', icon: '🔥🔥', name: 'Double Streak', description: '14 day streak', condition: () => getCurrentStreak() >= 14 },
    { id: 'milestone-20', icon: '🏆', name: '20 Days', description: 'Badge in 20 times', condition: () => getTotalBadgeIns() >= 20 },
    { id: 'milestone-50', icon: '💎', name: '50 Days', description: 'Badge in 50 times', condition: () => getTotalBadgeIns() >= 50 },
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
            <div class="badge ${earned ? '' : 'locked'}" title="${badge.description}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
            </div>
        `;
    }).join('');
}

// Override the existing calculateMetrics to trigger new features
const originalCalculateMetrics = calculateMetrics;
calculateMetrics = function() {
    originalCalculateMetrics();
    checkForNewAchievements();
    generateAISuggestions();
    renderBadges();
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
