# Foodporium

Sleek food ordering app — **Django REST** backend + **React (Vite)** frontend.

## Features

- Welcome, Discover, Product detail, Cart checkout
- Categories, search, favorites
- Auth (signup / login) with demo account
- Place orders through the API

## Quick start

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py import_v1
python manage.py runserver 8000
```

`import_v1` loads categories, products, and images from `foodporiumv1.0/`.


### 2. Frontend

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

API calls to `/api` are proxied to Django on port 8000.

### Auth & payments

- **Login:** Firebase phone OTP (same project as v1: `foodporium-382b5`)
- **Payments:** Razorpay keys from `foodporiumv1.0` settings

## Admin portal

1. Create a staff user (already seeded locally as `admin` / `admin123` if you ran the seed):

```bash
cd backend
python manage.py createsuperuser
```

2. Open [http://localhost:5173/admin/login](http://localhost:5173/admin/login)

Features: orders (with buzz on new pending), categories, products/stock, toppings, coupons, combos, homepage featured/popular, open/close shop (public countdown when closed).

## Deploy (VPS)

Domain: **www.foodporium.in** · App path: **/root/yellowfdm** · Repo: [searchgrand197/yellowfdm](https://github.com/searchgrand197/yellowfdm)

On the server as root:

```bash
git clone https://github.com/searchgrand197/yellowfdm.git /root/yellowfdm
cd /root/yellowfdm
bash deploy.sh --seed --ssl
```

Later updates:

```bash
cd /root/yellowfdm && bash deploy.sh
```

- `--seed` imports menu/images from `foodporiumv1.0/`
- `--ssl` requests Let's Encrypt for `www.foodporium.in` + `foodporium.in`
- Secrets live in `/root/yellowfdm/.env` (from `.env.example`)

## Local notes

Set `DJANGO_DEBUG=1` in a local `.env` (or export it) when running the Django API for development.

## Stack

- Django 5 + Django REST Framework + django-cors-headers + Gunicorn + Nginx
- React 19 + React Router + Framer Motion + Lucide icons
