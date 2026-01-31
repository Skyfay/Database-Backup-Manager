import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Database Backup Manager",
  description: "Dokumentation und Anleitungen für den Database Backup Manager",
  lang: 'de-DE',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Anleitung', link: '/getting-started' }
    ],

    sidebar: [
      {
        text: 'Einführung',
        items: [
          { text: 'Schnellstart', link: '/getting-started' },
          { text: 'Installation', link: '/installation' }
        ]
      },
      {
        text: 'Konfiguration',
        items: [
          { text: 'Datenbanken', link: '/configuration/databases' },
          { text: 'Speicherorte', link: '/configuration/destinations' },
          { text: 'Benachrichtigungen', link: '/configuration/notifications' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/database-backup-manager/database-backup-manager' }
    ],

    footer: {
      message: 'Veröffentlicht unter der MIT Lizenz.',
      copyright: 'Copyright © 2026 Database Backup Manager'
    }
  }
})
