module.exports = {
  apps: [
    {
      name: 'backend',
      script: './index.js',
      cwd: '/root/Nev-Koder/server',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        TRUST_PROXY: 1
      }
    }
  ]
};
