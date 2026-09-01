module.exports = {
  apps: [
    {
      name: 'mfa-app',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      time: true,
    },
  ],
};
