# WAPPROVE Backend

Backend API untuk aplikasi WAPPROVE, sistem approval digital untuk pengadaan barang yang terintegrasi dengan WhatsApp.

## Deskripsi

WAPPROVE adalah platform approval digital yang terintegrasi dengan WhatsApp. Sistem ini dirancang untuk menjawab kebutuhan akan proses persetujuan yang transparan, cepat, efisien, dan mudah digunakan. WAPPROVE memanfaatkan platform WhatsApp sebagai saluran utama untuk proses approval.

## Teknologi

- NestJS
- TypeORM
- PostgreSQL (Neon)
- JWT Authentication
- TypeScript

## Prasyarat

- Node.js (versi >= 20)
- npm
- PostgreSQL

## Instalasi

```bash
# Instalasi dependensi
$ npm install
```

## Konfigurasi

Buat file `.env` di root proyek dengan konten berikut:

```
DATABASE_URL=postgresql://wapprovedb_owner:npg_2UqdLNboB7eu@ep-blue-voice-a185faca-pooler.ap-southeast-1.aws.neon.tech/wapprovedb?sslmode=require
JWT_SECRET=wapprove-secret-key-for-jwt-token
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
PORT=3000
```

## Menjalankan Migrasi

```bash
# Menjalankan migrasi database
$ npm run migration:run
```

## Menjalankan Seeder

```bash
# Membuat user admin
$ npm run seed:admin
```

## Menjalankan Aplikasi

```bash
# Development mode
$ npm run start:dev

# Production mode
$ npm run start:prod
```

## Endpoint API

### Auth

- `POST /api/auth/login` - Login dengan email dan password
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/profile` - Mendapatkan data profil user

## Struktur Database

Aplikasi ini menggunakan database dengan struktur sebagai berikut:

- `users` - Tabel untuk menyimpan data pengguna
- `accounts` - Tabel untuk menyimpan data akun pengguna (password, refresh token)
- `departments` - Tabel untuk menyimpan data departemen
- `approvers` - Tabel untuk menyimpan data approver
- `requests` - Tabel untuk menyimpan data pengajuan
- `request_items` - Tabel untuk menyimpan data item pengajuan
- `approval_logs` - Tabel untuk menyimpan log approval
- `notifications` - Tabel untuk menyimpan notifikasi

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
