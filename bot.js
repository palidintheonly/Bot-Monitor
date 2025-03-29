/**
 * MonkeyBytes Bot Monitor - Discord bot tracking for The Royal Court
 * Version: 2.2.0
 * Last Updated: 2025-03-28
 */

// Import without ActivityType to avoid initialization issues
const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  EmbedBuilder, 
  Colors, 
  ButtonStyle, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
const duration = require('dayjs/plugin/duration');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Initialize dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * COMMANDS DEFINITION - Added to fix the "COMMANDS is not defined" error
 * Removed: check-all, export-data, help as requested
 */
const COMMANDS = [
  {
    name: 'setup',
    description: 'Configure bot monitoring settings',
    options: [
      {
        name: 'admin_role',
        description: 'Role that can manage bot monitoring',
        type: 8,
        required: false
      },
      {
        name: 'log_channel',
        description: 'Channel for bot status notifications',
        type: 7,
        required: false
      },
      {
        name: 'default_check_interval',
        description: 'Default interval for checking bot status (seconds)',
        type: 4,
        required: false
      },
      {
        name: 'daily_summary',
        description: 'Send daily activity summaries',
        type: 5,
        required: false
      },
      {
        name: 'auto_monitor',
        description: 'Automatically monitor new bots',
        type: 5,
        required: false
      },
      {
        name: 'notify_on_status_change',
        description: 'Send notifications when bot status changes',
        type: 5,
        required: false
      },
      {
        name: 'detailed_notifications',
        description: 'Include detailed info in notifications',
        type: 5,
        required: false
      },
      {
        name: 'priority_role',
        description: 'Role for priority bots',
        type: 8,
        required: false
      },
      {
        name: 'exclude_role',
        description: 'Role for bots to exclude from monitoring',
        type: 8,
        required: false
      },
      {
        name: 'monitor_offline',
        description: 'Monitor offline status',
        type: 5,
        required: false
      }
    ]
  },
  {
    name: 'monitor',
    description: 'Start monitoring a bot',
    options: [
      {
        name: 'bot',
        description: 'Bot to monitor',
        type: 6,
        required: true
      },
      {
        name: 'exclude_offline',
        description: 'Exclude offline notifications',
        type: 5,
        required: false
      },
      {
        name: 'priority',
        description: 'Set as priority bot',
        type: 5,
        required: false
      }
    ]
  },
  {
    name: 'monitor-all',
    description: 'Monitor all bots in the server',
    options: [
      {
        name: 'role',
        description: 'Only monitor bots with this role',
        type: 8,
        required: false
      },
      {
        name: 'priority_role',
        description: 'Bots with this role will be marked as priority',
        type: 8,
        required: false
      }
    ]
  },
  {
    name: 'del-monitor',
    description: 'Stop monitoring a bot',
    options: [
      {
        name: 'bot',
        description: 'Bot to stop monitoring',
        type: 6,
        required: true
      }
    ]
  },
  {
    name: 'monitor-settings',
    description: 'Update monitor settings for a bot',
    options: [
      {
        name: 'bot',
        description: 'Bot to update settings for',
        type: 6,
        required: true
      },
      {
        name: 'exclude_offline',
        description: 'Exclude offline notifications',
        type: 5,
        required: false
      },
      {
        name: 'priority',
        description: 'Set as priority bot',
        type: 5,
        required: false
      },
      {
        name: 'daily_summary',
        description: 'Send daily activity summaries',
        type: 5,
        required: false
      }
    ]
  },
  {
    name: 'list-monitors',
    description: 'List all monitored bots',
    options: [
      {
        name: 'status',
        description: 'Filter by status',
        type: 3,
        required: false,
        choices: [
          { name: 'All', value: 'all' },
          { name: 'Online', value: 'online' },
          { name: 'Offline', value: 'offline' }
        ]
      },
      {
        name: 'role',
        description: 'Filter by role',
        type: 8,
        required: false
      }
    ]
  },
  {
    name: 'bot-status',
    description: 'Check current status of a monitored bot',
    options: [
      {
        name: 'bot',
        description: 'Bot to check status',
        type: 6,
        required: true
      }
    ]
  },
  {
    name: 'activity-info',
    description: 'View detailed activity statistics for a bot',
    options: [
      {
        name: 'bot',
        description: 'Bot to view activity',
        type: 6,
        required: true
      }
    ]
  },
  {
    name: 'status-history',
    description: 'View status change history for a bot',
    options: [
      {
        name: 'bot',
        description: 'Bot to view history',
        type: 6,
        required: true
      },
      {
        name: 'limit',
        description: 'Number of history entries to show',
        type: 4,
        required: false
      }
    ]
  },
  {
    name: 'bots-overview',
    description: 'View overview of all monitored bots',
    options: [
      {
        name: 'role',
        description: 'Filter by role',
        type: 8,
        required: false
      }
    ]
  },
  {
    name: 'pause-monitoring',
    description: 'Temporarily pause monitoring for a bot',
    options: [
      {
        name: 'bot',
        description: 'Bot to pause monitoring',
        type: 6,
        required: true
      },
      {
        name: 'duration',
        description: 'Duration in minutes (default: 30)',
        type: 4,
        required: false
      }
    ]
  },
  {
    name: 'resume-monitoring',
    description: 'Resume monitoring for a paused bot',
    options: [
      {
        name: 'bot',
        description: 'Bot to resume monitoring',
        type: 6,
        required: true
      }
    ]
  },
  {
    name: 'stats',
    description: 'View bot monitor statistics'
  },
  {
    name: 'activity-dashboard',
    description: 'View detailed dashboard for all monitored bots'
  },
  {
    name: 'dump',
    description: 'Dump current bot uptime data',
    options: [
      {
        name: 'confirm',
        description: 'Confirm data dump',
        type: 5,
        required: true
      }
    ]
  }
];

/**
 * CONFIGURATION
 */
const CONFIG = {
  token: 'na',
  clientId: 'na',
  adminRoleId: null,
  dataDir: path.join(__dirname, 'data'),
  maxMonitors: 1000,
  minCheckInterval: 10, // Global minimum check interval (seconds)
  rateLimit: {
    messagesPerMinute: 100, // Maximum messages per minute to avoid Discord rate limits
    messageQueueMaxSize: 100 // Maximum queue size before older messages are dropped
  },
  colors: { 
    success: Colors.Green, 
    error: Colors.Red, 
    warning: Colors.Yellow, 
    info: Colors.Blue, 
    neutral: Colors.Grey,
    debug: 0x00FFFF, // Cyan for debug logs
    verbose: 0xFF00FF, // Magenta for verbose logs
    royal: 0x800080, // Purple for Royal Court branding
    gold: 0xDAA520 // Golden for accents
  },
  defaultSettings: {
    defaultCheckInterval: null,
    defaultDailySummary: null,
    notifyOnStatusChange: null,
    autoMonitorNewBots: null,
    detailedNotifications: null,
    priorityRoleId: null,
    excludeRoleId: null,
    monitorOffline: null
  },
  dataRetention: {
    // Default data retention settings in days
    historyDays: 7,    // Status change history  
    dailyStatsDays: 7, // Daily statistics
    autoCleanupInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    enableAutoCleanup: true
  },
  timezone: 'Europe/London', // UK timezone (handles BST and GMT automatically)
  logging: {
    debug: true,      // Debug logging
    verbose: true,    // Verbose logging
    fileOperations: true, // Log file operations
    queueOperations: true, // Log queue operations
    discordEvents: true // Log Discord events
  },
  version: '2.2.0',
  lastUpdated: '2025-03-28',
  branding: {
    name: 'MonkeyBytes Bot Monitor',
    copyright: '© MonkeyBytes Tech | The Royal Court',
    footerText: '© MonkeyBytes Tech | The Royal Court'
  }
};

/**
 * GLOBAL STATE
 */
const STATE = { 
  guilds: {}, 
  intervals: {},
  cache: {
    presenceData: new Map(),
    lastCheck: new Map(),
    lastNotification: new Map()
  },
  stats: {
    commandsUsed: 0,
    statusChangesDetected: 0,
    filesWritten: 0,
    eventsProcessed: 0,
    errorCount: 0,
    startTime: Date.now(),
    queuedMessages: 0,
    sentMessages: 0,
    droppedMessages: 0
  },
  monitoring: {
    paused: false,
    pausedBots: new Set()
  },
  messageQueue: {
    queue: [],
    lastSentTimestamp: 0, // Will be initialized properly on startup
    processingInterval: null,
    highPriorityQueue: [], // For critical messages that shouldn't be rate-limited as much
    status: {
      lastLogTime: 0,
      logInterval: 60000 // Log queue status every minute
    }
  },
  pendingBulkOperations: {},
  shutdown: {
    inProgress: false,
    startTime: null,
    completed: {
      messageQueue: false,
      monitors: false,
      fileOperations: false
    }
  }
};

/**
 * ENHANCED LOGGING SYSTEM
 */
const logColors = {
  error: 31,    // Red
  warn: 33,     // Yellow
  success: 32,  // Green
  info: 34,     // Blue
  debug: 36,    // Cyan
  verbose: 35,  // Magenta
  queue: 36,    // Cyan
  file: 36,     // Cyan
  discord: 34,  // Blue
  db: 35        // Magenta
};

/**
 * Enhanced logging function that converts timestamps to UK time and provides
 * better categorization and color coding
 */
const log = (type, msg, category = null) => {
  // Get current time in UK timezone
  const ukTime = dayjs().tz(CONFIG.timezone);
  const timestamp = ukTime.format('YYYY-MM-DD HH:mm:ss.SSS');
  
  // Determine log color
  let color = logColors[type] || 0;
  
  // Skip debug logs if disabled
  if (type === 'debug' && !CONFIG.logging.debug) return;
  
  // Skip verbose logs if disabled
  if (type === 'verbose' && !CONFIG.logging.verbose) return;
  
  // Skip queue logs if disabled
  if (category === 'QUEUE' && !CONFIG.logging.queueOperations) return;
  
  // Skip file operation logs if disabled
  if (category === 'FILE' && !CONFIG.logging.fileOperations) return;
  
  // Skip discord event logs if disabled
  if (category === 'DISCORD' && !CONFIG.logging.discordEvents) return;
  
  // Format category text
  const categoryText = category ? `[${category}] ` : '';
  
  // Log with color, timestamp, type, and optional category
  console.log(`\x1b[${color}m[${timestamp}] [${type.toUpperCase()}] ${categoryText}[MonkeyBytes]\x1b[0m ${msg}`);
  
  // Increment error count in stats
  if (type === 'error' && STATE.stats) {
    STATE.stats.errorCount++;
  }
};

/**
 * UTILITY FUNCTIONS
 */

/**
 * Convert a timestamp to UK time (GMT/BST)
 * @param {Date|number} time - Date object or timestamp to convert
 * @param {string} format - Optional format string for dayjs
 * @returns {string} Formatted date/time string in UK timezone
 */
const toUKTime = (time, format = null) => {
  const date = typeof time === 'number' ? dayjs(time) : dayjs(time);
  if (format) {
    return date.tz(CONFIG.timezone).format(format);
  }
  return date.tz(CONFIG.timezone).format('YYYY-MM-DD HH:mm:ss');
};

/**
 * Format milliseconds into a human-readable duration
 * @param {number} ms - Milliseconds to format
 * @returns {string} Formatted duration string
 */
const formatTime = ms => {
  if (!ms || isNaN(ms) || ms < 0) return 'Unknown';
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  return `${Math.floor(ms / 86400000)}d ${Math.floor((ms % 86400000) / 3600000)}h`;
};

const formatPct = val => (val === undefined || val === null || isNaN(val)) ? '0.00%' : `${val.toFixed(2)}%`;
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const getStatusEmoji = status => status === 'offline' ? '⚫' : status === 'idle' ? '🟡' : status === 'dnd' ? '🔴' : '🟢';
const getStatusColor = status => {
  switch(status) {
    case 'offline':
      return Colors.DarkButNotBlack;
    case 'idle':
      return Colors.Yellow;
    case 'dnd':
      return Colors.Red;
    case 'online':
      return CONFIG.colors.royal; // Use royal purple for online bots
    default:
      return Colors.Green;
  }
};

// FIXED - Using hardcoded activity types instead of ActivityType enum
const getActivityEmoji = type => {
  switch(type) {
    case 0: return '🎮'; // Playing
    case 1: return '📺'; // Streaming
    case 2: return '🎧'; // Listening
    case 3: return '👀'; // Watching
    case 5: return '🏆'; // Competing
    case 4: return '🔤'; // Custom
    default: return '📌';
  }
};

/**
 * IMPROVED FILE OPERATIONS
 */

/**
 * Create directory if it doesn't exist
 * @param {string} dir - Directory path to ensure exists
 * @returns {string} The directory path
 */
const ensureDir = dir => { 
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true }); 
      log('info', `Created directory ${dir}`, 'FILE');
    }
    return dir;
  } catch (e) {
    log('error', `Failed to create directory ${dir}: ${e.message}`, 'FILE');
    return dir;
  }
};

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file exists
 */
const fileExists = filePath => {
  try {
    return fs.existsSync(filePath);
  } catch (e) {
    log('error', `Error checking if file exists ${filePath}: ${e.message}`, 'FILE');
    return false;
  }
};

/**
 * Safely load JSON file with error handling
 * @param {string} file - Path to JSON file
 * @param {Object} def - Default object to return if file doesn't exist or is invalid
 * @returns {Object} Parsed JSON or default object
 */
