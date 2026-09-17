module.exports = {
  apps: [{
    name: 'shadow-bot',
    script: 'src/index.js',
    args: '--code',
    env: {
      BOT_NUMBER: ''
    },
    autorestart: true,
    max_restarts: 50,
    min_uptime: '10s',
    max_memory_restart: '512M',
    restart_delay: 5000
  }]
}
