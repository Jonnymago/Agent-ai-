module.exports = {
  apps: [
    {
      name: 'pos-backend',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
      },
    },
  ],
};