const loadJson = (file, def = {}) => { 
  try { 
    if (fileExists(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (!content || content.trim() === '') {
        log('warn', `File ${file} is empty, using default data`, 'FILE');
        return def;
      }
      return JSON.parse(content);
    } else {
      log('info', `File not found, using default: ${file}`, 'FILE');
      return def;
    }
  } catch (e) { 
    log('error', `Failed to load ${file}: ${e.message}`, 'FILE'); 
    return def; 
  } 
};

/**
 * Safely save JSON file with error handling
 * @param {string} file - Path to save JSON file
 * @param {Object} data - Data to save
 * @returns {boolean} True if successful
 */
const saveJson = (file, data) => { 
  try { 
    const dirPath = path.dirname(file);
    ensureDir(dirPath);
    
    // Create backup of existing file if it exists
    if (fileExists(file)) {
      const backupFile = `${file}.bak`;
      fs.copyFileSync(file, backupFile);
      log('debug', `Created backup of ${file}`, 'FILE');
    }
    
    // Write data to temporary file first
    const tempFile = `${file}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2)); 
    
    // Then rename temp file to actual file (atomic operation)
    fs.renameSync(tempFile, file);
    
    if (STATE.stats) STATE.stats.filesWritten++;
    log('debug', `Successfully saved ${file}`, 'FILE');
    
    return true; 
  } catch (e) { 
    log('error', `Failed to save ${file}: ${e.message}`, 'FILE'); 
    log('debug', `Error stack: ${e.stack}`, 'FILE');
    return false; 
  } 
};

/**
 * Safely delete file with error handling
 * @param {string} filePath - Path to delete
 * @returns {boolean} True if successful
 */
const safeDeleteFile = (filePath) => {
  try {
    if (fileExists(filePath)) {
      fs.unlinkSync(filePath);
      log('info', `Deleted file ${filePath}`, 'FILE');
      return true;
    }
    return false;
  } catch (e) {
    log('error', `Failed to delete file ${filePath}: ${e.message}`, 'FILE');
    return false;
  }
};

// Status management system - NO REFERENCES TO ActivityType HERE!
// IMPORTANT: Define these functions BEFORE they're used in client ready event
let statusInterval = null;

function initializeStatusManagement() {
  log('info', 'Initializing status management system...', 'STATUS');
  
  // Clear any existing status
  clearStatus();
  
  // Set first status after a short delay
  setTimeout(() => {
    setWatchingStatus('MonkeyBytes Tech');
    
    // Set up rotation interval
    statusInterval = setInterval(() => {
      rotateStatus();
    }, 15000); // 15 seconds between rotations
    
    log('success', 'Status rotation activated (15-second interval)', 'STATUS');
  }, 2000);
}

// Rotation counter and status names 
let currentStatusIndex = 0;
const STATUS_NAMES = ['MonkeyBytes Tech', 'Royal Court', 'Active Bots'];

function rotateStatus() {
  // Move to next status
  currentStatusIndex = (currentStatusIndex + 1) % STATUS_NAMES.length;
  
  // Get current status name
  const statusName = STATUS_NAMES[currentStatusIndex];
  
  // Special handling for the third status to show bot count
  if (currentStatusIndex === 2) {
    const activeCount = countActiveBots();
    setWatchingStatus(`${statusName}: ${activeCount}`);
  } else {
    setWatchingStatus(statusName);
  }
}

function clearStatus() {
  client.user.setPresence({
    activities: [],
    status: 'online'
  });
  log('info', 'All status messages cleared', 'STATUS');
}

// Simple function to set watching status without ActivityType reference
function setWatchingStatus(name) {
  client.user.setPresence({
    activities: [{ 
      name: name,
      type: 3 // 3 = Watching - hardcode to avoid ActivityType
    }],
    status: 'online'
  });
  log('info', `Status set to: "Watching ${name}"`, 'STATUS');
}

function countActiveBots() {
  let activeCount = 0;
  for (const guildId in STATE.guilds) {
    const guild = STATE.guilds[guildId];
    for (const botId in guild.monitors) {
      const activityData = STATE[`${guildId}_${botId}_activity`];
      if (activityData && activityData.status === 'online') {
        activeCount++;
      }
    }
  }
  return activeCount;
}

function clearStatusInterval() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
    log('info', 'Status rotation stopped', 'STATUS');
  }
}

/**
 * INITIALIZE DISCORD CLIENT
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.GuildMember, Partials.User],
  sweepers: {
    guildMembers: {
      interval: 3600,
      filter: () => null
    }
  }
});

/**
 * GUILD & MONITOR FUNCTIONS
 */
const getGuildDir = guildId => {
  const dirPath = path.join(CONFIG.dataDir, guildId);
  ensureDir(dirPath);
  
  // Also ensure monitors directory exists
  ensureDir(path.join(dirPath, 'monitors'));
  
  return dirPath;
};

const getGuildConfig = guildId => {
  if (!STATE.guilds[guildId]) {
    const configPath = path.join(getGuildDir(guildId), 'config.json');
    
    if (fileExists(configPath)) {
      STATE.guilds[guildId] = loadJson(configPath);
      log('debug', `Loaded existing guild config for ${guildId}`, 'DB');
    } else {
      STATE.guilds[guildId] = {
        adminRoleId: null,
        monitors: {}, 
        logChannelId: null,
        settings: {
          defaultCheckInterval: 10,
          defaultDailySummary: false,
          notifyOnStatusChange: false,
          autoMonitorNewBots: false,
          detailedNotifications: false,
          priorityRoleId: null,
          excludeRoleId: null,
          monitorOffline: false
        }
      };
      
      // Save the new config
      saveGuildConfig(guildId);
      log('info', `Created new guild config for ${guildId}`, 'DB');
    }
  }
  return STATE.guilds[guildId];
};

const saveGuildConfig = guildId => {
  const configPath = path.join(getGuildDir(guildId), 'config.json');
  return saveJson(configPath, STATE.guilds[guildId]);
};

const getMonitorData = (guildId, botId, type) => {
  const key = `${guildId}_${botId}_${type}`;
  
  if (!STATE[key]) {
    const filePath = path.join(getGuildDir(guildId), 'monitors', `${type}_${botId}.json`);
    let defaultData;
    
    if (type === 'activity') {
      defaultData = {};
    } else if (type === 'history') {
      defaultData = { events: [] };
    } else {
      defaultData = { days: {} };
    }
    
    if (fileExists(filePath)) {
      STATE[key] = loadJson(filePath, defaultData);
      log('debug', `Loaded existing ${type} data for bot ${botId} in guild ${guildId}`, 'DB');
    } else {
      STATE[key] = defaultData;
      log('debug', `Created new ${type} data for bot ${botId} in guild ${guildId}`, 'DB');
    }
  }
  
  return STATE[key];
};

const saveMonitorData = (guildId, botId, type) => {
  const key = `${guildId}_${botId}_${type}`;
  const monitorDir = path.join(getGuildDir(guildId), 'monitors');
  const filePath = path.join(monitorDir, `${type}_${botId}.json`);
  
  // Ensure the monitors directory exists
  ensureDir(monitorDir);
  
  // Save the data
  return saveJson(filePath, STATE[key]);
};

// Check if member has admin role or server admin permissions
const hasAdminRole = (member, guildId) => {
  const guildConfig = getGuildConfig(guildId);
  return member.permissions.has(PermissionFlagsBits.Administrator) || 
         (guildConfig.adminRoleId && member.roles.cache.has(guildConfig.adminRoleId));
};

// Compare arrays helper function
function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  // Sort both arrays for comparison
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  for (let i = 0; i < sortedA.length; ++i) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  return true;
}

/**
 * BOT MONITORING FUNCTIONS
 */
async function addMonitor(guildId, botId, excludeOffline = false, priorityBot = false) {
  const guild = getGuildConfig(guildId);
  const monitorCount = Object.keys(guild.monitors).length;
  if (monitorCount >= CONFIG.maxMonitors) throw new Error(`Maximum ${CONFIG.maxMonitors} monitors reached`);
  if (guild.monitors[botId]) throw new Error('Already monitoring this bot');

  // Validate bot existence
  const member = await client.guilds.fetch(guildId)
    .then(g => g.members.fetch(botId))
    .catch(err => {
      log('error', `Failed to fetch bot ${botId}: ${err.message}`, 'DISCORD');
      return null;
    });
    
  if (!member) throw new Error('Bot not found or not in this server');
  
  // Only monitor bots
  if (!member.user.bot) throw new Error('Cannot monitor users with bot monitor - this is for Discord bots only');

  // Use guild settings when adding a new monitor
  const guildSettings = guild.settings || {};
  
  // Use provided values or fall back to guild settings with safe defaults
  const effectiveCheckInterval = guildSettings.defaultCheckInterval || 300;
  const effectiveDailySummary = guildSettings.defaultDailySummary !== null ? guildSettings.defaultDailySummary : false;
  
  // Enforce minimum check interval
  const safeCheckInterval = Math.max(CONFIG.minCheckInterval, effectiveCheckInterval);
  
  // Create monitor config
  guild.monitors[botId] = {
    excludeOffline: excludeOffline,
    priorityBot: priorityBot,
    checkInterval: safeCheckInterval,
    dailySummary: effectiveDailySummary,
    createdAt: new Date().toISOString(), 
    botTag: member.user.tag,
    botAvatar: member.user.displayAvatarURL({ dynamic: true }),
    roles: Array.from(member.roles.cache.map(r => r.id))
  };
  saveGuildConfig(guildId);

  // Initialize activity data
  const isOnline = member.presence && ['online', 'idle', 'dnd'].includes(member.presence.status);
  const currentTime = new Date();
  const activityData = getMonitorData(guildId, botId, 'activity');
  Object.assign(activityData, {
    id: botId, 
    guildId, 
    tag: member.user.tag, 
    username: member.user.username,
    avatar: member.user.displayAvatarURL({ dynamic: true }),
    status: isOnline ? 'online' : 'offline',
    lastStatusChange: currentTime.toISOString(),
    totalOnlineTime: isOnline ? 60000 : 0,
    totalOfflineTime: !isOnline ? 60000 : 0,
    lastOnline: isOnline ? currentTime.toISOString() : null,
    lastOffline: !isOnline ? currentTime.toISOString() : null,
    presenceHistory: [], 
    onlinePercentage: isOnline ? 100 : 0,
    offlinePercentage: !isOnline ? 100 : 0,
    avgSessionDuration: 0, 
    longestSession: 0,
    joinedAt: member.joinedAt ? member.joinedAt.toISOString() : null,
    roles: Array.from(member.roles.cache.map(r => r.id))
  });
  saveMonitorData(guildId, botId, 'activity');
  
  // Cache initial presence data
  STATE.cache.presenceData.set(botId, {
    status: member.presence?.status || 'offline',
    lastUpdated: Date.now()
  });
  
  // Setup check interval
  setupCheckInterval(guildId, botId);
  
  log('info', `Started monitoring bot ${member.user.tag} (${botId}) in guild ${guildId}`, 'DB');
  return guild.monitors[botId];
}

function setupCheckInterval(guildId, botId) {
  const key = `${guildId}_${botId}`;
  if (STATE.intervals[key]) clearInterval(STATE.intervals[key]);

  const guild = getGuildConfig(guildId);
  if (!guild.monitors[botId]) return false;

  // Strictly enforce minimum check interval
  let interval = guild.monitors[botId].checkInterval || 60;
  interval = Math.max(CONFIG.minCheckInterval, interval) * 1000;
  
  log('debug', `Setting up monitor for ${botId} in guild ${guildId} with interval: ${interval/1000}s`, 'DB');
  
  STATE.intervals[key] = setInterval(() => checkBotStatus(guildId, botId), interval);
  return true;
}

/**
 * Completely remove all bot data
 * @param {string} guildId - Guild ID
 * @param {string} botId - Bot ID
 * @returns {boolean} True if successful
 */
async function removeMonitor(guildId, botId) {
  const guild = getGuildConfig(guildId);
  if (!guild.monitors[botId]) throw new Error('Not monitoring this bot');

  // Clear interval
  const key = `${guildId}_${botId}`;
  if (STATE.intervals[key]) {
    clearInterval(STATE.intervals[key]);
    delete STATE.intervals[key];
  }

  // Remove monitor
  delete guild.monitors[botId];
  saveGuildConfig(guildId);
  
  // Clean up state
  delete STATE[`${guildId}_${botId}_activity`];
  delete STATE[`${guildId}_${botId}_history`];
  delete STATE[`${guildId}_${botId}_daily`];
  
  // Clear from cache
  STATE.cache.presenceData.delete(botId);
  STATE.cache.lastCheck.delete(botId);
  STATE.cache.lastNotification.delete(botId);
  
  // Delete files safely
  const monitorDir = path.join(getGuildDir(guildId), 'monitors');
  try {
    ['activity', 'history', 'daily'].forEach(type => {
      const filePath = path.join(monitorDir, `${type}_${botId}.json`);
      safeDeleteFile(filePath);
    });
  } catch (e) { 
    log('error', `Error deleting files: ${e.message}`, 'FILE'); 
  }
  
  log('info', `Removed monitoring for bot ${botId} in guild ${guildId}`, 'DB');
  return true;
}

async function checkBotStatus(guildId, botId) {
  try {
    // Skip if monitoring is globally paused
    if (STATE.monitoring.paused || STATE.monitoring.pausedBots.has(botId)) return;
    
    const guild = getGuildConfig(guildId);
    if (!guild.monitors[botId]) return;
    
    // Update last check time
    STATE.cache.lastCheck.set(botId, Date.now());
    
    const guildObj = await client.guilds.fetch(guildId).catch(err => {
      log('error', `Failed to fetch guild ${guildId}: ${err.message}`, 'DISCORD');
      return null;
    });
    
    if (!guildObj) return;
    
    const member = await guildObj.members.fetch(botId).catch(err => {
      log('error', `Failed to fetch bot ${botId} in guild ${guildId}: ${err.message}`, 'DISCORD');
      return null;
    });
    
    // If bot no longer in guild, record as offline
    if (!member) {
      const activityData = getMonitorData(guildId, botId, 'activity');
      if (activityData.status !== 'offline') {
        await recordStatusChange(guildId, botId, false, null, "left");
      }
      
      // Remove the monitor completely since bot left
      await removeMonitor(guildId, botId).catch(err => {
        log('error', `Failed to remove monitor for bot who left: ${err.message}`, 'DB');
      });
      
      log('info', `Bot ${botId} left guild ${guildId}, removed monitor`, 'DB');
      return;
    }
    
    const isOnline = member.presence && ['online', 'idle', 'dnd'].includes(member.presence.status);
    const specificStatus = member.presence?.status || null;
    
    const activityData = getMonitorData(guildId, botId, 'activity');
    const currentStatus = activityData.status;
    
    // Get cached status
    const cachedData = STATE.cache.presenceData.get(botId);
    
    // Only record changes if status has changed
    if ((isOnline && currentStatus !== 'online') || (!isOnline && currentStatus === 'online') || 
        (specificStatus && cachedData?.status !== specificStatus)) {
      
      // Update cache
      STATE.cache.presenceData.set(botId, {
        status: specificStatus || (isOnline ? 'online' : 'offline'),
        lastUpdated: Date.now()
      });
      
      // Skip offline state changes if configured to exclude them
      if (!isOnline && guild.monitors[botId].excludeOffline) {
        return;
      }
      
      await recordStatusChange(guildId, botId, isOnline, specificStatus);
    }
    
    // Check for role changes
    if (member && guild.monitors[botId].roles) {
      const currentRoles = Array.from(member.roles.cache.map(r => r.id));
      const monitoredRoles = guild.monitors[botId].roles;
      
      // If roles have changed, update the stored roles
      if (!arraysEqual(currentRoles, monitoredRoles)) {
        guild.monitors[botId].roles = currentRoles;
        saveGuildConfig(guildId);
        
        // Also update roles in activity data
        activityData.roles = currentRoles;
        saveMonitorData(guildId, botId, 'activity');
      }
    }
  } catch (e) { 
    log('error', `Status check error for bot ${botId} in guild ${guildId}: ${e.message}`, 'DISCORD'); 
  }
}

async function recordStatusChange(guildId, botId, isOnline, specificStatus, reason = null) {
  const guild = getGuildConfig(guildId);
  if (!guild.monitors[botId]) return;
  
  const activityData = getMonitorData(guildId, botId, 'activity');
  const currentTime = new Date();
  const lastChange = new Date(activityData.lastStatusChange);
  const durationMs = currentTime - lastChange;
  
  let statusChange;
  if (isOnline) {
    activityData.totalOfflineTime += durationMs;
    activityData.lastOnline = currentTime.toISOString();
    
    statusChange = {
      botId, guildId, status: 'online', previousStatus: 'offline',
      timestamp: currentTime.toISOString(), offlineTime: durationMs,
      formattedOfflineTime: formatTime(durationMs), specificStatus,
      reason: reason
    };
  } else {
    activityData.totalOnlineTime += durationMs;
    activityData.lastOffline = currentTime.toISOString();
    if (durationMs > activityData.longestSession) activityData.longestSession = durationMs;
    
    statusChange = {
      botId, guildId, status: 'offline', previousStatus: 'online',
      timestamp: currentTime.toISOString(), onlineTime: durationMs,
      formattedOnlineTime: formatTime(durationMs),
      reason: reason
    };
  }
  
  // Update status and history
  activityData.status = isOnline ? 'online' : 'offline';
  activityData.lastStatusChange = currentTime.toISOString();
  
  // Limit history to 100 entries
  activityData.presenceHistory.unshift(statusChange);
  if (activityData.presenceHistory.length > 100) activityData.presenceHistory = activityData.presenceHistory.slice(0, 100);
  
  // Update stats
  const totalTime = activityData.totalOnlineTime + activityData.totalOfflineTime;
  if (totalTime > 0) {
    activityData.onlinePercentage = (activityData.totalOnlineTime / totalTime) * 100;
    activityData.offlinePercentage = (activityData.totalOfflineTime / totalTime) * 100;
  }
  
  // Calculate averages
  const onlineEvents = activityData.presenceHistory.filter(h => h.status === 'offline' && h.onlineTime);
  
  activityData.avgSessionDuration = onlineEvents.length ? 
    onlineEvents.reduce((sum, e) => sum + e.onlineTime, 0) / onlineEvents.length : 0;
  
  saveMonitorData(guildId, botId, 'activity');
  
  // Update history - limit to 500 entries
  const history = getMonitorData(guildId, botId, 'history');
  history.events.unshift(statusChange);
  if (history.events.length > 500) history.events = history.events.slice(0, 500);
  saveMonitorData(guildId, botId, 'history');
  
  // Update daily stats
  updateDailyStats(guildId, botId, isOnline ? 'online' : 'offline', durationMs);
  
  // Increment status change counter
  STATE.stats.statusChangesDetected++;
  
  // Send notification if enabled
  if (guild.settings.notifyOnStatusChange !== false && 
      (guild.monitors[botId].priorityBot || isOnline || !guild.monitors[botId].excludeOffline)) {
    await sendStatusNotification(guildId, botId, statusChange);
  }
  
  log('debug', `Recorded status change for ${botId} in guild ${guildId}: ${isOnline ? 'online' : 'offline'}`, 'DB');
}

function updateDailyStats(guildId, botId, status, durationMs) {
  const daily = getMonitorData(guildId, botId, 'daily');
  const today = dateKey(new Date());
  
  if (!daily.days[today]) daily.days[today] = { onlineTime: 0, offlineTime: 0, statusChanges: 0 };
  
  if (status === 'online') {
    daily.days[today].offlineTime += durationMs;
  } else {
    daily.days[today].onlineTime += durationMs;
  }
  
  daily.days[today].statusChanges++;
  
  // Keep only last 30 days
  const days = Object.keys(daily.days).sort();
  if (days.length > 30) {
    days.slice(0, days.length - 30).forEach(day => delete daily.days[day]);
  }
  
  saveMonitorData(guildId, botId, 'daily');
}

/**
 * IMPROVED MESSAGE QUEUE SYSTEM
 */

// Add a message to the queue 
function queueMessage(channelId, messageContent, priority = false) {
  if (!channelId || !messageContent) {
    log('error', 'Attempted to queue message with missing channelId or content', 'QUEUE');
    return;
  }

  const queueItem = {
    channelId,
    content: messageContent,
    timestamp: Date.now(),
    attempts: 0,
    maxAttempts: 3
  };
  
  if (priority) {
    STATE.messageQueue.highPriorityQueue.push(queueItem);
    log('debug', `Added high priority message to queue for channel ${channelId}`, 'QUEUE');
  } else {
    // Check if queue is getting too large, drop oldest messages if needed
    if (STATE.messageQueue.queue.length >= CONFIG.rateLimit.messageQueueMaxSize) {
      STATE.messageQueue.queue.shift(); // Remove oldest message
      STATE.stats.droppedMessages++;
      log('warn', `Message queue full, dropped oldest message (${STATE.stats.droppedMessages} total dropped)`, 'QUEUE');
    }
    
    STATE.messageQueue.queue.push(queueItem);
    STATE.stats.queuedMessages++;
    log('debug', `Added message to queue for channel ${channelId} (queue size: ${STATE.messageQueue.queue.length})`, 'QUEUE');
  }
  
  // Log queue status periodically
  const now = Date.now();
  if (now - STATE.messageQueue.status.lastLogTime > STATE.messageQueue.status.logInterval) {
    log('info', `Message queue status: ${STATE.messageQueue.queue.length} regular, ${STATE.messageQueue.highPriorityQueue.length} high priority, ${STATE.stats.sentMessages} sent, ${STATE.stats.droppedMessages} dropped`, 'QUEUE');
    STATE.messageQueue.status.lastLogTime = now;
  }
}

// Process the message queue at a controlled rate
async function processMessageQueue() {
  try {
    // Check if shutdown is in progress
    if (STATE.shutdown.inProgress) {
      // During shutdown, process all messages as quickly as possible
      if (STATE.messageQueue.highPriorityQueue.length > 0) {
        const message = STATE.messageQueue.highPriorityQueue.shift();
        await sendQueuedMessage(message);
      } else if (STATE.messageQueue.queue.length > 0) {
        const message = STATE.messageQueue.queue.shift();
        await sendQueuedMessage(message);
      } else {
        // Queue is empty, mark message queue as completed for shutdown
        STATE.shutdown.completed.messageQueue = true;
        log('info', 'Message queue processing completed during shutdown', 'QUEUE');
      }
      return;
    }
  
    // Normal operation - respect rate limits
    const now = Date.now();
    const timeSinceLastSend = now - STATE.messageQueue.lastSentTimestamp;
    const minInterval = (60 * 1000) / CONFIG.rateLimit.messagesPerMinute; // Milliseconds between messages
    
    // If not enough time has passed, skip processing
    if (timeSinceLastSend < minInterval) {
      return; // Too soon to send another message
    }
    
    // Process high priority queue first
    if (STATE.messageQueue.highPriorityQueue.length > 0) {
      const message = STATE.messageQueue.highPriorityQueue.shift();
      await sendQueuedMessage(message);
      return;
    }
    
    // Then process regular queue
    if (STATE.messageQueue.queue.length > 0) {
      const message = STATE.messageQueue.queue.shift();
      await sendQueuedMessage(message);
    }
  } catch (error) {
    log('error', `Error in processMessageQueue: ${error.message}`, 'QUEUE');
    log('debug', `Error stack: ${error.stack}`, 'QUEUE');
  }
}

// Actually send the message with improved error handling
async function sendQueuedMessage(message) {
  try {
    // Try to get channel from cache first before fetching
    let channel = client.channels.cache.get(message.channelId);
    
    if (!channel) {
      channel = await client.channels.fetch(message.channelId)
        .catch(err => {
          log('error', `Failed to find channel ${message.channelId} for queued message: ${err.message}`, 'QUEUE');
          return null;
        });
    }
    
    if (!channel) {
      // Channel no longer exists or bot doesn't have access - don't retry
      log('error', `Channel ${message.channelId} not found or inaccessible, abandoning message`, 'QUEUE');
      return;
    }
    
    // Check if channel is text-based
    if (!channel.isTextBased()) {
      log('error', `Channel ${message.channelId} is not a text channel, abandoning message`, 'QUEUE');
      return;
    }
    
    await channel.send(message.content);
    STATE.messageQueue.lastSentTimestamp = Date.now();
    STATE.stats.sentMessages++;
    
    log('debug', `Successfully sent message to channel ${message.channelId}`, 'QUEUE');
  } catch (error) {
    message.attempts++;
    
    // Handle specific Discord API errors
    if (error.code) {
      switch (error.code) {
        case 50013: // Missing Permissions
          log('error', `Missing permissions to send message in channel ${message.channelId}`, 'QUEUE');
          return; // Don't retry permission errors
        case 10003: // Unknown Channel
        case 10004: // Unknown Guild
          log('error', `Channel or guild no longer exists for ${message.channelId}`, 'QUEUE');
          return; // Don't retry if channel/guild doesn't exist
        case 50001: // Missing Access
          log('error', `No access to channel ${message.channelId}`, 'QUEUE');
          return; // Don't retry access errors
        case 50006: // Cannot send an empty message
          log('error', `Cannot send empty message to ${message.channelId}`, 'QUEUE');
          return; // Don't retry invalid message errors
        default:
          log('error', `Failed to send queued message: ${error.message} (code: ${error.code})`, 'QUEUE');
      }
    } else {
      log('error', `Failed to send queued message: ${error.message}`, 'QUEUE');
    }
    
    // Retry if we haven't exceeded max attempts
    if (message.attempts < message.maxAttempts) {
      log('info', `Will retry message delivery, attempt ${message.attempts}/${message.maxAttempts}`, 'QUEUE');
      
      // For transient errors, add exponential backoff
      const backoffDelay = Math.min(30000, Math.pow(2, message.attempts) * 1000); // Cap at 30 seconds
      
      setTimeout(() => {
        STATE.messageQueue.queue.push(message); // Put back in queue with delay
      }, backoffDelay);
      
    } else {
      log('error', `Message abandoned after ${message.attempts} failed attempts`, 'QUEUE');
    }
  }
}

// Initialize message queue processor with proper initialization
function initializeMessageQueue() {
  if (STATE.messageQueue.processingInterval) {
    clearInterval(STATE.messageQueue.processingInterval);
  }
  
  // Initialize lastSentTimestamp to allow immediate sending of first message
  if (STATE.messageQueue.lastSentTimestamp === 0) {
    // Set to current time minus the interval to allow immediate sending
    const minInterval = (60 * 1000) / CONFIG.rateLimit.messagesPerMinute;
    STATE.messageQueue.lastSentTimestamp = Date.now() - minInterval - 100;
    log('info', 'Initialized message queue lastSentTimestamp for immediate processing', 'QUEUE');
  }
  
  // Process queue every 1 second
  STATE.messageQueue.processingInterval = setInterval(processMessageQueue, 1000);
  log('info', 'Message queue processor initialized', 'QUEUE');
  
  // Set up periodic queue status logging
  STATE.messageQueue.status.lastLogTime = Date.now();
}

async function sendStatusNotification(guildId, botId, statusChange) {
  try {
    const guild = getGuildConfig(guildId);
    if (!guild.monitors[botId]) return;
    
    // Use general log channel for bot notifications
    if (!guild.logChannelId) return;
    
    const guildObj = await client.guilds.fetch(guildId).catch(() => null);
    if (!guildObj) return;
    
    // Skip lookup of channel since we'll queue message and get it later
    const activityData = getMonitorData(guildId, botId, 'activity');
    
    // Skip notifications for non-priority bots if we're getting too many
    if (!guild.monitors[botId].priorityBot) {
      const lastNotif = STATE.cache.lastNotification.get(botId) || 0;
      // Only notify once per hour for regular bots to avoid spam
      if (Date.now() - lastNotif < 3600000) return;
    }
    
    STATE.cache.lastNotification.set(botId, Date.now());
    
    let embed;
    if (statusChange.status === 'online') {
      const specificStatus = statusChange.specificStatus || 'online';
      const statusEmoji = getStatusEmoji(specificStatus);
      const statusTitle = specificStatus === 'dnd' ? 'Do Not Disturb' : 
                         specificStatus.charAt(0).toUpperCase() + specificStatus.slice(1);
      
      embed = new EmbedBuilder()
        .setTitle(`${statusEmoji} Bot ${statusTitle}`)
        .setDescription(`<@${statusChange.botId}> (\`${activityData.tag}\`) is now ${statusTitle.toLowerCase()}.`)
        .setColor(getStatusColor(specificStatus))
        .addFields(
          { name: 'Offline Duration', value: statusChange.formattedOfflineTime || formatTime(statusChange.offlineTime), inline: true },
          { name: 'Bot ID', value: statusChange.botId, inline: true },
          { name: 'Timestamp', value: `<t:${Math.floor(new Date(statusChange.timestamp).getTime() / 1000)}:F>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: CONFIG.branding.copyright });
      
      if (activityData.avatar) embed.setThumbnail(activityData.avatar);
      
      // Queue the message instead of sending it directly
      queueMessage(guild.logChannelId, { embeds: [embed] }, guild.monitors[botId].priorityBot);
    } else {
      // For offline bots, we can add the reason if known
      const reasonText = statusChange.reason === "left" ? " (Left Server)" : "";
      
      embed = new EmbedBuilder()
        .setTitle('⚫ MonkeyBytes Bot Offline')
        .setDescription(`<@${statusChange.botId}> (\`${activityData.tag}\`) went offline${reasonText}.`)
        .setColor(Colors.DarkButNotBlack)
        .addFields(
          { name: 'Session Duration', value: statusChange.formattedOnlineTime || formatTime(statusChange.onlineTime), inline: true },
          { name: 'Bot ID', value: statusChange.botId, inline: true },
          { name: 'Timestamp', value: `<t:${Math.floor(new Date(statusChange.timestamp).getTime() / 1000)}:F>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: CONFIG.branding.copyright });
      
      if (activityData.avatar) embed.setThumbnail(activityData.avatar);
      
      // Queue the message instead of sending it directly
      queueMessage(guild.logChannelId, { embeds: [embed] }, guild.monitors[botId].priorityBot);
    }
  } catch (e) { log('error', `Notification error: ${e.message}`, 'DISCORD'); }
}

async function sendDailySummary(guildId, botId) {
  try {
    const guild = getGuildConfig(guildId);
    if (!guild.monitors[botId] || !guild.monitors[botId].dailySummary) return false;
    
    if (!guild.logChannelId) return false;
    
    const guildObj = await client.guilds.fetch(guildId).catch(() => null);
    if (!guildObj) return false;
    
    const activityData = getMonitorData(guildId, botId, 'activity');
    const dailyStats = getMonitorData(guildId, botId, 'daily');
    
    // Get yesterday's date
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = dateKey(yesterday);
    
    if (!dailyStats.days[dateStr]) return false;
    
    const stats = dailyStats.days[dateStr];
    const totalTime = stats.onlineTime + stats.offlineTime;
    const onlinePercentage = totalTime > 0 ? (stats.onlineTime / totalTime) * 100 : 0;
    
    // Create online time bar visualization
    const barLength = 20;
    const filledBars = Math.round((onlinePercentage / 100) * barLength);
    const emptyBars = barLength - filledBars;
    const onlineBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
    
    const embed = new EmbedBuilder()
      .setTitle(`📊 Daily Activity Summary for ${activityData.tag}`)
      .setDescription(`Activity statistics for ${yesterday.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n**Online Time: ${formatPct(onlinePercentage)}**\n${onlineBar}`)
      .setColor(CONFIG.colors.info)
      .addFields(
        { name: 'Total Online', value: formatTime(stats.onlineTime), inline: true },
        { name: 'Total Offline', value: formatTime(stats.offlineTime), inline: true },
        { name: 'Status Changes', value: stats.statusChanges.toString(), inline: true },
        { name: 'Current Status', value: `${getStatusEmoji(activityData.status)} ${activityData.status.charAt(0).toUpperCase() + activityData.status.slice(1)}`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: CONFIG.branding.copyright });
    
    if (activityData.avatar) embed.setThumbnail(activityData.avatar);
    
    // Queue the daily summary with higher priority than regular messages
    queueMessage(guild.logChannelId, { embeds: [embed] }, true);
    
    return true;
  } catch (e) { log('error', `Daily summary error: ${e.message}`, 'DISCORD'); return false; }
}

/**
 * DATA CLEANUP FUNCTIONS
 */
async function cleanupOldData(guildId, historyDays = null, dailyStatsDays = null) {
  try {
    const historyRetention = historyDays !== null ? historyDays : CONFIG.dataRetention.historyDays;
    const dailyRetention = dailyStatsDays !== null ? dailyStatsDays : CONFIG.dataRetention.dailyStatsDays;
    
    log('info', `Starting data cleanup for guild ${guildId}. Retention: History=${historyRetention}d, Daily=${dailyRetention}d`, 'DB');
    
    const guild = getGuildConfig(guildId);
    const monitors = guild.monitors || {};
    let historyEventsRemoved = 0;
    let dailyEntriesRemoved = 0;
    
    const oldestHistoryDate = new Date();
    oldestHistoryDate.setDate(oldestHistoryDate.getDate() - historyRetention);
    
    const oldestDailyDate = new Date();
    oldestDailyDate.setDate(oldestDailyDate.getDate() - dailyRetention);
    
    // Process each monitor
    for (const botId of Object.keys(monitors)) {
      // Clean up history data
      const history = getMonitorData(guildId, botId, 'history');
      const originalHistoryLength = history.events.length;
      
      // Keep only events newer than retention period
      history.events = history.events.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= oldestHistoryDate;
      });
      
      historyEventsRemoved += originalHistoryLength - history.events.length;
      
      // Save updated history
      saveMonitorData(guildId, botId, 'history');
      
      // Clean up daily stats
      const daily = getMonitorData(guildId, botId, 'daily');
      const originalDailyKeys = Object.keys(daily.days || {}).length;
      
      // Keep only daily stats newer than retention period
      for (const dateKey of Object.keys(daily.days || {})) {
        const parts = dateKey.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
          const day = parseInt(parts[2]);
          
          const entryDate = new Date(year, month, day);
          if (entryDate < oldestDailyDate) {
            delete daily.days[dateKey];
          }
        }
      }
      
      dailyEntriesRemoved += originalDailyKeys - Object.keys(daily.days || {}).length;
      
      // Save updated daily stats
      saveMonitorData(guildId, botId, 'daily');
    }
    
    log('success', `Data cleanup complete for guild ${guildId}. Removed ${historyEventsRemoved} history events and ${dailyEntriesRemoved} daily stat entries.`, 'DB');
    
    return {
      historyEventsRemoved,
      dailyEntriesRemoved
    };
  } catch (error) {
    log('error', `Error cleaning up old data for guild ${guildId}: ${error.message}`, 'DB');
    throw error;
  }
}

// Function to set up automatic data cleanup
function setupAutoCleanup() {
  if (!CONFIG.dataRetention.enableAutoCleanup) {
    log('info', 'Automatic data cleanup is disabled', 'DB');
    return;
  }
  
  // Run once per day (24 hours)
  const cleanupInterval = setInterval(async () => {
    log('info', 'Starting scheduled data cleanup', 'DB');
    
    for (const guildId of Object.keys(STATE.guilds)) {
      try {
        await cleanupOldData(guildId);
        log('info', `Completed scheduled cleanup for guild ${guildId}`, 'DB');
      } catch (e) {
        log('error', `Failed scheduled cleanup for guild ${guildId}: ${e.message}`, 'DB');
      }
    }
  }, CONFIG.dataRetention.autoCleanupInterval);
  
  STATE.cleanupInterval = cleanupInterval;
  log('info', `Automatic data cleanup scheduled to run every ${CONFIG.dataRetention.autoCleanupInterval / (60 * 60 * 1000)} hours`, 'DB');
}

// Register commands with retry functionality
async function registerCommands(guildId) {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      log('info', `Registering commands for guild ${guildId}${retryCount > 0 ? ` (Attempt ${retryCount + 1}/${maxRetries})` : ''}...`, 'DISCORD');
      const rest = new REST({ version: '10' }).setToken(CONFIG.token);
      
      await rest.put(
        Routes.applicationGuildCommands(CONFIG.clientId, guildId),
        { body: COMMANDS }
      );
      
      log('success', `Registered ${COMMANDS.length} commands for guild ${guildId}`, 'DISCORD');
      return true;
    } catch (e) { 
      retryCount++;
      const retryDelay = retryCount * 1000; // Incremental backoff
      
      log('error', `Error registering commands: ${e.message}${retryCount < maxRetries ? `, retrying in ${retryDelay}ms...` : ''}`, 'DISCORD');
      
      if (retryCount < maxRetries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        return false;
      }
    } 
  }
  
  return false;
}

// Error handler for interactions
const handleError = async (interaction, error, ephemeral = false) => {
  try {
    log('error', `Interaction error: ${error.message} (Guild: ${interaction.guildId}, User: ${interaction.user.id})`, 'DISCORD');
    log('debug', `Error stack: ${error.stack}`, 'DISCORD');
    
    const embed = new EmbedBuilder()
      .setTitle('❌ Operation Failed')
      .setDescription(`We encountered an issue: ${error.message}`)
      .setColor(CONFIG.colors.error)
      .setFooter({ text: `${CONFIG.branding.name} v${CONFIG.version} | ${CONFIG.branding.copyright}` });
      
    if (interaction.deferred) {
      await interaction.editReply({ embeds: [embed], ephemeral }).catch(() => {});
    } else if (interaction.replied) {
      await interaction.followUp({ embeds: [embed], ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
    }
  } catch (err) {
    log('error', `Failed to send error response: ${err.message}`, 'DISCORD');
  }
};

/**
 * COMMAND HANDLERS
 */
const commandHandlers = {
  // Setup command handler
  async setup(interaction) {
    try {
      // Check if user has administrator permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Permission Denied')
            .setDescription('Only server administrators can use this command.')
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Defer reply since setup might take time
      await interaction.deferReply();
      
      // Get options
      const adminRole = interaction.options.getRole('admin_role');
      const logChannel = interaction.options.getChannel('log_channel');
      const checkInterval = interaction.options.getInteger('default_check_interval');
      const dailySummary = interaction.options.getBoolean('daily_summary');
      const autoMonitor = interaction.options.getBoolean('auto_monitor');
      const notifyOnChange = interaction.options.getBoolean('notify_on_status_change');
      const detailedNotifications = interaction.options.getBoolean('detailed_notifications');
      const priorityRole = interaction.options.getRole('priority_role');
      const excludeRole = interaction.options.getRole('exclude_role');
      const monitorOffline = interaction.options.getBoolean('monitor_offline');
      
      // Get guild configuration
      const guild = getGuildConfig(interaction.guildId);
      
      // Update configuration
      if (adminRole) guild.adminRoleId = adminRole.id;
      if (logChannel && logChannel.isTextBased()) guild.logChannelId = logChannel.id;
      
      // Update settings
      if (!guild.settings) guild.settings = {};
      
      if (checkInterval !== null) guild.settings.defaultCheckInterval = Math.max(CONFIG.minCheckInterval, checkInterval);
      if (dailySummary !== null) guild.settings.defaultDailySummary = dailySummary;
      if (autoMonitor !== null) guild.settings.autoMonitorNewBots = autoMonitor;
      if (notifyOnChange !== null) guild.settings.notifyOnStatusChange = notifyOnChange;
      if (detailedNotifications !== null) guild.settings.detailedNotifications = detailedNotifications;
      if (priorityRole) guild.settings.priorityRoleId = priorityRole.id;
      if (excludeRole) guild.settings.excludeRoleId = excludeRole.id;
      if (monitorOffline !== null) guild.settings.monitorOffline = monitorOffline;
      
      // Save changes
      saveGuildConfig(interaction.guildId);
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Bot Monitor Pro Setup Complete')
        .setDescription('Your bot monitoring configuration has been updated.')
        .setColor(CONFIG.colors.success)
        .setFooter({ text: `${CONFIG.branding.name} v${CONFIG.version} | ${CONFIG.branding.copyright}` });
        
      // Add fields for configured settings
      if (adminRole) embed.addFields({ name: 'Admin Role', value: `<@&${adminRole.id}>`, inline: true });
      if (logChannel) embed.addFields({ name: 'Log Channel', value: `<#${logChannel.id}>`, inline: true });
      if (checkInterval !== null) embed.addFields({ name: 'Check Interval', value: `${guild.settings.defaultCheckInterval} seconds`, inline: true });
      if (dailySummary !== null) embed.addFields({ name: 'Daily Summary', value: dailySummary ? 'Enabled' : 'Disabled', inline: true });
      if (autoMonitor !== null) embed.addFields({ name: 'Auto-Monitor New Bots', value: autoMonitor ? 'Enabled' : 'Disabled', inline: true });
      if (notifyOnChange !== null) embed.addFields({ name: 'Status Change Notifications', value: notifyOnChange ? 'Enabled' : 'Disabled', inline: true });
      if (priorityRole) embed.addFields({ name: 'Priority Role', value: `<@&${priorityRole.id}>`, inline: true });
      if (excludeRole) embed.addFields({ name: 'Exclude Role', value: `<@&${excludeRole.id}>`, inline: true });
      if (monitorOffline !== null) embed.addFields({ name: 'Monitor Offline Status', value: monitorOffline ? 'Enabled' : 'Disabled', inline: true });
      
      await interaction.editReply({ embeds: [embed] });
      
      // Log the setup action
      if (guild.logChannelId) {
        try {
          const logChannel = await interaction.guild.channels.fetch(guild.logChannelId).catch(() => null);
          if (logChannel && logChannel.isTextBased()) {
            const logEmbed = new EmbedBuilder()
              .setTitle('⚙️ Bot Monitor Pro Setup')
              .setDescription(`${interaction.user.tag} (${interaction.user.id}) updated monitoring configuration.`)
              .setColor(CONFIG.colors.info)
              .setTimestamp()
              .setFooter({ text: CONFIG.branding.copyright });
            
            await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
          }
        } catch (e) {
          log('error', `Failed to send setup log: ${e.message}`, 'DISCORD');
        }
      }
    } catch (error) {
      await handleError(interaction, error);
    }
  },
  
  // Monitor command handler
  async monitor(interaction) {
    try {
      // Check if user has necessary permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && 
          !hasAdminRole(interaction.member, interaction.guildId)) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Permission Denied')
            .setDescription('You need the Manage Server permission to use this command.')
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Get options
      const member = interaction.options.getMember('bot');
      const excludeOffline = interaction.options.getBoolean('exclude_offline');
      const priority = interaction.options.getBoolean('priority');
      
      if (!member) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Bot Not Found')
            .setDescription('The specified bot could not be found in this server.')
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Check if the member is a bot
      if (!member.user.bot) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Not a Bot')
            .setDescription('This monitor is designed for Discord bots only. The user you selected is not a bot.')
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Create a unique operation ID to track this monitoring setup
      const operationId = uuidv4();
      
      // Create form for additional settings
      const modal = new ModalBuilder()
        .setCustomId(`monitor_modal_${operationId}_${member.id}`)
        .setTitle(`Monitor Bot: ${member.user.username}`);
      
      // Add form fields
      const excludeOfflineInput = new TextInputBuilder()
        .setCustomId('exclude_offline')
        .setLabel('Exclude Offline Notifications? (yes/no)')
        .setStyle(TextInputStyle.Short)
        .setValue(excludeOffline === true ? 'yes' : 'no')
        .setPlaceholder('Type "yes" to exclude offline notifications')
        .setRequired(true);
      
      const priorityInput = new TextInputBuilder()
        .setCustomId('priority')
        .setLabel('Priority Bot? (yes/no)')
        .setStyle(TextInputStyle.Short)
        .setValue(priority === true ? 'yes' : 'no')
        .setPlaceholder('Type "yes" for priority monitoring')
        .setRequired(true);
      
      const dailySummaryInput = new TextInputBuilder()
        .setCustomId('daily_summary')
        .setLabel('Daily Summary? (yes/no)')
        .setStyle(TextInputStyle.Short)
        .setValue('no')
        .setPlaceholder('Type "yes" for daily activity summaries')
        .setRequired(true);
      
      const notesInput = new TextInputBuilder()
        .setCustomId('notes')
        .setLabel('Monitoring Notes (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Add any notes about why this bot is being monitored')
        .setRequired(false);
      
      // Add inputs to action rows
      const excludeOfflineRow = new ActionRowBuilder().addComponents(excludeOfflineInput);
      const priorityRow = new ActionRowBuilder().addComponents(priorityInput);
      const dailySummaryRow = new ActionRowBuilder().addComponents(dailySummaryInput);
      const notesRow = new ActionRowBuilder().addComponents(notesInput);
      
      // Add rows to modal
      modal.addComponents(excludeOfflineRow, priorityRow, dailySummaryRow, notesRow);
      
      // Show the modal
      await interaction.showModal(modal);
    } catch (error) {
      await handleError(interaction, error);
    }
  },
  
  // Monitor all command handler
  async 'monitor-all'(interaction) {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Permission Denied')
            .setDescription('Only server administrators can use this command.')
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Get options
      const role = interaction.options.getRole('role');
      const priorityRole = interaction.options.getRole('priority_role');
      
      // Count bots only
      let estimatedCount;
      let filterDescription = '';
      
      const botMembers = interaction.guild.members.cache.filter(m => m.user.bot);
      
      if (role) {
        estimatedCount = botMembers.filter(m => m.roles.cache.has(role.id)).size;
        filterDescription = `with the role ${role.name}`;
      } else {
        estimatedCount = botMembers.size;
        filterDescription = 'in this server';
      }
      
      filterDescription += ' (Discord bots only)';
      
      // Create operation ID for tracking this bulk operation
      const operationId = uuidv4();
      STATE.pendingBulkOperations[operationId] = {
        guildId: interaction.guildId,
        userId: interaction.user.id,
        role: role?.id,
        priorityRole: priorityRole?.id,
        timestamp: Date.now()
      };
      
      // Create confirmation buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId(`confirm_monitor_all_${operationId}`)
        .setLabel('Configure & Confirm')
        .setStyle(ButtonStyle.Primary);
      
      const cancelButton = new ButtonBuilder()
        .setCustomId(`cancel_monitor_all_${operationId}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);
        
      const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
      
      // Send confirmation message
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('⚠️ Bulk Monitoring Confirmation')
          .setDescription(`You are about to add Discord bots ${filterDescription} to monitoring.
          
This can cause significant server load and notifications.
          
Please click **Configure & Confirm** to proceed with additional settings, or **Cancel** to abort.`)
          .setColor(CONFIG.colors.warning)],
        components: [row]
      });
      
      // Expire the operation after 5 minutes
      setTimeout(() => {
        delete STATE.pendingBulkOperations[operationId];
      }, 300000);
    } catch (error) {
      await handleError(interaction, error);
    }
  },
  
  // Delete monitor command handler
  async 'del-monitor'(interaction) {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && 
          !hasAdminRole(interaction.member, interaction.guildId)) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Permission Denied')
            .setDescription('You need the Manage Server permission to use this command.')
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Get options
      const member = interaction.options.getMember('bot') || 
                     { id: interaction.options.getUser('bot').id, user: interaction.options.getUser('bot') };
      
      // Check if bot is monitored
      const guild = getGuildConfig(interaction.guildId);
      if (!guild.monitors[member.id]) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Not Monitored')
            .setDescription(`<@${member.id}> is not currently being monitored.`)
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Remove monitor
      await removeMonitor(interaction.guildId, member.id);
      
      // Send confirmation
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('✅ Monitoring Stopped')
          .setDescription(`Stopped monitoring <@${member.id}> (${member.user.tag || 'Unknown Bot'})`)
          .setColor(CONFIG.colors.success)
          .setFooter({ text: CONFIG.branding.copyright })]
      });
      
      // Log to log channel
      if (guild.logChannelId) {
        try {
          const logChannel = await interaction.guild.channels.fetch(guild.logChannelId).catch(() => null);
          if (logChannel && logChannel.isTextBased()) {
            const logEmbed = new EmbedBuilder()
              .setTitle('🚫 Bot Monitoring Removed')
              .setDescription(`<@${interaction.user.id}> stopped monitoring <@${member.id}> (${member.user.tag || 'Unknown Bot'})`)
              .setColor(CONFIG.colors.info)
              .setTimestamp()
              .setFooter({ text: CONFIG.branding.copyright });
            
            await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
          }
        } catch (e) {
          log('error', `Failed to send log: ${e.message}`, 'DISCORD');
        }
      }
    } catch (error) {
      await handleError(interaction, error);
    }
  },
  
  // Update monitor settings
  async 'monitor-settings'(interaction) {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && 
          !hasAdminRole(interaction.member, interaction.guildId)) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Permission Denied')
            .setDescription('You need the Manage Server permission to use this command.')
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Get options
      const member = interaction.options.getMember('bot') || 
                     { id: interaction.options.getUser('bot').id, user: interaction.options.getUser('bot') };
      const excludeOffline = interaction.options.getBoolean('exclude_offline');
      const priority = interaction.options.getBoolean('priority');
      const dailySummary = interaction.options.getBoolean('daily_summary');
      
      // Check if bot is monitored
      const guild = getGuildConfig(interaction.guildId);
      if (!guild.monitors[member.id]) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Not Monitored')
            .setDescription(`<@${member.id}> is not currently being monitored.`)
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Update settings
      let changes = [];
      
      if (excludeOffline !== null) {
        guild.monitors[member.id].excludeOffline = excludeOffline;
        changes.push(`Exclude Offline: ${excludeOffline ? 'Yes' : 'No'}`);
      }
      
      if (priority !== null) {
        guild.monitors[member.id].priorityBot = priority;
        changes.push(`Priority Bot: ${priority ? 'Yes' : 'No'}`);
      }
      
      if (dailySummary !== null) {
        guild.monitors[member.id].dailySummary = dailySummary;
        changes.push(`Daily Summary: ${dailySummary ? 'Yes' : 'No'}`);
      }
      
      // Save changes
      saveGuildConfig(interaction.guildId);
      
      // Send confirmation
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('✅ Monitor Settings Updated')
          .setDescription(`Updated monitoring settings for <@${member.id}> (${member.user.tag || 'Unknown Bot'})`)
          .addFields({ name: 'Changes', value: changes.join('\n') })
          .setColor(CONFIG.colors.success)
          .setFooter({ text: CONFIG.branding.copyright })]
      });
      
      // Log to log channel
      if (guild.logChannelId) {
        try {
          const logChannel = await interaction.guild.channels.fetch(guild.logChannelId).catch(() => null);
          if (logChannel && logChannel.isTextBased()) {
            const logEmbed = new EmbedBuilder()
              .setTitle('⚙️ Monitor Settings Changed')
              .setDescription(`<@${interaction.user.id}> updated monitor settings for <@${member.id}> (${member.user.tag || 'Unknown Bot'})`)
              .addFields({ name: 'Changes', value: changes.join('\n') })
              .setColor(CONFIG.colors.info)
              .setTimestamp()
              .setFooter({ text: CONFIG.branding.copyright });
            
            await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
          }
        } catch (e) {
          log('error', `Failed to send log: ${e.message}`, 'DISCORD');
        }
      }
    } catch (error) {
      await handleError(interaction, error);
    }
  },
  
  // List monitors command
  async 'list-monitors'(interaction) {
    try {
      // Get options
      const statusFilter = interaction.options.getString('status') || 'all';
      const roleFilter = interaction.options.getRole('role');
      
      // Get guild data
      const guild = getGuildConfig(interaction.guildId);
      const monitorCount = Object.keys(guild.monitors).length;
      
      if (monitorCount === 0) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('📋 No Active Monitors')
            .setDescription('There are no bots being monitored in this server yet.')
            .setColor(CONFIG.colors.info)]
        });
      }
      
      // Defer reply since this might take time
      await interaction.deferReply();
      
      // Build list of monitors
      let monitors = [];
      
      for (const botId of Object.keys(guild.monitors)) {
        try {
          const activityData = getMonitorData(interaction.guildId, botId, 'activity');
          
          // Apply status filter
          if (statusFilter !== 'all' && activityData.status !== statusFilter) continue;
          
          // Apply role filter
          if (roleFilter && (!activityData.roles || !activityData.roles.includes(roleFilter.id))) continue;
          
          monitors.push({
            id: botId,
            tag: activityData.tag || 'Unknown Bot',
            status: activityData.status || 'unknown',
            lastStatusChange: activityData.lastStatusChange || null,
            priorityBot: guild.monitors[botId].priorityBot || false
          });
        } catch (e) {
          log('error', `Error getting monitor data for ${botId}: ${e.message}`, 'DB');
        }
      }
      
      // Sort monitors by priority first, then status (online first), then username
      monitors.sort((a, b) => {
        if (a.priorityBot !== b.priorityBot) return b.priorityBot ? 1 : -1;
        if (a.status !== b.status) {
          if (a.status === 'online') return -1;
          if (b.status === 'online') return 1;
        }
        return a.tag.localeCompare(b.tag);
      });
      
      // Create pages of 15 monitors each
      const pageSize = 15;
      const pages = [];
      
      for (let i = 0; i < monitors.length; i += pageSize) {
        const pageMonitors = monitors.slice(i, i + pageSize);
        
        let description = `**Monitored Bots: ${monitors.length}**\n`;
        if (statusFilter !== 'all') description += `*Filtered by status: ${statusFilter}*\n`;
        if (roleFilter) description += `*Filtered by role: ${roleFilter.name}*\n`;
        description += '\n';
        
        for (const monitor of pageMonitors) {
          const statusEmoji = getStatusEmoji(monitor.status);
          const lastChange = monitor.lastStatusChange ? 
            `<t:${Math.floor(new Date(monitor.lastStatusChange).getTime() / 1000)}:R>` : 'Unknown';
          
          description += `${statusEmoji} ${monitor.priorityBot ? '⭐ ' : ''}**${monitor.tag}**\n`;
          description += `└ ID: \`${monitor.id}\` • Last change: ${lastChange}\n`;
        }
        
        pages.push(description);
      }
      
      if (pages.length === 0) {
        return await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle('📋 No Matching Monitors')
            .setDescription('No monitored bots match your filter criteria.')
            .setColor(CONFIG.colors.info)]
        });
      }
      
      // Create embed for first page
      const embed = new EmbedBuilder()
        .setTitle('📋 Monitored Bots')
        .setDescription(pages[0])
        .setColor(CONFIG.colors.info)
        .setFooter({ text: pages.length > 1 ? 
          `Page 1/${pages.length} • ${CONFIG.branding.name} v${CONFIG.version}` : 
          `${CONFIG.branding.name} v${CONFIG.version} • ${CONFIG.branding.copyright}` 
        });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      await handleError(interaction, error);
    }
  },
  
  // Check bot status
  async 'bot-status'(interaction) {
    try {
      // Get bot
      const member = interaction.options.getMember('bot') || 
                    { id: interaction.options.getUser('bot').id, user: interaction.options.getUser('bot') };
      
      // Check if bot is monitored
      const guild = getGuildConfig(interaction.guildId);
      if (!guild.monitors[member.id]) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❓ Not Monitored')
            .setDescription(`<@${member.id}> is not currently being monitored.`)
            .setColor(CONFIG.colors.neutral)],
          ephemeral: true
        });
      }
      
      // Get activity data
      const activityData = getMonitorData(interaction.guildId, member.id, 'activity');
      
      // Get bot's current presence if available
      let realTimeStatus = 'Unknown';
      let realTimeActivity = null;
      
      try {
        const guildObj = await client.guilds.fetch(interaction.guildId);
        const memberObj = await guildObj.members.fetch(member.id);
        
        if (memberObj && memberObj.presence) {
          realTimeStatus = memberObj.presence.status;
          if (memberObj.presence.activities && memberObj.presence.activities.length > 0) {
            const activity = memberObj.presence.activities[0];
            realTimeActivity = {
              type: activity.type,
              name: activity.name,
              details: activity.details,
              state: activity.state
            };
          }
        }
      } catch (e) {
        log('error', `Error fetching real-time presence: ${e.message}`, 'DISCORD');
      }
      
      // Calculate durations
      const lastStatusChange = new Date(activityData.lastStatusChange || Date.now());
      const currentStatus = activityData.status || 'offline';
      const statusDuration = formatTime(Date.now() - lastStatusChange.getTime());
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${getStatusEmoji(currentStatus)} Bot Status`)
        .setDescription(`Status information for <@${member.id}> (${activityData.tag || 'Unknown Bot'})`)
        .setColor(getStatusColor(currentStatus))
        .addFields(
          { name: 'Current Status', value: `${currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)} for ${statusDuration}`, inline: true },
          { name: 'Last Status Change', value: `<t:${Math.floor(lastStatusChange.getTime() / 1000)}:F>`, inline: true }
        );
      
      if (guild.monitors[member.id].priorityBot) {
        embed.addFields({ name: 'Priority', value: '⭐ Priority Bot', inline: true });
      }
      
      // Add real-time status if different
      if (realTimeStatus !== 'Unknown' && realTimeStatus !== currentStatus) {
        embed.addFields({ 
          name: '⚠️ Real-time Status', 
          value: `Currently showing as ${realTimeStatus} (not yet recorded)`, 
          inline: false 
        });
      }
      
      // Add current activity if available
      if (realTimeActivity) {
        const activityEmoji = getActivityEmoji(realTimeActivity.type);
        let activityText = `${activityEmoji} ${realTimeActivity.name}`;
        
        if (realTimeActivity.details) activityText += `\n${realTimeActivity.details}`;
        if (realTimeActivity.state) activityText += `\n${realTimeActivity.state}`;
        
        embed.addFields({ name: 'Current Activity', value: activityText, inline: false });
      }
      
      // Add monitor settings info
      embed.addFields({
        name: 'Monitor Settings',
        value: `Exclude Offline: ${guild.monitors[member.id].excludeOffline ? 'Yes' : 'No'}
