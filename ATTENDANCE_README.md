# Office Attendance Tracker

A simple, beautiful app to track your office attendance and calculate your on-site average based on Intuit's 3-day office policy.

## Features

- **Visual Calendar**: 8 weeks historical view + 2 weeks future planning
- **Real-time Metrics**: Badge-ins, eligible days, minimum expected, and average days per week
- **4-Week Rolling Calculation**: Automatically calculates your attendance based on the previous 4-week period (ending on the most recent Saturday)
- **Easy Tracking**: Click any day to mark as Badge-in, Leave, or Holiday
- **Mobile Friendly**: Works perfectly on phones and tablets
- **Private**: All data is stored locally in your browser

## How to Use

1. **Mark Your Days**: Click on any calendar day to cycle through:
   - **Green (Pastel)**: Badge-in - You went to the office
   - **Yellow (Pastel)**: Leave/PTO - Approved time off
   - **Blue (Pastel)**: Holiday - Company holiday
   - Click again to unmark

2. **View Your Metrics**: The dashboard shows:
   - **Badge-ins**: Total days you badged into the office (last 4 weeks)
   - **Eligible Days**: Weekdays minus leave and holidays
   - **Min Expected**: Days you should be in office (60% of eligible days)
   - **Avg Days/Week**: Your current average (turns green when ≥ 3.0)

3. **Plan Ahead**: Future dates (next 2 weeks) are available for planning with a dashed border

## Formula

Your average days on-site per week is calculated as:
```
Average = (Total Badge-ins / Min Expected) × 3
```

The 4-week calculation period runs from the Sunday 4 weeks ago through the most recent Saturday.

## Technologies

- Pure HTML, CSS, and JavaScript
- No dependencies or frameworks
- LocalStorage for data persistence
- Intuit brand colors and design guidelines

## Local Development

Simply open `index.html` in your browser. All data is stored locally.

## Credits

Built with ❤️ for Intuit team members to easily track their office attendance.

