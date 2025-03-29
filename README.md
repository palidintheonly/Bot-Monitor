# MonkeyBytes Bot Monitor

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/palidintheonly/monkeybytes-bot-monitor)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg)](https://discord.js.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Uptime](https://img.shields.io/badge/uptime-100%25-brightgreen.svg)]()

A powerful Discord bot for monitoring other bots in your server, tracking uptime, status changes, and providing comprehensive statistics.

![MonkeyBytes Bot Monitor Banner](https://via.placeholder.com/800x200?text=MonkeyBytes+Bot+Monitor)

## Features

- **Real-time Bot Monitoring**: Track online/offline status of Discord bots
- **Detailed Statistics**: View uptime percentages, session durations, and status history
- **Priority Monitoring**: Mark important bots for special notifications
- **Bulk Operations**: Add multiple bots to monitoring with one command
- **Customizable Notifications**: Configure which status changes trigger alerts
- **Daily Summaries**: Receive daily activity reports for your bots
- **Role-based Filtering**: Monitor only bots with specific roles
- **Performance Dashboard**: View comprehensive statistics about your bot network

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Configure bot monitoring settings |
| `/monitor` | Start monitoring a bot |
| `/monitor-all` | Monitor all bots in the server |
| `/del-monitor` | Stop monitoring a bot |
| `/monitor-settings` | Update monitor settings for a bot |
| `/list-monitors` | List all monitored bots |
| `/bot-status` | Check current status of a monitored bot |
| `/activity-info` | View detailed activity statistics for a bot |
| `/status-history` | View status change history for a bot |
| `/bots-overview` | View overview of all monitored bots |
| `/pause-monitoring` | Temporarily pause monitoring for a bot |
| `/resume-monitoring` | Resume monitoring for a paused bot |
| `/stats` | View bot monitor statistics |
| `/activity-dashboard` | View detailed dashboard for all monitored bots |
| `/dump` | Dump current bot uptime data |

## Setup

1. Invite the bot to your Discord server with appropriate permissions
2. Run `/setup` to configure your monitoring settings
3. Set a log channel for notifications
4. Start monitoring bots with `/monitor` or `/monitor-all`

## Configuration Options

- **Admin Role**: Role that can manage bot monitoring
- **Log Channel**: Channel for bot status notifications
- **Default Check Interval**: Default interval for checking bot status (seconds)
- **Daily Summary**: Send daily activity summaries
- **Auto Monitor**: Automatically monitor new bots
- **Notify on Status Change**: Send notifications when bot status changes
- **Detailed Notifications**: Include detailed info in notifications
- **Priority Role**: Role for priority bots
- **Exclude Role**: Role for bots to exclude from monitoring
- **Monitor Offline**: Monitor offline status


## Requirements

- Node.js 16.9.0 or newer
- Discord.js v14
- A Discord Bot Token with proper intents enabled:
  - Guilds
  - Guild Members 
  - Guild Presences

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/monkeybytes-bot-monitor.git
cd monkeybytes-bot-monitor
```

2. Install dependencies
```bash
npm install
```

3. Configure the bot
Create a `config.json` file with your bot token:
```json
{
  "token": "NA",
  "clientId": "NA"
}
```

4. Start the bot
```bash
node bot.js
```

## Dependencies

- [discord.js](https://discord.js.org/) - Discord API library
- [dayjs](https://day.js.org/) - Date/time handling with timezone support
- [uuid](https://github.com/uuidjs/uuid) - For generating unique IDs

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **MonkeyBytes Tech** - Original development
- **The Royal Court** - Testing and feature suggestions

## Support

For support, join our [Discord server](https://discord.gg/your-invite-link) or open an issue on GitHub.

---

© MonkeyBytes Tech | The Royal Court - 2025