Daily Summary: ${guild.monitors[member.id].dailySummary ? 'Yes' : 'No'}
Check Interval: ${guild.monitors[member.id].checkInterval}s`,
        inline: true
      });
      
      // Add online stats
      const onlinePct = formatPct(activityData.onlinePercentage || 0);
      const avgSession = formatTime(activityData.avgSessionDuration || 0);
      const longestSession = formatTime(activityData.longestSession || 0);
      
      embed.addFields({
        name: 'Activity Stats',
        value: `Online: ${onlinePct}
Avg Session: ${avgSession}
Longest: ${longestSession}`,
        inline: true
      });
      
      // Add thumbnail
      if (activityData.avatar) {
        embed.setThumbnail(activityData.avatar);
      }
      
      // Set footer
      embed.setFooter({ text: `${CONFIG.branding.name} v${CONFIG.version} | ${CONFIG.branding.copyright}` });
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await handleError(interaction, error);
    }
  },
  
  // Activity info command
  async 'activity-info'(interaction) {
    try {
      // Get bot
      const member = interaction.options.getMember('bot') || 
                    { id: interaction.options.getUser('bot').id, user: interaction.options.getUser('bot') };
      
      // Check if bot is monitored
      const guild = getGuildConfig(interaction.guildId);
      if (!guild.monitors[member.id]) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❓ Not Monitored')
            .setDescription(`<@${member.id}> is not currently being monitored.`)
            .setColor(CONFIG.colors.neutral)],
          ephemeral: true
        });
      }
      
      // Get activity data
      const activityData = getMonitorData(interaction.guildId, member.id, 'activity');
      const dailyStats = getMonitorData(interaction.guildId, member.id, 'daily');
      
      // Create bar for online percentage
      const onlinePct = activityData.onlinePercentage || 0;
      const barLength = 20;
      const filledBars = Math.round((onlinePct / 100) * barLength);
      const emptyBars = barLength - filledBars;
      const onlineBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`📊 Activity Stats for ${activityData.tag || 'Unknown Bot'}`)
        .setDescription(`Activity statistics for <@${member.id}>\n\n**Online Time: ${formatPct(onlinePct)}**\n${onlineBar}`)
        .setColor(CONFIG.colors.info)
        .addFields(
          { name: 'Current Status', value: `${getStatusEmoji(activityData.status)} ${activityData.status.charAt(0).toUpperCase() + activityData.status.slice(1)}`, inline: true },
          { name: 'Last Status Change', value: activityData.lastStatusChange ? `<t:${Math.floor(new Date(activityData.lastStatusChange).getTime() / 1000)}:R>` : 'Unknown', inline: true },
          { name: 'Bot Added', value: activityData.joinedAt ? `<t:${Math.floor(new Date(activityData.joinedAt).getTime() / 1000)}:R>` : 'Unknown', inline: true },
          { name: 'Total Online Time', value: formatTime(activityData.totalOnlineTime || 0), inline: true },
          { name: 'Total Offline Time', value: formatTime(activityData.totalOfflineTime || 0), inline: true },
          { name: 'Average Session', value: formatTime(activityData.avgSessionDuration || 0), inline: true },
          { name: 'Longest Session', value: formatTime(activityData.longestSession || 0), inline: true }
        );
      
      // Add recent activity
      if (activityData.presenceHistory && activityData.presenceHistory.length > 0) {
        let historyText = '';
        const recentEvents = activityData.presenceHistory.slice(0, 3);
        
        for (const event of recentEvents) {
          const timestamp = `<t:${Math.floor(new Date(event.timestamp).getTime() / 1000)}:R>`;
          
          if (event.status === 'online') {
            historyText += `${getStatusEmoji('online')} Came online ${timestamp}\n`;
          } else {
            historyText += `${getStatusEmoji('offline')} Went offline ${timestamp} (Session: ${event.formattedOnlineTime || 'Unknown'})\n`;
          }
        }
        
        embed.addFields({ name: 'Recent Activity', value: historyText || 'No recent activity', inline: false });
      }
      
      // Add thumbnail
      if (activityData.avatar) {
        embed.setThumbnail(activityData.avatar);
      }
      
      // Set footer
      embed.setFooter({ text: `${CONFIG.branding.name} v${CONFIG.version} | ${CONFIG.branding.copyright}` });
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await handleError(interaction, error);
    }
  },

  // Status history command
  async 'status-history'(interaction) {
    try {
      // Get options
      const member = interaction.options.getMember('bot') || 
                    { id: interaction.options.getUser('bot').id, user: interaction.options.getUser('bot') };
      const limit = interaction.options.getInteger('limit') || 5;
      
      // Check if bot is monitored
      const guild = getGuildConfig(interaction.guildId);
      if (!guild.monitors[member.id]) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❓ Not Monitored')
            .setDescription(`<@${member.id}> is not currently being monitored.`)
            .setColor(CONFIG.colors.neutral)],
          ephemeral: true
        });
      }
      
      // Get history data
      const history = getMonitorData(interaction.guildId, member.id, 'history');
      const activityData = getMonitorData(interaction.guildId, member.id, 'activity');
      
      if (!history.events || history.events.length === 0) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('📜 No History')
            .setDescription(`No status history found for <@${member.id}>.`)
            .setColor(CONFIG.colors.neutral)]
        });
      }
      
      // Get recent events
      const recentEvents = history.events.slice(0, Math.min(limit, 20));
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`📜 Status History for ${activityData.tag || 'Unknown Bot'}`)
        .setDescription(`Recent status changes for <@${member.id}>`)
        .setColor(CONFIG.colors.info);
      
      // Add history entries
      for (let i = 0; i < recentEvents.length; i++) {
        const event = recentEvents[i];
        const timestamp = `<t:${Math.floor(new Date(event.timestamp).getTime() / 1000)}:F>`;
        
        let value;
        if (event.status === 'online') {
          value = `${getStatusEmoji('online')} Came online\n`;
          value += `Offline for: ${event.formattedOfflineTime || formatTime(event.offlineTime) || 'Unknown'}`;
        } else {
          value = `${getStatusEmoji('offline')} Went offline\n`;
          value += `Session duration: ${event.formattedOnlineTime || formatTime(event.onlineTime) || 'Unknown'}`;
          
          if (event.reason) {
            value += `\nReason: ${event.reason}`;
          }
        }
        
        embed.addFields({
          name: `${i + 1}. ${timestamp}`,
          value: value,
          inline: false
        });
      }
      
      // Add thumbnail
      if (activityData.avatar) {
        embed.setThumbnail(activityData.avatar);
      }
      
      // Set footer
      embed.setFooter({ text: `${CONFIG.branding.name} v${CONFIG.version} | ${CONFIG.branding.copyright}` });
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await handleError(interaction, error);
    }
  },

  // Bots overview command
  async 'bots-overview'(interaction) {
    try {
      // Get options
      const roleFilter = interaction.options.getRole('role');
      
      // Get guild data
      const guild = getGuildConfig(interaction.guildId);
      const monitorCount = Object.keys(guild.monitors).length;
      
      if (monitorCount === 0) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('📋 No Active Monitors')
            .setDescription('There are no bots being monitored in this server yet.')
            .setColor(CONFIG.colors.info)]
        });
      }
      
      // Defer reply since this might take time
      await interaction.deferReply();
      
      // Collect data for overview
      let onlineCount = 0;
      let offlineCount = 0;
      let priorityCount = 0;
      let priorityOnline = 0;
      let recentChanges = 0;
      let totalSessionTime = 0;
      let sessionCount = 0;
      
      // Get time 24 hours ago
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      // Process each monitor
      for (const botId of Object.keys(guild.monitors)) {
        try {
          // Skip if role filter is applied and bot doesn't have the role
          if (roleFilter) {
            if (!guild.monitors[botId].roles || !guild.monitors[botId].roles.includes(roleFilter.id)) {
              continue;
            }
          }
          
          const activityData = getMonitorData(interaction.guildId, botId, 'activity');
          
          // Count status
          if (activityData.status === 'online') {
            onlineCount++;
          } else {
            offlineCount++;
          }
          
          // Count priority bots
          if (guild.monitors[botId].priorityBot) {
            priorityCount++;
            if (activityData.status === 'online') {
              priorityOnline++;
            }
          }
          
          // Count recent changes (in last 24 hours)
          if (activityData.lastStatusChange) {
            const lastChange = new Date(activityData.lastStatusChange);
            if (lastChange > twentyFourHoursAgo) {
              recentChanges++;
            }
          }
          
          // Collect session data for averages
          if (activityData.avgSessionDuration) {
            totalSessionTime += activityData.avgSessionDuration;
            sessionCount++;
          }
        } catch (e) {
          log('error', `Error processing monitor data for ${botId}: ${e.message}`, 'DB');
        }
      }
      
      // Calculate effective number of monitors (after role filter)
      const effectiveCount = onlineCount + offlineCount;
      
      if (effectiveCount === 0) {
        return await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle('📋 No Matching Monitors')
            .setDescription('No monitored bots match your filter criteria.')
            .setColor(CONFIG.colors.info)]
        });
      }
      
      // Calculate averages
      const onlinePct = effectiveCount > 0 ? (onlineCount / effectiveCount) * 100 : 0;
      const avgSessionTime = sessionCount > 0 ? totalSessionTime / sessionCount : 0;
      
      // Create bar for online percentage
      const barLength = 20;
      const filledBars = Math.round((onlinePct / 100) * barLength);
      const emptyBars = barLength - filledBars;
      const onlineBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('🤖 MonkeyBytes Bot Network Overview')
        .setDescription(`Overview of all monitored bots${roleFilter ? ` with role ${roleFilter.name}` : ''}\n\n**Online: ${formatPct(onlinePct)}**\n${onlineBar}`)
        .setColor(CONFIG.colors.royal)
        .addFields(
          { name: 'Total Monitored', value: effectiveCount.toString(), inline: true },
          { name: 'Currently Online', value: onlineCount.toString(), inline: true },
          { name: 'Currently Offline', value: offlineCount.toString(), inline: true },
          { name: 'Priority Bots', value: `${priorityOnline}/${priorityCount} online`, inline: true },
          { name: 'Recent Changes', value: `${recentChanges} in last 24h`, inline: true },
          { name: 'Avg Session', value: formatTime(avgSessionTime), inline: true }
        )
        .setFooter({ text: `${CONFIG.branding.name} v${CONFIG.version} | ${CONFIG.branding.copyright}` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await handleError(interaction, error);
    }
  },

  // Pause monitoring command
  async 'pause-monitoring'(interaction) {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && 
          !hasAdminRole(interaction.member, interaction.guildId)) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Permission Denied')
            .setDescription('You need the Manage Server permission to use this command.')
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Get options
      const member = interaction.options.getMember('bot') || 
                    { id: interaction.options.getUser('bot').id, user: interaction.options.getUser('bot') };
      const duration = interaction.options.getInteger('duration') || 30; // Default 30 minutes
      
      // Check if bot is monitored
      const guild = getGuildConfig(interaction.guildId);
      if (!guild.monitors[member.id]) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❓ Not Monitored')
            .setDescription(`<@${member.id}> is not currently being monitored.`)
            .setColor(CONFIG.colors.neutral)],
          ephemeral: true
        });
      }
      
      // Add bot to paused list
      STATE.monitoring.pausedBots.add(member.id);
      
      // Set up auto-resume timer
      setTimeout(() => {
        STATE.monitoring.pausedBots.delete(member.id);
        log('info', `Auto-resumed monitoring for bot ${member.id} after ${duration} minutes`, 'DB');
        
        // Send notification if log channel exists
        if (guild.logChannelId) {
          try {
            const logEmbed = new EmbedBuilder()
              .setTitle('▶️ Monitoring Auto-Resumed')
              .setDescription(`Monitoring has been automatically resumed for <@${member.id}> after ${duration} minutes.`)
              .setColor(CONFIG.colors.success)
              .setTimestamp()
              .setFooter({ text: CONFIG.branding.copyright });
            
            queueMessage(guild.logChannelId, { embeds: [logEmbed] });
          } catch (e) { 
            log('error', `Failed to send auto-resume notification: ${e.message}`, 'DISCORD'); 
          }
        }
      }, duration * 60 * 1000);
      
      // Send confirmation
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('⏸️ Monitoring Paused')
          .setDescription(`Monitoring for <@${member.id}> has been paused for ${duration} minutes.\nUse \`/resume-monitoring\` to resume earlier.`)
          .setColor(CONFIG.colors.warning)
          .setFooter({ text: CONFIG.branding.copyright })]
      });
      
      // Log to log channel
      if (guild.logChannelId) {
        try {
          const logEmbed = new EmbedBuilder()
            .setTitle('⏸️ Monitoring Paused')
            .setDescription(`<@${interaction.user.id}> paused monitoring for <@${member.id}> for ${duration} minutes.`)
            .setColor(CONFIG.colors.warning)
            .setTimestamp()
            .setFooter({ text: CONFIG.branding.copyright });
          
          queueMessage(guild.logChannelId, { embeds: [logEmbed] });
        } catch (e) { 
          log('error', `Failed to send pause notification: ${e.message}`, 'DISCORD'); 
        }
      }
    } catch (error) {
      await handleError(interaction, error);
    }
  },

  // Resume monitoring command
  async 'resume-monitoring'(interaction) {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && 
          !hasAdminRole(interaction.member, interaction.guildId)) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Permission Denied')
            .setDescription('You need the Manage Server permission to use this command.')
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Get options
      const member = interaction.options.getMember('bot') || 
                    { id: interaction.options.getUser('bot').id, user: interaction.options.getUser('bot') };
      
      // Check if bot is monitored
      const guild = getGuildConfig(interaction.guildId);
      if (!guild.monitors[member.id]) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❓ Not Monitored')
            .setDescription(`<@${member.id}> is not currently being monitored.`)
            .setColor(CONFIG.colors.neutral)],
          ephemeral: true
        });
      }
      
      // Check if bot is actually paused
      if (!STATE.monitoring.pausedBots.has(member.id)) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❓ Not Paused')
            .setDescription(`Monitoring for <@${member.id}> is not currently paused.`)
            .setColor(CONFIG.colors.neutral)],
          ephemeral: true
        });
      }
      
      // Remove from paused list
      STATE.monitoring.pausedBots.delete(member.id);
      
      // Send confirmation
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('▶️ Monitoring Resumed')
          .setDescription(`Monitoring for <@${member.id}> has been resumed.`)
          .setColor(CONFIG.colors.success)
          .setFooter({ text: CONFIG.branding.copyright })]
      });
      
      // Log to log channel
      if (guild.logChannelId) {
        try {
          const logEmbed = new EmbedBuilder()
            .setTitle('▶️ Monitoring Resumed')
            .setDescription(`<@${interaction.user.id}> resumed monitoring for <@${member.id}>.`)
            .setColor(CONFIG.colors.success)
            .setTimestamp()
            .setFooter({ text: CONFIG.branding.copyright });
          
          queueMessage(guild.logChannelId, { embeds: [logEmbed] });
        } catch (e) { 
          log('error', `Failed to send resume notification: ${e.message}`, 'DISCORD'); 
        }
      }
    } catch (error) {
      await handleError(interaction, error);
    }
  },

  // Bot stats command
  async stats(interaction) {
    try {
      // Calculate uptime
      const uptime = formatTime(Date.now() - STATE.stats.startTime);
      
      // Calculate memory usage
      const memoryUsage = process.memoryUsage();
      const usedMem = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;
      const totalMem = Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100;
      
      // Get counts
      const totalGuilds = client.guilds.cache.size;
      const totalMonitors = Object.values(STATE.guilds).reduce((sum, guild) => {
        return sum + Object.keys(guild.monitors || {}).length;
      }, 0);
      
      // Get rates
      const messagesPerMinute = STATE.stats.sentMessages / ((Date.now() - STATE.stats.startTime) / 60000);
      const checksPerMinute = STATE.stats.statusChangesDetected / ((Date.now() - STATE.stats.startTime) / 60000);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`📊 ${CONFIG.branding.name} Stats`)
        .setDescription(`Bot statistics and performance metrics`)
        .setColor(CONFIG.colors.info)
        .addFields(
          { name: 'Uptime', value: uptime, inline: true },
          { name: 'Memory', value: `${usedMem}MB / ${totalMem}MB`, inline: true },
          { name: 'Version', value: CONFIG.version, inline: true },
          { name: 'Servers', value: totalGuilds.toString(), inline: true },
          { name: 'Monitors', value: totalMonitors.toString(), inline: true },
          { name: 'Messages', value: `${STATE.stats.sentMessages} sent\n${STATE.stats.queuedMessages} queued\n${STATE.stats.droppedMessages} dropped`, inline: true },
          { name: 'Status Changes', value: STATE.stats.statusChangesDetected.toString(), inline: true },
          { name: 'Files Written', value: STATE.stats.filesWritten.toString(), inline: true },
          { name: 'Errors', value: STATE.stats.errorCount.toString(), inline: true },
          { name: 'Current Queue', value: `${STATE.messageQueue.queue.length} regular\n${STATE.messageQueue.highPriorityQueue.length} high priority`, inline: true },
          { name: 'Rate', value: `${messagesPerMinute.toFixed(2)} msgs/min\n${checksPerMinute.toFixed(2)} checks/min`, inline: true }
        )
        .setFooter({ text: `${CONFIG.branding.name} v${CONFIG.version} | ${CONFIG.branding.copyright}` })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await handleError(interaction, error);
    }
  },

  // Enhanced Activity Dashboard command - More verbose with comprehensive bot data
  async 'activity-dashboard'(interaction) {
    try {
      // Defer reply since this will be comprehensive
      await interaction.deferReply();
      
      const guild = getGuildConfig(interaction.guildId);
      const monitorCount = Object.keys(guild.monitors).length;
      
      if (monitorCount === 0) {
        return await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle('📊 Activity Dashboard')
            .setDescription('There are no bots being monitored in this server yet.')
            .setColor(CONFIG.colors.info)]
        });
      }
      
      // Collect all monitored bots data
      const botsData = [];
      
      // Get guild object to fetch real-time presence data
      const guildObj = await client.guilds.fetch(interaction.guildId);
      
      // Process each monitored bot
      for (const botId of Object.keys(guild.monitors)) {
        try {
          const activityData = getMonitorData(interaction.guildId, botId, 'activity');
          const dailyStats = getMonitorData(interaction.guildId, botId, 'daily');
          
          // Get real-time presence data
          let realTimeStatus = null;
          let realTimeActivity = null;
          
          try {
            const memberObj = await guildObj.members.fetch(botId).catch(() => null);
            if (memberObj && memberObj.presence) {
              realTimeStatus = memberObj.presence.status;
              if (memberObj.presence.activities && memberObj.presence.activities.length > 0) {
                const activity = memberObj.presence.activities[0];
                realTimeActivity = {
                  type: activity.type,
                  name: activity.name,
                  details: activity.details,
                  state: activity.state
                };
              }
            }
          } catch (e) {
            log('debug', `Could not fetch real-time presence for ${botId}: ${e.message}`, 'DISCORD');
          }
          
          // Calculate time since last status change
          const lastChangeTime = activityData.lastStatusChange ? 
            new Date(activityData.lastStatusChange) : null;
          const timeSinceChange = lastChangeTime ? 
            formatTime(Date.now() - lastChangeTime.getTime()) : 'Unknown';
          
          // Add to bots data array
          botsData.push({
            id: botId,
            tag: activityData.tag || 'Unknown Bot',
            username: activityData.username || 'Unknown',
            avatar: activityData.avatar,
            status: activityData.status || 'unknown',
            realTimeStatus: realTimeStatus,
            realTimeActivity: realTimeActivity,
            lastChange: lastChangeTime,
            timeSinceChange: timeSinceChange,
            onlinePct: activityData.onlinePercentage || 0,
            offlinePct: activityData.offlinePercentage || 0,
            totalOnline: activityData.totalOnlineTime || 0,
            totalOffline: activityData.totalOfflineTime || 0,
            avgSession: activityData.avgSessionDuration || 0,
            longestSession: activityData.longestSession || 0,
            priorityBot: guild.monitors[botId].priorityBot || false,
            excludeOffline: guild.monitors[botId].excludeOffline || false,
            checkInterval: guild.monitors[botId].checkInterval || 0,
            dailySummary: guild.monitors[botId].dailySummary || false,
            joinedAt: activityData.joinedAt ? new Date(activityData.joinedAt) : null,
            monitorStarted: guild.monitors[botId].createdAt ? 
              new Date(guild.monitors[botId].createdAt) : null,
            recentHistory: activityData.presenceHistory || [],
            roles: activityData.roles || []
          });
        } catch (e) {
          log('error', `Error processing dashboard data for bot ${botId}: ${e.message}`, 'DB');
        }
      }
      
      // Sort bots: priority first, then status (online first), then by name
      botsData.sort((a, b) => {
        if (a.priorityBot !== b.priorityBot) return b.priorityBot ? 1 : -1;
        if (a.status !== b.status) {
          if (a.status === 'online') return -1;
          if (b.status === 'online') return 1;
        }
        return a.tag.localeCompare(b.tag);
      });
      
      // Calculate overall statistics
      const onlineCount = botsData.filter(b => b.status === 'online').length;
      const offlineCount = botsData.filter(b => b.status === 'offline').length;
      const priorityCount = botsData.filter(b => b.priorityBot).length;
      const priorityOnline = botsData.filter(b => b.priorityBot && b.status === 'online').length;
      
      // Calculate overall uptime percentage
      const totalOnlineTime = botsData.reduce((sum, bot) => sum + bot.totalOnline, 0);
      const totalOfflineTime = botsData.reduce((sum, bot) => sum + bot.totalOffline, 0);
      const totalTime = totalOnlineTime + totalOfflineTime;
      const overallOnlinePct = totalTime > 0 ? (totalOnlineTime / totalTime) * 100 : 0;
      
      // Create main embed with overview
      const overviewEmbed = new EmbedBuilder()
        .setTitle('📊 MonkeyBytes Comprehensive Bot Dashboard')
        .setDescription(`Detailed monitoring dashboard with real-time data for all bots.\n\n**Overall Uptime: ${formatPct(overallOnlinePct)}**\n`)
        .setColor(CONFIG.colors.royal)
        .addFields(
          { name: 'Total Bots', value: botsData.length.toString(), inline: true },
          { name: 'Online', value: `${onlineCount} (${formatPct(onlineCount / botsData.length * 100)})`, inline: true },
          { name: 'Offline', value: `${offlineCount} (${formatPct(offlineCount / botsData.length * 100)})`, inline: true },
          { name: 'Priority Bots', value: `${priorityOnline}/${priorityCount} online`, inline: true },
          { name: 'Data Since', value: botsData.length > 0 ? 
            `<t:${Math.floor(new Date(STATE.stats.startTime).getTime() / 1000)}:R>` : 'N/A', inline: true 
          }
        )
        .setFooter({ text: `${CONFIG.branding.name} v${CONFIG.version} | ${CONFIG.branding.copyright}` })
        .setTimestamp();
      
      // Create detailed list of bots (max 15 per embed)
      const botEmbeds = [];
      const botsPerEmbed = 8; // Show fewer bots per embed but with more details
      
      for (let i = 0; i < botsData.length; i += botsPerEmbed) {
        const pageData = botsData.slice(i, i + botsPerEmbed);
        
        const embed = new EmbedBuilder()
          .setTitle(`Bot Details (${i+1}-${Math.min(i+botsPerEmbed, botsData.length)} of ${botsData.length})`)
          .setColor(CONFIG.colors.info);
        
        for (const bot of pageData) {
          // Create a status bar visualization
          const barLength = 10;
          const filledBars = Math.round((bot.onlinePct / 100) * barLength);
          const emptyBars = barLength - filledBars;
          const onlineBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
          
          // Add real-time status info
          let statusInfo = `${getStatusEmoji(bot.status)} Recorded: ${bot.status}`;
          if (bot.realTimeStatus && bot.realTimeStatus !== bot.status) {
            statusInfo += ` | ${getStatusEmoji(bot.realTimeStatus)} Real-time: ${bot.realTimeStatus}`;
          }
          
          // Add real-time activity if available
          let activityInfo = '';
          if (bot.realTimeActivity) {
            const activityEmoji = getActivityEmoji(bot.realTimeActivity.type);
            activityInfo = `\n${activityEmoji} ${bot.realTimeActivity.name}`;
            if (bot.realTimeActivity.details) activityInfo += ` - ${bot.realTimeActivity.details}`;
          }
          
          // Create recent history summary if available
          let historyInfo = '';
          if (bot.recentHistory && bot.recentHistory.length > 0) {
            const mostRecent = bot.recentHistory[0];
            historyInfo = `\nLast change: <t:${Math.floor(new Date(mostRecent.timestamp).getTime() / 1000)}:R>`;
          }
          
          // Create settings summary
          const settingsInfo = `\nPriority: ${bot.priorityBot ? '⭐ Yes' : 'No'} | Interval: ${bot.checkInterval}s | Daily Summary: ${bot.dailySummary ? 'Yes' : 'No'}`;
          
          // Add all info to the embed
          embed.addFields({
            name: `${bot.priorityBot ? '⭐ ' : ''}${bot.tag}`,
            value: `${statusInfo}${activityInfo}\n**Uptime: ${formatPct(bot.onlinePct)}** ${onlineBar}${historyInfo}\n**Online:** ${formatTime(bot.totalOnline)} | **Avg Session:** ${formatTime(bot.avgSession)}${settingsInfo}`,
            inline: false
          });
        }
        
        botEmbeds.push(embed);
      }
      
      // Send all embeds
      const allEmbeds = [overviewEmbed, ...botEmbeds];
      
      if (allEmbeds.length <= 10) {
        // Discord allows up to 10 embeds per message
        await interaction.editReply({ embeds: allEmbeds });
      } else {
        // If we have more than 10 embeds, split into multiple messages
        await interaction.editReply({ embeds: allEmbeds.slice(0, 10) });
        
        // Send additional embeds as follow-up messages
        for (let i = 10; i < allEmbeds.length; i += 10) {
          const embedBatch = allEmbeds.slice(i, i + 10);
          await interaction.followUp({ embeds: embedBatch });
        }
      }
    } catch (error) {
      await handleError(interaction, error);
    }
  },

  // Modified dump command to only handle current uptime data
  async dump(interaction) {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Permission Denied')
            .setDescription('Only server administrators can use this command.')
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Get options
      const confirm = interaction.options.getBoolean('confirm');
      if (!confirm) {
        return await interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Confirmation Required')
            .setDescription('You must confirm data dumping by setting the `confirm` option to `true`.')
            .setColor(CONFIG.colors.error)],
          ephemeral: true
        });
      }
      
      // Defer reply since this might take time
      await interaction.deferReply();
      
      // Get current guild data
      const guild = getGuildConfig(interaction.guildId);
      const monitorCount = Object.keys(guild.monitors || {}).length;
      
      if (monitorCount === 0) {
        return await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle('📋 No Monitored Bots')
            .setDescription('There are no bots being monitored in this server.')
            .setColor(CONFIG.colors.info)]
        });
      }
      
      // Collect uptime data for all bots
      const uptimeData = {};
      let totalOnlineTime = 0;
      let totalOfflineTime = 0;
      
      // Process each bot
      for (const botId of Object.keys(guild.monitors)) {
        try {
          const activityData = getMonitorData(interaction.guildId, botId, 'activity');
          
          uptimeData[botId] = {
            tag: activityData.tag || 'Unknown',
            status: activityData.status || 'unknown',
            onlineTime: activityData.totalOnlineTime || 0,
            offlineTime: activityData.totalOfflineTime || 0,
            onlinePercentage: activityData.onlinePercentage || 0,
            avgSessionDuration: activityData.avgSessionDuration || 0,
            longestSession: activityData.longestSession || 0,
            priorityBot: guild.monitors[botId].priorityBot || false
          };
          
          totalOnlineTime += activityData.totalOnlineTime || 0;
          totalOfflineTime += activityData.totalOfflineTime || 0;
        } catch (e) {
          log('error', `Error getting uptime data for ${botId}: ${e.message}`, 'DB');
        }
      }
      
      // Calculate overall uptime percentage
      const totalTime = totalOnlineTime + totalOfflineTime;
      const overallUptimePct = totalTime > 0 ? (totalOnlineTime / totalTime) * 100 : 0;
      
      // Create file content
      const fileContent = {
        serverName: interaction.guild.name,
        serverId: interaction.guildId,
        timestamp: new Date().toISOString(),
        botsMonitored: monitorCount,
        overallStats: {
          totalOnlineTime,
          totalOfflineTime,
          uptimePercentage: overallUptimePct
        },
        botUptimeData: uptimeData
      };
      
      // Convert to string
      const jsonData = JSON.stringify(fileContent, null, 2);
      
      // Create a temporary file
      const fileName = `uptime_dump_${interaction.guildId}_${Date.now()}.json`;
      const tempFilePath = path.join(CONFIG.dataDir, fileName);
      
      try {
        fs.writeFileSync(tempFilePath, jsonData);
        
        // Send file as attachment
        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle('📊 Current Uptime Data Dump')
            .setDescription(`Here's the current uptime data for all ${monitorCount} monitored bots.\n\nOverall uptime: ${formatPct(overallUptimePct)}`)
            .setColor(CONFIG.colors.success)
            .setFooter({ text: CONFIG.branding.copyright })],
          files: [{ attachment: tempFilePath, name: fileName }]
        });
        
        // Clean up temporary file
        setTimeout(() => {
          try { 
            fs.unlinkSync(tempFilePath); 
            log('debug', `Removed temporary data dump file ${tempFilePath}`, 'FILE');
          } catch (e) { 
            log('error', `Failed to remove temporary file: ${e.message}`, 'FILE'); 
          }
        }, 5000);
      } catch (e) {
        log('error', `Failed to create data dump file: ${e.message}`, 'FILE');
        
        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Dump Failed')
            .setDescription(`Failed to create data dump: ${e.message}`)
            .setColor(CONFIG.colors.error)]
        });
      }
      
      // Log to the log channel
      try {
        if (guild.logChannelId) {
          const logChannel = await client.channels.fetch(guild.logChannelId).catch(() => null);
          if (logChannel && logChannel.isTextBased()) {
            const logEmbed = new EmbedBuilder()
              .setTitle('📊 Data Dump Executed')
              .setDescription(`<@${interaction.user.id}> performed a current uptime data dump.`)
              .setColor(CONFIG.colors.info)
              .setTimestamp()
              .setFooter({ text: CONFIG.branding.copyright });
            
            await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
          }
        }
      } catch (e) {
        log('error', `Failed to send log notification: ${e.message}`, 'DISCORD');
      }
    } catch (error) {
      await handleError(interaction, error);
    }
  }
};

/**
 * MODAL SUBMISSION HANDLERS
 */
async function handleModalSubmit(interaction) {
try {
  const customId = interaction.customId;
  
  // Handle monitor-all modal
  if (customId.startsWith('monitor_all_modal_')) {
    await handleMonitorAllModal(interaction);
  }
  // Handle single bot monitoring modal
  else if (customId.startsWith('monitor_modal_')) {
    await handleMonitorModal(interaction);
  }
  // Handle other modals here...
} catch (error) {
  log('error', `Modal submission error: ${error.message}`, 'DISCORD');
  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setTitle('❌ Error Processing Form')
      .setDescription(`An error occurred: ${error.message}`)
      .setColor(CONFIG.colors.error)],
    ephemeral: true
  });
}
}

// Handle the monitor-all modal submission
async function handleMonitorAllModal(interaction) {
// Extract the operation ID
const operationId = interaction.customId.split('_').pop();

// Check if operation exists and hasn't expired
if (!STATE.pendingBulkOperations || !STATE.pendingBulkOperations[operationId]) {
  return await interaction.reply({
    embeds: [new EmbedBuilder()
      .setTitle('❌ Operation Expired')
      .setDescription('This operation has expired or was already completed. Please run the command again.')
      .setColor(CONFIG.colors.error)],
    ephemeral: true
  });
}

// Get values from the modal
const roleId = interaction.fields.getTextInputValue('role_id').trim();
const priorityRoleId = interaction.fields.getTextInputValue('priority_role_id').trim();
const confirmationInput = interaction.fields.getTextInputValue('confirmation');

// Validate confirmation
if (confirmationInput !== 'CONFIRM') {
  return await interaction.reply({
    embeds: [new EmbedBuilder()
      .setTitle('❌ Operation Cancelled')
      .setDescription('You did not confirm the operation. Please type CONFIRM to proceed with bulk monitoring.')
      .setColor(CONFIG.colors.error)],
    ephemeral: true
  });
}

// Prepare for priority role handling (if specified)
const usePriorityRole = priorityRoleId && priorityRoleId.length > 0;

// Defer reply while we process
await interaction.deferReply();

// Fetch members
try {
  const guild = await interaction.guild.fetch();
  let members = await guild.members.fetch();
  
  // Filter to only include bots first
  members = members.filter(m => m.user.bot);
  
  // Then filter by role if specified
  if (roleId && roleId.length > 0) {
    members = members.filter(m => m.roles.cache.has(roleId));
    
    // Check if role exists and has bot members
    if (members.size === 0) {
      return await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('⚠️ No Bots Found')
          .setDescription(`No bots found with the role ID: ${roleId}. Please check the role ID and try again.`)
          .setColor(CONFIG.colors.warning)]
      });
    }
  }
  
  // Check if we found any bots at all
  if (members.size === 0) {
    return await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('⚠️ No Bots Found')
        .setDescription(`No bots were found in this server. This monitor is designed for Discord bots only.`)
        .setColor(CONFIG.colors.warning)]
    });
  }
  
  // Count existing monitors
  const guildConfig = getGuildConfig(interaction.guildId);
  const existingCount = Object.keys(guildConfig.monitors || {}).length;
  
  // Check if we would exceed maximum
  if (existingCount + members.size > CONFIG.maxMonitors) {
    return await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('❌ Maximum Monitors Exceeded')
        .setDescription(`Cannot add ${members.size} bots - would exceed maximum of ${CONFIG.maxMonitors} monitors.`)
        .setColor(CONFIG.colors.error)]
    });
  }
  
  // Initial progress message
  const progressMsg = await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setTitle('🔄 Processing Bulk Monitoring')
      .setDescription(`Starting to monitor ${members.size} bots...\n\nProgress: 0%`)
      .setColor(CONFIG.colors.info)]
  });
  
  // Process members in batches
  const batchSize = 10;
  let successCount = 0;
  let failCount = 0;
  const memberArray = Array.from(members.values());
  
  // Get guild settings
  const guildSettings = guildConfig.settings || {};
  
  for (let i = 0; i < memberArray.length; i += batchSize) {
    const batch = memberArray.slice(i, i + batchSize);
    
    // Process each bot in the batch (already filtered to be only bots)
    await Promise.all(batch.map(async (member) => {
      try {
        // Default settings from guild config
        const excludeOffline = !guildSettings.monitorOffline;
        
        // Determine priority status:
        // 1. If modal specified a priority role, use that
        // 2. Otherwise, use guild settings priority role if configured
        let priorityBot = false;
        
        if (priorityRoleId && priorityRoleId.length > 0) {
          priorityBot = member.roles.cache.has(priorityRoleId);
        } else if (STATE.pendingBulkOperations[operationId].priorityRole) {
          priorityBot = member.roles.cache.has(STATE.pendingBulkOperations[operationId].priorityRole);
        } else if (guildSettings.priorityRoleId) {
          priorityBot = member.roles.cache.has(guildSettings.priorityRoleId);
        }
        
        await addMonitor(interaction.guildId, member.id, excludeOffline, priorityBot);
        successCount++;
      } catch (e) {
        log('error', `Failed to add monitor for bot ${member.id}: ${e.message}`, 'DB');
        failCount++;
      }
    }));
    
    // Update progress every batch
    if ((i + batch.length) < memberArray.length) {
      const progress = Math.round(((i + batch.length) / memberArray.length) * 100);
      await progressMsg.edit({
        embeds: [new EmbedBuilder()
          .setTitle('🔄 Processing Bulk Monitoring')
          .setDescription(`Monitoring ${memberArray.length} bots...\n\nProgress: ${progress}% (${i + batch.length}/${memberArray.length})`)
          .setColor(CONFIG.colors.info)]
      });
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Clean up
  delete STATE.pendingBulkOperations[operationId];
  
  // Final update
  await progressMsg.edit({
    embeds: [new EmbedBuilder()
      .setTitle('✅ Bulk Monitoring Complete')
      .setDescription(`Successfully added ${successCount} bots to monitoring.\n${failCount > 0 ? `Failed to add ${failCount} bots.` : ''}`)
      .setColor(CONFIG.colors.success)
      .setFooter({ text: `Completed at ${toUKTime(new Date())} • ${CONFIG.branding.copyright}` })]
  });
  
  // Log to the log channel
  try {
    const guild = getGuildConfig(interaction.guildId);
    if (guild.logChannelId) {
      const logChannel = await client.channels.fetch(guild.logChannelId).catch(() => null);
      if (logChannel) {
        await logChannel.send({
          embeds: [new EmbedBuilder()
            .setTitle('🤖 Bulk Bot Monitoring Added')
            .setDescription(`<@${interaction.user.id}> added ${successCount} bots to monitoring.${failCount > 0 ? `\n${failCount} bots could not be added.` : ''}${roleId ? `\nFiltered by role ID: ${roleId}` : ''}${priorityRoleId ? `\nPriority role ID: ${priorityRoleId}` : ''}`)
            .setColor(CONFIG.colors.info)
            .setFooter({ text: CONFIG.branding.copyright })
            .setTimestamp()]
        });
      }
    }
  } catch (e) {
    log('error', `Failed to send log channel notification: ${e.message}`, 'DISCORD');
  }
  
} catch (error) {
  log('error', `Error processing bulk monitoring: ${error.message}`, 'DISCORD');
  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setTitle('❌ Operation Failed')
      .setDescription(`An error occurred while processing the bulk monitoring: ${error.message}`)
      .setColor(CONFIG.colors.error)]
  });
}
}

// Handle single bot monitoring modal
async function handleMonitorModal(interaction) {
// Extract the operation ID and bot ID
const parts = interaction.customId.split('_');
const operationId = parts[2];
const botId = parts[3];

// Validate bot exists
try {
  // Get data from modal
  const excludeOfflineInput = interaction.fields.getTextInputValue('exclude_offline').toLowerCase();
  const priorityInput = interaction.fields.getTextInputValue('priority').toLowerCase();
  const dailySummaryInput = interaction.fields.getTextInputValue('daily_summary').toLowerCase();
  const notes = interaction.fields.getTextInputValue('notes');
  
  // Parse values
  const excludeOffline = excludeOfflineInput === 'yes' || excludeOfflineInput === 'true';
  const priority = priorityInput === 'yes' || priorityInput === 'true';
  const dailySummary = dailySummaryInput === 'yes' || dailySummaryInput === 'true';
  
  // Defer reply since adding a monitor can take time
  await interaction.deferReply({ ephemeral: true });
  
  // Get bot
  const member = await interaction.guild.members.fetch(botId).catch(() => null);
  if (!member) {
    return await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('❌ Bot Not Found')
        .setDescription('Could not find that bot in this server anymore.')
        .setColor(CONFIG.colors.error)]
    });
  }
  
  // Ensure it's a bot
  if (!member.user.bot) {
    return await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('❌ Not a Bot')
        .setDescription('This monitor is designed for Discord bots only. The user you selected is not a bot.')
        .setColor(CONFIG.colors.error)]
    });
  }
  
 // Add the monitor
 await addMonitor(interaction.guildId, botId, excludeOffline, priority);
    
 // Update daily summary setting separately
 const guild = getGuildConfig(interaction.guildId);
 if (guild.monitors[botId]) {
   guild.monitors[botId].dailySummary = dailySummary;
   if (notes && notes.trim()) {
     guild.monitors[botId].notes = notes.trim();
   }
   saveGuildConfig(interaction.guildId);
 }
 
 // Send success message
 await interaction.editReply({
   embeds: [new EmbedBuilder()
     .setTitle('✅ Monitoring Started')
     .setDescription(`Now monitoring <@${botId}> (${member.user.tag})`)
     .addFields(
       { name: 'Exclude Offline', value: excludeOffline ? 'Yes' : 'No', inline: true },
       { name: 'Priority Bot', value: priority ? 'Yes' : 'No', inline: true },
       { name: 'Daily Summary', value: dailySummary ? 'Yes' : 'No', inline: true }
     )
     .setColor(CONFIG.colors.success)
     .setFooter({ text: CONFIG.branding.copyright })]
 });
 
 // Log to the log channel
 try {
   if (guild.logChannelId) {
     const logChannel = await client.channels.fetch(guild.logChannelId).catch(() => null);
     if (logChannel) {
       await logChannel.send({
         embeds: [new EmbedBuilder()
           .setTitle('🤖 Bot Monitoring Added')
           .setDescription(`<@${interaction.user.id}> started monitoring <@${botId}> (${member.user.tag})`)
           .addFields(
             { name: 'Settings', value: `Exclude Offline: ${excludeOffline ? 'Yes' : 'No'}\nPriority: ${priority ? 'Yes' : 'No'}\nDaily Summary: ${dailySummary ? 'Yes' : 'No'}`, inline: true },
             { name: 'Notes', value: notes && notes.trim() ? notes : 'None', inline: true }
           )
           .setColor(CONFIG.colors.info)
           .setFooter({ text: CONFIG.branding.copyright })
           .setTimestamp()]
       });
     }
   }
 } catch (e) {
   log('error', `Failed to send log channel notification: ${e.message}`, 'DISCORD');
 }
 
} catch (error) {
 log('error', `Error processing monitor modal: ${error.message}`, 'DISCORD');
 if (interaction.deferred) {
   await interaction.editReply({
     embeds: [new EmbedBuilder()
       .setTitle('❌ Operation Failed')
       .setDescription(`An error occurred while setting up monitoring: ${error.message}`)
       .setColor(CONFIG.colors.error)]
   });
 } else {
   await interaction.reply({
     embeds: [new EmbedBuilder()
       .setTitle('❌ Operation Failed')
       .setDescription(`An error occurred while setting up monitoring: ${error.message}`)
       .setColor(CONFIG.colors.error)],
     ephemeral: true
   });
 }
}
}

/**
* BUTTON HANDLER
*/
async function handleButton(interaction) {
try {
const customId = interaction.customId;

// Handle confirmation for bulk monitoring
if (customId.startsWith('confirm_monitor_all_')) {
 const operationId = customId.split('_').pop();
 
 if (!STATE.pendingBulkOperations[operationId]) {
   return await interaction.reply({
     embeds: [new EmbedBuilder()
       .setTitle('❌ Operation Expired')
       .setDescription('This operation has expired or was already completed.')
       .setColor(CONFIG.colors.error)],
     ephemeral: true
   });
 }
 
 // Show a modal for additional configuration
 const modal = new ModalBuilder()
   .setCustomId(`monitor_all_modal_${operationId}`)
   .setTitle('Bulk Bot Monitor Configuration');
 
 // Add form fields
 const roleIdInput = new TextInputBuilder()
   .setCustomId('role_id')
   .setLabel('Role ID (Optional)')
   .setStyle(TextInputStyle.Short)
   .setPlaceholder('Enter a role ID to filter bots (leave empty for all)')
   .setRequired(false);
 
 const priorityRoleInput = new TextInputBuilder()
   .setCustomId('priority_role_id')
   .setLabel('Priority Role ID (Optional)')
   .setStyle(TextInputStyle.Short)
   .setPlaceholder('Enter a role ID to mark as priority bots')
   .setRequired(false);
   
 const confirmationInput = new TextInputBuilder()
   .setCustomId('confirmation')
   .setLabel('Type CONFIRM to proceed')
   .setStyle(TextInputStyle.Short)
   .setPlaceholder('CONFIRM')
   .setRequired(true);
 
 // Add inputs to action rows
 const roleRow = new ActionRowBuilder().addComponents(roleIdInput);
 const priorityRoleRow = new ActionRowBuilder().addComponents(priorityRoleInput);
 const confirmRow = new ActionRowBuilder().addComponents(confirmationInput);
 
 // Add rows to modal
 modal.addComponents(roleRow, priorityRoleRow, confirmRow);
 
 // Show the modal
 await interaction.showModal(modal);
}

// Handle cancel for bulk monitoring
else if (customId.startsWith('cancel_monitor_all_')) {
 const operationId = customId.split('_').pop();
 
 // Clean up operation
 delete STATE.pendingBulkOperations[operationId];
 
 await interaction.update({
   embeds: [new EmbedBuilder()
     .setTitle('❌ Operation Cancelled')
     .setDescription('The bulk monitoring operation was cancelled.')
     .setColor(CONFIG.colors.error)],
   components: []
 });
}

} catch (error) {
log('error', `Button handler error: ${error.message}`, 'DISCORD');
await interaction.reply({
 embeds: [new EmbedBuilder()
   .setTitle('❌ Error Processing Button')
   .setDescription(`An error occurred: ${error.message}`)
   .setColor(CONFIG.colors.error)],
 ephemeral: true
});
}
}

/**
 * DISCORD EVENT LISTENERS
 */
// Register bot event handlers
client.once('ready', () => {
  log('success', `${CONFIG.branding.name} logged in as ${client.user.tag}`, 'DISCORD');
  log('info', `Royal Court monitoring system activated with extended capabilities`, 'DISCORD');

  // Register command for all guilds the bot is in
  client.guilds.cache.forEach(guild => {
    registerCommands(guild.id).catch(err => {
      log('error', `Failed to register commands for guild ${guild.id}: ${err.message}`, 'DISCORD');
    });
  });

  // Initialize message queue
  initializeMessageQueue();

  // FIXED - Set custom activity status for the bot with hardcoded activity type
  client.user.setPresence({
    activities: [
      { name: `The Royal Court Bot Network`, type: 3 } // 3 = Watching (hardcoded)
    ],
    status: 'online'
  });

  // FIXED - Initialize status using the function that doesn't reference ActivityType
  initializeStatusManagement();

  // Setup auto-cleanup
  if (CONFIG.dataRetention.enableAutoCleanup) {
    setupAutoCleanup();
  }

  // Load existing guild configurations
  for (const guild of client.guilds.cache.values()) {
    getGuildConfig(guild.id);
    log('info', `Loaded configuration for guild ${guild.id} (${guild.name})`, 'DB');
  }

  // Setup check intervals for existing monitors
  for (const guildId in STATE.guilds) {
    const guild = STATE.guilds[guildId];
    for (const botId in guild.monitors) {
      setupCheckInterval(guildId, botId);
    }
  }

  log('info', 'All systems initialized and ready!', 'DISCORD');
});

// Handle guild joins
client.on('guildCreate', async (guild) => {
  log('info', `Joined new guild: ${guild.name} (${guild.id})`, 'DISCORD');
  await registerCommands(guild.id);
  getGuildConfig(guild.id); // Create default config
});

// Handle new bots joining
client.on('guildMemberAdd', async (member) => {
  try {
    if (!member.user.bot) return; // Skip regular users

    const guild = getGuildConfig(member.guild.id);

    // Auto-monitor new bots if enabled
    if (guild.settings?.autoMonitorNewBots) {
      // Skip bots with exclude role if configured
      if (guild.settings.excludeRoleId && 
          member.roles.cache.has(guild.settings.excludeRoleId)) {
        return;
      }
      
      // Check if bot should be a priority monitor
      const isPriority = guild.settings.priorityRoleId && 
                        member.roles.cache.has(guild.settings.priorityRoleId);
      
      // Skip offline notification if configured
      const excludeOffline = !guild.settings.monitorOffline;
      
      try {
        await addMonitor(member.guild.id, member.id, excludeOffline, isPriority);
        log('info', `Auto-monitoring new bot ${member.user.tag} in ${member.guild.name}`, 'DISCORD');
      } catch (err) {
        log('error', `Failed to auto-monitor new bot ${member.user.tag}: ${err.message}`, 'DISCORD');
      }
    }
  } catch (error) {
    log('error', `Error in guildMemberAdd handler: ${error.message}`, 'DISCORD');
  }
});

// Handle bot leaves - COMPLETELY REMOVE DATA
client.on('guildMemberRemove', async (member) => {
  try {
    const guild = getGuildConfig(member.guild.id);

    // If bot was being monitored, completely remove it
    if (guild.monitors && guild.monitors[member.id]) {
      log('info', `Bot ${member.user.tag} (${member.id}) left guild ${member.guild.id}, removing all monitoring data`, 'DB');
      
      // Remove all data for this bot
      await removeMonitor(member.guild.id, member.id).catch(err => {
        log('error', `Failed to remove monitor for bot who left: ${err.message}`, 'DB');
      });
    }
  } catch (error) {
    log('error', `Error in guildMemberRemove handler: ${error.message}`, 'DISCORD');
  }
});

// Handle presence updates
client.on('presenceUpdate', async (oldPresence, newPresence) => {
  try {
    if (!newPresence || !newPresence.member || !newPresence.member.user.bot) return;

    const guildId = newPresence.guild.id;
    const botId = newPresence.userId;

    const guild = getGuildConfig(guildId);

    // Only track if we're monitoring this bot
    if (!guild.monitors || !guild.monitors[botId]) return;

    // Skip if monitoring is paused for this bot
    if (STATE.monitoring.paused || STATE.monitoring.pausedBots.has(botId)) return;

    const isOnline = newPresence.status && ['online', 'idle', 'dnd'].includes(newPresence.status);
    const oldStatus = oldPresence?.status || null;
    const newStatus = newPresence.status || null;

    // Skip if status hasn't changed
    if (oldStatus === newStatus) return;

    // Update cache
    STATE.cache.presenceData.set(botId, {
      status: newStatus || (isOnline ? 'online' : 'offline'),
      lastUpdated: Date.now()
    });

    // Skip offline state changes if configured to exclude them
    if (!isOnline && guild.monitors[botId].excludeOffline) {
      return;
    }

    // Get the current status from our data
    const activityData = getMonitorData(guildId, botId, 'activity');
    const currentStatus = activityData.status;

    // Only record if status has actually changed
    if ((isOnline && currentStatus !== 'online') || (!isOnline && currentStatus === 'online')) {
      await recordStatusChange(guildId, botId, isOnline, newStatus);
    }
  } catch (error) {
    log('error', `Error in presenceUpdate handler: ${error.message}`, 'DISCORD');
  }
});

// Enhanced interaction handler
client.on('interactionCreate', async interaction => {
  try {
    // Increment event counter
    STATE.stats.eventsProcessed++;

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const commandName = interaction.commandName;
      
      // Log command usage for debugging
      log('info', `Command executed: ${commandName} by ${interaction.user.tag} (${interaction.user.id}) in ${interaction.guild.name}`, 'DISCORD');
      
      // Check if handler exists
      if (commandHandlers[commandName]) {
        await commandHandlers[commandName](interaction);
      } else {
        log('warn', `No handler found for command: ${commandName}`, 'DISCORD');
        await interaction.reply({ 
          content: 'This command is not yet implemented or is unavailable.',
          ephemeral: true
        });
      }
    }
    // Handle button interactions
    else if (interaction.isButton()) {
      log('info', `Button clicked: ${interaction.customId} by ${interaction.user.tag} (${interaction.user.id})`, 'DISCORD');
      await handleButton(interaction);
    }
    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      log('info', `Modal submitted: ${interaction.customId} by ${interaction.user.tag} (${interaction.user.id})`, 'DISCORD');
      await handleModalSubmit(interaction);
    }
  } catch (error) {
    log('error', `Interaction error: ${error.message}`, 'DISCORD');
    try {
      const errorMsg = {
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Error')
            .setDescription(`An error occurred while processing your request: ${error.message}`)
            .setColor(CONFIG.colors.error)
            .setFooter({ text: CONFIG.branding.copyright })
        ],
        ephemeral: true
      };
      
      if (interaction.deferred) {
        await interaction.editReply(errorMsg).catch(e => log('error', `Failed to edit reply with error: ${e.message}`, 'DISCORD'));
      } else if (interaction.replied) {
        await interaction.followUp(errorMsg).catch(e => log('error', `Failed to follow up with error: ${e.message}`, 'DISCORD'));
      } else {
        await interaction.reply(errorMsg).catch(e => log('error', `Failed to reply with error: ${e.message}`, 'DISCORD'));
      }
    } catch (e) {
      log('error', `Failed to send error response: ${e.message}`, 'DISCORD');
    }
  }
});

/**
 * SHUTDOWN HANDLING
 */
async function shutdownHandler(signal) {
  // Avoid duplicate shutdown processes
  if (STATE.shutdown.inProgress) {
    log('warn', `Shutdown already in progress, received additional ${signal} signal`, 'SHUTDOWN');
    return;
  }

  STATE.shutdown.inProgress = true;
  STATE.shutdown.startTime = Date.now();

  log('info', `Received ${signal} signal. Beginning graceful shutdown...`, 'SHUTDOWN');

  // Give ourselves max 10 seconds for shutdown
  const forcedShutdownTimeout = setTimeout(() => {
    log('error', 'Forced shutdown after timeout! Some operations may not have completed.', 'SHUTDOWN');
    process.exit(1);
  }, 10000);

  // Define shutdown steps
  const steps = [
    // Step 1: Stop status rotation
    async () => {
      log('info', 'Stopping status rotation...', 'SHUTDOWN');
      clearStatusInterval();
      log('success', 'Status rotation stopped', 'SHUTDOWN');
    },

    // Step 2: Finish message queue processing
    async () => {
      log('info', `Flushing message queue: ${STATE.messageQueue.highPriorityQueue.length + STATE.messageQueue.queue.length} remaining messages`, 'SHUTDOWN');
      
      // Set up a promise that resolves when the queue is empty
      const queuePromise = new Promise(resolve => {
        const checkQueue = setInterval(() => {
          if (STATE.shutdown.completed.messageQueue || 
              (STATE.messageQueue.highPriorityQueue.length === 0 && STATE.messageQueue.queue.length === 0)) {
            clearInterval(checkQueue);
            STATE.shutdown.completed.messageQueue = true;
            resolve();
          }
        }, 100);
      });
      
      // Wait for queue to empty or timeout after 5 seconds
      await Promise.race([
        queuePromise,
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
      
      if (STATE.messageQueue.processingInterval) {
        clearInterval(STATE.messageQueue.processingInterval);
      }
      
      log('success', `Message queue processing completed. (${STATE.stats.sentMessages} sent, ${STATE.stats.droppedMessages} dropped)`, 'SHUTDOWN');
    },

    // Step 2: Clean up all monitors
    async () => {
      log('info', 'Cleaning up monitors...', 'SHUTDOWN');
      
      // Clear all intervals to stop status checking
      for (const key of Object.keys(STATE.intervals)) {
        clearInterval(STATE.intervals[key]);
      }
      
      STATE.intervals = {};
      STATE.shutdown.completed.monitors = true;
      log('success', 'All monitoring intervals cleared', 'SHUTDOWN');
    },

    // Step 3: Save all data
    async () => {
      log('info', 'Saving all guild data...', 'SHUTDOWN');
      
      for (const guildId of Object.keys(STATE.guilds)) {
        try {
          saveGuildConfig(guildId);
          log('debug', `Saved config for guild ${guildId}`, 'SHUTDOWN');
        } catch (e) {
          log('error', `Failed to save config for guild ${guildId}: ${e.message}`, 'SHUTDOWN');
        }
      }
      
      STATE.shutdown.completed.fileOperations = true;
      log('success', 'All guild data saved successfully', 'SHUTDOWN');
    }
  ];

  // Execute shutdown steps sequentially
  (async () => {
    for (const step of steps) {
      await step().catch(err => {
        log('error', `Error during shutdown: ${err.message}`, 'SHUTDOWN');
      });
    }

    log('info', `Bot uptime: ${formatTime(Date.now() - STATE.stats.startTime)}`, 'SHUTDOWN');
    log('info', `Shutdown completed in ${formatTime(Date.now() - STATE.shutdown.startTime)}`, 'SHUTDOWN');
    log('success', 'Graceful shutdown complete, exiting process', 'SHUTDOWN');

    clearTimeout(forcedShutdownTimeout);

    // Destroy client and exit
    client.destroy();
    process.exit(0);
  })();
}

// Register shutdown handlers
process.on('SIGINT', () => shutdownHandler('SIGINT'));
process.on('SIGTERM', () => shutdownHandler('SIGTERM'));

/**
 * START THE BOT
 */
// Entry point with improved error handling
const startBot = () => {
  // Ensure data directory exists
  ensureDir(CONFIG.dataDir);
  log('info', `Initializing ${CONFIG.branding.name} v${CONFIG.version}...`);
  log('info', `© MonkeyBytes Tech | The Royal Court`);
  log('info', `MonkeyBytes Tech monitoring system ready with enhanced capabilities`);
  log('info', `Global minimum check interval set to ${CONFIG.minCheckInterval} seconds`);
  log('info', `Message queue configured for ${CONFIG.rateLimit.messagesPerMinute} messages per minute`);
  log('info', `Using timezone: ${CONFIG.timezone}`);

  // Set up comprehensive error handlers
  process.on('unhandledRejection', (error) => {
    log('error', `Unhandled Promise Rejection: ${error.message}`);
    log('error', error.stack || 'No stack trace available');

    // Increment error count in stats if available
    if (STATE.stats) STATE.stats.errorCount++;
  });

  process.on('uncaughtException', (error) => {
    log('error', `Uncaught Exception: ${error.message}`);
    log('error', error.stack || 'No stack trace available');

    // Increment error count in stats if available
    if (STATE.stats) STATE.stats.errorCount++;

    // For critical errors, save data before potentially crashing
    try {
      for (const guildId of Object.keys(STATE.guilds || {})) {
        try { saveGuildConfig(guildId); } catch (e) {}
      }
      log('info', 'Saved guild configs after critical error');
    } catch (e) {
      log('error', `Failed to save data after critical error: ${e.message}`);
    }

    // For truly fatal errors, we might need to exit, but in many cases
    // it's better to try to continue running
    if (error.message.includes('FATAL') || error.message.includes('Cannot read property') || 
       error.message.includes('undefined is not a function')) {
      log('error', 'Detected fatal error, process will exit');
      process.exit(1);
    }
  });

  // Add reconnection logic
  client.on('disconnect', (event) => {
    log('warn', `Bot disconnected from Discord with code ${event.code}. Reason: ${event.reason}`, 'DISCORD');
  });

  client.on('error', (error) => {
    log('error', `Discord client error: ${error.message}`, 'DISCORD');
  });

  client.on('reconnecting', () => {
    log('warn', 'Reconnecting to Discord...', 'DISCORD');
  });

  client.on('resume', (replayed) => {
    log('success', `Reconnected to Discord. Replayed ${replayed} events.`, 'DISCORD');
  });

  // Login to Discord with retry logic
  let loginAttempts = 0;
  const maxLoginAttempts = 5;

  const attemptLogin = () => {
    client.login(CONFIG.token)
      .then(() => {
        log('success', `Logged in as ${client.user.tag}`, 'DISCORD');
      })
      .catch(err => {
        loginAttempts++;
        log('error', `Failed to login to Discord: ${err.message}`, 'DISCORD');
        
        if (loginAttempts < maxLoginAttempts) {
          const delay = Math.min(30000, Math.pow(2, loginAttempts) * 1000); // Cap at 30 seconds
          log('info', `Retrying login in ${delay / 1000} seconds... (Attempt ${loginAttempts}/${maxLoginAttempts})`, 'DISCORD');
          
          setTimeout(attemptLogin, delay);
        } else {
          log('error', `Failed to login after ${maxLoginAttempts} attempts. Exiting.`, 'DISCORD');
          process.exit(1);
        }
      });
  };

  // Start login process
  attemptLogin();
};

// Start the bot
startBot();